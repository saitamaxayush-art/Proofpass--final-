/**
 * Coding profile platforms registry.
 * Designed for modular expansion. Adding a new platform requires only
 * adding a new entry to this array.
 */

export const ALLOW_MULTIPLE_PER_PLATFORM = false

const LEETCODE_RESERVED_SEGMENTS = new Set([
  'problems',
  'problemset',
  'contest',
  'discuss',
  'explore',
  'study-plan',
  'u',
  'tag',
  'company',
  'assessment',
  'interview',
  'store',
  'subscribe',
  'premium',
  'accounts',
])

export const platforms = [
  {
    id: 'codeforces',
    label: 'Codeforces',
    hosts: ['codeforces.com'],
    exampleUrl: 'https://codeforces.com/profile/tourist',
    parse(url) {
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length >= 2 && segments[0].toLowerCase() === 'profile') {
        const handle = segments[1]
        if (/^[a-zA-Z0-9_.-]+$/.test(handle)) {
          return { handle }
        }
      }
      return null
    },
    buildCanonicalUrl(handle) {
      return `https://codeforces.com/profile/${handle}`
    },
  },
  {
    id: 'leetcode',
    label: 'LeetCode',
    hosts: ['leetcode.com'],
    exampleUrl: 'https://leetcode.com/u/neal_wu',
    parse(url) {
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length === 0) {
        return null
      }

      // Modern format: leetcode.com/u/{username}
      if (segments[0].toLowerCase() === 'u') {
        if (segments.length >= 2 && segments[1]) {
          const handle = segments[1]
          if (/^[a-zA-Z0-9_.-]+$/.test(handle)) {
            return { handle }
          }
        }
        return null
      }

      // Legacy format: leetcode.com/{username}
      if (LEETCODE_RESERVED_SEGMENTS.has(segments[0].toLowerCase())) {
        return null
      }

      const handle = segments[0]
      if (/^[a-zA-Z0-9_.-]+$/.test(handle)) {
        return { handle }
      }

      return null
    },
    buildCanonicalUrl(handle) {
      return `https://leetcode.com/u/${handle}`
    },
  },
]
