import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SongLibrary from './SongLibrary';
import type { Tutorial, Preference } from '../types';

// Mock the API module
vi.mock('../services/api', () => ({
  listTutorials: vi.fn(),
  getPreferences: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { listTutorials, getPreferences } from '../services/api';

const mockListTutorials = vi.mocked(listTutorials);
const mockGetPreferences = vi.mocked(getPreferences);

function renderSongLibrary() {
  return render(
    <MemoryRouter>
      <SongLibrary />
    </MemoryRouter>
  );
}

const sampleTutorials: Tutorial[] = [
  {
    id: 'stairway-to-heaven',
    name: 'Stairway to Heaven',
    videoFilename: 'stairway.mp4',
    hasSubtitle: true,
    hasTablature: true,
  },
  {
    id: 'smoke-on-the-water',
    name: 'Smoke on the Water',
    videoFilename: 'smoke.mp4',
    hasSubtitle: false,
    hasTablature: true,
  },
  {
    id: 'wonderwall',
    name: 'Wonderwall',
    videoFilename: 'wonderwall.mp4',
    hasSubtitle: true,
    hasTablature: false,
  },
];

const samplePreferences: Record<string, Preference> = {
  'stairway-to-heaven': {
    tutorialId: 'stairway-to-heaven',
    difficultyLevel: 'Advanced',
    favorite: true,
  },
  'smoke-on-the-water': {
    tutorialId: 'smoke-on-the-water',
    difficultyLevel: 'Beginner',
    favorite: false,
  },
};

describe('SongLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockListTutorials.mockReturnValue(new Promise(() => {})); // never resolves
    renderSongLibrary();

    // Loading state shows skeleton rows
    expect(screen.getByText('Song Library')).toBeInTheDocument();
    expect(document.querySelector('.song-library__skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no tutorials are available', async () => {
    mockListTutorials.mockResolvedValue([]);
    renderSongLibrary();

    await waitFor(() => {
      expect(screen.getByText('No tutorials available')).toBeInTheDocument();
    });
  });

  it('renders tutorial names in the table and cards', async () => {
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockGetPreferences.mockRejectedValue(new Error('not found'));
    renderSongLibrary();

    await waitFor(() => {
      // Names appear in both table and card views
      const stairway = screen.getAllByText('Stairway to Heaven');
      expect(stairway.length).toBe(2);
    });
    const smoke = screen.getAllByText('Smoke on the Water');
    expect(smoke.length).toBe(2);
    const wonderwall = screen.getAllByText('Wonderwall');
    expect(wonderwall.length).toBe(2);
  });

  it('renders subtitle availability icons correctly', async () => {
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockGetPreferences.mockRejectedValue(new Error('not found'));
    renderSongLibrary();

    await waitFor(() => {
      const stairway = screen.getAllByText('Stairway to Heaven');
      expect(stairway.length).toBe(2);
    });

    // Table view badges have aria-labels; card view badges do not
    // So we get 3 from table view: Smoke (No subtitles), Stairway (Subtitles available), Wonderwall (Subtitles available)
    const subtitleBadges = screen.getAllByLabelText(/subtitles|no subtitles/i);
    expect(subtitleBadges).toHaveLength(3);
    // Table: Smoke (no subs), Stairway (has subs), Wonderwall (has subs)
    expect(subtitleBadges[0]).toHaveTextContent('✗');
    expect(subtitleBadges[1]).toHaveTextContent('✓');
    expect(subtitleBadges[2]).toHaveTextContent('✓');
  });

  it('renders tablature availability icons correctly', async () => {
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockGetPreferences.mockRejectedValue(new Error('not found'));
    renderSongLibrary();

    await waitFor(() => {
      const stairway = screen.getAllByText('Stairway to Heaven');
      expect(stairway.length).toBe(2);
    });

    // Table view badges have aria-labels; card view badges do not
    // So we get 3 from table view: Smoke (Tablature available), Stairway (Tablature available), Wonderwall (No tablature)
    const tabBadges = screen.getAllByLabelText(/tablature|no tablature/i);
    expect(tabBadges).toHaveLength(3);
    // Table: Smoke (has tabs), Stairway (has tabs), Wonderwall (no tabs)
    expect(tabBadges[0]).toHaveTextContent('✓');
    expect(tabBadges[1]).toHaveTextContent('✓');
    expect(tabBadges[2]).toHaveTextContent('✗');
  });

  it('displays difficulty levels from preferences', async () => {
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockGetPreferences.mockImplementation(async (id: string) => {
      if (samplePreferences[id]) return samplePreferences[id];
      throw new Error('not found');
    });
    renderSongLibrary();

    await waitFor(() => {
      // Use getAllByText to avoid conflict with filter dropdown options
      const advancedBadges = screen.getAllByText('Advanced');
      expect(advancedBadges.length).toBeGreaterThanOrEqual(1);
      // At least one should be a level badge (not just the dropdown option)
      expect(advancedBadges.some((el) => el.classList.contains('level-badge'))).toBe(true);
    });
    const beginnerBadges = screen.getAllByText('Beginner');
    expect(beginnerBadges.some((el) => el.classList.contains('level-badge'))).toBe(true);
  });

  it('navigates to tutorial detail on row click', async () => {
    const user = userEvent.setup();
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockGetPreferences.mockRejectedValue(new Error('not found'));
    renderSongLibrary();

    await waitFor(() => {
      const stairway = screen.getAllByText('Stairway to Heaven');
      expect(stairway.length).toBe(2);
    });

    // Both table row and card have role="link", click the first one
    const rows = screen.getAllByRole('link', { name: /stairway to heaven/i });
    await user.click(rows[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/tutorials/stairway-to-heaven');
  });

  it('shows error state when API call fails', async () => {
    mockListTutorials.mockRejectedValue(new Error('Network error'));
    renderSongLibrary();

    await waitFor(() => {
      expect(screen.getByText(/failed to load tutorials/i)).toBeInTheDocument();
    });
  });

  it('renders the Song Library heading', async () => {
    mockListTutorials.mockResolvedValue([]);
    renderSongLibrary();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Song Library' })).toBeInTheDocument();
    });
  });

  it('renders table headers', async () => {
    mockListTutorials.mockResolvedValue(sampleTutorials);
    mockGetPreferences.mockRejectedValue(new Error('not found'));
    renderSongLibrary();

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
    // "Subtitles" appears in table header and card meta text
    const subtitles = screen.getAllByText('Subtitles');
    expect(subtitles.length).toBeGreaterThanOrEqual(1);
    // "Tablature" appears in table header and card meta text
    const tablature = screen.getAllByText('Tablature');
    expect(tablature.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Level')).toBeInTheDocument();
  });
});
