import { useEffect, useState, useCallback } from 'react';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  ValidationError,
} from '../services/api';
import type { Comment } from '../types';
import './CommentPanel.css';

interface CommentPanelProps {
  tutorialId: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return text.trim()[0]?.toUpperCase() || '?';
}

function getAvatarColor(id: number): string {
  const colors = [
    'var(--color-accent)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-danger)',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
  ];
  return colors[id % colors.length];
}

export default function CommentPanel({ tutorialId }: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getComments(tutorialId);
      setComments(data);
    } catch {
      setError('Failed to load comments.');
    } finally {
      setLoading(false);
    }
  }, [tutorialId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAdd = async () => {
    const trimmed = newText.trim();
    if (!trimmed) {
      setError('Comment text cannot be empty.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const created = await createComment(tutorialId, trimmed);
      setComments((prev) => [created, ...prev]);
      setNewText('');
    } catch (err) {
      if (err instanceof ValidationError) {
        const body = err.body as { error?: string };
        setError(body.error || 'Validation error.');
      } else {
        setError('Failed to add comment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditError(null);
  };

  const handleSaveEdit = async (commentId: number) => {
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditError('Comment text cannot be empty.');
      return;
    }

    try {
      setEditError(null);
      const updated = await updateComment(tutorialId, commentId, trimmed);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c))
      );
      setEditingId(null);
      setEditText('');
    } catch (err) {
      if (err instanceof ValidationError) {
        const body = err.body as { error?: string };
        setEditError(body.error || 'Validation error.');
      } else {
        setEditError('Failed to update comment.');
      }
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await deleteComment(tutorialId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      setError('Failed to delete comment.');
    }
  };

  return (
    <div className="comment-panel">
      <h3 className="comment-panel__title">Comments</h3>

      {/* Add comment form */}
      <div className="comment-panel__form">
        <textarea
          className={`comment-panel__textarea${error ? ' comment-panel__textarea--error' : ''}`}
          placeholder="Add a comment…"
          value={newText}
          onChange={(e) => {
            setNewText(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          rows={3}
          aria-label="New comment text"
        />
        <div className="comment-panel__form-footer">
          {error && (
            <p className="comment-panel__error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn btn--primary"
            onClick={handleAdd}
            disabled={submitting || !newText.trim()}
            type="button"
          >
            {submitting ? 'Adding…' : 'Add Comment'}
          </button>
        </div>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="comment-panel__loading" role="status">
          Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <p className="comment-panel__empty">No comments yet. Be the first to add one.</p>
      ) : (
        <ul className="comment-panel__list">
          {comments.map((comment) => (
            <li key={comment.id} className="comment-panel__item">
              {editingId === comment.id ? (
                <div className="comment-panel__edit-form">
                  <textarea
                    className={`comment-panel__textarea comment-panel__textarea--edit${editError ? ' comment-panel__textarea--error' : ''}`}
                    value={editText}
                    onChange={(e) => {
                      setEditText(e.target.value);
                      if (editError) setEditError(null);
                    }}
                    rows={3}
                    aria-label="Edit comment text"
                  />
                  {editError && (
                    <p className="comment-panel__error" role="alert">
                      {editError}
                    </p>
                  )}
                  <div className="comment-panel__edit-actions">
                    <button
                      className="btn btn--primary"
                      onClick={() => handleSaveEdit(comment.id)}
                      type="button"
                    >
                      Save
                    </button>
                    <button
                      className="btn"
                      onClick={handleCancelEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="comment-panel__body">
                    <span
                      className="comment-panel__avatar"
                      style={{ backgroundColor: getAvatarColor(comment.id) }}
                      aria-hidden="true"
                    >
                      {getInitials(comment.text)}
                    </span>
                    <div className="comment-panel__content">
                      <p className="comment-panel__text">{comment.text}</p>
                      <span className="comment-panel__date">
                        {formatDate(comment.createdAt)}
                        {comment.updatedAt && ' (edited)'}
                      </span>
                    </div>
                  </div>
                  <div className="comment-panel__actions">
                    <button
                      className="comment-panel__action-btn"
                      onClick={() => handleEdit(comment)}
                      type="button"
                      aria-label="Edit comment"
                      title="Edit comment"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="comment-panel__action-btn comment-panel__action-btn--delete"
                      onClick={() => handleDelete(comment.id)}
                      type="button"
                      aria-label="Delete comment"
                      title="Delete comment"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
