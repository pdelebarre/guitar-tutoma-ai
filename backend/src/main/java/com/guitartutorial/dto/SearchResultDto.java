package com.guitartutorial.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO for search results combining ChromaDB vector search relevance
 * with PostgreSQL metadata.
 */
public record SearchResultDto(
    String tutorialId,
    String title,
    String name,
    String tuning,
    String musicalKey,
    String difficulty,
    String techniques,
    String genre,
    boolean hasSubtitle,
    boolean hasTablature,
    double relevanceScore,
    List<String> matchedChunks
) {
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String tutorialId;
        private String title;
        private String name;
        private String tuning;
        private String musicalKey;
        private String difficulty;
        private String techniques;
        private String genre;
        private boolean hasSubtitle;
        private boolean hasTablature;
        private double relevanceScore;
        private List<String> matchedChunks = new ArrayList<>();

        public Builder tutorialId(String tutorialId) { this.tutorialId = tutorialId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder tuning(String tuning) { this.tuning = tuning; return this; }
        public Builder musicalKey(String musicalKey) { this.musicalKey = musicalKey; return this; }
        public Builder difficulty(String difficulty) { this.difficulty = difficulty; return this; }
        public Builder techniques(String techniques) { this.techniques = techniques; return this; }
        public Builder genre(String genre) { this.genre = genre; return this; }
        public Builder hasSubtitle(boolean hasSubtitle) { this.hasSubtitle = hasSubtitle; return this; }
        public Builder hasTablature(boolean hasTablature) { this.hasTablature = hasTablature; return this; }
        public Builder relevanceScore(double relevanceScore) { this.relevanceScore = relevanceScore; return this; }
        public Builder matchedChunks(List<String> matchedChunks) { this.matchedChunks = matchedChunks; return this; }

        public SearchResultDto build() {
            return new SearchResultDto(
                tutorialId, title, name, tuning, musicalKey,
                difficulty, techniques, genre, hasSubtitle, hasTablature,
                relevanceScore, matchedChunks
            );
        }
    }
}
