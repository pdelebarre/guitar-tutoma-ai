package com.guitartutorial.service;

import com.guitartutorial.dto.TutorialInfo;
import com.guitartutorial.exception.StorageAccessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class TutorialScannerService {

    private static final Logger log = LoggerFactory.getLogger(TutorialScannerService.class);

    private static final Set<String> VIDEO_EXTENSIONS = Set.of(".mp4", ".mkv", ".webm", ".avi");

    private final Path tutorialsDirectory;

    public TutorialScannerService(@Value("${tutorials.directory}") String tutorialsDirectoryPath) {
        this.tutorialsDirectory = Paths.get(tutorialsDirectoryPath).toAbsolutePath().normalize();
    }

    /**
     * Scans the tutorials directory for subdirectories containing at least one video file.
     * Returns a list of TutorialInfo DTOs with metadata about available files.
     *
     * @return list of tutorial info for all valid tutorial subdirectories
     * @throws StorageAccessException if the tutorials directory is not accessible
     */
    public List<TutorialInfo> scanTutorials() {
        validateDirectoryAccessible();

        List<TutorialInfo> tutorials = new ArrayList<>();

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(tutorialsDirectory)) {
            for (Path entry : stream) {
                if (Files.isDirectory(entry)) {
                    buildTutorialInfo(entry).ifPresent(tutorials::add);
                }
            }
        } catch (IOException e) {
            throw new StorageAccessException("Failed to scan tutorials directory: " + tutorialsDirectory, e);
        }

        return tutorials;
    }

    /**
     * Returns file metadata for a single tutorial by directory name.
     *
     * @param directoryName the name of the tutorial subdirectory
     * @return an Optional containing the TutorialInfo if the directory is valid, or empty otherwise
     * @throws StorageAccessException if the tutorials directory is not accessible
     */
    public Optional<TutorialInfo> getTutorial(String directoryName) {
        validateDirectoryAccessible();

        Path tutorialDir = tutorialsDirectory.resolve(directoryName);
        if (!Files.isDirectory(tutorialDir)) {
            return Optional.empty();
        }

        return buildTutorialInfo(tutorialDir);
    }

    private void validateDirectoryAccessible() {
        // Create the tutorials directory if it doesn't exist
        if (!Files.exists(tutorialsDirectory)) {
            try {
                Files.createDirectories(tutorialsDirectory);
                log.info("Created tutorials directory: {}", tutorialsDirectory);
            } catch (IOException e) {
                throw new StorageAccessException("Failed to create tutorials directory: " + tutorialsDirectory, e);
            }
        }
        if (!Files.isDirectory(tutorialsDirectory) || !Files.isReadable(tutorialsDirectory)) {
            throw new StorageAccessException("Tutorials directory is not accessible: " + tutorialsDirectory);
        }
    }

    private Optional<TutorialInfo> buildTutorialInfo(Path directory) {
        try {
            String videoFilename = findFirstVideoFile(directory);
            if (videoFilename == null) {
                return Optional.empty();
            }

            String dirName = directory.getFileName().toString();
            String displayName = toDisplayName(dirName);
            // Subtitles can be auto-generated on-demand via Faster-Whisper,
            // so we always report hasSubtitle=true when a video file exists.
            boolean hasSubtitle = true;
            boolean hasTablature = hasFileWithExtension(directory, ".pdf");

            return Optional.of(new TutorialInfo(dirName, displayName, videoFilename, hasSubtitle, hasTablature));
        } catch (IOException e) {
            // If we can't read a subdirectory, skip it
            return Optional.empty();
        }
    }

    private String findFirstVideoFile(Path directory) throws IOException {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(directory)) {
            for (Path file : stream) {
                if (Files.isRegularFile(file) && isVideoFile(file)) {
                    return file.getFileName().toString();
                }
            }
        }
        return null;
    }

    private boolean isVideoFile(Path file) {
        String fileName = file.getFileName().toString().toLowerCase();
        return VIDEO_EXTENSIONS.stream().anyMatch(fileName::endsWith);
    }

    private boolean hasFileWithExtension(Path directory, String extension) throws IOException {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(directory)) {
            for (Path file : stream) {
                if (Files.isRegularFile(file) && file.getFileName().toString().toLowerCase().endsWith(extension)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Converts a directory name to a human-readable display name.
     * Replaces hyphens and underscores with spaces, then capitalizes each word.
     *
     * @param directoryName the raw directory name
     * @return a formatted display name
     */
    static String toDisplayName(String directoryName) {
        String[] words = directoryName.split("[-_]");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            if (i > 0) {
                sb.append(' ');
            }
            String word = words[i].trim();
            if (!word.isEmpty()) {
                sb.append(Character.toUpperCase(word.charAt(0)));
                if (word.length() > 1) {
                    sb.append(word.substring(1));
                }
            }
        }
        return sb.toString();
    }
}
