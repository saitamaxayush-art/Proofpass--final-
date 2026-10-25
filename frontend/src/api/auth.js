/**
 * Authentication API module (Prototype In-Browser Store)
 * Stores session and account profiles in localStorage without persisting passwords.
 */

const STORAGE_USERS_KEY = 'pp_prototype_users'
const STORAGE_SESSION_KEY = 'pp_prototype_session'

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredUsers(users) {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users))
  } catch {
    // LocalStorage might be full or restricted
  }
}

/**
 * Register a new applicant or recruiter account.
 * Future backend endpoint: POST /api/v1/auth/signup
 *
 * @param {Object} payload - { role, name, email, password, profile }
 * @returns {Promise<Object>} user session object
 */
export async function signupRequest({ role, name, email, password, profile = {} }) {
  // Simulate network latency
  await new Promise((res) => setTimeout(res, 80))

  const cleanEmail = (email || '').trim().toLowerCase()
  if (!cleanEmail) {
    throw new Error('Email address is required.')
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.')
  }
  if (!role || (role !== 'applicant' && role !== 'recruiter')) {
    throw new Error('A valid account role (applicant or recruiter) is required.')
  }

  const users = getStoredUsers()
  let user = users.find((u) => u.email === cleanEmail)

  if (user) {
    throw new Error('An account with this email address already exists in this browser.')
  }

  // Create new user without storing plaintext password
  user = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: cleanEmail,
    role,
    profile: profile || {},
    createdAt: new Date().toISOString(),
  }

  users.push(user)
  saveStoredUsers(users)

  // Persist session
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user))
  } catch {
    // Storage restricted
  }

  return user
}

/**
 * Authenticate an existing account.
 * Future backend endpoint: POST /api/v1/auth/login
 *
 * Prototype rule: Any password of 6+ characters is accepted for existing accounts.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} user session object
 */
export async function loginRequest(email, password) {
  // Simulate network latency
  await new Promise((res) => setTimeout(res, 80))

  const cleanEmail = (email || '').trim().toLowerCase()
  if (!cleanEmail) {
    throw new Error('Email address is required.')
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.')
  }

  const users = getStoredUsers()
  let user = users.find((u) => u.email === cleanEmail)

  if (!user) {
    // If not found in custom signups, check if it's the default demo accounts
    if (cleanEmail === 'alex.rivera@example.com' || cleanEmail.includes('alex')) {
      user = {
        id: 'usr_demo_applicant',
        name: 'Alex Rivera',
        email: cleanEmail,
        role: 'applicant',
        profile: {
          targetRole: 'Senior Full Stack TypeScript Engineer',
          experience: [{ title: 'Full Stack Engineer', organisation: 'Acme SaaS', duration: '2022 - Present', summary: 'React, Node.js, and TypeScript web development.' }],
        },
        createdAt: new Date().toISOString(),
      }
      users.push(user)
      saveStoredUsers(users)
    } else if (cleanEmail.includes('recruiter') || cleanEmail.includes('hiring')) {
      user = {
        id: 'usr_demo_recruiter',
        name: 'Elena Rostova',
        email: cleanEmail,
        role: 'recruiter',
        profile: {
          company: 'Veloce Systems',
          roleHiringFor: 'Senior Full Stack TypeScript Engineer',
          description: 'Hiring senior TypeScript and React engineers with proven evidence repositories and clean code hygiene.',
        },
        createdAt: new Date().toISOString(),
      }
      users.push(user)
      saveStoredUsers(users)
    } else {
      throw new Error('Account not found. Please sign up or check your email address.')
    }
  }

  // Persist session
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user))
  } catch {
    // Storage restricted
  }

  return user
}

/**
 * Terminate current user session.
 * Future backend endpoint: POST /api/v1/auth/logout
 *
 * @returns {Promise<boolean>}
 */
export async function logoutRequest() {
  await new Promise((res) => setTimeout(res, 40))
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY)
  } catch {
    // Storage restricted
  }
  return true
}

/**
 * Retrieve active user session from browser storage.
 * Future backend endpoint: GET /api/v1/auth/session
 *
 * @returns {Promise<Object|null>}
 */
export async function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Retrieve verified GitHub OAuth profile from active backend session.
 *
 * @returns {Promise<{ github_login: string, github_id: number, avatar_url?: string } | null>}
 */
export async function getGitHubSession() {
  try {
    const res = await fetch('/api/v1/auth/me', {
      method: 'GET',
      credentials: 'include',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Terminate active GitHub OAuth session.
 *
 * @returns {Promise<boolean>}
 */
export async function logoutGitHubSession() {
  try {
    const res = await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Retrieve server authentication configuration.
 *
 * @returns {Promise<{ github_oauth_configured: boolean }>}
 */
export async function getAuthConfig() {
  try {
    const res = await fetch('/api/v1/auth/config', {
      method: 'GET',
      credentials: 'include',
    })
    if (!res.ok) {
      return { github_oauth_configured: false }
    }
    return await res.json()
  } catch {
    return { github_oauth_configured: false }
  }
}

