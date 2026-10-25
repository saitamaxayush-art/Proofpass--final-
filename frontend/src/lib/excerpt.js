/**
 * Excerpt Extraction Utility
 * Extracts honest, verbatim excerpts from evidence source code or resumes
 * based on skill alias matching with boundaries that support C++, C#, .NET, Node.js, etc.
 */

import { TAXONOMY } from '../data/taxonomy.js'

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Returns all aliases for a skill from taxonomy or fallback to skill name.
 *
 * @param {string} skillName
 * @returns {string[]}
 */
export function getSkillAliases(skillName) {
  if (!skillName || typeof skillName !== 'string') return []
  const norm = skillName.trim().toLowerCase()
  const entry = TAXONOMY.find(
    (t) =>
      t.id.toLowerCase() === norm ||
      t.name.toLowerCase() === norm ||
      (Array.isArray(t.aliases) && t.aliases.some((a) => a.toLowerCase() === norm))
  )
  if (entry) {
    const list = [entry.name, ...(entry.aliases || [])]
    return Array.from(new Set(list))
  }
  return [skillName.trim()]
}

/**
 * Builds a regex for matching an alias with proper boundary rules.
 * Handles tokens like C++, C#, .NET, Node.js that break standard \b word boundaries.
 *
 * @param {string} alias
 * @returns {RegExp|null}
 */
export function buildAliasRegex(alias) {
  if (!alias || typeof alias !== 'string') return null
  const trimmed = alias.trim()
  if (!trimmed) return null

  const escaped = escapeRegex(trimmed).replace(/\s+/g, '\\s+')
  const startsWithDot = trimmed.startsWith('.')
  const endsWithDot = trimmed.endsWith('.')

  let preBoundary = '(?<![a-zA-Z0-9_#+])'
  if (startsWithDot) {
    preBoundary = '(?<![a-zA-Z0-9_#+.])'
  }

  let postBoundary = '(?![a-zA-Z0-9_#+])'
  if (trimmed.endsWith('+')) {
    // For C++, do not follow with another + or letters (e.g. C+++), but digits/spaces/punctuation match
    postBoundary = '(?![a-zA-Z_#+])'
  } else if (trimmed.endsWith('#')) {
    postBoundary = '(?![a-zA-Z_#])'
  } else if (endsWithDot) {
    postBoundary = '(?![a-zA-Z0-9_#+.])'
  }

  try {
    return new RegExp(`${preBoundary}${escaped}${postBoundary}`, 'i')
  } catch {
    return new RegExp(`\\b${escaped}\\b`, 'i')
  }
}

/**
 * Extracts first line containing any alias plus at most one neighbouring line.
 * Collapses whitespace, trims with an ellipsis if exceeding maxLen.
 *
 * @param {string} text - Raw content from file sample or resume
 * @param {string[]|string} [aliases] - Skill aliases to look for
 * @param {number} [maxLen=200] - Maximum excerpt character length
 * @returns {{ text: string, matchedTerm: string }|null}
 */
export function extractExcerpt(text, aliases, maxLen = 200) {
  if (!text || typeof text !== 'string') return null

  let aliasList = []
  if (Array.isArray(aliases)) {
    aliasList = aliases.filter((a) => a && typeof a === 'string')
  } else if (typeof aliases === 'string') {
    aliasList = getSkillAliases(aliases)
  }

  if (aliasList.length === 0) return null

  const compiled = aliasList
    .map((alias) => ({ alias, regex: buildAliasRegex(alias) }))
    .filter((item) => item.regex !== null)

  if (compiled.length === 0) return null

  const lines = text.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i]
    if (!currentLine.trim()) continue

    for (const { alias, regex } of compiled) {
      const match = currentLine.match(regex)
      if (match) {
        const matchedTerm = match[0]

        // Include at most one neighbouring line
        let excerptLines = [currentLine.trim()]
        if (i + 1 < lines.length && lines[i + 1].trim()) {
          excerptLines.push(lines[i + 1].trim())
        } else if (i - 1 >= 0 && lines[i - 1].trim()) {
          excerptLines.unshift(lines[i - 1].trim())
        }

        let combined = excerptLines.join(' ').replace(/\s+/g, ' ').trim()

        if (combined.length > maxLen) {
          combined = combined.slice(0, maxLen - 1).trim() + '…'
        }

        return {
          text: combined,
          matchedTerm,
        }
      }
    }
  }

  return null
}
