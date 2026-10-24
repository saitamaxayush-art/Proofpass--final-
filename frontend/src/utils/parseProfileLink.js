import { platforms } from '../config/platforms.js'

/**
 * Parses and validates a profile link against registered coding platforms.
 *
 * @param {string} rawInput - User inputted link or handle string
 * @returns {{ platform: string, handle: string, canonicalUrl: string } | { error: 'unsupported' | 'no_handle' }}
 */
export function parseProfileLink(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return { error: 'unsupported' }
  }

  let trimmed = rawInput.trim()
  if (!trimmed) {
    return { error: 'unsupported' }
  }

  // Prepend https:// if no scheme is present
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`
  }

  let url
  try {
    url = new URL(trimmed)
  } catch {
    return { error: 'unsupported' }
  }

  // Normalize host: lowercase, strip optional www. prefix
  const rawHost = url.hostname.toLowerCase()
  const normalizedHost = rawHost.replace(/^www\./, '')

  // Find matching platform by host
  const matchedPlatform = platforms.find((p) =>
    p.hosts.some((h) => h.toLowerCase() === normalizedHost)
  )

  if (!matchedPlatform) {
    return { error: 'unsupported' }
  }

  // Parse platform handle from URL
  const parsed = matchedPlatform.parse(url)
  if (!parsed || !parsed.handle) {
    return { error: 'no_handle' }
  }

  const { handle } = parsed
  const canonicalUrl = matchedPlatform.buildCanonicalUrl
    ? matchedPlatform.buildCanonicalUrl(handle)
    : `https://${normalizedHost}/${handle}`

  return {
    platform: matchedPlatform.id,
    handle,
    canonicalUrl,
  }
}
