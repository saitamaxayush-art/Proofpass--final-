/**
 * Learning Roadmap Generator
 * Pure functions for constructing role-gap grounded learning roadmaps.
 * Scope rule: Roadmaps exist ONLY for skills that are BOTH required by the target role and not Verified.
 */

import { RESOURCES, imochaLink } from '../data/resources.js'

function slugify(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Build roadmap steps for a single skill given its current evidence state.
 * Rules:
 * - Claimed ('C'): exactly one iMocha assessment step.
 * - Supported ('S') or Contradicted ('X'): course step(s) first, then the iMocha assessment step last.
 *
 * @param {string} skill - Skill name
 * @param {'C'|'S'|'X'|string} state - Evidence state
 * @returns {Array<Object>} List of roadmap steps
 */
export function buildRoadmap(skill, state) {
  const skillSlug = slugify(skill)
  const normalizedState = (state || 'C').toUpperCase()

  // Assessment step (common to all roadmaps)
  const assessmentStep = {
    id: `step-${skillSlug}-assessment`,
    skill,
    title: `Take iMocha verification assessment for ${skill}`,
    type: 'assessment',
    platform: 'iMocha',
    url: imochaLink(skill),
    done: false,
    resultLink: '',
    description: 'Complete the standardized 20-minute code assessment to verify practical problem solving and code syntax.',
  }

  // Claimed: assessment step only
  if (normalizedState === 'C') {
    return [assessmentStep]
  }

  // Supported or Contradicted: course step(s) first, then assessment step last
  const matchingCourses = RESOURCES.filter(
    (r) => r.skill.toLowerCase() === skill.toLowerCase() && r.type === 'course'
  )

  const coursesToInclude = matchingCourses.slice(0, 2)
  const courseSteps = coursesToInclude.map((c, idx) => ({
    id: `step-${skillSlug}-course-${idx + 1}`,
    skill,
    title: c.title,
    type: 'course',
    platform: c.platform,
    url: c.url,
    cost: c.cost,
    level: c.level,
    done: false,
    resultLink: '',
    description: `Complete the ${c.level || 'Working'} level curriculum on ${c.platform} to deepen knowledge and code evidence.`,
  }))

  // If no course was found in resources for this skill, provide a curated fallback course
  if (courseSteps.length === 0) {
    courseSteps.push({
      id: `step-${skillSlug}-course-1`,
      skill,
      title: `${skill} Core Architecture & Practice`,
      type: 'course',
      platform: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org/learn/',
      cost: 'Free',
      level: 'Working',
      done: false,
      resultLink: '',
      description: `Comprehensive foundational learning path covering ${skill}.`,
    })
  }

  return [...courseSteps, assessmentStep]
}

/**
 * Pure, reusable function to build roadmaps for a role and its ranked evidence gaps.
 * Single source of truth: gaps array shaped like roleMatchData.rankedGaps.
 *
 * @param {string} roleName - Name of the target role
 * @param {Array<Object>} gaps - Array of gap objects { skill, currentState, importance, potentialBoost }
 * @returns {Array<Object>} List of roadmaps in the same order as gaps
 */
export function buildRoadmapsForGaps(roleName, gaps = []) {
  const trimmedRole = (roleName || '').trim()
  const roleKey = trimmedRole.toLowerCase()
  const timestamp = new Date().toISOString()

  return (gaps || []).map((gap) => {
    const skillName = gap.skill
    const skillId = slugify(skillName)
    const state = gap.currentState || 'C'
    const steps = buildRoadmap(skillName, state)
    const isCompleted = state === 'V' || (steps.length > 0 && steps.every((s) => s.done))

    return {
      roleKey,
      roleName: trimmedRole || 'Target Role',
      skillId,
      skillName,
      state,
      importance: gap.importance || 2,
      potentialBoost: gap.potentialBoost || 0,
      steps,
      status: isCompleted ? 'completed' : 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  })
}
