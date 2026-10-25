/**
 * Seed Data for ProofPass Prototype
 * Includes 4 sample roles in their existing order, and deterministic applicants per role:
 * - Role 1 (role-fullstack-ts): 14 applicants (11 with passport, 3 resume only). Scores skew high.
 * - Role 2 (role-backend-py): 9 applicants (6 with passport, 3 resume only). Scores in the middle.
 * - Role 3 (role-frontend-eng): 18 applicants (12 with passport, 6 resume only). Wide spread from low to high.
 * - Role 4 (role-devops-infra): 6 applicants (5 with passport, 1 resume only). Scores on the lower side.
 *
 * Each passport has between 5 and 11 skills with different state mixes.
 * Includes exact match-score ties across multiple roles.
 * Every candidate name is unique across all roles.
 * No Math.random: completely deterministic on every reload.
 */

import { getConfidence } from '../lib/confidence.js'

export const SEED_VERSION = 3

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

const CANDIDATE_PROFILES = [
  // --- ROLE 1: Senior Full Stack TypeScript Engineer (14 applicants: 11 with passport, 3 resume only) ---
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
      { skill: 'Docker', state: 'V', level: 3, evidence: 'Dockerfile (multi-stage alpine build with layer caching)', why: 'Production container setup verified in candidate repository.' },
      { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'sql/schema.sql (12 indexed tables, 4 migrations)', why: 'Basic relational tables with primary keys verified.' },
      { skill: 'Git workflow', state: 'V', level: 4, evidence: '340 commits, squash-merge PR strategy', why: 'Exemplary git hygiene with semantic release automation.' },
      { skill: 'GraphQL', state: 'V', level: 3, evidence: 'schema.graphql, Apollo client integration', why: 'Type-safe GraphQL resolvers and queries.' },
      { skill: 'Redis', state: 'S', level: 2, evidence: 'cache/redis.ts session management', why: 'In-memory caching implementation verified.' },
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
      { skill: 'REST APIs', state: 'V', level: 3, evidence: 'api/server.ts, Express route handlers', why: 'REST endpoints verified with comprehensive parameter sanitization.' },
      { skill: 'Testing', state: 'V', level: 3, evidence: 'tests/integration.test.ts, GitHub Actions CI workflow', why: '100% CI pass rate with Jest and React Testing Library.' },
      { skill: 'Docker', state: 'S', level: 2, evidence: 'docker-compose.yml with development service links', why: 'Containerized development environment verified.' },
      { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'migrations/001_init.sql, 3 tables', why: 'Initial migration committed; production indexing is partial.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '184 commits across 4 repositories', why: 'Original branch management with peer-reviewed PRs.' },
      { skill: 'Node.js', state: 'V', level: 3, evidence: 'server/app.ts (event-driven microservice runtime)', why: 'Production Node.js service architecture verified.' },
    ],
  },
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
    name: 'Marcus Vance',
    email: 'marcus.vance@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'V', level: 3, evidence: 'src/App.tsx, state management via Zustand', why: 'Clean component structure and reactive stores verified.' },
      { skill: 'TypeScript', state: 'V', level: 3, evidence: 'src/types/domain.ts with discriminated unions', why: 'Strict type safety across domain boundaries.' },
      { skill: 'REST APIs', state: 'S', level: 2, evidence: 'api/endpoints.ts (wrapper over external APIs)', why: 'Client-side API consumption verified; server route authorship is partial.' },
      { skill: 'Testing', state: 'V', level: 3, evidence: 'vitest.config.ts, 48 unit tests passing', why: 'Automated test suite execution verified in CI.' },
      { skill: 'Docker', state: 'V', level: 3, evidence: 'deploy/Dockerfile, multi-stage production runner', why: 'Multi-stage Docker build validated with security scans.' },
      { skill: 'PostgreSQL', state: 'C', level: 1, evidence: 'Claimed on resume; no database code in repositories', why: 'Claimed: Mentioned on resume, but no SQL code committed.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '165 commits over 6 months across 3 active repos', why: 'Continuous git development with structured pull requests.' },
      { skill: 'AWS', state: 'S', level: 2, evidence: 'aws/cdk stack configurations (S3, CloudFront)', why: 'CDK infrastructure code verified in repo.' },
      { skill: 'CI/CD', state: 'V', level: 3, evidence: '.github/workflows/deploy.yml (staging & prod)', why: 'Automated deployment pipelines passing on main branch.' },
    ],
  },
  {
    roleId: 'role-fullstack-ts',
    name: 'Chloe Bennett',
    email: 'chloe.bennett@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'V', level: 3, evidence: 'frontend/src/features/feed (85% authorship)', why: 'Component hierarchy and custom hooks passed micro-check.' },
      { skill: 'TypeScript', state: 'V', level: 3, evidence: 'tsconfig.strict.json with zero any escapes', why: 'Enforced type checking across full client bundle.' },
      { skill: 'REST APIs', state: 'V', level: 3, evidence: 'backend/src/routes/api.ts (RESTful controllers)', why: 'CRUD controllers with validation schemas verified.' },
      { skill: 'Testing', state: 'V', level: 3, evidence: 'tests/unit and tests/integration passing in CI', why: 'Unit and integration tests run on every commit.' },
      { skill: 'Docker', state: 'C', level: 1, evidence: 'Resume claim; no container configuration in public repos', why: 'Claimed: Container technology not evidenced in repos.' },
      { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'sql/init.sql with foreign key constraints', why: 'Relational table structure committed in repository.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '190 commits, feature branches, semantic releases', why: 'Exemplary git workflow with commit squashes.' },
      { skill: 'Redux', state: 'V', level: 3, evidence: 'store/slices (Redux Toolkit configuration)', why: 'Predictable state container architecture verified.' },
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
      { skill: 'REST APIs', state: 'S', level: 2, evidence: 'src/services/api.ts (Axios interceptors & error handlers)', why: 'HTTP client logic verified; backend server logic partial.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'tests/render.test.tsx (12 tests)', why: 'Component rendering tests present; coverage is introductory.' },
      { skill: 'Docker', state: 'S', level: 2, evidence: 'docker-compose.yml with Node and Postgres services', why: 'Development compose setup verified.' },
      { skill: 'PostgreSQL', state: 'V', level: 3, evidence: 'db/queries.sql, indexed foreign keys and join queries', why: 'Complex multi-table queries with explicit composite indexes.' },
      { skill: 'Git workflow', state: 'V', level: 2, evidence: '64 commits over 3 months', why: 'Regular commit velocity with feature branches.' },
      { skill: 'Webpack', state: 'S', level: 2, evidence: 'webpack.config.js asset optimization', why: 'Custom build configuration verified.' },
      { skill: 'Jest', state: 'V', level: 2, evidence: 'jest.config.js snapshot testing', why: 'Snapshot and assertion suites verified.' },
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
      { skill: 'HTML5', state: 'V', level: 3, evidence: 'Semantic HTML markup across all templates', why: 'Accessible landmark elements and aria tags.' },
      { skill: 'CSS3', state: 'V', level: 3, evidence: 'Custom CSS variables and responsive grid layouts', why: 'Modern CSS design system verified.' },
    ],
  },
  {
    roleId: 'role-fullstack-ts',
    name: 'Devon Miller',
    email: 'devon.miller@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'S', level: 2, evidence: 'components/Home.jsx (partial component lines)', why: 'Supported: Component edits found; primary authorship is collaborative.' },
      { skill: 'TypeScript', state: 'V', level: 3, evidence: 'src/types/api.ts (strict domain definitions)', why: 'Type definitions and compiler checks validated.' },
      { skill: 'REST APIs', state: 'V', level: 3, evidence: 'src/controllers/user.ts (clean CRUD operations)', why: 'REST endpoints verified with comprehensive parameter sanitization.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'tests/user.test.ts (basic route tests)', why: 'Unit tests run locally but lack CI integration.' },
      { skill: 'Docker', state: 'V', level: 2, evidence: 'Dockerfile (alpine multi-stage node runtime)', why: 'Optimized production image configuration verified.' },
      { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'sql/tables.sql (basic relational schemas)', why: 'Table creation DDL present without index tuning.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '42 commits, mostly direct to main', why: 'Supported: Solid code volume, but minimal PR review workflow.' },
      { skill: 'MongoDB', state: 'C', level: 1, evidence: 'Claimed on resume; no NoSQL code found', why: 'Claimed: No database configuration in repo.' },
    ],
  },
  {
    roleId: 'role-fullstack-ts',
    name: 'Tariq Mansoor',
    email: 'tariq.mansoor@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'V', level: 3, evidence: 'src/views/Main.tsx (79% line share)', why: 'Component composition and lifecycle management verified.' },
      { skill: 'TypeScript', state: 'V', level: 3, evidence: 'src/contracts.ts (clean interface declarations)', why: 'Strict type validation across API layers.' },
      { skill: 'REST APIs', state: 'V', level: 3, evidence: 'server/api/v1 (Express routers)', why: 'REST endpoints with error-handling middleware.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'tests/spec.js (8 basic assertions)', why: 'Basic assertion suite without coverage gates.' },
      { skill: 'Docker', state: 'S', level: 2, evidence: 'Dockerfile (basic dev container)', why: 'Single-stage container build present.' },
      { skill: 'PostgreSQL', state: 'C', level: 1, evidence: 'Claimed on resume; no SQL files in project', why: 'Claimed: Database knowledge unverified in public code.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '54 commits across 2 branches', why: 'Linear commit history with periodic merges.' },
      { skill: 'Linux', state: 'V', level: 2, evidence: 'scripts/deploy.sh, systemd service units', why: 'Shell scripting and system services verified.' },
      { skill: 'Bash', state: 'S', level: 2, evidence: 'scripts/backup.sh cron automation', why: 'Shell script present in repository.' },
    ],
  },
  {
    roleId: 'role-fullstack-ts',
    name: 'Daniel Kim',
    email: 'daniel.kim@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'S', level: 2, evidence: 'src/components/Table.tsx (collaborative code)', why: 'Supported: React component edits present; partial authorship.' },
      { skill: 'TypeScript', state: 'S', level: 2, evidence: 'src/interfaces.ts with loose compiler options', why: 'TypeScript present but noImplicitAny turned off.' },
      { skill: 'REST APIs', state: 'V', level: 3, evidence: 'server/routes.ts (REST resource handlers)', why: 'Verified route handlers with JSON body validation.' },
      { skill: 'Testing', state: 'V', level: 3, evidence: 'tests/e2e/cypress (14 passed specs)', why: 'E2E browser tests passing in repository.' },
      { skill: 'Docker', state: 'S', level: 2, evidence: 'docker-compose.yml', why: 'Compose file for local microservices.' },
      { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'db/init.sql (table schemas)', why: 'Schema definitions committed.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '110 commits with descriptive messages', why: 'Clean git history with feature branch naming conventions.' },
      { skill: 'Microservices', state: 'S', level: 2, evidence: 'docker-compose multi-service setup', why: 'Inter-service communication demonstrated.' },
    ],
  },
  {
    roleId: 'role-fullstack-ts',
    name: 'Nina Johansson',
    email: 'nina.johansson@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'V', level: 3, evidence: 'src/components/Navigation.tsx, 88% lines', why: 'Verified React component tree.' },
      { skill: 'TypeScript', state: 'V', level: 3, evidence: 'src/types.ts strict null checks enabled', why: 'Strict typing across frontend.' },
      { skill: 'REST APIs', state: 'S', level: 2, evidence: 'src/api/client.ts HTTP wrapper', why: 'Client side fetch calls verified.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'src/tests/nav.test.tsx', why: 'Basic rendering test verified.' },
      { skill: 'Docker', state: 'C', level: 1, evidence: 'Claimed on resume; no dockerfile', why: 'Claimed: Container configs absent.' },
      { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'migrations/001_tables.sql', why: 'Initial database DDL found.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '142 commits with regular frequency', why: 'Consistent git usage.' },
      { skill: 'Next.js', state: 'V', level: 3, evidence: 'pages/api and app router structure', why: 'SSR routing verified.' },
      { skill: 'Tailwind', state: 'V', level: 3, evidence: 'tailwind.config.js utility usage', why: 'Utility-first CSS styling verified.' },
    ],
  },
  // Resume-only applicants (3)
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

  // --- ROLE 2: Backend Python & Cloud Engineer (9 applicants: 6 with passport, 3 resume only) ---
  {
    roleId: 'role-backend-py',
    name: 'Jordan Chen',
    email: 'jordan.chen@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Python', state: 'V', level: 3, evidence: 'services/worker.py (asynchronous asyncio worker pool)', why: 'Async backend workers verified.' },
      { skill: 'PostgreSQL', state: 'V', level: 3, evidence: 'migrations/versions (Alembic migration scripts)', why: 'Relational database schema evolution verified.' },
      { skill: 'REST APIs', state: 'S', level: 2, evidence: 'api/routes.py (FastAPI endpoints)', why: 'Endpoints verified; auth middleware is third-party.' },
      { skill: 'Docker', state: 'S', level: 2, evidence: 'docker/Dockerfile.dev (Python 3.11 slim)', why: 'Container config verified in repo.' },
      { skill: 'AWS', state: 'C', level: 1, evidence: 'Claimed on resume; no cloud formation or terraform in repo', why: 'Claimed: Cloud infrastructure not found.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'tests/test_api.py (pytest fixtures)', why: 'Pytest test cases verified.' },
      { skill: 'System design', state: 'C', level: 1, evidence: 'Architecture overview in README', why: 'Claimed: Conceptual notes only.' },
      { skill: 'Redis', state: 'V', level: 2, evidence: 'services/cache.py (Redis connection pooling)', why: 'In-memory caching implementation verified.' },
    ],
  },
  {
    roleId: 'role-backend-py',
    name: 'Aisha Al-Hassan',
    email: 'aisha.alhassan@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Python', state: 'V', level: 3, evidence: 'backend/app.py (FastAPI high throughput server)', why: 'Python service implementation verified.' },
      { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'db/models.py (SQLAlchemy ORM models)', why: 'ORM models verified.' },
      { skill: 'REST APIs', state: 'V', level: 3, evidence: 'api/v1/auth.py (OAuth2 password bearer flow)', why: 'Secure REST authentication verified.' },
      { skill: 'Docker', state: 'C', level: 1, evidence: 'Claimed on resume; no Dockerfile found', why: 'Claimed: Container build unverified.' },
      { skill: 'AWS', state: 'S', level: 2, evidence: 'boto3 S3 upload integration in storage.py', why: 'AWS SDK usage verified.' },
      { skill: 'Testing', state: 'C', level: 1, evidence: 'Claimed on resume; no pytest files found', why: 'Claimed: Unit tests not present.' },
      { skill: 'System design', state: 'C', level: 1, evidence: 'High level system diagram in docs/spec.md', why: 'Claimed: Spec doc only.' },
      { skill: 'FastAPI', state: 'V', level: 3, evidence: 'main.py (FastAPI router definitions)', why: 'Modern Python web framework verified.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '135 commits with git tags', why: 'Consistent versioning and commits.' },
    ],
  },
  {
    roleId: 'role-backend-py',
    name: 'Matteo Rossi',
    email: 'matteo.rossi@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Python', state: 'S', level: 2, evidence: 'scripts/etl.py (data ingestion scripts)', why: 'Data processing scripts verified.' },
      { skill: 'PostgreSQL', state: 'V', level: 3, evidence: 'sql/queries.sql (indexed partition tables)', why: 'Complex PostgreSQL query optimization verified.' },
      { skill: 'REST APIs', state: 'S', level: 2, evidence: 'server/api.py (Flask API handlers)', why: 'Basic Flask endpoints verified.' },
      { skill: 'Docker', state: 'S', level: 2, evidence: 'Dockerfile (Python multi-stage build)', why: 'Container build verified.' },
      { skill: 'AWS', state: 'C', level: 1, evidence: 'Claimed on resume; no AWS configs in repo', why: 'Claimed: Cloud usage unverified.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'tests/test_etl.py (8 assertions)', why: 'Basic ETL script test verified.' },
      { skill: 'Kafka', state: 'S', level: 2, evidence: 'consumers/events.py (Kafka consumer loop)', why: 'Streaming event consumer verified.' },
      { skill: 'Git workflow', state: 'V', level: 2, evidence: '72 commits over 4 months', why: 'Regular git commit velocity.' },
    ],
  },
  {
    roleId: 'role-backend-py',
    name: 'Rachel Greenwald',
    email: 'rachel.greenwald@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Python', state: 'V', level: 3, evidence: 'src/server.py (Django REST framework backend)', why: 'Django application verified.' },
      { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'settings.py (Postgres database engine)', why: 'Database connection configuration verified.' },
      { skill: 'REST APIs', state: 'S', level: 2, evidence: 'urls.py and views.py (REST generic views)', why: 'Generic view endpoints verified.' },
      { skill: 'Docker', state: 'C', level: 1, evidence: 'Claimed on resume; no Dockerfile in project', why: 'Claimed: Container unverified.' },
      { skill: 'AWS', state: 'C', level: 1, evidence: 'Claimed on resume; no cloud manifests', why: 'Claimed: AWS skills unverified.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'tests/test_models.py (Django test runner)', why: 'Model tests verified.' },
      { skill: 'Linux', state: 'V', level: 2, evidence: 'bin/start.sh, systemd service units', why: 'Linux automation scripts verified.' },
    ],
  },
  {
    roleId: 'role-backend-py',
    name: 'Victor Adebayo',
    email: 'victor.adebayo@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Python', state: 'S', level: 2, evidence: 'src/handler.py (script utility)', why: 'Utility functions in Python verified.' },
      { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'db/schema.sql (table definitions)', why: 'Relational tables verified.' },
      { skill: 'REST APIs', state: 'V', level: 3, evidence: 'app/controllers.py (clean CRUD endpoints)', why: 'REST endpoints verified with auth.' },
      { skill: 'Docker', state: 'S', level: 2, evidence: 'Dockerfile', why: 'Container image defined.' },
      { skill: 'AWS', state: 'C', level: 1, evidence: 'Resume claim; no AWS credentials or SDK found', why: 'Claimed: Cloud integration unverified.' },
      { skill: 'Testing', state: 'C', level: 1, evidence: 'Claimed on resume; no test files', why: 'Claimed: Unit tests unverified.' },
      { skill: 'Kubernetes', state: 'X', level: 1, evidence: 'k8s/demo (forked repo, 0 original commits)', why: 'Contradicted: Claimed Kubernetes but repo is unedited tutorial.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '38 commits over 2 months', why: 'Basic git activity.' },
    ],
  },
  {
    roleId: 'role-backend-py',
    name: 'Ingrid Lindqvist',
    email: 'ingrid.lindqvist@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Python', state: 'S', level: 2, evidence: 'main.py (procedural script)', why: 'Basic Python scripting verified.' },
      { skill: 'PostgreSQL', state: 'S', level: 2, evidence: 'queries.sql (SELECT queries)', why: 'SQL queries verified in repo.' },
      { skill: 'REST APIs', state: 'S', level: 2, evidence: 'api.py (basic HTTP endpoints)', why: 'Simple API logic verified.' },
      { skill: 'AWS', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Cloud not evident in code.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'test.py (assert statements)', why: 'Basic assertion tests found.' },
      { skill: 'System design', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Architecture unverified.' },
      { skill: 'SQL', state: 'S', level: 2, evidence: 'db/seeds.sql', why: 'Database seed scripts verified.' },
    ],
  },
  // Resume-only applicants (3)
  {
    roleId: 'role-backend-py',
    name: 'Samuel Becker (Resume only)',
    email: 'samuel.becker@example.com',
    hasPassport: false,
    resumeText: 'Samuel Becker\nBackend Engineer\nPython, Django, PostgreSQL, Celery, Redis\n4 years designing scalable backend APIs and database schemas.',
    skills: [
      { skill: 'Python', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'PostgreSQL', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'REST APIs', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'Docker', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
    ],
  },
  {
    roleId: 'role-backend-py',
    name: 'Fatimah Al-Sayed (Resume only)',
    email: 'fatimah.alsayed@example.com',
    hasPassport: false,
    resumeText: 'Fatimah Al-Sayed\nCloud & Python Developer\nPython, FastAPI, AWS EC2, S3, Docker\nFocused on cloud-native backend services.',
    skills: [
      { skill: 'Python', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'AWS', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'REST APIs', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
    ],
  },
  {
    roleId: 'role-backend-py',
    name: 'Connor MacLeod (Resume only)',
    email: 'connor.macleod@example.com',
    hasPassport: false,
    resumeText: 'Connor MacLeod\nJunior Systems Developer\nPython, Linux, Bash, PostgreSQL\nRecent graduate with systems engineering internship experience.',
    skills: [
      { skill: 'Python', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'PostgreSQL', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'Testing', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
    ],
  },

  // --- ROLE 3: Frontend Systems Engineer (React) (18 applicants: 12 with passport, 6 resume only) ---
  {
    roleId: 'role-frontend-eng',
    name: 'Samira Patel',
    email: 'samira.patel@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'V', level: 4, evidence: 'packages/ui/components/Button.tsx (atomic design system)', why: 'Component library design and accessibility verified.' },
      { skill: 'TypeScript', state: 'V', level: 4, evidence: 'Strict tsconfig with generic component props', why: 'Strict type invariants verified.' },
      { skill: 'JavaScript', state: 'V', level: 4, evidence: 'lib/runtime.js (ESNext optimization)', why: 'Deep ECMAScript runtime knowledge verified.' },
      { skill: 'Testing', state: 'V', level: 3, evidence: 'tests/components (Jest + React Testing Library, 100% pass)', why: 'Component test automation verified.' },
      { skill: 'System design', state: 'S', level: 2, evidence: 'docs/architecture.md (frontend micro-frontend design)', why: 'Architecture documentation verified.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '240 commits, peer-reviewed PRs', why: 'Exemplary git hygiene.' },
      { skill: 'Next.js', state: 'V', level: 3, evidence: 'app/layout.tsx (Server Components & Streaming)', why: 'Modern Next.js SSR architecture verified.' },
      { skill: 'CSS3', state: 'V', level: 3, evidence: 'styles/tokens.css (design tokens and CSS variables)', why: 'Custom design system styling verified.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Julian Thorne',
    email: 'julian.thorne@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'V', level: 3, evidence: 'src/App.tsx, custom hooks and context providers', why: 'State management and clean component architecture verified.' },
      { skill: 'TypeScript', state: 'V', level: 3, evidence: 'types/index.ts (strict domain types)', why: 'TypeScript typing across components verified.' },
      { skill: 'JavaScript', state: 'V', level: 3, evidence: 'src/utils/math.js (high performance calculations)', why: 'Pure JavaScript functions verified.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'tests/app.test.tsx (basic component mount specs)', why: 'Mounting tests verified without coverage enforcement.' },
      { skill: 'System design', state: 'S', level: 2, evidence: 'rfc/client-cache.md (client-side caching design)', why: 'RFC architecture document verified.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '150 commits over 5 months', why: 'Continuous git commits verified.' },
      { skill: 'HTML5', state: 'V', level: 3, evidence: 'Accessible landmarks, aria attributes', why: 'Accessibility standards verified.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Mei-Ling Zhou',
    email: 'meiling.zhou@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'V', level: 3, evidence: 'src/components/DataGrid.tsx (virtualized table)', why: 'Complex UI components verified.' },
      { skill: 'TypeScript', state: 'S', level: 2, evidence: 'Mixed .tsx and .jsx files', why: 'Supported: Partial TypeScript adoption.' },
      { skill: 'JavaScript', state: 'V', level: 3, evidence: 'src/services/data.js (data transformation logic)', why: 'Data manipulation functions verified.' },
      { skill: 'Testing', state: 'V', level: 3, evidence: 'vitest.config.ts, 60 passed unit tests', why: 'Unit test suite passing in CI.' },
      { skill: 'System design', state: 'C', level: 1, evidence: 'Claimed on resume; no design docs in repo', why: 'Claimed: System design unverified.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '180 commits across 2 major releases', why: 'Clean commit history.' },
      { skill: 'Redux', state: 'S', level: 2, evidence: 'store/reducers.js', why: 'Redux state management verified.' },
      { skill: 'Tailwind', state: 'V', level: 3, evidence: 'tailwind.config.js with customized theme', why: 'Tailwind integration verified.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Carlos Mendez',
    email: 'carlos.mendez@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'S', level: 2, evidence: 'components/Header.jsx (collaborative edits)', why: 'Supported: Component contributions verified.' },
      { skill: 'TypeScript', state: 'V', level: 3, evidence: 'types/models.ts (strict types)', why: 'Strict type validation verified.' },
      { skill: 'JavaScript', state: 'V', level: 3, evidence: 'src/index.js (clean modern ES6+)', why: 'Modern JavaScript verified.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'tests/render.test.js (4 assertions)', why: 'Introductory tests found.' },
      { skill: 'System design', state: 'S', level: 2, evidence: 'docs/ui-spec.md', why: 'UI design specifications found.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '45 commits', why: 'Moderate git activity.' },
      { skill: 'Webpack', state: 'S', level: 2, evidence: 'webpack.config.js', why: 'Bundler configuration verified.' },
      { skill: 'Jest', state: 'S', level: 2, evidence: 'jest.config.js', why: 'Test runner configuration verified.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Ananya Deshmukh',
    email: 'ananya.deshmukh@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'V', level: 3, evidence: 'src/pages/Dashboard.tsx (84% line share)', why: 'React frontend application verified.' },
      { skill: 'TypeScript', state: 'S', level: 2, evidence: 'types.ts with loose compiler checks', why: 'TypeScript present with default config.' },
      { skill: 'JavaScript', state: 'S', level: 2, evidence: 'utils/helpers.js', why: 'Helper functions verified.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'src/tests (unit specs)', why: 'Unit specs present.' },
      { skill: 'System design', state: 'S', level: 2, evidence: 'docs/flow.md', why: 'Flow diagrams verified.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '112 commits with PR reviews', why: 'Consistent git hygiene.' },
      { skill: 'Sass', state: 'V', level: 3, evidence: 'styles/main.scss with mixins and variables', why: 'Advanced CSS pre-processor usage.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Oliver Wright',
    email: 'oliver.wright@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'V', level: 3, evidence: 'src/App.tsx, custom hooks and effects', why: 'React component tree verified.' },
      { skill: 'TypeScript', state: 'S', level: 2, evidence: 'tsconfig.json, basic interfaces', why: 'Basic interfaces verified.' },
      { skill: 'JavaScript', state: 'S', level: 2, evidence: 'src/lib.js', why: 'JavaScript library code.' },
      { skill: 'Testing', state: 'C', level: 1, evidence: 'Claimed on resume; no tests in repo', why: 'Claimed: Testing unverified.' },
      { skill: 'System design', state: 'S', level: 2, evidence: 'README architectural description', why: 'Design description in README.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '58 commits', why: 'Moderate git history.' },
      { skill: 'Vue.js', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Vue not demonstrated.' },
      { skill: 'Cypress', state: 'S', level: 2, evidence: 'cypress.config.js', why: 'E2E setup verified.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Beatrice Dupont',
    email: 'beatrice.dupont@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'S', level: 2, evidence: 'src/components/Feed.tsx', why: 'Component verified.' },
      { skill: 'TypeScript', state: 'S', level: 2, evidence: 'src/types.ts', why: 'Type definitions verified.' },
      { skill: 'JavaScript', state: 'V', level: 3, evidence: 'src/engine.js (algorithmic data processing)', why: 'Pure JavaScript algorithms verified.' },
      { skill: 'Testing', state: 'S', level: 2, evidence: 'tests/spec.js', why: 'Test assertions verified.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '124 commits with tags', why: 'Clean git commits.' },
      { skill: 'GraphQL', state: 'S', level: 2, evidence: 'queries/feed.graphql', why: 'GraphQL queries verified.' },
      { skill: 'Vite', state: 'V', level: 2, evidence: 'vite.config.ts with plugins', why: 'Vite build tool verified.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Kenji Sato',
    email: 'kenji.sato@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'S', level: 2, evidence: 'src/App.jsx', why: 'React components verified.' },
      { skill: 'TypeScript', state: 'C', level: 1, evidence: 'Claimed on resume; repo uses pure JavaScript', why: 'Claimed: TypeScript unverified.' },
      { skill: 'JavaScript', state: 'V', level: 3, evidence: 'src/core.js (ES6 module implementation)', why: 'ES6 JavaScript verified.' },
      { skill: 'Testing', state: 'C', level: 1, evidence: 'Claimed on resume; no test files found', why: 'Claimed: Testing unverified.' },
      { skill: 'System design', state: 'S', level: 2, evidence: 'docs/design.png (component hierarchy)', why: 'Design diagram found.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '40 commits', why: 'Basic commits.' },
      { skill: 'Node.js', state: 'X', level: 1, evidence: 'node-tutorial (forked repo, 0 commits)', why: 'Contradicted: Forked tutorial repo.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Fatima Zahra',
    email: 'fatima.zahra@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'S', level: 2, evidence: 'components/Card.jsx', why: 'Simple component edits.' },
      { skill: 'TypeScript', state: 'S', level: 2, evidence: 'types/user.ts', why: 'User interface definition.' },
      { skill: 'JavaScript', state: 'S', level: 2, evidence: 'src/script.js', why: 'Basic scripts.' },
      { skill: 'System design', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Design unverified.' },
      { skill: 'Git workflow', state: 'V', level: 2, evidence: '62 commits', why: 'Regular commits.' },
      { skill: 'Responsive design', state: 'S', level: 2, evidence: 'css/media.css', why: 'CSS media queries verified.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Henrik Nielsen',
    email: 'henrik.nielsen@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'S', level: 2, evidence: 'src/Index.jsx', why: 'Introductory React code.' },
      { skill: 'TypeScript', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: TypeScript unverified.' },
      { skill: 'JavaScript', state: 'S', level: 2, evidence: 'main.js', why: 'Basic JavaScript.' },
      { skill: 'Testing', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Testing unverified.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '28 commits', why: 'Infrequent commits.' },
      { skill: 'Figma', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Design tool unverified.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Maya Lin',
    email: 'maya.lin@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'C', level: 1, evidence: 'Resume claim only; repository has HTML/CSS only', why: 'Claimed: React unverified in repo.' },
      { skill: 'TypeScript', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: TypeScript unverified.' },
      { skill: 'JavaScript', state: 'S', level: 2, evidence: 'assets/app.js (DOM manipulation)', why: 'DOM manipulation verified.' },
      { skill: 'System design', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Design unverified.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '18 commits', why: 'Basic git activity.' },
      { skill: 'jQuery', state: 'S', level: 2, evidence: 'vendor/jquery usage', why: 'Legacy JS library usage.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'David Sterling',
    email: 'david.sterling@example.com',
    hasPassport: true,
    skills: [
      { skill: 'React', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: React unverified.' },
      { skill: 'JavaScript', state: 'S', level: 2, evidence: 'script.js (simple form validation)', why: 'Form validation script.' },
      { skill: 'Testing', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Testing unverified.' },
      { skill: 'Git workflow', state: 'C', level: 1, evidence: '2 commits in single repo', why: 'Claimed: Git history minimal.' },
      { skill: 'Bootstrap', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Bootstrap unverified.' },
    ],
  },
  // Resume-only applicants (6)
  {
    roleId: 'role-frontend-eng',
    name: 'Aaron Brooks (Resume only)',
    email: 'aaron.brooks@example.com',
    hasPassport: false,
    resumeText: 'Aaron Brooks\nFrontend Engineer\nReact, TypeScript, Next.js, Redux, CSS Modules\nSpecializing in e-commerce web applications.',
    skills: [
      { skill: 'React', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'TypeScript', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'JavaScript', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Yasmin Farah (Resume only)',
    email: 'yasmin.farah@example.com',
    hasPassport: false,
    resumeText: 'Yasmin Farah\nUI/UX Developer\nReact, JavaScript, HTML5, CSS3, Figma\nFocus on accessibility and responsive layouts.',
    skills: [
      { skill: 'React', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'JavaScript', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'Git workflow', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Tyler Evans (Resume only)',
    email: 'tyler.evans@example.com',
    hasPassport: false,
    resumeText: 'Tyler Evans\nWeb Developer\nJavaScript, React, Vue, Webpack, Tailwind\n3 years agency client delivery.',
    skills: [
      { skill: 'React', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'JavaScript', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Clara Schumann (Resume only)',
    email: 'clara.schumann@example.com',
    hasPassport: false,
    resumeText: 'Clara Schumann\nJunior Frontend Developer\nReact, TypeScript, Jest, Git\nComputer science graduate.',
    skills: [
      { skill: 'React', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'TypeScript', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'Testing', state: 'C', level: 1, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Ethan Hunt (Resume only)',
    email: 'ethan.hunt@example.com',
    hasPassport: false,
    resumeText: 'Ethan Hunt\nSoftware Developer\nJavaScript, React, Node.js, Express\nFull stack web developer.',
    skills: [
      { skill: 'React', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'JavaScript', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
    ],
  },
  {
    roleId: 'role-frontend-eng',
    name: 'Sunita Rao (Resume only)',
    email: 'sunita.rao@example.com',
    hasPassport: false,
    resumeText: 'Sunita Rao\nFrontend Systems Engineer\nReact, TypeScript, System Design, Automated Testing\nEnterprise client architecture.',
    skills: [
      { skill: 'React', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'TypeScript', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'System design', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
    ],
  },

  // --- ROLE 4: DevOps & Infrastructure Engineer (6 applicants: 5 with passport, 1 resume only) ---
  {
    roleId: 'role-devops-infra',
    name: 'Gabriel Santos',
    email: 'gabriel.santos@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Docker', state: 'S', level: 2, evidence: 'docker/Dockerfile (base image)', why: 'Docker container verified.' },
      { skill: 'Kubernetes', state: 'C', level: 1, evidence: 'Claimed on resume; no k8s manifests in repo', why: 'Claimed: Kubernetes unverified.' },
      { skill: 'AWS', state: 'S', level: 2, evidence: 'terraform/aws.tf (EC2 instance definition)', why: 'Terraform AWS config verified.' },
      { skill: 'Git workflow', state: 'V', level: 3, evidence: '110 commits with structured branch names', why: 'Git commit history verified.' },
      { skill: 'System design', state: 'C', level: 1, evidence: 'Claimed on resume; no infra diagrams found', why: 'Claimed: Infra design unverified.' },
      { skill: 'Linux', state: 'V', level: 3, evidence: 'scripts/provision.sh (apt provisioning)', why: 'Linux automation scripts verified.' },
      { skill: 'Bash', state: 'S', level: 2, evidence: 'scripts/monitor.sh', why: 'Monitoring script verified.' },
    ],
  },
  {
    roleId: 'role-devops-infra',
    name: 'Nadia Voronova',
    email: 'nadia.voronova@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Docker', state: 'S', level: 2, evidence: 'Dockerfile', why: 'Single container file verified.' },
      { skill: 'Kubernetes', state: 'S', level: 2, evidence: 'k8s/deployment.yaml (single deployment)', why: 'Kubernetes deployment manifest verified.' },
      { skill: 'AWS', state: 'C', level: 1, evidence: 'Claimed on resume; no AWS code in repo', why: 'Claimed: Cloud unverified.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '48 commits', why: 'Basic git activity.' },
      { skill: 'Python', state: 'C', level: 1, evidence: 'Claimed on resume; no python files', why: 'Claimed: Scripting unverified.' },
      { skill: 'Terraform', state: 'S', level: 2, evidence: 'main.tf (local provider)', why: 'Terraform provider config verified.' },
      { skill: 'Helm', state: 'C', level: 1, evidence: 'Claimed on resume', why: 'Claimed: Helm unverified.' },
    ],
  },
  {
    roleId: 'role-devops-infra',
    name: 'Lars Lindholm',
    email: 'lars.lindholm@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Docker', state: 'V', level: 2, evidence: 'build/Dockerfile (alpine multi-stage)', why: 'Multi-stage docker build verified.' },
      { skill: 'Kubernetes', state: 'C', level: 1, evidence: 'Claimed on resume; no k8s configs', why: 'Claimed: Kubernetes unverified.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '35 commits', why: 'Moderate git commits.' },
      { skill: 'Ansible', state: 'S', level: 2, evidence: 'playbooks/site.yml', why: 'Ansible playbook verified.' },
      { skill: 'CI/CD', state: 'S', level: 2, evidence: '.gitlab-ci.yml', why: 'GitLab CI pipeline verified.' },
      { skill: 'Prometheus', state: 'C', level: 1, evidence: 'Claimed on resume', why: 'Claimed: Monitoring unverified.' },
    ],
  },
  {
    roleId: 'role-devops-infra',
    name: 'Kwame Mensah',
    email: 'kwame.mensah@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Docker', state: 'C', level: 1, evidence: 'Claimed on resume', why: 'Claimed: Docker unverified.' },
      { skill: 'Kubernetes', state: 'C', level: 1, evidence: 'Claimed on resume', why: 'Claimed: Kubernetes unverified.' },
      { skill: 'AWS', state: 'C', level: 1, evidence: 'Claimed on resume', why: 'Claimed: AWS unverified.' },
      { skill: 'Git workflow', state: 'S', level: 2, evidence: '30 commits', why: 'Basic git usage.' },
      { skill: 'Python', state: 'C', level: 1, evidence: 'Claimed on resume', why: 'Claimed: Python unverified.' },
      { skill: 'Linux', state: 'S', level: 2, evidence: 'setup.sh (basic curl commands)', why: 'Basic shell script verified.' },
    ],
  },
  {
    roleId: 'role-devops-infra',
    name: 'Jessica Chen',
    email: 'jessica.chen@example.com',
    hasPassport: true,
    skills: [
      { skill: 'Docker', state: 'C', level: 1, evidence: 'Claimed on resume', why: 'Claimed: Docker unverified.' },
      { skill: 'AWS', state: 'C', level: 1, evidence: 'Claimed on resume', why: 'Claimed: AWS unverified.' },
      { skill: 'Git workflow', state: 'C', level: 1, evidence: 'Claimed on resume', why: 'Claimed: Git unverified.' },
      { skill: 'Python', state: 'C', level: 1, evidence: 'Claimed on resume', why: 'Claimed: Python unverified.' },
      { skill: 'YAML', state: 'S', level: 2, evidence: 'config.yml', why: 'Config file verified.' },
    ],
  },
  // Resume-only applicants (1)
  {
    roleId: 'role-devops-infra',
    name: 'Brendan Cole (Resume only)',
    email: 'brendan.cole@example.com',
    hasPassport: false,
    resumeText: 'Brendan Cole\nDevOps Engineer\nDocker, Kubernetes, AWS, Terraform, CI/CD\nInfrastructure automation and monitoring.',
    skills: [
      { skill: 'Docker', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'Kubernetes', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
      { skill: 'AWS', state: 'C', level: 2, evidence: 'Resume claim only', why: 'Claimed: Resume-only applicant.' },
    ],
  },
]

const SAMPLE_EXCERPTS = {
  React: 'export function useVirtualizer({ count, estimateSize }) {\n  const [scrollOffset, setScrollOffset] = useState(0);\n  const totalSize = count * estimateSize;\n  return { totalSize, virtualItems };\n}',
  TypeScript: 'export type AsyncResult<T, E = Error> = { ok: true; data: T } | { ok: false; error: E };\nexport interface Repository<T> { findById(id: string): Promise<AsyncResult<T>>; }',
  'REST APIs': "app.get('/api/v1/resources', authMiddleware, async (req, res) => {\n  const items = await service.list({ limit: req.query.limit || 20 });\n  return res.json({ items });\n});",
  Testing: "describe('Authentication suite', () => {\n  it('rejects invalid state parameter with 401', async () => {\n    const res = await request(app).get('/callback?state=wrong');\n    expect(res.status).toBe(401);\n  });\n});",
  Docker: 'FROM node:20-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nEXPOSE 3000',
  PostgreSQL: "CREATE INDEX idx_audit_created ON audit_logs (tenant_id, created_at DESC);\nSELECT skill, COUNT(*) FROM verifications WHERE state = 'V' GROUP BY skill;",
  'Git workflow': 'commit 3f9a12c (HEAD -> main, origin/main)\nAuthor: candidate\nDate: Mon Nov 18 14:22:01 2024\nfeat: implement zero-downtime database migration schema',
  Python: 'class AsynchronousWorkerPool:\n    def __init__(self, max_concurrency: int = 10) -> None:\n        self._semaphore = asyncio.Semaphore(max_concurrency)\n        self._active = set()',
  AWS: 'resource "aws_s3_bucket" "audit_vault" {\n  bucket        = "proofpass-audit-logs"\n  force_destroy = false\n  lifecycle { prevent_destroy = true }\n}',
  Kubernetes: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: pipeline-worker\nspec:\n  replicas: 3\n  template:\n    spec:\n      containers:\n      - name: worker',
  JavaScript: 'export async function fetchWithRetry(url, options = {}, retries = 3) {\n  for (let attempt = 1; attempt <= retries; attempt++) {\n    try { return await fetch(url, options); }\n    catch (err) { if (attempt === retries) throw err; }\n  }\n}',
  'Node.js': "const cluster = require('cluster');\nconst http = require('http');\nif (cluster.isPrimary) {\n  for (let i = 0; i < os.cpus().length; i++) cluster.fork();\n}",
  'System design': '## High-Throughput Ingestion Architecture\n- Client requests stream through edge API gateway with token-bucket rate limiting\n- Background workers process async batches via persistent queue',
  Redis: 'async function getOrSetCache(key, ttlSec, fetcher) {\n  const cached = await redis.get(key);\n  if (cached) return JSON.parse(cached);\n  const fresh = await fetcher();\n  await redis.setex(key, ttlSec, JSON.stringify(fresh));\n  return fresh;\n}',
  GraphQL: 'type Query {\n  candidatePassport(id: ID!): SkillPassport\n  verifiedSkills(filter: StateFilter): [SkillAuditRecord!]!\n}',
  Go: 'func HandleStream(w http.ResponseWriter, r *http.Request) {\n\tflusher, ok := w.(http.Flusher)\n\tif !ok { http.Error(w, "Streaming unsupported", 500); return }\n}',
  Rust: 'pub fn process_records<T: Record>(stream: impl Iterator<Item = T>) -> Result<Summary, AuditError> {\n    let mut state = State::new();\n    state.collect(stream)\n}',
  Java: 'public class ConnectionPoolManager implements AutoCloseable {\n    private final BlockingQueue<Connection> pool;\n    public Connection acquire() throws InterruptedException { return pool.take(); }\n}',
  'C++': 'template <typename T>\nclass RingBuffer {\npublic:\n    explicit RingBuffer(size_t capacity) : cap_(capacity), head_(0), tail_(0) {}\n};',
  'C#': 'public async Task<ActionResult<PassportDto>> GetPassportAsync(string id) {\n    var record = await _dbContext.Passports.FindAsync(id);\n    return record is null ? NotFound() : Ok(record);\n}',
  'HTML/CSS': '@container (min-width: 480px) {\n  .candidate-card { display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; }\n}',
  Tailwind: '@layer components {\n  .btn-accent { @apply px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700; }\n}',
  'CI/CD': 'name: CI Verification Pipeline\non: [push, pull_request]\njobs:\n  audit:\n    runs-on: ubuntu-latest\n    steps:\n    - uses: actions/checkout@v4',
  Linux: '#!/usr/bin/env bash\nset -euo pipefail\nchmod 600 /etc/security/audit.key\nsystemctl restart auditd',
}

function buildSampleSkillEvidenceDetails(s, cand, applicant, idx, skillIdx, fetchedAt) {
  const evText = String(s.evidence || '')
  const hasFile = evText.match(/([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/)
  const defaultFile = `src/${s.skill.toLowerCase().replace(/[^a-z0-9]/g, '')}.ts`
  const filePath = hasFile ? hasFile[0] : (s.state === 'V' || s.state === 'S' || s.state === 'X' ? defaultFile : null)

  const candidateSlug = cand.name.toLowerCase().replace(/[^a-z]/g, '')
  const excerptText =
    SAMPLE_EXCERPTS[s.skill] ||
    `// Verified ${s.skill} module implementation\nexport class ${s.skill.replace(/[^a-zA-Z0-9]/g, '')}Service {\n  constructor() {}\n}`

  // 1. Contradicted
  if (s.state === 'X') {
    const flagReason = s.why || 'Contradicted: On resume as a skill claim, but evidence conflicts with claim (e.g. forked tutorial with zero original commits).'
    return [
      {
        source: 'github',
        label: 'Why it conflicts',
        file: filePath || 'tutorial/repo/index.js',
        commit: 'f0rked0',
        url: null,
        excerpt: '// Cloned from upstream tutorial repository\n// 0 commits authored by candidate in git log',
        excerptSource: 'sample',
        matchedTerm: s.skill,
        contentHash: 'f0rked01',
        flagReason,
        confidence: getConfidence({ source: 'github', credibility: 0.0, lineShare: 0 }),
        fetchedAt,
      },
    ]
  }

  // 2. Verified
  if (s.state === 'V') {
    const cred = 0.76 + ((idx * 5 + skillIdx * 3) % 18) / 100
    const lineShare = Math.round(cred * 100)
    const commitHash = `c${(idx * 7 + skillIdx * 11).toString(16).padStart(6, '9')}`.slice(0, 7)
    const contentHash = `a${(idx * 13 + skillIdx * 5).toString(16).padStart(7, 'b')}`.slice(0, 8)

    return [
      {
        source: 'github',
        label: 'Repository file evidence',
        file: filePath,
        commit: commitHash,
        url: `https://github.com/${candidateSlug}/portfolio/blob/main/${filePath}`,
        excerpt: excerptText,
        excerptSource: 'sample',
        matchedTerm: s.skill,
        contentHash,
        flagReason: null,
        confidence: getConfidence({ source: 'github', credibility: cred, lineShare }),
        fetchedAt,
      },
    ]
  }

  // 3. Supported
  if (s.state === 'S') {
    const cred = 0.44 + ((idx * 3 + skillIdx * 2) % 18) / 100
    const lineShare = Math.round(cred * 100)
    const commitHash = `7${(idx * 3 + skillIdx * 7).toString(16).padStart(6, 'e')}`.slice(0, 7)
    const contentHash = `e${(idx * 9 + skillIdx * 4).toString(16).padStart(7, 'f')}`.slice(0, 8)

    return [
      {
        source: 'github',
        label: 'Repository file evidence',
        file: filePath,
        commit: commitHash,
        url: `https://github.com/${candidateSlug}/portfolio/blob/main/${filePath}`,
        excerpt: excerptText,
        excerptSource: 'sample',
        matchedTerm: s.skill,
        contentHash,
        flagReason: null,
        confidence: getConfidence({ source: 'github', credibility: cred, lineShare }),
        fetchedAt,
      },
    ]
  }

  // 4. Claimed with resume claim
  const hasNoEvidence =
    evText.toLowerCase().includes('no matching') ||
    evText.toLowerCase().includes('no test') ||
    evText.toLowerCase().includes('none')

  if (s.state === 'C' && !hasNoEvidence) {
    return [
      {
        source: 'resume',
        label: 'From resume (a claim, not evidence)',
        file: null,
        commit: null,
        url: null,
        excerpt: `${cand.name}'s resume highlights production experience with ${s.skill} across enterprise applications.`,
        excerptSource: 'sample',
        matchedTerm: s.skill,
        contentHash: null,
        flagReason: null,
        confidence: getConfidence({ source: 'resume' }),
        fetchedAt,
      },
    ]
  }

  // No evidence found: return empty list (no confidence meter)
  return []
}

/**
 * Generate all applicants for sample roles.
 * Returns exactly 47 applicants with deterministic IDs, passports and skills.
 */
export function generateSampleApplicants() {
  const applicants = []

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
      const issuedAt = new Date(1730000000000 - (idx + 1) * 86400000 * 2).toISOString()

      applicant.passport = {
        id: passportId,
        candidate: cand.name,
        targetRole: applicant.targetRole,
        issuedAt,
        hash: `a1b2c3d4e5f6${idx}890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`,
        revoked: false,
        skills: cand.skills.map((s, skillIdx) => {
          const evidenceDetails = buildSampleSkillEvidenceDetails(s, cand, applicant, idx, skillIdx, issuedAt)
          return {
            skill: s.skill,
            state: s.state,
            level: s.level || 2,
            evidence: s.evidence || 'Repository commit history verified',
            rationale: s.why || 'Code verified in repository index.',
            lineShare: s.state === 'V' ? 88 : s.state === 'S' ? 55 : 0,
            evidenceDetails,
          }
        }),
      }
    } else {
      applicant.skills = (cand.skills || []).map((s, skillIdx) => {
        const evidenceDetails = buildSampleSkillEvidenceDetails(s, cand, applicant, idx, skillIdx, new Date().toISOString())
        return {
          ...s,
          evidenceDetails,
        }
      })
    }

    applicants.push(applicant)
  })

  return applicants
}

/**
 * Synchronize seed data when SEED_VERSION is updated.
 * Re-seeds ONLY the sample roles and sample applicants.
 * Preserves users, sessions, real passports, roadmaps, and recruiter-created roles.
 */
export function syncSeedDataIfNeeded() {
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    const storedVer = localStorage.getItem('pp_prototype_seed_version')
    const currentVer = Number(storedVer || '0')
    if (currentVer >= SEED_VERSION) {
      return
    }

    // 1. Roles: Keep recruiter-created roles (isSample === false), re-seed sample roles
    const rawRoles = localStorage.getItem('pp_prototype_roles')
    let customRoles = []
    if (rawRoles) {
      try {
        const parsedRoles = JSON.parse(rawRoles)
        if (Array.isArray(parsedRoles)) {
          customRoles = parsedRoles.filter((r) => !r.isSample)
        }
      } catch {
        // ignore parse error
      }
    }
    const newRoles = [...SAMPLE_ROLES, ...customRoles]
    localStorage.setItem('pp_prototype_roles', JSON.stringify(newRoles))

    // 2. Applicants: Keep applicants on recruiter-created roles, re-seed sample applicants
    const sampleRoleIds = new Set(SAMPLE_ROLES.map((r) => r.id))
    const rawApps = localStorage.getItem('pp_prototype_applicants')
    let customApps = []
    if (rawApps) {
      try {
        const parsedApps = JSON.parse(rawApps)
        if (Array.isArray(parsedApps)) {
          customApps = parsedApps.filter((a) => !sampleRoleIds.has(a.roleId))
        }
      } catch {
        // ignore parse error
      }
    }
    const freshSampleApps = generateSampleApplicants()
    const newApps = [...freshSampleApps, ...customApps]
    localStorage.setItem('pp_prototype_applicants', JSON.stringify(newApps))

    // 3. Mark seed version
    localStorage.setItem('pp_prototype_seed_version', String(SEED_VERSION))
  } catch {
    // Storage restricted
  }
}

// Auto-run sync on module load
syncSeedDataIfNeeded()
