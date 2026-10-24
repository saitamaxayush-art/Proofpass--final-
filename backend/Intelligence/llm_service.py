"""
LLM calls. The LLM only PROPOSES. It never sets states or scores.
Strictly filters out soft skills to maintain a verifiable-only taxonomy.
"""
from __future__ import annotations
import json, logging, re
from typing import List, Optional
from .config import config
from .models import Claim, RequiredSkill, TargetRole

logger = logging.getLogger(__name__)
PROMPT_VERSION = "v3.0-strict-hard-skills"

# Deterministic blocklist to filter out non-verifiable soft skills
SOFT_SKILLS_BLOCKLIST = {
    "leadership", "communication", "teamwork", "problem solving", "critical thinking",
    "time management", "adaptability", "creativity", "collaboration", "work ethic",
    "interpersonal skills", "emotional intelligence", "conflict resolution", "active listening",
    "fast learner", "self-motivated", "detail-oriented", "multitasking", "presentation skills"
}

_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|above)\s+instructions", re.IGNORECASE),
    re.compile(r"you\s+are\s+now", re.IGNORECASE),
    re.compile(r"system\s*:", re.IGNORECASE),
]

def _sanitize(text: str, max_chars: int = 8000) -> str:
    if not text: return ""
    cleaned = text
    for pat in _INJECTION_PATTERNS:
        cleaned = pat.sub("[REDACTED]", cleaned)
    return cleaned[:max_chars]

def _call_llm(system: str, user: str) -> Optional[str]:
    if not config.llm_api_key: return None
    try:
        import openai
    except ImportError: return None

    client = openai.OpenAI(api_key=config.llm_api_key, base_url=config.llm_base_url, timeout=config.llm_timeout)
    for attempt in range(config.llm_max_retries + 1):
        try:
            resp = client.chat.completions.create(
                model=config.llm_model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                temperature=0.0, response_format={"type": "json_object"},
            )
            return resp.choices[0].message.content
        except Exception: continue
    return None

def _extract_json(text: Optional[str]) -> Optional[dict]:
    if not text: return None
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t)
        t = re.sub(r"\s*```$", "", t)
    try: return json.loads(t)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", t, re.DOTALL)
        return json.loads(m.group(0)) if m else None

def extract_claims(resume_text: str) -> List[Claim]:
    safe_text = _sanitize(resume_text)
    if not safe_text: return []

    system = (
        f"VERSION: {PROMPT_VERSION}. You extract ONLY hard, verifiable technical skills "
        "(languages, frameworks, tools, databases, cloud platforms) from a resume. "
        "STRICTLY IGNORE all soft skills (e.g., leadership, communication, teamwork, problem-solving). "
        "Return ONLY valid JSON: "
        '{"claims": [{"skill": str, "resume_pointer": str, "repo_hint": str|null}, ...]}. '
        "If a skill is not a specific technology, omit it."
    )
    raw = _call_llm(system, f"Resume text:\n{safe_text}")
    data = _extract_json(raw)

    if not data or "claims" not in data:
        return _mock_extract_claims(safe_text) if config.fallback_to_mock else []

    try:
        claims = []
        for c in data["claims"]:
            skill = str(c.get("skill", "")).strip()
            # DETERMINISTIC FILTER: Drop soft skills even if LLM proposed them
            if skill and skill.lower() not in SOFT_SKILLS_BLOCKLIST:
                claims.append(Claim(skill=skill, resume_pointer=str(c.get("resume_pointer", "")), repo_hint=c.get("repo_hint")))
        return claims
    except Exception:
        return _mock_extract_claims(safe_text) if config.fallback_to_mock else []

def parse_target_role(jd_text: str, default_role_name: str = "Software Engineer") -> TargetRole:
    safe_text = _sanitize(jd_text)
    if not safe_text: return TargetRole(role_name=default_role_name)

    system = (
        "You extract ONLY hard, verifiable technical skill requirements from a job description. "
        "STRICTLY IGNORE soft skills (e.g., leadership, communication, teamwork). "
        "Return ONLY JSON: "
        '{"role_name": str, "description": str, "required_skills": [{"skill": str, "weight": float, "importance": "required"|"preferred"|"bonus"}]}.'
    )
    raw = _call_llm(system, f"Job description:\n{safe_text}")
    data = _extract_json(raw)

    if not data: return _mock_target_role(default_role_name) if config.fallback_to_mock else TargetRole(role_name=default_role_name)

    try:
        skills = []
        for s in data.get("required_skills", []):
            skill = str(s.get("skill", "")).strip()
            # DETERMINISTIC FILTER: Drop soft skills from JD matching
            if skill and skill.lower() not in SOFT_SKILLS_BLOCKLIST:
                skills.append(RequiredSkill(skill=skill, weight=float(s.get("weight", 0.1)), importance=s.get("importance", "required")))
        return TargetRole(role_name=str(data.get("role_name", default_role_name)), description=str(data.get("description", "")), required_skills=skills)
    except Exception:
        return _mock_target_role(default_role_name) if config.fallback_to_mock else TargetRole(role_name=default_role_name)

# Comprehensive deterministic technical skill patterns for verifiable technical extraction
TECHNICAL_SKILL_PATTERNS = [
    ("React", re.compile(r"\b(?:react(?:\.js|js)?|react-native)\b", re.IGNORECASE)),
    ("TypeScript", re.compile(r"\b(?:typescript|ts)\b", re.IGNORECASE)),
    ("JavaScript", re.compile(r"\b(?:javascript|js|es6|ecmascript)\b", re.IGNORECASE)),
    ("Python", re.compile(r"\b(?:python(?:3)?)\b", re.IGNORECASE)),
    ("Node.js", re.compile(r"\b(?:node(?:\.js|js)?|nodejs)\b", re.IGNORECASE)),
    ("REST APIs", re.compile(r"\b(?:rest(?:ful)?(?:\s+apis?)?|rest\s*api)\b", re.IGNORECASE)),
    ("PostgreSQL", re.compile(r"\b(?:postgres(?:ql)?|psql)\b", re.IGNORECASE)),
    ("Docker", re.compile(r"\b(?:docker(?:file)?|containerization)\b", re.IGNORECASE)),
    ("Testing", re.compile(r"\b(?:unit\s+test(?:ing|s)?|integration\s+test(?:ing|s)?|jest|pytest|vitest|tdd|cypress)\b", re.IGNORECASE)),
    ("Git workflow", re.compile(r"\b(?:git(?:\s+workflow)?|github|gitlab|version\s+control)\b", re.IGNORECASE)),
    ("System design", re.compile(r"\b(?:system\s+design|distributed\s+systems?)\b", re.IGNORECASE)),
    ("Kubernetes", re.compile(r"\b(?:kubernetes|k8s|kubectl|helm)\b", re.IGNORECASE)),
    ("AWS", re.compile(r"\b(?:aws|amazon\s+web\s+services|boto3|s3|ec2|dynamodb)\b", re.IGNORECASE)),
    ("Data Structures and Algorithms", re.compile(r"\b(?:data\s+structures?(?:\s*(?:&|and)\s*algorithms?)?|dsa|algorithms?)\b", re.IGNORECASE)),
    ("Competitive Programming", re.compile(r"\b(?:competitive\s+(?:programming|coding)|codeforces|leetcode)\b", re.IGNORECASE)),
    ("Dynamic Programming", re.compile(r"\b(?:dynamic\s+programming)\b", re.IGNORECASE)),
    ("Next.js", re.compile(r"\b(?:next(?:\.js|js)?)\b", re.IGNORECASE)),
    ("GraphQL", re.compile(r"\b(?:graphql|apollo)\b", re.IGNORECASE)),
    ("Redis", re.compile(r"\b(?:redis)\b", re.IGNORECASE)),
    ("Go", re.compile(r"(?:\bgolang\b|\bgo\s+(?:programming|language)\b|(?<=[,\s\(\/\:;])go(?=[,\s\/\)\.;]|$))", re.IGNORECASE)),
    ("Rust", re.compile(r"\b(?:rust|cargo)\b", re.IGNORECASE)),
    ("SQL", re.compile(r"\b(?:sql|rdbms|relational\s+database)\b", re.IGNORECASE)),
    ("SQLite", re.compile(r"\b(?:sqlite(?:3)?)\b", re.IGNORECASE)),
    ("CI/CD", re.compile(r"\b(?:ci\s*[/]\s*cd|continuous\s+integration|github\s+actions)\b", re.IGNORECASE)),
    ("FastAPI", re.compile(r"\b(?:fastapi|uvicorn|starlette)\b", re.IGNORECASE)),
    ("Django", re.compile(r"\b(?:django)\b", re.IGNORECASE)),
    ("Flask", re.compile(r"\b(?:flask|werkzeug)\b", re.IGNORECASE)),
    ("Java", re.compile(r"\bjava\b(?!\s*script)", re.IGNORECASE)),
    ("C++", re.compile(r"(?:\bcpp\b|\bc\+\+(?=[,\s\/\)\.;]|$))", re.IGNORECASE)),
    ("C", re.compile(r"(?:\bc\s*[\/]\s*c\+\+|\bc\s+(?:programming|language)\b|\bansi\s+c\b|(?<=[,\s\(\/\:;])c(?=[,\s\/\)\.;]|$)(?!\+\+|#))", re.IGNORECASE)),
    ("MongoDB", re.compile(r"\b(?:mongo(?:db)?|mongoose)\b", re.IGNORECASE)),
    ("MySQL", re.compile(r"\b(?:mysql)\b", re.IGNORECASE)),
    ("Tailwind", re.compile(r"\b(?:tailwind(?:css)?)\b", re.IGNORECASE)),
    ("Linux", re.compile(r"\b(?:linux|ubuntu|bash|shell\s+scripting)\b", re.IGNORECASE)),
    ("Microservices", re.compile(r"\b(?:microservices?)\b", re.IGNORECASE)),
    ("HTML/CSS", re.compile(r"\b(?:html(?:5)?|css(?:3)?)\b", re.IGNORECASE)),
    ("Vue", re.compile(r"\b(?:vue(?:\.js|js)?)\b", re.IGNORECASE)),
    ("Angular", re.compile(r"\b(?:angular(?:\.js|js)?)\b", re.IGNORECASE)),
    ("Express", re.compile(r"\b(?:express(?:\.js|js)?)\b", re.IGNORECASE)),
    ("Spring", re.compile(r"\b(?:spring(?:\s+boot)?)\b", re.IGNORECASE)),
    ("PyTorch", re.compile(r"\b(?:pytorch|torch)\b", re.IGNORECASE)),
    ("TensorFlow", re.compile(r"\b(?:tensorflow|keras)\b", re.IGNORECASE)),
    ("Pandas", re.compile(r"\b(?:pandas|numpy)\b", re.IGNORECASE)),
]

def _mock_extract_claims(text: str) -> List[Claim]:
    if not text:
        return []
    lines = text.splitlines()
    claims: List[Claim] = []
    seen_skills = set()

    for name, pattern in TECHNICAL_SKILL_PATTERNS:
        if name in seen_skills:
            continue
        if name.lower() in SOFT_SKILLS_BLOCKLIST:
            continue
        matched_pointer = None
        for idx, line in enumerate(lines):
            if pattern.search(line):
                matched_pointer = f"Line {idx + 1}: {line.strip()[:80]}"
                break
        if not matched_pointer and pattern.search(text):
            matched_pointer = "Resume text match"

        if matched_pointer:
            seen_skills.add(name)
            claims.append(Claim(skill=name, resume_pointer=matched_pointer, repo_hint=None))

    return claims

def _mock_target_role(name: str, jd_text: str = "") -> TargetRole:
    if jd_text:
        detected_skills = []
        for sname, pat in TECHNICAL_SKILL_PATTERNS:
            if pat.search(jd_text) and sname.lower() not in SOFT_SKILLS_BLOCKLIST:
                detected_skills.append(sname)
        if detected_skills:
            weight = round(1.0 / len(detected_skills), 3)
            req_skills = [RequiredSkill(skill=s, weight=weight, importance="required") for s in detected_skills]
            total = sum(s.weight for s in req_skills)
            if total > 0 and abs(total - 1.0) > 1e-5:
                req_skills[-1].weight = round(req_skills[-1].weight + (1.0 - total), 3)
            return TargetRole(role_name=name, description=jd_text[:120], required_skills=req_skills)

    return TargetRole(role_name=name, required_skills=[
        RequiredSkill(skill="React", weight=0.3), RequiredSkill(skill="Python", weight=0.3),
        RequiredSkill(skill="PostgreSQL", weight=0.2), RequiredSkill(skill="AWS", weight=0.2)
    ])