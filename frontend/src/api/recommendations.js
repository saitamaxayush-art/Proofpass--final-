/**
 * Recommendations API Module
 * Computes evidence-weighted role match rankings and recommends targeted learning resources.
 */

import { listRoles } from './roles.js'
import { RESOURCES } from '../data/resources.js'
import { WEIGHTS } from '../data.js'

/**
 * Calculate role alignment score based on candidate skill states and role weights.
 *
 * @param {Object} role - Role definition with requiredSkills [{ skill, importance, weight }]
 * @param {Array} candidateSkills - [{ skill, state }]
 * @returns {{ score: number, matchedSkills: Array, missingSkills: Array, gaps: Array }}
 */
export function calculateRoleMatch(role, candidateSkills = []) {
  if (!role || !role.requiredSkills || role.requiredSkills.length === 0) {
    return { score: 0, matchedSkills: [], missingSkills: [], gaps: [] }
  }

  const skillMap = new Map()
  candidateSkills.forEach((s) => {
    skillMap.set(s.skill.toLowerCase(), s.state)
  })

  let totalPossibleWeight = 0
  let earnedScore = 0
  const matchedSkills = []
  const missingSkills = []
  const gaps = []

  role.requiredSkills.forEach((req) => {
    const weight = req.weight || (req.importance === 'Must' ? 3 : req.importance === 'Should' ? 2 : 1)
    const maxEarnable = weight * 100
    totalPossibleWeight += maxEarnable

    const state = skillMap.get(req.skill.toLowerCase())

    if (state) {
      const stateWeight = WEIGHTS[state] ?? 0
      earnedScore += weight * stateWeight
      matchedSkills.push({ skill: req.skill, state, weight, importance: req.importance })
      if (state !== 'V') {
        gaps.push({ skill: req.skill, currentState: state, importance: req.importance })
      }
    } else {
      missingSkills.push({ skill: req.skill, importance: req.importance, weight })
      gaps.push({ skill: req.skill, currentState: 'U', importance: req.importance })
    }
  })

  const rawScore = totalPossibleWeight > 0 ? (earnedScore / totalPossibleWeight) * 100 : 0
  const score = Math.round(rawScore)

  return {
    score,
    matchedSkills,
    missingSkills,
    gaps,
  }
}

/**
 * Retrieve best-matching roles for a candidate's skill passport.
 * Future backend endpoint: GET /api/v1/recommendations/roles
 *
 * @param {Array} candidateSkills - [{ skill, state, level, ... }]
 * @returns {Promise<Array>} List of roles with match score, matchedSkills, and gaps
 */
export async function getRecommendedRoles(candidateSkills = []) {
  await new Promise((res) => setTimeout(res, 50))
  const roles = await listRoles()

  const scoredRoles = roles.map((role) => {
    const match = calculateRoleMatch(role, candidateSkills)
    return {
      role,
      ...match,
    }
  })

  // Sort descending by match score
  scoredRoles.sort((a, b) => b.score - a.score)
  return scoredRoles
}

/**
 * Retrieve learning and practice recommendations prioritized by candidate gaps.
 * Future backend endpoint: GET /api/v1/recommendations/resources
 *
 * @param {Array} candidateSkills - [{ skill, state }]
 * @param {string} [targetRole]
 * @returns {Promise<Array>}
 */
export async function getRecommendedResources(candidateSkills = [], targetRole = '') {
  await new Promise((res) => setTimeout(res, 40))

  const unverifiedSkills = new Set(
    candidateSkills.filter((s) => s.state !== 'V').map((s) => s.skill.toLowerCase())
  )

  // Sort resources: items addressing unverified skills come first
  const sorted = [...RESOURCES].sort((a, b) => {
    const aIsGap = unverifiedSkills.has(a.skill.toLowerCase()) ? 1 : 0
    const bIsGap = unverifiedSkills.has(b.skill.toLowerCase()) ? 1 : 0
    return bIsGap - aIsGap
  })

  return sorted
}
