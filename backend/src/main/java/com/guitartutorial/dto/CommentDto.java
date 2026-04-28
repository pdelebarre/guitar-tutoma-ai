package com.guitartutorial.dto;

import java.time.LocalDateTime;

public record CommentDto(
    Long id,
    String tutorialId,
    String text,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
