/**
 * Catalog Link Checker Script
 * Sends HTTP HEAD requests to every catalog URL in src/recommendations/catalog.json
 * and reports successes and failures.
 *
 * Usage: node scripts/check-links.js
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dns from 'node:dns'

// Force IPv4 first to avoid IPv6 resolution hang on dual-stack environments
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const catalogPath = path.resolve(__dirname, '../frontend/src/recommendations/catalog.json')
const configPath = path.resolve(__dirname, '../frontend/src/recommendations/config.js')

if (!fs.existsSync(catalogPath)) {
  console.error(`Catalog file not found at: ${catalogPath}`)
  process.exit(1)
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))

// Collect unique URLs
const itemsToCheck = []
const seenUrls = new Set()

for (const [skill, resources] of Object.entries(catalog)) {
  for (const res of resources) {
    if (res.url && !seenUrls.has(res.url)) {
      seenUrls.add(res.url)
      itemsToCheck.push({
        skill,
        title: res.title,
        provider: res.provider,
        url: res.url,
      })
    }
  }
}

// Add IMOCHA_URL from config if exists
try {
  const configText = fs.readFileSync(configPath, 'utf8')
  const match = configText.match(/IMOCHA_URL\s*=\s*['"]([^'"]+)['"]/)
  if (match && match[1] && !seenUrls.has(match[1])) {
    seenUrls.add(match[1])
    itemsToCheck.push({
      skill: 'Global Assessment',
      title: 'iMocha Assessment Platform',
      provider: 'iMocha',
      url: match[1],
    })
  }
} catch {
  // Config read non-blocking
}

console.log(`Checking ${itemsToCheck.length} unique catalog URLs via HTTP HEAD...\n`)

let passedCount = 0
let failedCount = 0
const failures = []

async function checkUrl(item) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ProofPass-LinkChecker/2.0',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  }

  try {
    let res = await fetch(item.url, {
      method: 'HEAD',
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })

    // If server rejects HEAD with 405 Method Not Allowed, fallback to minimal GET
    if (res.status === 405 || res.status === 403) {
      res = await fetch(item.url, {
        method: 'GET',
        headers: { ...headers, Range: 'bytes=0-100' },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      })
    }

    if (res.status >= 200 && res.status < 400) {
      console.log(`[PASS ${res.status}] ${item.skill.padEnd(16)} | ${item.provider.padEnd(20)} | ${item.url}`)
      passedCount++
    } else {
      console.error(`[FAIL ${res.status}] ${item.skill.padEnd(16)} | ${item.provider.padEnd(20)} | ${item.url}`)
      failedCount++
      failures.push({ ...item, status: res.status, error: `HTTP ${res.status}` })
    }
  } catch (err) {
    console.error(`[FAIL ERR] ${item.skill.padEnd(16)} | ${item.provider.padEnd(20)} | ${item.url} -> ${err.message}`)
    failedCount++
    failures.push({ ...item, status: 'ERROR', error: err.message })
  }
}

async function runAll() {
  for (const item of itemsToCheck) {
    await checkUrl(item)
  }

  console.log('\n------------------------------------------------------------')
  console.log(`Link Check Results: ${passedCount} passed, ${failedCount} failed of ${itemsToCheck.length} total.`)
  console.log('------------------------------------------------------------\n')

  if (failedCount > 0) {
    console.error('Failed URLs:')
    failures.forEach((f) => {
      console.error(` - [${f.status}] ${f.skill} (${f.provider}): ${f.url} (${f.error})`)
    })
    process.exit(1)
  } else {
    console.log('All catalog URLs verified successfully.')
    process.exit(0)
  }
}

runAll()
