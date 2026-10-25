/**
 * NoPassportTab.jsx
 * Tab 2: Resume-Only Applicants (Unverified) & Batch Ingestion.
 * Simple table (name, email, resume file, source) with select all,
 * sticky selection bar, and tidy collapsible batch ingestion panel.
 */

import { useState, useEffect, useRef } from 'react'
import {
  uploadBatchFiles,
  startBatch,
  getBatchStatus,
  retryBatchRow,
} from '../../api/batch.js'
import {
  generatePassportForApplicant,
  addApplicantsBatchToRole,
} from '../../api/applicants.js'

export function NoPassportTab({
  applicantsNoPassport,
  role,
  roleId,
  onReloadRole,
  onNavigateTab,
  setNotice,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isGeneratingBatchSelected, setIsGeneratingBatchSelected] = useState(false)
  const [showBatchPanel, setShowBatchPanel] = useState(false)

  // Batch Ingestion States
  const [batchStep, setBatchStep] = useState('upload') // 'upload' | 'preview' | 'processing' | 'done'
  const [batchSpreadsheet, setBatchSpreadsheet] = useState(null)
  const [batchZip, setBatchZip] = useState(null)
  const [batchConsent, setBatchConsent] = useState(false)
  const [batchData, setBatchData] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchError, setBatchError] = useState(null)
  const [removedRowIds, setRemovedRowIds] = useState(new Set())
  const [batchProgressAnnouncement, setBatchProgressAnnouncement] = useState('')

  // Drag states
  const [batchDragSpreadsheet, setBatchDragSpreadsheet] = useState(false)
  const [batchDragZip, setBatchDragZip] = useState(false)

  const hasSyncedBatchRef = useRef(false)

  // Selection handlers
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

  // Download CSV of selected applicants
  const handleDownloadCsv = () => {
    const selected = applicantsNoPassport.filter((a) => selectedIds.has(a.id))
    if (selected.length === 0) {
      setNotice('Please select at least one candidate row to export.')
      return
    }

    const headers = [
      'name',
      'email',
      'resume_file',
      'source',
      'target_role',
    ]

    const rows = selected.map((a) => {
      const resumeFile =
        a.resume_file ||
        a.matched_resume_filename ||
        (a.name ? `${a.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_resume.pdf` : 'resume.pdf')
      const source = a.source || 'Direct application'
      return [
        `"${a.name.replace(/"/g, '""')}"`,
        `"${a.email.replace(/"/g, '""')}"`,
        `"${resumeFile.replace(/"/g, '""')}"`,
        `"${source.replace(/"/g, '""')}"`,
        `"${(a.targetRole || role?.title || '').replace(/"/g, '""')}"`,
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `proofpass_${roleId}_unverified.csv`
    link.click()
    URL.revokeObjectURL(url)
    setNotice(`Downloaded CSV containing ${selected.length} candidate record${selected.length > 1 ? 's' : ''}.`)
  }

  // Generate passport directly for a single resume-only candidate
  const handleGenerateSingle = async (applicantId) => {
    try {
      await generatePassportForApplicant(applicantId)
      setNotice('Passport generated. Candidate promoted to Leaderboard.')
      if (onReloadRole) await onReloadRole()
    } catch (err) {
      setNotice(err.message)
    }
  }

  // Generate passports for all selected resume-only candidates
  const handleGenerateBatchSelected = async () => {
    if (selectedIds.size === 0) return
    setIsGeneratingBatchSelected(true)
    try {
      for (const id of selectedIds) {
        await generatePassportForApplicant(id)
      }
      setNotice(`Generated passports for ${selectedIds.size} candidate${selectedIds.size > 1 ? 's' : ''}. Promoted to Leaderboard.`)
      setSelectedIds(new Set())
      if (onReloadRole) await onReloadRole()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setIsGeneratingBatchSelected(false)
    }
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

            let candidateSkills = []
            if (Array.isArray(row.skills) && row.skills.length > 0) {
              candidateSkills = row.skills
            } else if (
              row.passport &&
              Array.isArray(row.passport.skills) &&
              row.passport.skills.length > 0
            ) {
              candidateSkills = row.passport.skills
            } else {
              candidateSkills = roleReqSkills.map((req) => ({
                skill: req.skill,
                state: hasVerifiable ? 'S' : 'C',
                level: hasVerifiable ? 2 : 1,
                evidence: hasVerifiable
                  ? row.github_url
                    ? `Repository evidence at ${row.github_url} (ownership unconfirmed)`
                    : 'Verifiable profile link supplied (ownership unconfirmed)'
                  : 'Parsed from candidate resume by recruiter batch run',
                rationale: hasVerifiable
                  ? 'Recruiter-supplied external link. Ownership unconfirmed.'
                  : 'Resume-only claim. Capped at Claimed per trust ceiling.',
                lineShare: hasVerifiable ? 60 : 0,
                confidence: hasVerifiable ? 0.85 : 0.4,
                sources: hasVerifiable
                  ? row.github_url
                    ? ['GitHub']
                    : row.leetcode_url
                    ? ['LeetCode']
                    : ['Certificate']
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
          setBatchStep('done')
          if (onReloadRole) await onReloadRole()
        }
      } catch {
        // Polling retry
      }
    }

    poll()
    const timer = setInterval(poll, 1200)
    return () => clearInterval(timer)
  }, [batchStep, batchData?.id, removedRowIds, onReloadRole])

  return (
    <div
      id="role-tabpanel-nopassport"
      role="tabpanel"
      aria-labelledby="role-tab-nopassport"
    >
      {/* Table Card */}
      <div className="table-card glass mb-24">
        <div className="table-card-head table-head-row-between">
          <div>
            <h2 className="section-title-sm">
              Resume-Only Applicants (No Passport Attached)
            </h2>
            <p className="text-muted-sm mt-4">
              Candidates who submitted resumes without cryptographic evidence. Select rows to generate passports or download records.
            </p>
          </div>

          <div className="flex-gap12">
            <button
              type="button"
              className="b sm g"
              onClick={() => setShowBatchPanel((prev) => !prev)}
            >
              {showBatchPanel ? 'Hide batch upload' : 'Upload spreadsheet (.csv / .xlsx)'}
            </button>
            <button
              type="button"
              className="b sm g"
              onClick={handleDownloadCsv}
              disabled={selectedIds.size === 0}
            >
              Download CSV ({selectedIds.size})
            </button>
          </div>
        </div>

        {/* Unverified Applicants Table */}
        <div className="responsive-table-wrapper" data-lenis-prevent>
          <table className="dash-table">
            <thead>
              <tr>
                <th className="w-col-40">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === applicantsNoPassport.length &&
                      applicantsNoPassport.length > 0
                    }
                    onChange={handleSelectAll}
                    aria-label="Select all applicants"
                  />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Resume file</th>
                <th>Source</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {applicantsNoPassport.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center pad-cell-36 text-muted-sm">
                    All applicants currently have cryptographically sealed passports!
                  </td>
                </tr>
              ) : (
                applicantsNoPassport.map((cand) => {
                  const resumeFile =
                    cand.resume_file ||
                    cand.matched_resume_filename ||
                    (cand.name ? `${cand.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_resume.pdf` : 'resume.pdf')
                  const source = cand.source || 'Direct application'

                  return (
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
                        <span className="cand-email">{cand.email}</span>
                      </td>
                      <td data-label="Resume file">
                        <span className="text-muted-sm font-mono">{resumeFile}</span>
                      </td>
                      <td data-label="Source">
                        <span className="chip sm C">{source}</span>
                      </td>
                      <td data-label="Action" className="text-right">
                        <button
                          type="button"
                          className="b sm g"
                          onClick={() => handleGenerateSingle(cand.id)}
                        >
                          Generate passport
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tidy Collapsible Batch Ingestion Panel */}
      {(showBatchPanel || batchStep !== 'upload') && (
        <div className="table-card glass card-pad-24 mb-24">
          <div className="table-head-row-between">
            <div>
              <span className="k m text-accent">BATCH PASSPORT INGESTION</span>
              <h3 className="section-title-sm mt-4">
                Batch Ingest Candidate Passports
              </h3>
              <p className="text-muted-sm mt-4">
                Upload a candidate spreadsheet (.csv or .xlsx) and optional resumes archive (.zip) to match documents and issue passports.
              </p>
            </div>
            <button
              type="button"
              className="b sm g"
              onClick={() => setShowBatchPanel(false)}
            >
              Close panel
            </button>
          </div>

          {/* Step 1: Upload Step */}
          {batchStep === 'upload' && (
            <div className="mt-18">
              {/* Consent Checkbox */}
              <div className="batch-consent-box">
                <label className="batch-consent-label" htmlFor="batch-consent-checkbox">
                  <input
                    type="checkbox"
                    checked={batchConsent}
                    onChange={(e) => setBatchConsent(e.target.checked)}
                    className="batch-consent-input"
                    id="batch-consent-checkbox"
                  />
                  <span>
                    I confirm candidate consent to parse provided CV text.{' '}
                    <strong>
                      Resume-only passports are capped at Claimed unless links are provided.
                    </strong>
                  </span>
                </label>
              </div>

              {/* Dual Upload Area */}
              <div className="batch-dropzone-grid">
                {/* 1. Spreadsheet Dropzone */}
                <div
                  className={`csv-dropzone ${batchDragSpreadsheet ? 'drag-active' : ''}`}
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
                    className="hidden-file-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setBatchSpreadsheet(file)
                    }}
                  />
                  <label htmlFor="batch-spreadsheet-picker" className="batch-dropzone-label">
                    <strong className="role-stat-lbl batch-dropzone-title">
                      Candidate Spreadsheet (.csv or .xlsx)
                    </strong>
                    <p className="text-muted-sm mt-4 mb-16">
                      Headers: name, email, github_url, leetcode_url, codeforces_url, certificate_urls, resume_file
                    </p>
                    {batchSpreadsheet ? (
                      <div className="batch-file-pill">
                        <span className="batch-file-name">{batchSpreadsheet.name}</span>
                        <span className="text-muted-sm">
                          ({Math.round(batchSpreadsheet.size / 1024)} KB)
                        </span>
                        <button
                          type="button"
                          className="b sm g batch-remove-btn"
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
                        className="b sm g btn-min-44 pointer-events-none"
                      >
                        Browse spreadsheet
                      </button>
                    )}
                  </label>
                </div>

                {/* 2. Optional Resumes ZIP Dropzone */}
                <div
                  className={`csv-dropzone ${batchDragZip ? 'drag-active' : ''}`}
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
                    className="hidden-file-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setBatchZip(file)
                    }}
                  />
                  <label htmlFor="batch-zip-picker" className="batch-dropzone-label">
                    <strong className="role-stat-lbl batch-dropzone-title">
                      Optional Resumes Archive (.zip)
                    </strong>
                    <p className="text-muted-sm mt-4 mb-16">
                      PDF, DOCX, or TXT documents (up to 100 files, 25 MB max)
                    </p>
                    {batchZip ? (
                      <div className="batch-file-pill">
                        <span className="batch-file-name">{batchZip.name}</span>
                        <span className="text-muted-sm">
                          ({Math.round(batchZip.size / 1024)} KB)
                        </span>
                        <button
                          type="button"
                          className="b sm g batch-remove-btn"
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
                        className="b sm g btn-min-44 pointer-events-none"
                      >
                        Browse resumes ZIP
                      </button>
                    )}
                  </label>
                </div>
              </div>

              {batchError && (
                <div className="login-notice notice-error mt-16" role="alert">
                  <span>{batchError}</span>
                </div>
              )}

              <div className="flex-end-mt18">
                <button
                  type="button"
                  className="b g btn-min-44"
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
            <div className="mt-18">
              <div className="batch-preview-stats">
                <span className="stat-tag-ink">
                  <strong>Total rows:</strong> {batchData.total_rows}
                </span>
                <span className="stat-tag-v">
                  <strong>Valid rows:</strong>{' '}
                  {batchData.rows.filter((r) => r.is_valid && !removedRowIds.has(r.id)).length}
                </span>
                <span className="stat-tag-x">
                  <strong>Rows with errors:</strong>{' '}
                  {batchData.rows.filter((r) => !r.is_valid && !removedRowIds.has(r.id)).length}
                </span>
                {batchData.unmatched_files?.length > 0 && (
                  <span className="stat-tag-s">
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
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchData.rows
                      .filter((r) => !removedRowIds.has(r.id))
                      .map((row) => (
                        <tr key={row.id}>
                          <td data-label="Candidate">
                            <strong>{row.name || '(Missing Name)'}</strong>
                            <div className="cand-email">
                              {row.email || '(Missing Email)'}
                            </div>
                          </td>
                          <td data-label="Match Status">
                            <span
                              className={`chip sm ${
                                row.matched_resume_filename
                                  ? 'V'
                                  : row.match_status === 'links found'
                                  ? 'S'
                                  : 'C'
                              }`}
                            >
                              {row.matched_resume_filename
                                ? `Resume: ${row.matched_resume_filename}`
                                : row.match_status}
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
                              <div className="flex-col-gap4">
                                {row.errors.map((err, errIdx) => (
                                  <span key={errIdx} className="chip sm X">
                                    {err}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td data-label="Action" className="text-right">
                            <button
                              type="button"
                              className="b sm g btn-min-36"
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

              {batchError && (
                <div className="login-notice notice-error mt-16" role="alert">
                  <span>{batchError}</span>
                </div>
              )}

              <div className="flex-between-mt18">
                <button
                  type="button"
                  className="b sm g btn-min-44"
                  onClick={handleResetBatch}
                >
                  Back to file upload
                </button>
                <button
                  type="button"
                  className="b g btn-min-44"
                  onClick={handleStartBatchProcessing}
                  disabled={
                    batchLoading ||
                    batchData.rows.filter((r) => r.is_valid && !removedRowIds.has(r.id)).length === 0
                  }
                >
                  {batchLoading
                    ? 'Starting Pipeline...'
                    : `Process Valid Rows (${
                        batchData.rows.filter((r) => r.is_valid && !removedRowIds.has(r.id)).length
                      })`}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing Step */}
          {batchStep === 'processing' && batchData && (
            <div className="mt-18">
              <div
                aria-live="polite"
                className="login-notice mb-16"
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
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchData.rows
                      .filter((r) => !removedRowIds.has(r.id) && r.is_valid)
                      .map((row) => (
                        <tr key={row.id}>
                          <td data-label="Candidate">
                            <strong>{row.name}</strong>
                            <div className="cand-email">{row.email}</div>
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
                              <span className="chip sm S">Verifying</span>
                            )}
                            {row.status === 'queued' && (
                              <span className="chip sm C">Queued</span>
                            )}
                            {row.status === 'failed' && (
                              <div className="flex-col-gap4">
                                <span className="chip sm X">Failed</span>
                                {row.error_detail && (
                                  <span className="batch-err-detail">
                                    {row.error_detail}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td data-label="Passport ID">
                            {row.passport_id ? (
                              <div>
                                <span className="cand-email font-mono">
                                  {row.passport_id}
                                </span>
                                {row.role_match_score !== undefined && row.role_match_score !== null && (
                                  <span className="batch-score-sub">
                                    Match: {Math.round(row.role_match_score * 100)}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-faint-sm">Pending</span>
                            )}
                          </td>
                          <td data-label="Action" className="text-right">
                            {row.status === 'failed' && (
                              <button
                                type="button"
                                className="b sm g btn-min-36"
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

              <p className="text-muted-sm mt-12">
                Jobs are processing in background. You can navigate freely while tasks complete.
              </p>
            </div>
          )}

          {/* Step 4: Done Step */}
          {batchStep === 'done' && (
            <div className="mt-18">
              <div
                className="login-notice notice-success mb-16"
                role="status"
              >
                <span>
                  Batch processing complete. Passports have been generated and registered.
                </span>
              </div>

              <div className="flex-gap12">
                <button
                  type="button"
                  className="b g btn-min-44"
                  onClick={() => {
                    if (onNavigateTab) onNavigateTab('leaderboard')
                  }}
                >
                  View Leaderboard Rankings
                </button>
                <button
                  type="button"
                  className="b sm g btn-min-44"
                  onClick={handleResetBatch}
                >
                  Upload Another Batch
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky Bottom Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky-selection-bar" role="region" aria-label="Candidate selection toolbar">
          <div className="w selection-bar-inner">
            <div className="selection-bar-info">
              <span className="selection-count-badge">{selectedIds.size} selected</span>
              <span className="text-muted-sm">Unverified applicant actions</span>
            </div>

            <div className="selection-bar-actions">
              <button
                type="button"
                className="b sm"
                onClick={handleGenerateBatchSelected}
                disabled={isGeneratingBatchSelected}
              >
                {isGeneratingBatchSelected ? 'Generating passports...' : 'Generate passports'}
              </button>
              <button
                type="button"
                className="b sm g"
                onClick={handleDownloadCsv}
              >
                Download CSV
              </button>
              <button
                type="button"
                className="b sm g"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
