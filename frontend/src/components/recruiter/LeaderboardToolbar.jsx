/**
 * LeaderboardToolbar Component
 * Single-row controls above the leaderboard: search, filter select, sort select,
 * anonymous names toggle, showing count, reset action, and states info popover.
 */


export default function LeaderboardToolbar({
  searchQuery,
  onSearchChange,
  filterValue,
  onFilterChange,
  sortValue,
  onSortChange,
  hideNames,
  onToggleHideNames,
  totalCount,
  visibleCount,
  onResetFilters,
  showStatesExplainer = false,
  onToggleStatesExplainer,
}) {
  const isFiltered =
    searchQuery.trim() !== '' || filterValue !== 'all' || sortValue !== 'rank'
  return (
    <div className="lb-toolbar-row" role="region" aria-label="Leaderboard filters and controls">
      {/* 1. Search by Candidate Name */}
      <input
        type="search"
        className="form-input sm lb-toolbar-search"
        placeholder={hideNames ? 'Names hidden in anonymous mode' : 'Search candidates by name...'}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={hideNames}
        title={hideNames ? 'Search is disabled while candidate names are hidden' : 'Search candidates by name'}
        aria-label="Search candidates by name"
      />

      {/* 2. Filter Select */}
      <select
        className="lb-toolbar-select"
        value={filterValue}
        onChange={(e) => onFilterChange(e.target.value)}
        aria-label="Filter candidate list"
      >
        <option value="all">All candidates</option>
        <option value="contradicted">With contradicted skills</option>
        <option value="80plus">80% and above</option>
      </select>

      {/* 3. Sort Select (preserves real rank number) */}
      <select
        className="lb-toolbar-select"
        value={sortValue}
        onChange={(e) => onSortChange(e.target.value)}
        aria-label="Sort candidate list"
      >
        <option value="rank">Sort by: Rank</option>
        <option value="match">Sort by: Match %</option>
        <option value="verified">Sort by: Verified skills</option>
        <option value="fewest_contradicted">Sort by: Fewest contradicted</option>
      </select>

      {/* 4. Hide Candidate Names Switch */}
      <label className="lb-toolbar-switch">
        <input
          type="checkbox"
          checked={hideNames}
          onChange={(e) => onToggleHideNames(e.target.checked)}
        />
        <span>Hide candidate names</span>
      </label>

      {/* 5. What do the states mean? Explainer Toggle */}
      <div className="lb-info-wrap">
        <button
          type="button"
          className={`lb-info-trigger ${showStatesExplainer ? 'lb-info-trigger-active' : ''}`}
          onClick={onToggleStatesExplainer}
          aria-expanded={showStatesExplainer}
          aria-label="What do the skill states mean?"
        >
          <span>{showStatesExplainer ? '📖 Hide states guide' : 'ℹ What do states mean?'}</span>
        </button>
      </div>

      {/* 6. Showing X of Y and Reset link */}
      <div className="lb-toolbar-count">
        <span>Showing {visibleCount} of {totalCount}</span>
        {isFiltered && (
          <>
            {' · '}
            <button
              type="button"
              className="lb-reset-btn"
              onClick={onResetFilters}
            >
              Reset filters
            </button>
          </>
        )}
      </div>
    </div>
  )
}
