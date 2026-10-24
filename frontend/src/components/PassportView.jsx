/**
 * Public Read-Only Passport View Component
 * Accessible to applicants and recruiters with SHA-256 seal tamper detection,
 * detailed skill evidence audit trails, and revocation status handling.
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPassport, checkPassportTamper } from '../api/passports.js'
import { L, WEIGHTS } from '../data.js'

export default function PassportView() {
  const { passportId } = useParams()
  const [passport, setPassport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tamperResult, setTamperResult] = useState(null)
  const [isCheckingTamper, setIsCheckingTamper] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const found = await getPassport(passportId)
        if (mounted) {
          setPassport(found)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Passport not found.')
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [passportId])

  const handleTamperCheck = async () => {
    if (!passport) return
    setIsCheckingTamper(true)
    try {
      const res = await checkPassportTamper(passport.id)
      setTamperResult(res)
    } catch (err) {
      setTamperResult({ valid: false, message: `Check failed: ${err.message}` })
    } finally {
      setIsCheckingTamper(false)
    }
  }

  if (loading) {
    return (
      <main id="main" className="dash-page">
        <div className="w">
          <div className="login-notice">
            <span className="notice-dot" aria-hidden="true" />
            <span>Retrieving skill passport record...</span>
          </div>
        </div>
      </main>
    )
  }

  if (error || !passport) {
    return (
      <main id="main" className="dash-page">
        <div className="w">
          <div className="table-card glass" style={{ padding: '40px', textAlign: 'center' }}>
            <span className="k m" style={{ color: 'var(--st-x)' }}>RECORD NOT FOUND</span>
            <h1 style={{ fontSize: '1.4rem', color: 'var(--ink)', margin: '12px 0 8px' }}>
              Skill Passport Unavailable
            </h1>
            <p style={{ color: 'var(--muted)', maxWidth: '480px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
              The requested passport ID "{passportId}" does not exist in this browser storage or has been permanently removed.
            </p>
            <Link to="/" className="b sm">
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const skills = passport.skills || []
  const counts = {
    V: skills.filter((s) => s.state === 'V').length,
    S: skills.filter((s) => s.state === 'S').length,
    C: skills.filter((s) => s.state === 'C').length,
    X: skills.filter((s) => s.state === 'X').length,
    total: skills.length,
  }

  return (
    <main id="main" className="dash-page">
      <div className="w read-only-passport">
        {/* Revocation Warning */}
        {passport.revoked && (
          <div className="revoked-banner" role="alert">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <span>This passport was revoked by the candidate. Verified claims are preserved for historical audit only.</span>
          </div>
        )}

        {/* Passport Header Card */}
        <div className="table-card glass" style={{ padding: '28px' }}>
          <div className="passport-seal-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span className="k m" style={{ color: 'var(--accent)' }}>
                  VERIFIED CREDIBILITY RECORD
                </span>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)', margin: '6px 0 2px' }}>
                  {passport.candidate}
                </h1>
                <p style={{ color: 'var(--muted)', fontSize: '0.92rem', margin: 0 }}>
                  Target Role: <strong>{passport.targetRole}</strong> · Issued:{' '}
                  {new Date(passport.issuedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', color: 'var(--faint)', display: 'block' }}>
                  PASSPORT ID
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)' }}>
                  {passport.id}
                </span>
              </div>
            </div>

            {/* Cryptographic Hash & Tamper Button */}
            <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: '1 1 300px' }}>
                <span className="seal-hash-display" title={passport.hash}>
                  SHA-256: {passport.hash}
                </span>
              </div>

              <button
                type="button"
                className="b sm g"
                onClick={handleTamperCheck}
                disabled={isCheckingTamper}
              >
                {isCheckingTamper ? 'Verifying seal...' : 'Run tamper check'}
              </button>
            </div>

            {/* Tamper Check Result Toast */}
            {tamperResult && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: tamperResult.valid ? 'rgba(42, 117, 80, 0.1)' : 'rgba(179, 38, 30, 0.1)',
                  border: `1px solid ${tamperResult.valid ? 'var(--st-v)' : 'var(--st-x)'}`,
                  color: tamperResult.valid ? 'var(--st-v)' : 'var(--st-x)',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--mono)',
                }}
                role="status"
              >
                {tamperResult.valid ? '✓ ' : '✗ '}
                {tamperResult.message}
              </div>
            )}
          </div>

          {/* Role Match Explanation */}
          <div style={{ marginBottom: '24px' }}>
            <span className="k m">EVIDENCE-WEIGHTED STATE MIX</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '4px 0 10px' }}>
              Candidate claims audited against source code, commits, and credentials. Verified: {counts.V} · Supported: {counts.S} · Claimed: {counts.C} · Contradicted: {counts.X}.
            </p>
            <div className="state-mix-bar">
              <div className="mix-v" style={{ width: `${(counts.V / Math.max(1, counts.total)) * 100}%` }} title={`Verified: ${counts.V}`} />
              <div className="mix-s" style={{ width: `${(counts.S / Math.max(1, counts.total)) * 100}%` }} title={`Supported: ${counts.S}`} />
              <div className="mix-c" style={{ width: `${(counts.C / Math.max(1, counts.total)) * 100}%` }} title={`Claimed: ${counts.C}`} />
              <div className="mix-x" style={{ width: `${(counts.X / Math.max(1, counts.total)) * 100}%` }} title={`Contradicted: ${counts.X}`} />
            </div>
          </div>

          {/* Skill Proof List */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
              Skill Verification Ledger
            </h2>

            <div className="responsive-table-wrapper" data-lenis-prevent>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>State</th>
                    <th>Level</th>
                    <th>Audit Evidence & Commits</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((s) => (
                    <tr key={s.skill}>
                      <td data-label="Skill">
                        <strong>{s.skill}</strong>
                      </td>
                      <td data-label="State">
                        <span className={`chip ${s.state}`}>{L[s.state]}</span>
                      </td>
                      <td data-label="Level">
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--muted)' }}>
                          Level {s.level || 2}
                        </span>
                      </td>
                      <td data-label="Evidence">
                        <div style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>
                          {s.evidence}
                        </div>
                        {s.rationale && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: '4px' }}>
                            {s.rationale}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <Link to="/" className="b sm g">
              ← ProofPass Home
            </Link>
            <button type="button" className="b sm" onClick={() => window.print()}>
              Print verified passport
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
