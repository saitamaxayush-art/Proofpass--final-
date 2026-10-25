"""
Configuration. All secrets come from environment variables.
"""
import os
from dataclasses import dataclass

@dataclass
class IntelligenceConfig:
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_timeout: int = 30
    llm_max_retries: int = 1
    fallback_to_mock: bool = True

    @classmethod
    def from_env(cls) -> "IntelligenceConfig":
        return cls(
            llm_api_key=os.getenv("INTELLIGENCE_LLM_API_KEY", ""),
            llm_base_url=os.getenv("INTELLIGENCE_LLM_BASE_URL", "https://api.openai.com/v1"),
            llm_model=os.getenv("INTELLIGENCE_LLM_MODEL", "gpt-4o-mini"),
            llm_timeout=int(os.getenv("INTELLIGENCE_LLM_TIMEOUT", "30")),
            llm_max_retries=int(os.getenv("INTELLIGENCE_LLM_MAX_RETRIES", "1")),
            fallback_to_mock=os.getenv("INTELLIGENCE_FALLBACK_TO_MOCK", "true").lower() == "true",
        )

config = IntelligenceConfig.from_env()