package com.guitartutorial.dto;

import java.time.LocalDateTime;

public record AnnotationDto(
    Long id,
    String tutorialId,
    int pageNumber,
    double x,
    double y,
    double width,
    double height,
    String content,
    String type,
    String strokeData,
    String color,
    LocalDateTime createdAt
) {}
