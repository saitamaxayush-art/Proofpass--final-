import assert from 'node:assert'
import { parseProfileLink } from '../src/utils/parseProfileLink.js'

const testCases = [
  {
    input: 'https://codeforces.com/profile/tourist',
    expected: { platform: 'codeforces', handle: 'tourist' },
  },
  {
    input: 'codeforces.com/profile/Um_nik/',
    expected: { platform: 'codeforces', handle: 'Um_nik' },
  },
  {
    input: 'https://www.codeforces.com/profile/tourist?x=1',
    expected: { platform: 'codeforces', handle: 'tourist' },
  },
  {
    input: 'https://codeforces.com/contests',
    expected: { error: 'no_handle' },
  },
  {
    input: 'https://leetcode.com/u/neal_wu/',
    expected: { platform: 'leetcode', handle: 'neal_wu' },
  },
  {
    input: 'https://leetcode.com/neal_wu',
    expected: { platform: 'leetcode', handle: 'neal_wu' },
  },
  {
    input: 'https://leetcode.com/problems/two-sum',
    expected: { error: 'no_handle' },
  },
  {
    input: 'https://leetcode.cn/u/someone',
    expected: { error: 'unsupported' },
  },
  {
    input: 'https://github.com/someone',
    expected: { error: 'unsupported' },
  },
  {
    input: 'tourist',
    expected: { error: 'unsupported' },
  },
]

let passed = 0
let failed = 0

console.log('Running test cases for parseProfileLink...\n')

for (const { input, expected } of testCases) {
  const result = parseProfileLink(input)
  try {
    if (expected.error) {
      assert.strictEqual(
        result.error,
        expected.error,
        `Expected error "${expected.error}", got "${result.error}"`
      )
    } else {
      assert.strictEqual(
        result.platform,
        expected.platform,
        `Expected platform "${expected.platform}", got "${result.platform}"`
      )
      assert.strictEqual(
        result.handle,
        expected.handle,
        `Expected handle "${expected.handle}", got "${result.handle}"`
      )
    }
    console.log(`[PASS] ${input} -> ${JSON.stringify(result)}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${input}: ${err.message}`)
    failed++
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`)
if (failed > 0) {
  process.exit(1)
}
