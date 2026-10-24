export async function executeStep5AssignStates(authorshipData, readData, onLog = () => {}) {
  onLog('Initiating Step 5: Applying deterministic trust ceiling matrix to assign skill states...')

  const skillStates = []

  for (const item of authorshipData.authorshipData) {
    let state = 'C'
    let rationale = ''
    let evidence = ''

    if (item.forkedTutorial || item.ceiling === 0) {
      state = 'X' // Contradicted
      rationale = 'Contradicted: On resume as a skill claim, but evidence conflicts with claim (e.g. forked tutorial with zero original commits).'
      evidence = item.filePath !== 'None' ? `${item.filePath}, forked tutorial with 0 author commits` : 'Forked tutorial repository with 0 original commits'
    } else if (item.source === 'certificate' || item.ceiling === 60) {
      state = 'S' // Supported
      rationale = 'Supported: Third-party certificate or platform assessment verified (trust ceiling 60). One micro-check away from Verified.'
      evidence = item.filePath || 'Attested digital credential verified'
    } else if (item.source === 'leetcode') {
      state = 'S' // Supported
      rationale = 'Supported: Algorithmic problem solving demonstrated on LeetCode (trust ceiling 60). Valid for DSA skills.'
      evidence = item.filePath || 'LeetCode profile submissions verified'
    } else if (item.lineShare >= 75 && item.commitCount >= 20) {
      state = 'S' // Supported: Highest code trust ceiling 80, ready for Step 6 micro-check to reach Verified (100)
      rationale = 'Supported: Confirmed code exists with strong line share and commit frequency. Requires Step 6 micro-check to reach Verified.'
      evidence = `${item.filePath}, ${item.lineShare}% lines across ${item.filesTouched} files, ${item.commitCount} commits`
    } else if (item.lineShare > 0) {
      state = 'S' // Supported
      rationale = 'Supported: Code exists, but usage depth or testing is partial. One micro-check away from Verified.'
      evidence = `${item.filePath}, ${item.lineShare}% lines across ${item.filesTouched} files, partial CI depth`
    } else {
      state = 'C' // Claimed
      rationale = 'Claimed: Mentioned on the resume, but no evidence was found in the inspected repositories. Not penalised.'
      evidence = 'On resume; no matching files found in repository index'
    }

    skillStates.push({
      skill: item.skill,
      state,
      evidence,
      rationale,
      lineShare: item.lineShare,
      commitCount: item.commitCount,
      filesTouched: item.filesTouched,
      filePath: item.filePath,
    })

    onLog(`[State Assigned] ${item.skill} -> ${state === 'V' ? 'VERIFIED' : state === 'S' ? 'SUPPORTED' : state === 'C' ? 'CLAIMED' : 'CONTRADICTED'}`)
  }

  const counts = {
    V: skillStates.filter((s) => s.state === 'V').length,
    S: skillStates.filter((s) => s.state === 'S').length,
    C: skillStates.filter((s) => s.state === 'C').length,
    X: skillStates.filter((s) => s.state === 'X').length,
  }

  onLog(`Step 5 Complete: States assigned -> ${counts.V} Verified, ${counts.S} Supported, ${counts.C} Claimed, ${counts.X} Contradicted.`)

  return {
    skillStates,
    counts,
    totalSkills: skillStates.length,
  }
}
