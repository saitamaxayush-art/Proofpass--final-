"""
M4: AI, Skill Intelligence and Passport Logic
Public API for the intelligence module.
"""
from .models import (
    Claim, Evidence, RepoMetadata, VerificationResult,
    SkillAssessment, SkillGap, PassportPayload,
    ClaimState, TrustCeiling, UsageDepth, AuthorshipSignal,
    QuizQuestion, QuizAnswer, QuizResult,
    RequiredSkill, TargetRole, RoleMatchBreakdown,
    EvidenceChainItem, LearningPlanItem,
)
from .state_engine import assess_skill, assess_all, determine_claim_state
from .llm_service import extract_claims, parse_target_role
from .quiz_engine import generate_micro_quiz, evaluate_answer
from .role_matcher import match_role, compute_gaps
from .learning_planner import generate_learning_plan
from .passport_builder import build_passport

__all__ = [
    "extract_claims", "parse_target_role",
    "assess_skill", "assess_all", "determine_claim_state",
    "generate_micro_quiz", "evaluate_answer",
    "match_role", "compute_gaps", "generate_learning_plan",
    "build_passport",
]