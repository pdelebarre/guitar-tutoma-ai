export interface Tutorial {
  id: string;
  name: string;
  videoFilename: string;
  hasSubtitle: boolean;
  hasTablature: boolean;
}

export interface Comment {
  id: number;
  tutorialId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Annotation {
  id: number;
  tutorialId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  type: 'text' | 'underline' | 'highlight' | 'drawing';
  strokeData: string | null;
  color: string | null;
  createdAt: string;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface Preference {
  tutorialId: string;
  difficultyLevel: string;
  favorite: boolean;
}

export interface Playlist {
  id: number;
  name: string;
  createdAt: string;
  tutorials: PlaylistTutorial[];
}

export interface PlaylistTutorial {
  tutorialId: string;
  tutorialName: string;
  ordinalPosition: number;
}

/** Metadata extracted from a PDF tutorial via Mistral/Ollama. */
export interface TutorialMetadata {
  tutorialId: string;
  title: string | null;
  tuning: string | null;
  musicalKey: string | null;
  difficulty: string | null;
  techniques: string | null;
  genre: string | null;
  extractedAt: string;
}

/** A single search result from ChromaDB semantic search. */
export interface SearchResult {
  tutorialId: string;
  title: string | null;
  name: string;
  tuning: string | null;
  musicalKey: string | null;
  difficulty: string | null;
  techniques: string | null;
  genre: string | null;
  hasSubtitle: boolean;
  hasTablature: boolean;
  relevanceScore: number;
  matchedChunks: string[];
}

/** Response wrapper for search results. */
export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
}

// --- Auth types ---

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  userId: number;
  username: string;
  displayName: string;
  token: string;
}

export interface UserDto {
  id: number;
  username: string;
  email: string;
  displayName: string;
  createdAt: string;
}

// --- User Preference types ---

export interface UserPreference {
  userId: number;
  theme: string;
  defaultDifficultyFilter: string;
  defaultSortDirection: string;
  itemsPerPage: number;
  updatedAt: string | null;
}

// --- Tutorial Upload types ---

export interface TutorialUploadResponse {
  tutorialId: string;
  displayName: string;
  videoUploaded: boolean;
  pdfUploaded: boolean;
  videoFilename: string | null;
  pdfFilename: string | null;
  message: string;
}
