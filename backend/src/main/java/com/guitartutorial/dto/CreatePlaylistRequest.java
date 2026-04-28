package com.guitartutorial.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePlaylistRequest(
    @NotBlank(message = "Playlist name must not be blank")
    String name
) {}
