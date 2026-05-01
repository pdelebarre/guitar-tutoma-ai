import { useState } from 'react';
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
  // useLocation ensures re-render on route changes (e.g. after login redirect)
  useLocation();
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());

  // Keep loggedIn in sync with localStorage when route changes
  if (loggedIn !== isAuthenticated()) {
    setLoggedIn(isAuthenticated());
  }

  function handleSignOut() {
    clearAuthToken();
    setLoggedIn(false);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">
              <Link to="/"><span>Guitar Tutorial Manager</span></Link>
            </h1>
            <nav className="app-nav">
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
          </div>
        </div>
      </header>

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
