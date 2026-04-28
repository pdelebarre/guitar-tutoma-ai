// Feature: guitar-tutorial-manager, Property 2: Song Library renders required tutorial information
// Validates: Requirements 1.2

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fc from 'fast-check';
import SongLibrary from './SongLibrary';
import type { Tutorial } from '../types';

// Mock the API module
vi.mock('../services/api', () => ({
  listTutorials: vi.fn(),
  getPreferences: vi.fn(),
}));

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

import { listTutorials, getPreferences } from '../services/api';

const mockListTutorials = vi.mocked(listTutorials);
const mockGetPreferences = vi.mocked(getPreferences);

/**
 * Arbitrary that generates a valid Tutorial object.
 * Names use alphanumeric characters to avoid collisions with UI text.
 */
const tutorialArbitrary: fc.Arbitrary<Tutorial> = fc.record({
  id: fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/).filter((s) => s.length > 0),
  name: fc
    .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 3,
      maxLength: 20,
    })
    .map((s) => `Tutorial ${s.trim()}`),
  videoFilename: fc
    .stringMatching(/^[a-z][a-z0-9]{0,9}$/)
    .filter((s) => s.length > 0)
    .map((base) => `${base}.mp4`),
  hasSubtitle: fc.boolean(),
  hasTablature: fc.boolean(),
});

/**
 * Arbitrary that generates a non-empty array of tutorials with unique ids and unique names.
 */
const tutorialArrayArbitrary: fc.Arbitrary<Tutorial[]> = fc
  .array(tutorialArbitrary, { minLength: 1, maxLength: 8 })
  .map((tutorials) => {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    return tutorials.filter((t) => {
      const idKey = t.id;
      const nameKey = t.name.toLowerCase();
      if (seenIds.has(idKey) || seenNames.has(nameKey)) return false;
      seenIds.add(idKey);
      seenNames.add(nameKey);
      return true;
    });
  })
  .filter((arr) => arr.length > 0);

describe('SongLibrary Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Property 2: Song Library renders required tutorial information
  it('should render each tutorial name, subtitle indicator, and tablature indicator for any valid tutorial list', async () => {
    // Property-based test with 100 iterations of async rendering needs extended timeout
    await fc.assert(
      fc.asyncProperty(tutorialArrayArbitrary, async (tutorials) => {
        // Clean up any previous render completely
        cleanup();
        vi.clearAllMocks();

        // Mock API to return the generated tutorials
        mockListTutorials.mockResolvedValue(tutorials);
        // Preferences are not relevant for this property — reject all
        mockGetPreferences.mockRejectedValue(new Error('not found'));

        render(
          <MemoryRouter>
            <SongLibrary />
          </MemoryRouter>
        );

        // Wait for loading to complete — the table should appear
        await waitFor(() => {
          expect(screen.getByRole('table')).toBeInTheDocument();
        });

        // Assert each tutorial's name is rendered
        for (const tutorial of tutorials) {
          const nameElements = screen.getAllByText(tutorial.name);
          expect(nameElements.length).toBeGreaterThanOrEqual(1);
        }

        // Assert subtitle indicators: each tutorial should have a subtitle badge
        // The component renders aria-label "Subtitles available" or "No subtitles"
        const subtitleBadges = screen.getAllByLabelText(/subtitles/i);
        expect(subtitleBadges.length).toBe(tutorials.length);

        // Assert tablature indicators: each tutorial should have a tablature badge
        // The component renders aria-label "Tablature available" or "No tablature"
        const tablatureBadges = screen.getAllByLabelText(/tablature/i);
        expect(tablatureBadges.length).toBe(tutorials.length);

        // Verify the correct indicator content for each tutorial
        // Tutorials are sorted alphabetically by name in the component (default asc)
        const sortedTutorials = [...tutorials].sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        for (let i = 0; i < sortedTutorials.length; i++) {
          const tutorial = sortedTutorials[i];

          // Check subtitle indicator matches the boolean flag
          expect(subtitleBadges[i]).toHaveTextContent(
            tutorial.hasSubtitle ? '✓' : '✗'
          );

          // Check tablature indicator matches the boolean flag
          expect(tablatureBadges[i]).toHaveTextContent(
            tutorial.hasTablature ? '✓' : '✗'
          );
        }

        // Clean up after each iteration
        cleanup();
      }),
      { numRuns: 100 }
    );
  }, 120_000);
});
