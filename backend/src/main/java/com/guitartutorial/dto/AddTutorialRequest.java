package com.guitartutorial.dto;

import jakarta.validation.constraints.NotBlank;

public record AddTutorialRequest(
    @NotBlank(message = "Tutorial ID must not be blank")
    String tutorialId
) {}
