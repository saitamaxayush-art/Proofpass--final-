/**
 * Skill Taxonomy and Level Rubrics
 * Standardised catalog of software engineering skills, categories, aliases, and 1-4 level criteria.
 */

export const TAXONOMY = [
  {
    id: 'react',
    name: 'React',
    category: 'Frontend',
    aliases: ['react', 'react.js', 'reactjs'],
    levels: {
      1: 'Understands JSX, props, basic state with useState, and component rendering.',
      2: 'Builds multi-component features with useEffect, custom hooks, and context.',
      3: 'Designs state architectures, performance memoization (useMemo/useCallback), and custom hooks.',
      4: 'Architects large-scale federated frontend systems, concurrent features, and server components.',
    },
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    category: 'Languages',
    aliases: ['typescript', 'ts'],
    levels: {
      1: 'Uses basic primitive types, interfaces, and function parameter annotations.',
      2: 'Implements generic functions, union types, type narrowing, and strict tsconfig.',
      3: 'Authors complex generic utility types, conditional types, and mapped types.',
      4: 'Configures compiler transforms, library declarations, and zero-any type invariants across monorepos.',
    },
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    category: 'Languages',
    aliases: ['javascript', 'js', 'es6', 'ecmascript'],
    levels: {
      1: 'Understands variables, loops, DOM manipulation, and basic event handling.',
      2: 'Works with ES6+ syntax, Promises, async/await, closures, and array methods.',
      3: 'Mastery of the event loop, prototype chain, memory management, and microtasks.',
      4: 'Deep V8 engine optimization, AST tooling, and runtime performance profiling.',
    },
  },
  {
    id: 'python',
    name: 'Python',
    category: 'Languages',
    aliases: ['python', 'py', 'python3'],
    levels: {
      1: 'Writes procedural scripts, uses standard data structures (lists, dicts), and reads files.',
      2: 'Implements OOP classes, context managers, list comprehensions, and virtual environments.',
      3: 'Authors decorators, generators, async routines, and packages with typing annotations.',
      4: 'Understands GIL internals, C-extensions, metaclasses, and high-throughput concurrency.',
    },
  },
  {
    id: 'node',
    name: 'Node.js',
    category: 'Backend',
    aliases: ['node', 'node.js', 'nodejs'],
    levels: {
      1: 'Runs simple HTTP servers and scripts using standard modules like fs and path.',
      2: 'Builds Express or Fastify services with middleware and async file/network I/O.',
      3: 'Handles Node streams, cluster processes, worker threads, and event emitter patterns.',
      4: 'Tunes event loop lag, native addons, memory leak diagnostics, and backpressure.',
    },
  },
  {
    id: 'rest-apis',
    name: 'REST APIs',
    category: 'Backend',
    aliases: ['rest', 'rest api', 'rest apis', 'restful'],
    levels: {
      1: 'Knows HTTP methods (GET, POST, PUT, DELETE) and standard status codes.',
      2: 'Designs predictable URI paths, JSON request/response bodies, and basic query params.',
      3: 'Implements idempotency keys, JWT/OAuth authentication, pagination, and rate limiting.',
      4: 'Architects public API gateways, hypermedia standards, OpenAPI contracts, and versioning strategies.',
    },
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'Databases',
    aliases: ['postgres', 'postgresql', 'psql'],
    levels: {
      1: 'Writes basic SELECT, INSERT, UPDATE, DELETE queries and table creation DDL.',
      2: 'Designs relational schemas with foreign keys, compound indexes, and multi-table joins.',
      3: 'Performs EXPLAIN ANALYZE query planning, transaction isolation levels, and CTE optimizations.',
      4: 'Manages connection poolers (PgBouncer), partitioning, WAL replication, and query locking.',
    },
  },
  {
    id: 'docker',
    name: 'Docker',
    category: 'DevOps',
    aliases: ['docker', 'container', 'containers', 'dockerfile'],
    levels: {
      1: 'Builds images from existing Dockerfiles and runs containers with port mappings.',
      2: 'Writes multi-stage Dockerfiles and sets up multi-container docker-compose environments.',
      3: 'Optimizes layer caching, non-root user security, volume persistence, and network bridges.',
      4: 'Creates hardened scratch/distroless images, multi-arch builds (buildx), and daemon profiling.',
    },
  },
  {
    id: 'testing',
    name: 'Testing',
    category: 'Quality',
    aliases: ['testing', 'unit testing', 'jest', 'vitest', 'pytest', 'tdd'],
    levels: {
      1: 'Writes basic assertion statements verifying function output given fixed inputs.',
      2: 'Authors unit tests with test fixtures, mocks external network calls, and checks branches.',
      3: 'Implements integration test suites, component testing (React Testing Library), and coverage thresholds.',
      4: 'Architects end-to-end testing matrix, mutation testing, contract testing, and flaky test mitigation.',
    },
  },
  {
    id: 'git-workflow',
    name: 'Git workflow',
    category: 'DevOps',
    aliases: ['git', 'git workflow', 'github', 'version control'],
    levels: {
      1: 'Performs commit, push, pull, and clone operations on single branches.',
      2: 'Branches feature workflows, opens pull requests, and resolves basic merge conflicts.',
      3: 'Uses interactive rebase, cherry-pick, signed commits, and squash merge hygiene.',
      4: 'Maintains trunk-based CI/CD workflows, submodules, monorepo merge queues, and release tags.',
    },
  },
  {
    id: 'system-design',
    name: 'System design',
    category: 'Architecture',
    aliases: ['system design', 'distributed systems', 'architecture', 'microservices'],
    levels: {
      1: 'Understands client-server separation and single database architectures.',
      2: 'Draws diagrams showing API servers, database replicas, caching layers, and storage.',
      3: 'Designs for high availability: load balancing, read replicas, cache invalidation, and async queues.',
      4: 'Solves distributed consensus, CAP trade-offs, event-driven saga patterns, and global sharding.',
    },
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: 'DevOps',
    aliases: ['kubernetes', 'k8s'],
    levels: {
      1: 'Knows pods, services, and namespaces; uses kubectl to inspect running workloads.',
      2: 'Writes deployment, service, and ConfigMap manifests; configures resource limits.',
      3: 'Configures ingress controllers, horizontal pod autoscalers, rolling updates, and persistent volumes.',
      4: 'Authors custom resource definitions (CRDs), operators, service meshes, and multi-cluster networks.',
    },
  },
  {
    id: 'aws',
    name: 'AWS',
    category: 'Cloud',
    aliases: ['aws', 'amazon web services', 's3', 'ec2', 'lambda'],
    levels: {
      1: 'Navigates AWS console; understands S3 bucket storage and basic EC2 instances.',
      2: 'Deploys serverless functions (Lambda) with API Gateway and configures IAM least-privilege roles.',
      3: 'Authors Infrastructure-as-Code (Terraform or CloudFormation) for VPC, RDS, and CloudFront.',
      4: 'Designs multi-region fault tolerance, AWS Organizations SCPs, and cloud cost governance.',
    },
  },
  {
    id: 'data-structures',
    name: 'Data structures & Algorithms',
    category: 'Computer Science',
    aliases: ['algorithms', 'data structures', 'dsa', 'leetcode'],
    levels: {
      1: 'Understands arrays, linked lists, stacks, and queues with basic search.',
      2: 'Implements binary search, hash maps, recursion, and sorting with Big-O time/space awareness.',
      3: 'Solves graph traversals (BFS/DFS), dynamic programming, and heap/tree balanced operations.',
      4: 'Applies advanced algorithms: topological sort, segment trees, union-find, and NP-hard heuristics.',
    },
  },
]

export function findSkillByKeyword(keyword) {
  if (!keyword) return null
  const clean = keyword.trim().toLowerCase()
  return TAXONOMY.find(
    (item) =>
      item.name.toLowerCase() === clean ||
      item.id.toLowerCase() === clean ||
      item.aliases.some((alias) => alias.toLowerCase() === clean)
  ) || null
}

export function matchSkillsFromText(text) {
  if (!text) return []
  const lower = text.toLowerCase()
  const matched = []
  for (const item of TAXONOMY) {
    const hits = item.aliases.some((alias) => {
      const regex = new RegExp(`\\b${alias.replace('.', '\\.')}\\b`, 'i')
      return regex.test(lower)
    })
    if (hits) {
      matched.push(item)
    }
  }
  return matched
}
