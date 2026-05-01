package com.guitartutorial.dto;

import java.time.LocalDateTime;

public record UserDto(
    Long id,
    String username,
    String email,
    String displayName,
    LocalDateTime createdAt
) {}
