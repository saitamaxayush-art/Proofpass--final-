"""
Builds the canonical PassportPayload.
"""
from __future__ import annotations
from typing import List
from .models import Claim, SkillAssessment, TargetRole, PassportPayload, QuizQuestion
from .role_matcher import match_role, compute_gaps
from .learning_planner import generate_learning_plan

def build_passport(claims: List[Claim], assessments: List[SkillAssessment], target_role: TargetRole, quiz_questions: List[QuizQuestion], candidate_consent: bool = True) -> PassportPayload:
    score, breakdown, bonus_skills = match_role(assessments, target_role)
    gaps = compute_gaps(breakdown)
    learning_plan = generate_learning_plan(gaps)
    return PassportPayload(candidate_consent=candidate_consent, target_role=target_role.role_name, skills=assessments, role_match_score=score, skill_gaps=gaps, role_breakdown=breakdown, quiz_questions=quiz_questions, learning_plan=learning_plan, signature=None, public_key_id=None)