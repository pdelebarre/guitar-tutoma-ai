package com.guitartutorial.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Playlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "playlist", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordinalPosition ASC")
    private List<PlaylistTutorial> tutorials = new ArrayList<>();

    public Playlist() {
    }

    public Playlist(Long id, String name, LocalDateTime createdAt, List<PlaylistTutorial> tutorials) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt;
        this.tutorials = tutorials;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<PlaylistTutorial> getTutorials() {
        return tutorials;
    }

    public void setTutorials(List<PlaylistTutorial> tutorials) {
        this.tutorials = tutorials;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String name;
        private LocalDateTime createdAt;
        private List<PlaylistTutorial> tutorials = new ArrayList<>();

        Builder() {
        }

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder tutorials(List<PlaylistTutorial> tutorials) {
            this.tutorials = tutorials;
            return this;
        }

        public Playlist build() {
            return new Playlist(id, name, createdAt, tutorials);
        }
    }
}
