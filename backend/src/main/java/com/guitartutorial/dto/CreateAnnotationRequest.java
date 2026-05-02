package com.guitartutorial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record CreateAnnotationRequest(
    @PositiveOrZero int pageNumber,
    double x,
    double y,
    @PositiveOrZero double width,
    @PositiveOrZero double height,
    @NotBlank String content,
    @NotBlank String type,
    String strokeData,
    String color
) {}
