import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getUserPreferences,
  updateUserPreferences,
  isAuthenticated,
  clearAuthToken,
} from '../services/api';
import type { UserPreference } from '../types';
import './UserPreferencesPage.css';

export default function UserPreferencesPage() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [theme, setTheme] = useState('light');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [sortDirection, setSortDirection] = useState('asc');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }

    let cancelled = false;

    async function fetch() {
      try {
        setLoading(true);
        const prefs = await getUserPreferences();
        if (!cancelled) {
          setPreferences(prefs);
          setTheme(prefs.theme || 'light');
          setDifficultyFilter(prefs.defaultDifficultyFilter || 'All');
          setSortDirection(prefs.defaultSortDirection || 'asc');
          setItemsPerPage(prefs.itemsPerPage || 20);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load preferences');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [navigate]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await updateUserPreferences({
        theme,
        defaultDifficultyFilter: difficultyFilter,
        defaultSortDirection: sortDirection,
        itemsPerPage,
      });
      setSuccess('Preferences saved!');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save preferences');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    clearAuthToken();
    navigate('/');
  }

  if (loading) {
    return (
      <div className="user-preferences-page">
        <div className="user-preferences-page__loading">Loading preferences…</div>
      </div>
    );
  }

  return (
    <div className="user-preferences-page">
      <h2>User Preferences</h2>
      <p className="user-preferences-page__subtitle">
        Customize your experience
      </p>

      <form className="user-preferences-page__form" onSubmit={handleSave}>
        <div className="user-preferences-page__field">
          <label htmlFor="pref-theme">Theme</label>
          <select
            id="pref-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="user-preferences-page__field">
          <label htmlFor="pref-difficulty">Default Difficulty Filter</label>
          <select
            id="pref-difficulty"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="All">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        <div className="user-preferences-page__field">
          <label htmlFor="pref-sort">Default Sort Direction</label>
          <select
            id="pref-sort"
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value)}
          >
            <option value="asc">Ascending (A-Z)</option>
            <option value="desc">Descending (Z-A)</option>
          </select>
        </div>

        <div className="user-preferences-page__field">
          <label htmlFor="pref-per-page">Items Per Page</label>
          <select
            id="pref-per-page"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        {error && <div className="user-preferences-page__error">⚠️ {error}</div>}
        {success && <div className="user-preferences-page__success">✅ {success}</div>}

        <div className="user-preferences-page__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Preferences'}
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </form>
    </div>
  );
}
