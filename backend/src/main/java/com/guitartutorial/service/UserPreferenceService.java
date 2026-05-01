package com.guitartutorial.service;

import com.guitartutorial.dto.UserPreferenceDto;
import com.guitartutorial.entity.UserPreference;
import com.guitartutorial.repository.UserPreferenceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserPreferenceService {

    private static final Logger log = LoggerFactory.getLogger(UserPreferenceService.class);

    private final UserPreferenceRepository userPreferenceRepository;

    public UserPreferenceService(UserPreferenceRepository userPreferenceRepository) {
        this.userPreferenceRepository = userPreferenceRepository;
    }

    /**
     * Get preferences for a user. Returns defaults if none exist.
     */
    public UserPreferenceDto get(Long userId) {
        return userPreferenceRepository.findByUserId(userId)
                .map(this::toDto)
                .orElseGet(() -> new UserPreferenceDto(
                        userId, "light", "All", "asc", 20, null));
    }

    /**
     * Create or update preferences for a user.
     */
    public UserPreferenceDto upsert(Long userId, UserPreferenceDto dto) {
        UserPreference pref = userPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> UserPreference.builder()
                        .userId(userId)
                        .build());

        if (dto.theme() != null) pref.setTheme(dto.theme());
        if (dto.defaultDifficultyFilter() != null) pref.setDefaultDifficultyFilter(dto.defaultDifficultyFilter());
        if (dto.defaultSortDirection() != null) pref.setDefaultSortDirection(dto.defaultSortDirection());
        if (dto.itemsPerPage() != null) pref.setItemsPerPage(dto.itemsPerPage());
        pref.setUpdatedAt(LocalDateTime.now());

        UserPreference saved = userPreferenceRepository.save(pref);
        log.info("Preferences updated for user {}: theme={}, filter={}, sort={}, perPage={}",
                userId, saved.getTheme(), saved.getDefaultDifficultyFilter(),
                saved.getDefaultSortDirection(), saved.getItemsPerPage());

        return toDto(saved);
    }

    private UserPreferenceDto toDto(UserPreference pref) {
        return new UserPreferenceDto(
                pref.getUserId(),
                pref.getTheme(),
                pref.getDefaultDifficultyFilter(),
                pref.getDefaultSortDirection(),
                pref.getItemsPerPage(),
                pref.getUpdatedAt()
        );
    }
}
