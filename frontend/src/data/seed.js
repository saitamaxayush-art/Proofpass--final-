/**
 * Seed Data for ProofPass Prototype
 * Includes 4 sample roles (labelled "Sample role") and 10 sample applicants per role
 * (7 with a cryptographically verified passport, 3 resume-only).
 */

export const SAMPLE_ROLES = [
  {
    id: 'role-fullstack-ts',
    title: 'Senior Full Stack TypeScript Engineer',
    company: 'Veloce Systems (Sample role)',
    isSample: true,
    description:
      'We are looking for an experienced Full Stack Engineer to lead technical design and implementation of customer-facing dashboards and high-throughput REST APIs using TypeScript, React, and Node.js. Requires proven commit history and clean test suites.',
    requiredSkills: [
      { skill: 'React', importance: 'Must', weight: 3 },
      { skill: 'TypeScript', importance: 'Must', weight: 3 },
      { skill: 'REST APIs', importance: 'Must', weight: 3 },
      { skill: 'Testing', importance: 'Should', weight: 2 },
      { skill: 'Docker', importance: 'Should', weight: 2 },
      { skill: 'PostgreSQL', importance: 'Nice', weight: 1 },
      { skill: 'Git workflow', importance: 'Must', weight: 3 },
    ],
    demoCv: 'ALEX RIVERA\nFull Stack Engineer\nTypeScript, React, Node.js, REST APIs, Docker, PostgreSQL\n4+ years production experience with automated test suites.',
  },
  {
    id: 'role-backend-py',
    title: 'Backend Python & Cloud Engineer',
    company: 'Strata Cloud Services (Sample role)',
    isSample: true,
    description:
      'Building asynchronous data processing pipelines and microservices in Python. We require verified experience with PostgreSQL relational indexing, Dockerized deployment workflows, and secure AWS cloud integrations.',
    requiredSkills: [
      { skill: 'Python', importance: 'Must', weight: 3 },
      { skill: 'PostgreSQL', importance: 'Must', weight: 3 },
      { skill: 'REST APIs', importance: 'Must', weight: 3 },
      { skill: 'Docker', importance: 'Should', weight: 2 },
      { skill: 'AWS', importance: 'Should', weight: 2 },
      { skill: 'Testing', importance: 'Should', weight: 2 },
      { skill: 'System design', importance: 'Nice', weight: 1 },
    ],
    demoCv: 'JORDAN CHEN\nBackend Python Developer\nPython, FastAPI, PostgreSQL, Redis, Docker, AWS Lambda\nBuilt microservices handling 25,000 req/sec.',
  },
  {
    id: 'role-frontend-eng',
    title: 'Frontend Systems Engineer (React)',
    company: 'Prism Interface Lab (Sample role)',
    isSample: true,
    description:
      'Seeking a frontend systems engineer to build accessible, fluid, and robust user interfaces. Deep React architecture, strict TypeScript typing, state isolation hooks, and automated component testing are critical requirements.',
    requiredSkills: [
      { skill: 'React', importance: 'Must', weight: 3 },
      { skill: 'TypeScript', importance: 'Must', weight: 3 },
      { skill: 'JavaScript', importance: 'Must', weight: 3 },
      { skill: 'Testing', importance: 'Should', weight: 2 },
      { skill: 'System design', importance: 'Should', weight: 2 },
      { skill: 'Git workflow', importance: 'Nice', weight: 1 },
    ],
    demoCv: 'SAMIRA PATEL\nFrontend Engineer\nReact, TypeScript, Next.js, Redux, Tailwind, Jest\nSpecializing in high-performance web components and design systems.',
  },
  {
    id: 'role-devops-infra',
    title: 'DevOps & Infrastructure Engineer',
    company: 'Aether Cloud Infrastructure (Sample role)',
    isSample: true,
    description:
      'Responsible for automated CI/CD deployment pipelines, container orchestration with Kubernetes, Docker multi-stage builds, and AWS cloud security compliance across multiple environments.',
    requiredSkills: [
      { skill: 'Docker', importance: 'Must', weight: 3 },
      { skill: 'Kubernetes', importance: 'Must', weight: 3 },
      { skill: 'AWS', importance: 'Must', weight: 3 },
      { skill: 'Git workflow', importance: 'Must', weight: 3 },
      { skill: 'Python', importance: 'Should', weight: 2 },
      { skill: 'System design', importance: 'Should', weight: 2 },
    ],
    demoCv: 'MARCUS VANCE\nSite Reliability & DevOps Engineer\nDocker, Kubernetes, AWS Terraform, Git CI/CD, Python scripting\nAutomating cloud infrastructure.',
  },
]

// Generator for 10 candidates per role (7 with passports, 3 resume-only)
export function generateSampleApplicants() {
  const applicants = []

  const CANDIDATE_PROFILES = [
    // Full Stack TS candidates
    {
      roleId: 'role-fullstack-ts',
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      hasPassport: true,
      skills: [
        { skill: 'React', state: 'V', level: 3, evidence: 'src/components/Dashboard.tsx (88% line share, 64 commits)', why: 'Code verified with passed micro-check on custom hook architecture.' },
        { skill: 'TypeScript', state: 'V', level: 3, evidence: 'tsconfig.json, 31 files (92% line share, 82 commits)', why: 'Strict type invariants enforced across all domain models.' },
        { skill: 'REST APIs', state: 'V', level: 3, evidence: 'server/routes/orders.ts (78% line share, 34 commits)', why: 'Implemented authenticated Express route handlers and error middleware.' },
        { skill: 'Testing', state: 'S', level: 2, evidence: 'src/tests/app.test.ts (6 test files, no automated CI run)', why: 'Unit tests exist in repo, but automated CI integration was not verified.' },
        { skill: 'Docker', state: 'V', level: 2, evidence: 'Dockerfile, docker-compose.yml (multi-stage build)', why: 'Production container setup verified in candidate repository.' },
        { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'db/schema.sql (relational tables, 140 lines)', why: 'DDL schemas found; complex queries and indexes partially verified.' },
        { skill: 'Git workflow', state: 'V', level: 3, evidence: '212 commits over 5 months, merged PRs', why: 'Consistent semantic commit history and clean branch hygiene.' },
        { skill: 'Kubernetes', state: 'X', level: 1, evidence: 'k8s/tutorial (forked repository, 0 original commits)', why: 'Contradicted: Claimed on resume but source repository is an unedited fork.' },
      ],
    },
    {
      roleId: 'role-fullstack-ts',
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      hasPassport: true,
      skills: [
        { skill: 'React', state: 'V', level: 3, evidence: 'web/App.tsx, 42 component files, 91% author share', why: 'Primary author of modern React frontend with micro-check confirmed.' },
        { skill: 'TypeScript', state: 'V', level: 4, evidence: 'packages/types, strict generics, 48 files', why: 'Deep type-system usage with automated lint validations.' },
        { skill: 'REST APIs', state: 'S', level: 2, evidence: 'api/client.ts, Axios wrapper routes', why: 'Client-side API consumption verified; server route authorship is partial.' },
        { skill: 'Testing', state: 'V', level: 3, evidence: 'tests/integration.test.ts, GitHub Actions CI workflow', why: '100% CI pass rate with Jest and React Testing Library.' },
        { skill: 'Docker', state: 'C', level: 1, evidence: 'Claimed on resume; no Dockerfile found in public repos', why: 'Claimed: Mentioned on resume, but no container config in repo.' },
        { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'migrations/001_init.sql, 3 tables', why: 'Initial migration committed; production indexing is partial.' },
        { skill: 'Git workflow', state: 'V', level: 3, evidence: '184 commits across 4 repositories', why: 'Original branch management with peer-reviewed PRs.' },
      ],
    },
    {
      roleId: 'role-fullstack-ts',
      name: 'Kavita Nair',
      email: 'kavita.nair@example.com',
      hasPassport: true,
      skills: [
        { skill: 'React', state: 'V', level: 3, evidence: 'src/pages/Catalog.tsx (84% line share)', why: 'Passed micro-check and verified original component authorship.' },
        { skill: 'TypeScript', state: 'S', level: 2, evidence: 'Mixed .ts and .js files, relaxed tsconfig', why: 'Supported: Typescript present but strict compiler flags disabled.' },
        { skill: 'REST APIs', state: 'V', level: 3, evidence: 'routes/api.ts, JWT auth middleware', why: 'Secure REST endpoints with request validation.' },
        { skill: 'Testing', state: 'S', level: 2, evidence: 'test/api.spec.js (8 assertions)', why: 'Supported: Basic test assertions; coverage threshold not enforced.' },
        { skill: 'Docker', state: 'S', level: 2, evidence: 'docker-compose.dev.yml (single container)', why: 'Development compose verified; multi-stage production build missing.' },
        { skill: 'PostgreSQL', state: 'C', level: 1, evidence: 'On resume; no database configuration in repo', why: 'Claimed: Relational database skills not evident in public repositories.' },
        { skill: 'Git workflow', state: 'V', level: 2, evidence: '96 commits over 3 months', why: 'Regular commit velocity with clear feature branches.' },
      ],
    },
    {
      roleId: 'role-fullstack-ts',
      name: 'Devon Miller',
      email: 'devon.miller@example.com',
      hasPassport: true,
      skills: [
        { skill: 'React', state: 'S', level: 2, evidence: 'components/Home.jsx (partial component lines)', why: 'Supported: Component edits found; primary authorship is collaborative.' },
        { skill: 'TypeScript', state: 'S', level: 2, evidence: 'src/types.ts (interface definitions)', why: 'Supported: Interface types defined; generics usage is basic.' },
        { skill: 'REST APIs', state: 'V', level: 3, evidence: 'src/controllers/user.ts (clean CRUD operations)', why: 'REST endpoints verified with comprehensive parameter sanitization.' },
        { skill: 'Testing', state: 'C', level: 1, evidence: 'Claimed on resume; zero test files found', why: 'Claimed: Testing claimed on CV, but no test runners configured.' },
        { skill: 'Docker', state: 'V', level: 2, evidence: 'Dockerfile (alpine multi-stage node runtime)', why: 'Optimized production image configuration verified.' },
        { skill: 'PostgreSQL', state: 'V', level: 3, evidence: 'db/queries.sql, indexed foreign keys', why: 'Complex multi-table queries with explicit composite indexes.' },
        { skill: 'Git workflow', state: 'S', level: 2, evidence: '42 commits, mostly direct to main', why: 'Supported: Solid code volume, but minimal PR review workflow.' },
      ],
    },
    {
      roleId: 'role-fullstack-ts',
      name: 'Sofia Al-Mansoor',
      email: 'sofia.almansoor@example.com',
      hasPassport: true,
      skills: [
        { skill: 'React', state: 'V', level: 4, evidence: 'ui/src/hooks/useVirtualizer.ts (custom virtual scroll)', why: 'Advanced component performance and custom hooks verified.' },
        { skill: 'TypeScript', state: 'V', level: 4, evidence: 'Strict tsconfig, custom generic builders, 60+ files', why: 'Zero any types, strict null checks, and mapped type utilities.' },
        { skill: 'REST APIs', state: 'V', level: 3, evidence: 'services/api/index.ts, OpenAPI schema generator', why: 'Contract-first REST API development verified.' },
        { skill: 'Testing', state: 'V', level: 3, evidence: 'tests/e2e, Playwright and Vitest test suites', why: 'Both unit and browser integration tests verified with CI.' },
        { skill: 'Docker', state: 'S', level: 2, evidence: 'build/Dockerfile (single stage)', why: 'Basic container build file present in repository.' },
        { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'sql/schema.sql (4 tables)', why: 'Basic relational tables with primary keys verified.' },
        { skill: 'Git workflow', state: 'V', level: 4, evidence: '340 commits, squash-merge PR strategy', why: 'Exemplary git hygiene with semantic release automation.' },
      ],
    },
    {
      roleId: 'role-fullstack-ts',
      name: 'Hiroshi Tanaka',
      email: 'hiroshi.tanaka@example.com',
      hasPassport: true,
      skills: [
        { skill: 'React', state: 'S', level: 2, evidence: 'src/App.tsx (220 lines, hooks present)', why: 'Solid code, pending micro-check validation for state upgrade.' },
        { skill: 'TypeScript', state: 'S', level: 2, evidence: 'src/models.ts, basic types', why: 'Basic types used; utility types not yet demonstrated in code.' },
        { skill: 'REST APIs', state: 'S', level: 2, evidence: 'routes/items.ts (CRUD handlers)', why: 'Standard Express endpoints without auth middleware.' },
        { skill: 'Testing', state: 'C', level: 1, evidence: 'Mentioned on resume; no test files in repo', why: 'Claimed: Testing mentioned on resume but not found in repo.' },
        { skill: 'Docker', state: 'C', level: 1, evidence: 'Resume claim with no container manifests', why: 'Claimed: No Dockerfile or compose file in project.' },
        { skill: 'PostgreSQL', state: 'C', level: 1, evidence: 'Resume claim with no SQL files', why: 'Claimed: Relational database usage unverified in codebase.' },
        { skill: 'Git workflow', state: 'V', level: 2, evidence: '78 commits over 2 months', why: 'Consistent personal project development history.' },
      ],
    },
    {
      roleId: 'role-fullstack-ts',
      name: 'Lucas Silva',
      email: 'lucas.silva@example.com',
      hasPassport: true,
      skills: [
        { skill: 'React', state: 'V', level: 2, evidence: 'components/UI.tsx (76% line share)', why: 'Passed micro-check and verified original component authorship.' },
        { skill: 'TypeScript', state: 'V', level: 2, evidence: 'Strict tsconfig with interface models', why: 'Clean domain typing across application.' },
        { skill: 'REST APIs', state: 'C', level: 1, evidence: 'Claimed on CV; repository is frontend-only', why: 'Claimed: No backend API implementation present in repository.' },
        { skill: 'Testing', state: 'S', level: 2, evidence: 'tests/render.test.tsx (3 tests)', why: 'Component rendering tests present; coverage is introductory.' },
        { skill: 'Docker', state: 'C', level: 1, evidence: 'Claimed on resume; no dockerfile in repo', why: 'Claimed: Container tools not demonstrated.' },
        { skill: 'PostgreSQL', state: 'C', level: 1, evidence: 'Claimed on resume; no database code', why: 'Claimed: SQL skills unverified in code index.' },
        { skill: 'Git workflow', state: 'V', level: 2, evidence: '64 commits over 3 months', why: 'Regular commit velocity with feature branches.' },
      ],
    },
    // 3 Resume-Only Full Stack candidates
    {
      roleId: 'role-fullstack-ts',
      name: 'Priya Sharma (Resume only)',
      email: 'priya.sharma@example.com',
      hasPassport: false,
      resumeText: 'Priya Sharma\nFull Stack Developer (3 years)\nReact, TypeScript, Node.js, Express, MongoDB, Jest\nBuilt e-commerce portals and enterprise web applications.',
      skills: [
        { skill: 'React', state: 'C', level: 2, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
        { skill: 'TypeScript', state: 'C', level: 2, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
        { skill: 'REST APIs', state: 'C', level: 2, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
        { skill: 'Testing', state: 'C', level: 1, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
        { skill: 'Docker', state: 'C', level: 1, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
      ],
    },
    {
      roleId: 'role-fullstack-ts',
      name: 'Liam O’Connor (Resume only)',
      email: 'liam.oconnor@example.com',
      hasPassport: false,
      resumeText: 'Liam O’Connor\nWeb Software Engineer\nReact, JavaScript, HTML5, CSS3, REST APIs, Git\nFrontend specialist with background in creative agency delivery.',
      skills: [
        { skill: 'React', state: 'C', level: 2, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
        { skill: 'TypeScript', state: 'C', level: 1, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
        { skill: 'REST APIs', state: 'C', level: 1, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
        { skill: 'Git workflow', state: 'C', level: 2, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
      ],
    },
    {
      roleId: 'role-fullstack-ts',
      name: 'Zoe Martinez (Resume only)',
      email: 'zoe.martinez@example.com',
      hasPassport: false,
      resumeText: 'Zoe Martinez\nJunior Full Stack Engineer\nReact, TypeScript, Node.js, PostgreSQL, Docker\nRecent computer science graduate with several academic projects.',
      skills: [
        { skill: 'React', state: 'C', level: 1, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
        { skill: 'TypeScript', state: 'C', level: 1, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
        { skill: 'REST APIs', state: 'C', level: 1, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
        { skill: 'PostgreSQL', state: 'C', level: 1, evidence: 'Resume only; no public repository attached', why: 'Claimed: Resume-only candidate. Capped at Claimed per trust ceiling.' },
      ],
    },
  ]

  // Add sample candidates for the other 3 roles to ensure each has 10 applicants
  const OTHER_ROLES = ['role-backend-py', 'role-frontend-eng', 'role-devops-infra']
  OTHER_ROLES.forEach((rId) => {
    for (let i = 1; i <= 7; i++) {
      CANDIDATE_PROFILES.push({
        roleId: rId,
        name: `Candidate ${rId.split('-')[1].toUpperCase()} ${i}`,
        email: `candidate.${rId}.${i}@example.com`,
        hasPassport: true,
        skills: [
          { skill: rId === 'role-backend-py' ? 'Python' : rId === 'role-frontend-eng' ? 'React' : 'Docker', state: i <= 4 ? 'V' : 'S', level: i <= 2 ? 3 : 2, evidence: 'Verified codebase commits with passed micro-check', why: 'Original author verified in repository index.' },
          { skill: rId === 'role-backend-py' ? 'PostgreSQL' : rId === 'role-frontend-eng' ? 'TypeScript' : 'Kubernetes', state: i % 2 === 0 ? 'V' : 'S', level: 2, evidence: 'Source files verified on disk with git history', why: 'Evidence confirmed through repository inspection.' },
          { skill: 'REST APIs', state: i <= 5 ? 'V' : 'C', level: 2, evidence: 'Endpoint controllers and routing manifests', why: 'HTTP endpoint logic confirmed in codebase.' },
          { skill: 'Git workflow', state: 'V', level: 3, evidence: 'Over 120 commits across verified branches', why: 'Continuous commit velocity confirmed.' },
          { skill: 'Testing', state: i <= 3 ? 'V' : 'S', level: 2, evidence: 'Automated test suite with assertions', why: 'Test suites isolated external network calls.' },
          { skill: 'System design', state: i === 1 ? 'S' : 'C', level: 1, evidence: 'Architectural documentation in README', why: 'Conceptual design notes found in repository.' },
        ],
      })
    }
    // 3 Resume-only
    for (let i = 8; i <= 10; i++) {
      CANDIDATE_PROFILES.push({
        roleId: rId,
        name: `Applicant ${rId.split('-')[1].toUpperCase()} ${i} (Resume only)`,
        email: `resume.candidate.${rId}.${i}@example.com`,
        hasPassport: false,
        resumeText: `Applicant ${i}\nSkills: Python, React, Cloud, Databases\nExperience: 2 years software delivery.\nEducation: B.Tech Computer Science.`,
        skills: [
          { skill: 'Python', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only candidate capped at Claimed.' },
          { skill: 'REST APIs', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only candidate capped at Claimed.' },
          { skill: 'Docker', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only candidate capped at Claimed.' },
        ],
      })
    }
  })

  // Format full applicant records with mock SHA-256 passports
  CANDIDATE_PROFILES.forEach((cand, idx) => {
    const id = `cand-${cand.roleId}-${idx + 1}`
    const applicant = {
      id,
      name: cand.name,
      email: cand.email,
      roleId: cand.roleId,
      hasPassport: cand.hasPassport,
      resumeText: cand.resumeText || '',
      githubUrl: cand.hasPassport ? `https://github.com/${cand.name.toLowerCase().replace(/[^a-z]/g, '')}` : '',
      leetcodeUrl: '',
      certificateUrls: '',
      targetRole: SAMPLE_ROLES.find((r) => r.id === cand.roleId)?.title || 'Software Engineer',
    }

    if (cand.hasPassport) {
      const passportId = `PP-2026-${1000 + idx}`
      applicant.passport = {
        id: passportId,
        candidate: cand.name,
        targetRole: applicant.targetRole,
        issuedAt: new Date(Date.now() - (idx + 1) * 86400000 * 2).toISOString(),
        hash: `a1b2c3d4e5f6${idx}890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`,
        revoked: false,
        skills: cand.skills.map((s) => ({
          skill: s.skill,
          state: s.state,
          level: s.level,
          evidence: s.evidence,
          rationale: s.why,
          lineShare: s.state === 'V' ? 88 : s.state === 'S' ? 55 : 0,
        })),
      }
    } else {
      applicant.skills = cand.skills
    }

    applicants.push(applicant)
  })

  return applicants
}
