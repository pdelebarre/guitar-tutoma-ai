import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders the app title', () => {
    renderApp();
    expect(screen.getByText('Guitar Tutorial Manager')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderApp();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    renderApp();
    const toggle = screen.getByRole('button', { name: /switch to .* mode/i });
    expect(toggle).toBeInTheDocument();
  });

  it('toggles theme without page reload', () => {
    renderApp();
    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });

    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // After toggling, the button label should change
    const toggleAfter = screen.getByRole('button', { name: /switch to light mode/i });
    expect(toggleAfter).toBeInTheDocument();
  });

  it('renders SongLibrary placeholder at /', () => {
    renderApp('/');
    expect(screen.getByText('Song Library')).toBeInTheDocument();
  });

  it('renders TutorialDetail at /tutorials/:id', () => {
    renderApp('/tutorials/test-song');
    // "Library" appears in both nav link and breadcrumb
    const libraryLinks = screen.getAllByText('Library');
    expect(libraryLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders PlaylistManager placeholder at /playlists', () => {
    renderApp('/playlists');
    expect(screen.getByRole('heading', { name: 'Playlists', level: 2 })).toBeInTheDocument();
  });

  it('Library nav link is active on home route', () => {
    renderApp('/');
    const libraryLink = screen.getByText('Library');
    expect(libraryLink).toHaveClass('active');
  });

  it('Playlists nav link is active on playlists route', () => {
    renderApp('/playlists');
    const playlistsLink = screen.getByRole('link', { name: 'Playlists' });
    expect(playlistsLink).toHaveClass('active');
  });
});
