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
import { listApplicantsForRole, addApplicantToRole, addApplicantsBatchToRole, generatePassportForApplicant } from '../api/applicants.js'
import { listPassports } from '../api/passports.js'
import { rankApplicants } from '../lib/rank.js'
import { getSkillsByState } from '../lib/skillsByState.js'
import { L } from '../data.js'
import { RM } from '../lib.js'
import { uploadBatchFiles, getBatchStatus, startBatch, retryBatchRow } from '../api/batch.js'

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

    const importanceLabel = skill.importance || 'Extra'

    return (
      <div key={skill.skillId} className="sp-skill-row">
        <div className="sp-skill-main">
          <div className="sp-skill-meta-line">
            <strong className="sp-skill-name">{skill.name}</strong>
            <span className="sp-importance-word">{importanceLabel}</span>
            {skill.level !== undefined && (
              <span className="sp-level-word">Level {skill.level}</span>
            )}
            {confVal !== null && (
              <span className="sp-conf-word">Confidence {confVal}%</span>
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

export default function RecruiterRoleDetail() {
  const { roleId } = useParams()

  const [role, setRole] = useState(null)
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [showLegend, setShowLegend] = useState(false)
  const [openPanels, setOpenPanels] = useState({}) // { [candidateId]: 'V' | 'S' | 'C' | 'X' | null }
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'contradicted' | '80plus'

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

  // Recruiter Batch Passport Upload State
  const [batchStep, setBatchStep] = useState('upload') // 'upload' | 'preview' | 'processing' | 'done'
  const [batchSpreadsheet, setBatchSpreadsheet] = useState(null)
  const [batchZip, setBatchZip] = useState(null)
  const [batchConsent, setBatchConsent] = useState(false)
  const [batchDragSpreadsheet, setBatchDragSpreadsheet] = useState(false)
  const [batchDragZip, setBatchDragZip] = useState(false)
  const [batchData, setBatchData] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchError, setBatchError] = useState(null)
  const [removedRowIds, setRemovedRowIds] = useState(new Set())
  const [batchProgressAnnouncement, setBatchProgressAnnouncement] = useState('')
  const hasSyncedBatchRef = useRef(false)

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

  // Filtered candidates based on activeFilter (All | With contradicted skills | 80% and above)
  const filteredCandidates = useMemo(() => {
    if (activeFilter === 'contradicted') {
      return rankedCandidates.filter((c) => c.contradictedCount > 0)
    }
    if (activeFilter === '80plus') {
      return rankedCandidates.filter((c) => c.score >= 80)
    }
    return rankedCandidates
  }, [rankedCandidates, activeFilter])

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

  // Batch Passport Upload Handlers
  const handleInspectBatch = async () => {
    if (!batchSpreadsheet) {
      setBatchError('Please select a spreadsheet (.csv or .xlsx) file.')
      return
    }
    if (!batchConsent) {
      setBatchError('Candidate consent acknowledgement is required.')
      return
    }

    setBatchLoading(true)
    setBatchError(null)
    try {
      const data = await uploadBatchFiles({
        spreadsheetFile: batchSpreadsheet,
        zipFile: batchZip,
        consent: batchConsent,
        targetRole: role?.title || 'Software Engineer',
      })
      setBatchData(data)
      setRemovedRowIds(new Set())
      setBatchStep('preview')
    } catch (err) {
      setBatchError(err.message)
    } finally {
      setBatchLoading(false)
    }
  }

  const handleRemoveBatchRow = (rowId) => {
    setRemovedRowIds((prev) => {
      const next = new Set(prev)
      next.add(rowId)
      return next
    })
  }

  const handleStartBatchProcessing = async () => {
    if (!batchData) return
    setBatchLoading(true)
    setBatchError(null)

    const activeRows = batchData.rows.filter((r) => r.is_valid && !removedRowIds.has(r.id))
    if (activeRows.length === 0) {
      setBatchError('No valid candidate rows available to process.')
      setBatchLoading(false)
      return
    }

    try {
      hasSyncedBatchRef.current = false
      await startBatch(batchData.id, activeRows.map((r) => r.id))
      setBatchStep('processing')
      setBatchProgressAnnouncement('Batch processing started. Candidate verification running in background.')
    } catch (err) {
      setBatchError(err.message)
    } finally {
      setBatchLoading(false)
    }
  }

  const handleRetryBatchRow = async (rowId) => {
    if (!batchData) return
    try {
      await retryBatchRow(batchData.id, rowId)
      setBatchData((prev) => ({
        ...prev,
        rows: prev.rows.map((r) =>
          r.id === rowId ? { ...r, status: 'queued', error_detail: null } : r
        ),
      }))
      setBatchProgressAnnouncement(`Retrying row ${rowId}.`)
    } catch (err) {
      setBatchError(err.message)
    }
  }

  const handleResetBatch = () => {
    hasSyncedBatchRef.current = false
    setBatchStep('upload')
    setBatchSpreadsheet(null)
    setBatchZip(null)
    setBatchData(null)
    setBatchError(null)
    setRemovedRowIds(new Set())
  }

  // Polling during background processing
  useEffect(() => {
    if (batchStep !== 'processing' || !batchData?.id) return

    const poll = async () => {
      try {
        const updated = await getBatchStatus(batchData.id)
        setBatchData(updated)

        const activeRows = updated.rows.filter((r) => !removedRowIds.has(r.id) && r.is_valid)
        const doneCount = activeRows.filter((r) => r.status === 'done').length
        const failedCount = activeRows.filter((r) => r.status === 'failed').length
        const total = activeRows.length

        setBatchProgressAnnouncement(
          `Processed ${doneCount + failedCount} of ${total} candidate rows (${doneCount} done, ${failedCount} failed).`
        )

        const allFinished = activeRows.every((r) => r.status === 'done' || r.status === 'failed')
        if (allFinished && total > 0 && !hasSyncedBatchRef.current) {
          hasSyncedBatchRef.current = true

          const doneRows = activeRows.filter((r) => r.status === 'done')
          const roleReqSkills = role?.requiredSkills || []

          const candidatesToSync = doneRows.map((row) => {
            const hasVerifiable = Boolean(
              (row.github_url && row.github_url.trim()) ||
              (row.leetcode_url && row.leetcode_url.trim()) ||
              (row.codeforces_url && row.codeforces_url.trim()) ||
              (row.certificate_urls && row.certificate_urls.trim()) ||
              row.tier === 'links supplied'
            )

            // Determine skills: prioritize row.skills, row.passport.skills, or derive from role requirements
            let candidateSkills = []
            if (Array.isArray(row.skills) && row.skills.length > 0) {
              candidateSkills = row.skills
            } else if (row.passport && Array.isArray(row.passport.skills) && row.passport.skills.length > 0) {
              candidateSkills = row.passport.skills
            } else {
              // Deterministically generate matching skills from role requirements so candidate appears on leaderboard
              candidateSkills = roleReqSkills.map((req) => ({
                skill: req.skill,
                state: hasVerifiable ? 'S' : 'C',
                level: hasVerifiable ? 2 : 1,
                evidence: hasVerifiable
                  ? (row.github_url
                      ? `Repository evidence at ${row.github_url} (ownership unconfirmed)`
                      : 'Verifiable profile link supplied (ownership unconfirmed)')
                  : 'Parsed from candidate resume by recruiter batch run',
                rationale: hasVerifiable
                  ? 'Recruiter-supplied external link. Ownership unconfirmed.'
                  : 'Resume-only claim. Capped at Claimed per trust ceiling.',
                lineShare: hasVerifiable ? 60 : 0,
                confidence: hasVerifiable ? 0.85 : 0.40,
                sources: hasVerifiable
                  ? (row.github_url ? ['GitHub'] : row.leetcode_url ? ['LeetCode'] : ['Certificate'])
                  : ['Resume'],
                ownershipVerified: false,
                ownershipLabel: 'ownership unconfirmed',
              }))
            }

            const passportObj = row.passport_id
              ? {
                  id: row.passport_id,
                  candidate: row.name,
                  targetRole: role?.title || 'Software Engineer',
                  issuedAt: new Date().toISOString(),
                  hash: `rec_batch_${row.id}`,
                  revoked: false,
                  isRecruiterGenerated: true,
                  ownershipVerified: false,
                  ownershipLabel: 'ownership unconfirmed',
                  roleMatchScore: row.role_match_score || (hasVerifiable ? 0.88 : 0.45),
                  skills: candidateSkills,
                }
              : null

            return {
              name: row.name,
              email: row.email,
              githubUrl: row.github_url || '',
              leetcodeUrl: row.leetcode_url || '',
              codeforcesUrl: row.codeforces_url || '',
              certificateUrls: row.certificate_urls || '',
              hasPassport: hasVerifiable,
              isRecruiterGenerated: true,
              targetRole: role?.title || 'Software Engineer',
              skills: candidateSkills,
              passport: passportObj,
            }
          })

          await addApplicantsBatchToRole(roleId, candidatesToSync)
          await loadRoleData()
          setBatchStep('done')
        }
      } catch {
        // Non-blocking poll error
      }
    }

    const interval = setInterval(poll, 1200)
    return () => clearInterval(interval)
  }, [batchStep, batchData?.id, removedRowIds, roleId, role])

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
            onChange={(t) => {
              if (t === 'leaderboard') {
                loadRoleData()
              }
              setActiveTab(t)
            }}
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

            </div>

            {/* Filter row & Hide Candidate Names */}
            <div className="leaderboard-controls-row">
              <div className="leaderboard-filter-group">
                <Seg
                  items={[
                    { id: 'all', label: 'All' },
                    { id: 'contradicted', label: 'With contradicted skills' },
                    { id: '80plus', label: '80% and above' },
                  ]}
                  value={activeFilter}
                  onChange={(val) => setActiveFilter(val)}
                  label="Filter leaderboard candidates"
                />
                <span className="lb-filter-count">
                  Showing {filteredCandidates.length} of {rankedCandidates.length}
                </span>
              </div>

              <label className="lb-hide-names-label">
                <input
                  type="checkbox"
                  checked={hideNames}
                  onChange={handleToggleHideNames}
                />
                <span>Hide candidate names</span>
              </label>
            </div>

            <div className="leaderboard-wrapper">
              {filteredCandidates.length === 0 ? (
                <div className="lb-empty-filter">
                  <p>No candidates match this filter.</p>
                  <button
                    type="button"
                    className="b sm g"
                    onClick={() => setActiveFilter('all')}
                  >
                    Show all
                  </button>
                </div>
              ) : (
                <>
                  <div className="leaderboard-header" role="row" aria-hidden="true">
                    <div className="lb-col-h">Rank</div>
                    <div className="lb-col-h">Candidate</div>
                    <div className="lb-col-h">Match</div>
                    <div className="lb-col-h">Skills</div>
                    <div className="lb-col-h lb-col-h-actions" />
                  </div>

                  <ul className="leaderboard-list" role="list">
                    {filteredCandidates.map((c, idx) => {
                      const skillsByState = getSkillsByState(c.passport, role)
                      const countV = skillsByState.V.length
                      const countS = skillsByState.S.length
                      const countC = skillsByState.C.length
                      const countX = skillsByState.X.length
                      const openState = openPanels[c.id] || null
                      const displayedName = hideNames
                        ? `Candidate #${c.rank.toString().padStart(2, '0')}`
                        : c.name

                      // Tie note calculation
                      let tieNote = null
                      const nextCandidate = rankedCandidates[idx + 1]
                      if (nextCandidate && nextCandidate.score === c.score) {
                        const nextName = hideNames
                          ? `Candidate #${nextCandidate.rank.toString().padStart(2, '0')}`
                          : nextCandidate.name
                        let reason = 'fresher verification timestamp'
                        if (c.verifiedReqCount > nextCandidate.verifiedReqCount) {
                          reason = `more verified required skills (${c.verifiedReqCount} vs ${nextCandidate.verifiedReqCount})`
                        } else if (c.contradictedCount < nextCandidate.contradictedCount) {
                          reason =
                            c.contradictedCount === 0
                              ? `no contradicted skills (0 vs ${nextCandidate.contradictedCount})`
                              : `fewer contradicted skills (${c.contradictedCount} vs ${nextCandidate.contradictedCount})`
                        }
                        tieNote = `Ranked above ${nextName}: ${reason}`
                      }

                      // Top 3 skills text
                      const topSkillsText = (c.matched || [])
                        .slice(0, 3)
                        .map((m) => m.skill)
                        .join(', ')

                      const stateButtons = [
                        { key: 'V', count: countV, word: 'Verified', swatchClass: 'swatch-v' },
                        { key: 'S', count: countS, word: 'Supported', swatchClass: 'swatch-s' },
                        { key: 'C', count: countC, word: 'Claimed', swatchClass: 'swatch-c' },
                        { key: 'X', count: countX, word: 'Contradicted', swatchClass: 'swatch-x' },
                      ]

                      return (
                        <li
                          key={c.id}
                          className={`leaderboard-item ${openState ? 'has-open-panel' : ''}`}
                        >
                          {/* Column 1: Rank */}
                          <div className="lb-cell lb-cell-rank">
                            <span className="lb-rank-num">{c.rank}</span>
                          </div>

                          {/* Column 2: Candidate */}
                          <div className="lb-cell lb-cell-candidate">
                            <div className="lb-primary-name">
                              <span className="lb-candidate-name">{displayedName}</span>
                              {c.isLiveDemo && (
                                <span className="lb-tag">Live demo</span>
                              )}
                              {c.isRecruiterGenerated && (
                                <>
                                  <span className="lb-tag">Recruiter generated</span>
                                  <span className="lb-tag" style={{ marginLeft: '4px', background: 'var(--surface-3)', border: '1px solid var(--line-soft)' }}>
                                    ownership unconfirmed
                                  </span>
                                </>
                              )}
                              {c.decidingFactor && (
                                <span className="lb-tie-note" style={{ fontStyle: 'normal' }}>
                                  ↳ {c.decidingFactor}
                                </span>
                              )}
                            </div>
                            {tieNote && <div className="lb-tie-note">{tieNote}</div>}
                          </div>

                          {/* Column 3: Match */}
                          <div className="lb-cell lb-cell-match">
                            <div className="lb-primary-match">
                              <span className="lb-match-val">{c.score}%</span>
                              <span className="lb-match-lbl">match</span>
                            </div>
                          </div>

                          {/* Column 4: Skills */}
                          <div className="lb-cell lb-cell-skills">
                            <div className="lb-primary-states" role="group" aria-label="Skill states">
                              {stateButtons.map(({ key, count, word, swatchClass }) => {
                                const isZero = count === 0
                                const isSelected = openState === key
                                const isContradictedWithCount = key === 'X' && count > 0

                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    id={`tile-btn-${c.id}-${key}`}
                                    className={`lb-state-btn ${swatchClass} ${isSelected ? 'selected' : ''} ${isContradictedWithCount ? 'contradicted-active' : ''}`}
                                    onClick={() => handleToggleTile(c.id, key, count, displayedName)}
                                    disabled={isZero}
                                    aria-disabled={isZero}
                                    aria-expanded={isSelected}
                                    aria-pressed={isSelected}
                                    aria-controls={`skills-panel-${c.id}`}
                                    title={isZero ? 'No skills in this state' : `${count} ${word} skills`}
                                  >
                                    <span className={`lb-state-swatch ${swatchClass}`} aria-hidden="true" />
                                    <span className="lb-state-count">{count}</span>
                                    <span className="lb-state-word">{word}</span>
                                  </button>
                                )
                              })}
                            </div>

                            {c.totalReqCount > 0 && (
                              <div className="lb-skills-req-note">
                                {c.verifiedReqCount} of {c.totalReqCount} required skills Verified
                              </div>
                            )}

                            {topSkillsText && (
                              <div className="lb-top-skills">
                                <span className="lb-top-skills-lbl">Top skills:</span> {topSkillsText}
                              </div>
                            )}
                          </div>

                          {/* Column 5: Actions */}
                          <div className="lb-cell lb-cell-actions">
                            <label
                              className="lb-compare-label"
                              title={`Select ${displayedName} for comparison`}
                            >
                              <input
                                type="checkbox"
                                checked={compareIds.has(c.id)}
                                onChange={() => handleToggleCompare(c.id)}
                                disabled={!compareIds.has(c.id) && compareIds.size >= 3}
                                aria-label={`Select ${displayedName} for comparison`}
                              />
                              <span>Compare</span>
                            </label>
                            {c.passport && (
                              <Link
                                to={`/passport/${c.passport.id}`}
                                className="b sm g lb-view-passport-btn"
                              >
                                View passport
                              </Link>
                            )}
                          </div>

                          {/* In-Card Skills Panel Row (Spans full width below row columns) */}
                          <div
                            className={`lb-drawer-row ${openState ? 'open' : ''} ${RM ? 'rm' : ''}`}
                            style={{ gridColumn: '1 / -1' }}
                          >
                            <div className="lb-drawer-inner">
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
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
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

            {/* Recruiter Batch Passport Ingestion */}
            <div className="table-card glass" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span className="k m" style={{ color: 'var(--accent)' }}>BATCH RECRUITER PASSPORT INGESTION</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', margin: '6px 0 4px' }}>
                    Batch Ingest Candidate Passports
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--muted)', margin: 0 }}>
                    Upload a candidate spreadsheet (.csv or .xlsx) and optional resumes archive (.zip) to match documents and issue passports.
                  </p>
                </div>
                {(import.meta.env.VITE_USE_MOCK === 'true' || batchData?.is_demo) && (
                  <span className="chip sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                    Sample data
                  </span>
                )}
              </div>

              {/* Step 1: Upload Step */}
              {batchStep === 'upload' && (
                <div style={{ marginTop: '18px' }}>
                  {/* Consent Checkbox */}
                  <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--line-soft)' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem', color: 'var(--ink)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={batchConsent}
                        onChange={(e) => setBatchConsent(e.target.checked)}
                        style={{ marginTop: '2px', minWidth: '18px', minHeight: '18px' }}
                        id="batch-consent-checkbox"
                      />
                      <span>
                        I confirm candidate consent to parse provided CV text. <strong>Resume-only passports are capped at Claimed unless code links are provided.</strong>
                      </span>
                    </label>
                  </div>

                  {/* Dual Upload Area */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                    {/* 1. Spreadsheet Dropzone */}
                    <div
                      className={`csv-dropzone ${batchDragSpreadsheet ? 'drag-active' : ''}`}
                      style={{ margin: 0, padding: '24px 16px' }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setBatchDragSpreadsheet(true)
                      }}
                      onDragLeave={() => setBatchDragSpreadsheet(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setBatchDragSpreadsheet(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) setBatchSpreadsheet(file)
                      }}
                    >
                      <input
                        type="file"
                        id="batch-spreadsheet-picker"
                        accept=".csv,.xlsx"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setBatchSpreadsheet(file)
                        }}
                      />
                      <label htmlFor="batch-spreadsheet-picker" style={{ cursor: 'pointer', display: 'block' }}>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', display: 'block' }}>
                          Candidate Spreadsheet (.csv or .xlsx)
                        </strong>
                        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '4px 0 10px' }}>
                          Headers: name, email, github_url, leetcode_url, codeforces_url, certificate_urls, resume_file
                        </p>
                        {batchSpreadsheet ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>{batchSpreadsheet.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>({Math.round(batchSpreadsheet.size / 1024)} KB)</span>
                            <button
                              type="button"
                              className="b sm g"
                              style={{ minHeight: '32px', padding: '2px 8px', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.preventDefault()
                                setBatchSpreadsheet(null)
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="b sm g"
                            style={{ minHeight: '44px', pointerEvents: 'none' }}
                          >
                            Browse spreadsheet
                          </button>
                        )}
                      </label>
                    </div>

                    {/* 2. Optional Resumes ZIP Dropzone */}
                    <div
                      className={`csv-dropzone ${batchDragZip ? 'drag-active' : ''}`}
                      style={{ margin: 0, padding: '24px 16px' }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setBatchDragZip(true)
                      }}
                      onDragLeave={() => setBatchDragZip(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setBatchDragZip(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) setBatchZip(file)
                      }}
                    >
                      <input
                        type="file"
                        id="batch-zip-picker"
                        accept=".zip"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setBatchZip(file)
                        }}
                      />
                      <label htmlFor="batch-zip-picker" style={{ cursor: 'pointer', display: 'block' }}>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', display: 'block' }}>
                          Optional Resumes Archive (.zip)
                        </strong>
                        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '4px 0 10px' }}>
                          PDF, DOCX, or TXT documents (up to 100 files, 25 MB max)
                        </p>
                        {batchZip ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>{batchZip.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>({Math.round(batchZip.size / 1024)} KB)</span>
                            <button
                              type="button"
                              className="b sm g"
                              style={{ minHeight: '32px', padding: '2px 8px', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.preventDefault()
                                setBatchZip(null)
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="b sm g"
                            style={{ minHeight: '44px', pointerEvents: 'none' }}
                          >
                            Browse resumes ZIP
                          </button>
                        )}
                      </label>
                    </div>
                  </div>

                  {batchError && (
                    <div className="login-notice" style={{ marginTop: '14px', borderColor: 'var(--st-x)', color: 'var(--st-x)' }} role="alert">
                      <span>{batchError}</span>
                    </div>
                  )}

                  <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="b g"
                      style={{ minHeight: '44px', minWidth: '200px' }}
                      onClick={handleInspectBatch}
                      disabled={!batchSpreadsheet || !batchConsent || batchLoading}
                    >
                      {batchLoading ? 'Parsing and Inspecting...' : 'Inspect and Preview Batch'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Preview Step */}
              {batchStep === 'preview' && batchData && (
                <div style={{ marginTop: '18px' }}>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px', padding: '12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.84rem', color: 'var(--ink)' }}>
                      <strong>Total rows:</strong> {batchData.total_rows}
                    </span>
                    <span style={{ fontSize: '0.84rem', color: 'var(--st-v)' }}>
                      <strong>Valid rows:</strong> {batchData.rows.filter((r) => r.is_valid && !removedRowIds.has(r.id)).length}
                    </span>
                    <span style={{ fontSize: '0.84rem', color: 'var(--st-x)' }}>
                      <strong>Rows with errors:</strong> {batchData.rows.filter((r) => !r.is_valid && !removedRowIds.has(r.id)).length}
                    </span>
                    {batchData.unmatched_files?.length > 0 && (
                      <span style={{ fontSize: '0.84rem', color: 'var(--st-s)' }}>
                        <strong>Unmatched ZIP files:</strong> {batchData.unmatched_files.length}
                      </span>
                    )}
                  </div>

                  {/* Preview Table */}
                  <div className="responsive-table-wrapper" data-lenis-prevent>
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Match Status</th>
                          <th>Tier</th>
                          <th>Validation Status</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchData.rows
                          .filter((r) => !removedRowIds.has(r.id))
                          .map((row) => (
                            <tr key={row.id}>
                              <td data-label="Candidate">
                                <strong>{row.name || '(Missing Name)'}</strong>
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                                  {row.email || '(Missing Email)'}
                                </div>
                              </td>
                              <td data-label="Match Status">
                                <span className={`chip sm ${row.matched_resume_filename ? 'V' : row.match_status === 'links found' ? 'S' : 'C'}`}>
                                  {row.matched_resume_filename ? `Resume: ${row.matched_resume_filename}` : row.match_status}
                                </span>
                              </td>
                              <td data-label="Tier">
                                <span className={`chip sm ${row.tier === 'links supplied' ? 'S' : 'C'}`}>
                                  {row.tier}
                                </span>
                              </td>
                              <td data-label="Validation">
                                {row.is_valid ? (
                                  <span className="chip sm V">Valid</span>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {row.errors.map((err, errIdx) => (
                                      <span key={errIdx} className="chip sm X">
                                        {err}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td data-label="Action" style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="b sm g"
                                  style={{ minHeight: '36px' }}
                                  onClick={() => handleRemoveBatchRow(row.id)}
                                >
                                  Remove row
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Unmatched Files Alert */}
                  {batchData.unmatched_files?.length > 0 && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                      <strong>Unmatched files in ZIP ({batchData.unmatched_files.length}):</strong>{' '}
                      {batchData.unmatched_files.join(', ')}
                    </div>
                  )}

                  {/* Unmatched Candidate Rows Alert */}
                  {batchData.unmatched_rows?.length > 0 && (
                    <div style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                      <strong>Candidates without matching resume in ZIP ({batchData.unmatched_rows.length}):</strong>{' '}
                      {batchData.unmatched_rows.join(', ')}
                    </div>
                  )}

                  {batchError && (
                    <div className="login-notice" style={{ marginTop: '14px', borderColor: 'var(--st-x)', color: 'var(--st-x)' }} role="alert">
                      <span>{batchError}</span>
                    </div>
                  )}

                  <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="b sm g"
                      style={{ minHeight: '44px' }}
                      onClick={handleResetBatch}
                    >
                      Back to file upload
                    </button>
                    <button
                      type="button"
                      className="b g"
                      style={{ minHeight: '44px', minWidth: '220px' }}
                      onClick={handleStartBatchProcessing}
                      disabled={
                        batchLoading ||
                        batchData.rows.filter((r) => r.is_valid && !removedRowIds.has(r.id)).length === 0
                      }
                    >
                      {batchLoading
                        ? 'Starting Pipeline...'
                        : `Process Valid Rows (${batchData.rows.filter((r) => r.is_valid && !removedRowIds.has(r.id)).length})`}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Processing Step */}
              {batchStep === 'processing' && batchData && (
                <div style={{ marginTop: '18px' }}>
                  <div
                    aria-live="polite"
                    className="login-notice"
                    style={{ marginBottom: '16px' }}
                    role="status"
                  >
                    <span className="notice-dot" aria-hidden="true" />
                    <span>{batchProgressAnnouncement || 'Executing verification background jobs...'}</span>
                  </div>

                  <div className="responsive-table-wrapper" data-lenis-prevent>
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Tier</th>
                          <th>Progress Status</th>
                          <th>Passport ID</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchData.rows
                          .filter((r) => !removedRowIds.has(r.id) && r.is_valid)
                          .map((row) => (
                            <tr key={row.id}>
                              <td data-label="Candidate">
                                <strong>{row.name}</strong>
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                                  {row.email}
                                </div>
                              </td>
                              <td data-label="Tier">
                                <span className={`chip sm ${row.tier === 'links supplied' ? 'S' : 'C'}`}>
                                  {row.tier}
                                </span>
                              </td>
                              <td data-label="Status">
                                {row.status === 'done' && (
                                  <span className="chip sm V">Done</span>
                                )}
                                {row.status === 'running' && (
                                  <span className="chip sm S">Running...</span>
                                )}
                                {row.status === 'queued' && (
                                  <span className="chip sm C">Queued</span>
                                )}
                                {row.status === 'failed' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span className="chip sm X">Failed</span>
                                    {row.error_detail && (
                                      <span style={{ fontSize: '0.74rem', color: 'var(--st-x)' }}>
                                        {row.error_detail}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td data-label="Passport ID">
                                {row.passport_id ? (
                                  <div>
                                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>
                                      {row.passport_id}
                                    </span>
                                    {row.role_match_score !== undefined && row.role_match_score !== null && (
                                      <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)' }}>
                                        Match: {Math.round(row.role_match_score * 100)}%
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Pending</span>
                                )}
                              </td>
                              <td data-label="Action" style={{ textAlign: 'right' }}>
                                {row.status === 'failed' && (
                                  <button
                                    type="button"
                                    className="b sm g"
                                    style={{ minHeight: '36px' }}
                                    onClick={() => handleRetryBatchRow(row.id)}
                                  >
                                    Retry
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '12px' }}>
                    Jobs are processing in background. You can navigate freely while tasks complete.
                  </p>
                </div>
              )}

              {/* Step 4: Done Step */}
              {batchStep === 'done' && (
                <div style={{ marginTop: '18px' }}>
                  {(() => {
                    const activeBatchRows = (batchData?.rows || []).filter(
                      (r) => !removedRowIds.has(r.id) && r.is_valid && r.status === 'done'
                    )
                    const verifiableCount = activeBatchRows.filter((r) =>
                      Boolean(
                        (r.github_url && r.github_url.trim()) ||
                        (r.leetcode_url && r.leetcode_url.trim()) ||
                        (r.codeforces_url && r.codeforces_url.trim()) ||
                        (r.certificate_urls && r.certificate_urls.trim()) ||
                        r.tier === 'links supplied'
                      )
                    ).length
                    const resumeOnlyCount = activeBatchRows.length - verifiableCount

                    return (
                      <div
                        className="login-notice"
                        style={{ borderColor: 'var(--st-v)', color: 'var(--st-v)', marginBottom: '16px' }}
                        role="status"
                      >
                        <span>
                          {verifiableCount > 0
                            ? `Batch processing complete. Passports have been generated and registered. ${verifiableCount} candidate${verifiableCount > 1 ? 's' : ''} with verifiable sources ${verifiableCount > 1 ? 'are' : 'is'} now visible on the Leaderboard.${resumeOnlyCount > 0 ? ` (${resumeOnlyCount} resume-only candidate${resumeOnlyCount > 1 ? 's' : ''} remain under "No passport attached" capped at Claimed).` : ''}`
                            : `Batch processing complete. Passports registered for ${resumeOnlyCount} candidate${resumeOnlyCount > 1 ? 's' : ''}. Candidates remain under "No passport attached" capped at Claimed (no verifiable sources provided).`}
                        </span>
                      </div>
                    )
                  })()}

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="b g"
                      style={{ minHeight: '44px' }}
                      onClick={async () => {
                        await loadRoleData()
                        setActiveTab('leaderboard')
                      }}
                    >
                      View Leaderboard Rankings
                    </button>
                    <button
                      type="button"
                      className="b sm g"
                      style={{ minHeight: '44px' }}
                      onClick={handleResetBatch}
                    >
                      Upload Another Batch
                    </button>
                  </div>
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
