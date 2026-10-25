/**
 * CandidateDrawer Component
 * Right-side quick view drawer sliding in 220ms (respects RM).
 * Displays candidate profile overview, full skills grouped by state (V, S, C, X),
 * focus trap, Escape to dismiss, and View Passport action button.
 */

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { RM } from '../../lib.js'
import { getSkillsByState } from '../../lib/skillsByState.js'
import { formatConfidence } from '../../lib/confidence.js'

export default function CandidateDrawer({
  candidate,
  role,
  isOpen,
  onClose,
  displayedName,
}) {
  const drawerRef = useRef(null)
  const closeBtnRef = useRef(null)

  // Focus trap & Escape listener
  useEffect(() => {
    if (!isOpen) return

    closeBtnRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !candidate) return null

  const skillsByState = getSkillsByState(candidate.passport, role)

  const statesConfig = [
    { key: 'V', title: 'Verified', swatchClass: 'swatch-v', desc: 'Proven by evidence and passed check' },
    { key: 'S', title: 'Supported', swatchClass: 'swatch-s', desc: 'Evidence found from external links' },
    { key: 'C', title: 'Claimed', swatchClass: 'swatch-c', desc: 'Resume-only claim' },
    { key: 'X', title: 'Contradicted', swatchClass: 'swatch-x', desc: 'Evidence conflicts with claim' },
  ]

  // Initials for avatar
  const initials = displayedName.startsWith('Candidate #')
    ? displayedName.replace('Candidate #', '#')
    : displayedName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

  return (
    <div
      className={`candidate-drawer-overlay ${RM ? 'rm' : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Candidate profile for ${displayedName}`}
    >
      <div
        ref={drawerRef}
        className={`candidate-drawer-panel ${RM ? 'rm' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="candidate-drawer-header">
          <div className="candidate-drawer-heading-wrap">
            <div className="lb-avatar" aria-hidden="true">
              {initials}
            </div>
            <div>
              <h2 className="candidate-drawer-name">{displayedName}</h2>
              <div className="role-meta-line mt-2">
                <span className="candidate-drawer-match-badge">
                  {candidate.score}% match
                </span>
                <span className="role-meta-dot" aria-hidden="true">·</span>
                <span>Rank #{candidate.rank}</span>
                {candidate.isLiveDemo && (
                  <>
                    <span className="role-meta-dot" aria-hidden="true">·</span>
                    <span className="lb-tag">Live demo</span>
                  </>
                )}
                {candidate.isRecruiterGenerated && (
                  <>
                    <span className="role-meta-dot" aria-hidden="true">·</span>
                    <span className="lb-tag">Recruiter generated</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="b sm g"
            onClick={onClose}
            aria-label="Close candidate drawer"
          >
            ✕
          </button>
        </div>

        {/* Drawer Body: Skills grouped by State */}
        <div className="candidate-drawer-body">
          {statesConfig.map(({ key, title, swatchClass }) => {
            const list = skillsByState[key] || []
            if (list.length === 0) return null

            return (
              <section key={key} className="candidate-drawer-section">
                <h3 className="candidate-drawer-section-title">
                  <span className={`lb-state-swatch ${swatchClass}`} aria-hidden="true" />
                  <span>
                    {title} ({list.length})
                  </span>
                </h3>

                <div className="sp-group-items">
                  {list.map((skill) => {
                    const confVal =
                      skill.confidence !== undefined && skill.confidence !== null
                        ? skill.confidence <= 1 && skill.confidence > 0
                          ? Math.round(skill.confidence * 100)
                          : Math.round(skill.confidence)
                        : null

                    return (
                      <div key={skill.skillId} className="sp-skill-row">
                        <div className="sp-skill-main">
                          <div className="sp-skill-meta-line">
                            <strong className="sp-skill-name">{skill.name}</strong>
                            {skill.importance && (
                              <span className="sp-importance-word">{skill.importance}</span>
                            )}
                            {skill.level !== undefined && (
                              <span className="sp-level-word">Level {skill.level}</span>
                            )}
                            {formatConfidence(confVal) && (
                              <span className="sp-conf-word">
                                {formatConfidence(confVal)}
                              </span>
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

                        {candidate.passport && (
                          <div className="sp-skill-action">
                            <Link
                              to={`/passport/${candidate.passport.id}#${skill.passportAnchor}`}
                              className="sp-evidence-link"
                              onClick={onClose}
                            >
                              Evidence →
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        {/* Drawer Footer */}
        <div className="candidate-drawer-footer">
          <button type="button" className="b sm g" onClick={onClose}>
            Close
          </button>
          {candidate.passport && (
            <Link
              to={`/passport/${candidate.passport.id}`}
              className="b sm"
              onClick={onClose}
            >
              View full passport →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
