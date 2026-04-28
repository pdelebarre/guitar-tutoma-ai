package com.guitartutorial.service;

import com.guitartutorial.dto.AnnotationDto;
import com.guitartutorial.dto.CreateAnnotationRequest;
import com.guitartutorial.entity.Annotation;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.exception.ValidationException;
import com.guitartutorial.repository.AnnotationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AnnotationService {

    private final AnnotationRepository annotationRepository;

    public AnnotationService(AnnotationRepository annotationRepository) {
        this.annotationRepository = annotationRepository;
    }

    public AnnotationDto create(String tutorialId, CreateAnnotationRequest request) {
        validateCoordinates(request);
        Annotation annotation = Annotation.builder()
                .tutorialId(tutorialId)
                .pageNumber(request.pageNumber())
                .x(request.x())
                .y(request.y())
                .width(request.width())
                .height(request.height())
                .content(request.content())
                .type(request.type() != null ? request.type() : "text")
                .strokeData(request.strokeData())
                .color(request.color())
                .createdAt(LocalDateTime.now())
                .build();

        Annotation saved = annotationRepository.save(annotation);
        return toDto(saved);
    }

    public List<AnnotationDto> getByTutorialId(String tutorialId) {
        return annotationRepository.findByTutorialId(tutorialId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public AnnotationDto update(Long annotationId, CreateAnnotationRequest request) {
        validateCoordinates(request);
        Annotation annotation = annotationRepository.findById(annotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Annotation not found"));

        annotation.setPageNumber(request.pageNumber());
        annotation.setX(request.x());
        annotation.setY(request.y());
        annotation.setWidth(request.width());
        annotation.setHeight(request.height());
        annotation.setContent(request.content());
        if (request.type() != null) {
            annotation.setType(request.type());
        }
        annotation.setStrokeData(request.strokeData());
        annotation.setColor(request.color());

        Annotation saved = annotationRepository.save(annotation);
        return toDto(saved);
    }

    public void delete(Long annotationId) {
        Annotation annotation = annotationRepository.findById(annotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Annotation not found"));
        annotationRepository.delete(annotation);
    }

    private void validateCoordinates(CreateAnnotationRequest request) {
        if (request.x() < 0 || request.y() < 0) {
            throw new ValidationException("Invalid annotation position");
        }
        if (request.width() < 0 || request.height() < 0) {
            throw new ValidationException("Invalid annotation position");
        }
        if (request.pageNumber() < 0) {
            throw new ValidationException("Invalid annotation position");
        }
    }

    private AnnotationDto toDto(Annotation annotation) {
        return new AnnotationDto(
                annotation.getId(),
                annotation.getTutorialId(),
                annotation.getPageNumber(),
                annotation.getX(),
                annotation.getY(),
                annotation.getWidth(),
                annotation.getHeight(),
                annotation.getContent(),
                annotation.getType(),
                annotation.getStrokeData(),
                annotation.getColor(),
                annotation.getCreatedAt()
        );
    }
}
