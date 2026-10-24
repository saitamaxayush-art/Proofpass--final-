/**
 * Recruiter Dashboard Component
 * Displays role overview cards with candidate counts (with passport vs no passport),
 * and role creation modal.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listRoles, createRole } from '../api/roles.js'
import { listApplicantsForRole } from '../api/applicants.js'
import { matchSkillsFromText } from '../data/taxonomy.js'

export default function RecruiterDashboard() {
  const [roles, setRoles] = useState([])
  const [roleCounts, setRoleCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [notice, setNotice] = useState(null)

  // New Role Form State
  const [newTitle, setNewTitle] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCv, setNewCv] = useState('')
  const [newSkills, setNewSkills] = useState([
    { skill: 'React', importance: 'Must', weight: 3 },
    { skill: 'TypeScript', importance: 'Must', weight: 3 },
  ])
  const [addSkillInput, setAddSkillInput] = useState('')
  const [addSkillImportance, setAddSkillImportance] = useState('Must')
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load roles and applicant counts
  const fetchRolesData = async () => {
    try {
      const allRoles = await listRoles()
      setRoles(allRoles)

      const counts = {}
      for (const r of allRoles) {
        const { withPassport, noPassport } = await listApplicantsForRole(r.id)
        counts[r.id] = {
          withPassport: withPassport.length,
          noPassport: noPassport.length,
          total: withPassport.length + noPassport.length,
        }
      }
      setRoleCounts(counts)
      setLoading(false)
    } catch (err) {
      setNotice(`Failed to load roles: ${err.message}`)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRolesData()
  }, [])

  // Skill suggestion from description
  const handleSuggest = () => {
    if (!newDesc || newDesc.trim().length < 15) {
      setFormErrors((prev) => ({ ...prev, desc: 'Enter at least 15 characters of description first.' }))
      return
    }
    const matched = matchSkillsFromText(newDesc)
    const existing = new Set(newSkills.map((s) => s.skill.toLowerCase()))
    const toAdd = matched
      .filter((m) => !existing.has(m.name.toLowerCase()))
      .map((m) => ({ skill: m.name, importance: 'Must', weight: 3 }))

    if (toAdd.length > 0) {
      setNewSkills((prev) => [...prev, ...toAdd])
      setNotice(`Added ${toAdd.length} suggested skills from description.`)
    } else {
      setNotice('No new taxonomy skills detected in description.')
    }
  }

  const handleAddSkill = () => {
    if (!addSkillInput.trim()) return
    const name = addSkillInput.trim()
    if (newSkills.some((s) => s.skill.toLowerCase() === name.toLowerCase())) {
      setAddSkillInput('')
      return
    }
    const weight = addSkillImportance === 'Must' ? 3 : addSkillImportance === 'Should' ? 2 : 1
    setNewSkills((prev) => [...prev, { skill: name, importance: addSkillImportance, weight }])
    setAddSkillInput('')
  }

  const handleRemoveSkill = (skill) => {
    setNewSkills((prev) => prev.filter((s) => s.skill !== skill))
  }

  const handleCreateRole = async (e) => {
    e.preventDefault()
    setNotice(null)

    const errs = {}
    if (!newTitle.trim()) errs.title = 'Job title is required.'
    if (!newDesc.trim() || newDesc.trim().length < 40) {
      errs.desc = 'Description must be at least 40 characters.'
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }

    setFormErrors({})
    setIsSubmitting(true)

    try {
      const created = await createRole({
        title: newTitle.trim(),
        company: newCompany.trim() || 'My Company',
        description: newDesc.trim(),
        requiredSkills: newSkills,
        demoCv: newCv.trim(),
      })

      setShowAddRoleModal(false)
      setNewTitle('')
      setNewCompany('')
      setNewDesc('')
      setNewCv('')
      setNewSkills([
        { skill: 'React', importance: 'Must', weight: 3 },
        { skill: 'TypeScript', importance: 'Must', weight: 3 },
      ])
      setNotice(`Role "${created.title}" successfully created.`)
      await fetchRolesData()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main id="main" className="dash-page">
        <div className="w">
          <div className="login-notice">
            <span className="notice-dot" aria-hidden="true" />
            <span>Loading recruiter dashboard...</span>
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
          <span className="k m">RECRUITER WORKSPACE</span>
          <div className="dash-header-row">
            <div>
              <h1 className="dash-title">Hiring Role Openings</h1>
              <p className="dash-subtitle">
                Inspect applicant pass rates, evidence-backed leaderboard rankings, and verify unverified resumes.
              </p>
            </div>
            <div>
              <button
                type="button"
                className="b sm"
                onClick={() => setShowAddRoleModal(true)}
              >
                + Add new role
              </button>
            </div>
          </div>
        </div>

        {notice && (
          <div className="login-notice" style={{ marginBottom: '20px' }} role="status">
            <span className="notice-dot" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {/* Roles Grid */}
        <div className="cards-grid">
          {roles.map((role) => {
            const counts = roleCounts[role.id] || { withPassport: 0, noPassport: 0, total: 0 }
            return (
              <div key={role.id} className="role-match-card">
                <div>
                  <div className="role-card-head">
                    <div>
                      <h2 className="role-card-title">{role.title}</h2>
                      <p className="role-card-company">{role.company}</p>
                    </div>
                    {role.isSample && (
                      <span className="chip S sm" style={{ fontSize: '0.68rem' }}>
                        Sample role
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '10px 0 16px', lineHeight: '1.45' }}>
                    {role.description.length > 140
                      ? `${role.description.slice(0, 140)}...`
                      : role.description}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--line-soft)' }}>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--faint)', display: 'block' }}>
                        WITH PASSPORT
                      </span>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--st-v)' }}>
                        {counts.withPassport}
                      </strong>
                    </div>

                    <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--line-soft)' }}>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--faint)', display: 'block' }}>
                        RESUME ONLY
                      </span>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--st-c)' }}>
                        {counts.noPassport}
                      </strong>
                    </div>
                  </div>

                  <div className="role-card-skills">
                    {(role.requiredSkills || []).map((req) => (
                      <span key={req.skill} className="removable-tag" style={{ fontSize: '0.72rem' }}>
                        {req.skill} <span style={{ color: 'var(--faint)' }}>({req.importance})</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: '14px', marginTop: '12px' }}>
                  <Link to={`/recruiter/role/${role.id}`} className="b sm" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                    Open candidate leaderboard →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add Role Modal */}
        {showAddRoleModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={() => setShowAddRoleModal(false)}
          >
            <div
              className="table-card glass"
              style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px', margin: 0 }}
              onClick={(e) => e.stopPropagation()}
              data-lenis-prevent
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                  Create Job Role
                </h2>
                <button
                  type="button"
                  className="b sm g"
                  onClick={() => setShowAddRoleModal(false)}
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleCreateRole}>
                <div className="form-group">
                  <label className="form-label">Role Title</label>
                  <input
                    type="text"
                    className={`form-input ${formErrors.title ? 'input-error' : ''}`}
                    placeholder="e.g. Senior Backend Python Engineer"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                  {formErrors.title && <span className="field-error-msg">{formErrors.title}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Veloce Systems"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Requirement Description (min 40 chars)</label>
                    <button
                      type="button"
                      className="b sm g"
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                      onClick={handleSuggest}
                    >
                      Suggest skills from text
                    </button>
                  </div>
                  <textarea
                    rows="3"
                    className={`form-input ${formErrors.desc ? 'input-error' : ''}`}
                    placeholder="Describe core technical requirements and architecture expectations..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    required
                  />
                  {formErrors.desc && <span className="field-error-msg">{formErrors.desc}</span>}
                </div>

                {/* Skills configuration */}
                <div className="form-group">
                  <label className="form-label">Weighted Required Skills</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input sm"
                      placeholder="Add skill"
                      value={addSkillInput}
                      onChange={(e) => setAddSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddSkill()
                        }
                      }}
                    />
                    <select
                      className="form-input sm"
                      style={{ width: '110px' }}
                      value={addSkillImportance}
                      onChange={(e) => setAddSkillImportance(e.target.value)}
                    >
                      <option value="Must">Must (3x)</option>
                      <option value="Should">Should (2x)</option>
                      <option value="Nice">Nice (1x)</option>
                    </select>
                    <button type="button" className="b sm g" onClick={handleAddSkill}>
                      Add
                    </button>
                  </div>

                  <div className="tag-cloud">
                    {newSkills.map((req) => (
                      <span key={req.skill} className="removable-tag">
                        <strong>{req.skill}</strong> ({req.importance})
                        <button type="button" onClick={() => handleRemoveSkill(req.skill)}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Demo Candidate CV text <span style={{ color: 'var(--faint)' }}>(optional)</span></label>
                  <textarea
                    rows="2"
                    className="form-input sm"
                    placeholder="Paste sample resume text for testing..."
                    value={newCv}
                    onChange={(e) => setNewCv(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="b sm g" onClick={() => setShowAddRoleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="b sm" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Save role opening'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
