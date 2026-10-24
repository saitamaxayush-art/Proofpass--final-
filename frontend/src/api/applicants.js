/**
 * Applicants API Module
 * Manages applicants per job role, filtering by passport presence, CSV ingestion, and applicant updates.
 */

import { generateSampleApplicants } from '../data/seed.js'

const STORAGE_APPLICANTS_KEY = 'pp_prototype_applicants'

function loadStoredApplicants() {
  try {
    const raw = localStorage.getItem(STORAGE_APPLICANTS_KEY)
    if (!raw) {
      const initial = generateSampleApplicants()
      localStorage.setItem(STORAGE_APPLICANTS_KEY, JSON.stringify(initial))
      return initial
    }
    return JSON.parse(raw)
  } catch {
    return generateSampleApplicants()
  }
}

function saveStoredApplicants(applicants) {
  try {
    localStorage.setItem(STORAGE_APPLICANTS_KEY, JSON.stringify(applicants))
  } catch {
    // Storage restricted
  }
}

/**
 * List all applicants for a specific role.
 * Future backend endpoint: GET /api/v1/roles/:roleId/applicants
 *
 * @param {string} roleId
 * @returns {Promise<{ withPassport: Array, noPassport: Array }>}
 */
export async function listApplicantsForRole(roleId) {
  await new Promise((res) => setTimeout(res, 60))
  const all = loadStoredApplicants()
  const forRole = all.filter((a) => a.roleId === roleId)

  return {
    withPassport: forRole.filter((a) => a.hasPassport),
    noPassport: forRole.filter((a) => !a.hasPassport),
    all: forRole,
  }
}

/**
 * Ingest or create a single candidate application.
 * Future backend endpoint: POST /api/v1/roles/:roleId/applicants
 *
 * @param {string} roleId
 * @param {Object} candidateData
 * @returns {Promise<Object>}
 */
export async function addApplicantToRole(roleId, candidateData) {
  await new Promise((res) => setTimeout(res, 50))
  const all = loadStoredApplicants()

  const newApplicant = {
    id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    roleId,
    name: candidateData.name.trim(),
    email: candidateData.email.trim(),
    hasPassport: Boolean(candidateData.hasPassport),
    resumeText: candidateData.resumeText || '',
    githubUrl: candidateData.githubUrl || '',
    leetcodeUrl: candidateData.leetcodeUrl || '',
    certificateUrls: candidateData.certificateUrls || '',
    targetRole: candidateData.targetRole || 'Software Engineer',
    skills: candidateData.skills || [],
    passport: candidateData.passport || null,
    isRecruiterGenerated: Boolean(candidateData.isRecruiterGenerated),
    createdAt: new Date().toISOString(),
  }

  all.push(newApplicant)
  saveStoredApplicants(all)
  return newApplicant
}

/**
 * Generate a passport for a resume-only applicant (e.g. from recruiter CSV action).
 * Caps all skills at Claimed unless external links are provided.
 *
 * @param {string} applicantId
 * @returns {Promise<Object>}
 */
export async function generatePassportForApplicant(applicantId) {
  await new Promise((res) => setTimeout(res, 120))
  const all = loadStoredApplicants()
  const idx = all.findIndex((a) => a.id === applicantId)
  if (idx === -1) {
    throw new Error(`Applicant with ID "${applicantId}" not found.`)
  }

  const applicant = all[idx]
  const skillsToVerify = (applicant.skills && applicant.skills.length > 0)
    ? applicant.skills
    : [
        { skill: 'React', state: 'C', level: 1, evidence: 'Resume claim; no repository evidence attached', why: 'Claimed: Resume-only applicant. Capped at Claimed per trust ceiling.' },
        { skill: 'TypeScript', state: 'C', level: 1, evidence: 'Resume claim; no repository evidence attached', why: 'Claimed: Resume-only applicant. Capped at Claimed per trust ceiling.' },
        { skill: 'REST APIs', state: 'C', level: 1, evidence: 'Resume claim; no repository evidence attached', why: 'Claimed: Resume-only applicant. Capped at Claimed per trust ceiling.' },
      ]

  const passportId = `PP-REC-${Math.floor(1000 + Math.random() * 9000)}`
  const hash = `rec_gen_${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`

  const updatedApplicant = {
    ...applicant,
    hasPassport: true,
    isRecruiterGenerated: true,
    passport: {
      id: passportId,
      candidate: applicant.name,
      targetRole: applicant.targetRole,
      issuedAt: new Date().toISOString(),
      hash,
      revoked: false,
      isRecruiterGenerated: true,
      skills: skillsToVerify.map((s) => ({
        skill: s.skill,
        state: s.state || 'C',
        level: s.level || 1,
        evidence: s.evidence || 'Parsed from candidate resume by recruiter batch run',
        rationale: s.why || 'Resume-only claims are capped at Claimed status.',
        lineShare: 0,
      })),
    },
  }

  all[idx] = updatedApplicant
  saveStoredApplicants(all)
  return updatedApplicant
}
