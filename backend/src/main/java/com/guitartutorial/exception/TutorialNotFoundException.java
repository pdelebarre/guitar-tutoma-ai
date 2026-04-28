package com.guitartutorial.exception;

public class TutorialNotFoundException extends RuntimeException {

    private final String tutorialId;

    public TutorialNotFoundException(String tutorialId) {
        super("Tutorial not found: " + tutorialId);
        this.tutorialId = tutorialId;
    }

    public String getTutorialId() {
        return tutorialId;
    }
}
