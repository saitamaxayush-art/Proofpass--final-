# ProofPass Frontend Integration Notes

This document provides contract specifications and integration documentation between the frontend presentation layer and the future or current backend service endpoints.

---

## Candidate Comparison Feature (`src/lib/compare.js`)

### Overview
The candidate comparison feature enables recruiters to evaluate 2 to 3 candidates side-by-side against specific job requirements.
It runs deterministic evaluations of:
1. Candidate rank and overall match score (%)
2. Skill states distribution (Verified, Supported, Claimed, Contradicted) with thin visual share bars
3. Evidence freshness based on cryptographic audit trails
4. Key strengths (up to 3 required skills in state `V`, ordered by importance `Must > Should > Nice` then freshness)
5. Concerns (up to 3 required skills: `Contradicted` first, then `Claimed`, then missing from passport, ordered by importance)
6. Competency matrix across all role requirements (Must, Should, Nice), tagging strictly superior performance with `"Strongest"` (ties receive no tag)
7. Filter toggle for viewing only skills where candidates differ

---

### `buildComparison(role, applicants)` Contract

#### Input Shape
```typescript
interface RoleRequirement {
  skill: string;          // e.g. "React", "TypeScript"
  importance: 'Must' | 'Should' | 'Nice';
  weight?: number;        // Must: 3, Should: 2, Nice: 1
}

interface Role {
  id: string;
  title: string;
  company: string;
  description?: string;
  requiredSkills: RoleRequirement[];
}

interface PassportSkill {
  skill: string;
  state: 'V' | 'S' | 'C' | 'X';
  level?: number;
  evidence?: string;
  date?: string;          // ISO date string
}

interface Passport {
  id: string;
  candidate: string;
  targetRole: string;
  issuedAt: string;       // ISO date string
  hash: string;
  revoked?: boolean;
  skills: PassportSkill[];
}

interface Applicant {
  id: string;
  name: string;
  email: string;
  hasPassport: boolean;
  passport: Passport;
  isLiveDemo?: boolean;
  isRecruiterGenerated?: boolean;
}

// Function signature
function buildComparison(role: Role, applicants: Applicant[]): ComparisonReport;
```

#### Output Shape
```typescript
interface CandidateSummary {
  id: string;
  name: string;
  email: string;
  passportId: string | null;
  rank: number;
  score: number;           // 0 to 100 percentage
  counts: {
    V: number;
    S: number;
    C: number;
    X: number;
    total: number;
  };
  stateShares: {
    V: number;            // 0 to 100 share
    S: number;
    C: number;
    X: number;
  };
  freshness: {
    iso: string | null;
    label: string;        // e.g. "Oct 24, 2026"
    timestamp: number;
  };
  strengths: string[];    // e.g. ["Verified: React (Must)", "Verified: TypeScript (Must)"]
  concerns: string[];     // e.g. ["Contradicted: Docker (Must)", "Claimed only: Kubernetes (Should)"]
  isLiveDemo: boolean;
  isRecruiterGenerated: boolean;
}

interface SkillCandidateState {
  applicantId: string;
  candidateName: string;
  state: 'V' | 'S' | 'C' | 'X' | 'missing';
  level: number;
  evidence: string;
  stateRank: number;      // V: 4, S: 3, C: 2, X: 1, missing: 0
  isStrongest: boolean;   // true if strictly highest state among compared candidates (no ties)
}

interface SkillMatrixRow {
  skill: string;
  importance: 'Must' | 'Should' | 'Nice';
  weight: number;
  hasDifference: boolean; // true if candidates do not all share the exact same state
  states: SkillCandidateState[];
}

interface ComparisonReport {
  candidates: CandidateSummary[];
  skillsMatrix: SkillMatrixRow[];
  differingSkillsCount: number;
  totalSkillsCount: number;
}
```

---

### Backend Requirements

For comparison and role evaluations to function reliably in production, the backend must supply:
1. `GET /api/v1/roles/:roleId`:
   - Returns the role definition, including `requiredSkills` array with `skill`, `importance`, and `weight`.
2. `GET /api/v1/roles/:roleId/applicants`:
   - Returns candidate records with attached passport data (`withPassport`), including:
     - Full `skills` array with state classifications (`V`, `S`, `C`, `X`) and `level`.
     - `issuedAt` timestamp or per-skill `date` timestamps for evidence freshness.
     - `hash` (SHA-256 seal) for cryptographic tamper checking.
3. High-throughput query support by applicant IDs:
   - When loading candidate comparison views, fetching applicants by IDs (e.g. `GET /api/v1/applicants?ids=a,b,c` or filtering `/api/v1/roles/:roleId/applicants`).

---

## Skills by state (`src/lib/skillsByState.js`)

### Overview
When a recruiter clicks any of the four "Skill states" tiles (Verified, Supported, Claimed, Contradicted) on a candidate's leaderboard card, an in-card drawer expands to display that candidate's skills categorized in that state.

### `getSkillsByState(passport, role)` Contract
Pure function mapping a candidate's cryptographic passport skills against role requirements.

#### Output Shape
```typescript
interface SkillStateItem {
  skillId: string;       // Normalized slug e.g. "react", "typescript"
  name: string;          // Original skill name
  level?: number;        // Competency level (1-5) when present in passport
  state: 'V' | 'S' | 'C' | 'X';
  importance: 'Must' | 'Should' | 'Nice' | null; // null represents "Extra skill"
  sources: ('GitHub' | 'LeetCode' | 'Certificate' | 'Resume' | 'Assessment')[];
  confidence?: number;   // Highest evidence confidence (0-1 or 0-100) when present
  reason?: string;       // Stored rationale / flag reason for X and C skills
  passportAnchor: string;// e.g. "skill-react" for /passport/:passportId#skill-<skillId>
}

interface SkillsByStateReport {
  V: SkillStateItem[];
  S: SkillStateItem[];
  C: SkillStateItem[];
  X: SkillStateItem[];
}
```

### Tile Count Single Source of Truth
The count displayed on each leaderboard state tile (Verified, Supported, Claimed, Contradicted) is derived directly from the length of `report[state]`. The four lengths sum to the candidate's total evaluated skills.

