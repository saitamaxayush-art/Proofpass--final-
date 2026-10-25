/**
 * Recommendation Engine Unit Tests
 * Covers 5 sample passports (strong, overclaim, forked tutorial, resume only, empty),
 * ranking order, distinct destinations, state handling, and unknown skills.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateRecommendations,
  classifySkill,
  rankRecommendations,
  getCatalogResources,
  normalizeSkill,
  isKnownSkill,
  computeRoleScore,
} from '../frontend/src/recommendations/index.js'

// 1. STRONG PASSPORT
const strongPassport = {
  id: 'pp_strong_001',
  candidate: 'Elena Rostova',
  targetRole: 'Senior Full Stack TypeScript Engineer',
  skills: [
    { skill: 'React', state: 'V', evidence: 'Primary author of React web app' },
    { skill: 'TypeScript', state: 'V', evidence: 'Strict tsconfig with generic libraries' },
    { skill: 'REST APIs', state: 'V', evidence: 'Contract-first OpenAPI endpoints' },
    { skill: 'Testing', state: 'V', evidence: 'Comprehensive Playwright and Vitest CI tests' },
    { skill: 'Git workflow', state: 'V', evidence: '340 commits, squash merge PR hygiene' },
    { skill: 'Docker', state: 'V', evidence: 'Multi-stage production Dockerfile' },
    { skill: 'PostgreSQL', state: 'S', rationale: 'Schema committed, but query indexing audit is pending' },
  ],
}

// 2. OVERCLAIM PASSPORT
const overclaimPassport = {
  id: 'pp_overclaim_002',
  candidate: 'Jordan Blake',
  targetRole: 'Senior Full Stack TypeScript Engineer',
  skills: [
    { skill: 'React', state: 'C', rationale: 'Claimed on resume without code proof.' },
    { skill: 'TypeScript', state: 'C', rationale: 'Claimed on resume without code proof.' },
    { skill: 'Git workflow', state: 'C', rationale: 'Claimed on resume without code proof.' },
    { skill: 'REST APIs', state: 'C', rationale: 'Claimed on resume without code proof.' },
    { skill: 'Testing', state: 'C', rationale: 'Claimed on resume without code proof.' },
    { skill: 'Docker', state: 'C', rationale: 'Claimed on resume without code proof.' },
  ],
}

// 3. FORKED TUTORIAL PASSPORT (Contradicted)
const forkedTutorialPassport = {
  id: 'pp_forked_003',
  candidate: 'Samir Verma',
  targetRole: 'Senior Full Stack TypeScript Engineer',
  skills: [
    { skill: 'React', state: 'V', evidence: 'Verified original work' },
    { skill: 'TypeScript', state: 'S', evidence: 'Some generic files found' },
    {
      skill: 'Docker',
      state: 'X',
      evidence: 'On the resume, only repository is a fork of a tutorial with 0 original commits',
      rationale: 'Forked repository detected without candidate commit history.',
    },
  ],
}

// 4. RESUME ONLY PASSPORT
const resumeOnlyPassport = {
  id: 'pp_resume_004',
  candidate: 'Taylor Reed',
  targetRole: 'Senior Full Stack TypeScript Engineer',
  skills: [
    { skill: 'React', state: 'C', rationale: 'Resume claim only.' },
    { skill: 'Python', state: 'C', rationale: 'Resume claim only.' },
  ],
}

// 5. EMPTY PASSPORT
const emptyPassport = {
  id: 'pp_empty_005',
  candidate: 'Alex New',
  targetRole: 'Senior Full Stack TypeScript Engineer',
  skills: [],
}

test('1. Strong passport: identifies strengths, low-effort micro-check for Supported skill', () => {
  const result = generateRecommendations(strongPassport)

  // Verified skills must be listed under strengths
  assert.ok(result.strengths.includes('React'))
  assert.ok(result.strengths.includes('TypeScript'))
  assert.ok(result.strengths.includes('REST APIs'))
  assert.ok(result.strengths.includes('Testing'))
  assert.ok(result.strengths.includes('Git workflow'))
  assert.ok(result.strengths.includes('Docker'))

  // PostgreSQL is Supported ('S') -> must be in recommendations with type 'add evidence'
  const pgRec = result.recommendations.find((r) => r.skill === 'PostgreSQL')
  assert.ok(pgRec, 'PostgreSQL recommendation should exist')
  assert.equal(pgRec.type, 'add evidence')
  assert.equal(pgRec.effort, 'low')
  assert.equal(pgRec.target, '/verify?step=6&skill=PostgreSQL')
  assert.ok(pgRec.why.includes('Schema committed') || pgRec.why.includes('micro-check'))
})

test('2. Overclaim passport: ranks high-weight skills first with deterministic tiebreaking', () => {
  const result = generateRecommendations(overclaimPassport)

  assert.equal(result.strengths.length, 0)
  assert.ok(result.recommendations.length >= 6)

  // All must be type 'add evidence'
  result.recommendations.forEach((item) => {
    assert.equal(item.type, 'add evidence')
    assert.equal(item.effort, 'medium')
  })

  // Top four ranked must have roleWeight 3 (Git workflow, React, REST APIs, TypeScript)
  const topFour = result.recommendations.slice(0, 4)
  assert.equal(topFour.length, 4)
  topFour.forEach((item) => {
    assert.equal(item.roleWeight, 3)
    assert.equal(item.rankScore, 1.2)
  })
  const topFourNames = topFour.map((r) => r.skill)
  assert.ok(topFourNames.includes('React'))
  assert.ok(topFourNames.includes('TypeScript'))
  assert.ok(topFourNames.includes('Git workflow'))
  assert.ok(topFourNames.includes('REST APIs'))

  // Next two must have roleWeight 2 (Docker, Testing)
  const nextTwo = result.recommendations.slice(4, 6)
  assert.equal(nextTwo.length, 2)
  nextTwo.forEach((item) => {
    assert.equal(item.roleWeight, 2)
    assert.ok(Math.abs(item.rankScore - 0.8) < 0.0001)
  })
  const nextTwoNames = nextTwo.map((r) => r.skill)
  assert.ok(nextTwoNames.includes('Docker'))
  assert.ok(nextTwoNames.includes('Testing'))

  // Priorities must be sequential 1, 2, 3...
  result.all.forEach((item, idx) => {
    assert.equal(item.priority, idx + 1)
  })
})

test('3. Forked tutorial passport: identifies Contradicted (X) skill as type "fix"', () => {
  const result = generateRecommendations(forkedTutorialPassport)

  const fixItem = result.recommendations.find((r) => r.skill === 'Docker')
  assert.ok(fixItem, 'Docker fix recommendation must exist')
  assert.equal(fixItem.type, 'fix')
  assert.equal(fixItem.state, 'X')
  assert.ok(fixItem.why.includes('fork of a tutorial') || fixItem.why.includes('Forked repository'))
  assert.ok(fixItem.resolutionGuide.includes('Correct resume claim') || fixItem.resolutionGuide.includes('original'))
  assert.equal(fixItem.target, '/passport/pp_forked_003#skill-Docker')
})

test('4. Resume only passport: segregates learn items from add-evidence items', () => {
  const result = generateRecommendations(resumeOnlyPassport)

  // Absent role skills must be in learnings (type 'learn')
  assert.ok(result.learnings.length > 0)
  result.learnings.forEach((item) => {
    assert.equal(item.type, 'learn')
    assert.equal(item.effort, 'high')
    assert.ok(item.projectIdea, 'Learn item must have a project idea')
    assert.ok(item.target.startsWith('http'), 'Learn item must have an external target URL')
  })

  // Claimed skill (React) must be in recommendations (type 'add evidence')
  const reactRec = result.recommendations.find((r) => r.skill === 'React')
  assert.ok(reactRec)
  assert.equal(reactRec.type, 'add evidence')
})

test('5. Empty passport: handles 0 skills gracefully without crashing', () => {
  const result = generateRecommendations(emptyPassport)

  assert.equal(result.strengths.length, 0)
  assert.equal(result.recommendations.length, 0)
  assert.ok(result.learnings.length > 0, 'Must propose learn items for missing role requirements')
  assert.equal(result.currentScore, 0)
})

test('6. Distinct destinations: every recommendation item has its own unique target URL', () => {
  const result = generateRecommendations(overclaimPassport)
  const targets = result.all.map((r) => r.target)
  const uniqueTargets = new Set(targets)
  assert.equal(targets.length, uniqueTargets.size, 'Each recommendation must have a distinct destination')
})

test('7. Unknown skills: receive no catalog resources (never wrong ones)', () => {
  const customPassport = {
    id: 'pp_unknown_007',
    targetRole: 'Senior Full Stack TypeScript Engineer',
    skills: [
      { skill: 'ObscureProprietaryLanguage99', state: 'C', rationale: 'Resume claim only.' },
    ],
  }

  const result = generateRecommendations(customPassport)
  const unknownRec = result.recommendations.find(
    (r) => r.skill === 'ObscureProprietaryLanguage99'
  )
  assert.ok(unknownRec)
  assert.equal(unknownRec.resources.length, 0, 'Unknown skill must get 0 catalog resources')
})

test('8. Normalization: canonicalizes case, aliases, and punctuation', () => {
  assert.equal(normalizeSkill('react.js'), 'React')
  assert.equal(normalizeSkill('ts'), 'TypeScript')
  assert.equal(normalizeSkill('dockerfile'), 'Docker')
  assert.equal(normalizeSkill('postgres'), 'PostgreSQL')
  assert.equal(normalizeSkill('unit testing'), 'Testing')
  assert.equal(normalizeSkill('es6'), 'JavaScript')
  assert.equal(normalizeSkill('py'), 'Python')

  assert.equal(isKnownSkill('react'), true)
  assert.equal(isKnownSkill('SomeUnknownThing'), false)
})

test('9. Malformed input fails soft without throwing', () => {
  assert.doesNotThrow(() => generateRecommendations(null))
  assert.doesNotThrow(() => generateRecommendations(undefined))
  assert.doesNotThrow(() => generateRecommendations({}))
  assert.doesNotThrow(() => generateRecommendations({ skills: 'invalid_type' }))
  assert.doesNotThrow(() => generateRecommendations({ skills: [null, undefined, {}] }))

  const safe = generateRecommendations(null)
  assert.deepEqual(safe.learnings, [])
  assert.deepEqual(safe.recommendations, [])
  assert.deepEqual(safe.strengths, [])
})
