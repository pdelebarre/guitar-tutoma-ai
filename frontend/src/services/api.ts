import type {
  Tutorial,
  Comment,
  Annotation,
  Preference,
  Playlist,
  TutorialMetadata,
  SearchResponse,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserDto,
  UserPreference,
  TutorialUploadResponse,
} from '../types';

// --- Error classes ---

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(body: unknown) {
    super(404, 'Not Found', body);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(body: unknown) {
    super(400, 'Bad Request', body);
    this.name = 'ValidationError';
  }
}

export class ServerError extends ApiError {
  constructor(status: number, body: unknown) {
    super(status, 'Server Error', body);
    this.name = 'ServerError';
  }
}

// --- Centralized fetch wrapper ---

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = { error: response.statusText };
    }

    if (response.status === 404) {
      throw new NotFoundError(body);
    }
    if (response.status === 400) {
      throw new ValidationError(body);
    }
    if (response.status >= 500) {
      throw new ServerError(response.status, body);
    }
    throw new ApiError(response.status, response.statusText, body);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// --- Tutorials ---

export async function listTutorials(): Promise<Tutorial[]> {
  return request<Tutorial[]>('/api/tutorials');
}

export async function getTutorial(id: string): Promise<Tutorial> {
  return request<Tutorial>(`/api/tutorials/${encodeURIComponent(id)}`);
}

export function getVideoUrl(tutorialId: string): string {
  return `/api/tutorials/${encodeURIComponent(tutorialId)}/video`;
}

export function getSubtitleUrl(tutorialId: string): string {
  return `/api/tutorials/${encodeURIComponent(tutorialId)}/subtitle`;
}

export function getTablatureUrl(tutorialId: string): string {
  return `/api/tutorials/${encodeURIComponent(tutorialId)}/tablature`;
}

// --- Comments ---

export async function getComments(tutorialId: string): Promise<Comment[]> {
  return request<Comment[]>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/comments`
  );
}

export async function createComment(
  tutorialId: string,
  text: string
): Promise<Comment> {
  return request<Comment>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ text }),
    }
  );
}

export async function updateComment(
  tutorialId: string,
  commentId: number,
  text: string
): Promise<Comment> {
  return request<Comment>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/comments/${commentId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ text }),
    }
  );
}

export async function deleteComment(
  tutorialId: string,
  commentId: number
): Promise<void> {
  return request<void>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/comments/${commentId}`,
    {
      method: 'DELETE',
    }
  );
}

// --- Annotations ---

export async function getAnnotations(
  tutorialId: string
): Promise<Annotation[]> {
  return request<Annotation[]>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/annotations`
  );
}

export async function createAnnotation(
  tutorialId: string,
  annotation: Omit<Annotation, 'id' | 'tutorialId' | 'createdAt'>
): Promise<Annotation> {
  return request<Annotation>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/annotations`,
    {
      method: 'POST',
      body: JSON.stringify(annotation),
    }
  );
}

export async function updateAnnotation(
  tutorialId: string,
  annotationId: number,
  annotation: Omit<Annotation, 'id' | 'tutorialId' | 'createdAt'>
): Promise<Annotation> {
  return request<Annotation>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/annotations/${annotationId}`,
    {
      method: 'PUT',
      body: JSON.stringify(annotation),
    }
  );
}

export async function deleteAnnotation(
  tutorialId: string,
  annotationId: number
): Promise<void> {
  return request<void>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/annotations/${annotationId}`,
    {
      method: 'DELETE',
    }
  );
}

// --- Preferences ---

export async function getPreferences(
  tutorialId: string
): Promise<Preference> {
  return request<Preference>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/preferences`
  );
}

export async function updatePreferences(
  tutorialId: string,
  preferences: Omit<Preference, 'tutorialId'>
): Promise<Preference> {
  return request<Preference>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/preferences`,
    {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }
  );
}

// --- Playlists ---

export async function getPlaylists(): Promise<Playlist[]> {
  return request<Playlist[]>('/api/playlists');
}

export async function createPlaylist(name: string): Promise<Playlist> {
  return request<Playlist>('/api/playlists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function getPlaylist(id: number): Promise<Playlist> {
  return request<Playlist>(`/api/playlists/${id}`);
}

export async function updatePlaylistName(
  id: number,
  name: string
): Promise<Playlist> {
  return request<Playlist>(`/api/playlists/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function deletePlaylist(id: number): Promise<void> {
  return request<void>(`/api/playlists/${id}`, {
    method: 'DELETE',
  });
}

export async function addTutorialToPlaylist(
  playlistId: number,
  tutorialId: string
): Promise<void> {
  return request<void>(`/api/playlists/${playlistId}/tutorials`, {
    method: 'POST',
    body: JSON.stringify({ tutorialId }),
  });
}

export async function reorderPlaylistTutorials(
  playlistId: number,
  tutorialIds: string[]
): Promise<void> {
  return request<void>(`/api/playlists/${playlistId}/tutorials`, {
    method: 'PUT',
    body: JSON.stringify({ tutorialIds }),
  });
}

export async function removeTutorialFromPlaylist(
  playlistId: number,
  tutorialId: string
): Promise<void> {
  return request<void>(
    `/api/playlists/${playlistId}/tutorials/${encodeURIComponent(tutorialId)}`,
    {
      method: 'DELETE',
    }
  );
}

// --- PDF Upload & Metadata ---

/**
 * Upload a PDF tablature file for a tutorial and trigger metadata extraction.
 * POST /api/tutorials/{id}/pdf
 */
export async function uploadPdf(
  tutorialId: string,
  file: File
): Promise<TutorialMetadata> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/pdf`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = { error: response.statusText };
    }
    if (response.status === 400) throw new ValidationError(body);
    if (response.status >= 500) throw new ServerError(response.status, body);
    throw new ApiError(response.status, response.statusText, body);
  }

  return response.json() as Promise<TutorialMetadata>;
}

/**
 * Get extracted metadata for a tutorial.
 * GET /api/tutorials/{id}/metadata
 */
export async function getTutorialMetadata(
  tutorialId: string
): Promise<TutorialMetadata> {
  return request<TutorialMetadata>(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/metadata`
  );
}

/**
 * Search across all indexed tutorials using semantic search.
 * GET /api/tutorials/search?q=query&n=10
 */
export async function searchTutorials(
  query: string,
  nResults: number = 10
): Promise<SearchResponse> {
  return request<SearchResponse>(
    `/api/tutorials/search?q=${encodeURIComponent(query)}&n=${nResults}`
  );
}

/**
 * Check ChromaDB service health.
 * GET /api/tutorials/search/health
 */
export async function getSearchHealth(): Promise<{
  chromaService: string;
  status: string;
}> {
  return request<{ chromaService: string; status: string }>(
    '/api/tutorials/search/health'
  );
}

// --- Auth ---

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCurrentUser(): Promise<UserDto> {
  return request<UserDto>('/api/auth/me', {
    headers: getAuthHeaders(),
  });
}

export function isAuthenticated(): boolean {
  return localStorage.getItem('auth_token') !== null;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
}

// --- User Preferences ---

export async function getUserPreferences(): Promise<UserPreference> {
  return request<UserPreference>('/api/user/preferences', {
    headers: getAuthHeaders(),
  });
}

export async function updateUserPreferences(
  data: Partial<Omit<UserPreference, 'userId' | 'updatedAt'>>
): Promise<UserPreference> {
  return request<UserPreference>('/api/user/preferences', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
}

// --- Tutorial Upload ---

/**
 * Create a new tutorial directory.
 * POST /api/tutorials/create
 */
export async function createTutorial(
  tutorialId: string,
  displayName?: string
): Promise<{ tutorialId: string; displayName: string; message: string }> {
  const params = new URLSearchParams();
  params.append('tutorialId', tutorialId);
  if (displayName) params.append('displayName', displayName);

  const response = await fetch(
    `/api/tutorials/create?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = { error: response.statusText };
    }
    if (response.status === 400) throw new ValidationError(body);
    if (response.status >= 500) throw new ServerError(response.status, body);
    throw new ApiError(response.status, response.statusText, body);
  }

  return response.json();
}

/**
 * Upload video and/or PDF files to an existing tutorial.
 * POST /api/tutorials/{tutorialId}/upload-files
 */
export async function uploadTutorialFiles(
  tutorialId: string,
  videoFile?: File,
  pdfFile?: File
): Promise<TutorialUploadResponse> {
  const formData = new FormData();
  if (videoFile) formData.append('video', videoFile);
  if (pdfFile) formData.append('pdf', pdfFile);

  const response = await fetch(
    `/api/tutorials/${encodeURIComponent(tutorialId)}/upload-files`,
    {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    }
  );

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = { error: response.statusText };
    }
    if (response.status === 400) throw new ValidationError(body);
    if (response.status >= 500) throw new ServerError(response.status, body);
    throw new ApiError(response.status, response.statusText, body);
  }

  return response.json();
}
