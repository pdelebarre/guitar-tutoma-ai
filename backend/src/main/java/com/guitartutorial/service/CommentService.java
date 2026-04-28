package com.guitartutorial.service;

import com.guitartutorial.dto.CommentDto;
import com.guitartutorial.dto.CreateCommentRequest;
import com.guitartutorial.entity.Comment;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.exception.ValidationException;
import com.guitartutorial.repository.CommentRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;

    public CommentService(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    public CommentDto create(String tutorialId, CreateCommentRequest request) {
        validateText(request.text());

        Comment comment = Comment.builder()
                .tutorialId(tutorialId)
                .text(request.text())
                .createdAt(LocalDateTime.now())
                .build();

        Comment saved = commentRepository.save(comment);
        return toDto(saved);
    }

    public List<CommentDto> getByTutorialId(String tutorialId) {
        return commentRepository.findByTutorialIdOrderByCreatedAtDesc(tutorialId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public CommentDto update(Long commentId, CreateCommentRequest request) {
        validateText(request.text());

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        comment.setText(request.text());
        comment.setUpdatedAt(LocalDateTime.now());

        Comment saved = commentRepository.save(comment);
        return toDto(saved);
    }

    public void delete(Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        commentRepository.delete(comment);
    }

    private void validateText(String text) {
        if (text == null || text.isBlank()) {
            throw new ValidationException("Comment text must not be blank");
        }
    }

    private CommentDto toDto(Comment comment) {
        return new CommentDto(
                comment.getId(),
                comment.getTutorialId(),
                comment.getText(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
}
