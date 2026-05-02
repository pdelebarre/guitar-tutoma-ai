package com.guitartutorial.exception;

public class SubtitleGenerationFailedException extends RuntimeException {
    public SubtitleGenerationFailedException(String tutorialId) {
        super("Subtitle generation has permanently failed for tutorial: " + tutorialId);
    }
}
