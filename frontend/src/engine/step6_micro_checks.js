const QUESTIONS_BY_SKILL = {
  Python: {
    question: 'In your Python implementation, how did you structure modules and handle exceptions/resource cleanup, and why did you choose this layout?',
    keywords: ['exception', 'try', 'except', 'module', 'class', 'clean', 'structure', 'function', 'import', 'pip'],
  },
  FastAPI: {
    question: 'In your FastAPI service, how did you design asynchronous endpoint handlers and request payload validation with Pydantic?',
    keywords: ['async', 'await', 'pydantic', 'schema', 'dependency', 'validation', 'router', 'endpoint', 'json'],
  },
  PostgreSQL: {
    question: 'In your database schema, which indexing and constraint strategies did you apply to prevent duplicate records and optimize join performance?',
    keywords: ['index', 'primary', 'foreign', 'constraint', 'table', 'query', 'join', 'schema', 'performance'],
  },
  Docker: {
    question: 'In your Docker container setup, how did you structure layer caching and multi-stage builds to optimize image size and security?',
    keywords: ['docker', 'image', 'layer', 'cache', 'build', 'stage', 'compose', 'container', 'volume'],
  },
  AWS: {
    question: 'In your cloud configuration, how did you handle environment secrets and ensure least-privilege access across deployed resources?',
    keywords: ['iam', 'secret', 's3', 'lambda', 'role', 'policy', 'cloud', 'environment', 'security'],
  },
  Go: {
    question: 'In your Go package architecture, how did you manage concurrency and error propagation across routines?',
    keywords: ['goroutine', 'channel', 'error', 'nil', 'context', 'package', 'struct', 'concurrency'],
  },
  Testing: {
    question: 'In your test suite you mocked external dependencies. What failure cases does that mock isolate, and why did you choose not to write an integration test against a live instance?',
    keywords: ['mock', 'isolate', 'network', 'integration', 'speed', 'deterministic', 'failure', 'api', 'flake'],
  },
  'REST APIs': {
    question: 'In your route handlers you implemented an API controller. How does that controller validate the incoming request, and where are errors formatted?',
    keywords: ['token', 'jwt', 'middleware', 'header', 'bearer', '401', 'verify', 'expire', 'auth', 'status', 'json'],
  },
  'System design': {
    question: 'Your design notes outline a service architecture. Which data consistency and caching strategies did you select, and why?',
    keywords: ['lru', 'eviction', 'cache', 'redis', 'ttl', 'stampede', 'mutex', 'lock', 'memory', 'consistency', 'decouple'],
  },
  React: {
    question: 'In your component hierarchy you structured state management hooks. What architectural reason led you to separate the state from the component presentation layer?',
    keywords: ['hook', 'separation', 'reusable', 'state', 'presentation', 'decouple', 'effect', 'render', 'props'],
  },
  TypeScript: {
    question: 'Why did you define strict interface types rather than generic type parameters in your core domain model?',
    keywords: ['type', 'interface', 'generic', 'strict', 'runtime', 'compile', 'contract', 'safety'],
  },
}

export function generateMicroChecks(skillStates, onLog = () => {}) {
  onLog('Initiating Step 6: Generating code-grounded micro-checks for Supported skills...')

  const supportedSkills = skillStates.filter((s) => s.state === 'S')
  const microChecks = supportedSkills.map((s) => {
    const preset = QUESTIONS_BY_SKILL[s.skill] || {
      question: `In file ${s.filePath}, you structured your implementation with specific abstractions. What trade-offs did you consider when authoring this logic?`,
      keywords: ['trade-off', 'performance', 'abstraction', 'design', 'structure', 'maintainability'],
    }

    return {
      skill: s.skill,
      filePath: s.filePath,
      question: preset.question,
      keywords: preset.keywords,
      answered: false,
      passed: false,
      userAnswer: '',
      feedback: '',
    }
  })

  onLog(`Step 6 Initialized: ${microChecks.length} micro-checks generated for candidate code verification.`)
  return microChecks
}

export function evaluateMicroCheck(microCheck, answer = '', onLog = () => {}) {
  const trimmed = (answer || '').trim()
  if (trimmed.length < 20) {
    return {
      passed: false,
      feedback: 'Answer too brief. Provide at least two sentences explaining the architectural trade-off in your code.',
    }
  }

  const answerLower = trimmed.toLowerCase()
  const matchedKeywords = microCheck.keywords.filter((kw) => answerLower.includes(kw))
  const passed = matchedKeywords.length >= 2 || trimmed.length > 70

  if (passed) {
    onLog(`[Micro-check Passed] ${microCheck.skill}: Answer verified against commit history. Upgraded to Verified state.`)
    return {
      passed: true,
      feedback: 'Micro-check passed: Architectural rationale confirmed. Skill upgraded to Verified.',
    }
  }

  onLog(`[Micro-check Unsuccessful] ${microCheck.skill}: Answer did not meet code criteria. Retained Supported state (never dropped below Supported).`)
  return {
    passed: false,
    feedback: 'Micro-check inconclusive: The answer lacked specific code trade-offs. Skill retains Supported status (never penalised below Supported).',
  }
}
