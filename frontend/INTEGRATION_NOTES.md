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

---

## Evidence Details Specification (`src/lib/evidenceDetails.js`)

### Overview
`evidenceDetails` enriches each skill on a cryptographic passport with real, verifiable excerpts, source badges, commit hashes, content digest snippets, confidence scores with factor breakdowns, and conflict reasons.
Honesty rule: Excerpts are strictly verbatim snippets from the submitted repository code or resume lines, never generated or hallucinated by a model. When no text is available, `"No excerpt available"` is rendered. A skill with zero evidence has no confidence meter.

### Cryptographic Boundary
The SHA-256 seal of the passport is computed solely over `[skill, state, evidenceText]`. `evidenceDetails` are display and audit metadata. The cryptographic seal remains uncompromised and fully valid regardless of display detail enrichment.

### Data Shape
```typescript
interface EvidenceConfidenceFactor {
  label: string;       // e.g. "Source baseline", "Original line share (82%)", "Credibility score"
  value: string;       // e.g. "80 max", "+66%", "72%"
}

interface EvidenceConfidence {
  value: number;       // 0 to 100 integer
  label: 'Low' | 'Medium' | 'High'; // < 40: Low, 40-69: Medium, 70+: High
  factors: EvidenceConfidenceFactor[];
}

interface EvidenceDetail {
  source: 'github' | 'resume' | 'certificate' | 'leetcode' | 'assessment';
  label: string;       // e.g. "GitHub Repository", "From resume (a claim, not evidence)"
  file: string | null; // e.g. "src/components/App.tsx"
  commit: string | null; // 7-character commit SHA, e.g. "a1b2c3d"
  url: string | null;  // Direct clickable link to commit or file
  excerpt: string;     // Verbatim excerpt from source file or resume line
  excerptSource: 'file' | 'resume' | 'sample';
  matchedTerm: string; // The specific keyword or alias matched
  contentHash: string | null; // 8-character SHA-256 snippet
  flagReason: string | null;  // e.g. "Forked repo with 0 original commits" (Why it conflicts)
  confidence: EvidenceConfidence | null; // null for skills with no evidence
  fetchedAt: string;   // ISO timestamp
}

// Attached to each passport skill:
interface PassportSkillWithEvidence {
  skill: string;
  state: 'V' | 'S' | 'C' | 'X';
  evidence: string;
  evidenceDetails?: EvidenceDetail[];
}
```

### Engine vs. Backend Responsibilities

#### Fields Supplied by Current Engine Run:
1. `file`: Extracted from confirmed/flagged pointers in `step3_check_evidence.js`.
2. `commit`: Extracted from pointer metadata or git log in `step1_read.js` / `step3_check_evidence.js`.
3. `contentHash`: 8-character prefix of file SHA-256 digest computed in `step3_check_evidence.js`.
4. `excerpt`: Verbatim text sliced from `readData.filesIndex[file].sample` or resume line matching alias taxonomy.
5. `flagReason`: For `X` (Contradicted) skills, captured from `pointer.flagReason` in Step 3 / Step 5.
6. `confidence`: Calculated by `src/lib/confidence.js` using engine lineShare and source ceilings (capped at 20 for resume).

#### Row-Level Confidence Rule:
Row-level confidence displays the highest confidence among a skill's evidence items as "{value}% {label}" (e.g. "72% High"), showing "No evidence" when evidenceDetails is empty, and omitted entirely for legacy passports without evidenceDetails.

---

## Job Description Import (`src/lib/jdReader.js` & `src/lib/jdParser.js`)

### Overview
The Job Description Import feature allows recruiters to ingest unstructured job specifications from uploaded documents (`.docx`, `.pdf`, `.txt`, `.md`) or pasted text into structured role criteria.
Document reading and parsing are deterministic and executed entirely in the client's browser (with native `DecompressionStream('deflate-raw')` for DOCX and native `DOMParser`). PDFs are sent to `/api/v1/extract-resume` solely for text extraction.

### Parser Output Contract (`parseJobDescription`)
```typescript
interface ParsedSkillRequirement {
  skillId: string;       // Normalized slug e.g. "react", "typescript"
  name: string;          // Formatted skill name e.g. "React", "TypeScript"
  importance: 'Must' | 'Should' | 'Nice'; // Heading & line cue context
  foundIn: string;       // Verbatim context sentence from JD (max 160 chars)
  isCustom?: boolean;    // Flagged true if not found in TAXONOMY catalog
}

interface ParsedJobDescription {
  title: string;         // Extracted role title
  location: string | null; // e.g. "London, UK", "New York, NY"
  workMode: 'Remote' | 'Hybrid' | 'On-site' | null;
  minExperienceYears: number | null; // e.g. 4
  skills: ParsedSkillRequirement[];  // Deduplicated (highest importance), max 15
  cleanedText: string;   // Cleaned description text (min 40 characters)
}
```

### Optional Role Fields (`src/api/roles.js`)
Role objects are extended with optional metadata extracted from the job description:
1. `location`: `string | null` - Geographical office or hiring location.
2. `workMode`: `'Remote' | 'Hybrid' | 'On-site' | null` - Working model.
3. `minExperienceYears`: `number | null` - Minimum years of professional experience.

These fields are rendered as compact informational chips on role cards (`RecruiterDashboard.jsx`) and in the role detail header & requirements tab (`RecruiterRoleDetail.jsx`).

### Backend Service Availability (`POST /api/v1/parse-role`)
ProofPass backend implements `POST /api/v1/parse-role` accepting `{ jd_text: string, default_role_name?: string }` for future server-side AI/NLP parsing enhancements. In the current architecture, client-side deterministic parsing guarantees instantaneous zero-latency role ingestion with complete privacy.


