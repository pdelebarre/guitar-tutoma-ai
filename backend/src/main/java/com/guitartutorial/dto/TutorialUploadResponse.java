package com.guitartutorial.dto;

public record TutorialUploadResponse(
    String tutorialId,
    String displayName,
    boolean videoUploaded,
    boolean pdfUploaded,
    String videoFilename,
    String pdfFilename,
    String message
) {}
