package com.guitartutorial.service;

import com.guitartutorial.dto.TutorialInfo;
import net.jqwik.api.*;
import net.jqwik.api.lifecycle.BeforeProperty;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Feature: guitar-tutorial-manager, Property 3: Video streaming range correctness
 *
 * For any valid video file and any valid HTTP Range header specifying a byte range
 * within the file's length, the VideoStreamingService SHALL return a ResourceRegion
 * whose offset and length match the requested range, and the response content length
 * SHALL not exceed the configured chunk size.
 *
 * Validates: Requirements 2.1
 */
class VideoStreamingServicePropertyTest {

    private static final long MAX_CHUNK_SIZE = 1024 * 1024; // 1MB — matches VideoStreamingService
    private static final String TUTORIAL_ID = "test-tutorial";
    private static final String VIDEO_FILENAME = "lesson.mp4";

    private Path tempDir;
    private TutorialScannerService scannerService;
    private SubtitleGenerationService subtitleGenerationService;
    private VideoStreamingService streamingService;

    @BeforeProperty
    void setUp() throws IOException {
        tempDir = Files.createTempDirectory("video-streaming-prop-test");
        Path tutorialDir = tempDir.resolve(TUTORIAL_ID);
        Files.createDirectories(tutorialDir);

        scannerService = mock(TutorialScannerService.class);
        subtitleGenerationService = mock(SubtitleGenerationService.class);
        TutorialInfo info = new TutorialInfo(TUTORIAL_ID, "Test Tutorial", VIDEO_FILENAME, false, false);
        when(scannerService.getTutorial(TUTORIAL_ID)).thenReturn(Optional.of(info));

        streamingService = new VideoStreamingService(scannerService, subtitleGenerationService, tempDir.toString());
    }

    /**
     * Creates a video file of the given size in the temp tutorial directory.
     */
    private void createVideoFile(long fileSize) throws IOException {
        Path videoPath = tempDir.resolve(TUTORIAL_ID).resolve(VIDEO_FILENAME);
        // Write a file of the exact requested size
        try (var out = Files.newOutputStream(videoPath)) {
            long remaining = fileSize;
            byte[] buffer = new byte[(int) Math.min(8192, remaining)];
            while (remaining > 0) {
                int toWrite = (int) Math.min(buffer.length, remaining);
                out.write(buffer, 0, toWrite);
                remaining -= toWrite;
            }
        }
    }

    @Property(tries = 150)
    void rangeRequestReturnsCorrectOffsetAndCappedLength(
            @ForAll("validRangeInputs") RangeInput input) throws IOException {

        createVideoFile(input.fileSize());

        HttpHeaders headers = new HttpHeaders();
        headers.setRange(HttpRange.parseRanges("bytes=" + input.start() + "-" + input.end()));

        ResourceRegion region = streamingService.getVideoRegion(TUTORIAL_ID, headers);

        long requestedLength = input.end() - input.start() + 1;
        long expectedLength = Math.min(requestedLength, MAX_CHUNK_SIZE);

        assertThat(region.getPosition())
                .as("Region offset should match requested range start")
                .isEqualTo(input.start());

        assertThat(region.getCount())
                .as("Region length should be min(requestedLength, MAX_CHUNK_SIZE)")
                .isEqualTo(expectedLength);

        assertThat(region.getCount())
                .as("Region length must not exceed MAX_CHUNK_SIZE")
                .isLessThanOrEqualTo(MAX_CHUNK_SIZE);
    }

    @Property(tries = 150)
    void noRangeHeaderReturnsFromBeginningCappedAtChunkSize(
            @ForAll("validFileSizes") long fileSize) throws IOException {

        createVideoFile(fileSize);

        HttpHeaders headers = new HttpHeaders();

        ResourceRegion region = streamingService.getVideoRegion(TUTORIAL_ID, headers);

        long expectedLength = Math.min(fileSize, MAX_CHUNK_SIZE);

        assertThat(region.getPosition())
                .as("Without Range header, position should be 0")
                .isEqualTo(0);

        assertThat(region.getCount())
                .as("Without Range header, length should be min(fileSize, MAX_CHUNK_SIZE)")
                .isEqualTo(expectedLength);

        assertThat(region.getCount())
                .as("Region length must not exceed MAX_CHUNK_SIZE")
                .isLessThanOrEqualTo(MAX_CHUNK_SIZE);
    }

    @Provide
    Arbitrary<Long> validFileSizes() {
        // File sizes from 1 byte to 10MB
        return Arbitraries.longs().between(1, 10 * 1024 * 1024);
    }

    @Provide
    Arbitrary<RangeInput> validRangeInputs() {
        return Arbitraries.longs().between(1, 10L * 1024 * 1024)
                .flatMap(fileSize ->
                        Arbitraries.longs().between(0, fileSize - 1)
                                .flatMap(start ->
                                        Arbitraries.longs().between(start, fileSize - 1)
                                                .map(end -> new RangeInput(fileSize, start, end))
                                )
                );
    }

    record RangeInput(long fileSize, long start, long end) {
        @Override
        public String toString() {
            return "RangeInput{fileSize=" + fileSize + ", start=" + start + ", end=" + end + "}";
        }
    }
}
