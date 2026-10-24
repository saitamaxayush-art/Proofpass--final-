# ProofPass Coding Platform Verification Notes

## 1. Overview and Trust Model

ProofPass incorporates third-party coding platform evidence from Codeforces and LeetCode.
Because handles are submitted by candidates without cryptographic signing or OAuth ownership verification, all handles are treated as unproven.

### Trust Ceiling Configuration
- `TrustCeiling.CANDIDATE_SUPPLIED` is the ceiling applied to all platform evidence while `ownership_verified == False`.
  - Configured as the single switch `UNVERIFIED_PLATFORM_CEILING` in `backend/intelligence/state_engine.py`.
  - Prevents an unverified handle from elevating any skill to `Verified`. The maximum state obtainable from unverified platform evidence alone is `Supported`.
- `TrustCeiling.THIRD_PARTY_ATTESTED` (`VERIFIED_PLATFORM_CEILING`) is reserved for when handle ownership verification is enabled.
- What an ownership check would change:
  - Validating ownership (e.g., via OAuth login, DNS TXT record, bio token verification, or signed challenge) would flip `ownership_verified` to `True`.
  - The ceiling would immediately become `Third-Party-Attested` via the single configuration switch, allowing platform signals to qualify as verified third-party attestations without changing any core logic.

---

## 2. Signals and Thresholds

All matching and threshold assessments are 100% deterministic code without LLM inference.

### Topic Skills (Algorithms, Data Structures, Dynamic Programming, Graphs, etc.)
- **Threshold: "some" (Weight: 0.5)**
  - Requires at least 10 distinct solved problems across the mapped canonical tags/topics.
  - *Rationale*: Demonstrates basic familiarity and practical problem-solving in the specific domain beyond toy examples.
- **Threshold: "strong" (Weight: 0.8)**
  - Requires at least 40 distinct solved problems across the mapped canonical tags/topics, PLUS quality difficulty gating:
    - At least 10 solved problems rated 1400+ on Codeforces (or user contest rating >= 1400 with 10+ solves), OR
    - At least 15 Medium or Hard solved problems on LeetCode.
  - *Rationale*: Raw solve counts can be inflated with trivial 800-rated Codeforces problems or LeetCode easy problems. Requiring difficulty-rated solves ensures authentic mastery of complex algorithmic concepts.

### Programming Languages (C++, Python, Java, etc.)
- **Threshold: "some" (Weight: 0.5)**
  - Requires at least 10 accepted submissions or solved problems in that language.
- **Threshold: "strong" (Weight: 0.8)**
  - Requires at least 50 accepted submissions or solved problems in that language.
  - *Rationale*: Shows substantial active language fluency across diverse algorithmic challenges.

---

## 3. Contradiction Rules

Candidate resume statements are checked deterministically for factual contradictions:

1. **Codeforces Rank and Title Inflation**:
   - Compares claimed titles (Pupil, Specialist, Expert, Candidate Master, Master, International Master, Grandmaster, etc.) against official Codeforces rating bounds.
   - A conflict is reported only when both current rating and max rating are strictly below the title's lower bound.
2. **Problem Count Overstatement (80% Tolerance Rule)**:
   - When a candidate claims a specific solve count (e.g., "500+ problems solved on LeetCode"), a conflict is reported if the fetched total is below 80% of the claim.
   - Example: Claiming 500 when fetched profile shows 350 is flagged, with both numbers explicitly cited.
3. **LeetCode Contest Badges**:
   - Knight (top 25%, ~1850+ contest rating) and Guardian (top 5%, ~2150+ contest rating).
   - If a candidate claims a badge but their contest rating is significantly below the grounded threshold and the badge is absent, a factual conflict is raised.
4. **Handle Mismatch**:
   - If the resume text references a specific handle URL that differs from the handle submitted in the form, a mismatch conflict is reported.
5. **No Conflict on Missing Data**:
   - If platform data is unavailable, rate-limited, or not found, it is recorded as a note only. It never triggers a contradiction or reduces claim state.

---

## 4. Evidence Combination and No Double Counting

When a candidate possesses both GitHub repository evidence and coding platform evidence for the same skill:
- **Evidence Weight**: We take `max(repo_authorship_pct, platform_weight)`. They are never summed together, preventing artificial score inflation.
- **Evidence Chain**: Both entries are preserved in `evidence_chain` for full auditability and transparency.
- **Ceiling Rules**:
  - If repo evidence alone provides strong authorship, the repository's provenance ceiling (e.g., `Platform-Verified`) is preserved.
  - If repo evidence is weak or absent and the skill relies on unverified platform evidence, the lower ceiling (`Candidate-Supplied`) is applied.

---

## 5. Known Platform Limitations

- **LeetCode GraphQL**: Unofficial endpoint without an API key or SLA. Queries are structured defensively with fallback queries to retrieve basic rank and solve counts if complex queries fail.
- **Volume vs. Quality**: Raw problem counts reward volume rather than depth. On Codeforces, ratings above roughly 1200-1400 carry significantly higher signal than hundreds of 800-rated problems.
- **Handle Ownership**: Profiles reflect the supplied handle's public achievements, but identity link to the candidate is unverified until active ownership verification is implemented.
