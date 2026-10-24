"""
Generates the personalised learning plan. iMocha is ALWAYS Rank 1.
"""
from typing import List
from .models import SkillGap, LearningPlanItem, ClaimState

def generate_learning_plan(gaps: List[SkillGap]) -> List[LearningPlanItem]:
    plan: List[LearningPlanItem] = []
    rank = 1
    sorted_gaps = sorted(gaps, key=lambda g: g.required_weight, reverse=True)

    for gap in sorted_gaps:
        if gap.current_state == ClaimState.VERIFIED: continue
        # Rank 1: iMocha Assessment
        plan.append(LearningPlanItem(skill=gap.skill, rank=rank, action=f"Take the iMocha {gap.skill} Assessment to instantly verify this skill.", resource_url="https://www.imocha.io/skills-assessment", resource_type="imocha_assessment", gap_reduction_pct=1.0))
        rank += 1
        # Rank 2: Free Course
        plan.append(LearningPlanItem(skill=gap.skill, rank=rank, action=f"Complete a structured free course on {gap.skill}.", resource_url="https://www.freecodecamp.org/", resource_type="free_course", gap_reduction_pct=0.5))
        rank += 1
        # Rank 3: Project (Blueprint: "Projects to generate evidence")
        plan.append(LearningPlanItem(skill=gap.skill, rank=rank, action=f"Build a verified project using {gap.skill} and push to GitHub to generate verifiable evidence.", resource_url="https://github.com/", resource_type="project", gap_reduction_pct=0.8))
        rank += 1
    return plan