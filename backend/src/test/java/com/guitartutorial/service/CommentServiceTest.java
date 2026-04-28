package com.guitartutorial.service;

import com.guitartutorial.dto.CommentDto;
import com.guitartutorial.dto.CreateCommentRequest;
import com.guitartutorial.entity.Comment;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.exception.ValidationException;
import com.guitartutorial.repository.CommentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @InjectMocks
    private CommentService commentService;

    private Comment sampleComment;

    @BeforeEach
    void setUp() {
        sampleComment = Comment.builder()
                .id(1L)
                .tutorialId("tutorial-1")
                .text("Great lesson!")
                .createdAt(LocalDateTime.of(2024, 1, 15, 10, 30))
                .build();
    }

    @Test
    void create_shouldPersistCommentWithTimestamp() {
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> {
            Comment c = invocation.getArgument(0);
            c.setId(1L);
            return c;
        });

        CommentDto result = commentService.create("tutorial-1", new CreateCommentRequest("Great lesson!"));

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.tutorialId()).isEqualTo("tutorial-1");
        assertThat(result.text()).isEqualTo("Great lesson!");
        assertThat(result.createdAt()).isNotNull();
        assertThat(result.updatedAt()).isNull();

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(captor.capture());
        assertThat(captor.getValue().getCreatedAt()).isNotNull();
    }

    @Test
    void create_shouldThrowValidationExceptionForBlankText() {
        assertThatThrownBy(() -> commentService.create("tutorial-1", new CreateCommentRequest("")))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Comment text must not be blank");
    }

    @Test
    void create_shouldThrowValidationExceptionForWhitespaceOnlyText() {
        assertThatThrownBy(() -> commentService.create("tutorial-1", new CreateCommentRequest("   \t\n")))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Comment text must not be blank");
    }

    @Test
    void create_shouldThrowValidationExceptionForNullText() {
        assertThatThrownBy(() -> commentService.create("tutorial-1", new CreateCommentRequest(null)))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Comment text must not be blank");
    }

    @Test
    void getByTutorialId_shouldReturnCommentsOrderedByCreatedAtDesc() {
        Comment older = Comment.builder()
                .id(1L).tutorialId("tutorial-1").text("First")
                .createdAt(LocalDateTime.of(2024, 1, 10, 10, 0))
                .build();
        Comment newer = Comment.builder()
                .id(2L).tutorialId("tutorial-1").text("Second")
                .createdAt(LocalDateTime.of(2024, 1, 15, 10, 0))
                .build();

        when(commentRepository.findByTutorialIdOrderByCreatedAtDesc("tutorial-1"))
                .thenReturn(List.of(newer, older));

        List<CommentDto> result = commentService.getByTutorialId("tutorial-1");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).text()).isEqualTo("Second");
        assertThat(result.get(1).text()).isEqualTo("First");
    }

    @Test
    void getByTutorialId_shouldReturnEmptyListWhenNoComments() {
        when(commentRepository.findByTutorialIdOrderByCreatedAtDesc("tutorial-1"))
                .thenReturn(List.of());

        List<CommentDto> result = commentService.getByTutorialId("tutorial-1");

        assertThat(result).isEmpty();
    }

    @Test
    void update_shouldUpdateTextAndSetUpdatedAt() {
        when(commentRepository.findById(1L)).thenReturn(Optional.of(sampleComment));
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CommentDto result = commentService.update(1L, new CreateCommentRequest("Updated text"));

        assertThat(result.text()).isEqualTo("Updated text");
        assertThat(result.updatedAt()).isNotNull();
        assertThat(result.createdAt()).isEqualTo(sampleComment.getCreatedAt());
    }

    @Test
    void update_shouldThrowResourceNotFoundExceptionWhenCommentNotFound() {
        when(commentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.update(99L, new CreateCommentRequest("text")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Comment not found");
    }

    @Test
    void update_shouldThrowValidationExceptionForBlankText() {
        assertThatThrownBy(() -> commentService.update(1L, new CreateCommentRequest("  ")))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Comment text must not be blank");
    }

    @Test
    void delete_shouldRemoveComment() {
        when(commentRepository.findById(1L)).thenReturn(Optional.of(sampleComment));

        commentService.delete(1L);

        verify(commentRepository).delete(sampleComment);
    }

    @Test
    void delete_shouldThrowResourceNotFoundExceptionWhenCommentNotFound() {
        when(commentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Comment not found");
    }
}
