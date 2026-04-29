import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterBar from './FilterBar';
import type { DifficultyFilter } from './FilterBar';

describe('FilterBar', () => {
  const defaultProps = {
    selectedDifficulty: 'All' as DifficultyFilter,
    onDifficultyChange: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
    totalCount: 10,
    filteredCount: 10,
  };

  it('renders the search input with correct placeholder', () => {
    render(<FilterBar {...defaultProps} />);

    const input = screen.getByLabelText('Search tutorials by name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search tutorials…');
  });

  it('renders all difficulty pill buttons', () => {
    render(<FilterBar {...defaultProps} />);

    expect(screen.getByRole('radio', { name: 'All Levels' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Beginner' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Intermediate' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Advanced' })).toBeInTheDocument();
  });

  it('marks the selected difficulty pill as checked', () => {
    render(<FilterBar {...defaultProps} selectedDifficulty="Beginner" />);

    const allPill = screen.getByRole('radio', { name: 'All Levels' });
    const beginnerPill = screen.getByRole('radio', { name: 'Beginner' });

    expect(allPill).toHaveAttribute('aria-checked', 'false');
    expect(beginnerPill).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onDifficultyChange when a pill is clicked', async () => {
    const onDifficultyChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterBar {...defaultProps} onDifficultyChange={onDifficultyChange} />);

    await user.click(screen.getByRole('radio', { name: 'Advanced' }));
    expect(onDifficultyChange).toHaveBeenCalledWith('Advanced');
  });

  it('calls onSearchChange when typing in the search input', async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterBar {...defaultProps} onSearchChange={onSearchChange} />);

    const input = screen.getByLabelText('Search tutorials by name');
    await user.type(input, 'test');

    expect(onSearchChange).toHaveBeenCalledTimes(4);
    expect(onSearchChange).toHaveBeenCalledWith('t');
    expect(onSearchChange).toHaveBeenCalledWith('e');
    expect(onSearchChange).toHaveBeenCalledWith('s');
    expect(onSearchChange).toHaveBeenCalledWith('t');
  });

  it('displays the search query value', () => {
    render(<FilterBar {...defaultProps} searchQuery="test" />);

    const input = screen.getByLabelText('Search tutorials by name');
    expect(input).toHaveValue('test');
  });

  it('displays total count when filtered equals total', () => {
    render(<FilterBar {...defaultProps} totalCount={5} filteredCount={5} />);

    expect(screen.getByText('5 tutorials')).toBeInTheDocument();
  });

  it('displays singular count for 1 tutorial', () => {
    render(<FilterBar {...defaultProps} totalCount={1} filteredCount={1} />);

    expect(screen.getByText('1 tutorial')).toBeInTheDocument();
  });

  it('displays filtered vs total count when they differ', () => {
    render(<FilterBar {...defaultProps} totalCount={10} filteredCount={3} />);

    expect(screen.getByText('3 of 10 tutorials')).toBeInTheDocument();
  });

  it('renders the radiogroup with correct aria-label', () => {
    render(<FilterBar {...defaultProps} />);

    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-label', 'Filter by difficulty');
  });

  it('applies active class to the selected pill', () => {
    render(<FilterBar {...defaultProps} selectedDifficulty="Intermediate" />);

    const intermediatePill = screen.getByRole('radio', { name: 'Intermediate' });
    expect(intermediatePill.className).toContain('filter-bar__pill--active');
  });

  it('does not apply active class to non-selected pills', () => {
    render(<FilterBar {...defaultProps} selectedDifficulty="Intermediate" />);

    const allPill = screen.getByRole('radio', { name: 'All Levels' });
    expect(allPill.className).not.toContain('filter-bar__pill--active');
  });
});
