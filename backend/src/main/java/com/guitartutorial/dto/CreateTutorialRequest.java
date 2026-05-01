package com.guitartutorial.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request to create a new tutorial directory.
 * The actual video and PDF files are uploaded as multipart files separately.
 */
public record CreateTutorialRequest(
    @NotBlank(message = "Tutorial ID/directory name is required")
    String tutorialId,

    String displayName
) {}
