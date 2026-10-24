/**
 * Recruiter Role Detail View Component
 * Provides:
 * 1. Leaderboard: Ranked candidates with passports, anonymous toggle, and tie-breaking explanations.
 * 2. No passport attached: CSV download of selected, CSV upload passport generator with consent check.
 * 3. Requirements: Editable job title, description, weighted skills, and demo CV viewer.
 */

import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Seg from './Seg.jsx'
import { getRole, updateRole } from '../api/roles.js'
import { listApplicantsForRole, addApplicantToRole, generatePassportForApplicant } from '../api/applicants.js'
import { listPassports } from '../api/passports.js'
import { rankApplicants } from '../lib/rank.js'
import { getSkillsByState } from '../lib/skillsByState.js'
import { L } from '../data.js'
import { RM } from '../lib.js'

/**
 * In-Card Candidate Skills Drawer Panel
 * Displays detailed list of skills categorized under the selected state.
 * Supports:
 * - Group 1: Required by this role (Must > Should > Nice > name)
 * - Group 2: Other skills on passport (by name)
 * - Row details: Name, state chip, importance tag, level, source badges, confidence %, reason line
 * - View evidence link to /passport/:passportId#skill-<skillId>
 * - Keyboard Escape listener that closes the panel and returns focus to the trigger tile
 */
function CandidateSkillsDrawer({
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

    return (
      <div key={skill.skillId} className="skill-row-card">
        <div className="skill-row-main">
          <div className="skill-row-top">
            <strong className="skill-row-name">{skill.name}</strong>
            <span className={`chip sm ${skill.state}`} title={`State: ${stateName}`}>
              {stateName}
            </span>
            <span
              className={`importance-tag ${skill.importance ? skill.importance.toLowerCase() : 'extra'}`}
            >
              {skill.importance || 'Extra skill'}
            </span>
            {skill.sources && skill.sources.length > 0 && (
              <div className="skill-sources-wrap">
                {skill.sources.map((src) => (
                  <span key={src} className="source-badge">
                    {src}
                  </span>
                ))}
              </div>
            )}
            {confVal !== null && (
              <span className="confidence-pill" title="Audit evidence confidence">
                Confidence: {confVal}%
              </span>
            )}
          </div>
          {skill.reason && (
            <div className="skill-reason-line">
              <span className="reason-label">
                {skill.state === 'X' ? 'Flag reason: ' : 'Rationale: '}
              </span>
              <span className="reason-text">{skill.reason}</span>
            </div>
          )}
        </div>
        <div className="skill-row-action">
          {candidate.passport && (
            <Link
              to={`/passport/${candidate.passport.id}#${skill.passportAnchor}`}
              className="b sm g view-evidence-link"
            >
              View evidence →
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      id={`skills-panel-${candidate.id}`}
      className="skills-panel-content"
      role="region"
      aria-label={`${stateName} skills for ${displayedName}`}
    >
      <div className="skills-panel-header">
        <div className="skills-panel-title-wrap">
          <h4 className="skills-panel-heading">
            {stateName} skills ({skillsInState.length})
          </h4>
          <span className="skills-panel-sub">
            for {displayedName}
          </span>
        </div>
        <button
          type="button"
          className="b sm g panel-close-btn"
          onClick={() => onClose(candidate.id, openState)}
          aria-label={`Close ${stateName} skills panel`}
        >
          ✕ Close
        </button>
      </div>

      <div className="skills-panel-body">
        {requiredSkills.length > 0 && (
          <div className="skills-group">
            <h5 className="skills-group-heading">
              Required by this role ({requiredSkills.length})
            </h5>
            <div className="skills-group-items">
              {requiredSkills.map(renderSkillRow)}
            </div>
          </div>
        )}

        {otherSkills.length > 0 && (
          <div className="skills-group">
            <h5 className="skills-group-heading">
              Other skills on the passport ({otherSkills.length})
            </h5>
            <div className="skills-group-items">
              {otherSkills.map(renderSkillRow)}
            </div>
          </div>
        )}

        {skillsInState.length === 0 && (
          <p className="skills-empty-state">
            No skills found in {stateName} state for this candidate.
          </p>
        )}
      </div>
    </div>
  )
}

export default function RecruiterRoleDetail() {
  const { roleId } = useParams()

  const [role, setRole] = useState(null)
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [showLegend, setShowLegend] = useState(false)
  const [openPanels, setOpenPanels] = useState({}) // { [candidateId]: 'V' | 'S' | 'C' | 'X' | null }
  const [liveAnnouncement, setLiveAnnouncement] = useState('')

  // Candidate Data
  const [applicantsWithPassport, setApplicantsWithPassport] = useState([])
  const [applicantsNoPassport, setApplicantsNoPassport] = useState([])

  // Shared anonymous screening state in sessionStorage
  const [hideNames, setHideNames] = useState(() => {
    try {
      return sessionStorage.getItem('pp_recruiter_hide_names') === 'true'
    } catch {
      return false
    }
  })

  const handleToggleHideNames = (e) => {
    const val = e.target.checked
    setHideNames(val)
    try {
      sessionStorage.setItem('pp_recruiter_hide_names', String(val))
    } catch {
      // storage restricted
    }
  }

  // Candidate Comparison Selection State per role (key: pp-compare-<roleId>)
  const [compareIds, setCompareIds] = useState(() => {
    try {
      const raw = sessionStorage.getItem(`pp-compare-${roleId}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return new Set(parsed.slice(0, 3))
        }
      }
    } catch {
      // storage restricted
    }
    return new Set()
  })

  // Prune stored IDs that no longer exist once candidates load
  useEffect(() => {
    if (applicantsWithPassport.length > 0) {
      const validIds = new Set(applicantsWithPassport.map((a) => a.id))
      setCompareIds((prev) => {
        let changed = false
        const next = new Set()
        prev.forEach((id) => {
          if (validIds.has(id)) {
            next.add(id)
          } else {
            changed = true
          }
        })
        if (changed) {
          try {
            sessionStorage.setItem(`pp-compare-${roleId}`, JSON.stringify(Array.from(next)))
          } catch {
            // storage restricted
          }
          return next
        }
        return prev
      })
    }
  }, [applicantsWithPassport, roleId])

  const handleToggleCompare = (id) => {
    setCompareIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 3) return prev // Max 3 candidates
        next.add(id)
      }
      try {
        sessionStorage.setItem(`pp-compare-${roleId}`, JSON.stringify(Array.from(next)))
      } catch {
        // storage restricted
      }
      return next
    })
  }

  const handleClearCompare = () => {
    setCompareIds(new Set())
    try {
      sessionStorage.removeItem(`pp-compare-${roleId}`)
    } catch {
      // storage restricted
    }
  }

  // No Passport Tab Selection State
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [csvUploadDrag, setCsvUploadDrag] = useState(false)
  const [csvConsent, setCsvConsent] = useState(false)
  const [csvProgress, setCsvProgress] = useState(null)
  const [isProcessingCsv, setIsProcessingCsv] = useState(false)

  // Requirements Tab Edit State
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editSkills, setEditSkills] = useState([])
  const [editCv, setEditCv] = useState('')
  const [newSkillText, setNewSkillText] = useState('')
  const [newSkillImportance, setNewSkillImportance] = useState('Must')
  const [isSavingRequirements, setIsSavingRequirements] = useState(false)

  // Load role and applicants
  const loadRoleData = async () => {
    try {
      const r = await getRole(roleId)
      setRole(r)
      setEditTitle(r.title)
      setEditCompany(r.company)
      setEditDesc(r.description)
      setEditSkills(r.requiredSkills || [])
      setEditCv(r.demoCv || '')

      // BACKEND: Passports loaded for the leaderboard must include full skill records:
      // each skill requires state ('V' | 'S' | 'C' | 'X'), level, evidence sources (GitHub, LeetCode, Certificate, Resume, Assessment), and confidence score when available.
      const { withPassport, noPassport } = await listApplicantsForRole(roleId)

      // Check if browser has an active applicant passport fuzzy-matching this role
      const browserPassports = await listPassports()
      const matchingLive = browserPassports.find(
        (p) =>
          !p.revoked &&
          p.targetRole &&
          (p.targetRole.toLowerCase().includes(r.title.toLowerCase().slice(0, 10)) ||
            r.title.toLowerCase().includes(p.targetRole.toLowerCase().slice(0, 10)))
      )

      let combinedWithPassport = [...withPassport]
      if (matchingLive && !combinedWithPassport.some((a) => a.passport?.id === matchingLive.id)) {
        combinedWithPassport.unshift({
          id: `live_demo_${matchingLive.id}`,
          name: matchingLive.candidate || 'Live Demo Applicant',
          email: 'live.applicant@browser.local',
          hasPassport: true,
          passport: matchingLive,
          isLiveDemo: true,
        })
      }

      setApplicantsWithPassport(combinedWithPassport)
      setApplicantsNoPassport(noPassport)
      setLoading(false)
    } catch (err) {
      setNotice(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoleData()
  }, [roleId])

  // Ranked Leaderboard computation using rankApplicants pure function
  const rankedCandidates = rankApplicants(role, applicantsWithPassport)

  // In-card skills panel handlers
  const handleToggleTile = (candidateId, stateKey, count, dispName) => {
    if (count === 0) return
    setOpenPanels((prev) => {
      const isCurrent = prev[candidateId] === stateKey
      const nextState = isCurrent ? null : stateKey
      if (nextState) {
        const stateName = L[stateKey] || stateKey
        setLiveAnnouncement(`Showing ${count} ${stateName} skills for ${dispName}`)
      }
      return { ...prev, [candidateId]: nextState }
    })
  }

  const handleClosePanel = (candidateId, stateKey) => {
    setOpenPanels((prev) => ({ ...prev, [candidateId]: null }))
    setTimeout(() => {
      const tileBtn = document.getElementById(`tile-btn-${candidateId}-${stateKey}`)
      if (tileBtn) {
        tileBtn.focus()
      }
    }, 0)
  }

  // Table selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(applicantsNoPassport.map((a) => a.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Action 1: Download CSV of selected applicants
  const handleDownloadCsv = () => {
    const selected = applicantsNoPassport.filter((a) => selectedIds.has(a.id))
    if (selected.length === 0) {
      setNotice('Please select at least one candidate row to export.')
      return
    }

    const headers = [
      'name',
      'email',
      'resume_text_or_url',
      'github_url',
      'leetcode_url',
      'certificate_urls',
      'target_role',
    ]

    const rows = selected.map((a) => [
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.email.replace(/"/g, '""')}"`,
      `"${(a.resumeText || '').replace(/\n/g, ' ').replace(/"/g, '""')}"`,
      `"${(a.githubUrl || '').replace(/"/g, '""')}"`,
      `"${(a.leetcodeUrl || '').replace(/"/g, '""')}"`,
      `"${(a.certificateUrls || '').replace(/"/g, '""')}"`,
      `"${(a.targetRole || role.title).replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `proofpass_${roleId}_candidates.csv`
    link.click()
    URL.revokeObjectURL(url)
    setNotice(`Downloaded CSV containing ${selected.length} candidate record${selected.length > 1 ? 's' : ''}.`)
  }

  // Action 2: Process CSV upload to generate passports
  const handleProcessCsvFile = async (file) => {
    if (!csvConsent) {
      setNotice('You must acknowledge candidate data consent before generating passports.')
      return
    }

    setIsProcessingCsv(true)
    setCsvProgress('Reading candidate CSV file...')

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target.result || ''
      const lines = text.split('\n').filter((l) => l.trim().length > 0)
      if (lines.length <= 1) {
        setNotice('Uploaded CSV contains no candidate rows.')
        setIsProcessingCsv(false)
        setCsvProgress(null)
        return
      }

      // Parse headers
      const rows = lines.slice(1)
      let count = 0

      for (let i = 0; i < rows.length; i++) {
        setCsvProgress(`Processing candidate ${i + 1} of ${rows.length}...`)
        const cols = rows[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim())
        const [name, email, resumeText, githubUrl, leetcodeUrl, certificateUrls] = cols

        if (name && email) {
          // Add applicant record
          const created = await addApplicantToRole(roleId, {
            name,
            email,
            resumeText: resumeText || 'CSV Imported Resume',
            githubUrl: githubUrl || '',
            leetcodeUrl: leetcodeUrl || '',
            certificateUrls: certificateUrls || '',
            targetRole: role.title,
            hasPassport: false,
            isRecruiterGenerated: true,
          })

          // Generate passport
          await generatePassportForApplicant(created.id)
          count++
        }
      }

      setNotice(`Successfully generated ${count} candidate passports from CSV. Moved to Leaderboard.`)
      setIsProcessingCsv(false)
      setCsvProgress(null)
      await loadRoleData()
      setActiveTab('leaderboard')
    }
    reader.readAsText(file)
  }

  // Generate passport directly for a single resume-only candidate
  const handleGenerateSingle = async (applicantId) => {
    try {
      await generatePassportForApplicant(applicantId)
      setNotice('Passport generated. Candidate promoted to Leaderboard.')
      await loadRoleData()
    } catch (err) {
      setNotice(err.message)
    }
  }

  // Save Requirements tab edits
  const handleSaveRequirements = async (e) => {
    e.preventDefault()
    setIsSavingRequirements(true)
    try {
      const updated = await updateRole(roleId, {
        title: editTitle.trim(),
        company: editCompany.trim(),
        description: editDesc.trim(),
        requiredSkills: editSkills,
        demoCv: editCv.trim(),
      })
      setRole(updated)
      setNotice('Role requirements updated.')
    } catch (err) {
      setNotice(err.message)
    } finally {
      setIsSavingRequirements(false)
    }
  }

  const handleAddEditSkill = () => {
    if (!newSkillText.trim()) return
    const name = newSkillText.trim()
    if (editSkills.some((s) => s.skill.toLowerCase() === name.toLowerCase())) {
      setNewSkillText('')
      return
    }
    const weight = newSkillImportance === 'Must' ? 3 : newSkillImportance === 'Should' ? 2 : 1
    setEditSkills((prev) => [...prev, { skill: name, importance: newSkillImportance, weight }])
    setNewSkillText('')
  }

  const handleRemoveEditSkill = (skill) => {
    setEditSkills((prev) => prev.filter((s) => s.skill !== skill))
  }

  if (loading || !role) {
    return (
      <main id="main" className="dash-page">
        <div className="w">
          <div className="login-notice">
            <span className="notice-dot" aria-hidden="true" />
            <span>Loading role evaluation workspace...</span>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main id="main" className="dash-page" style={{ paddingBottom: compareIds.size >= 2 ? '110px' : undefined }}>
      <div className="w">
        {/* Header */}
        <div className="dash-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link to="/recruiter" className="back-home-link" style={{ fontSize: '0.8rem' }}>
              ← All Roles
            </Link>
            <span style={{ color: 'var(--faint)' }}>/</span>
            <span className="k m">{role.company}</span>
          </div>
          <div className="dash-header-row">
            <div>
              <h1 className="dash-title">{role.title}</h1>
              <p className="dash-subtitle">
                {applicantsWithPassport.length} with passport · {applicantsNoPassport.length} resume only · {rankedCandidates.length} evaluated
              </p>
            </div>
          </div>
        </div>

        {notice && (
          <div className="login-notice" style={{ marginBottom: '20px' }} role="status">
            <span className="notice-dot" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {/* Tab Navigation using Seg */}
        <div style={{ marginBottom: '24px' }}>
          <Seg
            role="tablist"
            items={[
              { id: 'leaderboard', label: `Leaderboard (${rankedCandidates.length})` },
              { id: 'nopassport', label: `No passport attached (${applicantsNoPassport.length})` },
              { id: 'requirements', label: 'Requirements & CV' },
            ]}
            value={activeTab}
            onChange={(t) => setActiveTab(t)}
            label="Role views"
          />
        </div>

        {/* TAB 1: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="table-card glass">
            {/* Screen Reader Live Announcement */}
            <div aria-live="polite" className="sr-only">
              {liveAnnouncement}
            </div>

            <div className="leaderboard-meta-strip">
              <div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>
                  Ranked Candidates with Verified Evidence
                </strong>
                <div className="legend-strip-row">
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
                    Ranked by match %, then verified required skills, then fewer contradicted claims.
                  </p>
                  <button
                    type="button"
                    className="legend-toggle-btn"
                    onClick={() => setShowLegend((v) => !v)}
                    aria-expanded={showLegend}
                  >
                    <span>What do the states mean?</span>
                    <span className={`legend-toggle-icon ${showLegend ? 'open' : ''}`} aria-hidden="true">
                      {showLegend ? '▴' : '▾'}
                    </span>
                  </button>
                </div>

                {/* Collapsible States Legend */}
                <div className={`legend-drawer ${showLegend ? 'open' : ''} ${RM ? 'rm' : ''}`}>
                  <div className="legend-drawer-inner">
                    <div className="legend-grid">
                      <div className="legend-row">
                        <strong style={{ color: 'var(--st-v)' }}>Verified:</strong>
                        <span>proven by evidence and a passed check.</span>
                      </div>
                      <div className="legend-row">
                        <strong style={{ color: 'var(--st-s)' }}>Supported:</strong>
                        <span>evidence found.</span>
                      </div>
                      <div className="legend-row">
                        <strong style={{ color: 'var(--st-c)' }}>Claimed:</strong>
                        <span>on the resume only.</span>
                      </div>
                      <div className="legend-row">
                        <strong style={{ color: 'var(--st-x)' }}>Contradicted:</strong>
                        <span>the evidence conflicts with the claim.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Anonymous Screening Switch */}
              <label className="revoke-switch-label" title="Mask candidate names for unbiased screening">
                <input
                  type="checkbox"
                  checked={hideNames}
                  onChange={handleToggleHideNames}
                />
                <span>Hide candidate names (Anonymous Review)</span>
              </label>
            </div>

            <div className="responsive-table-wrapper" data-lenis-prevent>
              <table className="dash-table leaderboard-table">
                <thead>
                  <tr>
                    <th style={{ width: '64px' }}>Rank</th>
                    <th>Candidate</th>
                    <th style={{ width: '110px' }}>Match %</th>
                    <th className="th-skill-states">Skill states</th>
                    <th>Top Skills & Evidence</th>
                    <th style={{ textAlign: 'right', width: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedCandidates.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                        No candidates with passports evaluated yet.
                      </td>
                    </tr>
                  ) : (
                    rankedCandidates.map((c) => {
                      const skillsByState = getSkillsByState(c.passport, role)
                      const countV = skillsByState.V.length
                      const countS = skillsByState.S.length
                      const countC = skillsByState.C.length
                      const countX = skillsByState.X.length
                      const totalSkills = countV + countS + countC + countX
                      const pctV = totalSkills > 0 ? Math.round((countV / totalSkills) * 100) : 0
                      const pctS = totalSkills > 0 ? Math.round((countS / totalSkills) * 100) : 0
                      const pctC = totalSkills > 0 ? Math.round((countC / totalSkills) * 100) : 0
                      const pctX = totalSkills > 0 ? Math.round((countX / totalSkills) * 100) : 0
                      const openState = openPanels[c.id] || null
                      const displayedName = hideNames ? `Candidate #${c.rank.toString().padStart(2, '0')}` : c.name

                      return (
                        <tr key={c.id} className={openState ? 'has-open-panel' : ''}>
                          {/* Rank Column with Compare Checkbox */}
                          <td data-label="Rank" className="td-rank">
                            <div className="rank-cell-content">
                              <label
                                className="compare-checkbox-label"
                                title={`Select ${displayedName} for comparison`}
                              >
                                <input
                                  type="checkbox"
                                  checked={compareIds.has(c.id)}
                                  onChange={() => handleToggleCompare(c.id)}
                                  disabled={!compareIds.has(c.id) && compareIds.size >= 3}
                                  aria-label={`Select ${displayedName} for comparison`}
                                />
                              </label>
                              <span className={`rank-badge ${c.rank === 1 ? 'top-1' : ''}`}>
                                {c.rank}
                              </span>
                            </div>
                          </td>

                          {/* Candidate Name / Anonymous Mask */}
                          <td data-label="Candidate">
                            <div>
                              <strong>{displayedName}</strong>
                              {c.isLiveDemo && (
                                <span className="live-demo-tag">Live demo applicant</span>
                              )}
                              {c.isRecruiterGenerated && (
                                <span className="recruiter-tag">Recruiter generated</span>
                              )}
                              {c.decidingFactor && (
                                <span className="deciding-factor-note">
                                  ↳ {c.decidingFactor}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Match % */}
                          <td data-label="Match %">
                            <span className="leaderboard-match-val">
                              {c.score}%
                            </span>
                          </td>

                          {/* Skill states Analytics Block */}
                          <td data-label="Skill states" className="td-skill-states">
                            <div className="skill-states-analytics">
                              <div className="analytics-top-line">
                                {totalSkills} skills evaluated
                              </div>

                              <div
                                className="analytics-tiles-grid"
                                role="group"
                                aria-label={`Skill states: ${countV} Verified, ${countS} Supported, ${countC} Claimed, ${countX} Contradicted`}
                              >
                                {/* Verified Tile */}
                                <button
                                  type="button"
                                  id={`tile-btn-${c.id}-V`}
                                  className={`analytics-tile tile-v ${countV === 0 ? 'zero' : ''} ${openState === 'V' ? 'selected' : ''}`}
                                  onClick={() => handleToggleTile(c.id, 'V', countV, displayedName)}
                                  disabled={countV === 0}
                                  aria-disabled={countV === 0}
                                  aria-expanded={openState === 'V'}
                                  aria-controls={`skills-panel-${c.id}`}
                                  title={countV === 0 ? 'No skills in this state' : `${countV} Verified skills`}
                                >
                                  <div className="tile-head-row">
                                    <div className="tile-count-wrap">
                                      <span className="tile-count">{countV}</span>
                                    </div>
                                    <svg
                                      className={`tile-chevron ${openState === 'V' ? 'open' : ''}`}
                                      viewBox="0 0 16 16"
                                      width="12"
                                      height="12"
                                      aria-hidden="true"
                                    >
                                      <path
                                        d="M3.5 6L8 10.5L12.5 6"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.75"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </div>
                                  <span className="tile-label">Verified</span>
                                  <div className="tile-bar-track">
                                    <div className="tile-bar-fill fill-v" style={{ width: `${pctV}%` }} />
                                  </div>
                                  <span className="tile-pct">{pctV}%</span>
                                </button>

                                {/* Supported Tile */}
                                <button
                                  type="button"
                                  id={`tile-btn-${c.id}-S`}
                                  className={`analytics-tile tile-s ${countS === 0 ? 'zero' : ''} ${openState === 'S' ? 'selected' : ''}`}
                                  onClick={() => handleToggleTile(c.id, 'S', countS, displayedName)}
                                  disabled={countS === 0}
                                  aria-disabled={countS === 0}
                                  aria-expanded={openState === 'S'}
                                  aria-controls={`skills-panel-${c.id}`}
                                  title={countS === 0 ? 'No skills in this state' : `${countS} Supported skills`}
                                >
                                  <div className="tile-head-row">
                                    <div className="tile-count-wrap">
                                      <span className="tile-count">{countS}</span>
                                    </div>
                                    <svg
                                      className={`tile-chevron ${openState === 'S' ? 'open' : ''}`}
                                      viewBox="0 0 16 16"
                                      width="12"
                                      height="12"
                                      aria-hidden="true"
                                    >
                                      <path
                                        d="M3.5 6L8 10.5L12.5 6"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.75"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </div>
                                  <span className="tile-label">Supported</span>
                                  <div className="tile-bar-track">
                                    <div className="tile-bar-fill fill-s" style={{ width: `${pctS}%` }} />
                                  </div>
                                  <span className="tile-pct">{pctS}%</span>
                                </button>

                                {/* Claimed Tile */}
                                <button
                                  type="button"
                                  id={`tile-btn-${c.id}-C`}
                                  className={`analytics-tile tile-c ${countC === 0 ? 'zero' : ''} ${openState === 'C' ? 'selected' : ''}`}
                                  onClick={() => handleToggleTile(c.id, 'C', countC, displayedName)}
                                  disabled={countC === 0}
                                  aria-disabled={countC === 0}
                                  aria-expanded={openState === 'C'}
                                  aria-controls={`skills-panel-${c.id}`}
                                  title={countC === 0 ? 'No skills in this state' : `${countC} Claimed skills`}
                                >
                                  <div className="tile-head-row">
                                    <div className="tile-count-wrap">
                                      <span className="tile-count">{countC}</span>
                                    </div>
                                    <svg
                                      className={`tile-chevron ${openState === 'C' ? 'open' : ''}`}
                                      viewBox="0 0 16 16"
                                      width="12"
                                      height="12"
                                      aria-hidden="true"
                                    >
                                      <path
                                        d="M3.5 6L8 10.5L12.5 6"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.75"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </div>
                                  <span className="tile-label">Claimed</span>
                                  <div className="tile-bar-track">
                                    <div className="tile-bar-fill fill-c" style={{ width: `${pctC}%` }} />
                                  </div>
                                  <span className="tile-pct">{pctC}%</span>
                                </button>

                                {/* Contradicted Tile */}
                                <button
                                  type="button"
                                  id={`tile-btn-${c.id}-X`}
                                  className={`analytics-tile tile-x ${countX === 0 ? 'zero' : ''} ${openState === 'X' ? 'selected' : ''} ${c.contradictedCount > 0 ? 'has-flag' : ''}`}
                                  onClick={() => handleToggleTile(c.id, 'X', countX, displayedName)}
                                  disabled={countX === 0}
                                  aria-disabled={countX === 0}
                                  aria-expanded={openState === 'X'}
                                  aria-controls={`skills-panel-${c.id}`}
                                  title={countX === 0 ? 'No skills in this state' : `${countX} Contradicted skills`}
                                >
                                  <div className="tile-head-row">
                                    <div className="tile-count-wrap">
                                      <span className="tile-count">{countX}</span>
                                      {c.contradictedCount > 0 && (
                                        <span className="tile-flag-tag">Flagged</span>
                                      )}
                                    </div>
                                    <svg
                                      className={`tile-chevron ${openState === 'X' ? 'open' : ''}`}
                                      viewBox="0 0 16 16"
                                      width="12"
                                      height="12"
                                      aria-hidden="true"
                                    >
                                      <path
                                        d="M3.5 6L8 10.5L12.5 6"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.75"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </div>
                                  <span className="tile-label">Contradicted</span>
                                  <div className="tile-bar-track">
                                    <div className="tile-bar-fill fill-x" style={{ width: `${pctX}%` }} />
                                  </div>
                                  <span className="tile-pct">{pctX}%</span>
                                </button>
                              </div>

                              {!openState && (
                                <div className="tile-hint-line">
                                  Select a state to see its skills.
                                </div>
                              )}

                              {c.totalReqCount > 0 && (
                                <div className="analytics-bottom-line">
                                  {c.verifiedReqCount} of {c.totalReqCount} required skills Verified
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Top Matched & Missing Skills */}
                          <td data-label="Top Skills & Evidence">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {c.matched.slice(0, 3).map((m) => (
                                <span key={m.skill} className={`chip sm ${m.state}`}>
                                  {m.skill}
                                </span>
                              ))}
                              {c.missing.length > 0 && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--faint)', alignSelf: 'center' }}>
                                  +{c.missing.length} missing
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td data-label="Actions" className="leaderboard-actions" style={{ textAlign: 'right' }}>
                            {c.passport && (
                              <Link
                                to={`/passport/${c.passport.id}`}
                                className="b sm g"
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                View passport →
                              </Link>
                            )}
                          </td>

                          {/* In-Card Skills Panel Row (Spans full width below row columns) */}
                          <td className="skills-panel-td" style={{ gridColumn: '1 / -1' }}>
                            <div
                              className={`skills-panel-drawer ${openState ? 'open' : ''} ${RM ? 'rm' : ''}`}
                            >
                              <div className="skills-panel-drawer-inner">
                                {openState && (
                                  <CandidateSkillsDrawer
                                    candidate={c}
                                    role={role}
                                    openState={openState}
                                    skillsByState={skillsByState}
                                    onClose={handleClosePanel}
                                    displayedName={displayedName}
                                  />
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: NO PASSPORT ATTACHED */}
        {activeTab === 'nopassport' && (
          <div>
            <div className="table-card glass">
              <div className="table-card-head">
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                    Resume-Only Applicants (Unverified)
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '4px 0 0' }}>
                    Candidates who submitted resumes without repository evidence. Download for outreach or batch-generate baseline passports.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="b sm g"
                    onClick={handleDownloadCsv}
                    disabled={selectedIds.size === 0}
                  >
                    Download CSV of selected ({selectedIds.size})
                  </button>
                </div>
              </div>

              {/* Table of unverified candidates */}
              <div className="responsive-table-wrapper" data-lenis-prevent>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === applicantsNoPassport.length && applicantsNoPassport.length > 0}
                          onChange={handleSelectAll}
                          aria-label="Select all applicants"
                        />
                      </th>
                      <th>Applicant Name</th>
                      <th>Email</th>
                      <th>Claimed Skills</th>
                      <th>Trust Ceiling Notice</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicantsNoPassport.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                          All applicants currently have cryptographically sealed passports!
                        </td>
                      </tr>
                    ) : (
                      applicantsNoPassport.map((cand) => (
                        <tr key={cand.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(cand.id)}
                              onChange={() => handleToggleSelect(cand.id)}
                              aria-label={`Select ${cand.name}`}
                            />
                          </td>
                          <td data-label="Name">
                            <strong>{cand.name}</strong>
                          </td>
                          <td data-label="Email">
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--muted)' }}>
                              {cand.email}
                            </span>
                          </td>
                          <td data-label="Skills">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {(cand.skills || []).map((s) => (
                                <span key={s.skill} className="chip sm C">
                                  {s.skill}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td data-label="Notice">
                            <span style={{ fontSize: '0.78rem', color: 'var(--faint)' }}>
                              Capped at Claimed (no repos attached)
                            </span>
                          </td>
                          <td data-label="Action" style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="b sm g"
                              onClick={() => handleGenerateSingle(cand.id)}
                            >
                              Generate passport
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CSV Upload & Batch Passport Generation Dropzone */}
            <div className="table-card glass" style={{ padding: '24px' }}>
              <span className="k m" style={{ color: 'var(--accent)' }}>BATCH PASS-THROUGH INGESTION</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', margin: '6px 0 4px' }}>
                Upload CSV to Generate Candidate Passports
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--muted)', margin: 0 }}>
                Drag and drop a candidate CSV export to automatically run text extraction and issue baseline passports.
              </p>

              {/* Consent Checkbox */}
              <div style={{ marginTop: '14px', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--line-soft)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem', color: 'var(--ink)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={csvConsent}
                    onChange={(e) => setCsvConsent(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    I confirm candidate consent to parse provided CV text. <strong>Resume-only passports are capped at Claimed unless code links are provided.</strong>
                  </span>
                </label>
              </div>

              {/* Dropzone */}
              <div
                className={`csv-dropzone ${csvUploadDrag ? 'drag-active' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setCsvUploadDrag(true)
                }}
                onDragLeave={() => setCsvUploadDrag(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setCsvUploadDrag(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleProcessCsvFile(file)
                }}
              >
                <input
                  type="file"
                  id="csv-file-picker"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleProcessCsvFile(file)
                  }}
                  disabled={!csvConsent || isProcessingCsv}
                />
                <label htmlFor="csv-file-picker" style={{ cursor: csvConsent ? 'pointer' : 'not-allowed' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📄</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>
                    Drop candidate CSV here or click to browse
                  </strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>
                    Columns: name, email, resume_text_or_url, github_url, leetcode_url, certificate_urls
                  </p>
                </label>
              </div>

              {csvProgress && (
                <div className="login-notice" style={{ marginTop: '12px' }} role="status">
                  <span className="notice-dot" aria-hidden="true" />
                  <span>{csvProgress}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: REQUIREMENTS & DEMO CV */}
        {activeTab === 'requirements' && (
          <div className="table-card glass" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                  Role Criteria & Scoring Configuration
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '4px 0 0' }}>
                  Configure required technical competencies, importance weights (Must: 3x, Should: 2x, Nice: 1x), and reference CV.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveRequirements}>
              <div className="form-group">
                <label className="form-label">Role Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Job Requirement Description</label>
                <textarea
                  rows="4"
                  className="form-input"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  required
                />
              </div>

              {/* Skills weight editor */}
              <div className="form-group">
                <label className="form-label">Weighted Skills Configuration</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="form-input sm"
                    placeholder="Add competency"
                    value={newSkillText}
                    onChange={(e) => setNewSkillText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEditSkill()
                      }
                    }}
                  />
                  <select
                    className="form-input sm"
                    style={{ width: '120px' }}
                    value={newSkillImportance}
                    onChange={(e) => setNewSkillImportance(e.target.value)}
                  >
                    <option value="Must">Must (3x)</option>
                    <option value="Should">Should (2x)</option>
                    <option value="Nice">Nice (1x)</option>
                  </select>
                  <button type="button" className="b sm g" onClick={handleAddEditSkill}>
                    Add skill
                  </button>
                </div>

                <div className="tag-cloud">
                  {editSkills.map((req) => (
                    <span key={req.skill} className="removable-tag">
                      <strong>{req.skill}</strong> ({req.importance} · {req.weight}w)
                      <button type="button" onClick={() => handleRemoveEditSkill(req.skill)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Demo CV Viewer & Editor */}
              <div className="form-group">
                <label className="form-label">Demo Candidate CV Reference</label>
                <textarea
                  rows="4"
                  className="form-input sm"
                  placeholder="Paste demo resume text to test candidate mapping..."
                  value={editCv}
                  onChange={(e) => setEditCv(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="submit" className="b sm" disabled={isSavingRequirements}>
                  {isSavingRequirements ? 'Saving changes...' : 'Save role criteria'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Sticky Bottom Compare Bar (when 2 or 3 candidates are selected) */}
      {compareIds.size >= 2 && (
        <div className="sticky-compare-bar" role="region" aria-label="Candidate comparison toolbar">
          <div className="w sticky-compare-inner">
            <div className="sticky-compare-summary">
              <span className="compare-bar-badge" aria-hidden="true">
                {compareIds.size}
              </span>
              <div>
                <strong className="compare-bar-title">Compare {compareIds.size} candidates</strong>
                <span className="compare-bar-note">Side-by-side competency & evidence audit</span>
              </div>
            </div>

            <div className="sticky-compare-actions">
              <button
                type="button"
                className="b sm g"
                onClick={handleClearCompare}
              >
                Clear
              </button>
              <Link
                to={`/recruiter/role/${roleId}/compare?ids=${Array.from(compareIds).join(',')}`}
                className="b sm"
              >
                Compare →
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
