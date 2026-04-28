package com.guitartutorial.dto;

public record CreateAnnotationRequest(
    int pageNumber,
    double x,
    double y,
    double width,
    double height,
    String content,
    String type,
    String strokeData,
    String color
) {}
