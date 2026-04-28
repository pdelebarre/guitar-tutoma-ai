package com.guitartutorial.controller;

import com.guitartutorial.dto.AddTutorialRequest;
import com.guitartutorial.dto.CreatePlaylistRequest;
import com.guitartutorial.dto.PlaylistDto;
import com.guitartutorial.dto.ReorderRequest;
import com.guitartutorial.service.PlaylistService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/playlists")
public class PlaylistController {

    private final PlaylistService playlistService;

    public PlaylistController(PlaylistService playlistService) {
        this.playlistService = playlistService;
    }

    @GetMapping
    public ResponseEntity<List<PlaylistDto>> getAllPlaylists() {
        List<PlaylistDto> playlists = playlistService.getAll();
        return ResponseEntity.ok(playlists);
    }

    @PostMapping
    public ResponseEntity<PlaylistDto> createPlaylist(
            @Valid @RequestBody CreatePlaylistRequest request) {
        PlaylistDto created = playlistService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlaylistDto> getPlaylist(@PathVariable Long id) {
        PlaylistDto playlist = playlistService.getById(id);
        return ResponseEntity.ok(playlist);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlaylistDto> updatePlaylistName(
            @PathVariable Long id,
            @Valid @RequestBody CreatePlaylistRequest request) {
        PlaylistDto updated = playlistService.updateName(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlaylist(@PathVariable Long id) {
        playlistService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/tutorials")
    public ResponseEntity<PlaylistDto> addTutorial(
            @PathVariable Long id,
            @Valid @RequestBody AddTutorialRequest request) {
        PlaylistDto updated = playlistService.addTutorial(id, request.tutorialId());
        return ResponseEntity.status(HttpStatus.CREATED).body(updated);
    }

    @PutMapping("/{id}/tutorials")
    public ResponseEntity<PlaylistDto> reorderTutorials(
            @PathVariable Long id,
            @Valid @RequestBody ReorderRequest request) {
        PlaylistDto updated = playlistService.reorderTutorials(id, request.tutorialIds());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}/tutorials/{tutorialId}")
    public ResponseEntity<Void> removeTutorial(
            @PathVariable Long id,
            @PathVariable String tutorialId) {
        playlistService.removeTutorial(id, tutorialId);
        return ResponseEntity.noContent().build();
    }
}
