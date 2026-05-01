package com.guitartutorial.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * User-level preferences (not per-tutorial preferences).
 * Stores global user settings like theme, default difficulty filter, etc.
 */
@Entity
@Table(name = "user_preference")
public class UserPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "theme", length = 20)
    private String theme;

    @Column(name = "default_difficulty_filter", length = 20)
    private String defaultDifficultyFilter;

    @Column(name = "default_sort_direction", length = 10)
    private String defaultSortDirection;

    @Column(name = "items_per_page")
    private Integer itemsPerPage;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public UserPreference() {
    }

    public UserPreference(Long id, Long userId, String theme, String defaultDifficultyFilter,
                          String defaultSortDirection, Integer itemsPerPage, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.theme = theme;
        this.defaultDifficultyFilter = defaultDifficultyFilter;
        this.defaultSortDirection = defaultSortDirection;
        this.itemsPerPage = itemsPerPage;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public String getDefaultDifficultyFilter() {
        return defaultDifficultyFilter;
    }

    public void setDefaultDifficultyFilter(String defaultDifficultyFilter) {
        this.defaultDifficultyFilter = defaultDifficultyFilter;
    }

    public String getDefaultSortDirection() {
        return defaultSortDirection;
    }

    public void setDefaultSortDirection(String defaultSortDirection) {
        this.defaultSortDirection = defaultSortDirection;
    }

    public Integer getItemsPerPage() {
        return itemsPerPage;
    }

    public void setItemsPerPage(Integer itemsPerPage) {
        this.itemsPerPage = itemsPerPage;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private Long userId;
        private String theme;
        private String defaultDifficultyFilter;
        private String defaultSortDirection;
        private Integer itemsPerPage;
        private LocalDateTime updatedAt;

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder userId(Long userId) {
            this.userId = userId;
            return this;
        }

        public Builder theme(String theme) {
            this.theme = theme;
            return this;
        }

        public Builder defaultDifficultyFilter(String defaultDifficultyFilter) {
            this.defaultDifficultyFilter = defaultDifficultyFilter;
            return this;
        }

        public Builder defaultSortDirection(String defaultSortDirection) {
            this.defaultSortDirection = defaultSortDirection;
            return this;
        }

        public Builder itemsPerPage(Integer itemsPerPage) {
            this.itemsPerPage = itemsPerPage;
            return this;
        }

        public Builder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public UserPreference build() {
            return new UserPreference(id, userId, theme, defaultDifficultyFilter,
                    defaultSortDirection, itemsPerPage, updatedAt);
        }
    }
}
