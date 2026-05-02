# Backend Security Architecture Rewrite

## 1. Overview

The Guitar Tutorial Manager currently uses a **custom, insecure authentication system**:
- **SHA-256 password hashing** (should be BCrypt/Argon2)
- **Unsigned Base64-encoded tokens** (should be signed JWTs)
- **No Spring Security framework**
- **No authentication on most API endpoints** (only [`AuthController`](../backend/src/main/java/com/guitartutorial/controller/AuthController.java), [`TutorialUploadController`](../backend/src/main/java/com/guitartutorial/controller/TutorialUploadController.java), and [`UserPreferenceController`](../backend/src/main/java/com/guitartutorial/controller/UserPreferenceController.java) manually parse the `Authorization` header)

This document describes a complete rewrite to a **Spring Security + JWT + BCrypt** architecture.

### Goals

| Goal | Current State | Target State |
|------|--------------|--------------|
| Password hashing | SHA-256 with salt stored alongside hash | [`BCryptPasswordEncoder`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html) |
| Token format | Unsigned Base64 (`userId:username:timestamp`) | Signed HMAC-SHA256 JWT |
| Auth framework | Manual header parsing in each controller | [`SecurityFilterChain`](https://docs.spring.io/spring-security/reference/servlet/configuration/java.html) with [`OncePerRequestFilter`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/web/authentication/AbstractAuthenticationProcessingFilter.html) |
| Endpoint security | Ad-hoc, inconsistent | Declarative via [`SecurityFilterChain`](https://docs.spring.io/spring-security/reference/servlet/configuration/java.html) |
| User context | Manual token decode in controllers | [`Authentication`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/core/Authentication.html) principal + custom [`@CurrentUserId`](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html) annotation |

---

## 2. Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HTTP Request                                │
│                    Authorization: Bearer <JWT>                      │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  SecurityConfig (SecurityFilterChain)                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 1. CorsFilter (allow frontend origins)                        │  │
│  │ 2. CsrfFilter (DISABLED for stateless REST API)               │  │
│  │ 3. JwtAuthenticationFilter (extends OncePerRequestFilter)     │  │
│  │    ├─ Extracts token from "Bearer " header                    │  │
│  │    ├─ Validates signature via JwtTokenProvider                 │  │
│  │    ├─ Creates UsernamePasswordAuthenticationToken              │  │
│  │    └─ Sets SecurityContextHolder                               │  │
│  │ 4. ExceptionTranslationFilter (401 handling)                  │  │
│  │ 5. AuthorizationFilter (path-based rules)                     │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Controller Layer                                                    │
│                                                                      │
│  Public endpoints (no auth required):                                │
│    POST /api/auth/register, POST /api/auth/login                     │
│    GET  /api/tutorials, GET /api/tutorials/{id}, ...                 │
│    GET  /api/tutorials/{id}/video, /subtitle, /tablature             │
│    GET  /api/tutorials/{id}/comments, /annotations, /preferences     │
│    GET  /api/tutorials/search, /search/health, /{id}/metadata        │
│    GET  /api/playlists, /api/playlists/{id}                          │
│                                                                      │
│  Authenticated endpoints (auth required):                            │
│    GET  /api/auth/me                                                 │
│    POST /api/tutorials/create, /{id}/upload-files, /{id}/pdf         │
│    POST/PUT/DELETE /api/tutorials/{id}/comments, /annotations        │
│    PUT  /api/tutorials/{id}/preferences                              │
│    POST/PUT/DELETE /api/playlists/**                                 │
│    GET/PUT /api/user/preferences                                     │
└──────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Service Layer                                                       │
│                                                                      │
│  UserService (updated):                                              │
│    - Uses BCryptPasswordEncoder for hashing/verification             │
│    - Delegates token creation to JwtTokenProvider                    │
│    - Removes validateToken() method                                  │
│                                                                      │
│  JwtTokenProvider (NEW):                                             │
│    - Generates signed JWTs on login/register                         │
│    - Validates JWT signature and expiration                          │
│    - Extracts userId from token claims                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. List of All New/Modified Files

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | [`backend/src/main/java/com/guitartutorial/config/SecurityConfig.java`](../backend/src/main/java/com/guitartutorial/config/SecurityConfig.java) | Spring Security configuration — [`SecurityFilterChain`](https://docs.spring.io/spring-security/reference/servlet/configuration/java.html) bean, CORS, CSRF, session management, endpoint rules |
| 2 | [`backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java`](../backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java) | JWT generation and validation using HMAC-SHA256 |
| 3 | [`backend/src/main/java/com/guitartutorial/security/JwtAuthenticationFilter.java`](../backend/src/main/java/com/guitartutorial/security/JwtAuthenticationFilter.java) | [`OncePerRequestFilter`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/web/authentication/AbstractAuthenticationProcessingFilter.html) that extracts JWT from `Authorization: Bearer` header and sets [`SecurityContextHolder`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/core/context/SecurityContextHolder.html) |
| 4 | [`backend/src/main/java/com/guitartutorial/security/CurrentUserId.java`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) | Custom annotation for injecting current user ID into controller methods |
| 5 | [`backend/src/main/java/com/guitartutorial/security/CurrentUserIdResolver.java`](../backend/src/main/java/com/guitartutorial/security/CurrentUserIdResolver.java) | [`HandlerMethodArgumentResolver`](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/method/support/HandlerMethodArgumentResolver.html) implementation for [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) |

### Modified Files

| # | File | Changes |
|---|------|---------|
| 6 | [`backend/pom.xml`](../backend/pom.xml) | Add `spring-boot-starter-security` and `jjwt` dependencies |
| 7 | [`backend/src/main/java/com/guitartutorial/service/UserService.java`](../backend/src/main/java/com/guitartutorial/service/UserService.java) | Replace SHA-256 with [`BCryptPasswordEncoder`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html); delegate token creation to [`JwtTokenProvider`](../backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java); remove `validateToken()`, `generateSalt()`, `hashPassword()`, `generateToken()` |
| 8 | [`backend/src/main/java/com/guitartutorial/controller/AuthController.java`](../backend/src/main/java/com/guitartutorial/controller/AuthController.java) | Remove manual token parsing in `/me`; use [`Authentication`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/core/Authentication.html) principal or [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) |
| 9 | [`backend/src/main/java/com/guitartutorial/controller/TutorialUploadController.java`](../backend/src/main/java/com/guitartutorial/controller/TutorialUploadController.java) | Remove manual `resolveUserId()`; use [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java); remove [`UserService`](../backend/src/main/java/com/guitartutorial/service/UserService.java) dependency |
| 10 | [`backend/src/main/java/com/guitartutorial/controller/CommentController.java`](../backend/src/main/java/com/guitartutorial/controller/CommentController.java) | Add [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) to POST/PUT/DELETE methods |
| 11 | [`backend/src/main/java/com/guitartutorial/controller/AnnotationController.java`](../backend/src/main/java/com/guitartutorial/controller/AnnotationController.java) | Add [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) to POST/PUT/DELETE methods |
| 12 | [`backend/src/main/java/com/guitartutorial/controller/PlaylistController.java`](../backend/src/main/java/com/guitartutorial/controller/PlaylistController.java) | Add [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) to all methods |
| 13 | [`backend/src/main/java/com/guitartutorial/controller/PreferenceController.java`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) | Add [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) to PUT method |
| 14 | [`backend/src/main/java/com/guitartutorial/controller/PdfController.java`](../backend/src/main/java/com/guitartutorial/controller/PdfController.java) | Add [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) to POST (upload) method |
| 15 | [`backend/src/main/java/com/guitartutorial/controller/UserPreferenceController.java`](../backend/src/main/java/com/guitartutorial/controller/UserPreferenceController.java) | Remove manual `resolveUserId()`; use [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java); remove [`UserService`](../backend/src/main/java/com/guitartutorial/service/UserService.java) dependency |
| 16 | [`backend/src/main/resources/application.yml`](../backend/src/main/resources/application.yml) | Add `jwt.secret` and `jwt.expiration` configuration properties |
| 17 | [`backend/src/main/java/com/guitartutorial/entity/User.java`](../backend/src/main/java/com/guitartutorial/entity/User.java) | Change `passwordHash` field to store only BCrypt hash (no longer `hash:salt` format) |

---

## 4. Detailed Design for Each Component

### 4.1 [`SecurityConfig`](../backend/src/main/java/com/guitartutorial/config/SecurityConfig.java)

**Package:** `com.guitartutorial.config`

**Responsibilities:**
- Define the [`SecurityFilterChain`](https://docs.spring.io/spring-security/reference/servlet/configuration/java.html) bean
- Configure CORS (allow frontend origins from `application.yml`)
- Disable CSRF (stateless REST API — document the rationale)
- Set session management to `SessionCreationPolicy.STATELESS`
- Register [`JwtAuthenticationFilter`](../backend/src/main/java/com/guitartutorial/security/JwtAuthenticationFilter.java) before [`UsernamePasswordAuthenticationFilter`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/web/authentication/UsernamePasswordAuthenticationFilter.html)
- Define endpoint authorization rules (see section 4.5)

**Key Design Decisions:**

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(csrf -> csrf.disable())  // Stateless REST API — no CSRF needed
        .sessionManagement(sm -> sm.sessionCreationPolicy(STATELESS))
        .authorizeHttpRequests(auth -> auth
            // Public endpoints
            .requestMatchers(POST, "/api/auth/register").permitAll()
            .requestMatchers(POST, "/api/auth/login").permitAll()
            .requestMatchers(GET, "/api/tutorials/**").permitAll()
            .requestMatchers(GET, "/api/playlists/**").permitAll()
            .requestMatchers(GET, "/api/tutorials/search/**").permitAll()
            // Authenticated endpoints
            .requestMatchers("/api/auth/me").authenticated()
            .requestMatchers(POST, "/api/tutorials/**").authenticated()
            .requestMatchers(PUT, "/api/tutorials/**").authenticated()
            .requestMatchers(DELETE, "/api/tutorials/**").authenticated()
            .requestMatchers("/api/playlists/**").authenticated()
            .requestMatchers("/api/user/**").authenticated()
            .anyRequest().authenticated()
        )
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
}
```

**CSRF Rationale:** REST APIs using token-based auth (JWT) are immune to CSRF because the browser does not automatically attach the `Authorization` header on cross-origin requests. CSRF protection is only needed when session cookies are used for authentication.

**CORS Configuration:**
- Allow origins: read from `app.cors.allowed-origins` property (default: `http://localhost:5173`)
- Allow methods: `GET, POST, PUT, DELETE, OPTIONS`
- Allow headers: `Authorization, Content-Type`
- Allow credentials: `true`

### 4.2 [`JwtTokenProvider`](../backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java)

**Package:** `com.guitartutorial.security`

**Responsibilities:**
- Generate signed JWTs on successful login/registration
- Validate JWT signature and expiration
- Extract user ID from JWT claims

**Algorithm:** HMAC-SHA256 (`SignatureAlgorithm.HS256`)

**Dependencies:**
- [`io.jsonwebtoken:jjwt-api`](https://github.com/jwtk/jjwt) (0.12.x)
- [`io.jsonwebtoken:jjwt-impl`](https://github.com/jwtk/jjwt) (runtime)
- [`io.jsonwebtoken:jjwt-jackson`](https://github.com/jwtk/jjwt) (runtime)

**Configuration Properties** (in [`application.yml`](../backend/src/main/resources/application.yml)):

```yaml
jwt:
  secret: ${JWT_SECRET:}  # MUST be set via environment variable in production
  expiration: 2592000000   # 30 days in milliseconds (same as current token expiry)
```

**Methods:**

```java
public String generateToken(Long userId, String username)
// Creates JWT with:
//   - Subject: userId.toString()
//   - Claim "username": username
//   - Issued-at: now
//   - Expiration: now + jwt.expiration
//   - Signed with HMAC-SHA256 using jwt.secret

public Optional<Long> getUserIdFromToken(String token)
// Parses token, validates signature and expiration
// Returns userId from subject claim if valid, empty otherwise

public boolean validateToken(String token)
// Returns true if token is valid (signature + expiration)
```

**Secret Key Handling:**
- The `jwt.secret` must be at least 256 bits (32 characters) for HMAC-SHA256
- In development, a default can be generated but a warning must be logged
- In production, `JWT_SECRET` environment variable **must** be set
- The secret is Base64-decoded before use (supporting binary keys)

### 4.3 [`JwtAuthenticationFilter`](../backend/src/main/java/com/guitartutorial/security/JwtAuthenticationFilter.java)

**Package:** `com.guitartutorial.security`

**Responsibilities:**
- Extend [`OncePerRequestFilter`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/web/authentication/AbstractAuthenticationProcessingFilter.html) to ensure single execution per request
- Extract JWT from `Authorization: Bearer <token>` header
- Validate token via [`JwtTokenProvider`](../backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java)
- Create [`UsernamePasswordAuthenticationToken`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/authentication/UsernamePasswordAuthenticationToken.html) and set it in [`SecurityContextHolder`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/core/context/SecurityContextHolder.html)
- Skip filter for public endpoints (optional optimization)

**Flow:**

```
doFilterInternal(request, response, filterChain):
  1. Extract "Authorization" header
  2. If header is null or doesn't start with "Bearer " → continue chain (let SecurityConfig handle rejection)
  3. Extract token (substring after "Bearer ")
  4. Call jwtTokenProvider.getUserIdFromToken(token)
  5. If valid:
     a. Create UsernamePasswordAuthenticationToken(userId, null, authorities)
     b. Set details (e.g., request remote address)
     c. Set SecurityContextHolder.getContext().setAuthentication(auth)
  6. If invalid: SecurityContextHolder.clearContext()
  7. filterChain.doFilter(request, response)
```

**Important:** The filter should NOT throw exceptions or return error responses. It should simply set or clear the [`SecurityContextHolder`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/core/context/SecurityContextHolder.html). The [`SecurityFilterChain`](https://docs.spring.io/spring-security/reference/servlet/configuration/java.html) authorization rules will handle 401 responses for protected endpoints.

### 4.4 [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) Annotation & Resolver

**Package:** `com.guitartutorial.security`

**Annotation Definition:**

```java
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUserId {}
```

**Resolver Implementation:**

```java
public class CurrentUserIdResolver implements HandlerMethodArgumentResolver {
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUserId.class)
            && parameter.getParameterType().equals(Long.class);
    }

    @Override
    public Object resolveArgument(...) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return Long.valueOf(auth.getName());  // userId stored as principal name
    }
}
```

**Registration:** The [`SecurityConfig`](../backend/src/main/java/com/guitartutorial/config/SecurityConfig.java) should also implement [`WebMvcConfigurer`](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/config/annotation/WebMvcConfigurer.html) to register the resolver, OR a separate [`@Configuration`](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/context/annotation/Configuration.html) class can be created.

### 4.5 Updated [`UserService`](../backend/src/main/java/com/guitartutorial/service/UserService.java)

**Changes:**

| Method | Current | New |
|--------|---------|-----|
| `register()` | SHA-256 hash, stores `hash:salt`, generates Base64 token | Uses [`BCryptPasswordEncoder.encode()`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html), stores BCrypt hash, delegates token to [`JwtTokenProvider.generateToken()`](../backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java) |
| `login()` | Splits stored `hash:salt`, computes SHA-256, compares | Uses [`BCryptPasswordEncoder.matches()`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html) |
| `validateToken()` | Decodes Base64, parses `userId:username:timestamp`, checks 30-day expiry | **REMOVED** — replaced by [`JwtTokenProvider`](../backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java) |
| `generateToken()` | Base64 encodes `userId:username:timestamp` | **REMOVED** — replaced by [`JwtTokenProvider`](../backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java) |
| `generateSalt()` | `SecureRandom` hex salt | **REMOVED** — BCrypt handles salting internally |
| `hashPassword()` | SHA-256 with salt | **REMOVED** — BCrypt handles hashing |

**New Dependencies Injected:**
- [`BCryptPasswordEncoder`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html) (from Spring Security)
- [`JwtTokenProvider`](../backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java) (new)

**BCrypt Configuration:**
- Strength: 10 (default, good balance of security and performance)
- Bean defined in [`SecurityConfig`](../backend/src/main/java/com/guitartutorial/config/SecurityConfig.java):

```java
@Bean
public BCryptPasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

### 4.6 Endpoint Security Rules

| HTTP Method | Path | Auth Required | Notes |
|-------------|------|---------------|-------|
| `POST` | `/api/auth/register` | No | Public registration |
| `POST` | `/api/auth/login` | No | Public login |
| `GET` | `/api/auth/me` | **Yes** | Returns current user profile |
| `GET` | `/api/tutorials` | No | List all tutorials |
| `GET` | `/api/tutorials/{id}` | No | Get tutorial details |
| `GET` | `/api/tutorials/{id}/video` | No | Video streaming |
| `GET` | `/api/tutorials/{id}/subtitle` | No | Subtitle file |
| `GET` | `/api/tutorials/{id}/tablature` | No | Tablature PDF |
| `POST` | `/api/tutorials/create` | **Yes** | Create tutorial directory |
| `POST` | `/api/tutorials/{id}/upload-files` | **Yes** | Upload video/PDF |
| `POST` | `/api/tutorials/{id}/pdf` | **Yes** | Upload PDF for metadata extraction |
| `GET` | `/api/tutorials/{id}/metadata` | No | Get extracted metadata |
| `GET` | `/api/tutorials/search` | No | Semantic search |
| `GET` | `/api/tutorials/search/health` | No | ChromaDB health check |
| `GET` | `/api/tutorials/{id}/comments` | No | List comments |
| `POST` | `/api/tutorials/{id}/comments` | **Yes** | Create comment |
| `PUT` | `/api/tutorials/{id}/comments/{cid}` | **Yes** | Update comment |
| `DELETE` | `/api/tutorials/{id}/comments/{cid}` | **Yes** | Delete comment |
| `GET` | `/api/tutorials/{id}/annotations` | No | List annotations |
| `POST` | `/api/tutorials/{id}/annotations` | **Yes** | Create annotation |
| `PUT` | `/api/tutorials/{id}/annotations/{aid}` | **Yes** | Update annotation |
| `DELETE` | `/api/tutorials/{id}/annotations/{aid}` | **Yes** | Delete annotation |
| `GET` | `/api/tutorials/{id}/preferences` | No | Get preferences |
| `PUT` | `/api/tutorials/{id}/preferences` | **Yes** | Upsert preferences |
| `GET` | `/api/playlists` | No | List all playlists |
| `POST` | `/api/playlists` | **Yes** | Create playlist |
| `GET` | `/api/playlists/{id}` | No | Get playlist |
| `PUT` | `/api/playlists/{id}` | **Yes** | Update playlist name |
| `DELETE` | `/api/playlists/{id}` | **Yes** | Delete playlist |
| `POST` | `/api/playlists/{id}/tutorials` | **Yes** | Add tutorial to playlist |
| `PUT` | `/api/playlists/{id}/tutorials` | **Yes** | Reorder tutorials |
| `DELETE` | `/api/playlists/{id}/tutorials/{tid}` | **Yes** | Remove tutorial from playlist |
| `GET` | `/api/user/preferences` | **Yes** | Get user preferences |
| `PUT` | `/api/user/preferences` | **Yes** | Update user preferences |

### 4.7 Updated Controller Patterns

**Before (manual auth in each controller):**

```java
// TutorialUploadController.java
@PostMapping("/create")
public ResponseEntity<?> createTutorial(
        @RequestHeader("Authorization") String authHeader, ...) {
    var userIdOpt = resolveUserId(authHeader);
    if (userIdOpt.isEmpty()) {
        return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
    }
    // ... proceed
}

private Optional<Long> resolveUserId(String authHeader) {
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        return Optional.empty();
    }
    return userService.validateToken(authHeader.substring(7));
}
```

**After (Spring Security handles auth, controller just gets user ID):**

```java
// TutorialUploadController.java
@PostMapping("/create")
public ResponseEntity<?> createTutorial(
        @CurrentUserId Long userId,
        @RequestParam("tutorialId") String tutorialId, ...) {
    // userId is automatically resolved from JWT
    // If not authenticated, Spring Security rejects before reaching here
    // ... proceed
}
```

**Controllers that need the user ID for data ownership:**
- [`CommentController`](../backend/src/main/java/com/guitartutorial/controller/CommentController.java) — POST/PUT/DELETE need `userId` to associate comment with user
- [`AnnotationController`](../backend/src/main/java/com/guitartutorial/controller/AnnotationController.java) — POST/PUT/DELETE need `userId`
- [`PlaylistController`](../backend/src/main/java/com/guitartutorial/controller/PlaylistController.java) — All methods need `userId` for ownership
- [`PreferenceController`](../backend/src/main/java/com/guitartutorial/controller/PreferenceController.java) — PUT needs `userId`
- [`PdfController`](../backend/src/main/java/com/guitartutorial/controller/PdfController.java) — POST needs `userId` (for audit logging)
- [`UserPreferenceController`](../backend/src/main/java/com/guitartutorial/controller/UserPreferenceController.java) — Both methods need `userId`
- [`TutorialUploadController`](../backend/src/main/java/com/guitartutorial/controller/TutorialUploadController.java) — Both methods need `userId`

**Controllers that don't need user ID (auth is just for access control):**
- [`AuthController`](../backend/src/main/java/com/guitartutorial/controller/AuthController.java) — `/me` uses [`Authentication`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/core/Authentication.html) principal directly

---

## 5. Data Flow Diagrams

### 5.1 Registration Flow

```
Client                          Server
  │                                │
  │  POST /api/auth/register       │
  │  { username, email, password } │
  │ ─────────────────────────────> │
  │                                │
  │                    ┌───────────┴───────────┐
  │                    │ AuthController        │
  │                    │ (public endpoint)     │
  │                    └───────────┬───────────┘
  │                                │
  │                    ┌───────────┴───────────┐
  │                    │ UserService.register()│
  │                    │                       │
  │                    │ 1. Check duplicates   │
  │                    │ 2. BCrypt.hash()      │
  │                    │ 3. Save User entity   │
  │                    │ 4. JwtTokenProvider   │
  │                    │    .generateToken()   │
  │                    └───────────┬───────────┘
  │                                │
  │  { userId, username,           │
  │    displayName, token }        │
  │ <───────────────────────────── │
  │                                │
  │  Client stores token in        │
  │  localStorage["auth_token"]    │
  │                                │
```

### 5.2 Login Flow

```
Client                          Server
  │                                │
  │  POST /api/auth/login          │
  │  { username, password }        │
  │ ─────────────────────────────> │
  │                                │
  │                    ┌───────────┴───────────┐
  │                    │ AuthController        │
  │                    │ (public endpoint)     │
  │                    └───────────┬───────────┘
  │                                │
  │                    ┌───────────┴───────────┐
  │                    │ UserService.login()   │
  │                    │                       │
  │                    │ 1. Find user by uname │
  │                    │ 2. BCrypt.matches()   │
  │                    │ 3. JwtTokenProvider   │
  │                    │    .generateToken()   │
  │                    └───────────┬───────────┘
  │                                │
  │  { userId, username,           │
  │    displayName, token }        │
  │ <───────────────────────────── │
  │                                │
  │  Client stores token in        │
  │  localStorage["auth_token"]    │
  │                                │
```

### 5.3 Authenticated Request Flow

```
Client                          Server
  │                                │
  │  GET /api/auth/me              │
  │  Authorization: Bearer <JWT>   │
  │ ─────────────────────────────> │
  │                                │
  │                    ┌───────────┴───────────┐
  │                    │ SecurityFilterChain   │
  │                    │                       │
  │                    │ 1. CORS filter        │
  │                    │ 2. CSRF (disabled)    │
  │                    │ 3. JwtAuthFilter      │
  │                    │    ├─ Extract JWT     │
  │                    │    ├─ Validate via    │
  │                    │    │  JwtTokenProvider │
  │                    │    └─ Set SecurityCtx │
  │                    │ 4. AuthorizationFilter│
  │                    │    (requires auth)    │
  │                    └───────────┬───────────┘
  │                                │
  │                    ┌───────────┴───────────┐
  │                    │ AuthController        │
  │                    │ @GetMapping("/me")    │
  │                    │                       │
  │                    │ Authentication auth = │
  │                    │   SecurityContext     │
  │                    │ Long userId =         │
  │                    │   Long.valueOf(       │
  │                    │     auth.getName())   │
  │                    └───────────┬───────────┘
  │                                │
  │  { id, username, email,        │
  │    displayName, createdAt }    │
  │ <───────────────────────────── │
  │                                │
```

---

## 6. Migration Strategy

### Problem
Existing users have passwords stored as `SHA256hash:hexSalt` in the `password_hash` column. Existing clients have unsigned Base64 tokens stored in `localStorage`.

### Strategy: Dual Authentication During Transition

**Phase 1 — Backend Deployment (no downtime):**

1. Deploy the new code with Spring Security + JWT + BCrypt
2. The [`UserService.login()`](../backend/src/main/java/com/guitartutorial/service/UserService.java) method detects the password format:
   - If stored hash contains `:` (old format) → verify with SHA-256, then re-hash with BCrypt and save
   - If stored hash does not contain `:` (new BCrypt format) → verify with [`BCryptPasswordEncoder.matches()`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html)
3. All new registrations use BCrypt immediately
4. The [`JwtAuthenticationFilter`](../backend/src/main/java/com/guitartutorial/security/JwtAuthenticationFilter.java) accepts both old Base64 tokens AND new JWTs during transition

**Phase 2 — Token Migration (graceful):**

The [`JwtAuthenticationFilter`](../backend/src/main/java/com/guitartutorial/security/JwtAuthenticationFilter.java) can implement a dual-validation strategy:

```java
protected void doFilterInternal(...) {
    String token = extractToken(request);
    if (token == null) { chain.doFilter(request, response); return; }

    // Try JWT first
    Optional<Long> userId = jwtTokenProvider.getUserIdFromToken(token);
    if (userId.isPresent()) {
        setAuthentication(userId.get());
        chain.doFilter(request, response);
        return;
    }

    // Fall back to old Base64 token validation (temporary)
    userId = userService.validateToken(token);  // KEPT temporarily
    if (userId.isPresent()) {
        setAuthentication(userId.get());
        // Optionally: generate a new JWT and return it in response header
        // so the client can upgrade
    }

    chain.doFilter(request, response);
}
```

**Phase 3 — Client Update:**

1. The frontend [`api.ts`](../frontend/src/services/api.ts) already stores tokens in `localStorage` under `auth_token` and sends them as `Authorization: Bearer <token>`
2. After the backend is deployed, the client will receive new JWTs on next login/register
3. The old Base64 token will continue to work until it expires (30 days from issuance) or the user logs in again
4. **No frontend code changes are required** — the token storage and header format remain identical

**Phase 4 — Cleanup (after migration window):**

1. Remove the old `validateToken()` method from [`UserService`](../backend/src/main/java/com/guitartutorial/service/UserService.java)
2. Remove the Base64 fallback from [`JwtAuthenticationFilter`](../backend/src/main/java/com/guitartutorial/security/JwtAuthenticationFilter.java)
3. Remove the SHA-256 verification path from [`UserService.login()`](../backend/src/main/java/com/guitartutorial/service/UserService.java)

### Migration Timeline

| Phase | Duration | Action |
|-------|----------|--------|
| 1 | Day 1 | Deploy backend with Spring Security + JWT + BCrypt + dual token support |
| 2 | Day 1-30 | Old Base64 tokens expire naturally; users who log in get new JWTs |
| 3 | Day 1 | No frontend changes needed |
| 4 | Day 31+ | Remove legacy code after all tokens have expired |

---

## 7. Dependencies to Add

### [`pom.xml`](../backend/pom.xml) Changes

Add the following dependencies to [`backend/pom.xml`](../backend/pom.xml):

```xml
<!-- Spring Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- JJWT API -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>

<!-- JJWT Implementation (runtime) -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>

<!-- JJWT Jackson Serializer (runtime) -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

### [`application.yml`](../backend/src/main/resources/application.yml) Additions

```yaml
# JWT Configuration
jwt:
  secret: ${JWT_SECRET:}
  expiration: ${JWT_EXPIRATION:2592000000}

# CORS Configuration
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

---

## 8. Implementation Order

The following is the recommended order of implementation, designed to keep the application compilable and testable at each step:

| Step | Task | Files | Testable? |
|------|------|-------|-----------|
| 1 | Add dependencies to [`pom.xml`](../backend/pom.xml) and config to [`application.yml`](../backend/src/main/resources/application.yml) | [`pom.xml`](../backend/pom.xml), [`application.yml`](../backend/src/main/resources/application.yml) | Yes — `mvn compile` |
| 2 | Create [`JwtTokenProvider`](../backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java) | New file | Yes — unit test with known secret |
| 3 | Create [`SecurityConfig`](../backend/src/main/java/com/guitartutorial/config/SecurityConfig.java) with [`BCryptPasswordEncoder`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html) bean, CORS, CSRF, session management | New file | Yes — app starts, but all endpoints return 401 |
| 4 | Create [`JwtAuthenticationFilter`](../backend/src/main/java/com/guitartutorial/security/JwtAuthenticationFilter.java) | New file | Yes — authenticated requests work |
| 5 | Create [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) annotation and resolver | New files | Yes — inject into controllers |
| 6 | Update [`UserService`](../backend/src/main/java/com/guitartutorial/service/UserService.java) — replace SHA-256 with BCrypt, delegate tokens to [`JwtTokenProvider`](../backend/src/main/java/com/guitartutorial/security/JwtTokenProvider.java) | Modified file | Yes — login/register work |
| 7 | Update [`AuthController`](../backend/src/main/java/com/guitartutorial/controller/AuthController.java) — use [`Authentication`](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/core/Authentication.html) principal for `/me` | Modified file | Yes — `/me` works |
| 8 | Update [`UserPreferenceController`](../backend/src/main/java/com/guitartutorial/controller/UserPreferenceController.java) — use [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) | Modified file | Yes — preferences work |
| 9 | Update [`TutorialUploadController`](../backend/src/main/java/com/guitartutorial/controller/TutorialUploadController.java) — use [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) | Modified file | Yes — upload works |
| 10 | Update [`CommentController`](../backend/src/main/java/com/guitartutorial/controller/CommentController.java) — add [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) to write methods | Modified file | Yes — comments work |
| 11 | Update [`AnnotationController`](../backend/src/main/java/com/guitartutorial/controller/AnnotationController.java) — add [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) to write methods | Modified file | Yes — annotations work |
| 12 | Update [`PlaylistController`](../backend/src/main/java/com/guitartutorial/controller/PlaylistController.java) — add [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) to all methods | Modified file | Yes — playlists work |
| 13 | Update [`PreferenceController`](../backend/src/main/java/com/guitartutorial/controller/PreferenceController.java) — add [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) to PUT | Modified file | Yes — preferences work |
| 14 | Update [`PdfController`](../backend/src/main/java/com/guitartutorial/controller/PdfController.java) — add [`@CurrentUserId`](../backend/src/main/java/com/guitartutorial/security/CurrentUserId.java) to POST | Modified file | Yes — PDF upload works |
| 15 | Update [`User`](../backend/src/main/java/com/guitartutorial/entity/User.java) entity — simplify `passwordHash` field documentation | Modified file | Yes — existing users still work |
| 16 | End-to-end testing — verify all endpoint security rules | All | Manual + integration tests |

---

## 9. Security Considerations

1. **JWT Secret Key**: The `jwt.secret` must be at least 256 bits. In production, it **must** be set via the `JWT_SECRET` environment variable. Never hardcode or commit the secret.

2. **Token Expiry**: 30 days matches the current implementation. Consider shorter-lived tokens (e.g., 24h) with refresh tokens for production hardening.

3. **BCrypt Strength**: Strength 10 is the default and provides ~100ms hash time on modern hardware, which is sufficient. Increase to 12 if compute allows.

4. **Password Storage Migration**: The dual-format detection in [`UserService.login()`](../backend/src/main/java/com/guitartutorial/service/UserService.java) ensures zero-downtime migration. After all users have logged in post-deployment, old SHA-256 hashes are replaced with BCrypt.

5. **Rate Limiting**: Not in scope for this rewrite, but should be considered for login/register endpoints to prevent brute-force attacks.

6. **HTTPS**: Ensure all traffic uses HTTPS in production to prevent token interception.

7. **Audit Logging**: Consider adding audit logging for authentication events (login, register, failed attempts) using Spring Security's event publishing.