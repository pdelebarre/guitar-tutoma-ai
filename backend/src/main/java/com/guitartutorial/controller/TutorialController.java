package com.guitartutorial.controller;

import com.guitartutorial.dto.TutorialInfo;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.exception.TutorialNotFoundException;
import com.guitartutorial.service.TutorialScannerService;
import com.guitartutorial.service.VideoStreamingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tutorials")
public class TutorialController {

    private static final Logger log = LoggerFactory.getLogger(TutorialController.class);

    private final TutorialScannerService tutorialScannerService;
    private final VideoStreamingService videoStreamingService;
    private final Path tutorialsDirectory;

    public TutorialController(
            TutorialScannerService tutorialScannerService,
            VideoStreamingService videoStreamingService,
            @Value("${tutorials.directory}") String tutorialsDirectoryPath) {
        this.tutorialScannerService = tutorialScannerService;
        this.videoStreamingService = videoStreamingService;
        this.tutorialsDirectory = Paths.get(tutorialsDirectoryPath).toAbsolutePath().normalize();
    }

    @GetMapping
    public ResponseEntity<List<TutorialInfo>> listTutorials() {
        List<TutorialInfo> tutorials = tutorialScannerService.scanTutorials();
        return ResponseEntity.ok(tutorials);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TutorialInfo> getTutorial(@PathVariable String id) {
        TutorialInfo tutorial = tutorialScannerService.getTutorial(id)
                .orElseThrow(() -> new TutorialNotFoundException(id));
        return ResponseEntity.ok(tutorial);
    }

    @GetMapping("/{id}/video")
    public ResponseEntity<ResourceRegion> streamVideo(
            @PathVariable String id,
            @RequestHeader HttpHeaders headers) throws IOException {
        ResourceRegion region = videoStreamingService.getVideoRegion(id, headers);

        // Determine the video content type from the resource filename
        MediaType contentType = MediaTypeFactory
                .getMediaType(region.getResource())
                .orElse(MediaType.APPLICATION_OCTET_STREAM);

        if (!headers.getRange().isEmpty()) {
            return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                    .contentType(contentType)
                    .body(region);
        }

        return ResponseEntity.ok()
                .contentType(contentType)
                .body(region);
    }

    @GetMapping("/{id}/subtitle")
    public ResponseEntity<Resource> getSubtitle(@PathVariable String id) {
        Resource subtitleResource = videoStreamingService.getSubtitleFile(id)
                .orElseThrow(() -> new ResourceNotFoundException("No subtitle file for this tutorial"));

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/vtt; charset=utf-8"))
                .body(subtitleResource);
    }

    @GetMapping("/{id}/tablature")
    public ResponseEntity<Resource> getTablature(@PathVariable String id) {
        // Validate tutorialId to prevent path traversal
        if (id == null || !id.matches("[a-zA-Z0-9_-]+")) {
            return ResponseEntity.badRequest().body(null);
        }

        TutorialInfo tutorial = tutorialScannerService.getTutorial(id)
                .orElseThrow(() -> new TutorialNotFoundException(id));

        if (!tutorial.hasTablature()) {
            throw new ResourceNotFoundException("No tablature file for this tutorial");
        }

        Path tutorialDir = tutorialsDirectory.resolve(id).normalize();
        if (!tutorialDir.startsWith(tutorialsDirectory)) {
            log.warn("Path traversal attempt detected for tutorialId: {}", id);
            return ResponseEntity.badRequest().body(null);
        }

        try {
            Path pdfPath = Files.list(tutorialDir)
                    .filter(p -> Files.isRegularFile(p)
                            && p.getFileName().toString().toLowerCase().endsWith(".pdf"))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("No tablature file for this tutorial"));

            Resource pdfResource = new UrlResource(pdfPath.toUri());
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfResource);
        } catch (IOException e) {
            throw new ResourceNotFoundException("No tablature file for this tutorial");
        }
    }
}
