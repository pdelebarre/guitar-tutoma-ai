package com.guitartutorial.service;

import com.guitartutorial.dto.PreferenceDto;
import com.guitartutorial.entity.Preference;
import com.guitartutorial.repository.PreferenceRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class PreferenceService {

    private final PreferenceRepository preferenceRepository;

    public PreferenceService(PreferenceRepository preferenceRepository) {
        this.preferenceRepository = preferenceRepository;
    }

    public PreferenceDto get(String tutorialId) {
        Optional<Preference> existing = preferenceRepository.findByTutorialId(tutorialId);
        return existing.map(this::toDto)
                .orElse(new PreferenceDto(tutorialId, "Beginner", false));
    }

    public PreferenceDto upsert(String tutorialId, PreferenceDto dto) {
        Optional<Preference> existing = preferenceRepository.findByTutorialId(tutorialId);

        Preference preference;
        if (existing.isPresent()) {
            preference = existing.get();
            preference.setDifficultyLevel(dto.difficultyLevel());
            preference.setFavorite(dto.favorite());
        } else {
            preference = Preference.builder()
                    .tutorialId(tutorialId)
                    .difficultyLevel(dto.difficultyLevel())
                    .favorite(dto.favorite())
                    .build();
        }
        preference.setUpdatedAt(LocalDateTime.now());

        Preference saved = preferenceRepository.save(preference);
        return toDto(saved);
    }

    private PreferenceDto toDto(Preference preference) {
        return new PreferenceDto(
                preference.getTutorialId(),
                preference.getDifficultyLevel(),
                preference.isFavorite()
        );
    }
}
