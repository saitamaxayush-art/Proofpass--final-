export const STATE_WEIGHTS = {
  V: 1.0, // 100% (Verified code evidence & micro-check)
  S: 0.6, // 60% (Supported code evidence)
  C: 0.2, // 20% (Claimed on resume, no evidence yet)
  U: 0.0, // 0% (Missing from resume & repos)
  X: 0.0, // 0% (Contradicted by forked/unoriginal tutorial)
}

export const ROLE_REQUIREMENTS_DICTIONARY = {
  'Senior Full Stack TypeScript Engineer': [
    { skill: 'React', importance: 3 },
    { skill: 'TypeScript', importance: 3 },
    { skill: 'REST APIs', importance: 2 },
    { skill: 'Testing', importance: 2 },
    { skill: 'Docker', importance: 1 },
    { skill: 'System design', importance: 2 },
    { skill: 'Git workflow', importance: 1 },
    { skill: 'Kubernetes', importance: 1 },
  ],
  'Backend Distributed Systems Engineer': [
    { skill: 'TypeScript', importance: 2 },
    { skill: 'REST APIs', importance: 3 },
    { skill: 'PostgreSQL', importance: 3 },
    { skill: 'Docker', importance: 2 },
    { skill: 'System design', importance: 3 },
    { skill: 'Testing', importance: 2 },
    { skill: 'Git workflow', importance: 1 },
  ],
  'Frontend Specialist': [
    { skill: 'React', importance: 3 },
    { skill: 'TypeScript', importance: 3 },
    { skill: 'Testing', importance: 3 },
    { skill: 'REST APIs', importance: 2 },
    { skill: 'Git workflow', importance: 1 },
  ],
  'Python / Django Developer': [
    { skill: 'Django', importance: 3 },
    { skill: 'Python', importance: 3 },
    { skill: 'SQL', importance: 2 },
    { skill: 'REST APIs', importance: 2 },
    { skill: 'Git workflow', importance: 1 },
    { skill: 'Testing', importance: 2 },
  ],
  'Python Backend Engineer': [
    { skill: 'Python', importance: 3 },
    { skill: 'Django', importance: 2 },
    { skill: 'REST APIs', importance: 3 },
    { skill: 'SQL', importance: 2 },
    { skill: 'Docker', importance: 1 },
    { skill: 'Git workflow', importance: 1 },
  ],
  'C / C++ Systems Software Engineer': [
    { skill: 'C++', importance: 3 },
    { skill: 'C', importance: 2 },
    { skill: 'System design', importance: 3 },
    { skill: 'Testing', importance: 2 },
    { skill: 'Git workflow', importance: 1 },
    { skill: 'Linux', importance: 1 },
  ],
  'Full Stack Software Engineer': [
    { skill: 'REST APIs', importance: 3 },
    { skill: 'SQL', importance: 2 },
    { skill: 'Git workflow', importance: 2 },
    { skill: 'Testing', importance: 2 },
  ],
  'Software Engineer': [
    { skill: 'Git workflow', importance: 2 },
    { skill: 'Testing', importance: 2 },
    { skill: 'REST APIs', importance: 2 },
    { skill: 'System design', importance: 2 },
  ],
}

export function resolveRoleRequirements(targetRoleName = '', candidateSkills = []) {
  const cleanName = (targetRoleName || '').trim()

  // 1. Direct match in dictionary
  if (ROLE_REQUIREMENTS_DICTIONARY[cleanName]) {
    return ROLE_REQUIREMENTS_DICTIONARY[cleanName]
  }

  // 2. Fuzzy match in dictionary
  const lower = cleanName.toLowerCase()
  for (const [key, reqs] of Object.entries(ROLE_REQUIREMENTS_DICTIONARY)) {
    if (lower === key.toLowerCase() || lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return reqs
    }
  }

  // 3. Dynamic synthesis based on title keywords and candidate's claimed stack
  const reqs = []
  const added = new Set()

  const add = (skill, importance) => {
    if (!added.has(skill)) {
      added.add(skill)
      reqs.push({ skill, importance })
    }
  }

  // Keyword-based role skill injection
  if (lower.includes('django')) {
    add('Django', 3)
    add('Python', 3)
    add('SQL', 2)
    add('REST APIs', 2)
  } else if (lower.includes('python')) {
    add('Python', 3)
    if (candidateSkills.includes('Django')) add('Django', 2)
    else if (candidateSkills.includes('FastAPI')) add('FastAPI', 2)
    else if (candidateSkills.includes('Flask')) add('Flask', 2)
    add('SQL', 2)
    add('REST APIs', 2)
  }

  if (lower.includes('c++') || lower.includes('cpp')) {
    add('C++', 3)
    if (candidateSkills.includes('C')) add('C', 2)
    add('System design', 2)
    add('Testing', 2)
  } else if (lower.includes('c systems') || lower === 'c engineer') {
    add('C', 3)
    if (candidateSkills.includes('C++')) add('C++', 2)
    add('System design', 2)
  }

  if (lower.includes('react') || lower.includes('frontend')) {
    add('React', 3)
    add('JavaScript', 3)
    add('HTML/CSS', 2)
    add('Testing', 2)
  }

  if (lower.includes('backend')) {
    const backendLang = candidateSkills.find((s) => ['Python', 'Django', 'Node.js', 'Java', 'Go', 'FastAPI'].includes(s))
    if (backendLang) add(backendLang, 3)
    add('REST APIs', 3)
    add('SQL', 2)
    add('Docker', 1)
  }

  // Core software engineering standards
  add('Git workflow', 2)
  add('Testing', 2)

  // Dynamically include candidate's primary claimed skills so their verified stack is properly scored
  for (const s of candidateSkills) {
    if (!added.has(s) && reqs.length < 6) {
      add(s, 2)
    }
  }

  return reqs.length > 0 ? reqs : [
    { skill: 'Git workflow', importance: 2 },
    { skill: 'Testing', importance: 2 },
    { skill: 'REST APIs', importance: 2 },
  ]
}

export function executeStep7RoleMatch(skillStates = [], targetRoleName = '', onLog = () => {}) {
  const roleName = targetRoleName || 'Software Engineer'
  onLog(`Initiating Step 7: Calculating evidence-weighted role match for "${roleName}"...`)

  const candidateSkills = skillStates.map((s) => s.skill)
  const roleReqs = resolveRoleRequirements(roleName, candidateSkills)

  let totalMaxWeight = 0
  let earnedScore = 0

  const stateMap = {}
  skillStates.forEach((s) => {
    stateMap[s.skill] = s.state
  })

  const gaps = []

  roleReqs.forEach((req) => {
    const isClaimedOnResume = stateMap[req.skill] !== undefined
    // If not claimed on resume, it is 'U' (Missing), NOT 'C' (Claimed)!
    const currentState = isClaimedOnResume ? stateMap[req.skill] : 'U'
    const factor = STATE_WEIGHTS[currentState] !== undefined ? STATE_WEIGHTS[currentState] : 0.0
    
    earnedScore += req.importance * factor
    totalMaxWeight += req.importance

    // Calculate gap if not verified
    if (currentState !== 'V') {
      const currentPoints = req.importance * factor
      const maxPoints = req.importance * 1.0
      const potentialBoostPoints = maxPoints - currentPoints

      let recommendation = ''
      if (currentState === 'S') {
        recommendation = 'Complete a targeted micro-check to upgrade to Verified (+40% state credit).'
      } else if (currentState === 'C') {
        recommendation = 'Claimed on resume: Link a public commit or PR implementing this skill to move to Verified (+80% credit).'
      } else if (currentState === 'X') {
        recommendation = 'Resolve conflict by demonstrating original commits in a non-forked repository.'
      } else {
        recommendation = 'Required for role but missing from resume/repos. Add relevant projects or coursework to earn credit (+100% boost).'
      }

      gaps.push({
        skill: req.skill,
        currentState,
        isClaimed: isClaimedOnResume,
        importance: req.importance,
        potentialBoost: potentialBoostPoints,
        recommendation,
      })
    }
  })

  const matchPercentage = totalMaxWeight > 0 ? Math.round((earnedScore / totalMaxWeight) * 100) : 100

  // Rank gaps by impact
  gaps.sort((a, b) => b.potentialBoost - a.potentialBoost)

  // Candidate's own skill verification rate (how many claimed skills were backed by code)
  const totalClaimedCount = skillStates.length
  const verifiedCount = skillStates.filter((s) => s.state === 'V').length
  const supportedCount = skillStates.filter((s) => s.state === 'S').length
  const claimedOnlyCount = skillStates.filter((s) => s.state === 'C').length
  const contradictedCount = skillStates.filter((s) => s.state === 'X').length

  const claimVerificationRate = totalClaimedCount > 0
    ? Math.round(((verifiedCount * 1.0 + supportedCount * 0.6 + claimedOnlyCount * 0.2) / totalClaimedCount) * 100)
    : 100

  // Breakdown counts
  const breakdown = {
    V: verifiedCount,
    S: supportedCount,
    C: claimedOnlyCount,
    X: contradictedCount,
  }

  onLog(`Step 7 Complete: Evidence-weighted match = ${matchPercentage}%. Candidate claim verification rate = ${claimVerificationRate}% (${verifiedCount}/${totalClaimedCount} verified). Identified ${gaps.length} ranked skill gaps.`)

  return {
    matchPercentage,
    claimVerificationRate,
    earnedScore,
    totalMaxWeight,
    breakdown,
    rankedGaps: gaps,
    roleReqs,
    disclaimer: 'No single hire score: ProofPass provides a weighted evidence match breakdown, not a binary hiring decision.',
  }
}
