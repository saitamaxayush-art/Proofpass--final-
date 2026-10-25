/**
 * Candidate Comparison Component (/recruiter/role/:roleId/compare)
 * Side-by-side comparison of 2 to 3 candidates evaluated against role requirements.
 * Lazy-loaded, role-guarded, accessible, and responsive.
 */

import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { getRole } from '../api/roles.js'
import { listApplicantsForRole } from '../api/applicants.js'
import { listPassports } from '../api/passports.js'
import { buildComparison } from '../lib/compare.js'
import { RM } from '../lib.js'

export default function CandidateCompare() {
  const { roleId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [role, setRole] = useState(null)
  const [allApplicantsWithPassport, setAllApplicantsWithPassport] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorNotice, setErrorNotice] = useState(null)

  // Toggle: Show only skills where candidates differ (default off)
  const [differOnly, setDifferOnly] = useState(false)

  // Shared anonymous screening state from sessionStorage
  const [hideNames, setHideNames] = useState(() => {
    try {
      return sessionStorage.getItem('pp_recruiter_hide_names') === 'true'
    } catch {
      return false
    }
  })

  const toggleHideNames = (val) => {
    setHideNames(val)
    try {
      sessionStorage.setItem('pp_recruiter_hide_names', String(val))
    } catch {
      // storage unavailable
    }
  }

  // Parse candidate IDs from query string (?ids=a,b,c)
  const queryIds = useMemo(() => {
    const raw = searchParams.get('ids')
    if (!raw) return []
    return raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  }, [searchParams])

  // Load role and applicants
  useEffect(() => {
    let mounted = true
    async function loadData() {
      try {
        const r = await getRole(roleId)
        if (!mounted) return
        setRole(r)

        const { withPassport } = await listApplicantsForRole(roleId)
        const browserPassports = await listPassports()
        const matchingLive = browserPassports.find(
          (p) =>
            !p.revoked &&
            p.targetRole &&
            (p.targetRole.toLowerCase().includes(r.title.toLowerCase().slice(0, 10)) ||
              r.title.toLowerCase().includes(p.targetRole.toLowerCase().slice(0, 10)))
        )

        let combined = [...withPassport]
        if (matchingLive && !combined.some((a) => a.passport?.id === matchingLive.id)) {
          combined.unshift({
            id: `live_demo_${matchingLive.id}`,
            name: matchingLive.candidate || 'Live Demo Applicant',
            email: 'live.applicant@browser.local',
            hasPassport: true,
            passport: matchingLive,
            isLiveDemo: true,
          })
        }

        if (mounted) {
          setAllApplicantsWithPassport(combined)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setErrorNotice(err.message || 'Failed to load role evaluation data.')
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [roleId])

  // Filter valid applicants that match the query IDs
  const selectedApplicants = useMemo(() => {
    if (!allApplicantsWithPassport.length || !queryIds.length) return []
    const applicantMap = new Map()
    allApplicantsWithPassport.forEach((a) => applicantMap.set(a.id, a))
    return queryIds.map((id) => applicantMap.get(id)).filter(Boolean)
  }, [allApplicantsWithPassport, queryIds])

  // Pure comparison build
  const comparison = useMemo(() => {
    if (!role || selectedApplicants.length < 2) return null
    return buildComparison(role, selectedApplicants)
  }, [role, selectedApplicants])

  // Handler: Remove one candidate from comparison
  const handleRemoveCandidate = (candidateId) => {
    const nextIds = queryIds.filter((id) => id !== candidateId)
    // Update sessionStorage so returning to leaderboard remembers the new selection
    try {
      sessionStorage.setItem(`pp-compare-${roleId}`, JSON.stringify(nextIds))
    } catch {
      // storage unavailable
    }

    if (nextIds.length > 0) {
      setSearchParams({ ids: nextIds.join(',') }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  // Filter skills matrix based on differOnly toggle
  const displayedSkillsMatrix = useMemo(() => {
    if (!comparison) return []
    if (!differOnly) return comparison.skillsMatrix
    return comparison.skillsMatrix.filter((item) => item.hasDifference)
  }, [comparison, differOnly])

  if (loading) {
    return (
      <main id="main" className="dash-page">
        <div className="w">
          <div className="login-notice">
            <span className="notice-dot" aria-hidden="true" />
            <span>Loading candidate comparison workspace...</span>
          </div>
        </div>
      </main>
    )
  }

  // If role is missing or error
  if (!role || errorNotice) {
    return (
      <main id="main" className="dash-page">
        <div className="w">
          <div className="table-card glass card-pad-36 text-center">
            <span className="k m text-accent">EVALUATION ERROR</span>
            <h1 className="section-title-sm mt-12 mb-8">
              Comparison Unavailable
            </h1>
            <p className="text-muted-sm max-w-480 mx-auto mb-20">
              {errorNotice || 'The requested role could not be evaluated.'}
            </p>
            <Link to={`/recruiter/role/${roleId}`} className="b sm">
              Back to role
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Validation: Fewer than 2 valid candidates
  if (selectedApplicants.length < 2) {
    return (
      <main id="main" className="dash-page">
        <div className="w">
          <div className="dash-header">
            <div className="flex-center-gap8 mb-4">
              <Link to={`/recruiter/role/${roleId}`} className="back-home-link text-sm">
                ← Back to leaderboard
              </Link>
              <span className="text-faint">/</span>
              <span className="k m">{role.title}</span>
            </div>
            <h1 className="dash-title">Candidate Comparison</h1>
          </div>

          <div className="table-card glass card-pad-36 text-center">
            <div className="empty-icon-lg" aria-hidden="true">
              ⚖️
            </div>
            <h2 className="section-title-sm mb-8">
              Pick at least 2 candidates to compare.
            </h2>
            <p className="text-muted-sm max-w-480 mx-auto mb-24">
              Select 2 or 3 evaluated candidates with verified skill passports from the role leaderboard.
            </p>
            <Link to={`/recruiter/role/${roleId}`} className="b sm">
              Back to leaderboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const { candidates } = comparison

  return (
    <main id="main" className="dash-page">
      <div className="w">
        {/* Navigation & Header */}
        <div className="dash-header">
          <div className="flex-center-gap8 mb-6">
            <Link to={`/recruiter/role/${roleId}`} className="back-home-link text-sm">
              ← Back to leaderboard
            </Link>
            <span className="text-faint">/</span>
            <span className="k m">{role.company}</span>
            <span className="text-faint">/</span>
            <span className="k m">{role.title}</span>
          </div>

          <div className="dash-header-row">
            <div>
              <h1 className="dash-title">Side-by-Side Candidate Comparison</h1>
              <p className="dash-subtitle">
                Comparing {candidates.length} candidates against {role.requiredSkills?.length || 0} required competencies for <strong>{role.title}</strong>.
              </p>
            </div>

            <div className="flex-center-gap12 flex-wrap">
              {/* Anonymous Screening Switch */}
              <label className="revoke-switch-label" title="Mask candidate names for unbiased screening">
                <input
                  type="checkbox"
                  checked={hideNames}
                  onChange={(e) => toggleHideNames(e.target.checked)}
                />
                <span>Hide candidate names (Anonymous Review)</span>
              </label>

              <Link to={`/recruiter/role/${roleId}`} className="b sm g">
                Back to leaderboard
              </Link>
            </div>
          </div>
        </div>

        {/* Comparison Table Card with horizontal scroll containment on mobile */}
        <div className="table-card glass compare-card">
          <div className="compare-table-wrapper" data-lenis-prevent>
            <table className="compare-table" role="table">
              <thead>
                <tr>
                  <th className="compare-row-label-col compare-sticky-label-col" scope="col">
                    <span className="k m text-faint">METRIC / CANDIDATE</span>
                  </th>
                  {candidates.map((cand) => (
                    <th key={cand.id} className="compare-candidate-col" scope="col">
                      <div className="candidate-header-cell">
                        <div className="candidate-header-info">
                          <strong className="candidate-header-name">
                            {hideNames ? `Candidate #${cand.rank.toString().padStart(2, '0')}` : cand.name}
                          </strong>
                          {cand.isLiveDemo && (
                            <span className="live-demo-tag">Live demo</span>
                          )}
                          {cand.isRecruiterGenerated && (
                            <span className="recruiter-tag">Recruiter generated</span>
                          )}
                        </div>

                        <div className="candidate-header-actions">
                          {cand.passportId && (
                            <Link
                              to={`/passport/${cand.passportId}`}
                              className="b sm g btn-compact"
                              title="Inspect cryptographic passport and evidence"
                            >
                              View passport
                            </Link>
                          )}
                          <button
                            type="button"
                            className="compare-remove-btn"
                            onClick={() => handleRemoveCandidate(cand.id)}
                            title={`Remove ${hideNames ? `Candidate #${cand.rank}` : cand.name} from comparison`}
                            aria-label={`Remove ${hideNames ? `Candidate #${cand.rank}` : cand.name} from comparison`}
                          >
                            × Remove
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* ROW 1: Rank and match % (large number) */}
                <tr className="compare-row">
                  <th className="compare-row-label-cell compare-sticky-label-col" scope="row">
                    <span className="compare-label-title">Rank & Match</span>
                    <span className="compare-label-hint">Overall weighted fit</span>
                  </th>
                  {candidates.map((cand) => (
                    <td key={cand.id} className="compare-data-cell">
                      <div className="compare-score-box">
                        <div className="flex-baseline-gap8">
                          <span className={`rank-badge rank-badge-sm ${cand.rank === 1 ? 'top-1' : ''}`}>
                            #{cand.rank}
                          </span>
                          <span className="compare-score-val">
                            {cand.score}%
                          </span>
                        </div>
                        <span className="compare-match-subtext">
                          {cand.rank === 1 ? 'Rank leader' : `Rank #${cand.rank} evaluated`}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* ROW 2: Skill states: four counts V, S, C, X as numbers with labels */}
                <tr className="compare-row">
                  <th className="compare-row-label-cell compare-sticky-label-col" scope="row">
                    <span className="compare-label-title">Skill States</span>
                    <span className="compare-label-hint">V · S · C · X distribution</span>
                  </th>
                  {candidates.map((cand) => (
                    <td key={cand.id} className="compare-data-cell">
                      <div className="compare-states-block">
                        <div className="compare-state-counts">
                          <span className="state-count-chip v-chip" title="Verified skills">
                            <strong>{cand.counts.V}</strong> Verified
                          </span>
                          <span className="state-count-chip s-chip" title="Supported skills">
                            <strong>{cand.counts.S}</strong> Supported
                          </span>
                          <span className="state-count-chip c-chip" title="Claimed skills">
                            <strong>{cand.counts.C}</strong> Claimed
                          </span>
                          <span className="state-count-chip x-chip" title="Contradicted skills">
                            <strong>{cand.counts.X}</strong> Contradicted
                          </span>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* ROW 3: Evidence freshness (latest evidence date) */}
                <tr className="compare-row">
                  <th className="compare-row-label-cell compare-sticky-label-col" scope="row">
                    <span className="compare-label-title">Evidence Freshness</span>
                    <span className="compare-label-hint">Latest repository audit</span>
                  </th>
                  {candidates.map((cand) => (
                    <td key={cand.id} className="compare-data-cell">
                      <div className="compare-freshness-box">
                        <span className="freshness-date-badge">
                          📅 {cand.freshness.label}
                        </span>
                        <span className="freshness-subtext">
                          Cryptographically sealed
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* ROW 4: Key strengths: up to 3 required skills in state V, ordered by importance then freshness */}
                <tr className="compare-row">
                  <th className="compare-row-label-cell compare-sticky-label-col" scope="row">
                    <span className="compare-label-title">Key Strengths</span>
                    <span className="compare-label-hint">Top verified required skills</span>
                  </th>
                  {candidates.map((cand) => (
                    <td key={cand.id} className="compare-data-cell">
                      <div className="compare-list-box">
                        {cand.strengths.length === 0 ? (
                          <span className="empty-indicator">No required skills verified</span>
                        ) : (
                          cand.strengths.map((str, idx) => (
                            <div key={idx} className="strength-item">
                              <span className="strength-bullet" aria-hidden="true">✓</span>
                              <span className="strength-text">{str}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* ROW 5: Concerns: up to 3 required skills (Contradicted first, then Claimed, then not on passport) */}
                <tr className="compare-row">
                  <th className="compare-row-label-cell compare-sticky-label-col" scope="row">
                    <span className="compare-label-title">Concerns</span>
                    <span className="compare-label-hint">Contradicted, Claimed, Missing</span>
                  </th>
                  {candidates.map((cand) => (
                    <td key={cand.id} className="compare-data-cell">
                      <div className="compare-list-box">
                        {cand.concerns.length === 0 ? (
                          <span className="clean-indicator">✓ No flag warnings on required skills</span>
                        ) : (
                          cand.concerns.map((con, idx) => {
                            const isContradicted = con.startsWith('Contradicted')
                            const isClaimed = con.startsWith('Claimed')
                            return (
                              <div
                                key={idx}
                                className={`concern-item ${isContradicted ? 'contradicted' : isClaimed ? 'claimed' : 'missing'}`}
                              >
                                <span className="concern-bullet" aria-hidden="true">
                                  {isContradicted ? '!' : isClaimed ? '?' : '—'}
                                </span>
                                <span className="concern-text">{con}</span>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* ROW 6: Required skills table section header & toggle */}
                <tr className="compare-section-header-row">
                  <th colSpan={candidates.length + 1} className="compare-section-th">
                    <div className="skills-section-bar">
                      <div>
                        <strong className="compare-section-title">
                          Required Competencies Breakdown
                        </strong>
                        <span className="compare-section-subtitle">
                          Ordered by importance: Must (3x) → Should (2x) → Nice (1x)
                        </span>
                      </div>

                      {/* Differ Only Filter Toggle */}
                      <label className="differ-toggle-label">
                        <input
                          type="checkbox"
                          checked={differOnly}
                          onChange={(e) => setDifferOnly(e.target.checked)}
                        />
                        <span>Show only skills where they differ ({comparison.differingSkillsCount})</span>
                      </label>
                    </div>
                  </th>
                </tr>

                {/* ROW 6 SUB-ROWS: One row per required skill */}
                {displayedSkillsMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={candidates.length + 1} className="text-center pad-cell-32 text-muted-sm">
                      No skills meet the filter criteria (all evaluated candidates share the exact same state for all skills).
                    </td>
                  </tr>
                ) : (
                  displayedSkillsMatrix.map((item) => (
                    <tr key={item.skill} className="compare-skill-row">
                      <th className="compare-skill-label-cell compare-sticky-label-col" scope="row">
                        <div className="skill-label-content">
                          <strong className="skill-label-name">{item.skill}</strong>
                          <span className={`importance-tag ${item.importance.toLowerCase()}`}>
                            {item.importance}
                          </span>
                        </div>
                      </th>

                      {item.states.map((st) => {
                        let stateText = 'Missing'
                        let chipClass = 'missing'
                        let letter = '—'

                        if (st.state === 'V') {
                          stateText = 'Verified'
                          chipClass = 'V'
                          letter = 'V'
                        } else if (st.state === 'S') {
                          stateText = 'Supported'
                          chipClass = 'S'
                          letter = 'S'
                        } else if (st.state === 'C') {
                          stateText = 'Claimed'
                          chipClass = 'C'
                          letter = 'C'
                        } else if (st.state === 'X') {
                          stateText = 'Contradicted'
                          chipClass = 'X'
                          letter = 'X'
                        }

                        return (
                          <td key={st.applicantId} className="compare-skill-data-cell">
                            <div className="skill-state-cell-wrapper">
                              <span
                                className={`chip sm ${chipClass}`}
                                title={`${item.skill}: ${letter} ${stateText}`}
                              >
                                <strong>{letter}</strong> {stateText}
                              </span>

                              {/* Strongest tag: single highlight style for strongest value */}
                              {st.isStrongest && (
                                <span className="compare-strongest-badge" title="Strictly highest verified state among compared candidates">
                                  Strongest
                                </span>
                              )}

                              {/* Row-level confidence when present */}
                              {st.confidenceText && (
                                <span className="compare-conf-text" title={`Evidence confidence: ${st.confidenceText}`}>
                                  {st.confidenceText}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
