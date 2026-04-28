package com.guitartutorial.service;

import com.guitartutorial.GuitarTutorialManagerApplication;
import com.guitartutorial.dto.CreatePlaylistRequest;
import com.guitartutorial.dto.PlaylistDto;
import com.guitartutorial.dto.PlaylistTutorialDto;
import com.guitartutorial.exception.ValidationException;
import com.guitartutorial.repository.PlaylistRepository;
import com.guitartutorial.repository.PlaylistTutorialRepository;
import net.jqwik.api.*;
import net.jqwik.api.lifecycle.BeforeProperty;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Feature: guitar-tutorial-manager
 *
 * Property-based tests for PlaylistService using a real H2 database
 * via Spring Boot application context with the "local" profile.
 * The web environment is disabled to avoid port conflicts.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.7
 */
class PlaylistServicePropertyTest {

    private static ConfigurableApplicationContext context;
    private PlaylistService playlistService;
    private PlaylistRepository playlistRepository;
    private PlaylistTutorialRepository playlistTutorialRepository;

    @BeforeProperty
    void setUp() {
        if (context == null || !context.isActive()) {
            context = new SpringApplicationBuilder(GuitarTutorialManagerApplication.class)
                    .profiles("local")
                    .properties("spring.main.web-application-type=none")
                    .run();
        }
        playlistService = context.getBean(PlaylistService.class);
        playlistRepository = context.getBean(PlaylistRepository.class);
        playlistTutorialRepository = context.getBean(PlaylistTutorialRepository.class);
        // Clean up all playlists between property runs
        playlistTutorialRepository.deleteAll();
        playlistRepository.deleteAll();
    }
}
