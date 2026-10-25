/**
 * Evidence Confidence Scoring Module
 * Computes deterministic credibility and confidence meters based on source trust ceilings,
 * git blame line share, and engine credibility signals.
 */

const SOURCE_CEILINGS = {
  resume: 20,
  cv: 20,
  certificate: 60,
  leetcode: 60,
  assessment: 40,
  microcheck: 40,
  github: 80,
  git: 80,
  repo: 80,
}

/**
 * Computes confidence score, categorical label, and contributing factors.
 *
 * @param {Object} options
 * @param {string} [options.source='resume'] - Evidence origin ('github' | 'certificate' | 'leetcode' | 'assessment' | 'resume')
 * @param {number} [options.credibility] - Direct engine credibility float (0.0 - 1.0)
 * @param {number} [options.lineShare] - Author blame percentage (0 - 100)
 * @returns {{ value: number, label: 'Low' | 'Medium' | 'High', factors: Array<{ label: string, value: string }> }}
 */
export function getConfidence(options = {}) {
  const { source, credibility, lineShare } = options
  const hasSource = typeof source === 'string' && source.trim().length > 0
  const normSource = hasSource ? source.toLowerCase().trim() : ''

  let value = 0
  const factors = []

  if (typeof credibility === 'number' && !isNaN(credibility)) {
    const credFloat = credibility > 1 ? credibility / 100 : credibility
    value = Math.round(credFloat * 100)
    factors.push({ label: 'Engine credibility score', value: `${value}%` })
    if (hasSource) {
      factors.push({ label: 'Evidence source', value: String(source) })
    }
    if (typeof lineShare === 'number' && !isNaN(lineShare)) {
      const sharePct = Math.round(lineShare > 1 ? lineShare : lineShare * 100)
      factors.push({ label: 'Author line share', value: `${sharePct}%` })
    }
  } else {
    const resolvedSource = normSource || 'resume'
    const ceiling = SOURCE_CEILINGS[resolvedSource] != null ? SOURCE_CEILINGS[resolvedSource] : 20
    factors.push({ label: 'Source trust ceiling', value: `${ceiling}% (${resolvedSource})` })

    if (typeof lineShare === 'number' && !isNaN(lineShare)) {
      const shareFactor = lineShare > 1 ? lineShare / 100 : Math.max(0, lineShare)
      value = Math.round(ceiling * shareFactor)
      factors.push({ label: 'Author line share', value: `${Math.round(shareFactor * 100)}%` })
    } else {
      value = ceiling
    }
  }

  // A resume source never exceeds 20
  if (normSource === 'resume' || normSource === 'cv' || (!hasSource && (typeof credibility !== 'number' || isNaN(credibility)))) {
    value = Math.min(value, 20)
  }

  value = Math.max(0, Math.min(100, value))

  let label = 'Low'
  if (value >= 70) {
    label = 'High'
  } else if (value >= 40) {
    label = 'Medium'
  }

  return {
    value,
    label,
    factors,
  }
}

/**
 * Formats a confidence number into a display string e.g. "72% High"
 * @param {number|null|undefined} value
 * @returns {string|null}
 */
export function formatConfidence(value) {
  if (value == null || isNaN(value)) return null
  const num = value <= 1 && value > 0 ? Math.round(value * 100) : Math.round(value)
  const label = num >= 70 ? 'High' : num >= 40 ? 'Medium' : 'Low'
  return `${num}% ${label}`
}

/**
 * Returns row-level confidence details for a skill object.
 *
 * @param {Object} skill - Skill object { skill, state, evidence, evidenceDetails, confidence }
 * @param {boolean} [passportHasEvidenceDetails=true] - Whether the parent passport has evidenceDetails
 * @returns {{ value: number|null, label: string|null, text: string } | null}
 */
export function getSkillConfidence(skill, passportHasEvidenceDetails = true) {
  if (!skill) return null

  // 1. If skill has evidenceDetails array
  if (Array.isArray(skill.evidenceDetails)) {
    if (skill.evidenceDetails.length === 0) {
      return { value: null, label: null, text: 'No evidence' }
    }

    const confVals = skill.evidenceDetails
      .map((e) => {
        if (!e) return null
        if (typeof e.confidence === 'number') return e.confidence
        if (e.confidence && typeof e.confidence.value === 'number') return e.confidence.value
        return null
      })
      .filter((v) => v !== null && !isNaN(v))

    if (confVals.length === 0) {
      return { value: null, label: null, text: 'No evidence' }
    }

    let maxVal = Math.max(...confVals)
    // Resume-only claim never exceeds 20
    const allResume = skill.evidenceDetails.every(
      (e) => e && (e.source === 'resume' || e.excerptSource === 'resume')
    )
    if (skill.state === 'C' || allResume) {
      maxVal = Math.min(maxVal, 20)
    }

    const label = maxVal >= 70 ? 'High' : maxVal >= 40 ? 'Medium' : 'Low'
    return {
      value: maxVal,
      label,
      text: `${maxVal}% ${label}`,
    }
  }

  // 2. Direct skill.confidence fallback when present
  if (typeof skill.confidence === 'number' && !isNaN(skill.confidence)) {
    let num =
      skill.confidence <= 1 && skill.confidence > 0
        ? Math.round(skill.confidence * 100)
        : Math.round(skill.confidence)
    if (skill.state === 'C') {
      num = Math.min(num, 20)
    }
    const label = num >= 70 ? 'High' : num >= 40 ? 'Medium' : 'Low'
    return {
      value: num,
      label,
      text: `${num}% ${label}`,
    }
  }

  // 3. Old passport without evidenceDetails: render nothing
  if (!passportHasEvidenceDetails) {
    return null
  }

  // If passport has evidenceDetails overall, but this skill has no evidence attached
  if (
    skill.state === 'C' &&
    (!skill.evidence ||
      skill.evidence.toLowerCase().includes('no matching') ||
      skill.evidence.toLowerCase().includes('none') ||
      skill.evidence.toLowerCase().includes('claim only'))
  ) {
    return { value: null, label: null, text: 'No evidence' }
  }

  return null
}
