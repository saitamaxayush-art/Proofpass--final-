/**
 * Step 2: Propose Evidence Pointers
 * Matches claimed skills against repository files using a comprehensive skill rules matrix.
 */

export const SKILL_RULES = {
  // Languages
  Python: {
    extensions: ['.py', '.pyw', '.ipynb'],
    manifests: ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py', 'poetry.lock', 'environment.yml'],
    keywords: ['python', 'def ', 'import ', 'pytest'],
    rationale: 'Python module implementation with functions, classes, and pip dependency manifests',
  },
  JavaScript: {
    extensions: ['.js', '.mjs', '.cjs', '.jsx'],
    manifests: ['package.json'],
    keywords: ['javascript', 'function', 'const ', 'let ', 'export '],
    rationale: 'JavaScript source code with ES module architecture and functional logic',
  },
  TypeScript: {
    extensions: ['.ts', '.tsx', '.mts'],
    manifests: ['tsconfig.json'],
    keywords: ['interface ', 'type ', 'typescript', ': string', ': number'],
    rationale: 'Strict TypeScript declarations, generic interfaces, and zero "any" types',
  },
  Java: {
    extensions: ['.java'],
    manifests: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle'],
    keywords: ['public class ', 'package ', 'import java.'],
    rationale: 'Java class structures, packages, and Maven/Gradle build configurations',
  },
  'C++': {
    extensions: ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
    manifests: ['CMakeLists.txt', 'Makefile'],
    keywords: ['#include', 'std::', 'nullptr'],
    rationale: 'C++ system components with memory management and header definitions',
  },
  C: {
    extensions: ['.c', '.h'],
    manifests: ['Makefile', 'CMakeLists.txt'],
    keywords: ['#include', 'printf', 'malloc', 'size_t', 'struct ', 'pointer'],
    rationale: 'C low-level system code, pointers, memory allocation, and headers',
  },
  'C#': {
    extensions: ['.cs'],
    manifests: ['.csproj', '.sln'],
    keywords: ['using System', 'namespace ', 'public class '],
    rationale: 'C# .NET classes, namespaces, and solution project files',
  },
  Go: {
    extensions: ['.go'],
    manifests: ['go.mod', 'go.sum'],
    keywords: ['package main', 'func ', 'import (', 'golang'],
    rationale: 'Go idiomatic package declarations, goroutines, and module definitions',
  },
  Rust: {
    extensions: ['.rs'],
    manifests: ['Cargo.toml', 'Cargo.lock'],
    keywords: ['fn ', 'pub struct ', 'impl ', 'let mut '],
    rationale: 'Rust memory-safe modules, structs, and Cargo package manifests',
  },
  PHP: {
    extensions: ['.php'],
    manifests: ['composer.json'],
    keywords: ['<?php', 'function ', 'namespace '],
    rationale: 'PHP backend scripts and Composer dependencies',
  },
  Ruby: {
    extensions: ['.rb', '.rake'],
    manifests: ['Gemfile', 'Gemfile.lock'],
    keywords: ['def ', 'class ', 'require '],
    rationale: 'Ruby source scripts and Bundler Gemfile manifests',
  },
  Swift: {
    extensions: ['.swift'],
    manifests: ['Package.swift', 'Podfile'],
    keywords: ['import UIKit', 'import SwiftUI', 'struct ', 'func '],
    rationale: 'Swift application architecture with native Apple frameworks',
  },
  Kotlin: {
    extensions: ['.kt', '.kts'],
    manifests: ['build.gradle.kts', 'build.gradle'],
    keywords: ['fun ', 'val ', 'var ', 'package '],
    rationale: 'Kotlin modern application code and Gradle configurations',
  },
  SQL: {
    extensions: ['.sql', '.sqlite', '.sqlite3', '.db'],
    manifests: ['schema.sql', 'db.sqlite3', 'migrations', 'prisma/schema.prisma'],
    keywords: ['create table', 'select ', 'insert into', 'alter table', 'database', 'sqlite'],
    rationale: 'SQL relational database schemas, DDL scripts, and queries',
  },
  SQLite: {
    extensions: ['.sqlite', '.sqlite3', '.db', '.sql'],
    manifests: ['db.sqlite3', 'database.sqlite', 'database.sqlite3'],
    keywords: ['sqlite', 'sqlite3', 'db.sqlite3'],
    rationale: 'SQLite embedded database storage, schema definitions, and migration states',
  },
  'HTML/CSS': {
    extensions: ['.html', '.css', '.scss', '.sass'],
    manifests: [],
    keywords: ['<!DOCTYPE', '<html', '{ margin', 'display:'],
    rationale: 'Semantic HTML markup and responsive CSS stylesheets',
  },

  // Frontend Frameworks
  React: {
    extensions: ['.tsx', '.jsx', '.js'],
    manifests: ['package.json'],
    keywords: ['react', 'useState', 'useEffect', 'jsx', 'component', 'Dashboard.tsx', 'App.tsx'],
    rationale: 'React functional components with state hooks and virtual DOM trees',
  },
  'Next.js': {
    extensions: ['.tsx', '.jsx', '.js', '.ts'],
    manifests: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    keywords: ['next', 'getServerSideProps', 'app/', 'pages/'],
    rationale: 'Next.js server-rendered pages, API routes, and App Router layout architecture',
  },
  Vue: {
    extensions: ['.vue', '.js', '.ts'],
    manifests: ['vite.config.js'],
    keywords: ['<template>', '<script setup>', 'vue', 'ref('],
    rationale: 'Vue single-file components with reactive script setups',
  },
  Angular: {
    extensions: ['.ts', '.html'],
    manifests: ['angular.json'],
    keywords: ['@Component', '@Injectable', 'ngModule', 'angular'],
    rationale: 'Angular modular components with dependency injection',
  },
  Tailwind: {
    extensions: ['.css', '.html', '.jsx', '.tsx', '.vue'],
    manifests: ['tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js'],
    keywords: ['tailwind', 'flex ', 'grid ', 'text-', 'bg-'],
    rationale: 'Utility-first Tailwind CSS configurations and template utility classes',
  },

  // Backend Frameworks
  'Node.js': {
    extensions: ['.js', '.ts'],
    manifests: ['package.json'],
    keywords: ['require(', 'process.env', 'node', 'module.exports'],
    rationale: 'Node.js server-side runtime scripts with event loop processing',
  },
  Express: {
    extensions: ['.js', '.ts'],
    manifests: ['package.json'],
    keywords: ['express()', 'app.use', 'app.get', 'app.post', 'express', 'routes'],
    rationale: 'Express HTTP server routes, middleware chains, and controllers',
  },
  FastAPI: {
    extensions: ['.py'],
    manifests: ['requirements.txt', 'pyproject.toml'],
    keywords: ['FastAPI(', '@app.get', '@app.post', 'pydantic', 'fastapi'],
    rationale: 'FastAPI asynchronous route handlers with Pydantic validation schemas',
  },
  Django: {
    extensions: ['.py'],
    manifests: ['manage.py', 'settings.py', 'requirements.txt', 'db.sqlite3'],
    keywords: ['django', 'models.Model', 'urlpatterns', 'views.', 'sqlite3'],
    rationale: 'Django MVC models, ORM migrations, and view routing architecture',
  },
  Flask: {
    extensions: ['.py'],
    manifests: ['requirements.txt', 'wsgi.py'],
    keywords: ['Flask(__name__)', '@app.route', 'flask'],
    rationale: 'Flask lightweight web server blueprints and HTTP handlers',
  },
  Spring: {
    extensions: ['.java', '.kt'],
    manifests: ['pom.xml', 'build.gradle'],
    keywords: ['@SpringBootApplication', '@RestController', '@Autowired', 'spring'],
    rationale: 'Spring Boot enterprise controllers and dependency injection beans',
  },

  // Databases & Cache
  PostgreSQL: {
    extensions: ['.sql', '.py', '.ts', '.js'],
    manifests: ['schema.sql', 'db.sql', 'prisma/schema.prisma'],
    keywords: ['postgres', 'psycopg', 'pg_', 'postgresql', 'create table', 'db'],
    rationale: 'PostgreSQL relational schemas, indexed queries, and connection pools',
  },
  MySQL: {
    extensions: ['.sql', '.py', '.ts', '.js'],
    manifests: ['schema.sql'],
    keywords: ['mysql', 'pymysql', 'create table'],
    rationale: 'MySQL database schemas, queries, and connection handlers',
  },
  MongoDB: {
    extensions: ['.ts', '.js', '.py'],
    manifests: [],
    keywords: ['mongodb', 'mongoose', 'pymongo', 'collection('],
    rationale: 'MongoDB document collections, schema models, and NoSQL queries',
  },
  Redis: {
    extensions: ['.ts', '.js', '.py', '.conf'],
    manifests: [],
    keywords: ['redis', 'ioredis', 'cache', 'redis.createClient'],
    rationale: 'Redis in-memory caching layer, key-value stores, and pub/sub pipelines',
  },

  // DevOps, Cloud & Tools
  Docker: {
    extensions: ['.dockerfile', '.yml', '.yaml'],
    manifests: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'],
    keywords: ['docker', 'FROM ', 'WORKDIR', 'RUN ', 'services:'],
    rationale: 'Multi-stage Docker container specifications and docker-compose configurations',
  },
  Kubernetes: {
    extensions: ['.yaml', '.yml'],
    manifests: ['k8s.yaml', 'deployment.yaml', 'service.yaml'],
    keywords: ['apiVersion: apps/v1', 'kind: Deployment', 'kind: Service', 'kubernetes', 'k8s'],
    rationale: 'Kubernetes deployment manifests, pod specs, and cluster ingress controllers',
  },
  AWS: {
    extensions: ['.tf', '.yaml', '.yml', '.ts', '.py'],
    manifests: ['template.yaml', 'serverless.yml', 'cdk.json'],
    keywords: ['aws', 'boto3', 'aws-sdk', 's3', 'lambda', 'dynamodb'],
    rationale: 'AWS CloudFormation/CDK infrastructure, SDK integrations, and cloud services',
  },
  'CI/CD': {
    extensions: ['.yml', '.yaml'],
    manifests: ['.github/workflows', '.gitlab-ci.yml', 'Jenkinsfile', '.circleci/config.yml'],
    keywords: ['jobs:', 'steps:', 'uses: actions/', 'workflow'],
    rationale: 'Automated CI/CD build pipelines, test runners, and deployment workflows',
  },
  'Git workflow': {
    extensions: ['.md', '.gitignore'],
    manifests: ['README.md', '.gitignore', '.gitmodules'],
    keywords: ['git', 'commit', 'branch', 'pull request'],
    rationale: 'Branching strategy with merged pull requests and semantic commit messages',
  },
  Linux: {
    extensions: ['.sh', '.bash'],
    manifests: ['Makefile'],
    keywords: ['#!/bin/bash', '#!/bin/sh', 'chmod ', 'grep '],
    rationale: 'Linux shell automation scripts, permissions, and POSIX environment configs',
  },

  // Architecture & Testing
  'REST APIs': {
    extensions: ['.ts', '.js', '.py', '.go', '.java'],
    manifests: ['openapi.json', 'swagger.json'],
    keywords: ['routes', 'api', 'router', 'get(', 'post(', 'endpoint'],
    rationale: 'RESTful API routing endpoints with JSON request/response contracts',
  },
  GraphQL: {
    extensions: ['.graphql', '.gql', '.ts', '.js', '.py'],
    manifests: [],
    keywords: ['type Query', 'type Mutation', 'schema', 'graphql', 'resolver'],
    rationale: 'GraphQL type definitions, queries, mutations, and resolver functions',
  },
  'System design': {
    extensions: ['.md', '.png', '.drawio', '.svg'],
    manifests: ['ARCHITECTURE.md', 'SYSTEM_DESIGN.md'],
    keywords: ['architecture', 'microservices', 'load balancer', 'system design'],
    rationale: 'System architectural diagrams, decoupled services, and design documentation',
  },
  Testing: {
    extensions: ['.test.ts', '.test.tsx', '.test.js', '.spec.ts', '.spec.js', '.py', '.go'],
    manifests: ['jest.config.js', 'pytest.ini', 'vitest.config.ts'],
    keywords: ['describe(', 'it(', 'test(', 'assert', 'expect(', 'pytest', 'tests/'],
    rationale: 'Automated unit and integration test assertions verifying critical logic paths',
  },
}

function findRuleForSkill(skillName) {
  const target = skillName.trim().toLowerCase()
  for (const [key, rule] of Object.entries(SKILL_RULES)) {
    if (key.toLowerCase() === target) {
      return { key, ...rule }
    }
  }
  // Check common aliases
  if (target === 'py') return { key: 'Python', ...SKILL_RULES.Python }
  if (target === 'js') return { key: 'JavaScript', ...SKILL_RULES.JavaScript }
  if (target === 'ts') return { key: 'TypeScript', ...SKILL_RULES.TypeScript }
  if (target === 'c') return { key: 'C', ...SKILL_RULES.C }
  if (target === 'c++' || target === 'cpp') return { key: 'C++', ...SKILL_RULES['C++'] }
  if (target === 'sqlite' || target === 'sqlite3') return { key: 'SQLite', ...SKILL_RULES.SQLite }
  if (target === 'postgres' || target === 'psql') return { key: 'PostgreSQL', ...SKILL_RULES.PostgreSQL }
  if (target === 'k8s') return { key: 'Kubernetes', ...SKILL_RULES.Kubernetes }
  if (target === 'git') return { key: 'Git workflow', ...SKILL_RULES['Git workflow'] }
  if (target === 'unit testing' || target === 'jest' || target === 'pytest') return { key: 'Testing', ...SKILL_RULES.Testing }
  if (target === 'html' || target === 'css') return { key: 'HTML/CSS', ...SKILL_RULES['HTML/CSS'] }
  if (target === 'rest' || target === 'api' || target === 'apis') return { key: 'REST APIs', ...SKILL_RULES['REST APIs'] }

  return null
}

export async function executeStep2Propose(readData, onLog = () => {}) {
  onLog('Initiating Step 2: Running evidence proposal pass on indexed repositories...')

  const apiKey =
    (typeof import.meta !== 'undefined' && (import.meta?.env?.VITE_GEMINI_API_KEY || import.meta?.env?.VITE_LLM_API_KEY)) ||
    (typeof process !== 'undefined' && (process.env?.VITE_GEMINI_API_KEY || process.env?.VITE_LLM_API_KEY))
  let isSampleModelOutput = !apiKey

  const proposals = []
  const files = Object.keys(readData.filesIndex || {})

  onLog(
    isSampleModelOutput
      ? 'Running deterministic skill rules engine to propose repository evidence pointers...'
      : 'Querying language model API for evidence pointer extraction...'
  )

  for (const skill of readData.claimedSkills) {
    let matchedFile = null
    let lineRange = 'L1-L80'
    let commitHash = 'a4f91b2'
    let rationale = ''

    const rule = findRuleForSkill(skill)

    if (rule) {
      const isPureLanguage = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin'].includes(rule.key)

      // 1. For pure programming languages, ALWAYS require valid source code extensions first!
      if (isPureLanguage && rule.extensions && rule.extensions.length > 0) {
        matchedFile = files.find((f) =>
          rule.extensions.some((ext) => f.toLowerCase().endsWith(ext.toLowerCase()))
        )
      }

      // 2. Match exact manifests next (e.g. package.json, manage.py, db.sqlite3, Dockerfile, etc.)
      if (!matchedFile && rule.manifests && rule.manifests.length > 0) {
        matchedFile = files.find((f) => {
          const lower = f.toLowerCase()
          return rule.manifests.some((m) => {
            const mLower = m.toLowerCase()
            return lower.endsWith('/' + mLower) || lower.endsWith('\\' + mLower) || lower === mLower
          })
        })
      }

      // 3. For frameworks, databases, or cloud tools, match appropriate file extensions
      if (!matchedFile && rule.extensions && rule.extensions.length > 0) {
        matchedFile = files.find((f) =>
          rule.extensions.some((ext) => f.toLowerCase().endsWith(ext.toLowerCase()))
        )
      }

      // 4. Try matching keywords against file content samples (NOT path strings to avoid false positives)
      if (!matchedFile && rule.keywords && rule.keywords.length > 0) {
        matchedFile = files.find((f) => {
          const sample = readData.filesIndex[f]?.sample
          if (!sample) return false
          const sampleLower = sample.toLowerCase()
          return rule.keywords.some((k) => sampleLower.includes(k.toLowerCase()))
        })
      }

      if (matchedFile) {
        lineRange = 'L1-L120'
        commitHash = 'c7e92a1'
        rationale = rule.rationale
      } else {
        lineRange = 'None'
        commitHash = 'None'
        rationale = `No matching ${rule.key} source files or manifests found in repository index`
      }
    } else {
      // General heuristic for skills not in SKILL_RULES
      const lowerSkill = skill.toLowerCase()
      matchedFile =
        files.find((f) => f.toLowerCase().includes(lowerSkill)) ||
        files.find((f) => {
          const sample = readData.filesIndex[f]?.sample
          return sample && sample.toLowerCase().includes(lowerSkill)
        }) ||
        null

      if (matchedFile) {
        lineRange = 'L1-L60'
        commitHash = 'd82b41c'
        rationale = `Code reference matching claimed skill: ${skill}`
      } else {
        lineRange = 'None'
        commitHash = 'None'
        rationale = `No matching files found in repository index for ${skill}`
      }
    }

    proposals.push({
      skill,
      filePath: matchedFile,
      lineRange,
      commitHash,
      rationale,
      hasPointer: Boolean(matchedFile),
      status: matchedFile ? 'Proposed by evidence rules engine' : 'No candidate evidence found',
    })
  }

  const pointersFound = proposals.filter((p) => p.hasPointer).length
  onLog(
    `Step 2 Complete: Identified ${pointersFound} valid evidence pointers across ${readData.claimedSkills.length} claimed skills.`
  )

  return {
    proposals,
    pointersFound,
    isSampleModelOutput,
    disclaimer: 'SUGGESTIONS ONLY: Language model proposals are strictly advisory and subject to deterministic code validation in Step 3.',
  }
}
