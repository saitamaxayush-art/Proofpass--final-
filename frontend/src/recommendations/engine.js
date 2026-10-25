/**
 * Deterministic Recommendation Engine
 * Pure logic module driven by candidate skill passport and target role requirements.
 * No UI code inside.
 */

import catalogData from './catalog.json' with { type: 'json' }
import { IMOCHA_URL, ENABLE_IMOCHA_ASSESSMENT } from './config.js'
import { normalizeSkill, isKnownSkill } from './normalize.js'
import { getProjectIdea } from './projectIdeas.js'
import { SAMPLE_ROLES } from '../data/seed.js'
import { ROLE_REQUIREMENTS_DICTIONARY, STATE_WEIGHTS } from '../engine/step7_role_match.js'

/**
 * Standard weight multiplier per state.
 */
export const STATE_NUMERIC_WEIGHTS = {
  V: 1.0,
  S: 0.6,
  C: 0.2,
  X: 0.0,
  U: 0.0,
}

/**
 * Normalize state identifier to single char: 'V' | 'S' | 'C' | 'X' | 'U'.
 */
export function normalizeState(rawState) {
  if (!rawState) return 'C'
  const s = String(rawState).trim().toUpperCase()
  if (s === 'VERIFIED' || s === 'V') return 'V'
  if (s === 'SUPPORTED' || s === 'S') return 'S'
  if (s === 'CLAIMED' || s === 'C') return 'C'
  if (s === 'CONTRADICTED' || s === 'X') return 'X'
  if (s === 'MISSING' || s === 'ABSENT' || s === 'U') return 'U'
  return 'C'
}

/**
 * Retrieve required skills and weights for a given target role.
 *
 * @param {string} targetRoleName
 * @returns {Array<{ skill: string, weight: number, importance: string }>}
 */
export function getRoleRequirements(targetRoleName = '') {
  const clean = (targetRoleName || '').trim()
  if (!clean) {
    return [
      { skill: 'React', weight: 3, importance: 'Must' },
      { skill: 'TypeScript', weight: 3, importance: 'Must' },
      { skill: 'REST APIs', weight: 2, importance: 'Should' },
      { skill: 'Testing', weight: 2, importance: 'Should' },
      { skill: 'Git workflow', weight: 2, importance: 'Should' },
    ]
  }

  // Check SAMPLE_ROLES
  const roleFromSeed = SAMPLE_ROLES.find(
    (r) =>
      r.title.toLowerCase() === clean.toLowerCase() ||
      r.id.toLowerCase() === clean.toLowerCase() ||
      clean.toLowerCase().includes(r.title.toLowerCase())
  )
  if (roleFromSeed?.requiredSkills?.length) {
    return roleFromSeed.requiredSkills.map((req) => ({
      skill: normalizeSkill(req.skill),
      weight: req.weight || (req.importance === 'Must' ? 3 : req.importance === 'Should' ? 2 : 1),
      importance: req.importance || 'Should',
    }))
  }

  // Check ROLE_REQUIREMENTS_DICTIONARY
  for (const [key, reqs] of Object.entries(ROLE_REQUIREMENTS_DICTIONARY)) {
    if (
      key.toLowerCase() === clean.toLowerCase() ||
      clean.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(clean.toLowerCase())
    ) {
      return reqs.map((req) => ({
        skill: normalizeSkill(req.skill),
        weight: req.importance || 2,
        importance: req.importance === 3 ? 'Must' : req.importance === 2 ? 'Should' : 'Nice',
      }))
    }
  }

  // Default fallback requirements
  return [
    { skill: 'Git workflow', weight: 2, importance: 'Should' },
    { skill: 'Testing', weight: 2, importance: 'Should' },
    { skill: 'REST APIs', weight: 2, importance: 'Should' },
    { skill: 'System design', weight: 2, importance: 'Should' },
  ]
}

/**
 * Retrieve catalog resources for a canonical skill.
 * Unknown skills receive no resources (never wrong ones).
 *
 * @param {string} canonicalSkill
 * @returns {Array<Object>}
 */
export function getCatalogResources(canonicalSkill) {
  if (!canonicalSkill || !isKnownSkill(canonicalSkill)) {
    return []
  }

  const rawResources = catalogData[canonicalSkill] || []
  const resources = [...rawResources]

  if (ENABLE_IMOCHA_ASSESSMENT && IMOCHA_URL) {
    resources.unshift({
      title: `${canonicalSkill} Skill Assessment`,
      provider: 'iMocha',
      url: IMOCHA_URL,
      type: 'practice',
      cost: 'free',
    })
  }

  return resources
}

/**
 * Calculate role match score given role requirements and candidate skill states.
 * Real, deterministic role-matcher calculation.
 *
 * @param {Array<{ skill: string, weight: number }>} requirements
 * @param {Map<string, string>} candidateSkillStates - normalized skill -> state
 * @returns {number} 0 to 100 percentage
 */
export function computeRoleScore(requirements, candidateSkillStates) {
  if (!requirements?.length) return 0
  let totalWeight = 0
  let earned = 0

  requirements.forEach((req) => {
    const w = req.weight || 1
    totalWeight += w * 100
    const state = candidateSkillStates.get(normalizeSkill(req.skill)) || 'U'
    const stateMult = STATE_NUMERIC_WEIGHTS[state] ?? 0
    earned += w * (stateMult * 100)
  })

  return totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0
}

/**
 * Compute estimated match change from moving a skill to its next verifiable state.
 * Returns string e.g. "+12%" or undefined if no increase.
 * Never invents numbers.
 *
 * @param {Array<Object>} requirements
 * @param {Map<string, string>} candidateSkillStates
 * @param {string} skill
 * @param {string} nextState
 * @returns {string|undefined}
 */
export function computeEstimatedMatchChange(requirements, candidateSkillStates, skill, nextState) {
  const currentScore = computeRoleScore(requirements, candidateSkillStates)
  const hypothetical = new Map(candidateSkillStates)
  hypothetical.set(normalizeSkill(skill), nextState)
  const hypotheticalScore = computeRoleScore(requirements, hypothetical)

  const diff = hypotheticalScore - currentScore
  if (diff > 0) {
    return `+${diff}%`
  }
  return undefined
}

/**
 * Classify a skill into a recommendation item based on its state and presence.
 *
 * @param {Object} params
 * @param {string} params.skill - Canonical skill name
 * @param {string} params.state - 'V' | 'S' | 'C' | 'X' | 'U'
 * @param {number} params.roleWeight - Weight of skill in target role
 * @param {Object} [params.passportSkill] - Raw skill object from passport if present
 * @param {string} [params.passportId] - Passport ID for internal links
 * @param {string} [params.targetRole] - Target role title
 * @param {Array<Object>} params.requirements - Role requirements list
 * @param {Map<string, string>} params.candidateSkillStates - Current state map
 * @returns {Object|null} Recommendation item or null if Verified
 */
export function classifySkill({
  skill,
  state,
  roleWeight,
  passportSkill,
  passportId = '',
  targetRole = 'Software Engineer',
  requirements = [],
  candidateSkillStates = new Map(),
}) {
  const normState = normalizeState(state)

  // 1. Verified: No task. Classified under Strengths only.
  if (normState === 'V') {
    return null
  }

  const canon = normalizeSkill(skill)
  const isKnown = isKnownSkill(canon)
  const resources = getCatalogResources(canon)
  const projectIdea = getProjectIdea(canon)

  // 2. Required for target role but absent: type "learn"
  if (normState === 'U') {
    const nextState = 'S' // Building verified repo moves to Supported
    const gain = (STATE_NUMERIC_WEIGHTS[nextState] - STATE_NUMERIC_WEIGHTS.U) // 0.6
    const rankScore = roleWeight * gain
    const estimatedMatchChange = computeEstimatedMatchChange(
      requirements,
      candidateSkillStates,
      canon,
      nextState
    )

    const primaryResource = resources[0] || null
    const targetUrl = primaryResource?.url || (isKnown ? 'https://docs.github.com' : '#')
    const actionLabel = primaryResource
      ? `Open ${primaryResource.provider} docs ↗`
      : 'Build GitHub project'

    return {
      id: `rec-learn-${canon.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      type: 'learn',
      skill: canon,
      state: 'U',
      title: `Learn ${canon} & Build Project`,
      why: `Required for ${targetRole} but absent from your passport.`,
      target: targetUrl,
      targetType: 'external',
      effort: 'high',
      roleWeight,
      rankScore,
      priority: 0,
      estimatedMatchChange,
      resources,
      projectIdea:
        projectIdea ||
        `Create a public GitHub repository demonstrating a tested implementation of ${canon}.`,
      actionLabel,
      actionNote: 'Opens in a new tab',
    }
  }

  // 3. Contradicted: type "fix"
  if (normState === 'X') {
    const nextState = 'S' // Replacing tutorial fork with original code lifts to Supported
    const gain = (STATE_NUMERIC_WEIGHTS[nextState] - STATE_NUMERIC_WEIGHTS.X) // 0.6
    const rankScore = roleWeight * gain
    const estimatedMatchChange = computeEstimatedMatchChange(
      requirements,
      candidateSkillStates,
      canon,
      nextState
    )

    const conflictDetail =
      passportSkill?.evidence ||
      passportSkill?.rationale ||
      'Forked tutorial or unoriginal commit history was detected in linked repository.'

    const targetUrl = passportId
      ? `/passport/${encodeURIComponent(passportId)}#skill-${encodeURIComponent(canon)}`
      : `/verify?step=4&skill=${encodeURIComponent(canon)}`

    return {
      id: `rec-fix-${canon.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      type: 'fix',
      skill: canon,
      state: 'X',
      title: `Resolve conflict in ${canon}`,
      why: `Evidence conflicts with claim: ${conflictDetail}`,
      target: targetUrl,
      targetType: 'internal',
      effort: 'medium',
      roleWeight,
      rankScore,
      priority: 0,
      estimatedMatchChange,
      resources,
      projectIdea,
      resolutionGuide: 'Correct resume claim or replace forked tutorial with original repository commits.',
      actionLabel: 'Inspect conflict trace',
      actionNote: 'View evidence chain in passport',
    }
  }

  // 4. Supported: type "add evidence" (micro-check quiz)
  if (normState === 'S') {
    const nextState = 'V' // Passing micro-check upgrades to Verified
    const gain = (STATE_NUMERIC_WEIGHTS[nextState] - STATE_NUMERIC_WEIGHTS.S) // 0.4
    const rankScore = roleWeight * gain
    const estimatedMatchChange = computeEstimatedMatchChange(
      requirements,
      candidateSkillStates,
      canon,
      nextState
    )

    const targetUrl = `/verify?step=6&skill=${encodeURIComponent(canon)}`

    return {
      id: `rec-evidence-s-${canon.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      type: 'add evidence',
      skill: canon,
      state: 'S',
      title: `Take micro-check for ${canon}`,
      why:
        passportSkill?.rationale ||
        `Repository code evidence exists, but micro-check quiz on your commits is pending to reach Verified.`,
      target: targetUrl,
      targetType: 'internal',
      effort: 'low',
      roleWeight,
      rankScore,
      priority: 0,
      estimatedMatchChange,
      resources,
      projectIdea,
      actionLabel: 'Take micro-check quiz',
      actionNote: 'Jump to verification step 6',
    }
  }

  // 5. Claimed but not verified: type "add evidence"
  if (normState === 'C') {
    const nextState = 'S' // Linking repository code moves from Claimed to Supported
    const gain = (STATE_NUMERIC_WEIGHTS[nextState] - STATE_NUMERIC_WEIGHTS.C) // 0.4
    const rankScore = roleWeight * gain
    const estimatedMatchChange = computeEstimatedMatchChange(
      requirements,
      candidateSkillStates,
      canon,
      nextState
    )

    // Check what is missing
    const isAlgorithmic = ['data structures', 'algorithms', 'c++', 'python'].includes(
      canon.toLowerCase()
    )
    const targetUrl = isAlgorithmic
      ? `/verify?step=0&field=coding_profile&skill=${encodeURIComponent(canon)}`
      : `/verify?step=0&field=github&skill=${encodeURIComponent(canon)}`

    const whySentence = isAlgorithmic
      ? `Claimed on resume without code proof. Connect your LeetCode, Codeforces, or GitHub repository.`
      : `${canon} is claimed on your resume without repository proof; attach code evidence.`

    return {
      id: `rec-evidence-c-${canon.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      type: 'add evidence',
      skill: canon,
      state: 'C',
      title: `Attach evidence for ${canon}`,
      why: passportSkill?.rationale || whySentence,
      target: targetUrl,
      targetType: 'internal',
      effort: 'medium',
      roleWeight,
      rankScore,
      priority: 0,
      estimatedMatchChange,
      resources,
      projectIdea,
      actionLabel: isAlgorithmic ? 'Connect coding profile' : 'Link GitHub repository',
      actionNote: 'Jump to verification intake',
    }
  }

  return null
}

/**
 * Deterministic ranking function.
 * Rule:
 * 1. rankScore descending (roleWeight * gain)
 * 2. effort tiebreak: 'low' before 'medium' before 'high'
 * 3. skill name alphabetical tiebreak
 *
 * @param {Array<Object>} items
 * @returns {Array<Object>} Ranked items with priority assigned 1..N
 */
export function rankRecommendations(items = []) {
  const effortValue = { low: 3, medium: 2, high: 1 }

  const sorted = [...items].sort((a, b) => {
    // 1. Role weight * gain (rankScore) descending
    const diffScore = (b.rankScore || 0) - (a.rankScore || 0)
    if (Math.abs(diffScore) > 0.0001) {
      return diffScore
    }

    // 2. Effort tiebreak: low effort (quick win) ranks first
    const effA = effortValue[a.effort] || 0
    const effB = effortValue[b.effort] || 0
    if (effA !== effB) {
      return effB - effA
    }

    // 3. Alphabetical tiebreak
    return a.skill.localeCompare(b.skill)
  })

  // Assign sequential priority 1..N
  return sorted.map((item, idx) => ({
    ...item,
    priority: idx + 1,
  }))
}

/**
 * Main pure entry point: generate deterministic recommendations from passport and target role.
 * Fails soft on malformed or empty data.
 *
 * @param {Object} passport - Candidate credibility passport
 * @param {Object} [options]
 * @param {string} [options.targetRole] - Target role override if not in passport
 * @returns {{
 *   learnings: Array<Object>,
 *   recommendations: Array<Object>,
 *   strengths: Array<string>,
 *   all: Array<Object>,
 *   targetRole: string,
 *   currentScore: number
 * }}
 */
export function generateRecommendations(passport, options = {}) {
  // Fail-soft: empty or malformed passport
  if (!passport || typeof passport !== 'object') {
    return {
      learnings: [],
      recommendations: [],
      strengths: [],
      all: [],
      targetRole: options.targetRole || 'Software Engineer',
      currentScore: 0,
    }
  }

  const targetRole =
    options.targetRole ||
    passport.targetRole ||
    passport.target_role ||
    'Software Engineer'

  const passportSkillsRaw = Array.isArray(passport.skills) ? passport.skills : []
  const passportId = passport.id || passport.passport_id || ''

  // Build candidate state map
  const candidateSkillStates = new Map()
  const candidateSkillsLookup = new Map()

  passportSkillsRaw.forEach((s) => {
    if (!s) return
    const rawName = s.skill || s.name || ''
    if (!rawName) return
    const canon = normalizeSkill(rawName)
    const st = normalizeState(s.state || s.claim_state)
    candidateSkillStates.set(canon, st)
    candidateSkillsLookup.set(canon, s)
  })

  // Retrieve role requirements
  const requirements = getRoleRequirements(targetRole)
  const currentScore = computeRoleScore(requirements, candidateSkillStates)

  // Track skills encountered
  const processedSkills = new Set()
  const rawItems = []
  const strengths = []

  // A. Process role requirements (including missing ones)
  requirements.forEach((req) => {
    const canon = normalizeSkill(req.skill)
    processedSkills.add(canon)
    const state = candidateSkillStates.get(canon) || 'U'
    const passportSkill = candidateSkillsLookup.get(canon)

    if (state === 'V') {
      strengths.push(canon)
    } else {
      const item = classifySkill({
        skill: canon,
        state,
        roleWeight: req.weight,
        passportSkill,
        passportId,
        targetRole,
        requirements,
        candidateSkillStates,
      })
      if (item) rawItems.push(item)
    }
  })

  // B. Process remaining passport skills not in role requirements
  candidateSkillsLookup.forEach((passportSkill, canon) => {
    if (processedSkills.has(canon)) return
    processedSkills.add(canon)
    const state = candidateSkillStates.get(canon)

    if (state === 'V') {
      strengths.push(canon)
    } else {
      // Non-required skill has nominal weight 1
      const item = classifySkill({
        skill: canon,
        state,
        roleWeight: 1,
        passportSkill,
        passportId,
        targetRole,
        requirements,
        candidateSkillStates,
      })
      if (item) rawItems.push(item)
    }
  })

  // Rank all items deterministically
  const rankedAll = rankRecommendations(rawItems)

  // Segregate per UI mapping:
  // "Learnings" shows type === 'learn'
  // "Recommendations" shows type === 'add evidence' and type === 'fix'
  const learnings = rankedAll.filter((item) => item.type === 'learn')
  const recommendations = rankedAll.filter(
    (item) => item.type === 'add evidence' || item.type === 'fix'
  )

  return {
    learnings,
    recommendations,
    strengths,
    all: rankedAll,
    targetRole,
    currentScore,
  }
}
