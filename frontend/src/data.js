export const L = { V: 'Verified', S: 'Supported', C: 'Claimed', X: 'Contradicted', U: 'Missing' }
export const Wt = { V: 1, S: 0.6, C: 0.2, U: 0, X: 0 }
export const R = { React: 3, TypeScript: 2, 'REST APIs': 2, Testing: 2, Docker: 1, 'System design': 2 }

const k = (n, s, ev, q) => ({ n, s, ev, q })
export const DATA = {
  A: [
    k('React', 'S', 'src/components/Dashboard.tsx, 82% of lines across 14 files, hooks in 9 files', 'In commit a1b2c3d you moved state out of Dashboard into a custom hook. Why?'),
    k('TypeScript', 'V', 'strict tsconfig, 31 files, 88% of lines'),
    k('REST APIs', 'V', 'server/routes/orders.ts, auth middleware in server/auth.ts'),
    k('Testing', 'S', '6 test files, no CI config found', 'In api.test.ts you mock the API client. What does that mock let you skip?'),
    k('Git workflow', 'V', '212 commits over 5 months, merged pull requests'),
    k('Docker', 'C', 'On the resume, no Dockerfile in any repository'),
    k('Kubernetes', 'X', 'On the resume, only repository is a fork of a tutorial, 0 original commits'),
  ],
  B: [
    k('React', 'V', 'web/src/App.tsx, 91% of lines'),
    k('TypeScript', 'S', 'Some .ts files, strict mode off'),
    k('REST APIs', 'C', 'On the resume, no server code found'),
    k('Testing', 'V', 'CI workflow runs tests on every push'),
    k('Docker', 'V', 'Dockerfile and docker-compose.yml, multi-stage build'),
    k('System design', 'S', 'Hackathon certificate, design doc found, no running system', 'Your design doc describes a rate limiter. Which part did you build?'),
  ],
}

export const STEPS = [
  'Reading resume and repository',
  'Language model proposes skills with evidence pointers',
  'Checking evidence exists and is unchanged',
  'Checking authorship and usage depth',
  'Assigning trust ceilings and states',
]
export const FLOW = [
  ['Read', 'You provide a resume, a GitHub link or project ZIP, optional certificates, and a target role.'],
  ['Propose', 'A language model suggests skills and points to the files that show them. Suggestions only, never final.'],
  ['Check evidence', 'Plain code confirms each file exists and is unchanged.'],
  ['Check authorship', 'Commit history shows who wrote the code and how deeply the skill is used.'],
  ['Assign states', 'The evidence source sets the highest trust a skill can reach. The passport is then hashed.'],
]
export const STATES = [
  ['V', 'Code exists, authorship is confirmed, and the micro-check was passed.'],
  ['S', 'Code exists, but authorship or depth is unclear. One micro-check from Verified.'],
  ['C', 'The resume mentions it and no evidence was found. Not penalised.'],
  ['X', 'The resume claims it and the evidence conflicts, such as a forked tutorial repository.'],
]
export const VIEWS = {
  Candidate: ['See your gaps and close them with proof', 'Your gaps, ranked by how much each one moves your match.', ['Micro-checks run on your own commits', 'A learning plan whose tasks create verifiable evidence', 'Share by link and revoke at any time']],
  Recruiter: ['Read verified skills, red flags and interview questions', 'Everything on one screen, with the evidence behind every label.', ['No single hire score, by design', 'Names hidden when candidates are compared', 'A tamper check on every passport']],
  'Placement cell': ['See where claims outrun evidence', 'A skill by state view of what a whole batch can prove.', ['Counts per skill and per state', 'Spot gaps before recruiters do', 'Plan workshops around real evidence gaps']],
}

export const PIPELINE = [
  { h: 'Read', p: 'The resume, a GitHub profile or project ZIP, and any certificates come in together with a target role.', by: 'You' },
  { h: 'Propose', p: 'A language model suggests skills and points at the files that might show them. These are suggestions only.', by: 'Model' },
  { h: 'Check files', p: 'Plain code confirms that each file exists and has not changed since it was committed.', by: 'Code' },
  { h: 'Check authorship', p: 'Commit history shows who wrote the code and how deeply the skill is used.', by: 'Code' },
  { h: 'Assign states', p: 'The evidence source sets the highest state a skill can reach. A resume alone never gets past Claimed.', by: 'Code' },
  { h: 'Micro-check', p: 'Supported skills get one short question written from the candidate\'s own code.', by: 'You' },
  { h: 'Match to the role', p: 'Skills are weighted by state and ranked against the role, with a gap list that shows what to prove next.', by: 'Code' },
  { h: 'Issue the passport', p: 'The result is sealed with a SHA-256 hash, so anyone can re-verify that it was not edited.', by: 'Code' },
]

export const WEIGHTS = { V: 100, S: 60, C: 20, X: 0 }

export const SOURCES = {
  resume: { label: 'Resume only', ceiling: 20, note: 'Nothing to check against. The skill stays Claimed and is not penalised.' },
  code: { label: 'Code on GitHub', ceiling: 80, note: 'Files exist and the commit history shows the candidate wrote them.' },
  fork: { label: 'Forked tutorial', ceiling: 0, note: 'The repository is a fork with no original commits, so the evidence conflicts with the claim.' },
}
