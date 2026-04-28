package com.guitartutorial.service;

import com.guitartutorial.dto.AnnotationDto;
import com.guitartutorial.dto.CreateAnnotationRequest;
import com.guitartutorial.entity.Annotation;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.exception.ValidationException;
import com.guitartutorial.repository.AnnotationRepository;
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
class AnnotationServiceTest {

    @Mock
    private AnnotationRepository annotationRepository;

    @InjectMocks
    private AnnotationService annotationService;

    private Annotation sampleAnnotation;

    @BeforeEach
    void setUp() {
        sampleAnnotation = Annotation.builder()
                .id(1L)
                .tutorialId("tutorial-1")
                .pageNumber(1)
                .x(10.5)
                .y(20.3)
                .width(100.0)
                .height(50.0)
                .content("Practice this section slowly")
                .createdAt(LocalDateTime.of(2024, 1, 15, 10, 30))
                .build();
    }

    @Test
    void create_shouldPersistAnnotationWithTimestamp() {
        when(annotationRepository.save(any(Annotation.class))).thenAnswer(invocation -> {
            Annotation a = invocation.getArgument(0);
            a.setId(1L);
            return a;
        });

        CreateAnnotationRequest request = new CreateAnnotationRequest(1, 10.5, 20.3, 100.0, 50.0, "Practice this section slowly");
        AnnotationDto result = annotationService.create("tutorial-1", request);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.tutorialId()).isEqualTo("tutorial-1");
        assertThat(result.pageNumber()).isEqualTo(1);
        assertThat(result.x()).isEqualTo(10.5);
        assertThat(result.y()).isEqualTo(20.3);
        assertThat(result.width()).isEqualTo(100.0);
        assertThat(result.height()).isEqualTo(50.0);
        assertThat(result.content()).isEqualTo("Practice this section slowly");
        assertThat(result.createdAt()).isNotNull();

        ArgumentCaptor<Annotation> captor = ArgumentCaptor.forClass(Annotation.class);
        verify(annotationRepository).save(captor.capture());
        assertThat(captor.getValue().getCreatedAt()).isNotNull();
    }

    @Test
    void create_shouldAllowNullContent() {
        when(annotationRepository.save(any(Annotation.class))).thenAnswer(invocation -> {
            Annotation a = invocation.getArgument(0);
            a.setId(2L);
            return a;
        });

        CreateAnnotationRequest request = new CreateAnnotationRequest(1, 0.0, 0.0, 50.0, 50.0, null);
        AnnotationDto result = annotationService.create("tutorial-1", request);

        assertThat(result.id()).isEqualTo(2L);
        assertThat(result.content()).isNull();
    }

    @Test
    void getByTutorialId_shouldReturnAnnotations() {
        Annotation second = Annotation.builder()
                .id(2L).tutorialId("tutorial-1").pageNumber(2)
                .x(30.0).y(40.0).width(80.0).height(60.0)
                .content("Tricky chord change")
                .createdAt(LocalDateTime.of(2024, 1, 16, 10, 0))
                .build();

        when(annotationRepository.findByTutorialId("tutorial-1"))
                .thenReturn(List.of(sampleAnnotation, second));

        List<AnnotationDto> result = annotationService.getByTutorialId("tutorial-1");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(1).id()).isEqualTo(2L);
    }

    @Test
    void getByTutorialId_shouldReturnEmptyListWhenNoAnnotations() {
        when(annotationRepository.findByTutorialId("tutorial-1"))
                .thenReturn(List.of());

        List<AnnotationDto> result = annotationService.getByTutorialId("tutorial-1");

        assertThat(result).isEmpty();
    }

    @Test
    void update_shouldUpdateAllFields() {
        when(annotationRepository.findById(1L)).thenReturn(Optional.of(sampleAnnotation));
        when(annotationRepository.save(any(Annotation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateAnnotationRequest request = new CreateAnnotationRequest(3, 55.0, 65.0, 200.0, 100.0, "Updated note");
        AnnotationDto result = annotationService.update(1L, request);

        assertThat(result.pageNumber()).isEqualTo(3);
        assertThat(result.x()).isEqualTo(55.0);
        assertThat(result.y()).isEqualTo(65.0);
        assertThat(result.width()).isEqualTo(200.0);
        assertThat(result.height()).isEqualTo(100.0);
        assertThat(result.content()).isEqualTo("Updated note");
        assertThat(result.createdAt()).isEqualTo(sampleAnnotation.getCreatedAt());
    }

    @Test
    void update_shouldThrowResourceNotFoundExceptionWhenAnnotationNotFound() {
        when(annotationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> annotationService.update(99L, new CreateAnnotationRequest(1, 0, 0, 10, 10, "text")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Annotation not found");
    }

    @Test
    void delete_shouldRemoveAnnotation() {
        when(annotationRepository.findById(1L)).thenReturn(Optional.of(sampleAnnotation));

        annotationService.delete(1L);

        verify(annotationRepository).delete(sampleAnnotation);
    }

    @Test
    void delete_shouldThrowResourceNotFoundExceptionWhenAnnotationNotFound() {
        when(annotationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> annotationService.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Annotation not found");
    }

    // --- Coordinate validation tests ---

    @Test
    void create_shouldThrowValidationExceptionForNegativeX() {
        CreateAnnotationRequest request = new CreateAnnotationRequest(1, -5.0, 20.0, 100.0, 50.0, "note");

        assertThatThrownBy(() -> annotationService.create("tutorial-1", request))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Invalid annotation position");
    }

    @Test
    void create_shouldThrowValidationExceptionForNegativeY() {
        CreateAnnotationRequest request = new CreateAnnotationRequest(1, 10.0, -3.0, 100.0, 50.0, "note");

        assertThatThrownBy(() -> annotationService.create("tutorial-1", request))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Invalid annotation position");
    }

    @Test
    void create_shouldThrowValidationExceptionForNegativeWidth() {
        CreateAnnotationRequest request = new CreateAnnotationRequest(1, 10.0, 20.0, -100.0, 50.0, "note");

        assertThatThrownBy(() -> annotationService.create("tutorial-1", request))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Invalid annotation position");
    }

    @Test
    void create_shouldThrowValidationExceptionForNegativeHeight() {
        CreateAnnotationRequest request = new CreateAnnotationRequest(1, 10.0, 20.0, 100.0, -50.0, "note");

        assertThatThrownBy(() -> annotationService.create("tutorial-1", request))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Invalid annotation position");
    }

    @Test
    void create_shouldThrowValidationExceptionForNegativePageNumber() {
        CreateAnnotationRequest request = new CreateAnnotationRequest(-1, 10.0, 20.0, 100.0, 50.0, "note");

        assertThatThrownBy(() -> annotationService.create("tutorial-1", request))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Invalid annotation position");
    }

    @Test
    void create_shouldAcceptZeroCoordinates() {
        when(annotationRepository.save(any(Annotation.class))).thenAnswer(invocation -> {
            Annotation a = invocation.getArgument(0);
            a.setId(3L);
            return a;
        });

        CreateAnnotationRequest request = new CreateAnnotationRequest(0, 0.0, 0.0, 0.0, 0.0, "origin");
        AnnotationDto result = annotationService.create("tutorial-1", request);

        assertThat(result.id()).isEqualTo(3L);
        assertThat(result.x()).isEqualTo(0.0);
        assertThat(result.y()).isEqualTo(0.0);
        assertThat(result.width()).isEqualTo(0.0);
        assertThat(result.height()).isEqualTo(0.0);
    }

    @Test
    void update_shouldThrowValidationExceptionForNegativeCoordinates() {
        CreateAnnotationRequest request = new CreateAnnotationRequest(1, -10.0, 20.0, 100.0, 50.0, "note");

        assertThatThrownBy(() -> annotationService.update(1L, request))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Invalid annotation position");
    }

    @Test
    void update_shouldThrowValidationExceptionForNegativeDimensions() {
        CreateAnnotationRequest request = new CreateAnnotationRequest(1, 10.0, 20.0, -5.0, 50.0, "note");

        assertThatThrownBy(() -> annotationService.update(1L, request))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Invalid annotation position");
    }
}
