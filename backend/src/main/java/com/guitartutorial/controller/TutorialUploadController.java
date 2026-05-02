package com.guitartutorial.controller;

import com.guitartutorial.dto.CreateTutorialRequest;
import com.guitartutorial.dto.TutorialUploadResponse;
import com.guitartutorial.security.CurrentUserId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Set;

/**
 * Controller for creating new tutorials and uploading video + PDF files.
 * Files are stored in the tutorials directory (mounted as a Docker volume).
 */
@RestController
@RequestMapping("/api/tutorials")
public class TutorialUploadController {

    private static final Logger log = LoggerFactory.getLogger(TutorialUploadController.class);

    private static final Set<String> VIDEO_EXTENSIONS = Set.of(".mp4", ".mkv", ".webm", ".avi", ".mov");
    private static final long MAX_FILE_SIZE = 500L * 1024 * 1024; // 500MB

    private final Path tutorialsDirectory;

    public TutorialUploadController(
            @Value("${tutorials.directory}") String tutorialsDirectoryPath) {
        // Resolve relative paths against the current working directory
        this.tutorialsDirectory = Paths.get(tutorialsDirectoryPath).toAbsolutePath().normalize();
    }

    /**
     * Create a new tutorial directory.
     * POST /api/tutorials/create
     */
    @PostMapping("/create")
    public ResponseEntity<?> createTutorial(
            @CurrentUserId Long userId,
            @RequestParam("tutorialId") String tutorialId,
            @RequestParam(value = "displayName", required = false) String displayName) {

        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }

        if (tutorialId == null || tutorialId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "tutorialId is required"));
        }

        // Sanitize tutorial ID: only allow alphanumeric, hyphens, underscores
        if (!tutorialId.matches("[a-zA-Z0-9_-]+")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "tutorialId must contain only letters, numbers, hyphens, and underscores"));
        }

        Path tutorialDir = tutorialsDirectory.resolve(tutorialId).normalize();
        if (!tutorialDir.startsWith(tutorialsDirectory)) {
            log.warn("Path traversal attempt detected for tutorialId: {}", tutorialId);
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid tutorialId"));
        }

        if (Files.exists(tutorialDir)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Tutorial already exists: " + tutorialId));
        }

        try {
            Files.createDirectories(tutorialDir);
            log.info("Tutorial directory created: {} (by user {})", tutorialDir, userId);

            String name = (displayName != null && !displayName.isBlank()) ? displayName : tutorialId;
            return ResponseEntity.ok(Map.of(
                    "tutorialId", tutorialId,
                    "displayName", name,
                    "message", "Tutorial created successfully"
            ));
        } catch (IOException e) {
            log.error("Failed to create tutorial directory '{}': {}", tutorialId, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to create tutorial"));
        }
    }

    /**
     * Upload video and/or PDF files to an existing tutorial directory.
     * POST /api/tutorials/{tutorialId}/upload-files
     */
    @PostMapping(value = "/{tutorialId}/upload-files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadTutorialFiles(
            @CurrentUserId Long userId,
            @PathVariable("tutorialId") String tutorialId,
            @RequestPart(value = "video", required = false) MultipartFile videoFile,
            @RequestPart(value = "pdf", required = false) MultipartFile pdfFile) {

        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }

        if (videoFile == null && pdfFile == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "At least one file (video or PDF) must be provided"));
        }

        Path tutorialDir = tutorialsDirectory.resolve(tutorialId).normalize();
        if (!tutorialDir.startsWith(tutorialsDirectory)) {
            log.warn("Path traversal attempt detected for tutorialId: {}", tutorialId);
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid tutorialId"));
        }

        if (!Files.exists(tutorialDir) || !Files.isDirectory(tutorialDir)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Tutorial does not exist: " + tutorialId + ". Create it first via POST /api/tutorials/create"));
        }

        String videoFilename = null;
        String pdfFilename = null;
        boolean videoUploaded = false;
        boolean pdfUploaded = false;

        try {
            // Upload video file
            if (videoFile != null && !videoFile.isEmpty()) {
                String originalName = videoFile.getOriginalFilename();
                if (originalName == null || !isVideoFile(originalName)) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "error", "Invalid video file. Supported formats: mp4, mkv, webm, avi, mov"));
                }
                if (videoFile.getSize() > MAX_FILE_SIZE) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "error", "Video file too large. Maximum size is 500MB"));
                }

                // Use original filename or generate one
                String destName = sanitizeFilename(originalName);
                Path destPath = tutorialDir.resolve(destName).normalize();
                if (!destPath.startsWith(tutorialDir)) {
                    log.warn("Path traversal attempt detected in video filename: {}", originalName);
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid filename"));
                }
                videoFile.transferTo(destPath.toFile());
                videoFilename = destName;
                videoUploaded = true;
                log.info("Video uploaded for tutorial '{}': {} ({} bytes)", tutorialId, destName, videoFile.getSize());
            }

            // Upload PDF file
            if (pdfFile != null && !pdfFile.isEmpty()) {
                String originalName = pdfFile.getOriginalFilename();
                if (originalName == null || !originalName.toLowerCase().endsWith(".pdf")) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "error", "Invalid PDF file. Only .pdf files are accepted"));
                }

                String destName = sanitizeFilename(originalName);
                Path destPath = tutorialDir.resolve(destName).normalize();
                if (!destPath.startsWith(tutorialDir)) {
                    log.warn("Path traversal attempt detected in PDF filename: {}", originalName);
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid filename"));
                }
                pdfFile.transferTo(destPath.toFile());
                pdfFilename = destName;
                pdfUploaded = true;
                log.info("PDF uploaded for tutorial '{}': {} ({} bytes)", tutorialId, destName, pdfFile.getSize());
            }

            String displayName = tutorialId; // Will be formatted by TutorialScannerService
            return ResponseEntity.ok(new TutorialUploadResponse(
                    tutorialId, displayName, videoUploaded, pdfUploaded,
                    videoFilename, pdfFilename, "Files uploaded successfully"
            ));

        } catch (IOException e) {
            log.error("Failed to upload files for tutorial '{}': {}", tutorialId, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload files"));
        }
    }

    private boolean isVideoFile(String filename) {
        String lower = filename.toLowerCase();
        return VIDEO_EXTENSIONS.stream().anyMatch(lower::endsWith);
    }

    private String sanitizeFilename(String filename) {
        // Reject filenames containing path traversal sequences
        if (filename.contains("..")) {
            throw new IllegalArgumentException("Filename must not contain '..'");
        }
        // Remove path traversal characters
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
