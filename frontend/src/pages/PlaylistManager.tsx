import { useEffect, useState, useCallback } from 'react';
import {
  getPlaylists,
  createPlaylist,
  getPlaylist,
  updatePlaylistName,
  deletePlaylist,
  addTutorialToPlaylist,
  reorderPlaylistTutorials,
  removeTutorialFromPlaylist,
  listTutorials,
  ValidationError,
} from '../services/api';
import type { Playlist, PlaylistTutorial, Tutorial } from '../types';
import './PlaylistManager.css';

// ─── Skeleton Loading ──────────────────────────────────────────────────

function SkeletonItems() {
  return (
    <div className="playlist-manager__skeleton-list" role="status" aria-label="Loading playlists">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="playlist-manager__skeleton-item skeleton" />
      ))}
    </div>
  );
}

// ─── Playlist List View ────────────────────────────────────────────────

interface PlaylistListViewProps {
  playlists: Playlist[];
  onView: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: (name: string) => Promise<string | null>;
}

function PlaylistListView({ playlists, onView, onDelete, onCreate }: PlaylistListViewProps) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setValidationError('Playlist name cannot be empty.');
      return;
    }

    setCreating(true);
    setValidationError(null);
    const errorMsg = await onCreate(trimmed);
    if (errorMsg) {
      setValidationError(errorMsg);
    } else {
      setNewName('');
    }
    setCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  return (
    <>
      <div className="playlist-manager__create-form">
        <div className="playlist-manager__create-input-group">
          <input
            className={`playlist-manager__input${validationError ? ' playlist-manager__input--error' : ''}`}
            type="text"
            placeholder="New playlist name…"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (validationError) setValidationError(null);
            }}
            onKeyDown={handleKeyDown}
            aria-label="New playlist name"
          />
          {validationError && (
            <p className="playlist-manager__validation-error" role="alert">
              {validationError}
            </p>
          )}
        </div>
        <button
          className="playlist-manager__create-btn"
          onClick={handleCreate}
          disabled={creating}
          type="button"
        >
          {creating ? 'Creating…' : 'Create Playlist'}
        </button>
      </div>

      {playlists.length === 0 ? (
        <p className="playlist-manager__empty">No playlists yet. Create one above.</p>
      ) : (
        <ul className="playlist-manager__list">
          {playlists.map((pl, idx) => (
            <li
              key={pl.id}
              className="playlist-manager__item slide-up"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="playlist-manager__item-info">
                <span className="playlist-manager__item-name">{pl.name}</span>
                <span className="playlist-manager__item-count">
                  {pl.tutorials.length} {pl.tutorials.length === 1 ? 'tutorial' : 'tutorials'}
                </span>
              </div>
              <div className="playlist-manager__item-actions">
                <button
                  className="playlist-manager__btn playlist-manager__btn--primary"
                  onClick={() => onView(pl.id)}
                  type="button"
                >
                  View
                </button>
                <button
                  className="playlist-manager__btn playlist-manager__btn--delete"
                  onClick={() => onDelete(pl.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ─── Playlist Detail View ──────────────────────────────────────────────

interface PlaylistDetailViewProps {
  playlist: Playlist;
  allTutorials: Tutorial[];
  onBack: () => void;
  onNameUpdate: (name: string) => Promise<string | null>;
  onAddTutorial: (tutorialId: string) => Promise<void>;
  onRemoveTutorial: (tutorialId: string) => Promise<void>;
  onReorder: (tutorials: PlaylistTutorial[]) => Promise<void>;
}

function PlaylistDetailView({
  playlist,
  allTutorials,
  onBack,
  onNameUpdate,
  onAddTutorial,
  onRemoveTutorial,
  onReorder,
}: PlaylistDetailViewProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(playlist.name);
  const [editError, setEditError] = useState<string | null>(null);
  const [selectedTutorialId, setSelectedTutorialId] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Tutorials not already in the playlist
  const availableTutorials = allTutorials.filter(
    (t) => !playlist.tutorials.some((pt) => pt.tutorialId === t.id)
  );

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Playlist name cannot be empty.');
      return;
    }
    setEditError(null);
    const errorMsg = await onNameUpdate(trimmed);
    if (errorMsg) {
      setEditError(errorMsg);
    } else {
      setEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(playlist.name);
    setEditError(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleAddTutorial = async () => {
    if (!selectedTutorialId) return;
    await onAddTutorial(selectedTutorialId);
    setSelectedTutorialId('');
  };

  // ─── Drag and Drop ────────────────────────────────────────────

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...playlist.tutorials];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Recalculate ordinal positions
    const updated = reordered.map((t, i) => ({ ...t, ordinalPosition: i }));

    setDragIndex(null);
    setDragOverIndex(null);

    await onReorder(updated);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <>
      <div className="playlist-detail__header">
        <button
          className="playlist-detail__back-btn"
          onClick={onBack}
          type="button"
          aria-label="Back to playlists"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        {editing ? (
          <div className="playlist-detail__edit-name">
            <input
              className={`playlist-manager__input${editError ? ' playlist-manager__input--error' : ''}`}
              type="text"
              value={editName}
              onChange={(e) => {
                setEditName(e.target.value);
                if (editError) setEditError(null);
              }}
              onKeyDown={handleEditKeyDown}
              aria-label="Edit playlist name"
              autoFocus
            />
            <button
              className="playlist-manager__btn playlist-manager__btn--primary"
              onClick={handleSaveName}
              type="button"
            >
              Save
            </button>
            <button
              className="playlist-manager__btn"
              onClick={handleCancelEdit}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <h3 className="playlist-detail__name">{playlist.name}</h3>
            <button
              className="playlist-detail__edit-btn"
              onClick={() => {
                setEditing(true);
                setEditName(playlist.name);
              }}
              type="button"
              aria-label="Edit playlist name"
              title="Edit playlist name"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </>
        )}
      </div>

      {editError && (
        <p className="playlist-manager__validation-error" role="alert" style={{ marginBottom: '0.75rem' }}>
          {editError}
        </p>
      )}

      {/* Add tutorial section */}
      <div className="playlist-detail__add-section">
        <select
          className="playlist-detail__select"
          value={selectedTutorialId}
          onChange={(e) => setSelectedTutorialId(e.target.value)}
          aria-label="Select tutorial to add"
        >
          <option value="">— Select a tutorial to add —</option>
          {availableTutorials.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          className="playlist-manager__btn playlist-manager__btn--primary"
          onClick={handleAddTutorial}
          disabled={!selectedTutorialId}
          type="button"
        >
          Add Tutorial
        </button>
      </div>

      {/* Tutorial list */}
      <p className="playlist-detail__section-title">
        Tutorials ({playlist.tutorials.length})
      </p>

      {playlist.tutorials.length === 0 ? (
        <p className="playlist-detail__empty">
          No tutorials in this playlist. Add one above.
        </p>
      ) : (
        <ul className="playlist-detail__tutorials">
          {playlist.tutorials.map((pt, index) => (
            <li
              key={pt.tutorialId}
              className={`playlist-detail__tutorial-item slide-up${
                dragIndex === index ? ' playlist-detail__tutorial-item--dragging' : ''
              }${dragOverIndex === index ? ' playlist-detail__tutorial-item--drag-over' : ''}`}
              style={{ animationDelay: `${index * 0.04}s` }}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
            >
              <span
                className="playlist-detail__drag-handle"
                aria-hidden="true"
                title="Drag to reorder"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="9" cy="5" r="1.5" />
                  <circle cx="15" cy="5" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="19" r="1.5" />
                  <circle cx="15" cy="19" r="1.5" />
                </svg>
              </span>
              <span className="playlist-detail__tutorial-position">
                {pt.ordinalPosition + 1}
              </span>
              <span className="playlist-detail__tutorial-name">
                {pt.tutorialName}
              </span>
              <button
                className="playlist-detail__tutorial-remove"
                onClick={() => onRemoveTutorial(pt.tutorialId)}
                type="button"
                aria-label={`Remove ${pt.tutorialName} from playlist`}
                title={`Remove ${pt.tutorialName}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ─── Main PlaylistManager Component ────────────────────────────────────

export default function PlaylistManager() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail view state
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [allTutorials, setAllTutorials] = useState<Tutorial[]>([]);

  const fetchPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPlaylists();
      setPlaylists(data);
    } catch {
      setError('Failed to load playlists.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // ─── List View Handlers ──────────────────────────────────────

  const handleCreate = async (name: string): Promise<string | null> => {
    try {
      const created = await createPlaylist(name);
      setPlaylists((prev) => [...prev, created]);
      return null;
    } catch (err) {
      if (err instanceof ValidationError) {
        const body = err.body as { error?: string };
        return body.error || 'Validation error.';
      }
      return 'Failed to create playlist.';
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this playlist?')) {
      return;
    }
    try {
      await deletePlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Failed to delete playlist.');
    }
  };

  const handleView = async (id: number) => {
    try {
      setError(null);
      const [playlist, tutorials] = await Promise.all([
        getPlaylist(id),
        listTutorials(),
      ]);
      setSelectedPlaylist(playlist);
      setAllTutorials(tutorials);
    } catch {
      setError('Failed to load playlist details.');
    }
  };

  // ─── Detail View Handlers ─────────────────────────────────────

  const handleBack = () => {
    setSelectedPlaylist(null);
    // Refresh the list to pick up any changes
    fetchPlaylists();
  };

  const handleNameUpdate = async (name: string): Promise<string | null> => {
    if (!selectedPlaylist) return 'No playlist selected.';
    try {
      const updated = await updatePlaylistName(selectedPlaylist.id, name);
      setSelectedPlaylist((prev) =>
        prev ? { ...prev, name: updated.name } : prev
      );
      return null;
    } catch (err) {
      if (err instanceof ValidationError) {
        const body = err.body as { error?: string };
        return body.error || 'Validation error.';
      }
      return 'Failed to update playlist name.';
    }
  };

  const handleAddTutorial = async (tutorialId: string) => {
    if (!selectedPlaylist) return;
    try {
      await addTutorialToPlaylist(selectedPlaylist.id, tutorialId);
      // Refresh the playlist to get updated tutorials with ordinals
      const refreshed = await getPlaylist(selectedPlaylist.id);
      setSelectedPlaylist(refreshed);
    } catch {
      setError('Failed to add tutorial to playlist.');
    }
  };

  const handleRemoveTutorial = async (tutorialId: string) => {
    if (!selectedPlaylist) return;
    try {
      await removeTutorialFromPlaylist(selectedPlaylist.id, tutorialId);
      const refreshed = await getPlaylist(selectedPlaylist.id);
      setSelectedPlaylist(refreshed);
    } catch {
      setError('Failed to remove tutorial from playlist.');
    }
  };

  const handleReorder = async (reorderedTutorials: PlaylistTutorial[]) => {
    if (!selectedPlaylist) return;
    try {
      const tutorialIds = reorderedTutorials.map((t) => t.tutorialId);
      await reorderPlaylistTutorials(selectedPlaylist.id, tutorialIds);
      // Optimistically update the local state
      setSelectedPlaylist((prev) =>
        prev ? { ...prev, tutorials: reorderedTutorials } : prev
      );
    } catch {
      // Revert by re-fetching
      try {
        const refreshed = await getPlaylist(selectedPlaylist.id);
        setSelectedPlaylist(refreshed);
      } catch {
        setError('Failed to reorder tutorials.');
      }
    }
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="playlist-manager page">
      <h2>Playlists</h2>

      {error && (
        <div className="playlist-manager__error" role="alert">
          {error}
        </div>
      )}

      {loading && !selectedPlaylist ? (
        <SkeletonItems />
      ) : selectedPlaylist ? (
        <PlaylistDetailView
          playlist={selectedPlaylist}
          allTutorials={allTutorials}
          onBack={handleBack}
          onNameUpdate={handleNameUpdate}
          onAddTutorial={handleAddTutorial}
          onRemoveTutorial={handleRemoveTutorial}
          onReorder={handleReorder}
        />
      ) : (
        <PlaylistListView
          playlists={playlists}
          onView={handleView}
          onDelete={handleDelete}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
