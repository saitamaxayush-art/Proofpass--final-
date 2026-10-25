/**
 * NoPassportTab.jsx
 * Tab 2: Resume-Only Applicants (No Passport Attached).
 * Allows the recruiter to directly select unverified applicants and instantly generate
 * passports from the dashboard without going through the multi-step verification pipeline.
 * Promotes candidates directly to the active Leaderboard with "Newly added" highlights.
 */

import { useState, useMemo } from 'react'
import { generatePassportForApplicant } from '../../api/applicants.js'

export function NoPassportTab({
  applicantsNoPassport = [],
  role,
  roleId,
  onReloadRole,
  onNavigateTab,
  setNotice,
  onDirectGeneratePassports,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter applicants by search query
  const filteredApplicants = useMemo(() => {
    if (!searchQuery.trim()) return applicantsNoPassport
    const q = searchQuery.toLowerCase().trim()
    return applicantsNoPassport.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q)
    )
  }, [applicantsNoPassport, searchQuery])

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredApplicants.map((a) => a.id)))
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

  // Direct Passport Generation for a single candidate
  const handleGenerateSingle = async (applicantId) => {
    setIsGenerating(true)
    try {
      await generatePassportForApplicant(applicantId)
      if (onDirectGeneratePassports) {
        await onDirectGeneratePassports([applicantId])
      } else {
        if (onReloadRole) await onReloadRole()
        if (onNavigateTab) onNavigateTab('leaderboard')
        setNotice('Passport directly generated. Candidate promoted to Leaderboard.')
      }
    } catch (err) {
      setNotice(`Failed to generate passport: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Direct Passport Generation for all selected candidates
  const handleGenerateSelected = async () => {
    if (selectedIds.size === 0) return
    setIsGenerating(true)
    const targetIds = Array.from(selectedIds)
    try {
      for (const id of targetIds) {
        await generatePassportForApplicant(id)
      }
      setSelectedIds(new Set())
      if (onDirectGeneratePassports) {
        await onDirectGeneratePassports(targetIds)
      } else {
        if (onReloadRole) await onReloadRole()
        if (onNavigateTab) onNavigateTab('leaderboard')
        setNotice(
          `Passports directly generated for ${targetIds.length} candidate(s). Promoted to Leaderboard.`
        )
      }
    } catch (err) {
      setNotice(`Error generating passports: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Download CSV of selected applicants
  const handleDownloadCsv = () => {
    const selected = applicantsNoPassport.filter((a) => selectedIds.has(a.id))
    if (selected.length === 0) {
      setNotice('Please select at least one candidate row to export.')
      return
    }

    const headers = ['name', 'email', 'resume_file', 'source', 'target_role']
    const rows = selected.map((a) => {
      const resumeFile =
        a.resume_file ||
        a.matched_resume_filename ||
        (a.name ? `${a.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_resume.pdf` : 'resume.pdf')
      const source = a.source || 'Direct application'
      return [
        `"${(a.name || '').replace(/"/g, '""')}"`,
        `"${(a.email || '').replace(/"/g, '""')}"`,
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
    setNotice(`Downloaded CSV containing ${selected.length} candidate record(s).`)
  }

  const allFilteredSelected =
    filteredApplicants.length > 0 &&
    filteredApplicants.every((a) => selectedIds.has(a.id))

  return (
    <div className="nopassport-tab-container">
      {/* Top Card: Direct Generation Controls */}
      <div className="table-card glass card-pad-24 mb-24">
        <div className="table-head-row-between flex-wrap gap-14">
          <div>
            <span className="k m text-accent">DIRECT PASSPORT GENERATION</span>
            <h2 className="section-title-sm mt-4">
              Resume-Only Applicants ({applicantsNoPassport.length})
            </h2>
            <p className="text-muted-sm mt-4">
              Select candidates below to directly generate verified skill passports through your dashboard.
              Newly generated candidates will be added straight into the main Leaderboard and highlighted.
            </p>
          </div>

          <div className="flex-row-gap8 flex-wrap">
            <button
              type="button"
              className="b sm"
              onClick={handleGenerateSelected}
              disabled={selectedIds.size === 0 || isGenerating}
              title="Generate passports directly for all selected candidates"
            >
              {isGenerating
                ? 'Generating passports...'
                : `⚡ Generate Passports (${selectedIds.size} selected)`}
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

        {/* Disclaimer / Ceiling Callout */}
        <div className="nopassport-disclaimer mt-14" role="note">
          <span className="text-accent font-semibold mr-6">Notice:</span>
          Resume-only passports are capped at Claimed (20% match weight) unless repository or verifiable links are provided.
        </div>

        {/* Filter and Search Bar */}
        <div className="table-head-row-between flex-wrap gap-12 mt-18">
          <div className="flex-1-min-300">
            <input
              type="search"
              className="form-input sm"
              placeholder="Filter unverified applicants by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter unverified applicants"
            />
          </div>

          <div className="flex-row-gap8 align-center">
            <label className="checkbox-label text-sm text-muted">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={handleSelectAll}
                disabled={filteredApplicants.length === 0}
              />
              <span>Select all visible ({filteredApplicants.length})</span>
            </label>
            {selectedIds.size > 0 && (
              <button
                type="button"
                className="btn-text-subtle text-xs"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Unverified Applicants Table */}
        <div className="responsive-table-wrapper mt-16" data-lenis-prevent>
          <table className="dash-table">
            <thead>
              <tr>
                <th className="w-col-40">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleSelectAll}
                    disabled={filteredApplicants.length === 0}
                    aria-label="Select all unverified applicants"
                  />
                </th>
                <th>Candidate</th>
                <th>Email</th>
                <th>Resume File</th>
                <th>Source</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center pad-cell-36 text-muted-sm">
                    {applicantsNoPassport.length === 0
                      ? 'All applicants currently have cryptographically sealed passports!'
                      : 'No unverified candidates match your search.'}
                  </td>
                </tr>
              ) : (
                filteredApplicants.map((cand) => {
                  const resumeFile =
                    cand.resume_file ||
                    cand.matched_resume_filename ||
                    (cand.name ? `${cand.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_resume.pdf` : 'resume.pdf')
                  const source = cand.source || 'Direct application'
                  const isChecked = selectedIds.has(cand.id)

                  return (
                    <tr key={cand.id} className={isChecked ? 'row-selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(cand.id)}
                          aria-label={`Select ${cand.name}`}
                        />
                      </td>
                      <td data-label="Candidate">
                        <strong>{cand.name}</strong>
                      </td>
                      <td data-label="Email">
                        <span className="cand-email">{cand.email}</span>
                      </td>
                      <td data-label="Resume File">
                        <span className="text-muted-sm font-mono">{resumeFile}</span>
                      </td>
                      <td data-label="Source">
                        <span className="chip sm C">{source}</span>
                      </td>
                      <td data-label="Action" className="text-right">
                        <button
                          type="button"
                          className="b sm"
                          onClick={() => handleGenerateSingle(cand.id)}
                          disabled={isGenerating}
                          title={`Generate passport directly for ${cand.name}`}
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

      {/* Sticky Selection Bar (appears when rows are selected) */}
      {selectedIds.size > 0 && (
        <aside
          className="sticky-selection-bar"
          role="toolbar"
          aria-label="Bulk passport generation actions"
        >
          <div className="sticky-selection-wrap">
            <span className="sticky-selection-count">
              <strong>{selectedIds.size}</strong> candidate{selectedIds.size > 1 ? 's' : ''} selected
            </span>

            <div className="sticky-selection-actions">
              <button
                type="button"
                className="b sm"
                onClick={handleGenerateSelected}
                disabled={isGenerating}
              >
                {isGenerating
                  ? 'Generating passports...'
                  : `⚡ Generate Passports & Add to Leaderboard (${selectedIds.size})`}
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
                className="btn-text-subtle"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
export default NoPassportTab
