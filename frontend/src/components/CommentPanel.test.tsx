import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentPanel from './CommentPanel';
import type { Comment } from '../types';

// Mock the API module
vi.mock('../services/api', () => ({
  getComments: vi.fn(),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  ValidationError: class ValidationError extends Error {
    status = 400;
    statusText = 'Bad Request';
    body: unknown;
    constructor(body: unknown) {
      super('Validation error');
      this.name = 'ValidationError';
      this.body = body;
    }
  },
}));

import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  ValidationError,
} from '../services/api';

const mockGetComments = vi.mocked(getComments);
const mockCreateComment = vi.mocked(createComment);
const mockUpdateComment = vi.mocked(updateComment);
const mockDeleteComment = vi.mocked(deleteComment);

const sampleComments: Comment[] = [
  {
    id: 1,
    tutorialId: 't1',
    text: 'Great lesson!',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 2,
    tutorialId: 't1',
    text: 'Very helpful, thanks!',
    createdAt: '2024-01-16T14:00:00Z',
    updatedAt: '2024-01-16T15:00:00Z',
  },
];

function renderCommentPanel(tutorialId = 't1') {
  return render(<CommentPanel tutorialId={tutorialId} />);
}

describe('CommentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Loading State ────────────────────────────────────────────

  it('shows loading state initially', () => {
    mockGetComments.mockReturnValue(new Promise(() => {}));
    renderCommentPanel();

    expect(screen.getByText('Loading comments…')).toBeInTheDocument();
  });

  // ─── Empty State ──────────────────────────────────────────────

  it('shows empty state when no comments exist', async () => {
    mockGetComments.mockResolvedValue([]);
    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });
  });

  // ─── Comments List ────────────────────────────────────────────

  it('renders comments from the API', async () => {
    mockGetComments.mockResolvedValue(sampleComments);
    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });
    expect(screen.getByText('Very helpful, thanks!')).toBeInTheDocument();
  });

  it('shows (edited) label for updated comments', async () => {
    mockGetComments.mockResolvedValue(sampleComments);
    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText(/(edited)/)).toBeInTheDocument();
    });
  });

  it('renders the comment panel title', async () => {
    mockGetComments.mockResolvedValue([]);
    renderCommentPanel();

    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  // ─── Error State ──────────────────────────────────────────────

  it('shows error when fetching comments fails', async () => {
    mockGetComments.mockRejectedValue(new Error('Network error'));
    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Failed to load comments.')).toBeInTheDocument();
    });
  });

  // ─── Add Comment ──────────────────────────────────────────────

  it('allows adding a new comment', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue([]);
    const newComment: Comment = {
      id: 3,
      tutorialId: 't1',
      text: 'New comment',
      createdAt: '2024-02-01T00:00:00Z',
    };
    mockCreateComment.mockResolvedValue(newComment);

    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText('New comment text');
    await user.type(textarea, 'New comment');

    const addButton = screen.getByRole('button', { name: 'Add Comment' });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('New comment')).toBeInTheDocument();
    });
    expect(mockCreateComment).toHaveBeenCalledWith('t1', 'New comment');
  });

  it('shows submitting state while adding', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue([]);
    mockCreateComment.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({} as Comment), 100))
    );

    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText('New comment text');
    await user.type(textarea, 'Test');
    await user.click(screen.getByRole('button', { name: 'Add Comment' }));

    expect(screen.getByRole('button', { name: 'Adding…' })).toBeDisabled();
  });

  it('prevents adding an empty comment', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue([]);

    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: 'Add Comment' });
    expect(addButton).toBeDisabled();
  });

  it('shows error when add fails with ValidationError', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue([]);
    mockCreateComment.mockRejectedValue(
      new ValidationError({ error: 'Comment too long' })
    );

    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText('New comment text');
    await user.type(textarea, 'Valid text');
    await user.click(screen.getByRole('button', { name: 'Add Comment' }));

    await waitFor(() => {
      expect(screen.getByText('Comment too long')).toBeInTheDocument();
    });
  });

  it('shows generic error when add fails with non-ValidationError', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue([]);
    mockCreateComment.mockRejectedValue(new Error('Network error'));

    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText('New comment text');
    await user.type(textarea, 'Valid text');
    await user.click(screen.getByRole('button', { name: 'Add Comment' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to add comment.')).toBeInTheDocument();
    });
  });

  // ─── Cancel Add ───────────────────────────────────────────────

  it('shows Cancel button when text is entered and clears on click', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue([]);

    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText('New comment text');
    await user.type(textarea, 'Some text');

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeInTheDocument();

    await user.click(cancelButton);
    expect(textarea).toHaveValue('');
  });

  // ─── Character Count ──────────────────────────────────────────

  it('displays character count in add form', async () => {
    mockGetComments.mockResolvedValue([]);
    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });

    expect(screen.getByText('0/500')).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue([]);

    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText('New comment text');
    await user.type(textarea, 'Hello');

    expect(screen.getByText('5/500')).toBeInTheDocument();
  });

  it('prevents typing beyond MAX_COMMENT_LENGTH', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue([]);

    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText('New comment text');
    const longText = 'a'.repeat(600);
    await user.type(textarea, longText);

    // Should be capped at 500
    expect(textarea).toHaveValue('a'.repeat(500));
    expect(screen.getByText('500/500')).toBeInTheDocument();
  });

  // ─── Edit Comment ─────────────────────────────────────────────

  it('allows editing a comment', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue(sampleComments);
    const updated: Comment = {
      id: 1,
      tutorialId: 't1',
      text: 'Updated text',
      createdAt: '2024-01-15T10:30:00Z',
    };
    mockUpdateComment.mockResolvedValue(updated);

    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText('Edit comment');
    await user.click(editButtons[0]);

    const editTextarea = screen.getByLabelText('Edit comment text');
    await user.clear(editTextarea);
    await user.type(editTextarea, 'Updated text');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Updated text')).toBeInTheDocument();
    });
    expect(mockUpdateComment).toHaveBeenCalledWith('t1', 1, 'Updated text');
  });

  it('shows edit error on ValidationError during save', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue(sampleComments);
    mockUpdateComment.mockRejectedValue(
      new ValidationError({ error: 'Text too long' })
    );

    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText('Edit comment');
    await user.click(editButtons[0]);

    const editTextarea = screen.getByLabelText('Edit comment text');
    await user.clear(editTextarea);
    await user.type(editTextarea, 'Updated');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Text too long')).toBeInTheDocument();
    });
  });

  it('shows generic edit error on non-ValidationError', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue(sampleComments);
    mockUpdateComment.mockRejectedValue(new Error('Network error'));

    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText('Edit comment');
    await user.click(editButtons[0]);

    const editTextarea = screen.getByLabelText('Edit comment text');
    await user.clear(editTextarea);
    await user.type(editTextarea, 'Updated');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to update comment.')).toBeInTheDocument();
    });
  });

  it('prevents saving empty edit', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue(sampleComments);

    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText('Edit comment');
    await user.click(editButtons[0]);

    const editTextarea = screen.getByLabelText('Edit comment text');
    await user.clear(editTextarea);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(
        screen.getByText('Comment text cannot be empty.')
      ).toBeInTheDocument();
    });
  });

  it('cancels editing and restores original text', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue(sampleComments);

    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText('Edit comment');
    await user.click(editButtons[0]);

    const editTextarea = screen.getByLabelText('Edit comment text');
    await user.clear(editTextarea);
    await user.type(editTextarea, 'Changed');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Should still show original text
    expect(screen.getByText('Great lesson!')).toBeInTheDocument();
  });

  // ─── Delete Comment ───────────────────────────────────────────

  it('shows confirmation dialog before deleting', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue(sampleComments);

    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete comment');
    await user.click(deleteButtons[0]);

    expect(
      screen.getByText('Are you sure you want to delete this comment?')
    ).toBeInTheDocument();
  });

  it('deletes comment after confirmation', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue(sampleComments);
    mockDeleteComment.mockResolvedValue(undefined);

    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete comment');
    await user.click(deleteButtons[0]);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('Great lesson!')).not.toBeInTheDocument();
    });
    expect(mockDeleteComment).toHaveBeenCalledWith('t1', 1);
  });

  it('cancels deletion when Cancel is clicked in dialog', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue(sampleComments);

    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete comment');
    await user.click(deleteButtons[0]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Comment should still be visible
    expect(screen.getByText('Great lesson!')).toBeInTheDocument();
  });

  it('shows error when delete fails', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue(sampleComments);
    mockDeleteComment.mockRejectedValue(new Error('Network error'));

    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete comment');
    await user.click(deleteButtons[0]);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to delete comment.')).toBeInTheDocument();
    });
  });

  // ─── Keyboard Shortcut ────────────────────────────────────────

  it('submits comment on Enter without Shift', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue([]);
    const newComment: Comment = {
      id: 3,
      tutorialId: 't1',
      text: 'Enter submit',
      createdAt: '2024-02-01T00:00:00Z',
    };
    mockCreateComment.mockResolvedValue(newComment);

    renderCommentPanel();

    await waitFor(() => {
      expect(
        screen.getByText('No comments yet. Be the first to add one.')
      ).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText('New comment text');
    await user.type(textarea, 'Enter submit');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Enter submit')).toBeInTheDocument();
    });
  });

  // ─── Avatar ───────────────────────────────────────────────────

  it('renders avatars with initials for comments', async () => {
    mockGetComments.mockResolvedValue(sampleComments);
    const { container } = renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    // "Great lesson!" -> initials "GL" (G from Great, l from lesson!)
    // "Very helpful, thanks!" -> initials "VH" (V from Very, H from helpful,)
    // Avatar span has aria-hidden="true", so use container.querySelector
    const avatars = container.querySelectorAll('.comment-panel__avatar');
    expect(avatars.length).toBe(2);
    expect(avatars[0]).toHaveTextContent('GL');
    expect(avatars[1]).toHaveTextContent('VH');
  });

  // ─── Confirm Dialog Accessibility ─────────────────────────────

  it('confirmation dialog has correct accessibility attributes', async () => {
    const user = userEvent.setup();
    mockGetComments.mockResolvedValue(sampleComments);

    renderCommentPanel();

    await waitFor(() => {
      expect(screen.getByText('Great lesson!')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete comment');
    await user.click(deleteButtons[0]);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Confirm deletion');
  });
});
