package com.guitartutorial.service;

import com.guitartutorial.dto.AuthResponse;
import com.guitartutorial.dto.LoginRequest;
import com.guitartutorial.dto.RegisterRequest;
import com.guitartutorial.dto.UserDto;
import com.guitartutorial.entity.User;
import com.guitartutorial.exception.ValidationException;
import com.guitartutorial.repository.UserRepository;
import com.guitartutorial.security.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
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

        String encodedPassword = passwordEncoder.encode(request.password());

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .passwordHash(encodedPassword)
                .displayName(request.displayName() != null && !request.displayName().isBlank()
                        ? request.displayName() : request.username())
                .createdAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(user);
        log.info("User registered: {}", saved.getUsername());

        String token = jwtTokenProvider.generateToken(saved.getId(), saved.getUsername());

        return new AuthResponse(
                saved.getId(),
                saved.getUsername(),
                saved.getDisplayName(),
                token
        );
    }

    /**
     * Authenticate a user.
     */
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new ValidationException("Invalid username or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ValidationException("Invalid username or password");
        }

        log.info("User logged in: {}", user.getUsername());

        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername());

        return new AuthResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                token
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
