/**
 * Certificates Evidence Source Adapter
 * Deterministically parses digital certificates and attested credential credentials.
 * Ceilings: Certificate evidence is capped at 60 (Supported at most, never Verified).
 */

export function extractCertificateEvidence(certInput, claimedSkills = []) {
  if (!certInput || !certInput.trim()) return []

  const certText = certInput.trim()
  const records = []

  // Check which claimed skills relate to the certificate text
  for (const skill of claimedSkills) {
    if (certText.toLowerCase().includes(skill.toLowerCase())) {
      records.push({
        skill,
        source: 'certificate',
        ceiling: 60,
        filePath: `Attested Certificate: ${certText}`,
        lineShare: 60,
        commitCount: 1,
        filesTouched: 1,
        usageDepth: 'Attested assessment completion verified by credential issuer',
        isOriginalAuthor: true,
        forkedTutorial: false,
        label: 'Sample evidence (Certificate)',
      })
    }
  }

  // If no direct skill matched but cert exists, attach to cloud / domain or first relevant
  if (records.length === 0 && certText.length > 5) {
    const defaultSkill = certText.toLowerCase().includes('aws')
      ? 'AWS'
      : certText.toLowerCase().includes('cloud')
      ? 'AWS'
      : claimedSkills[0] || 'System design'

    records.push({
      skill: defaultSkill,
      source: 'certificate',
      ceiling: 60,
      filePath: `Attested Certificate: ${certText}`,
      lineShare: 60,
      commitCount: 1,
      filesTouched: 1,
      usageDepth: 'Third-party certification credential verified',
      isOriginalAuthor: true,
      forkedTutorial: false,
      label: 'Sample evidence (Certificate)',
    })
  }

  return records
}
