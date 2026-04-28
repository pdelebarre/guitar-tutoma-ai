package com.guitartutorial.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.guitartutorial.dto.CommentDto;
import com.guitartutorial.dto.CreateCommentRequest;
import com.guitartutorial.exception.GlobalExceptionHandler;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.service.CommentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CommentController.class)
@Import(GlobalExceptionHandler.class)
class CommentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CommentService commentService;

    private static final String BASE_URL = "/api/tutorials/tutorial-1/comments";
    private static final LocalDateTime NOW = LocalDateTime.of(2024, 1, 15, 10, 30);

    @Test
    void getComments_shouldReturnListOfComments() throws Exception {
        CommentDto comment = new CommentDto(1L, "tutorial-1", "Nice!", NOW, null);
        when(commentService.getByTutorialId("tutorial-1")).thenReturn(List.of(comment));

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].tutorialId").value("tutorial-1"))
                .andExpect(jsonPath("$[0].text").value("Nice!"));
    }

    @Test
    void getComments_shouldReturnEmptyListWhenNoComments() throws Exception {
        when(commentService.getByTutorialId("tutorial-1")).thenReturn(List.of());

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void createComment_shouldReturn201WithCreatedComment() throws Exception {
        CommentDto created = new CommentDto(1L, "tutorial-1", "Great lesson!", NOW, null);
        when(commentService.create(eq("tutorial-1"), any(CreateCommentRequest.class))).thenReturn(created);

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateCommentRequest("Great lesson!"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.text").value("Great lesson!"));
    }

    @Test
    void createComment_shouldReturn400ForBlankText() throws Exception {
        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateCommentRequest(""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Comment text must not be blank"));
    }

    @Test
    void updateComment_shouldReturnUpdatedComment() throws Exception {
        CommentDto updated = new CommentDto(1L, "tutorial-1", "Updated text", NOW, NOW.plusHours(1));
        when(commentService.update(eq(1L), any(CreateCommentRequest.class))).thenReturn(updated);

        mockMvc.perform(put(BASE_URL + "/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateCommentRequest("Updated text"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Updated text"))
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());
    }

    @Test
    void updateComment_shouldReturn400ForBlankText() throws Exception {
        mockMvc.perform(put(BASE_URL + "/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateCommentRequest("  "))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Comment text must not be blank"));
    }

    @Test
    void updateComment_shouldReturn404WhenCommentNotFound() throws Exception {
        when(commentService.update(eq(99L), any(CreateCommentRequest.class)))
                .thenThrow(new ResourceNotFoundException("Comment not found"));

        mockMvc.perform(put(BASE_URL + "/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateCommentRequest("text"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Comment not found"));
    }

    @Test
    void deleteComment_shouldReturn204() throws Exception {
        doNothing().when(commentService).delete(1L);

        mockMvc.perform(delete(BASE_URL + "/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteComment_shouldReturn404WhenCommentNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Comment not found")).when(commentService).delete(99L);

        mockMvc.perform(delete(BASE_URL + "/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Comment not found"));
    }
}
