package com.guitartutorial.service;

import com.guitartutorial.dto.TutorialInfo;
import com.guitartutorial.exception.StorageAccessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class TutorialScannerServiceTest {

    @TempDir
    Path tempDir;

    private TutorialScannerService service;

    @BeforeEach
    void setUp() {
        service = new TutorialScannerService(tempDir.toString());
    }

    @Test
    void scanTutorials_returnsEmptyListWhenNoSubdirectories() {
        List<TutorialInfo> result = service.scanTutorials();
        assertTrue(result.isEmpty());
    }

    @Test
    void scanTutorials_excludesSubdirectoriesWithNoVideoFile() throws IOException {
        Path noVideoDir = tempDir.resolve("no-video");
        Files.createDirectory(noVideoDir);
        Files.createFile(noVideoDir.resolve("notes.txt"));

        List<TutorialInfo> result = service.scanTutorials();
        assertTrue(result.isEmpty());
    }

    @Test
    void scanTutorials_includesSubdirectoryWithMp4File() throws IOException {
        Path tutorialDir = tempDir.resolve("blues-lesson");
        Files.createDirectory(tutorialDir);
        Files.createFile(tutorialDir.resolve("lesson.mp4"));

        List<TutorialInfo> result = service.scanTutorials();
        assertEquals(1, result.size());

        TutorialInfo info = result.get(0);
        assertEquals("blues-lesson", info.id());
        assertEquals("Blues Lesson", info.name());
        assertEquals("lesson.mp4", info.videoFilename());
        assertFalse(info.hasSubtitle());
        assertFalse(info.hasTablature());
    }

    @Test
    void scanTutorials_detectsSubtitleAndTablatureFiles() throws IOException {
        Path tutorialDir = tempDir.resolve("fingerpicking_basics");
        Files.createDirectory(tutorialDir);
        Files.createFile(tutorialDir.resolve("video.mkv"));
        Files.createFile(tutorialDir.resolve("subtitles.srt"));
        Files.createFile(tutorialDir.resolve("tabs.pdf"));

        List<TutorialInfo> result = service.scanTutorials();
        assertEquals(1, result.size());

        TutorialInfo info = result.get(0);
        assertEquals("fingerpicking_basics", info.id());
        assertEquals("Fingerpicking Basics", info.name());
        assertEquals("video.mkv", info.videoFilename());
        assertTrue(info.hasSubtitle());
        assertTrue(info.hasTablature());
    }

    @Test
    void scanTutorials_supportsAllVideoExtensions() throws IOException {
        for (String ext : List.of(".mp4", ".mkv", ".webm", ".avi")) {
            Path dir = tempDir.resolve("tutorial" + ext.replace(".", "-"));
            Files.createDirectory(dir);
            Files.createFile(dir.resolve("video" + ext));
        }

        List<TutorialInfo> result = service.scanTutorials();
        assertEquals(4, result.size());
    }

    @Test
    void scanTutorials_ignoresRegularFilesInRootDirectory() throws IOException {
        Files.createFile(tempDir.resolve("readme.txt"));

        Path tutorialDir = tempDir.resolve("lesson-one");
        Files.createDirectory(tutorialDir);
        Files.createFile(tutorialDir.resolve("video.mp4"));

        List<TutorialInfo> result = service.scanTutorials();
        assertEquals(1, result.size());
    }

    @Test
    void scanTutorials_throwsStorageAccessExceptionForNonExistentDirectory() {
        TutorialScannerService badService = new TutorialScannerService("/nonexistent/path");
        assertThrows(StorageAccessException.class, badService::scanTutorials);
    }

    @Test
    void getTutorial_returnsInfoForValidDirectory() throws IOException {
        Path tutorialDir = tempDir.resolve("chord-progressions");
        Files.createDirectory(tutorialDir);
        Files.createFile(tutorialDir.resolve("lesson.webm"));
        Files.createFile(tutorialDir.resolve("tabs.pdf"));

        Optional<TutorialInfo> result = service.getTutorial("chord-progressions");
        assertTrue(result.isPresent());

        TutorialInfo info = result.get();
        assertEquals("chord-progressions", info.id());
        assertEquals("Chord Progressions", info.name());
        assertEquals("lesson.webm", info.videoFilename());
        assertFalse(info.hasSubtitle());
        assertTrue(info.hasTablature());
    }

    @Test
    void getTutorial_returnsEmptyForNonExistentDirectory() {
        Optional<TutorialInfo> result = service.getTutorial("nonexistent");
        assertTrue(result.isEmpty());
    }

    @Test
    void getTutorial_returnsEmptyForDirectoryWithNoVideo() throws IOException {
        Path noVideoDir = tempDir.resolve("empty-dir");
        Files.createDirectory(noVideoDir);
        Files.createFile(noVideoDir.resolve("notes.txt"));

        Optional<TutorialInfo> result = service.getTutorial("empty-dir");
        assertTrue(result.isEmpty());
    }

    @Test
    void getTutorial_throwsStorageAccessExceptionForNonExistentRootDirectory() {
        TutorialScannerService badService = new TutorialScannerService("/nonexistent/path");
        assertThrows(StorageAccessException.class, () -> badService.getTutorial("any"));
    }

    @Test
    void toDisplayName_replacesHyphensWithSpacesAndCapitalizes() {
        assertEquals("Blues Lesson", TutorialScannerService.toDisplayName("blues-lesson"));
    }

    @Test
    void toDisplayName_replacesUnderscoresWithSpacesAndCapitalizes() {
        assertEquals("Fingerpicking Basics", TutorialScannerService.toDisplayName("fingerpicking_basics"));
    }

    @Test
    void toDisplayName_handlesMixedSeparators() {
        assertEquals("My Guitar Lesson", TutorialScannerService.toDisplayName("my-guitar_lesson"));
    }

    @Test
    void toDisplayName_handlesSingleWord() {
        assertEquals("Scales", TutorialScannerService.toDisplayName("scales"));
    }
}
