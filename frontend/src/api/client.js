/**
 * ProofPass Frontend API Client and Request Builder.
 * Handles multipart and JSON payload construction for candidate intake.
 */

/**
 * Builds a FormData payload for the intake analysis endpoint.
 * Serializes valid coding profiles into extras.coding_profiles and ensures
 * legacy separate fields (codeforces_handle, kaggle_username) are not sent.
 *
 * @param {Object} intakeData - Verified intake form data
 * @returns {FormData}
 */
export function buildIntakeFormData(intakeData) {
  const formData = new FormData()

  if (intakeData.resumeFile) {
    formData.append('resume_file', intakeData.resumeFile)
  } else if (intakeData.resumeText) {
    formData.append('resume_text', intakeData.resumeText)
  }

  // github_url removed from POST /verify: verified session identity is used exclusively
  formData.append('target_role', intakeData.targetRole || '')

  if (intakeData.jobDescription) {
    formData.append('job_description', intakeData.jobDescription)
  }

  const hasConsent =
    intakeData.consent ??
    (Boolean(intakeData.consentAi) && Boolean(intakeData.consentRepo))
  formData.append('consent', hasConsent ? 'true' : 'false')

  const allowNetwork = intakeData.allowNetwork !== false
  formData.append('allow_network', allowNetwork ? 'true' : 'false')

  // Build clean extras with validated coding_profiles array
  const rawProfiles = intakeData.extras?.coding_profiles || []
  const codingProfiles = rawProfiles
    .filter((p) => p && p.platform && p.handle && p.url)
    .map(({ platform, handle, url }) => ({ platform, handle, url }))

  const extras = {
    ...intakeData.extras,
    coding_profiles: codingProfiles,
  }

  // Explicitly remove obsolete legacy single-platform fields if present
  delete extras.codeforces_handle
  delete extras.kaggle_username

  formData.append('extras', JSON.stringify(extras))

  return formData
}

/**
 * Submits the intake form to the backend or handles mock mode.
 *
 * @param {Object} intakeData
 * @param {{ mock?: boolean }} options
 * @returns {Promise<Object>}
 */
export async function submitIntake(intakeData, { mock = false } = {}) {
  // In mock mode, return mock output accepting the new field
  if (mock) {
    return {
      passport_id: `pp_mock_${Date.now()}`,
      status: 'issued',
      role_match_score: 0.85,
      target_role: intakeData.targetRole || 'Full-Stack Engineer',
      sha256_hash: 'mock_sha256_hash_value',
      is_demo: true,
      created_at: new Date().toISOString(),
    }
  }

  const formData = buildIntakeFormData(intakeData)
  const endpoint = intakeData.resumeFile
    ? '/api/v1/verify/upload'
    : '/api/v1/verify'

  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Intake submission failed (${res.status}): ${errorText}`)
  }

  return await res.json()
}
