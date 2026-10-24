
const QUESTIONS_BY_SKILL = {
  Python: {
    question:
      'In your Python implementation, how did you structure modules and handle exceptions/resource cleanup, and why did you choose this layout?',
    keywords: [
      'exception', 'try', 'except', 'module', 'class', 'clean',
      'structure', 'function', 'import', 'pip',
    ],
  },
  FastAPI: {
    question:
      'In your FastAPI service, how did you design asynchronous endpoint handlers and request payload validation with Pydantic?',
    keywords: [
      'async', 'await', 'pydantic', 'schema', 'dependency',
      'validation', 'router', 'endpoint', 'json',
    ],
  },
  PostgreSQL: {
    question:
      'In your database schema, which indexing and constraint strategies did you apply to prevent duplicate records and optimize join performance?',
    keywords: [
      'index', 'primary', 'foreign', 'constraint', 'table',
      'query', 'join', 'schema', 'performance',
    ],
  },
  Docker: {
    question:
      'In your Docker container setup, how did you structure layer caching and multi-stage builds to optimize image size and security?',
    keywords: [
      'docker', 'image', 'layer', 'cache', 'build',
      'stage', 'compose', 'container', 'volume',
    ],
  },
  AWS: {
    question:
      'In your cloud configuration, how did you handle environment secrets and ensure least-privilege access across deployed resources?',
    keywords: [
      'iam', 'secret', 's3', 'lambda', 'role',
      'policy', 'cloud', 'environment', 'security',
    ],
  },
  Go: {
    question:
      'In your Go package architecture, how did you manage concurrency and error propagation across routines?',
    keywords: [
      'goroutine', 'channel', 'error', 'nil',
      'context', 'package', 'struct', 'concurrency',
    ],
  },
  Testing: {
    question:
      'In your test suite you mocked external dependencies. What failure cases does that mock isolate, and why did you choose not to write an integration test against a live instance?',
    keywords: [
      'mock', 'isolate', 'network', 'integration', 'speed',
      'deterministic', 'failure', 'api', 'flake',
    ],
  },
  'REST APIs': {
    question:
      'In your route handlers you implemented an API controller. How does that controller validate the incoming request, and where are errors formatted?',
    keywords: [
      'token', 'jwt', 'middleware', 'header', 'bearer',
      '401', 'verify', 'expire', 'auth', 'status', 'json',
    ],
  },
  'System design': {
    question:
      'Your design notes outline a service architecture. Which data consistency and caching strategies did you select, and why?',
    keywords: [
      'lru', 'eviction', 'cache', 'redis', 'ttl',
      'stampede', 'mutex', 'lock', 'memory', 'consistency', 'decouple',
    ],
  },
  React: {
    question:
      'In your component hierarchy you structured state management hooks. What architectural reason led you to separate the state from the component presentation layer?',
    keywords: [
      'hook', 'separation', 'reusable', 'state', 'presentation',
      'decouple', 'effect', 'render', 'props',
    ],
  },
  TypeScript: {
    question:
      'Why did you define strict interface types rather than generic type parameters in your core domain model?',
    keywords: [
      'type', 'interface', 'generic', 'strict',
      'runtime', 'compile', 'contract', 'safety',
    ],
  },
};

export function generateMicroChecks(skillStates, onLog = () => {}) {
  onLog(
    'Initiating Step 6: Generating code-grounded micro-checks for Supported skills...'
  );

  const supportedSkills = skillStates.filter((s) => s.state === 'S');

  const microChecks = supportedSkills.map((s) => {
    const preset = QUESTIONS_BY_SKILL[s.skill] || {
      question: `In file ${s.filePath}, you structured your implementation with specific abstractions. What trade-offs did you consider when authoring this logic?`,
      keywords: [
        'trade-off',
        'performance',
        'abstraction',
        'design',
        'structure',
        'maintainability',
      ],
    };

    return {
      skill: s.skill,
      filePath: s.filePath,
      question: preset.question,
      keywords: preset.keywords,
      answered: false,
      passed: false,
      userAnswer: '',
      feedback: '',
    };
  });

  onLog(
    `Step 6 Initialized: ${microChecks.length} micro-checks generated for candidate code verification.`
  );

  return microChecks;
}

// Basic answer-quality checks. These reject empty, repetitive,
// keyboard-mash and obviously low-quality answers.
function assessAnswerQuality(answer) {
  const text = String(answer || '').trim();
  const words =
    text.toLowerCase().match(/[a-z][a-z'-]{1,}|\b\d+\b/g) || [];

  const meaningfulWords = words.filter(
    (word) => !/^(.)\1{2,}$/.test(word)
  );

  const uniqueWords = new Set(meaningfulWords);
  const letters = text.match(/[a-z]/gi) || [];
  const vowels = text.match(/[aeiou]/gi) || [];

  const repeatedWordCount =
    meaningfulWords.length - uniqueWords.size;

  const longestToken = (
    text.match(/[a-z]{8,}/gi) || []
  ).some((token) => !/[aeiouy]/i.test(token));

  if (text.length < 25 || meaningfulWords.length < 5) {
    return {
      ok: false,
      reason:
        'Please provide a complete explanation using meaningful words.',
    };
  }

  if (
    letters.length >= 12 &&
    vowels.length / letters.length < 0.18
  ) {
    return {
      ok: false,
      reason:
        'This does not look like a readable explanation. Please answer in your own words.',
    };
  }

  if (longestToken || uniqueWords.size < 4) {
    return {
      ok: false,
      reason:
        'The answer appears to contain gibberish or repeated text. Please explain your reasoning clearly.',
    };
  }

  if (
    meaningfulWords.length >= 8 &&
    repeatedWordCount / meaningfulWords.length > 0.45
  ) {
    return {
      ok: false,
      reason:
        'Repeating the same words is not enough. Please provide a specific explanation.',
    };
  }

  return {
    ok: true,
    text,
    words: meaningfulWords,
    uniqueWords,
  };
}

export function evaluateMicroCheck(
  microCheck,
  answer = '',
  onLog = () => {}
) {
  const quality = assessAnswerQuality(answer);

  if (!quality.ok) {
    return {
      passed: false,
      feedback: `${quality.reason} Skill remains Supported; this attempt does not upgrade it to Verified.`,
    };
  }

  const answerLower = quality.text.toLowerCase();

  const matchedKeywords = (microCheck.keywords || []).filter(
    (keyword) => {
      const escaped = keyword.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      return new RegExp(
        `(^|[^a-z0-9])${escaped.toLowerCase()}([^a-z0-9]|$)`
      ).test(answerLower);
    }
  );

  const reasoningSignals = [
    'because',
    'therefore',
    'so that',
    'which means',
    'this means',
    'helps',
    'allows',
    'prevents',
    'reduces',
    'improves',
    'ensures',
    'instead of',
    'in order to',
    'the reason',
    'for example',
    'when',
    'by using',
    'trade-off',
  ];

  const hasReasoning = reasoningSignals.some((signal) =>
    answerLower.includes(signal)
  );

  const distinctKeywordMatches = new Set(
    matchedKeywords.map((keyword) => keyword.toLowerCase())
  ).size;

  const keywords = microCheck.keywords || [];

  const meaningfulNonKeywordWords = quality.words.filter(
    (word) =>
      !keywords.some(
        (keyword) => keyword.toLowerCase() === word
      )
  );

  // An answer must be readable, relevant to the skill, and explanatory.
  // Length alone can never make an answer pass.
  const passed =
    distinctKeywordMatches >= 2 &&
    hasReasoning &&
    meaningfulNonKeywordWords.length >= 3;

  if (passed) {
    onLog(
      `[Micro-check Passed] ${microCheck.skill}: Answer passed relevance and explanation checks.`
    );

    return {
      passed: true,
      feedback:
        `Micro-check passed: the answer includes ${distinctKeywordMatches} relevant technical concepts and explains the reasoning. Skill upgraded to Verified.`,
    };
  }

  onLog(
    `[Micro-check Unsuccessful] ${microCheck.skill}: Answer did not meet relevance and reasoning criteria.`
  );

  return {
    passed: false,
    feedback:
      `Answer not verified yet. It must address the question with at least two relevant concepts and explain why/how they apply` +
      (distinctKeywordMatches < 2
        ? ` (only ${distinctKeywordMatches} relevant concept(s) detected)`
        : '') +
      (!hasReasoning ? ' (reasoning was not clear)' : '') +
      '. Skill remains Supported.',
  };
}
