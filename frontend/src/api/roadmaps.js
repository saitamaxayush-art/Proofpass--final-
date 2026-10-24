/**
 * Future Endpoint: /api/roadmaps
 * Client-side mock repository for applicant role-gap learning roadmaps.
 * Persists roadmaps in localStorage under pp-roadmaps-v2, keyed by userId + roleKey + skillId.
 */

import { buildRoadmapsForGaps, buildRoadmap } from '../lib/roadmap.js'

const STORAGE_KEY = 'pp-roadmaps-v2'
const LATEST_ROLE_STORAGE_KEY = 'pp-latest-role-v2'

// Delete obsolete legacy roadmap storage keys once on load
try {
  localStorage.removeItem('pp-roadmaps')
  localStorage.removeItem('pp_roadmaps')
  localStorage.removeItem('pp_prototype_roadmaps')
} catch {
  // Restricted environment
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Restricted environment
  }
}

function readLatestRoleStore() {
  try {
    const raw = localStorage.getItem(LATEST_ROLE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeLatestRoleStore(store) {
  try {
    localStorage.setItem(LATEST_ROLE_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Restricted environment
  }
}

/**
 * Key format: userId + '::' + roleKey + '::' + skillId
 */
function makeCompositeKey(userId, roleKey, skillId) {
  const u = (userId || 'anonymous').trim()
  const r = (roleKey || '').toLowerCase().trim()
  const s = (skillId || '').toLowerCase().trim()
  return `${u}::${r}::${s}`
}

/**
 * Future Endpoint: POST /api/roadmaps/verify-sync
 * Idempotently merges roadmaps generated from verification Step 7 into storage.
 *
 * @param {string} userId - Current user ID
 * @param {string} roleName - Target role name
 * @param {Array<Object>} gaps - rankedGaps from executeStep7RoleMatch
 * @returns {Promise<Array<Object>>} Merged roadmaps for this role
 */
export async function saveRoadmapsFromVerification(userId, roleName, gaps = []) {
  const uid = (userId || 'anonymous').trim()
  const trimmedRole = (roleName || 'Target Role').trim()
  const roleKey = trimmedRole.toLowerCase()

  // Track latest role for this user
  const latestRoles = readLatestRoleStore()
  latestRoles[uid] = { roleKey, roleName: trimmedRole, timestamp: new Date().toISOString() }
  writeLatestRoleStore(latestRoles)

  // Build fresh roadmaps for current gaps
  const freshRoadmaps = buildRoadmapsForGaps(trimmedRole, gaps)
  const store = readStore()

  // Find all existing keys for this user + role
  const prefix = `${uid}::${roleKey}::`
  const existingKeysForRole = Object.keys(store).filter((k) => k.startsWith(prefix))
  const freshSkillIds = new Set(freshRoadmaps.map((r) => r.skillId))

  // 1. Merge fresh roadmaps
  freshRoadmaps.forEach((fresh) => {
    const compKey = makeCompositeKey(uid, roleKey, fresh.skillId)
    const existing = store[compKey]

    if (existing) {
      // Rebuild steps while preserving done flags and pasted assessment links
      const mergedSteps = fresh.steps.map((freshStep) => {
        const oldStep = (existing.steps || []).find((s) => s.id === freshStep.id)
        if (oldStep) {
          return {
            ...freshStep,
            done: Boolean(oldStep.done),
            resultLink: oldStep.resultLink || '',
          }
        }
        return freshStep
      })

      const allDone = mergedSteps.length > 0 && mergedSteps.every((s) => s.done)

      store[compKey] = {
        ...existing,
        ...fresh,
        steps: mergedSteps,
        status: allDone ? 'completed' : 'active',
        createdAt: existing.createdAt || fresh.createdAt,
        updatedAt: new Date().toISOString(),
        userId: uid,
      }
    } else {
      store[compKey] = {
        ...fresh,
        userId: uid,
      }
    }
  })

  // 2. Any skill previously stored for this role that is no longer in gaps list is now Verified
  existingKeysForRole.forEach((oldKey) => {
    const oldRoadmap = store[oldKey]
    if (oldRoadmap && !freshSkillIds.has(oldRoadmap.skillId)) {
      store[oldKey] = {
        ...oldRoadmap,
        state: 'V',
        status: 'completed',
        updatedAt: new Date().toISOString(),
      }
    }
  })

  writeStore(store)

  return listRoadmaps(uid, roleKey)
}

/**
 * Future Endpoint: GET /api/roadmaps?roleKey=...
 * Lists roadmaps for a given user and target role.
 *
 * @param {string} userId - User identifier
 * @param {string} [roleKey] - Lowercased role key. If omitted, uses latest role.
 * @returns {Promise<Array<Object>>}
 */
export async function listRoadmaps(userId, roleKey) {
  const uid = (userId || 'anonymous').trim()
  let targetKey = roleKey ? roleKey.toLowerCase().trim() : null

  if (!targetKey) {
    const latest = await getLatestRoleKey(uid)
    targetKey = typeof latest === 'string' ? latest : latest?.roleKey || null
  }

  const store = readStore()
  if (!targetKey) {
    // Return all roadmaps belonging to this user
    return Object.values(store).filter((r) => (r.userId || 'anonymous') === uid)
  }

  const prefix = `${uid}::${targetKey}::`
  const roadmaps = Object.keys(store)
    .filter((k) => k.startsWith(prefix))
    .map((k) => store[k])

  // Sort by potentialBoost descending (maintaining gap priority order)
  return roadmaps.sort((a, b) => (b.potentialBoost || 0) - (a.potentialBoost || 0))
}

/**
 * Future Endpoint: GET /api/roadmaps/latest-role
 * Returns the target role of the most recent verification.
 *
 * @param {string} userId
 * @returns {Promise<{ roleKey: string, roleName: string }|null>}
 */
export async function getLatestRoleKey(userId) {
  const uid = (userId || 'anonymous').trim()
  const latestRoles = readLatestRoleStore()
  const userLatest = latestRoles[uid]

  if (userLatest && userLatest.roleKey) {
    return userLatest
  }

  // Fallback: look for the most recently updated roadmap for this user
  const store = readStore()
  const userRoadmaps = Object.values(store).filter((r) => (r.userId || 'anonymous') === uid)
  if (userRoadmaps.length === 0) return null

  userRoadmaps.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  const latest = userRoadmaps[0]

  return {
    roleKey: latest.roleKey,
    roleName: latest.roleName || latest.roleKey,
  }
}

/**
 * Future Endpoint: PATCH /api/roadmaps/:id/step
 * Updates a specific step (toggle done or set pasted link).
 *
 * @param {string} userId
 * @param {string} roleKey
 * @param {string} skillId
 * @param {string} stepId
 * @param {Object} updates - { done: boolean, resultLink?: string }
 * @returns {Promise<Object>} Updated roadmap
 */
export async function updateRoadmapStep(userId, roleKey, skillId, stepId, updates = {}) {
  const uid = (userId || 'anonymous').trim()
  const rKey = (roleKey || '').toLowerCase().trim()
  const sId = (skillId || '').toLowerCase().trim()
  const compKey = makeCompositeKey(uid, rKey, sId)

  const store = readStore()
  const roadmap = store[compKey]
  if (!roadmap) {
    throw new Error(`Roadmap not found for ${compKey}`)
  }

  const updatedSteps = (roadmap.steps || []).map((step) => {
    if (step.id === stepId) {
      return {
        ...step,
        ...updates,
      }
    }
    return step
  })

  const allDone = updatedSteps.length > 0 && updatedSteps.every((s) => s.done)

  const updatedRoadmap = {
    ...roadmap,
    steps: updatedSteps,
    status: allDone ? 'completed' : 'active',
    updatedAt: new Date().toISOString(),
  }

  store[compKey] = updatedRoadmap
  writeStore(store)

  return updatedRoadmap
}
