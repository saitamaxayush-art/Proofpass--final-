/**
 * Recruiter Role Detail View Component
 * Provides:
 * 1. Leaderboard: Ranked candidates with passports, anonymous toggle, and tie-breaking explanations.
 * 2. No passport attached: CSV download of selected, CSV upload passport generator with consent check.
 * 3. Requirements: Editable job title, description, weighted skills, and demo CV viewer.
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Seg from './Seg.jsx'
import { getRole, updateRole } from '../api/roles.js'
import { listApplicantsForRole, addApplicantToRole, generatePassportForApplicant } from '../api/applicants.js'
import { listPassports } from '../api/passports.js'
import { rankApplicants } from '../lib/rank.js'
import { L } from '../data.js'

export default function RecruiterRoleDetail() {
  const { roleId } = useParams()

  const [role, setRole] = useState(null)
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  // Candidate Data
  const [applicantsWithPassport, setApplicantsWithPassport] = useState([])
  const [applicantsNoPassport, setApplicantsNoPassport] = useState([])

  // Leaderboard State
  const [hideNames, setHideNames] = useState(false)

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
    <main id="main" className="dash-page">
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
            <div className="leaderboard-meta-strip">
              <div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>
                  Ranked Candidates with Verified Evidence
                </strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '2px 0 0' }}>
                  Ranked by match %, then verified required skills, then fewer contradicted claims.
                </p>
              </div>

              {/* Anonymous Screening Switch */}
              <label className="revoke-switch-label" title="Mask candidate names for unbiased screening">
                <input
                  type="checkbox"
                  checked={hideNames}
                  onChange={(e) => setHideNames(e.target.checked)}
                />
                <span>Hide candidate names (Anonymous Review)</span>
              </label>
            </div>

            <div className="responsive-table-wrapper" data-lenis-prevent>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th style={{ width: '48px' }}>Rank</th>
                    <th>Candidate</th>
                    <th>Match %</th>
                    <th>State Mix</th>
                    <th>Contradicted</th>
                    <th>Top Skills & Evidence</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedCandidates.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                        No candidates with passports evaluated yet.
                      </td>
                    </tr>
                  ) : (
                    rankedCandidates.map((c) => (
                      <tr key={c.id}>
                        {/* Rank Column */}
                        <td data-label="Rank">
                          <span className={`rank-badge ${c.rank === 1 ? 'top-1' : ''}`}>
                            {c.rank}
                          </span>
                        </td>

                        {/* Candidate Name / Anonymous Mask */}
                        <td data-label="Candidate">
                          <div>
                            <strong>
                              {hideNames ? `Candidate #${c.rank.toString().padStart(2, '0')}` : c.name}
                            </strong>
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
                          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>
                            {c.score}%
                          </span>
                        </td>

                        {/* State Mix Bar */}
                        <td data-label="State Mix" style={{ minWidth: '150px' }}>
                          <div className="state-mix-bar">
                            <div className="mix-v" style={{ width: `${(c.counts.V / Math.max(1, c.counts.total)) * 100}%` }} title={`Verified: ${c.counts.V}`} />
                            <div className="mix-s" style={{ width: `${(c.counts.S / Math.max(1, c.counts.total)) * 100}%` }} title={`Supported: ${c.counts.S}`} />
                            <div className="mix-c" style={{ width: `${(c.counts.C / Math.max(1, c.counts.total)) * 100}%` }} title={`Claimed: ${c.counts.C}`} />
                            <div className="mix-x" style={{ width: `${(c.counts.X / Math.max(1, c.counts.total)) * 100}%` }} title={`Contradicted: ${c.counts.X}`} />
                          </div>
                          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--mono)', color: 'var(--faint)', display: 'block', marginTop: '4px' }}>
                            {c.counts.V}V · {c.counts.S}S · {c.counts.C}C · {c.counts.X}X
                          </span>
                        </td>

                        {/* Contradicted Flag Count */}
                        <td data-label="Contradicted">
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontWeight: 600,
                              color: c.contradictedCount > 0 ? 'var(--st-x)' : 'var(--muted)',
                            }}
                          >
                            {c.contradictedCount > 0 ? `${c.contradictedCount} Flagged` : '0 Clean'}
                          </span>
                        </td>

                        {/* Top Matched & Missing Skills */}
                        <td data-label="Skills">
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
                        <td data-label="Actions" style={{ textAlign: 'right' }}>
                          {c.passport && (
                            <Link to={`/passport/${c.passport.id}`} className="b sm g">
                              View passport →
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
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
    </main>
  )
}
