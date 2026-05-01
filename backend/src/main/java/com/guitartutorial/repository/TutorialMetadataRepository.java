package com.guitartutorial.repository;

import com.guitartutorial.entity.TutorialMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TutorialMetadataRepository extends JpaRepository<TutorialMetadata, Long> {

    Optional<TutorialMetadata> findByTutorialId(String tutorialId);

    boolean existsByTutorialId(String tutorialId);
}
