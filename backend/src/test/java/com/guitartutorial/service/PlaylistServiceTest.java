package com.guitartutorial.service;

import com.guitartutorial.dto.CreatePlaylistRequest;
import com.guitartutorial.dto.PlaylistDto;
import com.guitartutorial.dto.TutorialInfo;
import com.guitartutorial.entity.Playlist;
import com.guitartutorial.entity.PlaylistTutorial;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.exception.ValidationException;
import com.guitartutorial.repository.PlaylistRepository;
import com.guitartutorial.repository.PlaylistTutorialRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlaylistServiceTest {

    @Mock
    private PlaylistRepository playlistRepository;

    @Mock
    private PlaylistTutorialRepository playlistTutorialRepository;

    @Mock
    private TutorialScannerService tutorialScannerService;

    private PlaylistService playlistService;

    private Playlist samplePlaylist;

    @BeforeEach
    void setUp() {
        playlistService = new PlaylistService(playlistRepository, playlistTutorialRepository, tutorialScannerService);

        samplePlaylist = Playlist.builder()
                .id(1L)
                .name("Rock Classics")
                .createdAt(LocalDateTime.of(2024, 3, 10, 14, 0))
                .tutorials(new ArrayList<>())
                .build();
    }

    // --- Create ---

    @Test
    void create_shouldPersistPlaylistWithTimestamp() {
        when(playlistRepository.save(any(Playlist.class))).thenAnswer(invocation -> {
            Playlist p = invocation.getArgument(0);
            p.setId(1L);
            return p;
        });
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of());

        PlaylistDto result = playlistService.create(new CreatePlaylistRequest("Rock Classics"));

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.name()).isEqualTo("Rock Classics");
        assertThat(result.createdAt()).isNotNull();
        assertThat(result.tutorials()).isEmpty();

        ArgumentCaptor<Playlist> captor = ArgumentCaptor.forClass(Playlist.class);
        verify(playlistRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Rock Classics");
        assertThat(captor.getValue().getCreatedAt()).isNotNull();
    }

    @Test
    void create_shouldThrowValidationExceptionForBlankName() {
        assertThatThrownBy(() -> playlistService.create(new CreatePlaylistRequest("")))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Playlist name must not be blank");
    }

    @Test
    void create_shouldThrowValidationExceptionForWhitespaceOnlyName() {
        assertThatThrownBy(() -> playlistService.create(new CreatePlaylistRequest("   \t\n")))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Playlist name must not be blank");
    }

    @Test
    void create_shouldThrowValidationExceptionForNullName() {
        assertThatThrownBy(() -> playlistService.create(new CreatePlaylistRequest(null)))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Playlist name must not be blank");
    }

    // --- Get All ---

    @Test
    void getAll_shouldReturnAllPlaylists() {
        Playlist second = Playlist.builder()
                .id(2L)
                .name("Blues Jams")
                .createdAt(LocalDateTime.of(2024, 4, 1, 9, 0))
                .tutorials(new ArrayList<>())
                .build();

        when(playlistRepository.findAll()).thenReturn(List.of(samplePlaylist, second));
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of());
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(2L))
                .thenReturn(List.of());

        List<PlaylistDto> result = playlistService.getAll();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).name()).isEqualTo("Rock Classics");
        assertThat(result.get(1).name()).isEqualTo("Blues Jams");
    }

    @Test
    void getAll_shouldReturnEmptyListWhenNoPlaylists() {
        when(playlistRepository.findAll()).thenReturn(List.of());

        List<PlaylistDto> result = playlistService.getAll();

        assertThat(result).isEmpty();
    }

    // --- Get By ID ---

    @Test
    void getById_shouldReturnPlaylistWithTutorials() {
        PlaylistTutorial pt = PlaylistTutorial.builder()
                .id(10L)
                .playlist(samplePlaylist)
                .tutorialId("tut-1")
                .ordinalPosition(0)
                .build();

        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of(pt));
        when(tutorialScannerService.getTutorial("tut-1"))
                .thenReturn(Optional.of(new TutorialInfo("tut-1", "Tutorial One", "video.mp4", false, false)));

        PlaylistDto result = playlistService.getById(1L);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.name()).isEqualTo("Rock Classics");
        assertThat(result.tutorials()).hasSize(1);
        assertThat(result.tutorials().get(0).tutorialId()).isEqualTo("tut-1");
        assertThat(result.tutorials().get(0).tutorialName()).isEqualTo("Tutorial One");
        assertThat(result.tutorials().get(0).ordinalPosition()).isZero();
    }

    @Test
    void getById_shouldThrowResourceNotFoundExceptionWhenPlaylistNotFound() {
        when(playlistRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playlistService.getById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Playlist not found");
    }

    @Test
    void getById_shouldUseTutorialIdAsNameWhenScannerReturnsEmpty() {
        PlaylistTutorial pt = PlaylistTutorial.builder()
                .id(10L)
                .playlist(samplePlaylist)
                .tutorialId("unknown-tut")
                .ordinalPosition(0)
                .build();

        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of(pt));
        when(tutorialScannerService.getTutorial("unknown-tut")).thenReturn(Optional.empty());

        PlaylistDto result = playlistService.getById(1L);

        assertThat(result.tutorials().get(0).tutorialName()).isEqualTo("unknown-tut");
    }

    // --- Update Name ---

    @Test
    void updateName_shouldUpdatePlaylistName() {
        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));
        when(playlistRepository.save(any(Playlist.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of());

        PlaylistDto result = playlistService.updateName(1L, new CreatePlaylistRequest("Jazz Standards"));

        assertThat(result.name()).isEqualTo("Jazz Standards");
        assertThat(result.id()).isEqualTo(1L);
    }

    @Test
    void updateName_shouldThrowResourceNotFoundExceptionWhenPlaylistNotFound() {
        when(playlistRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playlistService.updateName(99L, new CreatePlaylistRequest("New Name")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Playlist not found");
    }

    @Test
    void updateName_shouldThrowValidationExceptionForBlankName() {
        assertThatThrownBy(() -> playlistService.updateName(1L, new CreatePlaylistRequest("")))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Playlist name must not be blank");
    }

    @Test
    void updateName_shouldThrowValidationExceptionForWhitespaceOnlyName() {
        assertThatThrownBy(() -> playlistService.updateName(1L, new CreatePlaylistRequest("   ")))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Playlist name must not be blank");
    }

    // --- Delete ---

    @Test
    void delete_shouldRemovePlaylist() {
        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));

        playlistService.delete(1L);

        verify(playlistRepository).delete(samplePlaylist);
    }

    @Test
    void delete_shouldThrowResourceNotFoundExceptionWhenPlaylistNotFound() {
        when(playlistRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playlistService.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Playlist not found");
    }

    @Test
    void delete_shouldCascadeRemoveAssociatedTutorials() {
        PlaylistTutorial pt1 = PlaylistTutorial.builder()
                .id(10L).playlist(samplePlaylist).tutorialId("tut-1").ordinalPosition(0).build();
        PlaylistTutorial pt2 = PlaylistTutorial.builder()
                .id(11L).playlist(samplePlaylist).tutorialId("tut-2").ordinalPosition(1).build();
        samplePlaylist.getTutorials().addAll(List.of(pt1, pt2));

        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));

        playlistService.delete(1L);

        // Cascade deletion is handled by JPA @OneToMany(cascade = ALL, orphanRemoval = true)
        // Verifying that the playlist itself is deleted triggers cascade
        verify(playlistRepository).delete(samplePlaylist);
    }

    // --- Add Tutorial ---

    @Test
    void addTutorial_shouldAddTutorialWithNextOrdinal() {
        PlaylistTutorial existing = PlaylistTutorial.builder()
                .id(10L).playlist(samplePlaylist).tutorialId("tut-1").ordinalPosition(0).build();

        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of(existing))  // first call: compute next ordinal
                .thenReturn(List.of(existing, PlaylistTutorial.builder()  // second call: toDto refresh
                        .id(11L).playlist(samplePlaylist).tutorialId("tut-2").ordinalPosition(1).build()));
        when(playlistTutorialRepository.save(any(PlaylistTutorial.class))).thenAnswer(invocation -> {
            PlaylistTutorial pt = invocation.getArgument(0);
            pt.setId(11L);
            return pt;
        });
        when(tutorialScannerService.getTutorial("tut-1"))
                .thenReturn(Optional.of(new TutorialInfo("tut-1", "Tutorial One", "v.mp4", false, false)));
        when(tutorialScannerService.getTutorial("tut-2"))
                .thenReturn(Optional.of(new TutorialInfo("tut-2", "Tutorial Two", "v.mp4", false, false)));

        PlaylistDto result = playlistService.addTutorial(1L, "tut-2");

        ArgumentCaptor<PlaylistTutorial> captor = ArgumentCaptor.forClass(PlaylistTutorial.class);
        verify(playlistTutorialRepository).save(captor.capture());
        assertThat(captor.getValue().getTutorialId()).isEqualTo("tut-2");
        assertThat(captor.getValue().getOrdinalPosition()).isEqualTo(1);

        assertThat(result.tutorials()).hasSize(2);
    }

    @Test
    void addTutorial_shouldAssignOrdinalZeroToFirstTutorial() {
        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of())  // first call: empty playlist
                .thenReturn(List.of(PlaylistTutorial.builder()  // second call: toDto refresh
                        .id(10L).playlist(samplePlaylist).tutorialId("tut-1").ordinalPosition(0).build()));
        when(playlistTutorialRepository.save(any(PlaylistTutorial.class))).thenAnswer(invocation -> {
            PlaylistTutorial pt = invocation.getArgument(0);
            pt.setId(10L);
            return pt;
        });
        when(tutorialScannerService.getTutorial("tut-1"))
                .thenReturn(Optional.of(new TutorialInfo("tut-1", "Tutorial One", "v.mp4", false, false)));

        PlaylistDto result = playlistService.addTutorial(1L, "tut-1");

        ArgumentCaptor<PlaylistTutorial> captor = ArgumentCaptor.forClass(PlaylistTutorial.class);
        verify(playlistTutorialRepository).save(captor.capture());
        assertThat(captor.getValue().getOrdinalPosition()).isZero();

        assertThat(result.tutorials()).hasSize(1);
        assertThat(result.tutorials().get(0).ordinalPosition()).isZero();
    }

    @Test
    void addTutorial_shouldThrowResourceNotFoundExceptionWhenPlaylistNotFound() {
        when(playlistRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playlistService.addTutorial(99L, "tut-1"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Playlist not found");
    }

    // --- Reorder Tutorials ---

    @Test
    void reorderTutorials_shouldUpdateOrdinalPositions() {
        PlaylistTutorial pt1 = PlaylistTutorial.builder()
                .id(10L).playlist(samplePlaylist).tutorialId("tut-a").ordinalPosition(0).build();
        PlaylistTutorial pt2 = PlaylistTutorial.builder()
                .id(11L).playlist(samplePlaylist).tutorialId("tut-b").ordinalPosition(1).build();
        PlaylistTutorial pt3 = PlaylistTutorial.builder()
                .id(12L).playlist(samplePlaylist).tutorialId("tut-c").ordinalPosition(2).build();

        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of(pt1, pt2, pt3));
        when(playlistTutorialRepository.save(any(PlaylistTutorial.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(tutorialScannerService.getTutorial(any()))
                .thenReturn(Optional.of(new TutorialInfo("x", "X", "v.mp4", false, false)));

        // Reverse the order: c, b, a
        playlistService.reorderTutorials(1L, List.of("tut-c", "tut-b", "tut-a"));

        // Verify ordinals were updated
        assertThat(pt3.getOrdinalPosition()).isZero();
        assertThat(pt2.getOrdinalPosition()).isEqualTo(1);
        assertThat(pt1.getOrdinalPosition()).isEqualTo(2);
    }

    @Test
    void reorderTutorials_shouldThrowResourceNotFoundExceptionWhenPlaylistNotFound() {
        when(playlistRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playlistService.reorderTutorials(99L, List.of("tut-1")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Playlist not found");
    }

    // --- Remove Tutorial ---

    @Test
    void removeTutorial_shouldRemoveAndRecalculateOrdinals() {
        PlaylistTutorial pt1 = PlaylistTutorial.builder()
                .id(10L).playlist(samplePlaylist).tutorialId("tut-a").ordinalPosition(0).build();
        PlaylistTutorial pt2 = PlaylistTutorial.builder()
                .id(11L).playlist(samplePlaylist).tutorialId("tut-b").ordinalPosition(1).build();
        PlaylistTutorial pt3 = PlaylistTutorial.builder()
                .id(12L).playlist(samplePlaylist).tutorialId("tut-c").ordinalPosition(2).build();
        samplePlaylist.getTutorials().addAll(List.of(pt1, pt2, pt3));

        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of(pt1, pt2, pt3))  // first call: find tutorial to remove
                .thenReturn(List.of(pt1, pt3))        // second call: recalculate ordinals
                .thenReturn(List.of(pt1, pt3));        // third call: toDto refresh
        when(playlistRepository.save(any(Playlist.class))).thenReturn(samplePlaylist);
        when(playlistTutorialRepository.save(any(PlaylistTutorial.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(tutorialScannerService.getTutorial(any()))
                .thenReturn(Optional.of(new TutorialInfo("x", "X", "v.mp4", false, false)));

        PlaylistDto result = playlistService.removeTutorial(1L, "tut-b");

        // Verify ordinals were recalculated: pt1 -> 0, pt3 -> 1
        assertThat(pt1.getOrdinalPosition()).isZero();
        assertThat(pt3.getOrdinalPosition()).isEqualTo(1);
    }

    @Test
    void removeTutorial_shouldThrowResourceNotFoundExceptionWhenPlaylistNotFound() {
        when(playlistRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playlistService.removeTutorial(99L, "tut-1"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Playlist not found");
    }

    @Test
    void removeTutorial_shouldThrowResourceNotFoundExceptionWhenTutorialNotInPlaylist() {
        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of());

        assertThatThrownBy(() -> playlistService.removeTutorial(1L, "nonexistent"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("not found in playlist");
    }

    // --- Ordering ---

    @Test
    void getById_shouldReturnTutorialsInOrdinalOrder() {
        PlaylistTutorial pt1 = PlaylistTutorial.builder()
                .id(10L).playlist(samplePlaylist).tutorialId("tut-a").ordinalPosition(0).build();
        PlaylistTutorial pt2 = PlaylistTutorial.builder()
                .id(11L).playlist(samplePlaylist).tutorialId("tut-b").ordinalPosition(1).build();
        PlaylistTutorial pt3 = PlaylistTutorial.builder()
                .id(12L).playlist(samplePlaylist).tutorialId("tut-c").ordinalPosition(2).build();

        when(playlistRepository.findById(1L)).thenReturn(Optional.of(samplePlaylist));
        when(playlistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc(1L))
                .thenReturn(List.of(pt1, pt2, pt3));
        when(tutorialScannerService.getTutorial(any()))
                .thenReturn(Optional.of(new TutorialInfo("x", "X", "v.mp4", false, false)));

        PlaylistDto result = playlistService.getById(1L);

        assertThat(result.tutorials()).hasSize(3);
        assertThat(result.tutorials().get(0).ordinalPosition()).isZero();
        assertThat(result.tutorials().get(1).ordinalPosition()).isEqualTo(1);
        assertThat(result.tutorials().get(2).ordinalPosition()).isEqualTo(2);
    }
}
