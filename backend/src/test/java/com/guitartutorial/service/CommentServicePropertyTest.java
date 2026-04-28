package com.guitartutorial.service;

import com.guitartutorial.GuitarTutorialManagerApplication;
import com.guitartutorial.dto.CommentDto;
import com.guitartutorial.dto.CreateCommentRequest;
import com.guitartutorial.exception.ValidationException;
import com.guitartutorial.repository.CommentRepository;
import net.jqwik.api.*;
import net.jqwik.api.lifecycle.BeforeProperty;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Feature: guitar-tutorial-manager
 *
 * Property-based tests for CommentService using a real H2 database
 * via Spring Boot application context with the "local" profile.
 * The web environment is disabled to avoid port conflicts.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
class CommentServicePropertyTest {

    private static ConfigurableApplicationContext context;
    private CommentService commentService;
    private CommentRepository commentRepository;

    private static final String TEST_TUTORIAL_ID = "prop-test-tutorial";

    @BeforeProperty
    void setUp() {
        if (context == null || !context.isActive()) {
            context = new SpringApplicationBuilder(GuitarTutorialManagerApplication.class)
                    .profiles("local")
                    .properties("spring.main.web-application-type=none")
                    .run();
        }
        commentService = context.getBean(CommentService.class);
        commentRepository = context.getBean(CommentRepository.class);
        // Clean up all comments for the test tutorial ID between property runs
        commentRepository.findByTutorialIdOrderByCreatedAtDesc(TEST_TUTORIAL_ID)
                .forEach(commentRepository::delete);
    }

    // -------------------------------------------------------------------------
    // Property 4: Comment CRUD round-trip
    // -------------------------------------------------------------------------

    /**
     * Feature: guitar-tutorial-manager, Property 4: Comment CRUD round-trip
     *
     * For any valid non-empty comment text, creating a comment and then retrieving it
     * SHALL return a comment with the same tutorial reference and text, a non-null
     * createdAt timestamp, and — if subsequently updated with new text — the retrieved
     * comment SHALL reflect the new text and have an updatedAt timestamp that is
     * greater than or equal to createdAt.
     *
     * Validates: Requirements 3.1, 3.3
     */
    @Property(tries = 100)
    void commentCrudRoundTrip(
            @ForAll("validCommentTexts") String originalText,
            @ForAll("validCommentTexts") String updatedText) {

        // Create
        CommentDto created = commentService.create(TEST_TUTORIAL_ID, new CreateCommentRequest(originalText));

        assertThat(created.id()).isNotNull();
        assertThat(created.tutorialId()).isEqualTo(TEST_TUTORIAL_ID);
        assertThat(created.text()).isEqualTo(originalText);
        assertThat(created.createdAt()).isNotNull();

        // Retrieve and verify
        List<CommentDto> comments = commentService.getByTutorialId(TEST_TUTORIAL_ID);
        CommentDto retrieved = comments.stream()
                .filter(c -> c.id().equals(created.id()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Created comment not found in retrieval"));

        assertThat(retrieved.text()).isEqualTo(originalText);
        // H2 may round nanoseconds when storing timestamps, so compare truncated to millis
        assertThat(retrieved.createdAt().truncatedTo(ChronoUnit.MILLIS))
                .isEqualTo(created.createdAt().truncatedTo(ChronoUnit.MILLIS));

        // Update
        CommentDto updated = commentService.update(created.id(), new CreateCommentRequest(updatedText));

        assertThat(updated.text()).isEqualTo(updatedText);
        assertThat(updated.updatedAt()).isNotNull();
        // updatedAt should be >= createdAt; truncate to millis to avoid DB rounding artifacts
        assertThat(updated.updatedAt().truncatedTo(ChronoUnit.MILLIS))
                .isAfterOrEqualTo(updated.createdAt().truncatedTo(ChronoUnit.MILLIS));

        // Retrieve after update and verify
        List<CommentDto> afterUpdate = commentService.getByTutorialId(TEST_TUTORIAL_ID);
        CommentDto retrievedAfterUpdate = afterUpdate.stream()
                .filter(c -> c.id().equals(created.id()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Updated comment not found in retrieval"));

        assertThat(retrievedAfterUpdate.text()).isEqualTo(updatedText);
        assertThat(retrievedAfterUpdate.updatedAt().truncatedTo(ChronoUnit.MILLIS))
                .isAfterOrEqualTo(retrievedAfterUpdate.createdAt().truncatedTo(ChronoUnit.MILLIS));

        // Clean up
        commentService.delete(created.id());
    }

    // -------------------------------------------------------------------------
    // Property 5: Comment ordering invariant
    // -------------------------------------------------------------------------

    /**
     * Feature: guitar-tutorial-manager, Property 5: Comment ordering invariant
     *
     * For any set of comments associated with a tutorial, retrieving the comments
     * SHALL return them ordered by createdAt descending, such that each comment's
     * createdAt is greater than or equal to the next comment's createdAt in the list.
     *
     * Validates: Requirements 3.2
     */
    @Property(tries = 100)
    void commentOrderingInvariant(
            @ForAll("commentCountsForOrdering") int commentCount) {

        // Create multiple comments with small delays to ensure distinct timestamps
        List<Long> createdIds = new ArrayList<>();
        for (int i = 0; i < commentCount; i++) {
            CommentDto created = commentService.create(TEST_TUTORIAL_ID,
                    new CreateCommentRequest("Ordering test comment " + i));
            createdIds.add(created.id());
            // Small delay to ensure distinct timestamps
            try {
                Thread.sleep(2);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        // Retrieve and verify ordering
        List<CommentDto> comments = commentService.getByTutorialId(TEST_TUTORIAL_ID);

        assertThat(comments).hasSize(commentCount);

        for (int i = 0; i < comments.size() - 1; i++) {
            LocalDateTime current = comments.get(i).createdAt();
            LocalDateTime next = comments.get(i + 1).createdAt();
            assertThat(current)
                    .as("Comment at index %d (createdAt=%s) should be >= comment at index %d (createdAt=%s)",
                            i, current, i + 1, next)
                    .isAfterOrEqualTo(next);
        }

        // Clean up
        createdIds.forEach(commentService::delete);
    }

    // -------------------------------------------------------------------------
    // Property 6: Comment deletion invariant
    // -------------------------------------------------------------------------

    /**
     * Feature: guitar-tutorial-manager, Property 6: Comment deletion invariant
     *
     * For any comment that has been created and then deleted, querying comments for
     * that tutorial SHALL not include the deleted comment, and the total count SHALL
     * decrease by exactly one.
     *
     * Validates: Requirements 3.4
     */
    @Property(tries = 100)
    void commentDeletionInvariant(
            @ForAll("commentCountsForDeletion") int totalComments,
            @ForAll("validCommentTexts") String extraText) {

        // Create comments
        List<Long> createdIds = new ArrayList<>();
        for (int i = 0; i < totalComments; i++) {
            CommentDto created = commentService.create(TEST_TUTORIAL_ID,
                    new CreateCommentRequest("Delete test " + i + " " + extraText));
            createdIds.add(created.id());
        }

        // Verify initial count
        List<CommentDto> beforeDelete = commentService.getByTutorialId(TEST_TUTORIAL_ID);
        assertThat(beforeDelete).hasSize(totalComments);

        // Pick the first comment to delete
        Long idToDelete = createdIds.get(0);
        commentService.delete(idToDelete);

        // Verify count decreased by one
        List<CommentDto> afterDelete = commentService.getByTutorialId(TEST_TUTORIAL_ID);
        assertThat(afterDelete).hasSize(totalComments - 1);

        // Verify deleted comment is absent
        assertThat(afterDelete.stream().map(CommentDto::id))
                .doesNotContain(idToDelete);

        // Clean up remaining
        afterDelete.forEach(c -> commentService.delete(c.id()));
    }

    // -------------------------------------------------------------------------
    // Property 7: Whitespace comment rejection
    // -------------------------------------------------------------------------

    /**
     * Feature: guitar-tutorial-manager, Property 7: Whitespace comment rejection
     *
     * For any string composed entirely of whitespace characters (including empty
     * string, spaces, tabs, and newlines), submitting it as a comment text SHALL
     * be rejected with a validation error, and the set of comments for that tutorial
     * SHALL remain unchanged.
     *
     * Validates: Requirements 3.5
     */
    @Property(tries = 100)
    void whitespaceCommentRejection(
            @ForAll("whitespaceStrings") String whitespaceText) {

        // Record the comment set before the attempt
        List<CommentDto> before = commentService.getByTutorialId(TEST_TUTORIAL_ID);
        int countBefore = before.size();

        // Attempt to create a whitespace-only comment
        assertThatThrownBy(() ->
                commentService.create(TEST_TUTORIAL_ID, new CreateCommentRequest(whitespaceText)))
                .isInstanceOf(ValidationException.class);

        // Verify comment set is unchanged
        List<CommentDto> after = commentService.getByTutorialId(TEST_TUTORIAL_ID);
        assertThat(after).hasSize(countBefore);
        assertThat(after.stream().map(CommentDto::id).toList())
                .containsExactlyElementsOf(before.stream().map(CommentDto::id).toList());
    }

    // -------------------------------------------------------------------------
    // Arbitraries / Providers
    // -------------------------------------------------------------------------

    @Provide
    Arbitrary<String> validCommentTexts() {
        return Arbitraries.strings()
                .ofMinLength(1)
                .ofMaxLength(200)
                .alpha()
                .numeric()
                .withChars(' ', '.', ',', '!', '?', '-')
                .filter(s -> !s.isBlank());
    }

    @Provide
    Arbitrary<Integer> commentCountsForOrdering() {
        return Arbitraries.integers().between(2, 5);
    }

    @Provide
    Arbitrary<Integer> commentCountsForDeletion() {
        return Arbitraries.integers().between(2, 5);
    }

    @Provide
    Arbitrary<String> whitespaceStrings() {
        return Arbitraries.of(' ', '\t', '\n', '\r')
                .list()
                .ofMinSize(0)
                .ofMaxSize(10)
                .map(chars -> {
                    StringBuilder sb = new StringBuilder();
                    for (Character c : chars) {
                        sb.append(c);
                    }
                    return sb.toString();
                });
    }
}
