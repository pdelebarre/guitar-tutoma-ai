package com.guitartutorial.service;

import com.guitartutorial.dto.TutorialInfo;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.exception.TutorialNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
public class VideoStreamingService {

    private static final Logger log = LoggerFactory.getLogger(VideoStreamingService.class);

    private static final long MAX_CHUNK_SIZE = 1024 * 1024; // 1MB

    private final TutorialScannerService tutorialScannerService;
    private final SubtitleGenerationService subtitleGenerationService;
    private final Path tutorialsDirectory;

    public VideoStreamingService(
            TutorialScannerService tutorialScannerService,
            SubtitleGenerationService subtitleGenerationService,
            @Value("${tutorials.directory}") String tutorialsDirectoryPath) {
        this.tutorialScannerService = tutorialScannerService;
        this.subtitleGenerationService = subtitleGenerationService;
        this.tutorialsDirectory = Paths.get(tutorialsDirectoryPath);
    }

    /**
     * Returns a ResourceRegion for the requested byte range of the video file.
     * Supports Range header parsing for partial content delivery.
     * Chunk size is capped at 1MB per range request.
     *
     * @param tutorialId the tutorial directory name
     * @param headers    the HTTP request headers (may contain Range header)
     * @return a ResourceRegion representing the requested byte range
     * @throws IOException if the video file cannot be read
     */
    public ResourceRegion getVideoRegion(String tutorialId, HttpHeaders headers) throws IOException {
        TutorialInfo tutorial = tutorialScannerService.getTutorial(tutorialId)
                .orElseThrow(() -> new TutorialNotFoundException(tutorialId));

        Path videoPath = tutorialsDirectory.resolve(tutorialId).resolve(tutorial.videoFilename());
        if (!Files.exists(videoPath) || !Files.isRegularFile(videoPath)) {
            throw new ResourceNotFoundException("Video file not found for tutorial: " + tutorialId);
        }

        Resource videoResource = new UrlResource(videoPath.toUri());
        long contentLength = videoResource.contentLength();

        List<HttpRange> ranges = headers.getRange();
        if (!ranges.isEmpty()) {
            HttpRange range = ranges.get(0);
            long start = range.getRangeStart(contentLength);
            long end = range.getRangeEnd(contentLength);
            long rangeLength = Math.min(end - start + 1, MAX_CHUNK_SIZE);
            return new ResourceRegion(videoResource, start, rangeLength);
        }

        // No Range header: return from the beginning, capped at chunk size
        long rangeLength = Math.min(contentLength, MAX_CHUNK_SIZE);
        return new ResourceRegion(videoResource, 0, rangeLength);
    }

    /**
     * Returns the subtitle file content for a tutorial, converted from SRT to WebVTT format.
     * Browsers require WebVTT (.vtt) format for the HTML5 <track> element.
     * <p>
     * If no SRT file exists yet, this method triggers asynchronous subtitle generation
     * via Faster-Whisper and returns empty so the video can start playing without subtitles.
     * Once generation completes, subsequent requests will serve the generated subtitles.
     *
     * @param tutorialId the tutorial directory name
     * @return an Optional containing the VTT Resource if available, or empty otherwise
     */
    public Optional<Resource> getSubtitleFile(String tutorialId) {
        TutorialInfo tutorial = tutorialScannerService.getTutorial(tutorialId)
                .orElseThrow(() -> new TutorialNotFoundException(tutorialId));

        Path tutorialDir = tutorialsDirectory.resolve(tutorialId);
        try {
            Optional<Path> srtFile = Files.list(tutorialDir)
                    .filter(p -> Files.isRegularFile(p) && p.getFileName().toString().toLowerCase().endsWith(".srt"))
                    .findFirst();

            if (srtFile.isPresent()) {
                return srtFile.map(srtPath -> {
                    try {
                        return (Resource) new SrtToVttResource(srtPath);
                    } catch (IOException e) {
                        return null;
                    }
                });
            }

            // No SRT file found — trigger asynchronous generation via Faster-Whisper
            CompletableFuture<Void> generation = subtitleGenerationService.ensureSubtitles(tutorial);
            if (!generation.isDone()) {
                log.info("Subtitle generation triggered for tutorial '{}'; subtitles will appear once ready", tutorialId);
            }

            return Optional.empty();
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    /**
     * A custom Resource that converts SRT content to WebVTT on-the-fly when read.
     * SRT and WebVTT are very similar; the main differences are:
     * - VTT requires a "WEBVTT" header line
     * - VTT uses dots (.) as millisecond separators instead of commas (,)
     * - VTT allows optional styling (not used here)
     */
    private static class SrtToVttResource implements Resource {

        private final byte[] vttBytes;
        private final String filename;

        SrtToVttResource(Path srtPath) throws IOException {
            this.filename = srtPath.getFileName().toString().replaceAll("\\.srt$", ".vtt");
            this.vttBytes = convertSrtToVtt(srtPath);
        }

        private static byte[] convertSrtToVtt(Path srtPath) throws IOException {
            StringBuilder vtt = new StringBuilder();
            vtt.append("WEBVTT\n\n");

            try (BufferedReader reader = Files.newBufferedReader(srtPath, StandardCharsets.UTF_8)) {
                String line;
                while ((line = reader.readLine()) != null) {
                    // Convert SRT timestamps (comma as millis separator) to VTT (dot as millis separator)
                    // SRT: 00:01:14,000 --> 00:01:17,000
                    // VTT: 00:01:14.000 --> 00:01:17.000
                    if (line.contains("-->")) {
                        line = line.replace(',', '.');
                    }
                    vtt.append(line).append("\n");
                }
            }

            return vtt.toString().getBytes(StandardCharsets.UTF_8);
        }

        @Override
        public boolean exists() {
            return true;
        }

        @Override
        public boolean isReadable() {
            return true;
        }

        @Override
        public boolean isOpen() {
            return false;
        }

        @Override
        public java.net.URL getURL() {
            return null;
        }

        @Override
        public java.net.URI getURI() {
            return null;
        }

        @Override
        public java.io.File getFile() {
            return null;
        }

        @Override
        public long contentLength() {
            return vttBytes.length;
        }

        @Override
        public long lastModified() {
            return System.currentTimeMillis();
        }

        @Override
        public Resource createRelative(String relativePath) {
            return null;
        }

        @Override
        public String getFilename() {
            return filename;
        }

        @Override
        public String getDescription() {
            return "SRT converted to WebVTT for " + filename;
        }

        @Override
        public InputStream getInputStream() {
            return new ByteArrayInputStream(vttBytes);
        }
    }
}
