package com.guitartutorial.service;

import com.guitartutorial.dto.CreatePlaylistRequest;
import com.guitartutorial.dto.PlaylistDto;
import com.guitartutorial.dto.PlaylistTutorialDto;
import com.guitartutorial.entity.Playlist;
import com.guitartutorial.entity.PlaylistTutorial;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.exception.ValidationException;
import com.guitartutorial.repository.PlaylistRepository;
import com.guitartutorial.repository.PlaylistTutorialRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PlaylistService {

    private final PlaylistRepository playlistRepository;
    private final PlaylistTutorialRepository playlistTutorialRepository;
    private final TutorialScannerService tutorialScannerService;

    public PlaylistService(PlaylistRepository playlistRepository,
                           PlaylistTutorialRepository playlistTutorialRepository,
                           TutorialScannerService tutorialScannerService) {
        this.playlistRepository = playlistRepository;
        this.playlistTutorialRepository = playlistTutorialRepository;
        this.tutorialScannerService = tutorialScannerService;
    }

    public PlaylistDto create(CreatePlaylistRequest request) {
        validateName(request.name());

        Playlist playlist = Playlist.builder()
                .name(request.name())
                .createdAt(LocalDateTime.now())
                .build();

        Playlist saved = playlistRepository.save(playlist);
        return toDto(saved);
    }

    public List<PlaylistDto> getAll() {
        return playlistRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public PlaylistDto getById(Long id) {
        Playlist playlist = findPlaylistOrThrow(id);
        return toDto(playlist);
    }

    public PlaylistDto updateName(Long id, CreatePlaylistRequest request) {
        validateName(request.name());

        Playlist playlist = findPlaylistOrThrow(id);
        playlist.setName(request.name());

        Playlist saved = playlistRepository.save(playlist);
        return toDto(saved);
    }

    public void delete(Long id) {
        Playlist playlist = findPlaylistOrThrow(id);
        playlistRepository.delete(playlist);
    }

    @Transactional
    public PlaylistDto addTutorial(Long playlistId, String tutorialId) {
        Playlist playlist = findPlaylistOrThrow(playlistId);

        List<PlaylistTutorial> existing = playlistTutorialRepository
                .findByPlaylistIdOrderByOrdinalPositionAsc(playlistId);

        int nextOrdinal = existing.isEmpty() ? 0
                : existing.get(existing.size() - 1).getOrdinalPosition() + 1;

        PlaylistTutorial pt = PlaylistTutorial.builder()
                .playlist(playlist)
                .tutorialId(tutorialId)
                .ordinalPosition(nextOrdinal)
                .build();

        playlistTutorialRepository.save(pt);

        // Refresh to get updated tutorials list
        Playlist refreshed = findPlaylistOrThrow(playlistId);
        return toDto(refreshed);
    }

    @Transactional
    public PlaylistDto reorderTutorials(Long playlistId, List<String> tutorialIds) {
        findPlaylistOrThrow(playlistId);

        List<PlaylistTutorial> existing = playlistTutorialRepository
                .findByPlaylistIdOrderByOrdinalPositionAsc(playlistId);

        for (int i = 0; i < tutorialIds.size(); i++) {
            String tid = tutorialIds.get(i);
            Optional<PlaylistTutorial> match = existing.stream()
                    .filter(pt -> pt.getTutorialId().equals(tid))
                    .findFirst();
            if (match.isPresent()) {
                match.get().setOrdinalPosition(i);
                playlistTutorialRepository.save(match.get());
            }
        }

        Playlist refreshed = findPlaylistOrThrow(playlistId);
        return toDto(refreshed);
    }

    @Transactional
    public PlaylistDto removeTutorial(Long playlistId, String tutorialId) {
        Playlist playlist = findPlaylistOrThrow(playlistId);

        List<PlaylistTutorial> existing = playlistTutorialRepository
                .findByPlaylistIdOrderByOrdinalPositionAsc(playlistId);

        PlaylistTutorial toRemove = existing.stream()
                .filter(pt -> pt.getTutorialId().equals(tutorialId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Tutorial " + tutorialId + " not found in playlist"));

        playlist.getTutorials().remove(toRemove);
        playlistRepository.save(playlist);

        // Recalculate ordinals for remaining tutorials
        List<PlaylistTutorial> remaining = playlistTutorialRepository
                .findByPlaylistIdOrderByOrdinalPositionAsc(playlistId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setOrdinalPosition(i);
            playlistTutorialRepository.save(remaining.get(i));
        }

        Playlist refreshed = findPlaylistOrThrow(playlistId);
        return toDto(refreshed);
    }

    private Playlist findPlaylistOrThrow(Long id) {
        return playlistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Playlist not found"));
    }

    private void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new ValidationException("Playlist name must not be blank");
        }
    }

    private PlaylistDto toDto(Playlist playlist) {
        List<PlaylistTutorialDto> tutorialDtos = playlistTutorialRepository
                .findByPlaylistIdOrderByOrdinalPositionAsc(playlist.getId())
                .stream()
                .map(this::toTutorialDto)
                .toList();

        return new PlaylistDto(
                playlist.getId(),
                playlist.getName(),
                playlist.getCreatedAt(),
                tutorialDtos
        );
    }

    private PlaylistTutorialDto toTutorialDto(PlaylistTutorial pt) {
        String tutorialName = tutorialScannerService.getTutorial(pt.getTutorialId())
                .map(info -> info.name())
                .orElse(pt.getTutorialId());

        return new PlaylistTutorialDto(
                pt.getTutorialId(),
                tutorialName,
                pt.getOrdinalPosition()
        );
    }
}
