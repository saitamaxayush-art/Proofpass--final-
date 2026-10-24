/**
 * Learning and Practice Resources
 * Curated public learning resources mapped to skills with verified platform root / topic URLs.
 */

export const RESOURCES = [
  // React
  {
    id: 'res-react-fcc',
    title: 'Front End Development Libraries: React and Redux',
    platform: 'freeCodeCamp',
    skill: 'React',
    level: 'Working',
    cost: 'Free',
    url: 'https://www.freecodecamp.org/learn/',
    type: 'course',
  },
  {
    id: 'res-react-coursera',
    title: 'Meta Advanced React Curriculum',
    platform: 'Coursera',
    skill: 'React',
    level: 'Strong',
    cost: 'Free to audit',
    url: 'https://www.coursera.org/search?query=react',
    type: 'course',
  },

  // TypeScript
  {
    id: 'res-ts-fcc',
    title: 'TypeScript for Beginners and Advanced Types',
    platform: 'freeCodeCamp',
    skill: 'TypeScript',
    level: 'Working',
    cost: 'Free',
    url: 'https://www.freecodecamp.org/learn/',
    type: 'course',
  },
  {
    id: 'res-ts-leetcode',
    title: 'LeetCode TypeScript Solutions Practice List',
    platform: 'LeetCode',
    skill: 'TypeScript',
    level: 'Strong',
    cost: 'Free',
    url: 'https://leetcode.com/problemset/',
    type: 'practice',
  },

  // Python
  {
    id: 'res-python-kaggle',
    title: 'Python Language Fundamentals & Idiomatic Syntax',
    platform: 'Kaggle Learn',
    skill: 'Python',
    level: 'Beginner',
    cost: 'Free',
    url: 'https://www.kaggle.com/learn',
    type: 'course',
  },
  {
    id: 'res-python-hackerrank',
    title: 'Python Skill Certification Practice Track',
    platform: 'HackerRank',
    skill: 'Python',
    level: 'Working',
    cost: 'Free',
    url: 'https://www.hackerrank.com/domains/python',
    type: 'practice',
  },

  // REST APIs & Backend
  {
    id: 'res-rest-coursera',
    title: 'Designing and Implementing Scalable REST APIs',
    platform: 'Coursera',
    skill: 'REST APIs',
    level: 'Working',
    cost: 'Free to audit',
    url: 'https://www.coursera.org/search?query=rest+api',
    type: 'course',
  },
  {
    id: 'res-node-fcc',
    title: 'Back End Development and APIs Certification',
    platform: 'freeCodeCamp',
    skill: 'Node.js',
    level: 'Working',
    cost: 'Free',
    url: 'https://www.freecodecamp.org/learn/',
    type: 'course',
  },

  // PostgreSQL & SQL
  {
    id: 'res-sql-kaggle',
    title: 'Intro & Advanced SQL with Query Optimization',
    platform: 'Kaggle Learn',
    skill: 'PostgreSQL',
    level: 'Working',
    cost: 'Free',
    url: 'https://www.kaggle.com/learn',
    type: 'course',
  },
  {
    id: 'res-sql-hackerrank',
    title: 'SQL Relational Queries and Joins Challenge Track',
    platform: 'HackerRank',
    skill: 'PostgreSQL',
    level: 'Strong',
    cost: 'Free',
    url: 'https://www.hackerrank.com/domains/sql',
    type: 'practice',
  },

  // Docker & Kubernetes
  {
    id: 'res-docker-cloudskills',
    title: 'Containerization and Docker Foundations',
    platform: 'Google Cloud Skills Boost',
    skill: 'Docker',
    level: 'Working',
    cost: 'Free introductory track',
    url: 'https://www.cloudskillsboost.google/',
    type: 'course',
  },
  {
    id: 'res-k8s-cloudskills',
    title: 'Kubernetes Cluster Administration and Services',
    platform: 'Google Cloud Skills Boost',
    skill: 'Kubernetes',
    level: 'Strong',
    cost: 'Free introductory track',
    url: 'https://www.cloudskillsboost.google/',
    type: 'course',
  },

  // AWS & Cloud
  {
    id: 'res-aws-builder',
    title: 'AWS Technical Essentials & Architecture Basics',
    platform: 'AWS Skill Builder',
    skill: 'AWS',
    level: 'Working',
    cost: 'Free',
    url: 'https://explore.skillbuilder.aws/',
    type: 'course',
  },
  {
    id: 'res-aws-cloudskills',
    title: 'Cloud Architecture Core Services and Security',
    platform: 'Google Cloud Skills Boost',
    skill: 'AWS',
    level: 'Strong',
    cost: 'Free introductory track',
    url: 'https://www.cloudskillsboost.google/',
    type: 'course',
  },

  // Testing & Quality
  {
    id: 'res-testing-fcc',
    title: 'Quality Assurance and Unit Testing with Assertion Suites',
    platform: 'freeCodeCamp',
    skill: 'Testing',
    level: 'Working',
    cost: 'Free',
    url: 'https://www.freecodecamp.org/learn/',
    type: 'course',
  },
  {
    id: 'res-testing-coursera',
    title: 'Automated Testing, Mocking, and Test-Driven Development',
    platform: 'Coursera',
    skill: 'Testing',
    level: 'Strong',
    cost: 'Free to audit',
    url: 'https://www.coursera.org/search?query=unit+testing',
    type: 'course',
  },

  // System Design
  {
    id: 'res-sysdes-coursera',
    title: 'Software Design and Architecture Specialization',
    platform: 'Coursera',
    skill: 'System design',
    level: 'Strong',
    cost: 'Free to audit',
    url: 'https://www.coursera.org/search?query=system+design',
    type: 'course',
  },

  // Data Structures & Algorithms
  {
    id: 'res-dsa-leetcode',
    title: 'Core Data Structures and Algorithm Patterns',
    platform: 'LeetCode',
    skill: 'Data structures & Algorithms',
    level: 'Strong',
    cost: 'Free',
    url: 'https://leetcode.com/problemset/',
    type: 'practice',
  },
  {
    id: 'res-dsa-hackerrank',
    title: 'Problem Solving and Algorithm Challenges',
    platform: 'HackerRank',
    skill: 'Data structures & Algorithms',
    level: 'Working',
    cost: 'Free',
    url: 'https://www.hackerrank.com/domains/algorithms',
    type: 'practice',
  },
]

/**
 * Build assessment link for iMocha verification.
 * TODO: Replace this root landing URL with the authenticated per-skill test invitation URL once the iMocha partner integration is enabled.
 */
export function imochaLink(skill = '') {
  // Prototype returns the official iMocha landing page
  return 'https://www.imocha.io/'
}
