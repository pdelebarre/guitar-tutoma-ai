# iOS/iPadOS App Plan: Guitar Tutorial Manager

## 1. Overview

A native SwiftUI app for iPhone and iPad that consumes the existing Spring Boot backend API. The app mirrors the functionality of the existing React web frontend while embracing native iOS design patterns — adaptive layouts, system navigation (tab bars, split views), native video playback, and offline support.

---

## 2. Architecture

### 2.1 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | Swift 5.9+ | Modern, safe, native |
| UI Framework | SwiftUI (iOS 17+) | Declarative, adaptive, iPad split-view support |
| Networking | `URLSession` + async/await | First-party, lightweight, Swift concurrency |
| Video | `AVPlayer` + `AVKit` | Native HLS/streaming, PiP, subtitle support |
| PDF | `PDFKit` | Native PDF rendering, annotation support |
| State Management | SwiftUI `@Observable` / `@Published` | Built-in, no external dependencies |
| Auth | `Keychain` for token storage | Secure, system-level |
| Caching | `URLCache` + Core Data (optional) | Offline support |
| Architecture | MVVM (Model-View-ViewModel) | Standard SwiftUI pattern |

### 2.2 Project Structure

```
GuitarTutorial/
├── App/
│   ├── GuitarTutorialApp.swift          # App entry, window group, DI
│   ├── ContentView.swift                # Root navigation router
│   └── AppDependencies.swift            # Service registration
├── Models/
│   ├── Tutorial.swift                   # Codable, matches backend DTOs
│   ├── Comment.swift
│   ├── Annotation.swift
│   ├── Playlist.swift
│   ├── TutorialMetadata.swift
│   ├── SearchResult.swift
│   ├── AuthModels.swift                 # LoginRequest, RegisterRequest, AuthResponse
│   └── UserPreferences.swift
├── Services/
│   ├── APIClient.swift                  # Centralized HTTP client (async/await)
│   ├── AuthService.swift                # Login, register, token management
│   ├── TutorialService.swift            # Tutorial CRUD, video/subtitle URLs
│   ├── CommentService.swift
│   ├── AnnotationService.swift
│   ├── PlaylistService.swift
│   ├── SearchService.swift              # Semantic search
│   ├── PreferenceService.swift
│   └── KeychainManager.swift            # Secure token storage
├── ViewModels/
│   ├── SongLibraryViewModel.swift
│   ├── TutorialDetailViewModel.swift
│   ├── PlaylistViewModel.swift
│   ├── AuthViewModel.swift
│   ├── SearchViewModel.swift
│   └── UserPreferencesViewModel.swift
├── Views/
│   ├── SongLibrary/
│   │   ├── SongLibraryView.swift        # Main list (table on iPad, list on iPhone)
│   │   ├── TutorialRowView.swift
│   │   ├── FilterBarView.swift
│   │   └── AddTutorialView.swift
│   ├── TutorialDetail/
│   │   ├── TutorialDetailView.swift     # Scrollable detail with sections
│   │   ├── VideoPlayerView.swift        # AVPlayer wrapper
│   │   ├── TablatureViewer.swift        # PDFKit-based viewer
│   │   ├── CommentSectionView.swift
│   │   ├── AnnotationOverlayView.swift
│   │   └── MetadataSectionView.swift
│   ├── Playlists/
│   │   ├── PlaylistListView.swift
│   │   ├── PlaylistDetailView.swift
│   │   └── CreatePlaylistView.swift
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   └── RegisterView.swift
│   ├── Search/
│   │   └── SearchResultsView.swift
│   ├── Preferences/
│   │   └── UserPreferencesView.swift
│   └── Components/
│       ├── LoadingView.swift
│       ├── ErrorView.swift
│       ├── EmptyStateView.swift
│       ├── DifficultyBadge.swift
│       └── SkeletonLoadingView.swift
├── Resources/
│   ├── Assets.xcassets
│   └── Info.plist
└── Configuration/
    └── Environment.swift                # API base URL, feature flags
```

---

## 3. API Endpoints Mapping

The app consumes the same backend API. Here's the mapping:

| Backend Endpoint | iOS Service Method | Notes |
|-----------------|-------------------|-------|
| `GET /api/tutorials` | `TutorialService.list()` | |
| `GET /api/tutorials/{id}` | `TutorialService.get(id:)` | |
| `GET /api/tutorials/{id}/video` | `TutorialService.videoURL(id:)` | Returns URL for AVPlayer |
| `GET /api/tutorials/{id}/subtitle` | `TutorialService.subtitleURL(id:)` | VTT for AVPlayer |
| `GET /api/tutorials/{id}/tablature` | `TutorialService.tablatureURL(id:)` | PDF for PDFKit |
| `POST /api/tutorials/create` | `TutorialService.create(id:name:)` | Auth required |
| `POST /api/tutorials/{id}/upload-files` | `TutorialService.uploadFiles(id:video:pdf:)` | Auth required |
| `POST /api/tutorials/{id}/pdf` | `TutorialService.uploadPDF(id:file:)` | Auth required |
| `GET /api/tutorials/{id}/metadata` | `TutorialService.getMetadata(id:)` | |
| `GET /api/tutorials/search?q=&n=` | `SearchService.search(query:n:)` | |
| `GET /api/tutorials/search/health` | `SearchService.health()` | |
| `GET/POST/PUT/DELETE /api/tutorials/{id}/comments` | `CommentService` | |
| `GET/POST/PUT/DELETE /api/tutorials/{id}/annotations` | `AnnotationService` | |
| `GET/PUT /api/tutorials/{id}/preferences` | `PreferenceService` | |
| `GET/POST/PUT/DELETE /api/playlists` | `PlaylistService` | |
| `POST /api/auth/register` | `AuthService.register()` | |
| `POST /api/auth/login` | `AuthService.login()` | |
| `GET /api/auth/me` | `AuthService.currentUser()` | |
| `GET/PUT /api/user/preferences` | `UserPreferenceService` | Auth required |

---

## 4. Screen Flow & Navigation

### 4.1 iPhone Navigation (Tab Bar + Navigation Stack)

```
Tab 1: Library (SongLibraryView)
  └─> TutorialDetailView
       ├─ VideoPlayerView (inline)
       ├─ TablatureViewer (PDFKit)
       ├─ MetadataSectionView
       ├─ CommentSectionView
       └─ PreferencePanelView

Tab 2: Search (SearchResultsView)
  └─> TutorialDetailView (same as above)

Tab 3: Playlists (PlaylistListView)
  └─> PlaylistDetailView
       └─> TutorialDetailView

Tab 4: Settings (UserPreferencesView)

Modal: Auth (LoginView / RegisterView)
Modal: AddTutorialView
```

### 4.2 iPad Navigation (Split View / NavigationSplitView)

```
Primary (Sidebar):
  - Library
  - Search
  - Playlists
  - Settings

Secondary (Content):
  - SongLibraryView (when Library selected)
  - SearchResultsView (when Search selected)
  - PlaylistListView (when Playlists selected)
  - UserPreferencesView (when Settings selected)

Detail (when item selected):
  - TutorialDetailView
  - PlaylistDetailView
```

On iPad, the split view allows watching a video while browsing the library — a key advantage over the web version.

---

## 5. Key Features & Implementation Details

### 5.1 Video Playback
- Use `AVPlayer` with the streaming video URL (`/api/tutorials/{id}/video`)
- Subtitles: Parse VTT from `/api/tutorials/{id}/subtitle` and attach as `AVPlayerItem` subtitles
- Picture-in-Picture support via `AVPictureInPictureController`
- Background audio playback (optional, requires audio session configuration)

### 5.2 PDF Tablature Viewer
- Use `PDFKit` (`PDFView`) for native, high-performance PDF rendering
- Annotation overlay: Use SwiftUI overlay on top of `PDFViewRepresentable` (UIViewRepresentable wrapper)
- Touch gestures for drawing/highlighting on the PDF
- Sync annotations with backend API

### 5.3 Offline Support (Phase 2)
- Cache tutorial list and metadata in Core Data
- Download videos for offline playback (background URL session)
- Queue comments/annotations for sync when online

### 5.4 Adaptive Layout
- iPhone: Compact, single-column navigation with tab bar
- iPad: Regular width, split view with sidebar
- Use SwiftUI `NavigationSplitView` and `NavigationStack`
- Size classes to adjust layouts (e.g., compact vs regular)

### 5.5 Authentication
- Token stored in Keychain (not UserDefaults)
- `AuthService` manages token lifecycle
- Automatic token refresh (if implemented on backend)
- Biometric authentication (Face ID / Touch ID) for app unlock (Phase 2)

---

## 6. Backend Considerations

The existing backend is already well-suited for a mobile client:

1. **RESTful API** — All endpoints return JSON, perfect for `Codable` models
2. **Token-based auth** — JWT Bearer tokens work seamlessly with `URLSession`
3. **Video streaming** — HTTP range requests (`ResourceRegion`) work with `AVPlayer`
4. **CORS** — May need to allow the iOS app's origin if not using a proxy
5. **No changes required** — The backend can serve both web and mobile clients simultaneously

### Potential Backend Enhancements (Optional)
- Add pagination to `GET /api/tutorials` for large libraries
- Add `PUT /api/auth/refresh` for token refresh
- Add push notification support for comments/updates
- Add `Accept-Language` header support for i18n

---

## 7. Implementation Phases

### Phase 1: Core App (MVP)
- [ ] Project setup: Xcode project, Swift Package Manager dependencies
- [ ] `APIClient` — async/await networking layer with error handling
- [ ] `AuthService` + Login/Register screens
- [ ] `TutorialService` + SongLibraryView (list tutorials)
- [ ] `TutorialDetailView` with VideoPlayerView (AVPlayer)
- [ ] Basic navigation: tab bar + navigation stack

### Phase 2: Feature Parity
- [ ] PDF TablatureViewer (PDFKit)
- [ ] CommentSectionView (CRUD comments)
- [ ] Annotation support (drawing on PDF)
- [ ] Playlist management
- [ ] Semantic search
- [ ] User preferences screen
- [ ] iPad split-view layout

### Phase 3: Polish & Advanced
- [ ] Picture-in-Picture video
- [ ] Offline caching (Core Data)
- [ ] Background video download
- [ ] Face ID / Touch ID app lock
- [ ] Push notifications
- [ ] Accessibility (VoiceOver, Dynamic Type)
- [ ] Dark mode support (automatic via system)
- [ ] Unit tests + UI tests
- [ ] App Store submission preparation

---

## 8. Dependencies (Swift Packages)

| Package | Purpose |
|---------|---------|
| (None required — all Apple frameworks) | |
| `PDFKit` (built-in) | PDF rendering |
| `AVKit` / `AVFoundation` (built-in) | Video playback |
| `Keychain Services` (built-in) | Secure token storage |
| `OSLog` (built-in) | Structured logging |

No third-party dependencies are needed. All required frameworks are Apple-native, ensuring stability and minimal maintenance burden.

---

## 9. Deployment

- **Minimum target**: iOS 17.0 (latest SwiftUI features, `NavigationSplitView`, `@Observable`)
- **Devices**: iPhone (all models), iPad (all models)
- **Distribution**: TestFlight (beta), App Store (production)
- **Backend URL**: Configurable via `Environment.swift` (dev/staging/prod)

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Large video files over cellular | Implement download only on WiFi, use `AVPlayer` streaming |
| PDF rendering performance on older iPads | Use `PDFKit` with thumbnail mode, lazy page loading |
| Token expiration during long sessions | Implement token refresh endpoint on backend |
| Network connectivity loss | Graceful error states, retry logic, offline cache |
| App Store rejection for background audio | Clear UI indication, proper audio session category |
