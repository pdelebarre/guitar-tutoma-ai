import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TutorialDetail from './TutorialDetail';
import type { Tutorial } from '../types';

// Mock child components
vi.mock('../components/VideoPlayer', () => ({
  default: ({ tutorialId, hasSubtitle }: { tutorialId: string; hasSubtitle: boolean }) => (
    <div data-testid="video-player" data-tutorial-id={tutorialId} data-has-subtitle={hasSubtitle}>
      Video Player
    </div>
  ),
}));

vi.mock('../components/TablatureViewer', () => ({
  default: ({ tutorialId }: { tutorialId: string }) => (
    <div data-testid="tablature-viewer" data-tutorial-id={tutorialId}>
      Tablature Viewer
    </div>
  ),
}));

vi.mock('../components/CommentPanel', () => ({
  default: ({ tutorialId }: { tutorialId: string }) => (
    <div data-testid="comment-panel" data-tutorial-id={tutorialId}>
      Comment Panel
    </div>
  ),
}));

vi.mock('../components/PreferencePanel', () => ({
  default: ({ tutorialId }: { tutorialId: string }) => (
    <div data-testid="preference-panel" data-tutorial-id={tutorialId}>
      Preference Panel
    </div>
  ),
}));

// Mock the API module - return a never-resolving promise by default
// so that tests that don't explicitly mock still show loading state
vi.mock('../services/api', () => ({
  getTutorial: vi.fn().mockReturnValue(new Promise(() => {})),
}));

import { getTutorial } from '../services/api';

const mockGetTutorial = vi.mocked(getTutorial);

const sampleTutorial: Tutorial = {
  id: 'stairway-to-heaven',
  name: 'Stairway to Heaven',
  videoFilename: 'stairway.mp4',
  hasSubtitle: true,
  hasTablature: true,
};

const tutorialNoTablature: Tutorial = {
  id: 'wonderwall',
  name: 'Wonderwall',
  videoFilename: 'wonderwall.mp4',
  hasSubtitle: false,
  hasTablature: false,
};

function renderTutorialDetail(id = 'stairway-to-heaven') {
  return render(
    <MemoryRouter initialEntries={[`/tutorials/${id}`]}>
      <Routes>
        <Route path="/tutorials/:id" element={<TutorialDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TutorialDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset scroll position
    window.scrollTo = vi.fn();
  });

  // ─── Loading State ────────────────────────────────────────────

  it('shows loading state initially', () => {
    mockGetTutorial.mockReturnValue(new Promise(() => {}));
    renderTutorialDetail();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  // ─── Error State ──────────────────────────────────────────────

  it('shows error when tutorial fetch fails', async () => {
    mockGetTutorial.mockRejectedValue(new Error('Network error'));
    renderTutorialDetail();

    await waitFor(() => {
      expect(
        screen.getByText(/Tutorial not found or failed to load/)
      ).toBeInTheDocument();
    });
  });

  // ─── Loaded State ─────────────────────────────────────────────

  it('renders tutorial name and breadcrumbs', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      // Name appears in both breadcrumb and h2 title
      const names = screen.getAllByText('Stairway to Heaven');
      expect(names.length).toBe(2);
    });

    expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument();
  });

  it('renders all child components', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
    });
    expect(screen.getByTestId('tablature-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('comment-panel')).toBeInTheDocument();
    expect(screen.getByTestId('preference-panel')).toBeInTheDocument();
  });

  it('passes correct props to VideoPlayer', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      const player = screen.getByTestId('video-player');
      expect(player).toHaveAttribute('data-tutorial-id', 'stairway-to-heaven');
      expect(player).toHaveAttribute('data-has-subtitle', 'true');
    });
  });

  it('passes correct props to TablatureViewer', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      const viewer = screen.getByTestId('tablature-viewer');
      expect(viewer).toHaveAttribute('data-tutorial-id', 'stairway-to-heaven');
    });
  });

  it('passes correct props to CommentPanel', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      const panel = screen.getByTestId('comment-panel');
      expect(panel).toHaveAttribute('data-tutorial-id', 'stairway-to-heaven');
    });
  });

  it('passes correct props to PreferencePanel', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      const panel = screen.getByTestId('preference-panel');
      expect(panel).toHaveAttribute('data-tutorial-id', 'stairway-to-heaven');
    });
  });

  // ─── Subtitle Badge ───────────────────────────────────────────

  it('shows subtitle badge when tutorial has subtitles', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      expect(screen.getByText('Subtitles available')).toBeInTheDocument();
    });
  });

  it('does not show subtitle badge when tutorial has no subtitles', async () => {
    mockGetTutorial.mockResolvedValue(tutorialNoTablature);
    renderTutorialDetail('wonderwall');

    await waitFor(() => {
      expect(screen.queryByText('Subtitles available')).not.toBeInTheDocument();
    });
  });

  // ─── Tablature Section ────────────────────────────────────────

  it('shows tablature section when tutorial has tablature', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      // "Tablature" appears in both sub-nav button and section heading
      const tablatureElements = screen.getAllByText('Tablature');
      expect(tablatureElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('hides tablature section when tutorial has no tablature', async () => {
    mockGetTutorial.mockResolvedValue(tutorialNoTablature);
    renderTutorialDetail('wonderwall');

    await waitFor(() => {
      // "Wonderwall" appears in both breadcrumb and h2 title
      const names = screen.getAllByText('Wonderwall');
      expect(names.length).toBe(2);
    });

    // Tablature heading should not be present
    // The sub-nav should only have Video, Comments, Preferences
    const subNavButtons = screen.getAllByRole('button');
    const tablatureButton = subNavButtons.find((b) => b.textContent === 'Tablature');
    expect(tablatureButton).toBeUndefined();
  });

  // ─── Sticky Sub-Navigation ────────────────────────────────────

  it('renders sticky sub-navigation with all sections', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      // Name appears in both breadcrumb and h2 title
      const names = screen.getAllByText('Stairway to Heaven');
      expect(names.length).toBe(2);
    });

    const subNav = screen.getByLabelText('Section navigation');
    expect(subNav).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Video' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tablature' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comments' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preferences' })).toBeInTheDocument();
  });

  it('renders sub-nav without Tablature when not available', async () => {
    mockGetTutorial.mockResolvedValue(tutorialNoTablature);
    renderTutorialDetail('wonderwall');

    await waitFor(() => {
      // "Wonderwall" appears in both breadcrumb and h2 title
      const names = screen.getAllByText('Wonderwall');
      expect(names.length).toBe(2);
    });

    const subNav = screen.getByLabelText('Section navigation');
    const buttons = subNav.querySelectorAll('button');
    expect(buttons).toHaveLength(3); // Video, Comments, Preferences
    expect(buttons[0]).toHaveTextContent('Video');
    expect(buttons[1]).toHaveTextContent('Comments');
    expect(buttons[2]).toHaveTextContent('Preferences');
  });

  it('scrolls to section when sub-nav button is clicked', async () => {
    const user = userEvent.setup();
    mockGetTutorial.mockResolvedValue(sampleTutorial);

    // Mock getElementById to return an element with offsetTop
    const mockElement = {
      offsetTop: 500,
    } as HTMLElement;
    const getElementByIdSpy = vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

    renderTutorialDetail();

    await waitFor(() => {
      // Name appears in both breadcrumb and h2 title
      const names = screen.getAllByText('Stairway to Heaven');
      expect(names.length).toBe(2);
    });

    await user.click(screen.getByRole('button', { name: 'Comments' }));

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 400, // 500 - 100 offset
      behavior: 'smooth',
    });

    getElementByIdSpy.mockRestore();
  });

  // ─── Floating Video Toggle ────────────────────────────────────

  it('shows float toggle button when tutorial has tablature', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      expect(screen.getByTitle('Float video over tablature')).toBeInTheDocument();
    });
  });

  it('does not show float toggle when no tablature', async () => {
    mockGetTutorial.mockResolvedValue(tutorialNoTablature);
    renderTutorialDetail('wonderwall');

    await waitFor(() => {
      // "Wonderwall" appears in both breadcrumb and h2 title
      const names = screen.getAllByText('Wonderwall');
      expect(names.length).toBe(2);
    });

    expect(screen.queryByTitle('Float video over tablature')).not.toBeInTheDocument();
  });

  it('toggles float button label on click', async () => {
    const user = userEvent.setup();
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      expect(screen.getByTitle('Float video over tablature')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Float video over tablature'));

    expect(screen.getByTitle('Dock video')).toBeInTheDocument();
  });

  // ─── Breadcrumb Link ──────────────────────────────────────────

  it('breadcrumb link navigates to library', async () => {
    mockGetTutorial.mockResolvedValue(sampleTutorial);
    renderTutorialDetail();

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Library' });
      expect(link).toHaveAttribute('href', '/');
    });
  });
});
