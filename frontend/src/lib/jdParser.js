/**
 * Job Description Parser (Deterministic, Client-side)
 * Parses job description text to extract title, location, workMode,
 * minExperienceYears, categorized skills (Must/Should/Nice), and cleanedText.
 *
 * Rules:
 * - Plain deterministic code in the browser (no model).
 * - Alias matching against taxonomy (supports C++, C#, .NET, Node.js; <= 2 char aliases match exact case).
 * - Heading and same-line cues dictate importance (Must > Should > Nice).
 * - Deduplicate skills keeping the highest importance.
 * - foundIn: real sentence (max 160 characters).
 * - Max 15 skills.
 */

import { TAXONOMY } from '../data/taxonomy.js'
import { getSkillId } from './skillsByState.js'

const IMPORTANCE_WEIGHTS = {
  Must: 3,
  Should: 2,
  Nice: 1,
}

/**
 * Escapes regex special characters.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Builds a regex pattern for matching a skill alias with boundary safety.
 * Handles non-alphanumeric trailing symbols like C++, C#, .NET, Node.js.
 * Enforces exact case matching for aliases of 2 characters or fewer.
 */
function buildAliasRegex(alias) {
  const escaped = escapeRegex(alias)
  // Non-word boundaries before and after: start/end of line or standard delimiter characters
  const pattern = `(^|[\\s,.;:!?()[\\]{}"'/~<>-])(${escaped})(?=$|[\\s,.;:!?()[\\]{}"'/~<>-])`
  const isShort = alias.length <= 2
  return new RegExp(pattern, isShort ? '' : 'i')
}

/**
 * Extracts the job title.
 * A line starting "Job title", "Role" or "Position" plus a colon,
 * else the first non-empty line under 80 characters.
 */
function extractTitle(lines) {
  const colonRegex = /^\s*(?:job\s+title|role|position)\s*:\s*(.+)$/i
  for (const line of lines) {
    const m = line.match(colonRegex)
    if (m && m[1]?.trim()) {
      return m[1].trim()
    }
  }

  for (const line of lines) {
    const clean = line.replace(/^[#* \t-]+/, '').trim()
    if (clean.length > 0 && clean.length < 80) {
      if (!/^(?:job\s+description|about\s+the\s+role|overview|requirements|qualifications)$/i.test(clean)) {
        return clean
      }
    }
  }

  return 'Job Opening'
}

/**
 * Extracts location from a "Location:" line.
 */
function extractLocation(lines) {
  const locRegex = /^\s*(?:job\s+)?location\s*:\s*(.+)$/i
  for (const line of lines) {
    const m = line.match(locRegex)
    if (m && m[1]?.trim()) {
      let loc = m[1].trim()
      loc = loc.replace(/\s*\((?:remote|hybrid|on-site|onsite)[^)]*\)/i, '').trim()
      return loc
    }
  }
  return null
}

/**
 * Extracts workMode from the words remote, hybrid, on-site.
 */
function extractWorkMode(text) {
  if (/\bhybrid\b/i.test(text)) return 'Hybrid'
  if (/\bremote\b/i.test(text)) return 'Remote'
  if (/\b(?:on-site|onsite|in-office)\b/i.test(text)) return 'On-site'
  return null
}

/**
 * Extracts minimum experience years (smallest number in patterns like "3+ years", "2 to 4 years", "minimum 5 yrs").
 */
function extractMinExperienceYears(text) {
  const nums = []

  // "3+ years", "3+ yrs"
  const rPlus = /(\d+)\s*\+\s*(?:years?|yrs?)/gi
  let m
  while ((m = rPlus.exec(text)) !== null) {
    nums.push(parseInt(m[1], 10))
  }

  // "2 to 4 years", "2-4 yrs"
  const rRange = /(\d+)\s*(?:to|-)\s*(\d+)\s*(?:years?|yrs?)/gi
  while ((m = rRange.exec(text)) !== null) {
    nums.push(parseInt(m[1], 10))
  }

  // "minimum 5 yrs", "at least 3 years", "min 2 years"
  const rMin = /(?:minimum|at\s+least|min\.?)\s*(?:of\s*)?(\d+)\s*(?:years?|yrs?)/gi
  while ((m = rMin.exec(text)) !== null) {
    nums.push(parseInt(m[1], 10))
  }

  // "5 years of experience", "3 yrs experience"
  const rExp = /(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/gi
  while ((m = rExp.exec(text)) !== null) {
    nums.push(parseInt(m[1], 10))
  }

  const valid = nums.filter((n) => !isNaN(n) && n > 0 && n <= 30)
  if (valid.length === 0) return null
  return Math.min(...valid)
}

/**
 * Cleans the input text for presentation in the description field.
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Truncates a foundIn sentence to max 160 characters.
 */
function cleanSentence(sentence) {
  const clean = sentence
    .replace(/^[-*•\d.) \t]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (clean.length <= 160) return clean
  return clean.slice(0, 157).trimEnd() + '...'
}

/**
 * Pure parser function converting raw JD text and taxonomy into structured role metadata.
 *
 * @param {string} rawText
 * @param {Array} taxonomy
 * @returns {{
 *   title: string,
 *   location: string|null,
 *   workMode: 'Remote'|'Hybrid'|'On-site'|null,
 *   minExperienceYears: number|null,
 *   skills: Array<{ skillId: string, name: string, importance: 'Must'|'Should'|'Nice', foundIn: string }>,
 *   cleanedText: string
 * }}
 */
export function parseJobDescription(rawText = '', taxonomy = TAXONOMY) {
  const text = (rawText || '').trim()
  if (!text) {
    return {
      title: 'Job Opening',
      location: null,
      workMode: null,
      minExperienceYears: null,
      skills: [],
      cleanedText: '',
    }
  }

  const cleanedText = cleanText(text)
  const lines = cleanedText.split('\n')

  const title = extractTitle(lines)
  const location = extractLocation(lines)
  const workMode = extractWorkMode(cleanedText)
  const minExperienceYears = extractMinExperienceYears(cleanedText)

  // Section heading importance detector
  const isNiceHeading = (l) =>
    l.length < 60 &&
    /\b(?:nice\s+to\s+have|preferred|bonus|plus|desired|optional|what\s+would\s+be\s+nice|additional\s+skills)\b/i.test(
      l
    )

  const isMustHeading = (l) =>
    l.length < 60 &&
    !isNiceHeading(l) &&
    /\b(?:requirements?|required|must\s+have|qualifications?|core\s+competencies|minimum\s+requirements|what\s+you\s+need|what\s+we\s+look\s+for|essential\s+skills)\b/i.test(
      l
    )

  const isNeutralHeading = (l) =>
    l.length < 60 &&
    /\b(?:responsibilities|what\s+you'll\s+do|about\s+the\s+role|about\s+the\s+team|overview|summary)\b/i.test(
      l
    )

  // Map from normalized skillId -> parsed skill object
  const skillMap = new Map()

  let currentHeadingImportance = 'Should'

  // Precompile taxonomy alias matchers
  const taxonomyMatchers = (taxonomy || TAXONOMY).map((item) => {
    const aliases = item.aliases && item.aliases.length > 0 ? item.aliases : [item.name.toLowerCase()]
    const allAliases = Array.from(new Set([item.name, ...aliases]))

    const matchers = allAliases.flatMap((alias) => {
      // For short aliases (<= 2 chars), include both uppercase and exact alias forms
      if (alias.length <= 2) {
        const set = new Set([alias, alias.toUpperCase()])
        return Array.from(set).map((a) => ({
          alias: a,
          regex: buildAliasRegex(a),
        }))
      }
      return [
        {
          alias,
          regex: buildAliasRegex(alias),
        },
      ]
    })

    return {
      id: item.id || getSkillId(item.name),
      name: item.name,
      matchers,
    }
  })

  // Iterate over lines to track heading context and line-level cues
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    // Check if line represents a new heading (bullet points are never section headings)
    const isBullet = /^[-*•\d.)]/.test(trimmedLine)
    const cleanHeader = trimmedLine.replace(/^[#* \t-]+/, '').trim()

    if (!isBullet) {
      if (isMustHeading(cleanHeader)) {
        currentHeadingImportance = 'Must'
        continue
      } else if (isNiceHeading(cleanHeader)) {
        currentHeadingImportance = 'Nice'
        continue
      } else if (isNeutralHeading(cleanHeader)) {
        currentHeadingImportance = 'Should'
        continue
      }
    }

    // Determine same-line cue
    let lineImportance = currentHeadingImportance
    if (/\b(?:must|required|essential|mandatory|need\s+to\s+have|core)\b/i.test(trimmedLine)) {
      lineImportance = 'Must'
    } else if (/\b(?:preferred|nice\s+to\s+have|bonus|plus|optional|advantageous|helpful)\b/i.test(trimmedLine)) {
      lineImportance = 'Nice'
    }

    // Check each taxonomy skill
    for (const skillItem of taxonomyMatchers) {
      let matched = false
      for (const m of skillItem.matchers) {
        if (m.regex.test(trimmedLine)) {
          matched = true
          break
        }
      }

      if (matched) {
        const sentence = cleanSentence(trimmedLine)
        const existing = skillMap.get(skillItem.id)

        if (!existing) {
          skillMap.set(skillItem.id, {
            skillId: skillItem.id,
            name: skillItem.name,
            importance: lineImportance,
            foundIn: sentence,
          })
        } else {
          // Deduplicate keeping highest importance: Must > Should > Nice
          const existingWeight = IMPORTANCE_WEIGHTS[existing.importance] || 2
          const newWeight = IMPORTANCE_WEIGHTS[lineImportance] || 2
          if (newWeight > existingWeight) {
            skillMap.set(skillItem.id, {
              ...existing,
              importance: lineImportance,
              foundIn: sentence,
            })
          }
        }
      }
    }
  }

  // Convert map to array and sort by importance: Must (3) > Should (2) > Nice (1)
  const skillsArray = Array.from(skillMap.values())
  skillsArray.sort((a, b) => {
    const wa = IMPORTANCE_WEIGHTS[a.importance] || 2
    const wb = IMPORTANCE_WEIGHTS[b.importance] || 2
    return wb - wa
  })

  // Limit to max 15 skills
  const skills = skillsArray.slice(0, 15)

  return {
    title,
    location,
    workMode,
    minExperienceYears,
    skills,
    cleanedText,
  }
}
