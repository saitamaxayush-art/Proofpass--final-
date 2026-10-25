/**
 * RequirementsTab.jsx
 * Tab 3: Requirements & Scoring Configuration with Demo CV.
 * Two-column layout:
 * - Left: Requirements form (Title, Company, Location, Workplace model, Min experience,
 *         Description, Skills with Must/Should/Nice control, Job description importer)
 * - Right: Demo CV viewer & editor
 * Sticky bottom save bar with "Unsaved changes" indicator, Save and Discard.
 */

import { useState, useEffect, useMemo } from 'react'
import JobDescriptionImport from '../JobDescriptionImport.jsx'

export function RequirementsTab({
  role,
  onSaveRole,
  isSaving,
  setNotice,
}) {
  const [editTitle, setEditTitle] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editWorkMode, setEditWorkMode] = useState('')
  const [editMinYears, setEditMinYears] = useState('')
  const [editSkills, setEditSkills] = useState([])
  const [editCv, setEditCv] = useState('')

  // Add skill inputs
  const [newSkillText, setNewSkillText] = useState('')
  const [newSkillImportance, setNewSkillImportance] = useState('Must')

  // Sync initial values from role
  useEffect(() => {
    if (role) {
      setEditTitle(role.title || '')
      setEditCompany(role.company || '')
      setEditDesc(role.description || '')
      setEditLocation(role.location || '')
      setEditWorkMode(role.workMode || '')
      setEditMinYears(role.minExperienceYears != null ? String(role.minExperienceYears) : '')
      setEditSkills(role.requiredSkills || [])
      setEditCv(role.demoCv || '')
    }
  }, [role])

  // Detect unsaved changes compared to loaded role
  const hasUnsavedChanges = useMemo(() => {
    if (!role) return false
    if ((editTitle || '').trim() !== (role.title || '').trim()) return true
    if ((editCompany || '').trim() !== (role.company || '').trim()) return true
    if ((editDesc || '').trim() !== (role.description || '').trim()) return true
    if ((editLocation || '').trim() !== (role.location || '').trim()) return true
    if ((editWorkMode || '').trim() !== (role.workMode || '').trim()) return true
    const origMin = role.minExperienceYears != null ? String(role.minExperienceYears) : ''
    if ((editMinYears || '').trim() !== origMin.trim()) return true
    if ((editCv || '').trim() !== (role.demoCv || '').trim()) return true
    if (JSON.stringify(editSkills) !== JSON.stringify(role.requiredSkills || [])) return true
    return false
  }, [role, editTitle, editCompany, editDesc, editLocation, editWorkMode, editMinYears, editCv, editSkills])

  // Discard changes
  const handleDiscard = () => {
    if (!role) return
    setEditTitle(role.title || '')
    setEditCompany(role.company || '')
    setEditDesc(role.description || '')
    setEditLocation(role.location || '')
    setEditWorkMode(role.workMode || '')
    setEditMinYears(role.minExperienceYears != null ? String(role.minExperienceYears) : '')
    setEditSkills(role.requiredSkills || [])
    setEditCv(role.demoCv || '')
    if (setNotice) setNotice('Discarded unsaved changes.')
  }

  // Save changes
  const handleSave = async (e) => {
    if (e) e.preventDefault()
    if (!editTitle.trim()) {
      if (setNotice) setNotice('Role title is required.')
      return
    }

    const payload = {
      title: editTitle.trim(),
      company: editCompany.trim(),
      description: editDesc.trim(),
      requiredSkills: editSkills,
      demoCv: editCv.trim(),
      location: editLocation ? editLocation.trim() : null,
      workMode: editWorkMode || null,
      minExperienceYears: editMinYears ? Number(editMinYears) : null,
    }

    if (onSaveRole) {
      await onSaveRole(payload)
    }
  }

  // Skills handlers
  const handleAddSkill = () => {
    const trimmed = newSkillText.trim()
    if (!trimmed) return
    if (editSkills.some((s) => s.skill.toLowerCase() === trimmed.toLowerCase())) {
      if (setNotice) setNotice(`"${trimmed}" is already in required skills.`)
      return
    }

    const weight = newSkillImportance === 'Must' ? 3 : newSkillImportance === 'Should' ? 2 : 1
    setEditSkills((prev) => [...prev, { skill: trimmed, importance: newSkillImportance, weight }])
    setNewSkillText('')
  }

  const handleRemoveSkill = (skillName) => {
    setEditSkills((prev) => prev.filter((s) => s.skill !== skillName))
  }

  const handleUpdateSkillImportance = (skillName, newImportance) => {
    const weight = newImportance === 'Must' ? 3 : newImportance === 'Should' ? 2 : 1
    setEditSkills((prev) =>
      prev.map((s) => (s.skill === skillName ? { ...s, importance: newImportance, weight } : s))
    )
  }

  const handleApplyJd = (applied) => {
    if (applied.title) setEditTitle(applied.title)
    if (applied.description) setEditDesc(applied.description)
    if (applied.requiredSkills) setEditSkills(applied.requiredSkills)
    if (applied.location) setEditLocation(applied.location)
    if (applied.workMode) setEditWorkMode(applied.workMode)
    if (applied.minExperienceYears != null) setEditMinYears(String(applied.minExperienceYears))
    if (setNotice) {
      setNotice('Imported criteria from job description. Review and click "Save changes" to commit.')
    }
  }

  return (
    <div
      id="role-tabpanel-requirements"
      role="tabpanel"
      aria-labelledby="role-tab-requirements"
      className="table-card glass card-pad-24"
    >
      <div className="table-head-row-between mb-20">
        <div>
          <h2 className="section-title-sm">
            Role Criteria & Scoring Configuration
          </h2>
          <p className="text-muted-sm mt-4">
            Configure required technical competencies, importance weights (Must: 3x, Should: 2x, Nice: 1x), and reference CV.
          </p>
        </div>
        {(role?.location || role?.workMode || role?.minExperienceYears != null) && (
          <div className="flex-gap6">
            {role.location && (
              <span className="chip sm">📍 {role.location}</span>
            )}
            {role.workMode && (
              <span className="chip sm S">💼 {role.workMode}</span>
            )}
            {role.minExperienceYears != null && (
              <span className="chip sm">⏳ {role.minExperienceYears}+ yrs</span>
            )}
          </div>
        )}
      </div>

      {/* Two-Column Layout */}
      <div className="requirements-two-col">
        {/* Left Column: Requirements Form */}
        <div className="requirements-col-left">
          {/* Job Description Importer */}
          <JobDescriptionImport
            currentValues={{
              title: editTitle,
              description: editDesc,
              requiredSkills: editSkills,
              location: editLocation,
              workMode: editWorkMode,
              minExperienceYears: editMinYears ? Number(editMinYears) : null,
            }}
            onApply={handleApplyJd}
          />

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label" htmlFor="req-role-title">Role Title</label>
              <input
                id="req-role-title"
                type="text"
                className="form-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-company-name">Company Name</label>
              <input
                id="req-company-name"
                type="text"
                className="form-input"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
              />
            </div>

            <div className="gap-form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="req-location">Location (optional)</label>
                <input
                  id="req-location"
                  type="text"
                  className="form-input"
                  placeholder="e.g. London, UK"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="req-work-mode">Workplace Model (optional)</label>
                <select
                  id="req-work-mode"
                  className="form-input"
                  value={editWorkMode}
                  onChange={(e) => setEditWorkMode(e.target.value)}
                >
                  <option value="">None specified</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-min-years">Min Experience (Years, optional)</label>
              <input
                id="req-min-years"
                type="number"
                min="0"
                max="30"
                className="form-input"
                placeholder="e.g. 4"
                value={editMinYears}
                onChange={(e) => setEditMinYears(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-job-desc">Job Requirement Description</label>
              <textarea
                id="req-job-desc"
                rows="4"
                className="form-input"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                required
              />
            </div>

            {/* Weighted skills configuration */}
            <div className="form-group">
              <label className="form-label">Weighted Skills Configuration</label>
              <div className="add-skill-row mb-16">
                <input
                  type="text"
                  className="form-input sm"
                  placeholder="Add competency"
                  value={newSkillText}
                  onChange={(e) => setNewSkillText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSkill()
                    }
                  }}
                  aria-label="New competency name"
                />
                <select
                  className="form-input sm w-select-importance"
                  value={newSkillImportance}
                  onChange={(e) => setNewSkillImportance(e.target.value)}
                  aria-label="Importance tier"
                >
                  <option value="Must">Must (3x)</option>
                  <option value="Should">Should (2x)</option>
                  <option value="Nice">Nice (1x)</option>
                </select>
                <button type="button" className="b sm g" onClick={handleAddSkill}>
                  Add skill
                </button>
              </div>

              <div className="tag-cloud">
                {editSkills.map((req) => (
                  <span key={req.skill} className="removable-tag">
                    <strong>{req.skill}</strong>
                    <select
                      className="form-input sm"
                      value={req.importance}
                      onChange={(e) => handleUpdateSkillImportance(req.skill, e.target.value)}
                      aria-label={`${req.skill} importance`}
                    >
                      <option value="Must">Must (3x)</option>
                      <option value="Should">Should (2x)</option>
                      <option value="Nice">Nice (1x)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(req.skill)}
                      aria-label={`Remove ${req.skill}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Demo CV Viewer */}
        <div className="requirements-col-right">
          <div className="demo-cv-card">
            <div className="table-head-row-between mb-12">
              <div>
                <strong className="role-stat-lbl">Demo Candidate CV Reference</strong>
                <p className="text-muted-sm mt-4">
                  Reference resume used to benchmark candidate skill matching and test parsing.
                </p>
              </div>
            </div>
            <textarea
              className="form-input demo-cv-textarea"
              placeholder="Paste demo resume text to test candidate mapping..."
              value={editCv}
              onChange={(e) => setEditCv(e.target.value)}
              aria-label="Demo Candidate CV Reference text"
            />
          </div>
        </div>
      </div>

      {/* Sticky Save Bar */}
      {hasUnsavedChanges && (
        <div className="sticky-save-bar" role="region" aria-label="Unsaved changes toolbar">
          <div className="unsaved-indicator">
            <span className="unsaved-dot" aria-hidden="true" />
            <span>Unsaved changes</span>
          </div>

          <div className="save-bar-actions">
            <button
              type="button"
              className="b sm g"
              onClick={handleDiscard}
              disabled={isSaving}
            >
              Discard
            </button>
            <button
              type="button"
              className="b sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving changes...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
