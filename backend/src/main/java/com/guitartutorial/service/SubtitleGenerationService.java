package com.guitartutorial.service;

import com.guitartutorial.dto.TutorialInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.TimeUnit;

/**
 * Service that generates SRT subtitle files from video files using Faster-Whisper.
 * <p>
 * The actual transcription is delegated to a Python script ({@code scripts/generate_subtitles.py})
 * that uses the Faster-Whisper library. Generation runs asynchronously so the video
 * can start playing without subtitles; once the SRT file is written, subsequent requests
 * will serve it.
 */
@Service
public class SubtitleGenerationService {

    private static final Logger log = LoggerFactory.getLogger(SubtitleGenerationService.class);

    /**
     * Tracks in-progress generation tasks per tutorial ID to avoid duplicate work.
     */
    private final ConcurrentHashMap<String, CompletableFuture<Void>> pendingGenerations = new ConcurrentHashMap<>();

    /**
     * Tracks tutorials for which subtitle generation has permanently failed.
     * This prevents an infinite re-trigger loop where every frontend poll
     * triggers a new failed generation attempt.
     */
    private final Set<String> failedGenerations = new CopyOnWriteArraySet<>();

    private final Path scriptsDirectory;
    private final Path tutorialsDirectory;
    private final String modelSize;
    private final String language;

    public SubtitleGenerationService(
            @Value("${tutorials.directory}") String tutorialsDirectoryPath,
            @Value("${subtitles.model-size:base}") String modelSize,
            @Value("${subtitles.language:en}") String language,
            @Value("${scripts.directory:scripts}") String scriptsDirectoryPath) {
        this.scriptsDirectory = Paths.get(scriptsDirectoryPath);
        this.tutorialsDirectory = Paths.get(tutorialsDirectoryPath);
        this.modelSize = modelSize;
        this.language = language;
    }

    /**
     * Returns {@code true} if an SRT subtitle file already exists for the given tutorial.
     */
    public boolean hasSubtitleFile(String tutorialId) {
        Path tutorialDir = tutorialsDirectory.resolve(tutorialId);
        if (!Files.isDirectory(tutorialDir)) {
            return false;
        }
        try (var stream = Files.list(tutorialDir)) {
            return stream.anyMatch(p ->
                    Files.isRegularFile(p) && p.getFileName().toString().toLowerCase().endsWith(".srt"));
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Returns {@code true} if subtitle generation has permanently failed for this tutorial.
     */
    public boolean hasGenerationFailed(String tutorialId) {
        return failedGenerations.contains(tutorialId);
    }

    /**
     * Ensures subtitles are generated for the given tutorial.
     * If an SRT file already exists, returns immediately.
     * If generation has previously failed, returns a completed future (no retry).
     * Otherwise, starts an asynchronous generation task.
     *
     * @param tutorial the tutorial metadata (must contain the video filename)
     * @return a CompletableFuture that completes when generation is done (or immediately if already present/failed)
     */
    public CompletableFuture<Void> ensureSubtitles(TutorialInfo tutorial) {
        String tutorialId = tutorial.id();

        if (hasSubtitleFile(tutorialId)) {
            return CompletableFuture.completedFuture(null);
        }

        // If generation has permanently failed, don't retry
        if (hasGenerationFailed(tutorialId)) {
            return CompletableFuture.completedFuture(null);
        }

        // Check if generation is already in progress for this tutorial
        CompletableFuture<Void> existing = pendingGenerations.get(tutorialId);
        if (existing != null && !existing.isDone()) {
            log.info("Subtitle generation already in progress for tutorial: {}", tutorialId);
            return existing;
        }

        // Start a new generation task
        CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
            try {
                generateSubtitlesSync(tutorial);
            } finally {
                pendingGenerations.remove(tutorialId);
            }
        });

        // If generation fails, mark it as permanently failed to prevent re-trigger loops
        future.exceptionally(ex -> {
            log.warn("Subtitle generation permanently failed for tutorial '{}': {}", tutorialId, ex.getMessage());
            failedGenerations.add(tutorialId);
            return null;
        });

        CompletableFuture<Void> raceWinner = pendingGenerations.putIfAbsent(tutorialId, future);
        if (raceWinner != null && !raceWinner.isDone()) {
            // Another thread beat us to it
            return raceWinner;
        }

        return future;
    }

    /**
     * Synchronously runs the Faster-Whisper Python script to generate subtitles.
     */
    private void generateSubtitlesSync(TutorialInfo tutorial) throws RuntimeException {
        String tutorialId = tutorial.id();
        Path tutorialDir = tutorialsDirectory.resolve(tutorialId);
        Path videoPath = tutorialDir.resolve(tutorial.videoFilename());

        if (!Files.exists(videoPath)) {
            log.warn("Video file not found for tutorial '{}': {}", tutorialId, videoPath);
            return;
        }

        // Determine output SRT path (same name as video but with .srt extension)
        String videoName = tutorial.videoFilename();
        String srtName = videoName.replaceAll("\\.[^.]+$", ".srt");
        Path srtPath = tutorialDir.resolve(srtName);

        Path scriptPath = scriptsDirectory.resolve("generate_subtitles.py");
        if (!Files.exists(scriptPath)) {
            log.warn("Subtitle generation script not found at: {}", scriptPath.toAbsolutePath());
            return;
        }

        ProcessBuilder pb = new ProcessBuilder(
                "python3",
                scriptPath.toAbsolutePath().toString(),
                videoPath.toAbsolutePath().toString(),
                srtPath.toAbsolutePath().toString(),
                "--model-size", modelSize,
                "--language", language
        );

        pb.redirectErrorStream(true);

        log.info("Starting subtitle generation for tutorial '{}' (model: {}, language: {})",
                tutorialId, modelSize, language);

        long startTime = System.currentTimeMillis();

        try {
            Process process = pb.start();

            // Read output in a separate thread to avoid buffer deadlock
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                    log.debug("[whisper] {}", line);
                }
            }

            boolean finished = process.waitFor(30, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                log.error("Subtitle generation timed out after 30 minutes for tutorial '{}'", tutorialId);
                return;
            }

            int exitCode = process.exitValue();
            long duration = System.currentTimeMillis() - startTime;

            if (exitCode == 0) {
                log.info("Subtitle generation completed for tutorial '{}' in {}ms", tutorialId, duration);
            } else {
                String msg = String.format(
                        "Subtitle generation exited with code %d for tutorial '%s' in %dms",
                        exitCode, tutorialId, duration);
                log.warn("{}\nOutput:\n{}", msg, output);
                throw new RuntimeException(msg);
            }
        } catch (IOException e) {
            log.error("Failed to start subtitle generation for tutorial '{}': {}", tutorialId, e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Subtitle generation interrupted for tutorial '{}'", tutorialId);
        }
    }
}
