# Requirements Document

## Introduction

Guitar Tutorial Manager is a full-stack web application for managing a personal collection of guitar tutorial videos, tablatures, and related learning materials. The application consists of a Spring Boot backend that streams video content and manages user data, and a Vite React TypeScript frontend that provides a modern, responsive interface. The system is designed to run on a Synology NAS DS918+ via Docker Compose, with the tutorials directory mounted as an external volume. It supports local development on macOS and uses H2 for local testing and PostgreSQL for production.

## Glossary

- **Tutorial**: A guitar lesson consisting of at least one video file, and optionally a subtitle file (SRT) and a tablature file (PDF), all stored in a single subdirectory within the Tutorials_Directory.
- **Tutorials_Directory**: A server-side directory containing Tutorial subdirectories, configured as a Docker Compose parameter and mounted into the Backend container.
- **Backend**: The Spring Boot application responsible for video streaming, data persistence, and REST API endpoints. Built with Lombok.
- **Frontend**: The Vite React TypeScript single-page application that provides the user interface.
- **Tablature**: A PDF document containing guitar tab notation for a Tutorial.
- **Annotation**: A user-created marking, highlight, or note placed on a specific location within a Tablature PDF.
- **Comment**: A user-created text note associated with a specific Tutorial.
- **Preference**: A user-defined setting such as difficulty level or favorite status associated with a Tutorial.
- **Playlist**: A user-created ordered collection of Tutorials.
- **Song_Library**: The Frontend view that displays all available Tutorials as a browsable table of contents.
- **Database**: The relational data store used by the Backend. H2 is used for local testing; PostgreSQL is used for production.
- **NAS**: The Synology DS918+ Network Attached Storage device that hosts the production deployment via Docker Compose.

## Requirements

### Requirement 1: Tutorial Discovery and Listing

**User Story:** As a guitar learner, I want to see all available tutorials listed as a table of contents, so that I can browse and select lessons to study.

#### Acceptance Criteria

1. WHEN the Frontend loads the Song_Library view, THE Backend SHALL scan the Tutorials_Directory and return a list of all available Tutorials with their associated file metadata (video filename, subtitle availability, tablature availability).
2. THE Frontend SHALL display the list of Tutorials in a Song_Library view formatted as a table of contents, showing the Tutorial name, availability of subtitle, and availability of tablature for each entry.
3. WHEN a Tutorial subdirectory contains no video file, THE Backend SHALL exclude that subdirectory from the Tutorial list.
4. WHEN the Tutorials_Directory is empty or contains no valid Tutorial subdirectories, THE Frontend SHALL display an informational message indicating that no tutorials are available.

### Requirement 2: Video Streaming

**User Story:** As a guitar learner, I want to stream tutorial videos directly in the browser, so that I can watch lessons without downloading files.

#### Acceptance Criteria

1. WHEN a user selects a Tutorial, THE Backend SHALL stream the associated video file to the Frontend using HTTP range requests to support seeking and partial content delivery.
2. WHEN a Tutorial has an associated SRT subtitle file, THE Frontend SHALL load and display the subtitles synchronized with the video playback.
3. WHEN a Tutorial has no associated SRT subtitle file, THE Frontend SHALL play the video without subtitles and hide subtitle controls.
4. IF the requested video file is not found in the Tutorials_Directory, THEN THE Backend SHALL return an HTTP 404 response with a descriptive error message.

### Requirement 3: Comment Management

**User Story:** As a guitar learner, I want to add, edit, and delete comments on tutorials, so that I can record my notes and observations for each lesson.

#### Acceptance Criteria

1. WHEN a user submits a comment for a Tutorial, THE Backend SHALL persist the Comment in the Database with a reference to the Tutorial, the comment text, and a creation timestamp.
2. WHEN a user requests comments for a Tutorial, THE Backend SHALL return all Comments associated with that Tutorial ordered by creation timestamp descending.
3. WHEN a user edits an existing Comment, THE Backend SHALL update the comment text and record an updated timestamp in the Database.
4. WHEN a user deletes a Comment, THE Backend SHALL remove the Comment from the Database.
5. IF a user submits a Comment with empty text, THEN THE Backend SHALL reject the request and return a validation error.

### Requirement 4: Tablature Viewing and Annotation

**User Story:** As a guitar learner, I want to view PDF tablatures and annotate them with my own notes, so that I can mark up lessons with personal practice reminders.

#### Acceptance Criteria

1. WHEN a Tutorial has an associated PDF tablature, THE Frontend SHALL render the Tablature using the react-pdf library.
2. WHEN a Tutorial has no associated PDF tablature, THE Frontend SHALL display an informational message indicating that no tablature is available for the selected Tutorial.
3. WHEN a user creates an Annotation on a Tablature, THE Frontend SHALL use the pdf-lib library to apply the Annotation and THE Backend SHALL persist the Annotation data (position, content, page number, Tutorial reference) in the Database.
4. WHEN a user requests a Tablature with existing Annotations, THE Backend SHALL return all Annotations for that Tablature so THE Frontend SHALL render them overlaid on the PDF.
5. WHEN a user deletes an Annotation, THE Backend SHALL remove the Annotation from the Database and THE Frontend SHALL remove the Annotation from the rendered Tablature.
6. WHEN a user downloads an annotated Tablature, THE Frontend SHALL use pdf-lib and file-saver to generate and save a PDF file that includes all Annotations.

### Requirement 5: User Preferences

**User Story:** As a guitar learner, I want to set preferences such as difficulty level on each tutorial, so that I can organize and track my learning progress.

#### Acceptance Criteria

1. WHEN a user assigns a difficulty level to a Tutorial, THE Backend SHALL persist the Preference in the Database with a reference to the Tutorial and the selected level value.
2. WHEN a user updates a Preference for a Tutorial, THE Backend SHALL update the corresponding Preference record in the Database.
3. WHEN the Song_Library view loads, THE Frontend SHALL display the stored Preferences (including difficulty level) alongside each Tutorial entry.
4. THE Frontend SHALL allow the user to filter or sort the Song_Library by difficulty level.

### Requirement 6: Playlist Management

**User Story:** As a guitar learner, I want to create and manage playlists of tutorials, so that I can organize my practice sessions.

#### Acceptance Criteria

1. WHEN a user creates a Playlist, THE Backend SHALL persist the Playlist in the Database with a name and a creation timestamp.
2. WHEN a user adds a Tutorial to a Playlist, THE Backend SHALL persist the association with an ordinal position in the Database.
3. WHEN a user reorders Tutorials within a Playlist, THE Backend SHALL update the ordinal positions of all affected entries in the Database.
4. WHEN a user removes a Tutorial from a Playlist, THE Backend SHALL remove the association from the Database and recalculate ordinal positions.
5. WHEN a user deletes a Playlist, THE Backend SHALL remove the Playlist and all associated Tutorial associations from the Database.
6. WHEN a user views a Playlist, THE Frontend SHALL display the Tutorials in the Playlist ordered by their ordinal position.
7. IF a user creates a Playlist with an empty name, THEN THE Backend SHALL reject the request and return a validation error.

### Requirement 7: Responsive Design and Dark Mode

**User Story:** As a guitar learner, I want the application to look modern and adapt to different screen sizes and color preferences, so that I can use it comfortably on any device.

#### Acceptance Criteria

1. THE Frontend SHALL render a usable layout on viewports of the following widths: desktop (1024px and above), iPad Pro (1024px), iPad (768px), and iPhone (375px).
2. THE Frontend SHALL support a dark mode theme and a light mode theme.
3. WHEN the user's operating system reports a dark color scheme preference, THE Frontend SHALL default to dark mode.
4. WHEN a user toggles the theme setting, THE Frontend SHALL switch between dark mode and light mode without a page reload.
5. THE Frontend SHALL use responsive breakpoints so that navigation, Song_Library, video player, and Tablature viewer adapt their layout to the current viewport width.

### Requirement 8: Backend Technology and Configuration

**User Story:** As a developer, I want clear guidance on the Spring Boot backend setup, so that I can initialize the project correctly using Spring Initializr.

#### Acceptance Criteria

1. THE Backend SHALL be a Spring Boot application initialized via Spring Initializr with the following dependencies: Spring Web, Spring Data JPA, H2 Database, PostgreSQL Driver, Spring Boot DevTools, and Lombok.
2. THE Backend SHALL use an application profile named "local" that configures H2 as the Database for local testing.
3. THE Backend SHALL use an application profile named "prod" that configures PostgreSQL as the Database for production deployment.
4. THE Backend SHALL expose a REST API for all Tutorial, Comment, Annotation, Preference, and Playlist operations.
5. THE Backend SHALL accept the Tutorials_Directory path as a configurable property (e.g., `tutorials.directory`) that can be overridden via environment variables.

### Requirement 9: Frontend Technology Stack

**User Story:** As a developer, I want the frontend to use a defined set of libraries, so that the application is built with consistent and appropriate tooling.

#### Acceptance Criteria

1. THE Frontend SHALL be a Vite React TypeScript application.
2. THE Frontend SHALL use the react-pdf library for rendering PDF Tablatures.
3. THE Frontend SHALL use the pdf-lib library for creating and modifying Annotations on PDF Tablatures.
4. THE Frontend SHALL use the file-saver library for downloading annotated PDF files.

### Requirement 10: Docker Compose Deployment

**User Story:** As a user, I want to deploy the application on my Synology NAS using Docker Compose, so that I can run it as a self-hosted service.

#### Acceptance Criteria

1. THE Docker_Compose configuration SHALL define services for the Backend, the Frontend, and a PostgreSQL Database.
2. THE Docker_Compose configuration SHALL accept the Tutorials_Directory host path as a configurable parameter (environment variable or `.env` file) and mount it as a volume into the Backend container.
3. THE Docker_Compose configuration SHALL expose the Frontend on a configurable host port.
4. WHEN deployed on the NAS, THE Backend SHALL connect to the PostgreSQL Database service defined in the Docker_Compose configuration.
5. THE Docker_Compose configuration SHALL be compatible with the Synology DS918+ (Intel Celeron J3455, amd64 architecture).

### Requirement 11: Local Development Environment

**User Story:** As a developer, I want to run and test the full application locally on macOS without Docker, so that I can develop and debug before deploying to the NAS.

#### Acceptance Criteria

1. THE Backend SHALL run locally on macOS using the "local" profile with H2 as the in-memory Database, without requiring Docker or Docker Compose.
2. THE Frontend SHALL run locally using the Vite development server and proxy API requests to the locally running Backend, without requiring Docker or Docker Compose.
3. WHEN running locally without Docker, THE developer SHALL be able to start the Backend using a standard Maven or Gradle command (e.g., `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`) and the Frontend using `npm run dev`.
4. WHEN running locally, THE Backend SHALL accept a local filesystem path as the Tutorials_Directory property.
5. THE Docker_Compose configuration SHALL include a "dev" profile or a separate compose file that enables local development with Docker using H2 instead of PostgreSQL, as an alternative to running without Docker.
