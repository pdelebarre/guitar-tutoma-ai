package com.guitartutorial.dto;

import java.time.LocalDateTime;

public record UserPreferenceDto(
    Long userId,
    String theme,
    String defaultDifficultyFilter,
    String defaultSortDirection,
    Integer itemsPerPage,
    LocalDateTime updatedAt
) {}
