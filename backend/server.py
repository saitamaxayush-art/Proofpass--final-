"""
ProofPass Backend REST API Service
Provides endpoints for resume text extraction, skill claim detection,
evidence verification, and passport building.
"""
from __future__ import annotations

import io
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Ensure Intelligence / intelligence imports work regardless of casing
try:
    import intelligence
    sys.modules.setdefault("Intelligence", intelligence)
except ModuleNotFoundError:
    import Intelligence
    sys.modules.setdefault("intelligence", Intelligence)

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from verification.resume_extractor import extract_resume_text
from intelligence.llm_service import extract_claims, parse_target_role
from intelligence.models import Claim, TargetRole

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

app = FastAPI(
    title="ProofPass API",
    description="Deterministic Evidence Verification and Skill Intelligence API",
    version="2.0.0",
)

# Enable CORS with credentials for the frontend origin only (never wildcard with credentials)
frontend_origins_raw = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [o.strip() for o in frontend_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API router and initialize database persistence
try:
    from api.routes import router as api_v1_router
    from database import init_db
    init_db()
    app.include_router(api_v1_router)
except Exception:
    pass


def extract_docx_text(content: bytes) -> str:
    """Extract plain text from a DOCX file using standard library zipfile."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            paragraphs = []
            for p in tree.iter():
                if p.tag.endswith("}p"):
                    texts = [
                        node.text
                        for node in p.iter()
                        if node.tag.endswith("}t") and node.text
                    ]
                    if texts:
                        paragraphs.append("".join(texts))
            return "\n".join(paragraphs).strip()
    except Exception as exc:
        raise ValueError(f"Failed to parse DOCX file: {exc}") from exc


def parse_resume_sections(text: str) -> Dict[str, List[str]]:
    """Parse resume text into structured sections."""
    lines = text.split("\n")
    sections: Dict[str, List[str]] = {}
    current_section = "General"
    sections[currentSection := current_section] = []

    headers = [
        "SUMMARY",
        "SKILLS",
        "TECHNICAL SKILLS",
        "EXPERIENCE",
        "WORK EXPERIENCE",
        "PROJECTS",
        "EDUCATION",
        "CERTIFICATIONS",
        "ACHIEVEMENTS",
    ]

    for line in lines:
        trimmed = line.strip()
        upper = trimmed.upper()
        matched = next((h for h in headers if h in upper and len(trimmed) < 40), None)
        if matched:
            current_section = matched
            sections[current_section] = []
        elif trimmed:
            sections[current_section].append(trimmed)

    return {k: v for k, v in sections.items() if v}


class TextExtractRequest(BaseModel):
    resume_text: str


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ProofPass Backend API",
        "version": "2.0.0",
    }


@app.post("/api/v1/extract-resume")
async def extract_resume(
    file: Optional[UploadFile] = File(None),
    resume_text: Optional[str] = Form(None),
):
    """
    Extract structured plain text and skill claims from an uploaded PDF, DOCX, or text string.
    """
    text = ""
    filename = "text_input"

    if file:
        filename = file.filename or "uploaded_file"
        content = await file.read()
        lower_name = filename.lower()

        if lower_name.endswith(".pdf"):
            try:
                text = extract_resume_text(content)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"PDF extraction failed: {str(e)}",
                )
        elif lower_name.endswith(".docx"):
            try:
                text = extract_docx_text(content)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"DOCX extraction failed: {str(e)}",
                )
        elif lower_name.endswith((".txt", ".md", ".json")):
            try:
                text = content.decode("utf-8", errors="replace").strip()
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Text decoding failed: {str(e)}",
                )
        else:
            # Attempt PyMuPDF first, fallback to text decoding
            try:
                text = extract_resume_text(content)
            except Exception:
                text = content.decode("utf-8", errors="replace").strip()
    elif resume_text:
        text = resume_text.strip()
    else:
        raise HTTPException(
            status_code=400,
            detail="Either a file upload or resume_text must be provided.",
        )

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Extracted text is empty. Please verify the document format.",
        )

    sections = parse_resume_sections(text)
    claims: List[Claim] = extract_claims(text)
    claimed_skills = [c.skill for c in claims]

    return {
        "success": True,
        "filename": filename,
        "char_count": len(text),
        "line_count": len(text.splitlines()),
        "text": text,
        "sections": sections,
        "claimed_skills": claimed_skills,
        "claims": [c.model_dump() for c in claims],
    }


class ParseRoleRequest(BaseModel):
    jd_text: str
    default_role_name: str = "Full Stack Developer"


@app.post("/api/v1/parse-role")
async def parse_role_endpoint(request: ParseRoleRequest):
    """Parse a job description into target role and skill requirements."""
    role = parse_target_role(request.jd_text, request.default_role_name)
    return role.model_dump()


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="127.0.0.1", port=port, reload=True, app_dir=str(BACKEND_DIR))

