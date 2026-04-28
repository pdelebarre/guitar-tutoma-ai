package com.guitartutorial.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ReorderRequest(
    @NotNull(message = "Tutorial IDs list must not be null")
    List<String> tutorialIds
) {}
