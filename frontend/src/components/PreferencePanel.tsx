import { useEffect, useState, useCallback, useRef } from 'react';
import { getPreferences, updatePreferences } from '../services/api';
import type { Preference } from '../types';
import './PreferencePanel.css';

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

interface PreferencePanelProps {
  tutorialId: string;
}

export default function PreferencePanel({ tutorialId }: PreferencePanelProps) {
  const [difficultyLevel, setDifficultyLevel] = useState<string>('');
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPreferences() {
      try {
        setLoading(true);
        setError(null);
        const pref: Preference = await getPreferences(tutorialId);
        if (!cancelled) {
          setDifficultyLevel(pref.difficultyLevel || '');
          setFavorite(pref.favorite);
        }
      } catch {
        if (!cancelled) {
          // If 404, treat as no preferences set yet — use defaults
          setDifficultyLevel('');
          setFavorite(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPreferences();

    return () => {
      cancelled = true;
    };
  }, [tutorialId]);

  const persistPreferences = useCallback(
    async (newDifficulty: string, newFavorite: boolean) => {
      try {
        setError(null);
        setSaving(true);

        if (savingTimerRef.current) {
          clearTimeout(savingTimerRef.current);
        }
        if (savedTimerRef.current) {
          clearTimeout(savedTimerRef.current);
        }

        await updatePreferences(tutorialId, {
          difficultyLevel: newDifficulty,
          favorite: newFavorite,
        });

        setSaved(true);
        savedTimerRef.current = setTimeout(() => {
          setSaved(false);
        }, 2000);

        savingTimerRef.current = setTimeout(() => {
          setSaving(false);
        }, 400);
      } catch {
        setSaving(false);
        setError('Failed to save preferences.');
      }
    },
    [tutorialId]
  );

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (savingTimerRef.current) {
        clearTimeout(savingTimerRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  function handleDifficultyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newLevel = e.target.value;
    setDifficultyLevel(newLevel);
    persistPreferences(newLevel, favorite);
  }

  function handleFavoriteChange() {
    const newFavorite = !favorite;
    setFavorite(newFavorite);
    persistPreferences(difficultyLevel, newFavorite);
  }

  if (loading) {
    return (
      <div className="preference-panel">
        <h3 className="preference-panel__title">Preferences</h3>
        <div className="preference-panel__loading" role="status">
          Loading preferences…
        </div>
      </div>
    );
  }

  return (
    <div className="preference-panel">
      <h3 className="preference-panel__title">Preferences</h3>

      {error && (
        <div className="preference-panel__error" role="alert">
          {error}
        </div>
      )}

      <div className="preference-panel__controls">
        <div className="preference-panel__field">
          <label
            className="preference-panel__label"
            htmlFor={`difficulty-${tutorialId}`}
          >
            Difficulty
          </label>
          <select
            id={`difficulty-${tutorialId}`}
            className="select"
            value={difficultyLevel}
            onChange={handleDifficultyChange}
          >
            <option value="">— Select —</option>
            {DIFFICULTY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <button
          className={`preference-panel__favorite-btn ${favorite ? 'preference-panel__favorite-btn--active' : ''}`}
          onClick={handleFavoriteChange}
          type="button"
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={favorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>{favorite ? 'Favorited' : 'Favorite'}</span>
        </button>

        <span
          className={`preference-panel__status ${saving ? 'preference-panel__status--saving' : ''} ${saved ? 'preference-panel__status--saved' : ''}`}
          role="status"
          aria-live="polite"
        >
          {saving && (
            <span className="preference-panel__spinner" aria-hidden="true" />
          )}
          {saving ? 'Saving…' : saved ? 'Saved' : ''}
        </span>
      </div>
    </div>
  );
}
