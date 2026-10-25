/**
 * LeaderboardStatesExplainer Component
 * A prominent, highly readable and clear guide to ProofPass skill verification states.
 * Explains Verified (V), Supported (S), Claimed (C), and Contradicted (X) with
 * high contrast, clear state badges, definitions, and trust ceilings.
 */

export default function LeaderboardStatesExplainer({ isOpen = true, onToggle }) {
  if (!isOpen) return null

  return (
    <div
      className="lb-states-explainer-card glass"
      role="region"
      aria-label="Skill verification credibility states explained"
    >
      <div className="lb-states-explainer-header">
        <div className="lb-states-explainer-title-group">
          <span className="k m text-accent">PROOFPASS CREDIBILITY MATRIX</span>
          <h3 className="section-title-sm mt-4">
            What do the Credibility States mean?
          </h3>
          <p className="text-muted-sm mt-4">
            Candidate claims are audited against real codebases, commit histories, and evaluations. Here is how to read each state:
          </p>
        </div>

        {onToggle && (
          <button
            type="button"
            className="b sm g"
            onClick={onToggle}
            aria-label="Toggle state explanation visibility"
          >
            Hide guide
          </button>
        )}
      </div>

      <div className="lb-states-grid">
        {/* Verified */}
        <div className="lb-state-card card-v">
          <div className="lb-state-card-top">
            <span className="chip V">Verified</span>
            <span className="lb-state-ceiling-tag ceiling-v">100% Uncapped</span>
          </div>
          <h4 className="lb-state-name">Proven by Code & Checks</h4>
          <p className="lb-state-text">
            Backed by verified source code contributions, commit authorship, and passed technical challenges.
          </p>
          <div className="lb-state-example">
            <strong>Evidence:</strong> Merged commits + verified challenge assessment.
          </div>
        </div>

        {/* Supported */}
        <div className="lb-state-card card-s">
          <div className="lb-state-card-top">
            <span className="chip S">Supported</span>
            <span className="lb-state-ceiling-tag ceiling-s">Up to 75%</span>
          </div>
          <h4 className="lb-state-name">External Evidence Found</h4>
          <p className="lb-state-text">
            Verifiable public links, documentation, or code repos exist, but pending deep commit analysis.
          </p>
          <div className="lb-state-example">
            <strong>Evidence:</strong> Referenced GitHub repo or public credential.
          </div>
        </div>

        {/* Claimed */}
        <div className="lb-state-card card-c">
          <div className="lb-state-card-top">
            <span className="chip C">Claimed</span>
            <span className="lb-state-ceiling-tag ceiling-c">Capped at 20%</span>
          </div>
          <h4 className="lb-state-name">Self-Reported on CV</h4>
          <p className="lb-state-text">
            Claimed only on the candidate resume. No external proof or public code attached; capped per trust ceilings.
          </p>
          <div className="lb-state-example">
            <strong>Evidence:</strong> Resume keyword claim without link.
          </div>
        </div>

        {/* Contradicted */}
        <div className="lb-state-card card-x">
          <div className="lb-state-card-top">
            <span className="chip X">Contradicted</span>
            <span className="lb-state-ceiling-tag ceiling-x">0% / Flagged</span>
          </div>
          <h4 className="lb-state-name">Audit Discrepancy Found</h4>
          <p className="lb-state-text">
            Audited repository evidence directly conflicts with or disproves the candidate's claim.
          </p>
          <div className="lb-state-example">
            <strong>Evidence:</strong> Zero authored commits in claimed repository.
          </div>
        </div>
      </div>
    </div>
  )
}
