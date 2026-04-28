import type {
  Tutorial,
  Comment,
  Annotation,
  Preference,
  Playlist,
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
