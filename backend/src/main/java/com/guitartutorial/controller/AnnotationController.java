package com.guitartutorial.controller;

import com.guitartutorial.dto.AnnotationDto;
import com.guitartutorial.dto.CreateAnnotationRequest;
import com.guitartutorial.service.AnnotationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tutorials/{tutorialId}/annotations")
public class AnnotationController {

    private final AnnotationService annotationService;

    public AnnotationController(AnnotationService annotationService) {
        this.annotationService = annotationService;
    }

    @GetMapping
    public ResponseEntity<List<AnnotationDto>> getAnnotations(@PathVariable String tutorialId) {
        List<AnnotationDto> annotations = annotationService.getByTutorialId(tutorialId);
        return ResponseEntity.ok(annotations);
    }

    @PostMapping
    public ResponseEntity<AnnotationDto> createAnnotation(
            @PathVariable String tutorialId,
            @Valid @RequestBody CreateAnnotationRequest request) {
        AnnotationDto created = annotationService.create(tutorialId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{annotationId}")
    public ResponseEntity<AnnotationDto> updateAnnotation(
            @PathVariable String tutorialId,
            @PathVariable Long annotationId,
            @Valid @RequestBody CreateAnnotationRequest request) {
        AnnotationDto updated = annotationService.update(annotationId, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{annotationId}")
    public ResponseEntity<Void> deleteAnnotation(
            @PathVariable String tutorialId,
            @PathVariable Long annotationId) {
        annotationService.delete(annotationId);
        return ResponseEntity.noContent().build();
    }
}
