package com.guitartutorial.service;

import com.guitartutorial.dto.PreferenceDto;
import com.guitartutorial.entity.Preference;
import com.guitartutorial.repository.PreferenceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PreferenceServiceTest {

    @Mock
    private PreferenceRepository preferenceRepository;

    @InjectMocks
    private PreferenceService preferenceService;

    @Test
    void get_shouldReturnExistingPreference() {
        Preference existing = Preference.builder()
                .id(1L)
                .tutorialId("tutorial-1")
                .difficultyLevel("Advanced")
                .favorite(true)
                .updatedAt(LocalDateTime.of(2024, 1, 15, 10, 30))
                .build();

        when(preferenceRepository.findByTutorialId("tutorial-1")).thenReturn(Optional.of(existing));

        PreferenceDto result = preferenceService.get("tutorial-1");

        assertThat(result.tutorialId()).isEqualTo("tutorial-1");
        assertThat(result.difficultyLevel()).isEqualTo("Advanced");
        assertThat(result.favorite()).isTrue();
    }

    @Test
    void get_shouldReturnDefaultPreferenceWhenNoneExists() {
        when(preferenceRepository.findByTutorialId("tutorial-1")).thenReturn(Optional.empty());

        PreferenceDto result = preferenceService.get("tutorial-1");

        assertThat(result.tutorialId()).isEqualTo("tutorial-1");
        assertThat(result.difficultyLevel()).isEqualTo("Beginner");
        assertThat(result.favorite()).isFalse();
    }

    @Test
    void upsert_shouldCreateNewPreferenceWhenNoneExists() {
        when(preferenceRepository.findByTutorialId("tutorial-1")).thenReturn(Optional.empty());
        when(preferenceRepository.save(any(Preference.class))).thenAnswer(invocation -> {
            Preference p = invocation.getArgument(0);
            p.setId(1L);
            return p;
        });

        PreferenceDto dto = new PreferenceDto("tutorial-1", "Intermediate", true);
        PreferenceDto result = preferenceService.upsert("tutorial-1", dto);

        assertThat(result.tutorialId()).isEqualTo("tutorial-1");
        assertThat(result.difficultyLevel()).isEqualTo("Intermediate");
        assertThat(result.favorite()).isTrue();

        ArgumentCaptor<Preference> captor = ArgumentCaptor.forClass(Preference.class);
        verify(preferenceRepository).save(captor.capture());
        Preference saved = captor.getValue();
        assertThat(saved.getUpdatedAt()).isNotNull();
        assertThat(saved.getTutorialId()).isEqualTo("tutorial-1");
    }

    @Test
    void upsert_shouldUpdateExistingPreference() {
        Preference existing = Preference.builder()
                .id(1L)
                .tutorialId("tutorial-1")
                .difficultyLevel("Beginner")
                .favorite(false)
                .updatedAt(LocalDateTime.of(2024, 1, 10, 10, 0))
                .build();

        when(preferenceRepository.findByTutorialId("tutorial-1")).thenReturn(Optional.of(existing));
        when(preferenceRepository.save(any(Preference.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PreferenceDto dto = new PreferenceDto("tutorial-1", "Advanced", true);
        PreferenceDto result = preferenceService.upsert("tutorial-1", dto);

        assertThat(result.tutorialId()).isEqualTo("tutorial-1");
        assertThat(result.difficultyLevel()).isEqualTo("Advanced");
        assertThat(result.favorite()).isTrue();

        ArgumentCaptor<Preference> captor = ArgumentCaptor.forClass(Preference.class);
        verify(preferenceRepository).save(captor.capture());
        Preference saved = captor.getValue();
        assertThat(saved.getId()).isEqualTo(1L);
        assertThat(saved.getUpdatedAt()).isAfter(LocalDateTime.of(2024, 1, 10, 10, 0));
    }

    @Test
    void upsert_shouldSetUpdatedAtOnEveryWrite() {
        when(preferenceRepository.findByTutorialId("tutorial-1")).thenReturn(Optional.empty());
        when(preferenceRepository.save(any(Preference.class))).thenAnswer(invocation -> {
            Preference p = invocation.getArgument(0);
            p.setId(1L);
            return p;
        });

        PreferenceDto dto = new PreferenceDto("tutorial-1", "Beginner", false);
        preferenceService.upsert("tutorial-1", dto);

        ArgumentCaptor<Preference> captor = ArgumentCaptor.forClass(Preference.class);
        verify(preferenceRepository).save(captor.capture());
        assertThat(captor.getValue().getUpdatedAt()).isNotNull();
    }
}
