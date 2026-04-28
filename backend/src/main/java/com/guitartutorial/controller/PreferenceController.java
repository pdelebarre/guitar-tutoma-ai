package com.guitartutorial.controller;

import com.guitartutorial.dto.PreferenceDto;
import com.guitartutorial.service.PreferenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tutorials/{tutorialId}/preferences")
public class PreferenceController {

    private final PreferenceService preferenceService;

    public PreferenceController(PreferenceService preferenceService) {
        this.preferenceService = preferenceService;
    }

    @GetMapping
    public ResponseEntity<PreferenceDto> getPreferences(@PathVariable String tutorialId) {
        PreferenceDto preference = preferenceService.get(tutorialId);
        return ResponseEntity.ok(preference);
    }

    @PutMapping
    public ResponseEntity<PreferenceDto> upsertPreferences(
            @PathVariable String tutorialId,
            @RequestBody PreferenceDto dto) {
        PreferenceDto updated = preferenceService.upsert(tutorialId, dto);
        return ResponseEntity.ok(updated);
    }
}
