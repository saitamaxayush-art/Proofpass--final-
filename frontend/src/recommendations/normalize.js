/**
 * Skill Normalization Module
 * Reuses the same canonical aliases as the ProofPass passport and ontology.
 * Unknown skills are preserved as-is but flagged so they never receive incorrect resources.
 */

const CANONICAL_MAP = {
  // React
  'react': 'React',
  'react.js': 'React',
  'reactjs': 'React',

  // TypeScript
  'typescript': 'TypeScript',
  'ts': 'TypeScript',

  // JavaScript
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'es6': 'JavaScript',
  'ecmascript': 'JavaScript',

  // Python
  'python': 'Python',
  'py': 'Python',
  'python 3': 'Python',
  'python3': 'Python',

  // Node.js
  'node': 'Node.js',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',

  // REST APIs
  'rest': 'REST APIs',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  'restful': 'REST APIs',
  'api': 'REST APIs',
  'apis': 'REST APIs',

  // PostgreSQL
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'psql': 'PostgreSQL',

  // Docker
  'docker': 'Docker',
  'container': 'Docker',
  'containers': 'Docker',
  'dockerfile': 'Docker',

  // Testing
  'testing': 'Testing',
  'unit testing': 'Testing',
  'jest': 'Testing',
  'vitest': 'Testing',
  'pytest': 'Testing',
  'tdd': 'Testing',

  // Git workflow
  'git': 'Git workflow',
  'git workflow': 'Git workflow',
  'github': 'Git workflow',
  'version control': 'Git workflow',

  // System design
  'system design': 'System design',
  'distributed systems': 'System design',
  'architecture': 'System design',
  'microservices': 'System design',

  // Kubernetes
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',

  // AWS
  'aws': 'AWS',
  'amazon web services': 'AWS',
  's3': 'AWS',
  'ec2': 'AWS',
  'lambda': 'AWS',

  // Django
  'django': 'Django',

  // SQL
  'sql': 'SQL',

  // C++ / C
  'c++': 'C++',
  'cpp': 'C++',
  'c': 'C',

  // Linux
  'linux': 'Linux',

  // FastAPI / Flask
  'fastapi': 'FastAPI',
  'flask': 'Flask',

  // GraphQL / Redis
  'graphql': 'GraphQL',
  'redis': 'Redis',
}

/**
 * Normalize skill input (casing, spaces, known aliases).
 *
 * @param {string} raw - Raw skill name
 * @returns {string} Canonical skill name, or clean trimmed string if unknown
 */
export function normalizeSkill(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const clean = raw.trim().toLowerCase()
  return CANONICAL_MAP[clean] || raw.trim()
}

/**
 * Check if skill is a recognized canonical skill in ProofPass.
 *
 * @param {string} raw - Skill name
 * @returns {boolean}
 */
export function isKnownSkill(raw) {
  if (!raw || typeof raw !== 'string') return false
  const clean = raw.trim().toLowerCase()
  return Boolean(CANONICAL_MAP[clean])
}
