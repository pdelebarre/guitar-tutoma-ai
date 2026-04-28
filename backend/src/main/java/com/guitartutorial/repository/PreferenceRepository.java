package com.guitartutorial.repository;

import com.guitartutorial.entity.Preference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PreferenceRepository extends JpaRepository<Preference, Long> {

    Optional<Preference> findByTutorialId(String tutorialId);
}
