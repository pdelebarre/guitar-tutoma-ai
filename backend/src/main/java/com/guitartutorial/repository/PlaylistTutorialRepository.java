package com.guitartutorial.repository;

import com.guitartutorial.entity.PlaylistTutorial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlaylistTutorialRepository extends JpaRepository<PlaylistTutorial, Long> {

    List<PlaylistTutorial> findByPlaylistIdOrderByOrdinalPositionAsc(Long playlistId);
}
