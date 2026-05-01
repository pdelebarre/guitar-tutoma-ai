package com.guitartutorial.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class PlaylistTutorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id", nullable = false)
    private Playlist playlist;

    @Column(nullable = false)
    private String tutorialId;

    @Column(nullable = false)
    private int ordinalPosition;

    public PlaylistTutorial() {
    }

    public PlaylistTutorial(Long id, Playlist playlist, String tutorialId, int ordinalPosition) {
        this.id = id;
        this.playlist = playlist;
        this.tutorialId = tutorialId;
        this.ordinalPosition = ordinalPosition;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Playlist getPlaylist() {
        return playlist;
    }

    public void setPlaylist(Playlist playlist) {
        this.playlist = playlist;
    }

    public String getTutorialId() {
        return tutorialId;
    }

    public void setTutorialId(String tutorialId) {
        this.tutorialId = tutorialId;
    }

    public int getOrdinalPosition() {
        return ordinalPosition;
    }

    public void setOrdinalPosition(int ordinalPosition) {
        this.ordinalPosition = ordinalPosition;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private Playlist playlist;
        private String tutorialId;
        private int ordinalPosition;

        Builder() {
        }

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder playlist(Playlist playlist) {
            this.playlist = playlist;
            return this;
        }

        public Builder tutorialId(String tutorialId) {
            this.tutorialId = tutorialId;
            return this;
        }

        public Builder ordinalPosition(int ordinalPosition) {
            this.ordinalPosition = ordinalPosition;
            return this;
        }

        public PlaylistTutorial build() {
            return new PlaylistTutorial(id, playlist, tutorialId, ordinalPosition);
        }
    }
}
