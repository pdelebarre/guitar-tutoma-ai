package com.guitartutorial.controller;

import com.guitartutorial.dto.UserPreferenceDto;
import com.guitartutorial.security.CurrentUserId;
import com.guitartutorial.service.UserPreferenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/user/preferences")
public class UserPreferenceController {

    private final UserPreferenceService userPreferenceService;

    public UserPreferenceController(UserPreferenceService userPreferenceService) {
        this.userPreferenceService = userPreferenceService;
    }

    @GetMapping
    public ResponseEntity<?> getPreferences(@CurrentUserId Long userId) {
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        return ResponseEntity.ok(userPreferenceService.get(userId));
    }

    @PutMapping
    public ResponseEntity<?> updatePreferences(
            @CurrentUserId Long userId,
            @RequestBody UserPreferenceDto dto) {
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        return ResponseEntity.ok(userPreferenceService.upsert(userId, dto));
    }
}
