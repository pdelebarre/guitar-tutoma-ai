package com.guitartutorial.dto;

import java.time.LocalDateTime;

/**
 * DTO for tutorial metadata extracted from PDF via Mistral/Ollama.
 */
public record TutorialMetadataDto(
    String tutorialId,
    String title,
    String tuning,
    String musicalKey,
    String difficulty,
    String techniques,
    String genre,
    LocalDateTime extractedAt
) {}
