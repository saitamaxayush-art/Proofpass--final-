/**
 * StatePanel Component
 * In-row expandable skills panel displayed when a recruiter clicks any of the
 * 4 state toggles (Verified, Supported, Claimed, Contradicted) on a candidate row.
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { L } from '../../data.js'
import { formatConfidence } from '../../lib/confidence.js'

export default function StatePanel({
  candidate,
  role,
  openState,
  skillsByState,
  onClose,
  displayedName,
}) {
  useEffect(() => {
    if (!openState) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose(candidate.id, openState)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openState, candidate.id, onClose])

  if (!openState) return null

  const stateName = L[openState] || openState
  const skillsInState = skillsByState[openState] || []

  // Group 1: Required by this role (Must > Should > Nice > name)
  const reqOrder = { Must: 1, Should: 2, Nice: 3 }
  const requiredSkills = skillsInState
    .filter((s) => s.importance !== null)
    .sort((a, b) => {
      const diff = (reqOrder[a.importance] || 99) - (reqOrder[b.importance] || 99)
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name)
    })

  // Group 2: Other skills on the passport (by name)
  const otherSkills = skillsInState
    .filter((s) => s.importance === null)
    .sort((a, b) => a.name.localeCompare(b.name))

  const renderSkillRow = (skill) => {
    const confVal =
      skill.confidence !== undefined && skill.confidence !== null
        ? skill.confidence <= 1 && skill.confidence > 0
          ? Math.round(skill.confidence * 100)
          : Math.round(skill.confidence)
        : null

    const importanceLabel = skill.importance || 'Extra'

    return (
      <div key={skill.skillId} className="sp-skill-row">
        <div className="sp-skill-main">
          <div className="sp-skill-meta-line">
            <strong className="sp-skill-name">{skill.name}</strong>
            <span className="sp-importance-word">{importanceLabel}</span>
            {formatConfidence(confVal) && (
              <span className="sp-conf-word">{formatConfidence(confVal)}</span>
            )}
          </div>
          {skill.reason && (
            <div className="sp-reason-line">
              <span className="sp-reason-label">
                {skill.state === 'X' ? 'Flag reason: ' : 'Rationale: '}
              </span>
              <span className="sp-reason-text">{skill.reason}</span>
            </div>
          )}
        </div>
        <div className="sp-skill-action">
          {candidate.passport && (
            <Link
              to={`/passport/${candidate.passport.id}#${skill.passportAnchor}`}
              className="sp-evidence-link"
            >
              Show evidence →
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      id={`skills-panel-${candidate.id}`}
      className="sp-panel-content"
      role="region"
      aria-label={`${stateName} skills for ${displayedName}`}
    >
      <div className="sp-panel-header">
        <div className="sp-panel-title-wrap">
          <h4 className="sp-panel-heading">
            {stateName} skills ({skillsInState.length})
          </h4>
          <span className="sp-panel-sub">for {displayedName}</span>
        </div>
        <button
          type="button"
          className="b sm g sp-close-btn"
          onClick={() => onClose(candidate.id, openState)}
          aria-label={`Close ${stateName} skills panel`}
        >
          ✕ Close
        </button>
      </div>

      <div className="sp-panel-body">
        {requiredSkills.length > 0 && (
          <div className="sp-skills-group">
            <h5 className="sp-group-heading">
              Required by this role ({requiredSkills.length})
            </h5>
            <div className="sp-group-items">
              {requiredSkills.map(renderSkillRow)}
            </div>
          </div>
        )}

        {otherSkills.length > 0 && (
          <div className="sp-skills-group">
            <h5 className="sp-group-heading">
              Other skills on the passport ({otherSkills.length})
            </h5>
            <div className="sp-group-items">
              {otherSkills.map(renderSkillRow)}
            </div>
          </div>
        )}

        {skillsInState.length === 0 && (
          <p className="sp-empty-state">
            No skills found in {stateName} state for this candidate.
          </p>
        )}
      </div>
    </div>
  )
}
