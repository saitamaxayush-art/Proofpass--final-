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

def _mock_extract_claims(text: str) -> List[Claim]:
    keywords = {"React": ["react"], "Python": ["python"], "Node.js": ["node"], "PostgreSQL": ["postgres"], "AWS": ["aws"], "Docker": ["docker"]}
    lower = text.lower()
    return [Claim(skill=k, resume_pointer="mock", repo_hint=None) for k, v in keywords.items() if any(var in lower for var in v)]

def _mock_target_role(name: str) -> TargetRole:
    return TargetRole(role_name=name, required_skills=[
        RequiredSkill(skill="React", weight=0.3), RequiredSkill(skill="Python", weight=0.3),
        RequiredSkill(skill="PostgreSQL", weight=0.2), RequiredSkill(skill="AWS", weight=0.2)
    ])