import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlaylistManager from './PlaylistManager';
import type { Playlist, Tutorial, PlaylistTutorial } from '../types';

// Mock the API module
vi.mock('../services/api', () => ({
  getPlaylists: vi.fn(),
  createPlaylist: vi.fn(),
  getPlaylist: vi.fn(),
  updatePlaylistName: vi.fn(),
  deletePlaylist: vi.fn(),
  addTutorialToPlaylist: vi.fn(),
  reorderPlaylistTutorials: vi.fn(),
  removeTutorialFromPlaylist: vi.fn(),
  listTutorials: vi.fn(),
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
  getPlaylists,
  createPlaylist,
  getPlaylist,
  updatePlaylistName,
  deletePlaylist,
  addTutorialToPlaylist,
  removeTutorialFromPlaylist,
  listTutorials,
  ValidationError,
} from '../services/api';

const mockGetPlaylists = vi.mocked(getPlaylists);
const mockCreatePlaylist = vi.mocked(createPlaylist);
const mockGetPlaylist = vi.mocked(getPlaylist);
const mockUpdatePlaylistName = vi.mocked(updatePlaylistName);
const mockDeletePlaylist = vi.mocked(deletePlaylist);
const mockAddTutorialToPlaylist = vi.mocked(addTutorialToPlaylist);
const mockRemoveTutorialFromPlaylist = vi.mocked(removeTutorialFromPlaylist);
const mockListTutorials = vi.mocked(listTutorials);

const samplePlaylists: Playlist[] = [
  {
    id: 1,
    name: 'Favorites',
    createdAt: '2024-01-01T00:00:00Z',
    tutorials: [
      { tutorialId: 't1', tutorialName: 'Song 1', ordinalPosition: 0 },
    ],
  },
  {
    id: 2,
    name: 'Learning',
    createdAt: '2024-01-02T00:00:00Z',
    tutorials: [],
  },
];

const sampleTutorials: Tutorial[] = [
  { id: 't1', name: 'Song 1', videoFilename: 's1.mp4', hasSubtitle: true, hasTablature: false },
  { id: 't2', name: 'Song 2', videoFilename: 's2.mp4', hasSubtitle: false, hasTablature: true },
  { id: 't3', name: 'Song 3', videoFilename: 's3.mp4', hasSubtitle: true, hasTablature: true },
];

function renderPlaylistManager() {
  return render(<PlaylistManager />);
}

describe('PlaylistManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Loading State ────────────────────────────────────────────

  it('shows loading state initially', () => {
    mockGetPlaylists.mockReturnValue(new Promise(() => {}));
    renderPlaylistManager();

    expect(screen.getByRole('status', { name: 'Loading playlists' })).toBeInTheDocument();
  });

  // ─── List View ────────────────────────────────────────────────

  it('renders the page title', async () => {
    mockGetPlaylists.mockResolvedValue([]);
    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Playlists' })).toBeInTheDocument();
    });
  });

  it('shows empty state when no playlists exist', async () => {
    mockGetPlaylists.mockResolvedValue([]);
    renderPlaylistManager();

    await waitFor(() => {
      expect(
        screen.getByText('No playlists yet. Create one above.')
      ).toBeInTheDocument();
    });
  });

  it('renders playlist names and tutorial counts', async () => {
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });
    expect(screen.getByText('Learning')).toBeInTheDocument();
    expect(screen.getByText('1 tutorial')).toBeInTheDocument();
    expect(screen.getByText('0 tutorials')).toBeInTheDocument();
  });

  it('renders View and Delete buttons for each playlist', async () => {
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'View' })).toHaveLength(2);
    });
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
  });

  // ─── Create Playlist ──────────────────────────────────────────

  it('allows creating a new playlist', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue([]);
    const newPlaylist: Playlist = {
      id: 3,
      name: 'New List',
      createdAt: '2024-03-01T00:00:00Z',
      tutorials: [],
    };
    mockCreatePlaylist.mockResolvedValue(newPlaylist);

    renderPlaylistManager();

    await waitFor(() => {
      expect(
        screen.getByText('No playlists yet. Create one above.')
      ).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New playlist name');
    await user.type(input, 'New List');

    await user.click(screen.getByRole('button', { name: 'Create Playlist' }));

    await waitFor(() => {
      expect(screen.getByText('New List')).toBeInTheDocument();
    });
    expect(mockCreatePlaylist).toHaveBeenCalledWith('New List');
  });

  it('shows creating state while creating', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue([]);
    mockCreatePlaylist.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({} as Playlist), 100))
    );

    renderPlaylistManager();

    await waitFor(() => {
      expect(
        screen.getByText('No playlists yet. Create one above.')
      ).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New playlist name');
    await user.type(input, 'Test');
    await user.click(screen.getByRole('button', { name: 'Create Playlist' }));

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
  });

  it('prevents creating a playlist with empty name', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue([]);

    renderPlaylistManager();

    await waitFor(() => {
      expect(
        screen.getByText('No playlists yet. Create one above.')
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Create Playlist' }));

    await waitFor(() => {
      expect(
        screen.getByText('Playlist name cannot be empty.')
      ).toBeInTheDocument();
    });
  });

  it('shows validation error when createPlaylist returns error', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue([]);
    mockCreatePlaylist.mockRejectedValue(
      new ValidationError({ error: 'Name already exists' })
    );

    renderPlaylistManager();

    await waitFor(() => {
      expect(
        screen.getByText('No playlists yet. Create one above.')
      ).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New playlist name');
    await user.type(input, 'Duplicate');
    await user.click(screen.getByRole('button', { name: 'Create Playlist' }));

    await waitFor(() => {
      expect(screen.getByText('Name already exists')).toBeInTheDocument();
    });
  });

  it('shows generic error when createPlaylist fails', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue([]);
    mockCreatePlaylist.mockRejectedValue(new Error('Network error'));

    renderPlaylistManager();

    await waitFor(() => {
      expect(
        screen.getByText('No playlists yet. Create one above.')
      ).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New playlist name');
    await user.type(input, 'Test');
    await user.click(screen.getByRole('button', { name: 'Create Playlist' }));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to create playlist.')
      ).toBeInTheDocument();
    });
  });

  it('creates on Enter key press', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue([]);
    const newPlaylist: Playlist = {
      id: 3,
      name: 'Enter Created',
      createdAt: '2024-03-01T00:00:00Z',
      tutorials: [],
    };
    mockCreatePlaylist.mockResolvedValue(newPlaylist);

    renderPlaylistManager();

    await waitFor(() => {
      expect(
        screen.getByText('No playlists yet. Create one above.')
      ).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New playlist name');
    await user.type(input, 'Enter Created');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Enter Created')).toBeInTheDocument();
    });
  });

  // ─── Delete Playlist ──────────────────────────────────────────

  it('shows confirmation dialog before deleting', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    expect(
      screen.getByText('Are you sure you want to delete this playlist?')
    ).toBeInTheDocument();
  });

  it('deletes playlist after confirmation', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockDeletePlaylist.mockResolvedValue(undefined);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    // Click the "Delete" button inside the confirmation dialog
    const dialog = screen.getByRole('dialog', { name: 'Confirm deletion' });
    const confirmDelete = within(dialog).getByRole('button', { name: 'Delete' });
    await user.click(confirmDelete);

    await waitFor(() => {
      expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
    });
    expect(mockDeletePlaylist).toHaveBeenCalledWith(1);
  });

  it('cancels deletion when Cancel is clicked', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });

  it('shows error when delete fails', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockDeletePlaylist.mockRejectedValue(new Error('Network error'));

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    // Click the "Delete" button inside the confirmation dialog
    const dialog = screen.getByRole('dialog', { name: 'Confirm deletion' });
    const confirmDelete = within(dialog).getByRole('button', { name: 'Delete' });
    await user.click(confirmDelete);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to delete playlist.')
      ).toBeInTheDocument();
    });
  });

  // ─── Error State ──────────────────────────────────────────────

  it('shows error when fetching playlists fails', async () => {
    mockGetPlaylists.mockRejectedValue(new Error('Network error'));
    renderPlaylistManager();

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load playlists.')
      ).toBeInTheDocument();
    });
  });

  // ─── Detail View ──────────────────────────────────────────────

  it('navigates to detail view on View click', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[0]);
    mockListTutorials.mockResolvedValue(sampleTutorials);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });
  });

  it('shows back button in detail view', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[0]);
    mockListTutorials.mockResolvedValue(sampleTutorials);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByLabelText('Back to playlists')).toBeInTheDocument();
    });
  });

  it('returns to list view from detail view', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[0]);
    mockListTutorials.mockResolvedValue(sampleTutorials);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByLabelText('Back to playlists')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Back to playlists'));

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });
  });

  it('shows error when loading detail view fails', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockRejectedValue(new Error('Network error'));

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load playlist details.')
      ).toBeInTheDocument();
    });
  });

  // ─── Edit Playlist Name ───────────────────────────────────────

  it('allows editing playlist name in detail view', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[0]);
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockUpdatePlaylistName.mockResolvedValue({
      ...samplePlaylists[0],
      name: 'Renamed',
    });

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Edit playlist name'));

    const nameInput = screen.getByLabelText('Edit playlist name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Renamed')).toBeInTheDocument();
    });
    expect(mockUpdatePlaylistName).toHaveBeenCalledWith(1, 'Renamed');
  });

  it('cancels editing playlist name', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[0]);
    mockListTutorials.mockResolvedValue(sampleTutorials);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Edit playlist name'));

    const nameInput = screen.getByLabelText('Edit playlist name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Changed');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Should still show original name
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });

  it('prevents saving empty playlist name', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[0]);
    mockListTutorials.mockResolvedValue(sampleTutorials);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Edit playlist name'));

    const nameInput = screen.getByLabelText('Edit playlist name');
    await user.clear(nameInput);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(
        screen.getByText('Playlist name cannot be empty.')
      ).toBeInTheDocument();
    });
  });

  it('shows validation error on name update failure', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[0]);
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockUpdatePlaylistName.mockRejectedValue(
      new ValidationError({ error: 'Name too long' })
    );

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Edit playlist name'));

    const nameInput = screen.getByLabelText('Edit playlist name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Too long name');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Name too long')).toBeInTheDocument();
    });
  });

  // ─── Add Tutorial to Playlist ─────────────────────────────────

  it('shows add tutorial section in detail view', async () => {
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[0]);
    mockListTutorials.mockResolvedValue(sampleTutorials);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByLabelText('Select tutorial to add')).toBeInTheDocument();
    });
  });

  it('adds a tutorial to the playlist', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist
      .mockResolvedValueOnce(samplePlaylists[0]) // initial load
      .mockResolvedValueOnce({
        ...samplePlaylists[0],
        tutorials: [
          ...samplePlaylists[0].tutorials,
          { tutorialId: 't2', tutorialName: 'Song 2', ordinalPosition: 1 },
        ],
      }); // after add
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockAddTutorialToPlaylist.mockResolvedValue(undefined);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Select tutorial to add');
    await user.selectOptions(select, 't2');

    await user.click(screen.getByRole('button', { name: 'Add Tutorial' }));

    await waitFor(() => {
      expect(mockAddTutorialToPlaylist).toHaveBeenCalledWith(1, 't2');
    });
  });

  it('shows error when adding tutorial fails', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[0]);
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockAddTutorialToPlaylist.mockRejectedValue(new Error('Network error'));

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Select tutorial to add');
    await user.selectOptions(select, 't2');

    await user.click(screen.getByRole('button', { name: 'Add Tutorial' }));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to add tutorial to playlist.')
      ).toBeInTheDocument();
    });
  });

  // ─── Remove Tutorial from Playlist ────────────────────────────

  it('removes a tutorial from the playlist', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist
      .mockResolvedValueOnce(samplePlaylists[0])
      .mockResolvedValueOnce({
        ...samplePlaylists[0],
        tutorials: [],
      });
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockRemoveTutorialFromPlaylist.mockResolvedValue(undefined);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Remove Song 1 from playlist'));

    await waitFor(() => {
      expect(mockRemoveTutorialFromPlaylist).toHaveBeenCalledWith(1, 't1');
    });
  });

  it('shows error when removing tutorial fails', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[0]);
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockRemoveTutorialFromPlaylist.mockRejectedValue(new Error('Network error'));

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Remove Song 1 from playlist'));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to remove tutorial from playlist.')
      ).toBeInTheDocument();
    });
  });

  // ─── Empty Tutorial List in Detail ────────────────────────────

  it('shows empty tutorial message in detail view', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);
    mockGetPlaylist.mockResolvedValue(samplePlaylists[1]); // Learning (empty)
    mockListTutorials.mockResolvedValue(sampleTutorials);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Learning')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'View' })[1]);

    await waitFor(() => {
      expect(
        screen.getByText('No tutorials in this playlist. Add one above.')
      ).toBeInTheDocument();
    });
  });

  // ─── Confirmation Dialog Accessibility ────────────────────────

  it('confirmation dialog has correct accessibility attributes', async () => {
    const user = userEvent.setup();
    mockGetPlaylists.mockResolvedValue(samplePlaylists);

    renderPlaylistManager();

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Confirm deletion');
  });
});
