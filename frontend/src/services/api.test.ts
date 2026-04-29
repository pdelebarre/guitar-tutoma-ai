import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getVideoUrl,
  getSubtitleUrl,
  getTablatureUrl,
  listTutorials,
  getTutorial,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getPreferences,
  updatePreferences,
  getPlaylists,
  createPlaylist,
  getPlaylist,
  updatePlaylistName,
  deletePlaylist,
  addTutorialToPlaylist,
  removeTutorialFromPlaylist,
  reorderPlaylistTutorials,
  ApiError,
  NotFoundError,
  ValidationError,
  ServerError,
} from './api';
import type { Tutorial, Comment, Annotation, Preference, Playlist } from '../types';

// ─── Mock fetch globally ────────────────────────────────────────────────

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function mockJsonResponse(data: unknown, status = 200, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(data),
  };
}

function mockNoContentResponse() {
  return {
    ok: true,
    status: 204,
    statusText: 'No Content',
    json: () => Promise.resolve(undefined),
  };
}

function mockErrorResponse(status: number, statusText: string, body: unknown) {
  return {
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve(body),
  };
}

function mockNonJsonResponse(status: number, statusText: string) {
  return {
    ok: false,
    status,
    statusText,
    json: () => Promise.reject(new Error('Invalid JSON')),
  };
}

// ─── URL Helpers ────────────────────────────────────────────────────────

describe('API service URL helpers', () => {
  it('should return correct video URL', () => {
    expect(getVideoUrl('my-tutorial')).toBe(
      '/api/tutorials/my-tutorial/video'
    );
  });

  it('should return correct subtitle URL', () => {
    expect(getSubtitleUrl('my-tutorial')).toBe(
      '/api/tutorials/my-tutorial/subtitle'
    );
  });

  it('should return correct tablature URL', () => {
    expect(getTablatureUrl('my-tutorial')).toBe(
      '/api/tutorials/my-tutorial/tablature'
    );
  });

  it('should encode special characters in tutorial ID', () => {
    expect(getVideoUrl('tutorial with spaces')).toBe(
      '/api/tutorials/tutorial%20with%20spaces/video'
    );
  });
});

// ─── Error Classes ──────────────────────────────────────────────────────

describe('ApiError', () => {
  it('creates an ApiError with status, statusText, and body', () => {
    const error = new ApiError(418, "I'm a Teapot", { message: 'short' });
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(418);
    expect(error.statusText).toBe("I'm a Teapot");
    expect(error.body).toEqual({ message: 'short' });
    expect(error.message).toBe("API error 418: I'm a Teapot");
    expect(error.name).toBe('ApiError');
  });
});

describe('NotFoundError', () => {
  it('creates a NotFoundError with status 404', () => {
    const error = new NotFoundError({ error: 'Not found' });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.body).toEqual({ error: 'Not found' });
    expect(error.name).toBe('NotFoundError');
  });
});

describe('ValidationError', () => {
  it('creates a ValidationError with status 400', () => {
    const error = new ValidationError({ error: 'Invalid input' });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.statusText).toBe('Bad Request');
    expect(error.body).toEqual({ error: 'Invalid input' });
    expect(error.name).toBe('ValidationError');
  });
});

describe('ServerError', () => {
  it('creates a ServerError with the given status and body', () => {
    const error = new ServerError(503, { error: 'Service unavailable' });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(503);
    expect(error.statusText).toBe('Server Error');
    expect(error.body).toEqual({ error: 'Service unavailable' });
    expect(error.name).toBe('ServerError');
  });
});

// ─── Tutorial CRUD ──────────────────────────────────────────────────────

describe('listTutorials', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fetches and returns tutorials', async () => {
    const tutorials: Tutorial[] = [
      { id: 't1', name: 'Tutorial 1', videoFilename: 't1.mp4', hasSubtitle: false, hasTablature: false },
    ];
    mockFetch.mockResolvedValue(mockJsonResponse(tutorials));

    const result = await listTutorials();
    expect(result).toEqual(tutorials);
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(404, 'Not Found', { error: 'Not found' }));
    await expect(listTutorials()).rejects.toThrow(NotFoundError);
  });

  it('throws ServerError on 500', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(500, 'Server Error', { error: 'Oops' }));
    await expect(listTutorials()).rejects.toThrow(ServerError);
  });
});

describe('getTutorial', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fetches a single tutorial by id', async () => {
    const tutorial: Tutorial = { id: 't1', name: 'T1', videoFilename: 't1.mp4', hasSubtitle: true, hasTablature: true };
    mockFetch.mockResolvedValue(mockJsonResponse(tutorial));

    const result = await getTutorial('t1');
    expect(result).toEqual(tutorial);
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('encodes special characters in the id', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({}));
    await getTutorial('my tutorial');
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/my%20tutorial', {
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

// ─── Comments CRUD ──────────────────────────────────────────────────────

describe('getComments', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('fetches comments for a tutorial', async () => {
    const comments: Comment[] = [{ id: 1, tutorialId: 't1', text: 'Great!', createdAt: '2024-01-01T00:00:00Z' }];
    mockFetch.mockResolvedValue(mockJsonResponse(comments));

    const result = await getComments('t1');
    expect(result).toEqual(comments);
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1/comments', {
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('createComment', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('creates a comment with POST', async () => {
    const created: Comment = { id: 1, tutorialId: 't1', text: 'Nice!', createdAt: '2024-01-01T00:00:00Z' };
    mockFetch.mockResolvedValue(mockJsonResponse(created));

    const result = await createComment('t1', 'Nice!');
    expect(result).toEqual(created);
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1/comments', {
      method: 'POST',
      body: JSON.stringify({ text: 'Nice!' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('throws ValidationError on 400', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(400, 'Bad Request', { error: 'Text too long' }));
    await expect(createComment('t1', 'a'.repeat(501))).rejects.toThrow(ValidationError);
  });
});

describe('updateComment', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('updates a comment with PUT', async () => {
    const updated: Comment = { id: 1, tutorialId: 't1', text: 'Updated', createdAt: '2024-01-01T00:00:00Z' };
    mockFetch.mockResolvedValue(mockJsonResponse(updated));

    const result = await updateComment('t1', 1, 'Updated');
    expect(result).toEqual(updated);
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1/comments/1', {
      method: 'PUT',
      body: JSON.stringify({ text: 'Updated' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('deleteComment', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('deletes a comment with DELETE and returns void on 204', async () => {
    mockFetch.mockResolvedValue(mockNoContentResponse());

    const result = await deleteComment('t1', 1);
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1/comments/1', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

// ─── Annotations CRUD ───────────────────────────────────────────────────

describe('getAnnotations', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('fetches annotations for a tutorial', async () => {
    const annotations: Annotation[] = [{
      id: 1, tutorialId: 't1', pageNumber: 1, x: 0, y: 0, width: 100, height: 50,
      content: 'Note', type: 'text', strokeData: null, color: null, createdAt: '2024-01-01T00:00:00Z',
    }];
    mockFetch.mockResolvedValue(mockJsonResponse(annotations));

    const result = await getAnnotations('t1');
    expect(result).toEqual(annotations);
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1/annotations', {
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('createAnnotation', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('creates an annotation with POST', async () => {
    const input = {
      pageNumber: 1, x: 10, y: 20, width: 100, height: 50,
      content: 'Note', type: 'text' as const, strokeData: null, color: '#ff0000',
    };
    const created: Annotation = { id: 1, tutorialId: 't1', ...input, createdAt: '2024-01-01T00:00:00Z' };
    mockFetch.mockResolvedValue(mockJsonResponse(created));

    const result = await createAnnotation('t1', input);
    expect(result).toEqual(created);
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1/annotations', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('updateAnnotation', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('updates an annotation with PUT', async () => {
    const input = {
      pageNumber: 1, x: 10, y: 20, width: 100, height: 50,
      content: 'Updated', type: 'text' as const, strokeData: null, color: null,
    };
    const updated: Annotation = { id: 1, tutorialId: 't1', ...input, createdAt: '2024-01-01T00:00:00Z' };
    mockFetch.mockResolvedValue(mockJsonResponse(updated));

    const result = await updateAnnotation('t1', 1, input);
    expect(result).toEqual(updated);
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1/annotations/1', {
      method: 'PUT',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('deleteAnnotation', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('deletes an annotation with DELETE', async () => {
    mockFetch.mockResolvedValue(mockNoContentResponse());
    const result = await deleteAnnotation('t1', 1);
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1/annotations/1', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

// ─── Preferences ────────────────────────────────────────────────────────

describe('getPreferences', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('fetches preferences for a tutorial', async () => {
    const pref: Preference = { tutorialId: 't1', difficultyLevel: 'Beginner', favorite: true };
    mockFetch.mockResolvedValue(mockJsonResponse(pref));

    const result = await getPreferences('t1');
    expect(result).toEqual(pref);
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1/preferences', {
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('updatePreferences', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('updates preferences with PUT', async () => {
    const input = { difficultyLevel: 'Advanced', favorite: true };
    const updated: Preference = { tutorialId: 't1', ...input };
    mockFetch.mockResolvedValue(mockJsonResponse(updated));

    const result = await updatePreferences('t1', input);
    expect(result).toEqual(updated);
    expect(mockFetch).toHaveBeenCalledWith('/api/tutorials/t1/preferences', {
      method: 'PUT',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

// ─── Playlists CRUD ─────────────────────────────────────────────────────

describe('getPlaylists', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('fetches all playlists', async () => {
    const playlists: Playlist[] = [{ id: 1, name: 'Favorites', createdAt: '2024-01-01T00:00:00Z', tutorials: [] }];
    mockFetch.mockResolvedValue(mockJsonResponse(playlists));

    const result = await getPlaylists();
    expect(result).toEqual(playlists);
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists', {
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('createPlaylist', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('creates a playlist with POST', async () => {
    const created: Playlist = { id: 1, name: 'New', createdAt: '2024-01-01T00:00:00Z', tutorials: [] };
    mockFetch.mockResolvedValue(mockJsonResponse(created));

    const result = await createPlaylist('New');
    expect(result).toEqual(created);
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({ name: 'New' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('throws ValidationError on 400', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(400, 'Bad Request', { error: 'Name required' }));
    await expect(createPlaylist('')).rejects.toThrow(ValidationError);
  });
});

describe('getPlaylist', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('fetches a single playlist by id', async () => {
    const playlist: Playlist = { id: 1, name: 'My Playlist', createdAt: '2024-01-01T00:00:00Z', tutorials: [] };
    mockFetch.mockResolvedValue(mockJsonResponse(playlist));

    const result = await getPlaylist(1);
    expect(result).toEqual(playlist);
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists/1', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(404, 'Not Found', { error: 'Not found' }));
    await expect(getPlaylist(999)).rejects.toThrow(NotFoundError);
  });
});

describe('updatePlaylistName', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('updates playlist name with PUT', async () => {
    const updated: Playlist = { id: 1, name: 'Renamed', createdAt: '2024-01-01T00:00:00Z', tutorials: [] };
    mockFetch.mockResolvedValue(mockJsonResponse(updated));

    const result = await updatePlaylistName(1, 'Renamed');
    expect(result).toEqual(updated);
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Renamed' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('deletePlaylist', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('deletes a playlist with DELETE', async () => {
    mockFetch.mockResolvedValue(mockNoContentResponse());
    const result = await deletePlaylist(1);
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists/1', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

// ─── Playlist Tutorial Operations ───────────────────────────────────────

describe('addTutorialToPlaylist', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('adds a tutorial to a playlist with POST', async () => {
    mockFetch.mockResolvedValue(mockNoContentResponse());
    const result = await addTutorialToPlaylist(1, 't1');
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists/1/tutorials', {
      method: 'POST',
      body: JSON.stringify({ tutorialId: 't1' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('removeTutorialFromPlaylist', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('removes a tutorial from a playlist with DELETE', async () => {
    mockFetch.mockResolvedValue(mockNoContentResponse());
    const result = await removeTutorialFromPlaylist(1, 't1');
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists/1/tutorials/t1', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('encodes special characters in tutorial ID', async () => {
    mockFetch.mockResolvedValue(mockNoContentResponse());
    await removeTutorialFromPlaylist(1, 'my tutorial');
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists/1/tutorials/my%20tutorial', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('reorderPlaylistTutorials', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('reorders tutorials with PUT', async () => {
    mockFetch.mockResolvedValue(mockNoContentResponse());
    const result = await reorderPlaylistTutorials(1, ['t2', 't1']);
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists/1/tutorials', {
      method: 'PUT',
      body: JSON.stringify({ tutorialIds: ['t2', 't1'] }),
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

// ─── Request Function Error Handling ────────────────────────────────────

describe('request error handling', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('throws ApiError for non-standard error status (e.g. 418)', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(418, "I'm a Teapot", { error: 'short' }));
    await expect(listTutorials()).rejects.toThrow(ApiError);
    await expect(listTutorials()).rejects.not.toThrow(NotFoundError);
    await expect(listTutorials()).rejects.not.toThrow(ValidationError);
    await expect(listTutorials()).rejects.not.toThrow(ServerError);
  });

  it('throws ApiError for 403 Forbidden', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(403, 'Forbidden', { error: 'No access' }));
    await expect(listTutorials()).rejects.toThrow(ApiError);
  });

  it('handles non-JSON error responses gracefully', async () => {
    mockFetch.mockResolvedValue(mockNonJsonResponse(500, 'Internal Server Error'));
    await expect(listTutorials()).rejects.toThrow(ServerError);
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(listTutorials()).rejects.toThrow('Network failure');
  });

  it('handles 204 No Content response', async () => {
    mockFetch.mockResolvedValue(mockNoContentResponse());
    const result = await deletePlaylist(1);
    expect(result).toBeUndefined();
  });
});
