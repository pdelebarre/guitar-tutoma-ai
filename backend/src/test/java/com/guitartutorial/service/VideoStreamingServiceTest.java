package com.guitartutorial.service;

import com.guitartutorial.dto.TutorialInfo;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.exception.TutorialNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VideoStreamingServiceTest {

    @TempDir
    Path tempDir;

    private TutorialScannerService scannerService;
    private VideoStreamingService streamingService;

    @BeforeEach
    void setUp() {
        scannerService = mock(TutorialScannerService.class);
        streamingService = new VideoStreamingService(scannerService, tempDir.toString());
    }

    @Test
    void getVideoRegion_withRangeHeader_returnsCorrectRegion() throws IOException {
        // Set up tutorial directory with a video file
        Path tutorialDir = tempDir.resolve("my-tutorial");
        Files.createDirectories(tutorialDir);
        byte[] videoContent = new byte[5 * 1024 * 1024]; // 5MB
        Files.write(tutorialDir.resolve("lesson.mp4"), videoContent);

        TutorialInfo info = new TutorialInfo("my-tutorial", "My Tutorial", "lesson.mp4", false, false);
        when(scannerService.getTutorial("my-tutorial")).thenReturn(Optional.of(info));

        HttpHeaders headers = new HttpHeaders();
        headers.setRange(HttpRange.parseRanges("bytes=0-999999"));

        ResourceRegion region = streamingService.getVideoRegion("my-tutorial", headers);

        assertNotNull(region);
        assertEquals(0, region.getPosition());
        assertEquals(1000000, region.getCount());
    }

    @Test
    void getVideoRegion_withRangeExceedingChunkSize_capsAt1MB() throws IOException {
        Path tutorialDir = tempDir.resolve("my-tutorial");
        Files.createDirectories(tutorialDir);
        byte[] videoContent = new byte[5 * 1024 * 1024]; // 5MB
        Files.write(tutorialDir.resolve("lesson.mp4"), videoContent);

        TutorialInfo info = new TutorialInfo("my-tutorial", "My Tutorial", "lesson.mp4", false, false);
        when(scannerService.getTutorial("my-tutorial")).thenReturn(Optional.of(info));

        HttpHeaders headers = new HttpHeaders();
        headers.setRange(HttpRange.parseRanges("bytes=0-2097151")); // Request 2MB

        ResourceRegion region = streamingService.getVideoRegion("my-tutorial", headers);

        assertNotNull(region);
        assertEquals(0, region.getPosition());
        assertTrue(region.getCount() <= 1024 * 1024, "Chunk size should be capped at 1MB");
    }

    @Test
    void getVideoRegion_withoutRangeHeader_returnsFromBeginning() throws IOException {
        Path tutorialDir = tempDir.resolve("my-tutorial");
        Files.createDirectories(tutorialDir);
        byte[] videoContent = new byte[5 * 1024 * 1024]; // 5MB
        Files.write(tutorialDir.resolve("lesson.mp4"), videoContent);

        TutorialInfo info = new TutorialInfo("my-tutorial", "My Tutorial", "lesson.mp4", false, false);
        when(scannerService.getTutorial("my-tutorial")).thenReturn(Optional.of(info));

        HttpHeaders headers = new HttpHeaders();

        ResourceRegion region = streamingService.getVideoRegion("my-tutorial", headers);

        assertNotNull(region);
        assertEquals(0, region.getPosition());
        assertTrue(region.getCount() <= 1024 * 1024, "Chunk size should be capped at 1MB");
    }

    @Test
    void getVideoRegion_withSmallFile_returnsEntireFile() throws IOException {
        Path tutorialDir = tempDir.resolve("my-tutorial");
        Files.createDirectories(tutorialDir);
        byte[] videoContent = new byte[500]; // 500 bytes
        Files.write(tutorialDir.resolve("lesson.mp4"), videoContent);

        TutorialInfo info = new TutorialInfo("my-tutorial", "My Tutorial", "lesson.mp4", false, false);
        when(scannerService.getTutorial("my-tutorial")).thenReturn(Optional.of(info));

        HttpHeaders headers = new HttpHeaders();

        ResourceRegion region = streamingService.getVideoRegion("my-tutorial", headers);

        assertNotNull(region);
        assertEquals(0, region.getPosition());
        assertEquals(500, region.getCount());
    }

    @Test
    void getVideoRegion_withInvalidTutorialId_throwsTutorialNotFoundException() {
        when(scannerService.getTutorial("nonexistent")).thenReturn(Optional.empty());

        HttpHeaders headers = new HttpHeaders();

        assertThrows(TutorialNotFoundException.class,
                () -> streamingService.getVideoRegion("nonexistent", headers));
    }

    @Test
    void getVideoRegion_withMissingVideoFile_throwsResourceNotFoundException() {
        Path tutorialDir = tempDir.resolve("my-tutorial");
        // Directory exists but no video file
        try {
            Files.createDirectories(tutorialDir);
        } catch (IOException e) {
            fail("Could not create test directory");
        }

        TutorialInfo info = new TutorialInfo("my-tutorial", "My Tutorial", "lesson.mp4", false, false);
        when(scannerService.getTutorial("my-tutorial")).thenReturn(Optional.of(info));

        HttpHeaders headers = new HttpHeaders();

        assertThrows(ResourceNotFoundException.class,
                () -> streamingService.getVideoRegion("my-tutorial", headers));
    }

    @Test
    void getVideoRegion_withMiddleRange_returnsCorrectOffset() throws IOException {
        Path tutorialDir = tempDir.resolve("my-tutorial");
        Files.createDirectories(tutorialDir);
        byte[] videoContent = new byte[5 * 1024 * 1024]; // 5MB
        Files.write(tutorialDir.resolve("lesson.mp4"), videoContent);

        TutorialInfo info = new TutorialInfo("my-tutorial", "My Tutorial", "lesson.mp4", false, false);
        when(scannerService.getTutorial("my-tutorial")).thenReturn(Optional.of(info));

        HttpHeaders headers = new HttpHeaders();
        headers.setRange(HttpRange.parseRanges("bytes=1048576-2097151")); // 1MB to 2MB

        ResourceRegion region = streamingService.getVideoRegion("my-tutorial", headers);

        assertNotNull(region);
        assertEquals(1048576, region.getPosition());
        assertTrue(region.getCount() <= 1024 * 1024, "Chunk size should be capped at 1MB");
    }

    @Test
    void getSubtitleFile_withSrtPresent_returnsResource() throws IOException {
        Path tutorialDir = tempDir.resolve("my-tutorial");
        Files.createDirectories(tutorialDir);
        Files.writeString(tutorialDir.resolve("lesson.srt"), "1\n00:00:01,000 --> 00:00:02,000\nHello");

        TutorialInfo info = new TutorialInfo("my-tutorial", "My Tutorial", "lesson.mp4", true, false);
        when(scannerService.getTutorial("my-tutorial")).thenReturn(Optional.of(info));

        Optional<Resource> result = streamingService.getSubtitleFile("my-tutorial");

        assertTrue(result.isPresent());
        assertTrue(result.get().exists());
    }

    @Test
    void getSubtitleFile_withNoSrt_returnsEmpty() throws IOException {
        Path tutorialDir = tempDir.resolve("my-tutorial");
        Files.createDirectories(tutorialDir);
        Files.write(tutorialDir.resolve("lesson.mp4"), new byte[100]);

        TutorialInfo info = new TutorialInfo("my-tutorial", "My Tutorial", "lesson.mp4", false, false);
        when(scannerService.getTutorial("my-tutorial")).thenReturn(Optional.of(info));

        Optional<Resource> result = streamingService.getSubtitleFile("my-tutorial");

        assertTrue(result.isEmpty());
    }

    @Test
    void getSubtitleFile_withInvalidTutorialId_throwsTutorialNotFoundException() {
        when(scannerService.getTutorial("nonexistent")).thenReturn(Optional.empty());

        assertThrows(TutorialNotFoundException.class,
                () -> streamingService.getSubtitleFile("nonexistent"));
    }
}
