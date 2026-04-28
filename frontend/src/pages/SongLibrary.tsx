import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTutorials, getPreferences } from '../services/api';
import FilterBar from '../components/FilterBar';
import type { DifficultyFilter, SortDirection } from '../components/FilterBar';
import type { Tutorial, Preference } from '../types';
import './SongLibrary.css';

function SkeletonRows() {
  return (
    <div className="song-library__skeleton" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="song-library__skeleton-row">
          <div className="skeleton song-library__skeleton-name" />
          <div className="skeleton song-library__skeleton-icon" />
          <div className="skeleton song-library__skeleton-icon" />
          <div className="skeleton song-library__skeleton-level" />
        </div>
      ))}
    </div>
  );
}

export default function SongLibrary() {
  const navigate = useNavigate();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [preferences, setPreferences] = useState<Record<string, Preference>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('All');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const tutorialList = await listTutorials();

        if (cancelled) return;
        setTutorials(tutorialList);

        // Fetch preferences for each tutorial in parallel
        const prefEntries = await Promise.allSettled(
          tutorialList.map(async (t) => {
            const pref = await getPreferences(t.id);
            return [t.id, pref] as [string, Preference];
          })
        );

        if (cancelled) return;

        const prefMap: Record<string, Preference> = {};
        for (const result of prefEntries) {
          if (result.status === 'fulfilled') {
            const [id, pref] = result.value;
            prefMap[id] = pref;
          }
        }
        setPreferences(prefMap);
      } catch {
        if (!cancelled) {
          setError('Failed to load tutorials. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  function getDifficultyLabel(tutorialId: string): string {
    const pref = preferences[tutorialId];
    return pref?.difficultyLevel || '';
  }

  function getDifficultyClass(level: string): string {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'level-beginner';
      case 'intermediate':
        return 'level-intermediate';
      case 'advanced':
        return 'level-advanced';
      default:
        return 'level-unknown';
    }
  }

  const filteredAndSortedTutorials = useMemo(() => {
    let result = tutorials;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(query));
    }

    // Filter by difficulty level
    if (difficultyFilter !== 'All') {
      result = result.filter((t) => {
        const pref = preferences[t.id];
        return pref?.difficultyLevel?.toLowerCase() === difficultyFilter.toLowerCase();
      });
    }

    // Sort by name
    result = [...result].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [tutorials, preferences, difficultyFilter, sortDirection, searchQuery]);

  function toggleSortDirection() {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }

  function handleRowClick(tutorialId: string) {
    navigate(`/tutorials/${encodeURIComponent(tutorialId)}`);
  }

  function handleRowKeyDown(e: React.KeyboardEvent, tutorialId: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(tutorialId);
    }
  }

  function handleRetry() {
    setError(null);
    setLoading(true);
    // Re-trigger the useEffect by forcing a re-mount via key change isn't possible,
    // so we manually re-fetch
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const tutorialList = await listTutorials();
        setTutorials(tutorialList);

        const prefEntries = await Promise.allSettled(
          tutorialList.map(async (t) => {
            const pref = await getPreferences(t.id);
            return [t.id, pref] as [string, Preference];
          })
        );

        const prefMap: Record<string, Preference> = {};
        for (const result of prefEntries) {
          if (result.status === 'fulfilled') {
            const [id, pref] = result.value;
            prefMap[id] = pref;
          }
        }
        setPreferences(prefMap);
      } catch {
        setError('Failed to load tutorials. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }

  if (loading) {
    return (
      <div className="song-library page">
        <div className="song-library__header">
          <h2>Song Library</h2>
        </div>
        <SkeletonRows />
      </div>
    );
  }

  if (error) {
    return (
      <div className="song-library page">
        <div className="song-library__header">
          <h2>Song Library</h2>
        </div>
        <div className="song-library__error" role="alert">
          <span className="song-library__error-icon">⚠️</span>
          <p>{error}</p>
          <button className="btn btn--primary" onClick={handleRetry} type="button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (tutorials.length === 0) {
    return (
      <div className="song-library page">
        <div className="song-library__header">
          <h2>Song Library</h2>
        </div>
        <div className="song-library__empty">
          <span className="song-library__empty-icon">🎵</span>
          <p>No tutorials available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="song-library page">
      <div className="song-library__header">
        <h2>Song Library</h2>
      </div>

      <FilterBar
        selectedDifficulty={difficultyFilter}
        onDifficultyChange={setDifficultyFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={tutorials.length}
        filteredCount={filteredAndSortedTutorials.length}
      />

      {filteredAndSortedTutorials.length === 0 ? (
        <div className="song-library__empty">
          <span className="song-library__empty-icon">🔍</span>
          <p>No tutorials match your search or filter</p>
        </div>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="song-library__table-wrapper">
            <table className="tutorial-table">
              <thead>
                <tr>
                  <th>
                    <span
                      className="sortable-header"
                      onClick={toggleSortDirection}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSortDirection();
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Sort by name ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                    >
                      Name
                      <span className="sort-indicator" aria-hidden="true">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    </span>
                  </th>
                  <th className="col-icon">Subtitles</th>
                  <th className="col-icon">Tablature</th>
                  <th className="col-level">Level</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTutorials.map((tutorial) => {
                  const level = getDifficultyLabel(tutorial.id);
                  return (
                    <tr
                      key={tutorial.id}
                      onClick={() => handleRowClick(tutorial.id)}
                      onKeyDown={(e) => handleRowKeyDown(e, tutorial.id)}
                      tabIndex={0}
                      role="link"
                      aria-label={`View tutorial: ${tutorial.name}`}
                    >
                      <td>
                        <span className="tutorial-name">{tutorial.name}</span>
                      </td>
                      <td className="col-icon">
                        <span
                          className={`badge ${tutorial.hasSubtitle ? 'badge-available' : 'badge-unavailable'}`}
                          title={tutorial.hasSubtitle ? 'Subtitles available' : 'No subtitles'}
                          aria-label={tutorial.hasSubtitle ? 'Subtitles available' : 'No subtitles'}
                        >
                          {tutorial.hasSubtitle ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="col-icon">
                        <span
                          className={`badge ${tutorial.hasTablature ? 'badge-available' : 'badge-unavailable'}`}
                          title={tutorial.hasTablature ? 'Tablature available' : 'No tablature'}
                          aria-label={tutorial.hasTablature ? 'Tablature available' : 'No tablature'}
                        >
                          {tutorial.hasTablature ? '✓' : '✗'}
                        </span>
                      </td>
                      <td>
                        {level ? (
                          <span className={`level-badge ${getDifficultyClass(level)}`}>
                            {level}
                          </span>
                        ) : (
                          <span className="level-badge level-unknown">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="tutorial-cards">
            {filteredAndSortedTutorials.map((tutorial) => {
              const level = getDifficultyLabel(tutorial.id);
              return (
                <div
                  key={tutorial.id}
                  className="tutorial-card"
                  onClick={() => handleRowClick(tutorial.id)}
                  onKeyDown={(e) => handleRowKeyDown(e, tutorial.id)}
                  tabIndex={0}
                  role="link"
                  aria-label={`View tutorial: ${tutorial.name}`}
                >
                  <div className="tutorial-card__top">
                    <span className="tutorial-card__name">{tutorial.name}</span>
                    {level ? (
                      <span className={`level-badge ${getDifficultyClass(level)}`}>
                        {level}
                      </span>
                    ) : (
                      <span className="level-badge level-unknown">—</span>
                    )}
                  </div>
                  <div className="tutorial-card__bottom">
                    <span className="tutorial-card__meta">
                      <span
                        className={`badge ${tutorial.hasSubtitle ? 'badge-available' : 'badge-unavailable'}`}
                        title={tutorial.hasSubtitle ? 'Subtitles available' : 'No subtitles'}
                      >
                        {tutorial.hasSubtitle ? '✓' : '✗'}
                      </span>
                      Subtitles
                    </span>
                    <span className="tutorial-card__meta">
                      <span
                        className={`badge ${tutorial.hasTablature ? 'badge-available' : 'badge-unavailable'}`}
                        title={tutorial.hasTablature ? 'Tablature available' : 'No tablature'}
                      >
                        {tutorial.hasTablature ? '✓' : '✗'}
                      </span>
                      Tablature
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
