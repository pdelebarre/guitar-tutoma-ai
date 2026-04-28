package com.guitartutorial.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.guitartutorial.dto.AnnotationDto;
import com.guitartutorial.dto.CreateAnnotationRequest;
import com.guitartutorial.exception.GlobalExceptionHandler;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.service.AnnotationService;
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

@WebMvcTest(AnnotationController.class)
@Import(GlobalExceptionHandler.class)
class AnnotationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AnnotationService annotationService;

    private static final String BASE_URL = "/api/tutorials/tutorial-1/annotations";
    private static final LocalDateTime NOW = LocalDateTime.of(2024, 1, 15, 10, 30);

    @Test
    void getAnnotations_shouldReturnListOfAnnotations() throws Exception {
        AnnotationDto annotation = new AnnotationDto(1L, "tutorial-1", 1, 10.5, 20.3, 100.0, 50.0, "Note", NOW);
        when(annotationService.getByTutorialId("tutorial-1")).thenReturn(List.of(annotation));

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].tutorialId").value("tutorial-1"))
                .andExpect(jsonPath("$[0].pageNumber").value(1))
                .andExpect(jsonPath("$[0].x").value(10.5))
                .andExpect(jsonPath("$[0].y").value(20.3))
                .andExpect(jsonPath("$[0].content").value("Note"));
    }

    @Test
    void getAnnotations_shouldReturnEmptyListWhenNoAnnotations() throws Exception {
        when(annotationService.getByTutorialId("tutorial-1")).thenReturn(List.of());

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void createAnnotation_shouldReturn201WithCreatedAnnotation() throws Exception {
        AnnotationDto created = new AnnotationDto(1L, "tutorial-1", 1, 10.5, 20.3, 100.0, 50.0, "New note", NOW);
        when(annotationService.create(eq("tutorial-1"), any(CreateAnnotationRequest.class))).thenReturn(created);

        CreateAnnotationRequest request = new CreateAnnotationRequest(1, 10.5, 20.3, 100.0, 50.0, "New note");

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.content").value("New note"));
    }

    @Test
    void updateAnnotation_shouldReturnUpdatedAnnotation() throws Exception {
        AnnotationDto updated = new AnnotationDto(1L, "tutorial-1", 2, 55.0, 65.0, 200.0, 100.0, "Updated", NOW);
        when(annotationService.update(eq(1L), any(CreateAnnotationRequest.class))).thenReturn(updated);

        CreateAnnotationRequest request = new CreateAnnotationRequest(2, 55.0, 65.0, 200.0, 100.0, "Updated");

        mockMvc.perform(put(BASE_URL + "/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pageNumber").value(2))
                .andExpect(jsonPath("$.content").value("Updated"));
    }

    @Test
    void updateAnnotation_shouldReturn404WhenAnnotationNotFound() throws Exception {
        when(annotationService.update(eq(99L), any(CreateAnnotationRequest.class)))
                .thenThrow(new ResourceNotFoundException("Annotation not found"));

        CreateAnnotationRequest request = new CreateAnnotationRequest(1, 0, 0, 10, 10, "text");

        mockMvc.perform(put(BASE_URL + "/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Annotation not found"));
    }

    @Test
    void deleteAnnotation_shouldReturn204() throws Exception {
        doNothing().when(annotationService).delete(1L);

        mockMvc.perform(delete(BASE_URL + "/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteAnnotation_shouldReturn404WhenAnnotationNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Annotation not found")).when(annotationService).delete(99L);

        mockMvc.perform(delete(BASE_URL + "/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Annotation not found"));
    }
}
