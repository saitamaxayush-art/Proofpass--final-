/**
 * Passports API Module
 * Manages saving, retrieving, listing, revoking, and integrity-verifying skill passports.
 */

import { verifyPassportIntegrity } from '../engine/step8_issue_passport.js'

const STORAGE_PASSPORTS_KEY = 'pp_prototype_passports'

function loadStoredPassports() {
  try {
    const raw = localStorage.getItem(STORAGE_PASSPORTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredPassports(passports) {
  try {
    localStorage.setItem(STORAGE_PASSPORTS_KEY, JSON.stringify(passports))
  } catch {
    // Storage restricted
  }
}

/**
 * List all passports associated with a user or globally in the prototype.
 * Future backend endpoint: GET /api/v1/passports
 *
 * @param {string} [userId]
 * @returns {Promise<Array>}
 */
export async function listPassports(userId) {
  await new Promise((res) => setTimeout(res, 50))
  const all = loadStoredPassports()
  if (userId) {
    return all.filter((p) => p.userId === userId)
  }
  return all
}

/**
 * Retrieve a single passport by ID.
 * Future backend endpoint: GET /api/v1/passports/:id
 *
 * @param {string} passportId
 * @returns {Promise<Object>}
 */
export async function getPassport(passportId) {
  await new Promise((res) => setTimeout(res, 40))
  const all = loadStoredPassports()
  const found = all.find((p) => p.id === passportId)
  if (!found) {
    throw new Error(`Passport with ID "${passportId}" not found.`)
  }
  return found
}

/**
 * Save an issued skill passport.
 * Future backend endpoint: POST /api/v1/passports
 *
 * // BACKEND: POST /api/v1/passports must accept and persist the rich evidenceDetails array
 * // attached to each skill:
 * // Array<{
 * //   source: 'github' | 'resume' | 'certificate' | 'leetcode' | 'assessment',
 * //   label: string,
 * //   file: string | null,
 * //   commit: string | null, // 7-char commit hash
 * //   url: string | null,
 * //   excerpt: string, // Real verbatim excerpt from repository file or resume
 * //   excerptSource: 'file' | 'resume' | 'sample',
 * //   matchedTerm: string,
 * //   contentHash: string | null, // 8-char SHA-256 snippet
 * //   flagReason: string | null,
 * //   confidence: { value: number, label: 'Low' | 'Medium' | 'High', factors: Array<{ label: string, value: string }> },
 * //   fetchedAt: string // ISO date string
 * // }>
 * // NOTE: Cryptographic SHA-256 integrity covers [skill, state, evidence] text.
 * // evidenceDetails are display metadata that enrich candidate audit trails.
 *
 * @param {Object} passport - Full passport payload { id, candidate, targetRole, issuedAt, hash, skills, ... }
 * @param {string} [userId]
 * @returns {Promise<Object>}
 */
export async function savePassport(passport, userId) {
  await new Promise((res) => setTimeout(res, 60))
  const all = loadStoredPassports()
  const existingIdx = all.findIndex((p) => p.id === passport.id)

  const record = {
    ...passport,
    userId: userId || passport.userId || 'usr_anonymous',
    revoked: passport.revoked || false,
    updatedAt: new Date().toISOString(),
  }

  if (existingIdx >= 0) {
    all[existingIdx] = record
  } else {
    all.unshift(record)
  }

  saveStoredPassports(all)
  return record
}

/**
 * Toggle or set share revocation for a passport.
 * Future backend endpoint: PATCH /api/v1/passports/:id/revoke
 *
 * @param {string} passportId
 * @param {boolean} revoked
 * @returns {Promise<Object>}
 */
export async function setPassportRevoked(passportId, revoked = true) {
  await new Promise((res) => setTimeout(res, 50))
  const all = loadStoredPassports()
  const idx = all.findIndex((p) => p.id === passportId)
  if (idx === -1) {
    throw new Error(`Passport with ID "${passportId}" not found.`)
  }

  all[idx] = {
    ...all[idx],
    revoked,
    revokedAt: revoked ? new Date().toISOString() : null,
  }

  saveStoredPassports(all)
  return all[idx]
}

/**
 * Check cryptographic integrity of a passport against its SHA-256 seal.
 * Future backend endpoint: POST /api/v1/passports/:id/verify
 *
 * @param {string} passportId
 * @returns {Promise<{ valid: boolean, storedHash: string, currentHash: string, message: string }>}
 */
export async function checkPassportTamper(passportId) {
  const passport = await getPassport(passportId)
  const result = await verifyPassportIntegrity(passport.skills, passport.hash)
  return {
    valid: result.valid,
    storedHash: passport.hash,
    currentHash: result.currentHash,
    message: result.message,
  }
}
