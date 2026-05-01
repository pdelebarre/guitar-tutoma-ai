import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTutorials, getPreferences, searchTutorials, isAuthenticated } from '../services/api';
import FilterBar from '../components/FilterBar';
import AddTutorialModal from '../components/AddTutorialModal';
import type { DifficultyFilter, SortDirection } from '../components/FilterBar';
import type { Tutorial, Preference, SearchResult } from '../types';
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
  const [showAddModal, setShowAddModal] = useState(false);

  // Semantic search state
  const [semanticResults, setSemanticResults] = useState<SearchResult[] | null>(null);
  const [semanticSearching, setSemanticSearching] = useState(false);
  const [semanticError, setSemanticError] = useState<string | null>(null);

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

  // Perform semantic search when the query changes (debounced)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSemanticResults(null);
      setSemanticError(null);
      return;
    }

    // Debounce: wait 400ms after the user stops typing
    const timer = setTimeout(async () => {
      try {
        setSemanticSearching(true);
        setSemanticError(null);
        const response = await searchTutorials(trimmed, 10);
        setSemanticResults(response.results);
      } catch {
        setSemanticError('Semantic search unavailable. Try again later.');
        setSemanticResults(null);
      } finally {
        setSemanticSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

    // Filter by search query (local filtering)
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
          {isAuthenticated() && (
            <button
              className="btn btn--primary"
              onClick={() => setShowAddModal(true)}
            >
              + Add Tutorial
            </button>
          )}
        </div>
        <div className="song-library__empty">
          <span className="song-library__empty-icon">🎵</span>
          <p>No tutorials available</p>
        </div>
        {showAddModal && (
          <AddTutorialModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              setLoading(true);
              setError(null);
              listTutorials()
                .then((tutorialList) => {
                  setTutorials(tutorialList);
                  setLoading(false);
                })
                .catch((err) => {
                  setError(err instanceof Error ? err.message : 'Failed to refresh tutorials');
                  setLoading(false);
                });
            }}
          />
        )}
      </div>
    );
  }

  // Determine which items to display
  const hasSemanticResults = semanticResults !== null && semanticResults.length > 0;
  const isSemanticMode = searchQuery.trim().length > 0 && hasSemanticResults;

  return (
    <div className="song-library page">
      <div className="song-library__header">
        <h2>Song Library</h2>
        {isAuthenticated() && (
          <button
            className="btn btn--primary"
            onClick={() => setShowAddModal(true)}
          >
            + Add Tutorial
          </button>
        )}
      </div>

      <FilterBar
        selectedDifficulty={difficultyFilter}
        onDifficultyChange={setDifficultyFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={tutorials.length}
        filteredCount={isSemanticMode ? semanticResults.length : filteredAndSortedTutorials.length}
      />

      {/* Semantic search indicator */}
      {semanticSearching && (
        <div className="song-library__semantic-status">
          <span className="song-library__semantic-spinner" aria-hidden="true" />
          Searching across tutorials…
        </div>
      )}
      {semanticError && (
        <div className="song-library__semantic-error" role="alert">
          ⚠️ {semanticError}
        </div>
      )}

      {isSemanticMode ? (
        <>
          {/* Semantic search results */}
          <div className="song-library__semantic-info">
            <span className="song-library__semantic-badge">AI Search</span>
            Results ranked by relevance
          </div>

          {/* Desktop table view */}
          <div className="song-library__table-wrapper">
            <table className="tutorial-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="col-icon">Subtitles</th>
                  <th className="col-icon">Tablature</th>
                  <th className="col-level">Level</th>
                  <th className="col-score">Relevance</th>
                </tr>
              </thead>
              <tbody>
                {semanticResults.map((result) => {
                  const level = result.difficulty || getDifficultyLabel(result.tutorialId);
                  return (
                    <tr
                      key={result.tutorialId}
                      onClick={() => handleRowClick(result.tutorialId)}
                      onKeyDown={(e) => handleRowKeyDown(e, result.tutorialId)}
                      tabIndex={0}
                      role="link"
                      aria-label={`View tutorial: ${result.name}`}
                    >
                      <td>
                        <span className="tutorial-name">
                          {result.title || result.name}
                          {result.title && result.title !== result.name && (
                            <span className="tutorial-name__subtitle"> ({result.name})</span>
                          )}
                        </span>
                      </td>
                      <td className="col-icon">
                        <span
                          className={`badge ${result.hasSubtitle ? 'badge-available' : 'badge-unavailable'}`}
                          title={result.hasSubtitle ? 'Subtitles available' : 'No subtitles'}
                          aria-label={result.hasSubtitle ? 'Subtitles available' : 'No subtitles'}
                        >
                          {result.hasSubtitle ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="col-icon">
                        <span
                          className={`badge ${result.hasTablature ? 'badge-available' : 'badge-unavailable'}`}
                          title={result.hasTablature ? 'Tablature available' : 'No tablature'}
                          aria-label={result.hasTablature ? 'Tablature available' : 'No tablature'}
                        >
                          {result.hasTablature ? '✓' : '✗'}
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
                      <td className="col-score">
                        <span className="relevance-score">
                          {Math.round(result.relevanceScore * 100)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="tutorial-cards">
            {semanticResults.map((result) => {
              const level = result.difficulty || getDifficultyLabel(result.tutorialId);
              return (
                <div
                  key={result.tutorialId}
                  className="tutorial-card"
                  onClick={() => handleRowClick(result.tutorialId)}
                  onKeyDown={(e) => handleRowKeyDown(e, result.tutorialId)}
                  tabIndex={0}
                  role="link"
                  aria-label={`View tutorial: ${result.name}`}
                >
                  <div className="tutorial-card__top">
                    <span className="tutorial-card__name">
                      {result.title || result.name}
                    </span>
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
                        className={`badge ${result.hasSubtitle ? 'badge-available' : 'badge-unavailable'}`}
                        title={result.hasSubtitle ? 'Subtitles available' : 'No subtitles'}
                      >
                        {result.hasSubtitle ? '✓' : '✗'}
                      </span>
                      Subtitles
                    </span>
                    <span className="tutorial-card__meta">
                      <span
                        className={`badge ${result.hasTablature ? 'badge-available' : 'badge-unavailable'}`}
                        title={result.hasTablature ? 'Tablature available' : 'No tablature'}
                      >
                        {result.hasTablature ? '✓' : '✗'}
                      </span>
                      Tablature
                    </span>
                    <span className="tutorial-card__meta">
                      <span className="relevance-score">
                        {Math.round(result.relevanceScore * 100)}%
                      </span>
                      Match
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
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
        </>
      )}

      {showAddModal && (
        <AddTutorialModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            // Re-fetch tutorials after successful creation
            setLoading(true);
            setError(null);
            listTutorials()
              .then((tutorialList) => {
                setTutorials(tutorialList);
                setLoading(false);
              })
              .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to refresh tutorials');
                setLoading(false);
              });
          }}
        />
      )}
    </div>
  );
}
