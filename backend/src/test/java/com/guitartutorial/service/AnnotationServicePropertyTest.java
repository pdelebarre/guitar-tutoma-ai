package com.guitartutorial.service;

import com.guitartutorial.GuitarTutorialManagerApplication;
import com.guitartutorial.dto.AnnotationDto;
import com.guitartutorial.dto.CreateAnnotationRequest;
import com.guitartutorial.repository.AnnotationRepository;
import net.jqwik.api.*;
import net.jqwik.api.lifecycle.BeforeProperty;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Feature: guitar-tutorial-manager
 *
 * Property-based tests for AnnotationService using a real H2 database
 * via Spring Boot application context with the "local" profile.
 * The web environment is disabled to avoid port conflicts.
 *
 * Validates: Requirements 4.3, 4.4, 4.5
 */
class AnnotationServicePropertyTest {

    private static ConfigurableApplicationContext context;
    private AnnotationService annotationService;
    private AnnotationRepository annotationRepository;

    private static final String TEST_TUTORIAL_ID = "prop-test-annotation-tutorial";

    @BeforeProperty
    void setUp() {
        if (context == null || !context.isActive()) {
            context = new SpringApplicationBuilder(GuitarTutorialManagerApplication.class)
                    .profiles("local")
                    .properties("spring.main.web-application-type=none")
                    .run();
        }
        annotationService = context.getBean(AnnotationService.class);
        annotationRepository = context.getBean(AnnotationRepository.class);
        // Clean up all annotations for the test tutorial ID between property runs
        annotationRepository.findByTutorialId(TEST_TUTORIAL_ID)
                .forEach(annotationRepository::delete);
    }

    // -------------------------------------------------------------------------
    // Property 8: Annotation persistence round-trip
    // -------------------------------------------------------------------------

    /**
     * Feature: guitar-tutorial-manager, Property 8: Annotation persistence round-trip
     *
     * For any set of valid annotations (each with a tutorialId, pageNumber, x, y,
     * width, height, and content), creating all of them and then querying annotations
     * for that tutorial SHALL return all created annotations with their original
     * field values preserved.
     *
     * Validates: Requirements 4.3, 4.4
     */
    @Property(tries = 100)
    void annotationPersistenceRoundTrip(
            @ForAll("validAnnotationRequests") List<CreateAnnotationRequest> requests) {

        // Create all annotations
        List<AnnotationDto> createdAnnotations = new ArrayList<>();
        for (CreateAnnotationRequest request : requests) {
            AnnotationDto created = annotationService.create(TEST_TUTORIAL_ID, request);
            createdAnnotations.add(created);

            // Verify returned DTO has correct values immediately
            assertThat(created.id()).isNotNull();
            assertThat(created.tutorialId()).isEqualTo(TEST_TUTORIAL_ID);
            assertThat(created.pageNumber()).isEqualTo(request.pageNumber());
            assertThat(created.x()).isEqualTo(request.x());
            assertThat(created.y()).isEqualTo(request.y());
            assertThat(created.width()).isEqualTo(request.width());
            assertThat(created.height()).isEqualTo(request.height());
            assertThat(created.content()).isEqualTo(request.content());
            assertThat(created.createdAt()).isNotNull();
        }

        // Retrieve all annotations for the tutorial
        List<AnnotationDto> retrieved = annotationService.getByTutorialId(TEST_TUTORIAL_ID);

        // Verify count matches
        assertThat(retrieved).hasSize(requests.size());

        // Verify each created annotation is present with all fields preserved
        for (AnnotationDto created : createdAnnotations) {
            AnnotationDto found = retrieved.stream()
                    .filter(a -> a.id().equals(created.id()))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError(
                            "Created annotation with id " + created.id() + " not found in retrieval"));

            assertThat(found.tutorialId()).isEqualTo(TEST_TUTORIAL_ID);
            assertThat(found.pageNumber()).isEqualTo(created.pageNumber());
            assertThat(found.x()).isEqualTo(created.x());
            assertThat(found.y()).isEqualTo(created.y());
            assertThat(found.width()).isEqualTo(created.width());
            assertThat(found.height()).isEqualTo(created.height());
            assertThat(found.content()).isEqualTo(created.content());
            assertThat(found.createdAt()).isNotNull();
        }

        // Clean up
        createdAnnotations.forEach(a -> annotationService.delete(a.id()));
    }

    // -------------------------------------------------------------------------
    // Property 9: Annotation deletion invariant
    // -------------------------------------------------------------------------

    /**
     * Feature: guitar-tutorial-manager, Property 9: Annotation deletion invariant
     *
     * For any annotation that has been created and then deleted, querying annotations
     * for that tutorial SHALL not include the deleted annotation, and the total count
     * SHALL decrease by exactly one.
     *
     * Validates: Requirements 4.5
     */
    @Property(tries = 100)
    void annotationDeletionInvariant(
            @ForAll("annotationCountsForDeletion") int totalAnnotations,
            @ForAll("deleteIndexProvider") int deleteIndexSeed) {

        // Create annotations
        List<Long> createdIds = new ArrayList<>();
        for (int i = 0; i < totalAnnotations; i++) {
            CreateAnnotationRequest request = new CreateAnnotationRequest(
                    i + 1,           // pageNumber
                    10.0 + i,        // x
                    20.0 + i,        // y
                    50.0,            // width
                    30.0,            // height
                    "Deletion test annotation " + i,
                    null,            // type
                    null,            // strokeData
                    null             // color
            );
            AnnotationDto created = annotationService.create(TEST_TUTORIAL_ID, request);
            createdIds.add(created.id());
        }

        // Verify initial count
        List<AnnotationDto> beforeDelete = annotationService.getByTutorialId(TEST_TUTORIAL_ID);
        assertThat(beforeDelete).hasSize(totalAnnotations);

        // Pick an annotation to delete using the seed to select an index
        int deleteIndex = Math.abs(deleteIndexSeed) % totalAnnotations;
        Long idToDelete = createdIds.get(deleteIndex);
        annotationService.delete(idToDelete);

        // Verify count decreased by exactly one
        List<AnnotationDto> afterDelete = annotationService.getByTutorialId(TEST_TUTORIAL_ID);
        assertThat(afterDelete).hasSize(totalAnnotations - 1);

        // Verify deleted annotation is absent
        assertThat(afterDelete.stream().map(AnnotationDto::id))
                .doesNotContain(idToDelete);

        // Verify all other annotations are still present
        List<Long> remainingExpectedIds = new ArrayList<>(createdIds);
        remainingExpectedIds.remove(idToDelete);
        assertThat(afterDelete.stream().map(AnnotationDto::id).toList())
                .containsExactlyInAnyOrderElementsOf(remainingExpectedIds);

        // Clean up remaining
        afterDelete.forEach(a -> annotationService.delete(a.id()));
    }

    // -------------------------------------------------------------------------
    // Arbitraries / Providers
    // -------------------------------------------------------------------------

    @Provide
    Arbitrary<List<CreateAnnotationRequest>> validAnnotationRequests() {
        Arbitrary<CreateAnnotationRequest> singleRequest = Combinators.combine(
                Arbitraries.integers().between(1, 50),           // pageNumber
                Arbitraries.doubles().between(0.0, 1000.0),      // x
                Arbitraries.doubles().between(0.0, 1000.0),      // y
                Arbitraries.doubles().between(1.0, 500.0),       // width
                Arbitraries.doubles().between(1.0, 500.0),       // height
                Arbitraries.strings()                             // content
                        .ofMinLength(1)
                        .ofMaxLength(200)
                        .alpha()
                        .numeric()
                        .withChars(' ', '.', ',', '!', '?', '-')
                        .filter(s -> !s.isBlank())
        ).as((pageNumber, x, y, width, height, content) ->
                new CreateAnnotationRequest(pageNumber, x, y, width, height, content, null, null, null));

        return singleRequest.list().ofMinSize(1).ofMaxSize(5);
    }

    @Provide
    Arbitrary<Integer> annotationCountsForDeletion() {
        return Arbitraries.integers().between(2, 5);
    }

    @Provide
    Arbitrary<Integer> deleteIndexProvider() {
        return Arbitraries.integers().between(0, Integer.MAX_VALUE - 1);
    }
}
