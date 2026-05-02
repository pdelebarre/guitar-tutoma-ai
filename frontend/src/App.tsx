import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import SongLibrary from './pages/SongLibrary';
import TutorialDetail from './pages/TutorialDetail';
import PlaylistManager from './pages/PlaylistManager';
import AuthPage from './pages/AuthPage';
import UserPreferencesPage from './pages/UserPreferencesPage';
import { isAuthenticated, clearAuthToken } from './services/api';
import './App.css';

function App() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Keep loggedIn in sync with localStorage when route changes
  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, [location]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleSignOut = useCallback(() => {
    clearAuthToken();
    setLoggedIn(false);
    setMobileMenuOpen(false);
  }, []);

  // Close mobile menu on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">
              <Link to="/"><span>Guitar Tutorial Manager</span></Link>
            </h1>
            <nav className="app-nav" role="navigation" aria-label="Main navigation">
              <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                Library
              </NavLink>
              <NavLink to="/playlists" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                Playlists
              </NavLink>
              {loggedIn && (
                <NavLink to="/preferences" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  Preferences
                </NavLink>
              )}
            </nav>
          </div>
          <div className="header-right">
            {loggedIn ? (
              <button className="btn btn--ghost" onClick={handleSignOut} title="Sign out">
                Sign Out
              </button>
            ) : (
              <NavLink to="/auth" className={({ isActive }) => `btn btn--ghost${isActive ? ' active' : ''}`}>
                Sign In
              </NavLink>
            )}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {/* Mobile hamburger button */}
            <button
              className={`mobile-menu-btn${mobileMenuOpen ? ' mobile-menu-btn--open' : ''}`}
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
            >
              <span className="mobile-menu-btn__bar" />
              <span className="mobile-menu-btn__bar" />
              <span className="mobile-menu-btn__bar" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile navigation overlay */}
      {mobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      )}
      <nav
        id="mobile-nav"
        className={`mobile-nav${mobileMenuOpen ? ' mobile-nav--open' : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <NavLink to="/" end className={({ isActive }) => `mobile-nav__link${isActive ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
          📚 Library
        </NavLink>
        <NavLink to="/playlists" className={({ isActive }) => `mobile-nav__link${isActive ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
          📋 Playlists
        </NavLink>
        {loggedIn && (
          <NavLink to="/preferences" className={({ isActive }) => `mobile-nav__link${isActive ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
            ⚙️ Preferences
          </NavLink>
        )}
        <div className="mobile-nav__divider" />
        {loggedIn ? (
          <button className="mobile-nav__link mobile-nav__link--action" onClick={handleSignOut}>
            🚪 Sign Out
          </button>
        ) : (
          <NavLink to="/auth" className={({ isActive }) => `mobile-nav__link${isActive ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
            🔑 Sign In
          </NavLink>
        )}
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<SongLibrary />} />
          <Route path="/tutorials/:id" element={<TutorialDetail />} />
          <Route path="/playlists" element={<PlaylistManager />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/preferences" element={<UserPreferencesPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
