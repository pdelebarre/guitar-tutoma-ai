package com.guitartutorial.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void handleTutorialNotFound_returns404WithTutorialId() {
        TutorialNotFoundException ex = new TutorialNotFoundException("my-tutorial");

        ResponseEntity<Map<String, Object>> response = handler.handleTutorialNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Tutorial not found", response.getBody().get("error"));
        assertEquals("my-tutorial", response.getBody().get("tutorialId"));
    }

    @Test
    void handleResourceNotFound_returns404WithMessage() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Video file not found");

        ResponseEntity<Map<String, Object>> response = handler.handleResourceNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Video file not found", response.getBody().get("error"));
    }

    @Test
    void handleValidation_returns400WithMessage() {
        ValidationException ex = new ValidationException("Comment text must not be blank");

        ResponseEntity<Map<String, Object>> response = handler.handleValidation(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Comment text must not be blank", response.getBody().get("error"));
    }

    @Test
    void handleStorageAccess_returns500WithGenericMessage() {
        StorageAccessException ex = new StorageAccessException("Permission denied");

        ResponseEntity<Map<String, Object>> response = handler.handleStorageAccess(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("Tutorials directory is not accessible", response.getBody().get("error"));
    }

    @Test
    void handleMethodArgumentNotValid_returns400WithFieldErrorMessage() {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "request");
        bindingResult.addError(new FieldError("request", "text", "Comment text must not be blank"));
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindingResult);

        ResponseEntity<Map<String, Object>> response = handler.handleMethodArgumentNotValid(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Comment text must not be blank", response.getBody().get("error"));
    }

    @Test
    void handleGeneral_returns500WithGenericMessage() {
        Exception ex = new RuntimeException("Unexpected error");

        ResponseEntity<Map<String, Object>> response = handler.handleGeneral(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("Internal server error", response.getBody().get("error"));
    }
}
