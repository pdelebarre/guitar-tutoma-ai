package com.guitartutorial.dto;

import java.time.LocalDateTime;
import java.util.List;

public record PlaylistDto(
    Long id,
    String name,
    LocalDateTime createdAt,
    List<PlaylistTutorialDto> tutorials
) {}
