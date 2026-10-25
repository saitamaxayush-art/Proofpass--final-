/**
 * Verifiable Project Ideas
 * Concrete, public-repo project ideas for skills requiring ground-truth proof.
 */

export const PROJECT_IDEAS = {
  React: 'Build a responsive web application featuring custom state management hooks and component tests in a public repository.',
  TypeScript: 'Author a type-safe library or API client with strict tsconfig, generics, and zero "any" types.',
  JavaScript: 'Develop an interactive browser utility with asynchronous ES6+ modules and zero runtime dependencies.',
  'REST APIs': 'Implement an idempotent REST API service with request schema validation, status codes, and OpenAPI contracts.',
  Testing: 'Set up an automated CI workflow with unit and integration test suites covering critical service branches.',
  Docker: 'Write a multi-stage Dockerfile for a production service with layer caching and a docker-compose setup.',
  PostgreSQL: 'Design a normalized database schema with indexed foreign keys, relational queries, and SQL migration files.',
  'Git workflow': 'Maintain a public GitHub repository with clear commit hygiene, feature branches, and merged pull requests.',
  Python: 'Develop an asynchronous CLI tool or data pipeline with modular service classes and unit tests.',
  AWS: 'Deploy an automated serverless application using AWS Lambda, S3 storage, and least-privilege IAM configuration.',
  'System design': 'Publish an architectural design document and prototype demonstrating cache invalidation, rate limiting, and queueing.',
  Kubernetes: 'Author Kubernetes deployment manifests with ConfigMaps, services, horizontal pod autoscaling, and health probes.',
  Django: 'Create a Django application with relational models, querysets, authentication views, and automated tests.',
  SQL: 'Author schema DDL and complex relational queries with joins, grouping, and indexing strategies.',
  'C++': 'Develop a performance-critical CLI tool utilizing modern C++ memory management and RAII patterns.',
  C: 'Implement standard data structures and file I/O operations with strict memory safety and makefile builds.',
  Linux: 'Write automated bash automation scripts managing systemd services and process signals.',
  FastAPI: 'Build a high-throughput async microservice with Pydantic request models and dependency injection.',
  Flask: 'Create a lightweight web application with modular blueprints, session handling, and unit test suites.',
  'Node.js': 'Build an event-driven server utility handling streams, child processes, and asynchronous file operations.',
  GraphQL: 'Implement type-safe GraphQL schemas, resolvers, and queries with dataloader batching.',
  Redis: 'Implement an in-memory caching and session store layer with TTL expiration and atomic operations.',
}

/**
 * Get project idea for a canonical skill.
 *
 * @param {string} canonicalSkill
 * @returns {string|null}
 */
export function getProjectIdea(canonicalSkill) {
  return PROJECT_IDEAS[canonicalSkill] || null
}
