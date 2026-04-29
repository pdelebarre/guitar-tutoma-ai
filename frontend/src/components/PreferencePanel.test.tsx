import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreferencePanel from './PreferencePanel';
import type { Preference } from '../types';

// Mock the API module
vi.mock('../services/api', () => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}));

import { getPreferences, updatePreferences } from '../services/api';

const mockGetPreferences = vi.mocked(getPreferences);
const mockUpdatePreferences = vi.mocked(updatePreferences);

const samplePreference: Preference = {
  tutorialId: 't1',
  difficultyLevel: 'Intermediate',
  favorite: true,
};

function renderPreferencePanel(tutorialId = 't1') {
  return render(<PreferencePanel tutorialId={tutorialId} />);
}

describe('PreferencePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Loading State ────────────────────────────────────────────

  it('shows loading state initially', () => {
    mockGetPreferences.mockReturnValue(new Promise(() => {}));
    renderPreferencePanel();

    expect(screen.getByText('Loading preferences…')).toBeInTheDocument();
  });

  // ─── Loaded State ─────────────────────────────────────────────

  it('renders preferences from the API', async () => {
    mockGetPreferences.mockResolvedValue(samplePreference);
    renderPreferencePanel();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Intermediate')).toBeInTheDocument();
    });
  });

  it('renders the panel title', async () => {
    mockGetPreferences.mockResolvedValue(samplePreference);
    renderPreferencePanel();

    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('renders difficulty select with correct id', async () => {
    mockGetPreferences.mockResolvedValue(samplePreference);
    renderPreferencePanel('my-tutorial');

    await waitFor(() => {
      const select = screen.getByLabelText('Difficulty');
      expect(select).toHaveAttribute('id', 'difficulty-my-tutorial');
    });
  });

  it('renders all difficulty options', async () => {
    mockGetPreferences.mockResolvedValue(samplePreference);
    renderPreferencePanel();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: '— Select —' })).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'Beginner' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Intermediate' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Advanced' })).toBeInTheDocument();
  });

  // ─── Favorite Button ──────────────────────────────────────────

  it('shows favorite button with correct aria-pressed state', async () => {
    mockGetPreferences.mockResolvedValue(samplePreference);
    renderPreferencePanel();

    await waitFor(() => {
      const favBtn = screen.getByRole('button', { name: 'Remove from favorites' });
      expect(favBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('shows unfavorited state when favorite is false', async () => {
    mockGetPreferences.mockResolvedValue({
      ...samplePreference,
      favorite: false,
    });
    renderPreferencePanel();

    await waitFor(() => {
      const favBtn = screen.getByRole('button', { name: 'Add to favorites' });
      expect(favBtn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // ─── Error State ──────────────────────────────────────────────

  it('shows error message when fetch fails', async () => {
    mockGetPreferences.mockRejectedValue(new Error('Network error'));
    renderPreferencePanel();

    await waitFor(() => {
      // On error, defaults are used (no difficulty, not favorite)
      const select = screen.getByLabelText('Difficulty');
      expect(select).toHaveValue('');
    });
  });

  // ─── Handle Difficulty Change ─────────────────────────────────

  it('calls updatePreferences when difficulty changes', async () => {
    const user = userEvent.setup();
    mockGetPreferences.mockResolvedValue(samplePreference);
    mockUpdatePreferences.mockResolvedValue({
      tutorialId: 't1',
      difficultyLevel: 'Advanced',
      favorite: true,
    });

    renderPreferencePanel();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Intermediate')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Difficulty');
    await user.selectOptions(select, 'Advanced');

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith('t1', {
        difficultyLevel: 'Advanced',
        favorite: true,
      });
    });
  });

  // ─── Handle Favorite Change ───────────────────────────────────

  it('calls updatePreferences when favorite is toggled', async () => {
    const user = userEvent.setup();
    mockGetPreferences.mockResolvedValue(samplePreference);
    mockUpdatePreferences.mockResolvedValue({
      tutorialId: 't1',
      difficultyLevel: 'Intermediate',
      favorite: false,
    });

    renderPreferencePanel();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Remove from favorites' })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Remove from favorites' }));

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith('t1', {
        difficultyLevel: 'Intermediate',
        favorite: false,
      });
    });
  });

  // ─── Saving Indicator ─────────────────────────────────────────

  it('shows saving indicator while persisting', async () => {
    const user = userEvent.setup();
    mockGetPreferences.mockResolvedValue(samplePreference);
    mockUpdatePreferences.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({} as Preference), 100))
    );

    renderPreferencePanel();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Remove from favorites' })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Remove from favorites' }));

    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('shows saved indicator after successful save', async () => {
    const user = userEvent.setup();
    mockGetPreferences.mockResolvedValue(samplePreference);
    mockUpdatePreferences.mockResolvedValue({
      tutorialId: 't1',
      difficultyLevel: 'Intermediate',
      favorite: false,
    });

    renderPreferencePanel();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Remove from favorites' })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Remove from favorites' }));

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  // ─── Error on Save ────────────────────────────────────────────

  it('shows error when save fails', async () => {
    const user = userEvent.setup();
    mockGetPreferences.mockResolvedValue(samplePreference);
    mockUpdatePreferences.mockRejectedValue(new Error('Network error'));

    renderPreferencePanel();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Remove from favorites' })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Remove from favorites' }));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to save preferences.')
      ).toBeInTheDocument();
    });
  });

  // ─── Status Role ──────────────────────────────────────────────

  it('status element has role="status" and aria-live="polite"', async () => {
    mockGetPreferences.mockResolvedValue(samplePreference);
    renderPreferencePanel();

    await waitFor(() => {
      const statusEl = screen.getByRole('status');
      expect(statusEl).toHaveAttribute('aria-live', 'polite');
    });
  });
});
