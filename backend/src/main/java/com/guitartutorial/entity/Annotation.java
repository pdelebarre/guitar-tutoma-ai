package com.guitartutorial.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Annotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String tutorialId;

    @Column(nullable = false)
    private int pageNumber;

    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double y;

    @Column(nullable = false)
    private double width;

    @Column(nullable = false)
    private double height;

    @Column(columnDefinition = "TEXT")
    private String content;

    /**
     * Type of annotation: "text", "underline", "highlight", "drawing"
     */
    @Column(nullable = false)
    @Builder.Default
    private String type = "text";

    /**
     * JSON string containing stroke/drawing data.
     * For "underline" and "highlight": [{"x": 10, "y": 50}, {"x": 80, "y": 50}]
     * For "drawing": [{"x": 10, "y": 20}, {"x": 15, "y": 25}, ...]
     */
    @Column(columnDefinition = "TEXT")
    private String strokeData;

    /**
     * Color of the annotation/drawing (hex format, e.g. "#FFD700")
     */
    @Column
    private String color;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
