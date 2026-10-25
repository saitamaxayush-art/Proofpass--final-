/**
 * RoleHeader Component
 * Clean, calm role header with breadcrumbs, role metadata, and primary action buttons.
 */

import { Link } from 'react-router-dom'

export default function RoleHeader({ role, onEditRequirements, onExportCsv }) {
  if (!role) return null

  const hasMeta = Boolean(
    (role.location && role.location.trim()) ||
    role.workMode ||
    (role.minExperienceYears !== undefined && role.minExperienceYears !== null)
  )

  return (
    <header className="role-header-wrap">
      <nav aria-label="Breadcrumbs" className="role-breadcrumb">
        <Link to="/recruiter">All roles</Link>
        <span className="role-breadcrumb-sep" aria-hidden="true">/</span>
        <span className="role-breadcrumb-company">{role.company || 'Company'}</span>
      </nav>

      <div className="role-header-main">
        <div className="role-header-left">
          <h1 className="role-title">{role.title}</h1>

          {hasMeta && (
            <div className="role-meta-line">
              {role.location && (
                <span className="role-meta-item">
                  <span>📍 {role.location}</span>
                </span>
              )}
              {role.location && (role.workMode || role.minExperienceYears != null) && (
                <span className="role-meta-dot" aria-hidden="true">·</span>
              )}
              {role.workMode && (
                <span className="role-meta-item">
                  <span>💼 {role.workMode}</span>
                </span>
              )}
              {role.workMode && role.minExperienceYears != null && (
                <span className="role-meta-dot" aria-hidden="true">·</span>
              )}
              {role.minExperienceYears != null && (
                <span className="role-meta-item">
                  <span>⏳ {role.minExperienceYears}+ years experience</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="role-header-actions">
          <button
            type="button"
            className="btn-ghost-text"
            onClick={onEditRequirements}
            aria-label="Edit role requirements"
          >
            Edit requirements
          </button>

          <button
            type="button"
            className="b sm g"
            onClick={onExportCsv}
            aria-label="Export visible leaderboard as CSV"
          >
            Export CSV
          </button>
        </div>
      </div>
    </header>
  )
}
