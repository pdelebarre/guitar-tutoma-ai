package com.guitartutorial.controller;

import com.guitartutorial.dto.UserPreferenceDto;
import com.guitartutorial.service.UserPreferenceService;
import com.guitartutorial.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/user/preferences")
public class UserPreferenceController {

    private final UserPreferenceService userPreferenceService;
    private final UserService userService;

    public UserPreferenceController(UserPreferenceService userPreferenceService, UserService userService) {
        this.userPreferenceService = userPreferenceService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<?> getPreferences(@RequestHeader("Authorization") String authHeader) {
        var userIdOpt = resolveUserId(authHeader);
        if (userIdOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        return ResponseEntity.ok(userPreferenceService.get(userIdOpt.get()));
    }

    @PutMapping
    public ResponseEntity<?> updatePreferences(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody UserPreferenceDto dto) {
        var userIdOpt = resolveUserId(authHeader);
        if (userIdOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        return ResponseEntity.ok(userPreferenceService.upsert(userIdOpt.get(), dto));
    }

    private java.util.Optional<Long> resolveUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return java.util.Optional.empty();
        }
        return userService.validateToken(authHeader.substring(7));
    }
}
