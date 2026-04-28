package com.guitartutorial.dto;

public record PreferenceDto(
    String tutorialId,
    String difficultyLevel,
    boolean favorite
) {}
