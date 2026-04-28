package com.guitartutorial.dto;

public record TutorialInfo(
    String id,
    String name,
    String videoFilename,
    boolean hasSubtitle,
    boolean hasTablature
) {}
