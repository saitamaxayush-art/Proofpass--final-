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
 * Normalizes passport payload from either backend API or client storage.
 */
function normalizePassport(p) {
  if (!p) return null
  const id = p.id || p.passport_id
  if (!id) return null

  let skills = p.skills || []
  if (Array.isArray(skills)) {
    skills = skills.map((s) => ({
      skill: s.skill || s.name || '',
      state: s.state || (s.claim_state === 'Verified' ? 'V' : s.claim_state === 'Supported' ? 'S' : s.claim_state === 'Contradicted' ? 'X' : 'C'),
      level: s.level || 2,
      evidence: s.evidence || (s.evidence_chain?.[0]?.detail) || 'Verified evidence',
      rationale: s.rationale || s.why || '',
      evidenceDetails: s.evidenceDetails || [],
    }))
  }

  return {
    ...p,
    id,
    passport_id: id,
    candidate: p.candidate || p.candidate_name || 'Applicant',
    targetRole: p.targetRole || p.target_role || 'Software Engineer',
    issuedAt: p.issuedAt || p.created_at || new Date().toISOString(),
    hash: p.hash || p.sha256_hash || `hash_${id}`,
    skills,
    revoked: Boolean(p.revoked),
  }
}

/**
 * List all passports associated with a user or globally across all browsers.
 * Fetches live from the backend server (/api/v1/passports) and merges with local storage.
 *
 * @param {string} [userId]
 * @returns {Promise<Array>}
 */
export async function listPassports(userId) {
  let serverPassports = []
  try {
    const res = await fetch('/api/v1/passports')
    if (res.ok) {
      serverPassports = await res.json()
    }
  } catch {
    // Network / offline fallback
  }

  const local = loadStoredPassports()
  const combinedMap = new Map()

  if (Array.isArray(serverPassports)) {
    serverPassports.forEach((p) => {
      const norm = normalizePassport(p)
      if (norm) combinedMap.set(norm.id, norm)
    })
  }

  if (Array.isArray(local)) {
    local.forEach((p) => {
      const norm = normalizePassport(p)
      if (norm && !combinedMap.has(norm.id)) {
        combinedMap.set(norm.id, norm)
      }
    })
  }

  const all = Array.from(combinedMap.values())
  if (userId) {
    return all.filter((p) => p.userId === userId)
  }
  return all
}

/**
 * Retrieve a single passport by ID.
 * Checks local storage and queries /api/v1/passports/:id.
 *
 * @param {string} passportId
 * @returns {Promise<Object>}
 */
export async function getPassport(passportId) {
  const local = loadStoredPassports()
  const foundLocal = local.find((p) => p.id === passportId || p.passport_id === passportId)
  if (foundLocal) return normalizePassport(foundLocal)

  try {
    const res = await fetch(`/api/v1/passports/${passportId}`)
    if (res.ok) {
      const data = await res.json()
      if (data.passport) {
        return normalizePassport({
          ...data.passport,
          id: data.passport_id || data.passport.id || passportId,
          passport_id: data.passport_id || passportId,
          targetRole: data.target_role || data.passport.target_role,
          sha256_hash: data.sha256_hash || data.passport.sha256_hash,
          created_at: data.created_at || data.passport.created_at,
        })
      }
      return normalizePassport(data)
    }
  } catch {
    // Network error
  }

  throw new Error(`Passport with ID "${passportId}" not found.`)
}

/**
 * Save an issued skill passport into local storage AND sync to the backend API.
 * Ensures passports generated in one browser are immediately visible to recruiters in another browser.
 *
 * @param {Object} passport - Full passport payload
 * @param {string} [userId]
 * @returns {Promise<Object>}
 */
export async function savePassport(passport, userId) {
  const local = loadStoredPassports()
  const pid = passport.id || passport.passport_id || `PP-${Date.now()}`
  const record = normalizePassport({
    ...passport,
    id: pid,
    userId: userId || passport.userId || 'usr_anonymous',
    revoked: passport.revoked || false,
    updatedAt: new Date().toISOString(),
  })

  // 1. Update local storage
  const existingIdx = local.findIndex((p) => p.id === pid)
  if (existingIdx >= 0) {
    local[existingIdx] = record
  } else {
    local.unshift(record)
  }
  saveStoredPassports(local)

  // 2. Broadcast / sync to shared backend database so other browser profiles see it
  try {
    await fetch('/api/v1/passports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
  } catch (err) {
    console.warn('Failed to sync passport to backend server:', err)
  }

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
