/**
 * LeaderboardToolbar Component
 * Single-row controls above the leaderboard: search, filter select, sort select,
 * anonymous names toggle, showing count, reset action, and states info popover.
 */

import { useState, useRef, useEffect } from 'react'

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
}) {
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef(null)
  const triggerRef = useRef(null)

  const isFiltered =
    searchQuery.trim() !== '' || filterValue !== 'all' || sortValue !== 'rank'

  // Dismiss popover on outside click or Escape key
  useEffect(() => {
    if (!showPopover) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowPopover(false)
        triggerRef.current?.focus()
      }
    }

    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setShowPopover(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPopover])

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

      {/* 5. What do the states mean? Info Popover */}
      <div className="lb-info-wrap">
        <button
          ref={triggerRef}
          type="button"
          className="lb-info-trigger"
          onClick={() => setShowPopover((prev) => !prev)}
          aria-expanded={showPopover}
          aria-haspopup="dialog"
          aria-label="What do the skill states mean?"
        >
          <span>ℹ What do states mean?</span>
        </button>

        {showPopover && (
          <div
            ref={popoverRef}
            className="lb-info-popover"
            role="dialog"
            aria-label="Skill states legend"
          >
            <div className="lb-info-popover-item">
              <div className="lb-info-popover-header">
                <span className="lb-state-swatch swatch-v" aria-hidden="true" />
                <span>Verified</span>
              </div>
              <div className="lb-info-popover-desc">
                Proven by evidence and a passed check.
              </div>
            </div>

            <div className="lb-info-popover-item">
              <div className="lb-info-popover-header">
                <span className="lb-state-swatch swatch-s" aria-hidden="true" />
                <span>Supported</span>
              </div>
              <div className="lb-info-popover-desc">
                Evidence found from links or files.
              </div>
            </div>

            <div className="lb-info-popover-item">
              <div className="lb-info-popover-header">
                <span className="lb-state-swatch swatch-c" aria-hidden="true" />
                <span>Claimed</span>
              </div>
              <div className="lb-info-popover-desc">
                Self-reported on the resume only.
              </div>
            </div>

            <div className="lb-info-popover-item">
              <div className="lb-info-popover-header">
                <span className="lb-state-swatch swatch-x" aria-hidden="true" />
                <span className="text-contradicted">Contradicted</span>
              </div>
              <div className="lb-info-popover-desc">
                The evidence conflicts with the claim.
              </div>
            </div>
          </div>
        )}
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
