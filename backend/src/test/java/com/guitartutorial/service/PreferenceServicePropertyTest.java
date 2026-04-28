package com.guitartutorial.service;

import com.guitartutorial.GuitarTutorialManagerApplication;
import com.guitartutorial.dto.PreferenceDto;
import com.guitartutorial.repository.PreferenceRepository;
import net.jqwik.api.*;
import net.jqwik.api.lifecycle.BeforeProperty;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Feature: guitar-tutorial-manager
 *
 * Property-based tests for PreferenceService using a real H2 database
 * via Spring Boot application context with the "local" profile.
 * The web environment is disabled to avoid port conflicts.
 *
 * Validates: Requirements 5.1, 5.2
 */
class PreferenceServicePropertyTest {

    private static ConfigurableApplicationContext context;
    private PreferenceService preferenceService;
    private PreferenceRepository preferenceRepository;

    private static final String TEST_TUTORIAL_PREFIX = "prop-pref-test-";

    @BeforeProperty
    void setUp() {
        if (context == null || !context.isActive()) {
            context = new SpringApplicationBuilder(GuitarTutorialManagerApplication.class)
                    .profiles("local")
                    .properties("spring.main.web-application-type=none")
                    .run();
        }
        preferenceService = context.getBean(PreferenceService.class);
        preferenceRepository = context.getBean(PreferenceRepository.class);
        // Clean up all preferences with the test prefix between property runs
        preferenceRepository.findAll().stream()
                .filter(p -> p.getTutorialId().startsWith(TEST_TUTORIAL_PREFIX))
                .forEach(preferenceRepository::delete);
    }

    // -------------------------------------------------------------------------
    // Property 10: Preference upsert round-trip
    // -------------------------------------------------------------------------

    /**
     * Feature: guitar-tutorial-manager, Property 10: Preference upsert round-trip
     *
     * For any valid tutorial ID and any valid difficulty level and favorite flag,
     * setting the preference and then retrieving it SHALL return the same difficulty
     * level and favorite value. If the preference is subsequently updated with
     * different values, retrieving it SHALL return the new values.
     *
     * Validates: Requirements 5.1, 5.2
     */
    @Property(tries = 100)
    void preferenceUpsertRoundTrip(
            @ForAll("tutorialIds") String tutorialId,
            @ForAll("difficultyLevels") String initialDifficulty,
            @ForAll boolean initialFavorite,
            @ForAll("difficultyLevels") String updatedDifficulty,
            @ForAll boolean updatedFavorite) {

        String fullTutorialId = TEST_TUTORIAL_PREFIX + tutorialId;

        // Step 1: Set initial preference (create via upsert)
        PreferenceDto initialDto = new PreferenceDto(fullTutorialId, initialDifficulty, initialFavorite);
        PreferenceDto created = preferenceService.upsert(fullTutorialId, initialDto);

        assertThat(created.tutorialId()).isEqualTo(fullTutorialId);
        assertThat(created.difficultyLevel()).isEqualTo(initialDifficulty);
        assertThat(created.favorite()).isEqualTo(initialFavorite);

        // Step 2: Retrieve and verify initial values
        PreferenceDto retrieved = preferenceService.get(fullTutorialId);

        assertThat(retrieved.tutorialId()).isEqualTo(fullTutorialId);
        assertThat(retrieved.difficultyLevel()).isEqualTo(initialDifficulty);
        assertThat(retrieved.favorite()).isEqualTo(initialFavorite);

        // Step 3: Update with different values (upsert on existing)
        PreferenceDto updateDto = new PreferenceDto(fullTutorialId, updatedDifficulty, updatedFavorite);
        PreferenceDto updated = preferenceService.upsert(fullTutorialId, updateDto);

        assertThat(updated.tutorialId()).isEqualTo(fullTutorialId);
        assertThat(updated.difficultyLevel()).isEqualTo(updatedDifficulty);
        assertThat(updated.favorite()).isEqualTo(updatedFavorite);

        // Step 4: Retrieve after update and verify new values
        PreferenceDto retrievedAfterUpdate = preferenceService.get(fullTutorialId);

        assertThat(retrievedAfterUpdate.tutorialId()).isEqualTo(fullTutorialId);
        assertThat(retrievedAfterUpdate.difficultyLevel()).isEqualTo(updatedDifficulty);
        assertThat(retrievedAfterUpdate.favorite()).isEqualTo(updatedFavorite);

        // Clean up
        preferenceRepository.findByTutorialId(fullTutorialId)
                .ifPresent(preferenceRepository::delete);
    }

    // -------------------------------------------------------------------------
    // Arbitraries / Providers
    // -------------------------------------------------------------------------

    @Provide
    Arbitrary<String> tutorialIds() {
        return Arbitraries.strings()
                .ofMinLength(1)
                .ofMaxLength(20)
                .alpha()
                .numeric()
                .withChars('-', '_');
    }

    @Provide
    Arbitrary<String> difficultyLevels() {
        return Arbitraries.of("Beginner", "Intermediate", "Advanced");
    }
}
