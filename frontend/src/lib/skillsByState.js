/**
 * Pure function: Skills By State Categorizer
 * Groups a candidate's evaluated passport skills by state (V, S, C, X),
 * cross-referencing with role requirements and extracting evidence metadata.
 *
 * @param {Object} passport - Candidate cryptographic skill passport
 * @param {Object} role - Recruiter role with requiredSkills
 * @returns {{ V: Array, S: Array, C: Array, X: Array }}
 */
export function getSkillsByState(passport, role) {
  const result = { V: [], S: [], C: [], X: [] }
  if (!passport || !Array.isArray(passport.skills)) {
    return result
  }

  const roleReqMap = new Map()
  if (role && Array.isArray(role.requiredSkills)) {
    role.requiredSkills.forEach((req) => {
      if (req && req.skill) {
        roleReqMap.set(req.skill.toLowerCase().trim(), req)
      }
    })
  }

  passport.skills.forEach((s) => {
    const rawState = s.state
    if (!result[rawState]) return

    const rawName = s.skill || s.name || ''
    const normKey = rawName.toLowerCase().trim()
    const req = roleReqMap.get(normKey)

    // Deterministic slug-based skillId for passport anchors
    const skillId = s.id || normKey.replace(/[^a-z0-9]+/g, '-')

    // Importance: 'Must' | 'Should' | 'Nice' or null
    const importance = req && req.importance ? req.importance : null

    // Sources list: GitHub, LeetCode, Certificate, Resume, Assessment
    const sourcesSet = new Set()
    if (Array.isArray(s.sources)) {
      s.sources.forEach((src) => {
        if (typeof src === 'string') {
          const lower = src.toLowerCase()
          if (lower.includes('github') || lower.includes('git')) sourcesSet.add('GitHub')
          else if (lower.includes('leetcode')) sourcesSet.add('LeetCode')
          else if (lower.includes('cert')) sourcesSet.add('Certificate')
          else if (lower.includes('resume') || lower.includes('cv')) sourcesSet.add('Resume')
          else if (lower.includes('assess') || lower.includes('micro')) sourcesSet.add('Assessment')
        }
      })
    }

    const evText = `${s.evidence || ''} ${s.why || ''} ${s.rationale || ''}`.toLowerCase()
    if (
      evText.includes('github') ||
      evText.includes('commit') ||
      evText.includes('.ts') ||
      evText.includes('.js') ||
      evText.includes('.py') ||
      evText.includes('dockerfile') ||
      evText.includes('sql') ||
      evText.includes('repo')
    ) {
      sourcesSet.add('GitHub')
    }
    if (evText.includes('leetcode')) sourcesSet.add('LeetCode')
    if (evText.includes('certificate') || evText.includes('cert')) sourcesSet.add('Certificate')
    if (evText.includes('resume') || evText.includes('cv') || s.state === 'C') sourcesSet.add('Resume')
    if (evText.includes('assessment') || evText.includes('micro-check')) sourcesSet.add('Assessment')

    // Confidence: highest evidence confidence value if evidenceDetails exists, otherwise undefined
    let confidence = undefined
    if (typeof s.confidence === 'number') {
      confidence = s.confidence
    } else if (Array.isArray(s.evidenceDetails) && s.evidenceDetails.length > 0) {
      const confs = s.evidenceDetails
        .map((e) => (e && typeof e.confidence === 'number' ? e.confidence : null))
        .filter((c) => c !== null)
      if (confs.length > 0) {
        confidence = Math.max(...confs)
      }
    }

    // Reason: stored rationale or flag reason for Contradicted and Claimed skills
    let reason = undefined
    if (s.state === 'X' || s.state === 'C') {
      const stored = s.flagReason || s.rationale || s.why || s.reason
      if (stored && typeof stored === 'string') {
        reason = stored
      }
    }

    result[rawState].push({
      skillId,
      name: rawName,
      level: typeof s.level === 'number' ? s.level : undefined,
      state: rawState,
      importance,
      sources: Array.from(sourcesSet),
      confidence,
      reason,
      passportAnchor: `skill-${skillId}`,
    })
  })

  return result
}
