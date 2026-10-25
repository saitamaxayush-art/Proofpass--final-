/**
 * Recruiter Roles API Module
 * Manages job role openings, skill requirements, weights, and sample CVs.
 */

import { SAMPLE_ROLES, syncSeedDataIfNeeded } from '../data/seed.js'

const STORAGE_ROLES_KEY = 'pp_prototype_roles'

function loadStoredRoles() {
  syncSeedDataIfNeeded()
  try {
    const raw = localStorage.getItem(STORAGE_ROLES_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_ROLES_KEY, JSON.stringify(SAMPLE_ROLES))
      return SAMPLE_ROLES
    }
    return JSON.parse(raw)
  } catch {
    return SAMPLE_ROLES
  }
}

function saveStoredRoles(roles) {
  try {
    localStorage.setItem(STORAGE_ROLES_KEY, JSON.stringify(roles))
  } catch {
    // Storage restricted
  }
}

/**
 * List all job openings (sample and recruiter-created).
 * Future backend endpoint: GET /api/v1/roles
 *
 * @returns {Promise<Array>}
 */
export async function listRoles() {
  await new Promise((res) => setTimeout(res, 60))
  return loadStoredRoles()
}

// BACKEND: Candidate compare and role evaluation depend on GET /api/v1/roles/:id
// Backend must return role title, company, description, and requiredSkills with skill, importance (Must/Should/Nice), and numeric weight (3/2/1).
/**
 * Retrieve a single role by ID.
 * Future backend endpoint: GET /api/v1/roles/:id
 *
 * @param {string} roleId
 * @returns {Promise<Object>}
 */
export async function getRole(roleId) {
  await new Promise((res) => setTimeout(res, 40))
  const roles = loadStoredRoles()
  const found = roles.find((r) => r.id === roleId)
  if (!found) {
    throw new Error(`Role with ID "${roleId}" not found.`)
  }
  return found
}

/**
 * Create a new recruiter role.
 * Future backend endpoint: POST /api/v1/roles
 *
 * @param {Object} rolePayload - { title, company, description, requiredSkills, demoCv }
 * @returns {Promise<Object>}
 */
export async function createRole(rolePayload) {
  await new Promise((res) => setTimeout(res, 80))
  const roles = loadStoredRoles()

  const newRole = {
    id: `role_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: rolePayload.title.trim(),
    company: (rolePayload.company || 'My Company').trim(),
    isSample: false,
    description: rolePayload.description.trim(),
    requiredSkills: rolePayload.requiredSkills || [],
    demoCv: rolePayload.demoCv || '',
    location: rolePayload.location ? rolePayload.location.trim() : null,
    workMode: rolePayload.workMode || null,
    minExperienceYears: rolePayload.minExperienceYears !== undefined && rolePayload.minExperienceYears !== null ? Number(rolePayload.minExperienceYears) : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  roles.unshift(newRole)
  saveStoredRoles(roles)
  return newRole
}

/**
 * Update an existing role.
 * Future backend endpoint: PUT /api/v1/roles/:id
 *
 * @param {string} roleId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateRole(roleId, updates) {
  await new Promise((res) => setTimeout(res, 60))
  const roles = loadStoredRoles()
  const idx = roles.findIndex((r) => r.id === roleId)
  if (idx === -1) {
    throw new Error(`Role with ID "${roleId}" not found.`)
  }

  roles[idx] = {
    ...roles[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  saveStoredRoles(roles)
  return roles[idx]
}
