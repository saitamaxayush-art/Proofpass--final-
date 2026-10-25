/**
 * Applicant Dashboard Component
 * Displays applicant skill passport overview, verified skill breakdown with rationale,
 * share links, tamper verification, best-matching roles, and iMocha gap closing.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { listPassports, setPassportRevoked, savePassport } from '../api/passports.js'
import { getRecommendedRoles } from '../api/recommendations.js'
import { getLatestRoleKey, listRoadmaps } from '../api/roadmaps.js'
import { imochaLink } from '../data/resources.js'
import { L, WEIGHTS } from '../data.js'
import { generateRecommendations } from '../recommendations/index.js'

export default function ApplicantDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [passport, setPassport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stateFilter, setStateFilter] = useState('ALL')
  const [expandedEvidence, setExpandedEvidence] = useState({})
  const [recommendedRoles, setRecommendedRoles] = useState([])
  const [roleRoadmaps, setRoleRoadmaps] = useState([])
  const [latestRole, setLatestRole] = useState(null)
  const [selfSubmittedLinks, setSelfSubmittedLinks] = useState({})
  const [copiedLink, setCopiedLink] = useState(false)
  const [notice, setNotice] = useState(null)
  const [showAllLearnings, setShowAllLearnings] = useState(false)
  const [showAllRecommendations, setShowAllRecommendations] = useState(false)

  // Compute deterministic recommendations and learnings from passport and target role
  const recData = useMemo(() => {
    if (!passport) return null
    return generateRecommendations(passport, {
      targetRole: latestRole?.roleName || passport.targetRole || user?.profile?.targetRole,
    })
  }, [passport, latestRole, user?.profile?.targetRole])

  // Fetch candidate passport and best-matching roles
  useEffect(() => {
    let mounted = true
    async function loadData() {
      try {
        const userPassports = await listPassports(user?.id)
        let active = userPassports[0] || null

        // If no user-specific passport, check demo applicant passport in storage
        if (!active) {
          const all = await listPassports()
          active = all.find((p) => p.candidate === user?.name || p.userId === user?.id) || null
        }

        // Load latest target role and its roadmaps
        let role = await getLatestRoleKey(user?.id)
        let rms = []
        if (role) {
          rms = await listRoadmaps(user?.id, role.roleKey)
        } else if (active?.targetRole) {
          const roleKey = active.targetRole.toLowerCase().trim()
          role = { roleKey, roleName: active.targetRole }
          rms = await listRoadmaps(user?.id, roleKey)
        }

        if (mounted) {
          setPassport(active)
          setLatestRole(role)
          setRoleRoadmaps(rms || [])
          if (active && active.skills) {
            const roles = await getRecommendedRoles(active.skills)
            setRecommendedRoles(roles)
          } else {
            // Load sample roles with zero skills
            const roles = await getRecommendedRoles([])
            setRecommendedRoles(roles)
          }
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setNotice(`Failed to load passport: ${err.message}`)
          setLoading(false)
        }
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [user])

  // Toggle evidence drawer per skill row
  const toggleEvidence = (skill) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [skill]: !prev[skill],
    }))
  }

  // Revoke toggle handler
  const handleToggleRevoke = async () => {
    if (!passport) return
    const nextRevoked = !passport.revoked
    try {
      const updated = await setPassportRevoked(passport.id, nextRevoked)
      setPassport(updated)
      setNotice(nextRevoked ? 'Passport share revoked.' : 'Passport share re-activated.')
    } catch (err) {
      setNotice(err.message)
    }
  }

  // Copy share link
  const handleCopyShareLink = () => {
    if (!passport) return
    const url = `${window.location.origin}/passport/${passport.id}`
    navigator.clipboard?.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2200)
  }

  // Self-submit iMocha assessment link
  const handleSelfSubmitLink = async (skill) => {
    const link = selfSubmittedLinks[skill]?.trim()
    if (!link) return

    try {
      // Lift skill to Supported at most with label "not yet checked"
      const updatedSkills = passport.skills.map((s) => {
        if (s.skill === skill && (s.state === 'C' || s.state === 'X')) {
          return {
            ...s,
            state: 'S',
            evidence: `Self-submitted assessment link: ${link} (not yet checked)`,
            rationale: 'Supported: External assessment link submitted by candidate (not yet checked). Capped at Supported.',
          }
        }
        return s
      })

      const updated = await savePassport({ ...passport, skills: updatedSkills }, user?.id)
      setPassport(updated)
      setSelfSubmittedLinks((prev) => ({ ...prev, [skill]: '' }))
      setNotice(`Result link for ${skill} submitted. Skill elevated to Supported (not yet checked).`)

      // Recompute role match
      const roles = await getRecommendedRoles(updatedSkills)
      setRecommendedRoles(roles)
    } catch (err) {
      setNotice(err.message)
    }
  }

  if (loading) {
    return (
      <main id="main" className="dash-page">
        <div className="w">
          <div className="login-notice">
            <span className="notice-dot" aria-hidden="true" />
            <span>Loading applicant credibility passport...</span>
          </div>
        </div>
      </main>
    )
  }

  // EMPTY STATE: Before any passport exists
  if (!passport) {
    return (
      <main id="main" className="dash-page">
        <div className="w">
          <div className="dash-header">
            <span className="k m">APPLICANT DASHBOARD</span>
            <div className="dash-header-row">
              <div>
                <h1 className="dash-title">Welcome, {user?.name}</h1>
                <p className="dash-subtitle">
                  Target role: {user?.profile?.targetRole || 'Software Engineer'}
                </p>
              </div>
            </div>
          </div>

          <div className="table-card glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <span className="k m" style={{ color: 'var(--accent)' }}>NO PASSPORT GENERATED YET</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--ink)', margin: '10px 0 8px' }}>
              Verify your skills with verifiable evidence
            </h2>
            <p style={{ color: 'var(--muted)', maxWidth: '520px', margin: '0 auto 24px', fontSize: '0.92rem' }}>
              Run the ProofPass verification pipeline to link your resume claims to GitHub commits, LeetCode solutions, and credentials.
            </p>
            <Link to="/verify" className="b">
              Start verification <span className="btn-arrow" aria-hidden="true">-&gt;</span>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Calculate State Counts
  const skills = passport.skills || []
  const counts = {
    V: skills.filter((s) => s.state === 'V').length,
    S: skills.filter((s) => s.state === 'S').length,
    C: skills.filter((s) => s.state === 'C').length,
    X: skills.filter((s) => s.state === 'X').length,
    total: skills.length,
  }

  // Filter skills by state
  const filteredSkills =
    stateFilter === 'ALL'
      ? skills
      : skills.filter((s) => s.state === stateFilter)

  // Verify the rest: Claimed or Contradicted skills
  const skillsToVerifyRest = skills.filter((s) => s.state === 'C' || s.state === 'X')

  // Extract up to 3 next incomplete steps across active roadmaps
  const nextSteps = []
  for (const r of roleRoadmaps) {
    if (r.status !== 'completed') {
      for (const s of r.steps || []) {
        if (!s.done) {
          nextSteps.push({ ...s, skillName: r.skillName, roleKey: r.roleKey, skillId: r.skillId })
          if (nextSteps.length >= 3) break
        }
      }
    }
    if (nextSteps.length >= 3) break
  }

  return (
    <main id="main" className="dash-page">
      <div className="w">
        {/* Header & Overview */}
        <div className="dash-header">
          <span className="k m">SKILL CREDIBILITY PASSPORT</span>
          <div className="dash-header-row">
            <div>
              <h1 className="dash-title">{passport.candidate || user?.name}</h1>
              <p className="dash-subtitle">
                Target Role: <strong>{passport.targetRole}</strong> · Last Verified:{' '}
                {new Date(passport.issuedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <Link to="/verify" className="b sm">
                Re-verify passport
              </Link>
            </div>
          </div>
        </div>

        {/* Global Notice Toast */}
        {notice && (
          <div className="login-notice" style={{ marginBottom: '20px' }} role="status">
            <span className="notice-dot" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {/* Overview Strip */}
        <div className="overview-strip">
          <div className="overview-card">
            <span className="overview-card-label">Verified (100w)</span>
            <div className="overview-card-val" style={{ color: 'var(--st-v)' }}>
              {counts.V} <span style={{ fontSize: '0.85rem', color: 'var(--faint)' }}>skills</span>
            </div>
            <div className="state-chip-row">
              <span className="chip V">Verified</span>
            </div>
          </div>

          <div className="overview-card">
            <span className="overview-card-label">Supported (60w)</span>
            <div className="overview-card-val" style={{ color: 'var(--st-s)' }}>
              {counts.S} <span style={{ fontSize: '0.85rem', color: 'var(--faint)' }}>skills</span>
            </div>
            <div className="state-chip-row">
              <span className="chip S">Supported</span>
            </div>
          </div>

          <div className="overview-card">
            <span className="overview-card-label">Claimed (20w)</span>
            <div className="overview-card-val" style={{ color: 'var(--st-c)' }}>
              {counts.C} <span style={{ fontSize: '0.85rem', color: 'var(--faint)' }}>skills</span>
            </div>
            <div className="state-chip-row">
              <span className="chip C">Claimed</span>
            </div>
          </div>

          <div className="overview-card">
            <span className="overview-card-label">Contradicted (0w)</span>
            <div className="overview-card-val" style={{ color: 'var(--st-x)' }}>
              {counts.X} <span style={{ fontSize: '0.85rem', color: 'var(--faint)' }}>skills</span>
            </div>
            <div className="state-chip-row">
              <span className="chip X">Contradicted</span>
            </div>
          </div>
        </div>

        {/* My Passport Card */}
        <div className="passport-banner-card glass">
          <div className="passport-banner-top">
            <div>
              <div className="passport-id-box">
                <span className="k m" style={{ color: 'var(--accent)' }}>
                  OFFICIAL PASSPORT
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)' }}>
                  {passport.id}
                </span>
                {passport.revoked && (
                  <span className="chip X" style={{ fontSize: '0.7rem' }}>
                    REVOKED
                  </span>
                )}
              </div>
              <div style={{ marginTop: '8px' }}>
                <span className="seal-hash-display" title={passport.hash}>
                  SHA-256: {passport.hash}
                </span>
              </div>
            </div>

            <div className="passport-banner-actions">
              <label className="revoke-switch-label" title="Toggle public access for this share link">
                <input
                  type="checkbox"
                  checked={!passport.revoked}
                  onChange={handleToggleRevoke}
                />
                <span>{passport.revoked ? 'Share Revoked' : 'Share Active'}</span>
              </label>

              <button
                type="button"
                className="b sm g"
                onClick={handleCopyShareLink}
                disabled={passport.revoked}
              >
                {copiedLink ? '✓ Link copied' : 'Copy share link'}
              </button>

              <Link to={`/passport/${passport.id}`} className="b sm">
                Open passport view
              </Link>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <span>
              Total Skills Audited: <strong>{counts.total}</strong>
            </span>
            <span>
              Evidence Coverage Ratio:{' '}
              <strong>
                {counts.total > 0 ? Math.round(((counts.V + counts.S) / counts.total) * 100) : 0}%
              </strong>
            </span>
            <span>
              Trust Status:{' '}
              <strong style={{ color: passport.revoked ? 'var(--st-x)' : 'var(--st-v)' }}>
                {passport.revoked ? 'Share Disabled' : 'Verifiable Public Seal'}
              </strong>
            </span>
          </div>
        </div>

        {/* Learnings Section */}
        <div className="table-card glass" style={{ padding: '24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div className="k m" style={{ color: 'var(--accent)', marginBottom: '4px' }}>
                {recData?.targetRole ? `TARGET ROLE: ${recData.targetRole.toUpperCase()}` : 'SKILL GAP ROADMAPS'}
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Learnings
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '4px 0 0' }}>
                {recData?.targetRole
                  ? `Curated courses, official documentation, and project plans for skills required by ${recData.targetRole} that are absent from your passport.`
                  : 'Targeted course modules and project blueprints for skills your target role requires.'}
              </p>
            </div>

            <Link to="/learnings" className="b sm" style={{ minHeight: '44px' }}>
              View all roadmaps <span className="btn-arrow" aria-hidden="true">-&gt;</span>
            </Link>
          </div>

          {!recData || recData.learnings.length === 0 ? (
            <div style={{ padding: '16px 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
              All required skills for your target role are present in your passport. No foundational learning roadmaps needed.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--muted)' }}>Absent Role Skills: </span>
                  <strong>{recData.learnings.length}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(showAllLearnings ? recData.learnings : recData.learnings.slice(0, 5)).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="chip sm U">Absent</span>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--ink)' }}>{item.skill}</strong>
                        <span className="chip sm">Effort: {item.effort}</span>
                        {item.estimatedMatchChange && (
                          <span className="chip sm V">{item.estimatedMatchChange} match</span>
                        )}
                      </div>
                      <div>
                        {item.target && item.target !== '#' && (
                          <a
                            href={item.target}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="b sm g"
                            style={{ minHeight: '44px', textDecoration: 'none' }}
                          >
                            {item.actionLabel}
                          </a>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
                      {item.why}
                    </p>

                    {item.projectIdea && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--ink)',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--line)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                        }}
                      >
                        <strong>Project Blueprint:</strong> {item.projectIdea}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {recData.learnings.length > 5 && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="b sm g"
                    style={{ minHeight: '44px' }}
                    onClick={() => setShowAllLearnings(!showAllLearnings)}
                  >
                    {showAllLearnings ? 'Show fewer learnings' : `Show more (${recData.learnings.length - 5})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Skills Breakdown Table */}
        <div className="table-card glass">
          <div className="table-card-head">
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Audited Technical Skills
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '4px 0 0' }}>
                Every skill extracted from your resume, matched against ground-truth code and credentials.
              </p>
            </div>

            {/* Filter by State */}
            <div className="table-filters" role="group" aria-label="Filter skills by state">
              {['ALL', 'V', 'S', 'C', 'X'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`filter-btn ${stateFilter === st ? 'active' : ''}`}
                  onClick={() => setStateFilter(st)}
                >
                  {st === 'ALL' ? 'All Skills' : L[st]}
                </button>
              ))}
            </div>
          </div>

          <div className="responsive-table-wrapper" data-lenis-prevent>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>State</th>
                  <th>Level Rubric</th>
                  <th>Why This Status</th>
                  <th>Evidence Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredSkills.map((item) => (
                  <tr key={item.skill}>
                    <td data-label="Skill">
                      <strong>{item.skill}</strong>
                    </td>
                    <td data-label="State">
                      <span className={`chip ${item.state}`}>{L[item.state]}</span>
                    </td>
                    <td data-label="Level">
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--muted)' }}>
                        Level {item.level || 2}
                      </span>
                    </td>
                    <td data-label="Rationale" style={{ maxWidth: '340px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>
                        {item.rationale || 'State assigned via deterministic evidence inspection.'}
                      </span>
                    </td>
                    <td data-label="Evidence" style={{ maxWidth: '320px' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block' }}>
                          {item.evidence || 'No repository evidence attached'}
                        </span>
                        <button
                          type="button"
                          className="evidence-expand-btn"
                          onClick={() => toggleEvidence(item.skill)}
                          aria-expanded={Boolean(expandedEvidence[item.skill])}
                        >
                          {expandedEvidence[item.skill] ? 'Hide audit trace' : 'Inspect audit trace'}
                        </button>
                        {expandedEvidence[item.skill] && (
                          <div className="evidence-expanded-box">
                            <div>
                              <strong>Source Signal:</strong>{' '}
                              {item.lineShare > 0 ? `${item.lineShare}% author line share` : 'Resume mention only'}
                            </div>
                            <div style={{ marginTop: '4px' }}>
                              <strong>State Weight:</strong> {WEIGHTS[item.state]} / 100
                            </div>
                            {item.state === 'S' && (
                              <div style={{ marginTop: '4px', color: 'var(--accent)' }}>
                                Ready for micro-check or external assessment to upgrade.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Best-Matching Roles (No Apply Button) */}
        <section style={{ marginBottom: '36px' }}>
          <div style={{ marginBottom: '16px' }}>
            <span className="k m">ROLE ALIGNMENT</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)', margin: '4px 0 0' }}>
              Best-Matching Open Roles
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '4px 0 0' }}>
              Ranked by your evidence weights (100 / 60 / 20 / 0). Evaluated against live job requirements.
            </p>
          </div>

          <div className="cards-grid">
            {recommendedRoles.slice(0, 4).map(({ role, score, matchedSkills, gaps }) => (
              <div key={role.id} className="role-match-card">
                <div>
                  <div className="role-card-head">
                    <div>
                      <h3 className="role-card-title">{role.title}</h3>
                      <p className="role-card-company">{role.company}</p>
                    </div>
                    <div className="match-gauge">
                      <div className="match-pct">{score}%</div>
                      <div className="match-label">Match</div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: '1.45', margin: '8px 0' }}>
                    {role.description.length > 120
                      ? `${role.description.slice(0, 120)}...`
                      : role.description}
                  </p>

                  <div className="role-card-skills">
                    {matchedSkills.map((m) => (
                      <span key={m.skill} className={`chip sm ${m.state}`}>
                        {m.skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: '12px', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', color: 'var(--faint)' }}>
                    {gaps.length > 0 ? `${gaps.length} evidence gap${gaps.length > 1 ? 's' : ''} to reach 100%` : 'All required skills verified'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommendations (Add Evidence & Fix Conflicts) */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ marginBottom: '16px' }}>
            <span className="k m" style={{ color: 'var(--accent)' }}>CLOSE EVIDENCE GAPS</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)', margin: '4px 0 0' }}>
              Recommendations
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '4px 0 0' }}>
              Deterministic steps to provide verifiable code evidence, complete micro-checks, and resolve repository conflicts.
            </p>
          </div>

          {/* Quiet Strengths Line */}
          {recData?.strengths?.length > 0 && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--line-soft)',
                fontSize: '0.85rem',
                color: 'var(--muted)',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: 'var(--st-v)' }}>Strengths:</strong>{' '}
              <span style={{ color: 'var(--ink)' }}>{recData.strengths.join(', ')}</span>{' '}
              verified against ground-truth evidence.
            </div>
          )}

          {!recData || recData.recommendations.length === 0 ? (
            <div style={{ padding: '16px 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
              No evidence gaps or conflicts remaining. Every audited skill has reached Verified status.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--muted)' }}>Actionable Items: </span>
                  <strong>{recData.recommendations.length}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(showAllRecommendations
                  ? recData.recommendations
                  : recData.recommendations.slice(0, 5)
                ).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`chip sm ${item.state}`}>
                          {L[item.state] || item.state}
                        </span>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--ink)' }}>{item.skill}</strong>
                        <span className="chip sm">Effort: {item.effort}</span>
                        {item.estimatedMatchChange && (
                          <span className="chip sm V">{item.estimatedMatchChange} match</span>
                        )}
                      </div>
                      <div>
                        {item.target && item.target.startsWith('http') ? (
                          <a
                            href={item.target}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="b sm g"
                            style={{
                              minHeight: '44px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none',
                            }}
                          >
                            {item.actionLabel || 'Take action'} ↗
                          </a>
                        ) : (
                          <Link
                            to={item.target || '/verify'}
                            className="b sm g"
                            style={{
                              minHeight: '44px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none',
                            }}
                          >
                            {item.actionLabel || 'Take action'} <span className="btn-arrow" aria-hidden="true">-&gt;</span>
                          </Link>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
                      {item.why}
                    </p>

                    {item.type === 'fix' && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--ink)',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--line)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                        }}
                      >
                        {item.conflictText && (
                          <div style={{ color: 'var(--st-x)', fontWeight: 600, marginBottom: '4px' }}>
                            Conflict: {item.conflictText}
                          </div>
                        )}
                        <div>
                          <strong>Resolution:</strong> {item.resolutionGuide}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {recData.recommendations.length > 5 && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="b sm g"
                    style={{ minHeight: '44px' }}
                    onClick={() => setShowAllRecommendations(!showAllRecommendations)}
                  >
                    {showAllRecommendations
                      ? 'Show fewer recommendations'
                      : `Show more (${recData.recommendations.length - 5})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
