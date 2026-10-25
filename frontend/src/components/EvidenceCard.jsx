/**
 * EvidenceCard Component
 * Displays verifiable code or resume evidence details behind a skill claim.
 * Includes source badges, commit/content hashes, verbatim monospace excerpts,
 * confidence meters with factor breakdown, and open evidence links.
 */

import { useState } from 'react'

export function EvidenceCard({ detail, evidence }) {
  const [showFactors, setShowFactors] = useState(false)
  const d = detail || evidence

  if (!d) return null

  const isSample = d.excerptSource === 'sample'
  const isResume = d.source === 'resume' || d.excerptSource === 'resume'
  const isConflict = Boolean(d.flagReason) || d.label === 'Why it conflicts'

  // Normalize confidence object
  let confVal = null
  let confLabel = null
  let confFactors = []

  if (d.confidence != null) {
    if (typeof d.confidence === 'number') {
      confVal = d.confidence
      confLabel = confVal >= 70 ? 'High' : confVal >= 40 ? 'Medium' : 'Low'
    } else if (typeof d.confidence === 'object') {
      confVal = typeof d.confidence.value === 'number' ? d.confidence.value : null
      confLabel = d.confidence.label || (confVal != null ? (confVal >= 70 ? 'High' : confVal >= 40 ? 'Medium' : 'Low') : null)
      confFactors = Array.isArray(d.confidence.factors) ? d.confidence.factors : []
    }
  }

  const sourceName =
    d.source === 'github'
      ? 'GitHub'
      : d.source === 'leetcode'
        ? 'LeetCode'
        : d.source === 'certificate'
          ? 'Certificate'
          : d.source === 'resume'
            ? 'Resume'
            : d.source || 'Evidence'

  return (
    <div className={`evidence-card ${isConflict ? 'conflict-card' : ''}`}>
      {/* Header Bar */}
      <div className="evidence-card-header">
        <div className="evidence-card-badges">
          <span className={`chip sm ${isConflict ? 'X' : isResume ? 'C' : 'V'}`}>
            {sourceName}
          </span>
          {isSample && (
            <span className="chip sm S" style={{ marginLeft: 6 }}>
              Sample
            </span>
          )}
          {d.label && (
            <span className="evidence-type-label">
              {d.label}
            </span>
          )}
        </div>
        {d.fetchedAt && (
          <span className="evidence-date" title={d.fetchedAt}>
            Audited {new Date(d.fetchedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* File & Commit metadata */}
      {(d.file || d.commit || d.contentHash || d.authorLineShare != null || d.commitCount != null) && (
        <div className="evidence-meta-row">
          {d.file && (
            <span className="evidence-filepath" title={d.file}>
              📄 {d.file}
            </span>
          )}
          {d.commit && (
            <code className="evidence-commit" title="Git Commit SHA">
              commit:{String(d.commit).slice(0, 7)}
            </code>
          )}
          {d.contentHash && (
            <code className="evidence-hash" title="Content SHA-256 Digest">
              sha256:{String(d.contentHash).slice(0, 8)}
            </code>
          )}
          {d.authorLineShare != null && (
            <span className="evidence-lineshare" title="Author Line Share">
              Author share: <strong>{d.authorLineShare}%</strong>
            </span>
          )}
          {d.commitCount != null && d.commitCount > 0 && (
            <span className="evidence-commits" title="Original Commits">
              Commits: <strong>{d.commitCount}</strong>
            </span>
          )}
        </div>
      )}

      {/* Conflict / Flag Reason */}
      {d.flagReason && (
        <div className="evidence-conflict-alert" role="alert">
          <strong style={{ color: 'var(--st-x)' }}>Why it conflicts:</strong>{' '}
          <span>{d.flagReason}</span>
        </div>
      )}

      {/* Judgment Rationale (when not in conflict) */}
      {!d.flagReason && d.rationale && (
        <div className="evidence-rationale-box">
          <strong style={{ color: 'var(--accent, #3b82f6)' }}>Judgment rationale:</strong>{' '}
          <span>{d.rationale}</span>
        </div>
      )}

      {/* Monospace Excerpt */}
      <div className="evidence-excerpt-box">
        <div className="evidence-excerpt-content">
          {d.excerpt || 'No excerpt available'}
        </div>
        {d.matchedTerm && (
          <div className="evidence-alias-tag">
            Matched alias: <code>{d.matchedTerm}</code> (
            {isSample
              ? 'sample evidence'
              : isResume
                ? 'resume claim'
                : 'file content'}
            )
          </div>
        )}
      </div>

      {/* Confidence Meter (Only if confidence exists) */}
      {confVal != null && (
        <div className="evidence-confidence-container">
          <div className="evidence-confidence-top">
            <span className="evidence-confidence-score">
              Confidence: <strong>{confVal}%</strong> ({confLabel})
            </span>
            {confFactors.length > 0 && (
              <button
                type="button"
                className="confidence-factors-toggle"
                onClick={() => setShowFactors(!showFactors)}
                aria-expanded={showFactors}
              >
                {showFactors ? 'Hide factors' : 'How is this computed?'}
              </button>
            )}
          </div>
          <div className="confidence-track" aria-hidden="true">
            <div
              className={`confidence-indicator ${confLabel ? confLabel.toLowerCase() : 'low'}`}
              style={{ width: `${confVal}%` }}
            />
          </div>
          {showFactors && confFactors.length > 0 && (
            <div className="confidence-breakdown-panel">
              <div className="confidence-breakdown-title">Contributing Factors</div>
              <ul className="confidence-factors-list">
                {confFactors.map((f, i) => (
                  <li key={i}>
                    <span>{f.label}:</span> <strong>{f.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Open Evidence Link */}
      {d.url && (
        <div className="evidence-footer-row">
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="evidence-link-btn"
          >
            Open evidence ↗
          </a>
        </div>
      )}
    </div>
  )
}

export default EvidenceCard
