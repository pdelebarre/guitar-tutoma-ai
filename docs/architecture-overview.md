# Architecture Overview — Guitar Tutorial Manager

| Purpose | Audience | Status | Date |
|---------|----------|--------|------|
| Describe the system architecture, component interactions, and technology stack | Developers, architects, DevOps | Draft | 2026-05-02 |

---

## 1. System Context

Guitar Tutorial Manager is a full-stack web application (with an iOS companion) that helps guitarists organize, annotate, and search their collection of video-and-PDF tutorial files. Users upload tutorials (video + PDF tablature), the system automatically extracts metadata via an LLM (Mistral/Ollama), generates subtitles via Faster-Whisper, and indexes the content into ChromaDB for semantic search.

### C4 Context Diagram

```mermaid
C4Context
  title System Context — Guitar Tutorial Manager

  Person(guitarist, "Guitarist", "A musician who owns video/PDF guitar tutorials")
  System(gtm, "Guitar Tutorial Manager", "Organises, annotates, and searches guitar tutorials")

  System_Ext(ollama, "Ollama (LLM)", "Mistral model for metadata extraction")
  System_Ext(whisper, "Faster-Whisper", "Speech-to-text for subtitle generation")
  System_Ext(chromadb, "ChromaDB", "Vector database for semantic search")

  Rel(guitarist, gtm, "Uploads, browses, annotates, searches tutorials")
  Rel(gtm, ollama, "Extracts metadata from PDF text")
  Rel(gtm, whisper, "Generates SRT subtitles from video audio")
  Rel(gtm, chromadb, "Indexes & queries text chunks")
```

---

## 2. High-Level Architecture

The system follows a **layered microservices architecture** deployed via Docker Compose. Each service runs in its own container.

```mermaid
graph TD
  subgraph "Frontend Layer"
    REACT["React SPA (Vite)"]
    IOS["iOS SwiftUI App"]
  end

  subgraph "API Gateway"
    NGINX["nginx (reverse proxy)"]
  end

  subgraph "Backend Layer"
    SB["Spring Boot 4 / Java 25"]
    CTRL["Controllers"]
    SVC["Services"]
    REPO["JPA Repositories"]
  end

  subgraph "Data Layer"
    PG[("PostgreSQL 16")]
    FS[("Filesystem /tutorials")]
  end

  subgraph "AI / ML Layer"
    OLLAMA["Ollama (Mistral)"]
    WHISPER["Faster-Whisper"]
    CHROMA["ChromaDB"]
  end

  REACT --> NGINX
  IOS --> SB
  NGINX --> SB
  SB --> CTRL --> SVC --> REPO --> PG
  SVC --> FS
  SVC --> OLLAMA
  SVC --> WHISPER
  SVC --> CHROMA
```

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend (Web) | React 18, TypeScript, Vite, React Router 6 | 18.x |
| Frontend (iOS) | SwiftUI, async/await | iOS 17+ |
| Backend | Spring Boot, Java 25, Maven | 4.0.6 |
| Database | PostgreSQL (prod) / H2 (dev) | 16 / embedded |
| Vector DB | ChromaDB (Python) | latest |
| LLM | Ollama + Mistral | latest |
| Speech-to-Text | Faster-Whisper (Python) | latest |
| Reverse Proxy | nginx | latest |
| Containerisation | Docker Compose | 3.8 |

---

## 3. Component Breakdown

### 3.1 Backend (Spring Boot)

The backend is a monolithic Spring Boot application organised by layers:

- **Controllers** — REST endpoints under `/api/`
- **Services** — Business logic, orchestration, external integrations
- **Repositories** — Spring Data JPA interfaces for PostgreSQL/H2
- **Entities** — JPA entities mapped to database tables
- **DTOs** — Data transfer objects for API request/response contracts

#### Controller Map

| Controller | Base Path | Purpose |
|-----------|-----------|---------|
| [`TutorialController`](../backend/src/main/java/com/guitartutorial/controller/TutorialController.java:31) | `/api/tutorials` | List, get, stream video |
| [`TutorialUploadController`](../backend/src/main/java/com/guitartutorial/controller/TutorialUploadController.java:33) | `/api/tutorials` | Create tutorial, upload video/PDF |
| [`PdfController`](../backend/src/main/java/com/guitartutorial/controller/PdfController.java:35) | `/api/tutorials` | Upload PDF, extract metadata, search |
| [`AnnotationController`](../backend/src/main/java/com/guitartutorial/controller/AnnotationController.java:21) | `/api/tutorials/{id}/annotations` | CRUD annotations |
| [`CommentController`](../backend/src/main/java/com/guitartutorial/controller/CommentController.java:22) | `/api/tutorials/{id}/comments` | CRUD comments |
| [`PreferenceController`](../backend/src/main/java/com/guitartutorial/controller/PreferenceController.java:14) | `/api/tutorials/{id}/preferences` | Per-tutorial preferences |
| [`PlaylistController`](../backend/src/main/java/com/guitartutorial/controller/PlaylistController.java:23) | `/api/playlists` | CRUD playlists + reorder |
| [`AuthController`](../backend/src/main/java/com/guitartutorial/controller/AuthController.java:23) | `/api/auth` | Register, login, token validation |
| [`UserPreferenceController`](../backend/src/main/java/com/guitartutorial/controller/UserPreferenceController.java:17) | `/api/user/preferences` | Global user preferences |

### 3.2 Frontend (React SPA)

The web frontend is a single-page application with client-side routing:

| Page | Route | Purpose |
|------|-------|---------|
| [`SongLibrary`](../frontend/src/pages/SongLibrary.tsx:1) | `/` | Browse, filter, search tutorials |
| [`TutorialDetail`](../frontend/src/pages/TutorialDetail.tsx:1) | `/tutorial/:id` | Video player, PDF viewer, annotations, comments |
| [`PlaylistManager`](../frontend/src/pages/PlaylistManager.tsx:1) | `/playlists` | Create, manage, reorder playlists |
| [`AuthPage`](../frontend/src/pages/AuthPage.tsx:1) | `/auth` | Login / register |
| [`UserPreferencesPage`](../frontend/src/pages/UserPreferencesPage.tsx:1) | `/preferences` | Theme, pagination, default filters |

### 3.3 iOS App (SwiftUI)

The iOS companion app mirrors the web frontend's functionality using native SwiftUI patterns:

- **ViewModels** — Observable objects that drive UI state
- **Services** — Async HTTP clients via [`APIClient`](../ios/GuitarTutorial/Services/APIClient.swift:41)
- **Views** — SwiftUI views for each screen

### 3.4 AI / ML Services

#### Ollama (Mistral)
- Called by [`MetadataExtractionService`](../backend/src/main/java/com/guitartutorial/service/MetadataExtractionService.java:34) via a Python wrapper script
- Extracts structured metadata (title, tuning, key, difficulty, techniques, genre) from PDF text
- Runs on port 11434, optionally with GPU acceleration

#### Faster-Whisper
- Called by [`SubtitleGenerationService`](../backend/src/main/java/com/guitartutorial/service/SubtitleGenerationService.java:30) via a Python script
- Generates SRT subtitle files from video audio tracks
- Runs asynchronously; subtitles become available once generation completes

#### ChromaDB
- A Python-based vector database running on port 8001
- Indexes text chunks from PDFs with associated metadata
- Provides semantic search via [`ChromaServiceClient`](../backend/src/main/java/com/guitartutorial/service/ChromaServiceClient.java:29)

---

## 4. Data Flow Diagrams

### 4.1 Tutorial Upload & Processing Flow

```mermaid
sequenceDiagram
  actor User
  participant Frontend
  participant Backend
  participant Filesystem
  participant Ollama
  participant ChromaDB
  participant Whisper

  User->>Frontend: Upload video + PDF
  Frontend->>Backend: POST /api/tutorials/create + upload files
  Backend->>Filesystem: Save video & PDF files
  Backend-->>Frontend: TutorialUploadResponse

  Note over Backend,Whisper: Asynchronous processing begins

  Backend->>Filesystem: Read PDF
  Backend->>Backend: Extract text (PDFBox)
  Backend->>Ollama: Send PDF text for metadata extraction
  Ollama-->>Backend: Structured JSON metadata
  Backend->>Backend: Persist TutorialMetadata to PostgreSQL
  Backend->>ChromaDB: Index text chunks with metadata
  ChromaDB-->>Backend: Confirmation

  Backend->>Whisper: Generate subtitles from video
  Whisper-->>Backend: SRT subtitle file
  Backend->>Filesystem: Save .srt file
```

### 4.2 Semantic Search Flow

```mermaid
sequenceDiagram
  actor User
  participant Frontend
  participant Backend
  participant ChromaDB

  User->>Frontend: Enter search query
  Frontend->>Backend: GET /api/tutorials/search?q=...
  Backend->>ChromaDB: POST /search (query, n_results)
  ChromaDB-->>Backend: List of SearchResultDto
  Backend-->>Frontend: SearchResponse (results + matched chunks)
  Frontend->>User: Display results with relevance scores
```

### 4.3 Video Streaming Flow

```mermaid
sequenceDiagram
  actor User
  participant Frontend
  participant Backend
  participant Filesystem

  User->>Frontend: Click play on tutorial
  Frontend->>Backend: GET /api/tutorials/{id}/video (with Range header)
  Backend->>Filesystem: Read video file chunk
  Backend-->>Frontend: HTTP 206 Partial Content (1MB chunk)
  Frontend->>User: Play video chunk
  Note over Frontend,Backend: Subsequent chunks requested as needed
```

---

## 5. Deployment Architecture

```mermaid
graph TD
  subgraph "Docker Host"
    subgraph "docker-compose.yml"
      FRONTEND["frontend:80<br/>nginx + React SPA"]
      BACKEND["backend:8080<br/>Spring Boot + Java 25"]
      DB[("db:5432<br/>PostgreSQL 16")]
      OLLAMA["ollama:11434<br/>Mistral LLM"]
      CHROMA["chroma:8001<br/>ChromaDB"]
    end
    VOL1["Volume: tutorial_data"]
    VOL2["Volume: pgdata"]
    VOL3["Volume: ollama_data"]
    VOL4["Volume: chroma_data"]
  end

  FRONTEND --> BACKEND
  BACKEND --> DB
  BACKEND --> OLLAMA
  BACKEND --> CHROMA
  BACKEND --> VOL1
  DB --> VOL2
  OLLAMA --> VOL3
  CHROMA --> VOL4
```

All services are defined in [`docker-compose.yml`](../docker-compose.yml:1) (production) and [`docker-compose.dev.yml`](../docker-compose.dev.yml:1) (development with H2).

---

## 6. Security Architecture

- **Authentication**: Token-based (Bearer token) via [`AuthController`](../backend/src/main/java/com/guitartutorial/controller/AuthController.java:23)
- **Password storage**: Hashed (handled by [`UserService`](../backend/src/main/java/com/guitartutorial/service/UserService.java:1))
- **Protected endpoints**: Tutorial creation, user preferences require valid token
- **Public endpoints**: Tutorial listing, video streaming, PDF serving, search
- **iOS**: Token stored in Keychain via [`KeychainManager`](../ios/GuitarTutorial/Services/KeychainManager.swift:1)

---

## 7. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Monolithic backend** | Single team, small scope; avoids microservice overhead |
| **Filesystem-based tutorial storage** | Tutorials are large media files; DB不适合; Docker volume for persistence |
| **Python scripts for AI tasks** | Faster-Whisper and ChromaDB are Python-native; Spring Boot delegates via subprocess/HTTP |
| **H2 for dev, PostgreSQL for prod** | Zero-config local development; robust production storage |
| **Chunked video streaming** | 1MB chunks enable seeking and reduce memory pressure |
| **Async subtitle generation** | Videos can play immediately; subtitles appear when ready |
