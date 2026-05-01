package com.guitartutorial.service;

import com.guitartutorial.dto.AuthResponse;
import com.guitartutorial.dto.LoginRequest;
import com.guitartutorial.dto.RegisterRequest;
import com.guitartutorial.dto.UserDto;
import com.guitartutorial.entity.User;
import com.guitartutorial.exception.ValidationException;
import com.guitartutorial.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Register a new user.
     */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new ValidationException("Username already taken: " + request.username());
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new ValidationException("Email already in use: " + request.email());
        }

        String salt = generateSalt();
        String passwordHash = hashPassword(request.password(), salt);

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .passwordHash(passwordHash + ":" + salt)
                .displayName(request.displayName() != null && !request.displayName().isBlank()
                        ? request.displayName() : request.username())
                .createdAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(user);
        log.info("User registered: {}", saved.getUsername());

        return new AuthResponse(
                saved.getId(),
                saved.getUsername(),
                saved.getDisplayName(),
                generateToken(saved)
        );
    }

    /**
     * Authenticate a user.
     */
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new ValidationException("Invalid username or password"));

        String[] parts = user.getPasswordHash().split(":", 2);
        if (parts.length != 2) {
            throw new ValidationException("Invalid password format for user: " + request.username());
        }
        String storedHash = parts[0];
        String salt = parts[1];

        String computedHash = hashPassword(request.password(), salt);
        if (!MessageDigest.isEqual(storedHash.getBytes(StandardCharsets.UTF_8),
                computedHash.getBytes(StandardCharsets.UTF_8))) {
            throw new ValidationException("Invalid username or password");
        }

        log.info("User logged in: {}", user.getUsername());
        return new AuthResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                generateToken(user)
        );
    }

    /**
     * Get user by ID.
     */
    public Optional<UserDto> getUserById(Long userId) {
        return userRepository.findById(userId).map(this::toDto);
    }

    /**
     * Get user by username.
     */
    public Optional<UserDto> getUserByUsername(String username) {
        return userRepository.findByUsername(username).map(this::toDto);
    }

    /**
     * Validate a token and return the user ID.
     * Simple token format: base64("userId:username:timestamp")
     */
    public Optional<Long> validateToken(String token) {
        try {
            String decoded = new String(Base64.getDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = decoded.split(":", 3);
            if (parts.length != 3) {
                return Optional.empty();
            }
            long userId = Long.parseLong(parts[0]);
            String username = parts[1];
            long timestamp = Long.parseLong(parts[2]);

            // Token expires after 30 days
            long now = System.currentTimeMillis();
            if (now - timestamp > 30L * 24 * 60 * 60 * 1000) {
                return Optional.empty();
            }

            // Verify user still exists
            if (userRepository.existsById(userId) && userRepository.findByUsername(username).isPresent()) {
                return Optional.of(userId);
            }
            return Optional.empty();
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private String generateToken(User user) {
        String raw = user.getId() + ":" + user.getUsername() + ":" + System.currentTimeMillis();
        return Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private String generateSalt() {
        SecureRandom random = new SecureRandom();
        byte[] salt = new byte[16];
        random.nextBytes(salt);
        return HexFormat.of().formatHex(salt);
    }

    private String hashPassword(String password, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt.getBytes(StandardCharsets.UTF_8));
            byte[] hash = md.digest(password.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName(),
                user.getCreatedAt()
        );
    }
}
