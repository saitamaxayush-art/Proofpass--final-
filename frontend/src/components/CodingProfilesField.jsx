import React, { useState, useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import { platforms, ALLOW_MULTIPLE_PER_PLATFORM } from '../config/platforms.js'
import { parseProfileLink } from '../utils/parseProfileLink.js'

const RM =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function getPlatformLabel(platformId) {
  const p = platforms.find((item) => item.id === platformId)
  return p ? p.label : platformId
}

/**
 * Validates a single row value against platform rules and duplicates.
 */
function validateRow(value, index, allRows) {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    return { error: null, parsed: null }
  }

  const result = parseProfileLink(trimmed)

  if (result.error === 'unsupported') {
    return {
      error: 'Only Codeforces and LeetCode links are supported right now.',
      parsed: null,
    }
  }

  if (result.error === 'no_handle') {
    return {
      error: 'This link has no profile name. Paste the full profile URL.',
      parsed: null,
    }
  }

  // Exact duplicate check
  const isDuplicate = allRows.some((r, idx) => {
    if (idx === index) return false
    return (
      r.parsed &&
      r.parsed.platform === result.platform &&
      r.parsed.handle.toLowerCase() === result.handle.toLowerCase()
    )
  })

  if (isDuplicate) {
    return {
      error: 'This profile is already added.',
      parsed: null,
    }
  }

  // Platform duplicate check
  if (!ALLOW_MULTIPLE_PER_PLATFORM) {
    const isPlatformUsed = allRows.some((r, idx) => {
      if (idx === index) return false
      return r.parsed && r.parsed.platform === result.platform
    })

    if (isPlatformUsed) {
      return {
        error: 'One profile per platform for now.',
        parsed: null,
      }
    }
  }

  return {
    error: null,
    parsed: result,
  }
}

/**
 * Re-validates all rows to clear or trigger duplicate conflict errors across rows.
 */
function revalidateAllRows(rows) {
  return rows.map((r, idx) => {
    if (!r.value.trim()) {
      return { ...r, error: null, parsed: null }
    }
    const validated = validateRow(r.value, idx, rows)
    return {
      ...r,
      error: validated.error,
      parsed: validated.parsed,
    }
  })
}

export function CodingProfilesField({
  value,
  onChange,
  label = '3. Coding Profiles (Optional)',
}) {
  const counterRef = useRef(1)
  const [rows, setRows] = useState(() => {
    if (Array.isArray(value) && value.length > 0) {
      return value.map((item, idx) => {
        const rowVal = typeof item === 'string' ? item : item.value || item.url || ''
        const id = item.id || `cp_${idx}`
        const initialRows = [{ id, value: rowVal, error: null, parsed: null }]
        const validation = validateRow(rowVal, 0, initialRows)
        return {
          id,
          value: rowVal,
          error: validation.error,
          parsed: validation.parsed,
        }
      })
    }
    return [{ id: 'cp_0', value: '', error: null, parsed: null }]
  })

  const [announcement, setAnnouncement] = useState('')
  const inputRefs = useRef([])
  const rowRefs = useRef([])
  const addButtonRef = useRef(null)
  const pendingFocusIndexRef = useRef(null)

  // Notify parent on changes
  const notifyParent = useCallback(
    (updatedRows) => {
      if (typeof onChange === 'function') {
        onChange(updatedRows)
      }
    },
    [onChange]
  )

  // Focus effect for newly added or sensible removal targets
  useEffect(() => {
    if (pendingFocusIndexRef.current !== null) {
      const idx = pendingFocusIndexRef.current
      pendingFocusIndexRef.current = null
      if (inputRefs.current[idx]) {
        inputRefs.current[idx].focus()
      }
    }
  }, [rows])

  // Change handler (mid-typing: update text, do not show premature errors)
  const handleChange = (index, newValue) => {
    setRows((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        value: newValue,
        error: null, // Clear error while editing
      }
      notifyParent(next)
      return next
    })
  }

  // Paste handler: immediate format validation
  const handlePaste = (index, e) => {
    const pastedText = e.clipboardData.getData('text')
    // Wait for the pasted text to settle in the input
    setTimeout(() => {
      setRows((prev) => {
        const next = [...prev]
        const val = next[index]?.value || pastedText
        const validation = validateRow(val, index, prev)
        next[index] = {
          ...next[index],
          value: val,
          error: validation.error,
          parsed: validation.parsed,
        }
        const synced = revalidateAllRows(next)
        notifyParent(synced)
        return synced
      })
    }, 0)
  }

  // Blur handler: validation runs on blur
  const handleBlur = (index) => {
    setRows((prev) => {
      const target = prev[index]
      if (!target) return prev

      const validation = validateRow(target.value, index, prev)
      const next = [...prev]
      next[index] = {
        ...target,
        error: validation.error,
        parsed: validation.parsed,
      }
      const synced = revalidateAllRows(next)
      notifyParent(synced)
      return synced
    })
  }

  // Add another profile row
  const handleAddRow = () => {
    if (rows.length >= 5) return

    const newId = `cp_${counterRef.current++}`
    const newRows = [...rows, { id: newId, value: '', error: null, parsed: null }]
    const newIndex = newRows.length - 1

    pendingFocusIndexRef.current = newIndex
    setRows(newRows)
    notifyParent(newRows)

    if (newRows.length === 5) {
      setAnnouncement('Added coding profile row 5. Maximum of 5 profiles for now.')
    } else {
      setAnnouncement(`Added coding profile row ${newRows.length}. ${5 - newRows.length} remaining.`)
    }

    // Animate new row appearance if not reduced-motion
    if (!RM) {
      setTimeout(() => {
        const el = rowRefs.current[newIndex]
        if (el) {
          gsap.fromTo(el, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' })
        }
      }, 0)
    }
  }

  // Remove a row
  const handleRemoveRow = (index) => {
    if (rows.length <= 1) return

    const targetFocusIndex = index > 0 ? index - 1 : 0
    pendingFocusIndexRef.current = targetFocusIndex

    const filtered = rows.filter((_, idx) => idx !== index)
    const synced = revalidateAllRows(filtered)
    setRows(synced)
    notifyParent(synced)

    setAnnouncement(`Removed coding profile row ${index + 1}.`)
  }

  // Key down handler: enter in a valid row moves focus instead of form submit
  const handleKeyDown = (index, e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const row = rows[index]
      const validation = validateRow(row.value, index, rows)

      if (validation.parsed && !validation.error) {
        if (index < rows.length - 1) {
          inputRefs.current[index + 1]?.focus()
        } else if (canAdd) {
          handleAddRow()
        } else {
          addButtonRef.current?.focus()
        }
      }
    }
  }

  // Add button is active once every existing row has a valid link and rows < 5
  const canAdd =
    rows.length < 5 &&
    rows.every((r) => r.value.trim() !== '' && r.parsed && !r.error)

  const helperText =
    rows.length >= 5
      ? 'Maximum of 5 profiles for now.'
      : 'Codeforces or LeetCode profile URL. Optional.'

  return (
    <div className="form-group coding-profiles-group">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="coding-profile-list">
        {rows.map((row, index) => {
          const rowNumber = index + 1
          const inputId = `coding-profile-input-${row.id}`
          const errorId = `coding-profile-err-${row.id}`
          const helperId = 'coding-profile-helper-text'

          return (
            <div
              key={row.id}
              className="coding-profile-row"
              ref={(el) => (rowRefs.current[index] = el)}
            >
              <label className="form-label" htmlFor={inputId}>
                {index === 0 ? label : `Coding profile link ${rowNumber}`}
              </label>

              <div className="coding-profile-input-wrap">
                <input
                  id={inputId}
                  type="text"
                  ref={(el) => (inputRefs.current[index] = el)}
                  className="form-input"
                  placeholder="https://codeforces.com/profile/username or https://leetcode.com/u/username"
                  value={row.value}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onPaste={(e) => handlePaste(index, e)}
                  onBlur={() => handleBlur(index)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  aria-label={`Coding profile link row ${rowNumber}`}
                  aria-invalid={Boolean(row.error)}
                  aria-describedby={`${helperId} ${row.error ? errorId : ''}`.trim()}
                />

                {row.parsed && !row.error && (
                  <span
                    className="coding-profile-chip"
                    role="status"
                    aria-label={`Detected ${getPlatformLabel(row.parsed.platform)} profile for ${row.parsed.handle}`}
                  >
                    {getPlatformLabel(row.parsed.platform)} / {row.parsed.handle}
                  </span>
                )}

                {rows.length > 1 && (
                  <button
                    type="button"
                    className="b g sm remove-profile-btn"
                    aria-label={`Remove coding profile row ${rowNumber}`}
                    onClick={() => handleRemoveRow(index)}
                  >
                    Remove
                  </button>
                )}
              </div>

              {row.error && (
                <p id={errorId} className="field-error" role="alert">
                  {row.error}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <p id="coding-profile-helper-text" className="coding-profile-helper">
        {helperText}
      </p>

      <button
        type="button"
        ref={addButtonRef}
        className="b g sm add-profile-btn"
        disabled={!canAdd}
        onClick={handleAddRow}
      >
        Add another profile
      </button>
    </div>
  )
}
