import { Routes, Route, NavLink, Link } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import SongLibrary from './pages/SongLibrary';
import TutorialDetail from './pages/TutorialDetail';
import PlaylistManager from './pages/PlaylistManager';
import './App.css';

function App() {
  const { theme, toggleTheme } = useTheme();

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
            </nav>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<SongLibrary />} />
          <Route path="/tutorials/:id" element={<TutorialDetail />} />
          <Route path="/playlists" element={<PlaylistManager />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
