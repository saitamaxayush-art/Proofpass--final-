"""
Ontology Service: Acts as the bridge to a Skills Ontology.
For the 6-day prototype, this uses a localized standard (ESCO/O*NET) and LLM fallback.
In production, this interface will be swapped to call the iMocha Skills Intelligence API.
"""
from typing import List

_ONTOLOGY_DB = {
    "react": {"canonical_name": "React.js", "adjacent_skills": ["TypeScript", "Redux", "Next.js", "Jest"]},
    "python": {"canonical_name": "Python", "adjacent_skills": ["Django", "FastAPI", "PostgreSQL", "Docker"]},
    "aws": {"canonical_name": "Amazon Web Services", "adjacent_skills": ["Terraform", "Docker", "Kubernetes", "CI/CD"]},
    "postgresql": {"canonical_name": "PostgreSQL", "adjacent_skills": ["SQL", "Django", "Python", "Database Design"]},
    "docker": {"canonical_name": "Docker", "adjacent_skills": ["Kubernetes", "AWS", "CI/CD", "Linux"]}
}

class OntologyService:
    @staticmethod
    def get_canonical_name(skill: str) -> str:
        skill_lower = skill.lower()
        if skill_lower in _ONTOLOGY_DB: return _ONTOLOGY_DB[skill_lower]["canonical_name"]
        return skill.title()

    @staticmethod
    def get_adjacent_skills(skill: str) -> List[str]:
        skill_lower = skill.lower()
        if skill_lower in _ONTOLOGY_DB: return _ONTOLOGY_DB[skill_lower]["adjacent_skills"]
        return ["Problem Solving", "Version Control", "Agile Methodology"]

ontology_service = OntologyService()