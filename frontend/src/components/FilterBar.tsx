import './FilterBar.css';

export type DifficultyFilter = 'All' | 'Beginner' | 'Intermediate' | 'Advanced';
export type SortDirection = 'asc' | 'desc';

interface FilterBarProps {
  selectedDifficulty: DifficultyFilter;
  onDifficultyChange: (level: DifficultyFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCount: number;
  filteredCount: number;
}

const DIFFICULTY_OPTIONS: DifficultyFilter[] = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function FilterBar({
  selectedDifficulty,
  onDifficultyChange,
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div className="filter-bar__search">
        <svg
          className="filter-bar__search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="filter-bar__search-input"
          placeholder="Search tutorials…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search tutorials by name"
        />
      </div>

      <div className="filter-bar__pills" role="radiogroup" aria-label="Filter by difficulty">
        {DIFFICULTY_OPTIONS.map((option) => (
          <button
            key={option}
            className={`filter-bar__pill ${selectedDifficulty === option ? 'filter-bar__pill--active' : ''}`}
            onClick={() => onDifficultyChange(option)}
            role="radio"
            aria-checked={selectedDifficulty === option}
            type="button"
          >
            {option === 'All' ? 'All Levels' : option}
          </button>
        ))}
      </div>

      <span className="filter-bar__count">
        {filteredCount === totalCount
          ? `${totalCount} tutorial${totalCount !== 1 ? 's' : ''}`
          : `${filteredCount} of ${totalCount} tutorial${totalCount !== 1 ? 's' : ''}`}
      </span>
    </div>
  );
}
