package com.guitartutorial.repository;

import com.guitartutorial.entity.Annotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnotationRepository extends JpaRepository<Annotation, Long> {

    List<Annotation> findByTutorialId(String tutorialId);
}
