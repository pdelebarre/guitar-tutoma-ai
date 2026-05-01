package com.guitartutorial.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.LocalDateTime;

@Entity
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

    public Annotation() {
    }

    public Annotation(Long id, String tutorialId, int pageNumber, double x, double y,
                      double width, double height, String content, String type,
                      String strokeData, String color, LocalDateTime createdAt) {
        this.id = id;
        this.tutorialId = tutorialId;
        this.pageNumber = pageNumber;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.content = content;
        this.type = type;
        this.strokeData = strokeData;
        this.color = color;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTutorialId() {
        return tutorialId;
    }

    public void setTutorialId(String tutorialId) {
        this.tutorialId = tutorialId;
    }

    public int getPageNumber() {
        return pageNumber;
    }

    public void setPageNumber(int pageNumber) {
        this.pageNumber = pageNumber;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    public double getWidth() {
        return width;
    }

    public void setWidth(double width) {
        this.width = width;
    }

    public double getHeight() {
        return height;
    }

    public void setHeight(double height) {
        this.height = height;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getStrokeData() {
        return strokeData;
    }

    public void setStrokeData(String strokeData) {
        this.strokeData = strokeData;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String tutorialId;
        private int pageNumber;
        private double x;
        private double y;
        private double width;
        private double height;
        private String content;
        private String type = "text";
        private String strokeData;
        private String color;
        private LocalDateTime createdAt;

        Builder() {
        }

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder tutorialId(String tutorialId) {
            this.tutorialId = tutorialId;
            return this;
        }

        public Builder pageNumber(int pageNumber) {
            this.pageNumber = pageNumber;
            return this;
        }

        public Builder x(double x) {
            this.x = x;
            return this;
        }

        public Builder y(double y) {
            this.y = y;
            return this;
        }

        public Builder width(double width) {
            this.width = width;
            return this;
        }

        public Builder height(double height) {
            this.height = height;
            return this;
        }

        public Builder content(String content) {
            this.content = content;
            return this;
        }

        public Builder type(String type) {
            this.type = type;
            return this;
        }

        public Builder strokeData(String strokeData) {
            this.strokeData = strokeData;
            return this;
        }

        public Builder color(String color) {
            this.color = color;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Annotation build() {
            return new Annotation(id, tutorialId, pageNumber, x, y, width, height,
                    content, type, strokeData, color, createdAt);
        }
    }
}
