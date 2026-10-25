/**
 * RoleSummary Component
 * One row of four plain stat blocks separated by hairlines (no boxes, no glow).
 * 2x2 on tablet, stacked on mobile. Calm empty state if no candidates.
 */

export default function RoleSummary({
  applicantsWithPassport = [],
  applicantsNoPassport = [],
  rankedCandidates = [],
}) {
  const totalApplicants = applicantsWithPassport.length + applicantsNoPassport.length

  if (totalApplicants === 0 && rankedCandidates.length === 0) {
    return (
      <div className="role-summary-empty" role="region" aria-label="Role summary">
        No candidates evaluated yet for this role.
      </div>
    )
  }

  const avgMatch =
    rankedCandidates.length > 0
      ? Math.round(
          rankedCandidates.reduce((sum, c) => sum + (c.score || 0), 0) /
            rankedCandidates.length
        )
      : 0

  const topMatch =
    rankedCandidates.length > 0
      ? Math.max(...rankedCandidates.map((c) => c.score || 0))
      : 0

  const contradictedCount = rankedCandidates.filter(
    (c) => (c.contradictedCount || 0) > 0
  ).length

  return (
    <section className="role-summary-strip" aria-label="Role candidate statistics">
      <div className="role-summary-stat">
        <span className="role-stat-lbl">Applicants</span>
        <span className="role-stat-val">{totalApplicants}</span>
        <span className="role-stat-sub">
          {applicantsWithPassport.length} with passport · {applicantsNoPassport.length} resume only
        </span>
      </div>

      <div className="role-summary-stat">
        <span className="role-stat-lbl">Average match</span>
        <span className="role-stat-val">{avgMatch}%</span>
        <span className="role-stat-sub">Across {rankedCandidates.length} evaluated</span>
      </div>

      <div className="role-summary-stat">
        <span className="role-stat-lbl">Top match</span>
        <span className="role-stat-val">{topMatch}%</span>
        <span className="role-stat-sub">Highest scoring candidate</span>
      </div>

      <div className="role-summary-stat">
        <span className="role-stat-lbl">Candidates with contradicted skills</span>
        <span className="role-stat-val">{contradictedCount}</span>
        <span className="role-stat-sub">
          {contradictedCount === 0
            ? 'No conflicting claims detected'
            : `${contradictedCount} candidate${contradictedCount > 1 ? 's' : ''} flagged for review`}
        </span>
      </div>
    </section>
  )
}
