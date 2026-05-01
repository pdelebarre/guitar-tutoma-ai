package com.guitartutorial.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;

import java.time.LocalDateTime;

/**
 * Stores structured metadata extracted from a PDF tutorial via Mistral/Ollama.
 * Each tutorial directory can have at most one metadata record, keyed by tutorialId.
 */
@Entity
public class TutorialMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Matches the tutorial directory name (e.g. "bestofyou"). */
    @Column(nullable = false, unique = true)
    private String tutorialId;

    /** The song title extracted by the LLM. */
    private String title;

    /** Guitar tuning (e.g. "Standard", "Drop D", "Open G"). */
    private String tuning;

    /** Musical key (e.g. "C major", "A minor"). */
    private String musicalKey;

    /** Difficulty level (e.g. "Beginner", "Intermediate", "Advanced"). */
    private String difficulty;

    /** Comma-separated techniques (e.g. "fingerpicking, bends, barre chords"). */
    @Column(length = 1000)
    private String techniques;

    /** Genre or style (e.g. "Rock", "Blues", "Folk"). */
    private String genre;

    /** The raw JSON response from the LLM for debugging. */
    @Lob
    @Column(columnDefinition = "TEXT")
    private String rawLlmResponse;

    /** When this metadata was extracted. */
    private LocalDateTime extractedAt;

    /** Whether the metadata has been indexed into ChromaDB. */
    private boolean indexedInChroma = false;

    public TutorialMetadata() {
    }

    public TutorialMetadata(Long id, String tutorialId, String title, String tuning, String musicalKey,
                            String difficulty, String techniques, String genre, String rawLlmResponse,
                            LocalDateTime extractedAt, boolean indexedInChroma) {
        this.id = id;
        this.tutorialId = tutorialId;
        this.title = title;
        this.tuning = tuning;
        this.musicalKey = musicalKey;
        this.difficulty = difficulty;
        this.techniques = techniques;
        this.genre = genre;
        this.rawLlmResponse = rawLlmResponse;
        this.extractedAt = extractedAt;
        this.indexedInChroma = indexedInChroma;
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTuning() {
        return tuning;
    }

    public void setTuning(String tuning) {
        this.tuning = tuning;
    }

    public String getMusicalKey() {
        return musicalKey;
    }

    public void setMusicalKey(String musicalKey) {
        this.musicalKey = musicalKey;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getTechniques() {
        return techniques;
    }

    public void setTechniques(String techniques) {
        this.techniques = techniques;
    }

    public String getGenre() {
        return genre;
    }

    public void setGenre(String genre) {
        this.genre = genre;
    }

    public String getRawLlmResponse() {
        return rawLlmResponse;
    }

    public void setRawLlmResponse(String rawLlmResponse) {
        this.rawLlmResponse = rawLlmResponse;
    }

    public LocalDateTime getExtractedAt() {
        return extractedAt;
    }

    public void setExtractedAt(LocalDateTime extractedAt) {
        this.extractedAt = extractedAt;
    }

    public boolean isIndexedInChroma() {
        return indexedInChroma;
    }

    public void setIndexedInChroma(boolean indexedInChroma) {
        this.indexedInChroma = indexedInChroma;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String tutorialId;
        private String title;
        private String tuning;
        private String musicalKey;
        private String difficulty;
        private String techniques;
        private String genre;
        private String rawLlmResponse;
        private LocalDateTime extractedAt;
        private boolean indexedInChroma = false;

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

        public Builder title(String title) {
            this.title = title;
            return this;
        }

        public Builder tuning(String tuning) {
            this.tuning = tuning;
            return this;
        }

        public Builder musicalKey(String musicalKey) {
            this.musicalKey = musicalKey;
            return this;
        }

        public Builder difficulty(String difficulty) {
            this.difficulty = difficulty;
            return this;
        }

        public Builder techniques(String techniques) {
            this.techniques = techniques;
            return this;
        }

        public Builder genre(String genre) {
            this.genre = genre;
            return this;
        }

        public Builder rawLlmResponse(String rawLlmResponse) {
            this.rawLlmResponse = rawLlmResponse;
            return this;
        }

        public Builder extractedAt(LocalDateTime extractedAt) {
            this.extractedAt = extractedAt;
            return this;
        }

        public Builder indexedInChroma(boolean indexedInChroma) {
            this.indexedInChroma = indexedInChroma;
            return this;
        }

        public TutorialMetadata build() {
            return new TutorialMetadata(id, tutorialId, title, tuning, musicalKey,
                    difficulty, techniques, genre, rawLlmResponse, extractedAt, indexedInChroma);
        }
    }
}
