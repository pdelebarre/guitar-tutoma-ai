# Implementation Plan: Guitar Tutorial Manager

## Overview

This plan implements a full-stack guitar tutorial management application with a Spring Boot backend (Java, Lombok, H2/PostgreSQL) and a Vite React TypeScript frontend. Tasks are ordered to build foundational backend services first, then layer on frontend components, and finish with deployment configuration. Each task builds incrementally on previous work so there is no orphaned code.

## Tasks

- [x] 1. Initialize backend project and core configuration
  - [x] 1.1 Scaffold Spring Boot project with required dependencies
    - Initialize via Spring Initializr with: Spring Web, Spring Data JPA, H2 Database, PostgreSQL Driver, Spring Boot DevTools, Lombok
    - Add jqwik dependency for property-based testing
    - Create `application.yml` with `tutorials.directory` property defaulting to `${TUTORIALS_DIR:./tutorials}` and JPA settings (`ddl-auto: update`, `open-in-view: false`)
    - Create `application-local.yml` with H2 in-memory datasource and H2 console enabled
    - Create `application-prod.yml` with PostgreSQL datasource using environment variables for host, port, db name, user, password
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 1.2 Define JPA entities and repositories
    - Create `Comment` entity with fields: id, tutorialId, text (TEXT), createdAt, updatedAt; use Lombok `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`
    - Create `Annotation` entity with fields: id, tutorialId, pageNumber, x, y, width, height, content (TEXT), createdAt
    - Create `Preference` entity with fields: id, tutorialId (unique), difficultyLevel, favorite, updatedAt
    - Create `Playlist` entity with fields: id, name, createdAt, and `@OneToMany` to `PlaylistTutorial` with cascade ALL and orphan removal, ordered by ordinalPosition ASC
    - Create `PlaylistTutorial` entity with fields: id, playlist (`@ManyToOne` LAZY), tutorialId, ordinalPosition
    - Create Spring Data JPA repositories for each entity: `CommentRepository`, `AnnotationRepository`, `PreferenceRepository`, `PlaylistRepository`, `PlaylistTutorialRepository`
    - Add query methods: `CommentRepository.findByTutorialIdOrderByCreatedAtDesc`, `AnnotationRepository.findByTutorialId`, `PreferenceRepository.findByTutorialId`, `PlaylistTutorialRepository.findByPlaylistIdOrderByOrdinalPositionAsc`
    - _Requirements: 3.1, 4.3, 5.1, 6.1, 6.2_

  - [x] 1.3 Create DTO records and global exception handler
    - Create record DTOs: `TutorialInfo`, `CommentDto`, `AnnotationDto`, `PreferenceDto`, `PlaylistDto`, `PlaylistTutorialDto`
    - Create domain exceptions: `TutorialNotFoundException`, `ResourceNotFoundException`, `ValidationException`, `StorageAccessException`
    - Create `@RestControllerAdvice` `GlobalExceptionHandler` mapping domain exceptions to appropriate HTTP status codes (400, 404, 416, 500) with JSON error bodies
    - Add Jakarta Bean Validation annotations (`@NotBlank`) on request DTOs for comment text and playlist name
    - _Requirements: 2.4, 3.5, 6.7, 8.4_

- [x] 2. Implement tutorial scanning and video streaming services
  - [x] 2.1 Implement TutorialScannerService
    - Create `TutorialScannerService` that reads the configured `tutorials.directory` path
    - Scan subdirectories for video files (`.mp4`, `.mkv`, `.webm`, `.avi`); exclude subdirectories with no video file
    - For each valid subdirectory, detect presence of `.srt` (subtitle) and `.pdf` (tablature) files
    - Return `List<TutorialInfo>` with id (directory name), display name, video filename, hasSubtitle, hasTablature
    - Implement `getTutorial(String directoryName)` returning `Optional<TutorialInfo>`
    - Throw `StorageAccessException` if the tutorials directory is not accessible
    - _Requirements: 1.1, 1.3_

  - [ ] 2.2 Write property test for TutorialScannerService
    - **Property 1: Tutorial scanner correctness**
    - Use jqwik to generate random directory structures with varying combinations of video, SRT, and PDF files
    - Assert that only subdirectories with at least one video file are returned, and hasSubtitle/hasTablature flags are accurate
    - **Validates: Requirements 1.1, 1.3**

  - [x] 2.3 Implement VideoStreamingService
    - Create `VideoStreamingService` with `getVideoRegion(String tutorialId, HttpHeaders headers)` method
    - Parse HTTP Range header; return `ResourceRegion` with offset and length matching the requested range
    - Cap chunk size at 1MB per range request
    - Implement `getSubtitleFile(String tutorialId)` returning `Optional<Resource>` for the SRT file
    - Throw `TutorialNotFoundException` if tutorial ID is invalid; throw `ResourceNotFoundException` if video file is missing
    - _Requirements: 2.1, 2.4_

  - [x] 2.4 Write property test for VideoStreamingService
    - **Property 3: Video streaming range correctness**
    - Use jqwik to generate valid byte ranges within a test video file's length
    - Assert that returned ResourceRegion offset and length match the request, and content length does not exceed chunk size
    - **Validates: Requirements 2.1**

  - [x] 2.5 Create TutorialController
    - Implement `GET /api/tutorials` — delegates to `TutorialScannerService.scanTutorials()`
    - Implement `GET /api/tutorials/{id}` — delegates to `TutorialScannerService.getTutorial()`
    - Implement `GET /api/tutorials/{id}/video` — delegates to `VideoStreamingService.getVideoRegion()`, returns `ResponseEntity<ResourceRegion>` with 206 status when Range header present
    - Implement `GET /api/tutorials/{id}/subtitle` — returns SRT file or 404
    - Implement `GET /api/tutorials/{id}/tablature` — returns PDF file or 404
    - _Requirements: 1.1, 2.1, 2.4, 8.4_

  - [ ] 2.6 Write unit tests for TutorialController
    - Use `@WebMvcTest` with mocked services
    - Test listing tutorials, streaming with Range header, 404 for missing tutorials/files
    - _Requirements: 1.1, 2.1, 2.4_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement comment management
  - [x] 4.1 Create CommentService and CommentController
    - Implement `CommentService` with create, getByTutorialId (ordered by createdAt desc), update, and delete operations
    - Validate non-blank text on create and update; throw `ValidationException` for blank text
    - Set `createdAt` on create; set `updatedAt` on update
    - Implement `CommentController` at `/api/tutorials/{tutorialId}/comments` with GET, POST, PUT, DELETE endpoints
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Write property tests for comment operations
    - **Property 4: Comment CRUD round-trip** — create a comment, retrieve it, verify text and timestamps; update and verify new text and updatedAt >= createdAt
    - **Property 5: Comment ordering invariant** — create multiple comments, retrieve and verify descending createdAt order
    - **Property 6: Comment deletion invariant** — create comments, delete one, verify it is absent and count decreased by one
    - **Property 7: Whitespace comment rejection** — generate whitespace-only strings, verify submission is rejected and comment set is unchanged
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

  - [x] 4.3 Write unit tests for CommentService
    - Test create, read, update, delete with mocked repository
    - Test validation rejection for empty/whitespace text
    - Test ordering of returned comments
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Implement annotation management
  - [x] 5.1 Create AnnotationService and AnnotationController
    - Implement `AnnotationService` with create, getByTutorialId, update, and delete operations
    - Persist annotation data: tutorialId, pageNumber, x, y, width, height, content, createdAt
    - Implement `AnnotationController` at `/api/tutorials/{tutorialId}/annotations` with GET, POST, PUT, DELETE endpoints
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 5.2 Write property tests for annotation operations
    - **Property 8: Annotation persistence round-trip** — create annotations with random valid coordinates, retrieve and verify all field values preserved
    - **Property 9: Annotation deletion invariant** — create annotations, delete one, verify it is absent and count decreased by one
    - **Validates: Requirements 4.3, 4.4, 4.5**

  - [x] 5.3 Write unit tests for AnnotationService
    - Test CRUD operations with mocked repository
    - Test validation for invalid coordinates
    - _Requirements: 4.3, 4.4, 4.5_

- [x] 6. Implement preference management
  - [x] 6.1 Create PreferenceService and PreferenceController
    - Implement `PreferenceService` with get and upsert (create-or-update) operations
    - Use `tutorialId` unique constraint for upsert logic
    - Set `updatedAt` on every write
    - Implement `PreferenceController` at `/api/tutorials/{tutorialId}/preferences` with GET and PUT endpoints
    - _Requirements: 5.1, 5.2_

  - [x] 6.2 Write property test for preference operations
    - **Property 10: Preference upsert round-trip** — set a preference, retrieve it, verify values; update with different values, retrieve and verify new values
    - **Validates: Requirements 5.1, 5.2**

- [x] 7. Implement playlist management
  - [x] 7.1 Create PlaylistService and PlaylistController
    - Implement `PlaylistService` with: create playlist (validate non-blank name), get all playlists, get playlist by ID with ordered tutorials, update playlist name, delete playlist (cascade), add tutorial to playlist (assign next ordinal), reorder tutorials (update all ordinals), remove tutorial (recalculate ordinals)
    - Throw `ValidationException` for blank playlist name
    - Implement `PlaylistController` at `/api/playlists` with all endpoints: GET list, POST create, GET by ID, PUT update name, DELETE, POST add tutorial, PUT reorder, DELETE remove tutorial
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 7.2 Write property tests for playlist operations
    - **Property 12: Playlist with tutorials round-trip** — create playlist, add tutorials, retrieve and verify name, createdAt, and contiguous ordinal positions starting from 0
    - **Property 13: Playlist ordinal integrity after mutation** — after reorder or removal, verify ordinals form contiguous 0..N-1 sequence
    - **Property 14: Playlist cascade deletion** — create playlist with tutorials, delete playlist, verify both playlist and all PlaylistTutorial records are removed
    - **Property 15: Whitespace playlist name rejection** — generate whitespace-only strings, verify playlist creation is rejected and no playlist is persisted
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.7**

  - [x] 7.3 Write unit tests for PlaylistService
    - Test all CRUD and ordering operations with mocked repositories
    - Test cascade deletion behavior
    - Test validation rejection for blank names
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_

- [x] 8. Checkpoint
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 9. Initialize frontend project and core layout
  - [x] 9.1 Scaffold Vite React TypeScript project
    - Initialize Vite project with React and TypeScript template
    - Install dependencies: react-router-dom, react-pdf, pdf-lib, file-saver, @types/file-saver
    - Install dev dependencies: vitest, @testing-library/react, @testing-library/jest-dom, fast-check, msw
    - Define TypeScript interfaces: `Tutorial`, `Comment`, `Annotation`, `Preference`, `Playlist`, `PlaylistTutorial`
    - Create API service module with centralized fetch wrapper for all backend endpoints, including error handling (4xx/5xx mapping)
    - Configure Vite dev server proxy to forward `/api` requests to the locally running backend
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 11.2_

  - [x] 9.2 Implement ThemeProvider and App shell
    - Create `ThemeProvider` component that detects OS color scheme via `prefers-color-scheme` media query
    - Store user theme preference in localStorage; apply theme via CSS custom properties
    - Implement theme toggle button in the App header; switching themes must not trigger a page reload
    - Define CSS custom properties for dark and light themes (background, text, accent, border colors)
    - Set up React Router with routes: `/` (SongLibrary), `/tutorials/:id` (TutorialDetail), `/playlists` (PlaylistManager)
    - Create responsive App layout with header (title + theme toggle) and main content area
    - Define responsive breakpoints: desktop (≥1024px), iPad Pro (1024px), iPad (768px), iPhone (375px)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 10. Implement Song Library view
  - [x] 10.1 Create SongLibrary component
    - Fetch tutorial list from `GET /api/tutorials` on mount
    - Render table of contents with columns: tutorial name, subtitle availability icon, tablature availability icon, difficulty level
    - Fetch preferences for each tutorial to display difficulty level
    - Display "No tutorials available" message when the list is empty
    - Clicking a tutorial row navigates to `/tutorials/:id`
    - _Requirements: 1.1, 1.2, 1.4, 5.3_

  - [x] 10.2 Create FilterBar component
    - Implement difficulty level filter dropdown (All, Beginner, Intermediate, Advanced)
    - Implement column sorting for the tutorial list
    - Filter and sort operate on the client-side tutorial list
    - _Requirements: 5.4_

  - [x] 10.3 Write property test for SongLibrary rendering
    - **Property 2: Song Library renders required tutorial information** — generate random TutorialInfo arrays, render SongLibrary, assert each tutorial's name, subtitle indicator, and tablature indicator appear in the output
    - **Validates: Requirements 1.2**

  - [ ]* 10.4 Write property test for difficulty filter
    - **Property 11: Difficulty filter correctness** — generate tutorials with random difficulty levels, apply filter, assert result contains only matching tutorials and is a subset of the original list
    - **Validates: Requirements 5.4**

- [x] 11. Implement Tutorial Detail view with video player
  - [x] 11.1 Create TutorialDetail and VideoPlayer components
    - Create `TutorialDetail` as the detail page for a selected tutorial; fetch tutorial info from `GET /api/tutorials/{id}`
    - Layout adapts based on available content: video only, video + tablature side-by-side on desktop, stacked on mobile
    - Create `VideoPlayer` component with HTML5 `<video>` element; set `src` to `/api/tutorials/{id}/video`
    - Browser natively handles Range requests for seeking
    - When tutorial has subtitle: load SRT as a `<track>` element from `/api/tutorials/{id}/subtitle`
    - When tutorial has no subtitle: hide subtitle controls
    - _Requirements: 2.1, 2.2, 2.3, 7.5_

  - [x] 11.2 Write unit tests for VideoPlayer component
    - Test that video src is set correctly
    - Test subtitle track is rendered when hasSubtitle is true
    - Test subtitle controls are hidden when hasSubtitle is false
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 12. Implement tablature viewer with annotations
  - [x] 12.1 Create TablatureViewer component
    - Use `react-pdf` `<Document>` and `<Page>` components to render the PDF from `/api/tutorials/{id}/tablature`
    - Display "No tablature available" message when tutorial has no PDF
    - Render transparent annotation overlay layer on top of each page
    - Fetch existing annotations from `GET /api/tutorials/{id}/annotations` and render them positioned absolutely using stored coordinates
    - Implement click-to-add: user clicks on PDF to create a new annotation at that position; POST to backend
    - Implement annotation editing: click existing annotation to edit text; PUT to backend
    - Implement annotation deletion: delete button on annotation; DELETE to backend; remove from overlay
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 12.2 Implement annotated PDF download
    - Use `pdf-lib` to load the original PDF and bake all annotations into a new PDF document
    - Use `file-saver` to trigger browser download of the annotated PDF
    - Add a "Download Annotated PDF" button in the TablatureViewer
    - _Requirements: 4.6_

  - [ ]* 12.3 Write unit tests for TablatureViewer component
    - Test PDF rendering with react-pdf
    - Test annotation overlay rendering
    - Test "No tablature available" message when hasTablature is false
    - _Requirements: 4.1, 4.2, 4.4_

- [ ] 13. Implement comment panel and preference panel
  - [x] 13.1 Create CommentPanel component
    - Fetch comments from `GET /api/tutorials/{id}/comments` and display ordered by newest first
    - Provide text input for adding new comments; validate non-empty before POST
    - Each comment displays text, timestamp, and edit/delete action buttons
    - Edit inline: replace text with input field, save via PUT
    - Delete: confirm and call DELETE endpoint
    - Display validation errors from backend (400 responses) near the input
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 13.2 Create PreferencePanel component
    - Render difficulty level selector (Beginner, Intermediate, Advanced) and favorite toggle
    - Fetch current preferences from `GET /api/tutorials/{id}/preferences` on mount
    - Persist changes immediately via `PUT /api/tutorials/{id}/preferences`
    - _Requirements: 5.1, 5.2, 5.3_

  - [-] 13.3 Write unit tests for CommentPanel
    - Test comment list rendering and ordering
    - Test add, edit, delete interactions
    - Test validation error display for empty text
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 14. Implement playlist management
  - [x] 14.1 Create PlaylistManager component
    - List view: fetch and display all playlists from `GET /api/playlists`
    - Create playlist: input with name validation (non-empty), POST to backend
    - Detail view: fetch playlist by ID, display tutorials ordered by ordinal position
    - Implement drag-to-reorder for tutorials within a playlist; PUT reorder to backend
    - Add tutorial to playlist: selection UI, POST to backend
    - Remove tutorial from playlist: DELETE to backend
    - Delete playlist: confirm and DELETE to backend
    - Display validation errors for blank playlist name
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [~] 14.2 Write unit tests for PlaylistManager
    - Test playlist list rendering
    - Test create, delete playlist interactions
    - Test tutorial ordering display
    - Test validation error for blank name
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 6.7_

- [x] 15. Checkpoint
  - Ensure all frontend and backend tests pass, ask the user if questions arise.

- [ ] 16. Docker Compose and deployment configuration
  - [x] 16.1 Create Dockerfiles for backend and frontend
    - Create `backend/Dockerfile`: multi-stage build with Maven to compile Spring Boot app, then run on a JRE base image
    - Create `frontend/Dockerfile`: multi-stage build with Node to build Vite app, then serve static files via nginx
    - Configure nginx to proxy `/api` requests to the backend service
    - _Requirements: 10.1_

  - [x] 16.2 Create Docker Compose configuration
    - Create `docker-compose.yml` with three services: backend, frontend, db (postgres:16-alpine)
    - Backend service: set `SPRING_PROFILES_ACTIVE=prod`, `TUTORIALS_DIR=/tutorials`, DB connection env vars; mount `${TUTORIALS_PATH}:/tutorials:ro`; depends_on db
    - Frontend service: expose configurable host port `${FRONTEND_PORT:-3000}:80`; depends_on backend
    - DB service: configure with `${DB_NAME:-guitardb}`, `${DB_USER:-guitar}`, `${DB_PASSWORD:-guitar}`; persist data in `pgdata` named volume
    - Create `.env.example` file documenting all configurable variables (TUTORIALS_PATH, FRONTEND_PORT, BACKEND_PORT, DB_NAME, DB_USER, DB_PASSWORD)
    - Ensure compatibility with Synology DS918+ (amd64 architecture, no ARM-specific images)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 16.3 Create Docker Compose dev profile
    - Add a `dev` profile or separate `docker-compose.dev.yml` that uses H2 instead of PostgreSQL
    - Backend uses `SPRING_PROFILES_ACTIVE=local` in dev profile
    - No PostgreSQL service needed in dev profile
    - _Requirements: 11.5_

  - [~] 16.4 Write integration test for local development setup
    - Verify backend starts with local profile and H2
    - Verify frontend dev server proxies API requests correctly
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 17. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–15)
- Backend property tests use jqwik; frontend property tests use fast-check
- Unit tests validate specific examples and edge cases
- The backend uses Java with Spring Boot and Lombok; the frontend uses TypeScript with Vite and React
