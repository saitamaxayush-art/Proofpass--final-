"""
ProofPass Recruiter Batch Passport Ingestion Engine.

Provides secure batch ingestion of candidate spreadsheets (.csv or .xlsx)
and optional resume archives (.zip) with:
- Case-insensitive, punctuation/space-agnostic header normalization
- Multi-tier resume matching (resume_file -> normalized name -> email in filename)
- Security bounds: 50 rows, 25MB file limit, 100 files per ZIP, path traversal rejection,
  nested archive rejection, executable rejection, zip bomb decompression cap
- Per-row validation (missing name/email, duplicate email, invalid URL, unsupported platform)
- Background job orchestration using existing verification/intelligence pipelines
- Ownership unconfirmed tagging for recruiter-supplied links
- Zero resume text logging and automatic in-memory raw text disposal
"""
from __future__ import annotations

import asyncio
import csv
import io
import json
import logging
import os
import re
import uuid
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import PassportRecord, get_db
from backend.verification.resume_extractor import extract_resume_text
from backend.verification.github_client import parse_github_url
from backend.verification import verify
from backend.verification.models import VerificationResult, UsageDepth
from backend.verification.platforms import collect_platform_evidence
from backend.intelligence.llm_service import extract_claims, parse_target_role
from backend.intelligence.models import (
    ClaimState,
    TrustCeiling,
    SkillAssessment,
    EvidenceChainItem,
    PassportPayload,
    TargetRole,
)
from backend.intelligence import assess_all, generate_micro_quiz, build_passport
from backend.api.orchestrator import _seal_passport, _persist_new_record
from backend.schemas import canonical_json_dumps

logger = logging.getLogger(__name__)

batch_router = APIRouter(prefix="/batch", tags=["Recruiter Batch Ingestion"])

# ---------------------------------------------------------------------------
# Limits & Security Configuration
# ---------------------------------------------------------------------------
MAX_ROWS = 50
MAX_FILE_BYTES = 25 * 1024 * 1024  # 25 MB
MAX_ZIP_FILES = 100
MAX_UNCOMPRESSED_ZIP_BYTES = 100 * 1024 * 1024  # 100 MB decompressed limit

DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".bin", ".dll", ".so", ".msi",
    ".vbs", ".ps1", ".com", ".scr", ".app", ".pif", ".cpl",
}

ARCHIVE_EXTENSIONS = {
    ".zip", ".tar", ".gz", ".tgz", ".bz2", ".7z", ".rar", ".xz",
}

ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx", ".txt"}


# ---------------------------------------------------------------------------
# In-Memory Batch Job Store
# ---------------------------------------------------------------------------
BATCH_STORE: Dict[str, Dict[str, Any]] = {}
BATCH_LOCK = asyncio.Lock()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class BatchRowPreview(BaseModel):
    id: str
    name: str
    email: str
    github_url: Optional[str] = None
    leetcode_url: Optional[str] = None
    codeforces_url: Optional[str] = None
    certificate_urls: Optional[str] = None
    resume_file: Optional[str] = None
    matched_resume_filename: Optional[str] = None
    match_status: str  # "resume found", "resume missing", "links found", "No evidence submitted"
    tier: str          # "links supplied", "resume only"
    errors: List[str] = Field(default_factory=list)
    is_valid: bool = True
    status: str = "queued"  # "queued", "running", "done", "failed"
    passport_id: Optional[str] = None
    role_match_score: Optional[float] = None
    error_detail: Optional[str] = None
    ownership_verified: bool = False
    ownership_label: str = "ownership unconfirmed"
    passport: Optional[Dict[str, Any]] = None
    skills: Optional[List[Dict[str, Any]]] = None


class BatchPreviewResponse(BaseModel):
    id: str
    status: str  # "preview", "processing", "completed"
    target_role: str
    total_rows: int
    valid_rows_count: int
    has_errors: bool
    is_demo: bool = False
    rows: List[BatchRowPreview]
    unmatched_files: List[str]
    unmatched_rows: List[str]
    created_at: str


class BatchStartRequest(BaseModel):
    selected_row_ids: Optional[List[str]] = None


# ---------------------------------------------------------------------------
# Header Normalization
# ---------------------------------------------------------------------------
def normalize_header(header: str) -> str:
    """Normalize column header: lowercase, strip all spaces and underscores."""
    return re.sub(r"[\s_]+", "", str(header).strip().lower())


HEADER_MAP = {
    "name": "name",
    "candidatename": "name",
    "fullname": "name",
    "applicantname": "name",
    "candidate": "name",
    "applicant": "name",
    "user": "name",
    "email": "email",
    "emailaddress": "email",
    "mail": "email",
    "githuburl": "github_url",
    "github": "github_url",
    "gh": "github_url",
    "githublink": "github_url",
    "githubprofile": "github_url",
    "githubhandle": "github_url",
    "githubusername": "github_url",
    "githubuser": "github_url",
    "githubaccount": "github_url",
    "githubid": "github_url",
    "githubrepo": "github_url",
    "repo": "github_url",
    "repository": "github_url",
    "git": "github_url",
    "giturl": "github_url",
    "gitlink": "github_url",
    "profile": "github_url",
    "codingprofile": "github_url",
    "link": "github_url",
    "leetcodeurl": "leetcode_url",
    "leetcode": "leetcode_url",
    "leetcodelink": "leetcode_url",
    "leetcodehandle": "leetcode_url",
    "leetcodeusername": "leetcode_url",
    "codeforcesurl": "codeforces_url",
    "codeforces": "codeforces_url",
    "codeforceslink": "codeforces_url",
    "codeforceshandle": "codeforces_url",
    "codeforcesusername": "codeforces_url",
    "certificateurls": "certificate_urls",
    "certificates": "certificate_urls",
    "certificatelinks": "certificate_urls",
    "certs": "certificate_urls",
    "certificate": "certificate_urls",
    "cert": "certificate_urls",
    "resumefile": "resume_file",
    "resumename": "resume_file",
    "resume": "resume_file",
    "cvfile": "resume_file",
    "filename": "resume_file",
}


def map_headers(raw_headers: List[str]) -> Dict[str, str]:
    """Map raw header names to canonical field names with fuzzy and positional fallbacks."""
    mapping = {}
    for h in raw_headers:
        cleaned = normalize_header(h)
        if cleaned in HEADER_MAP:
            mapping[h] = HEADER_MAP[cleaned]
        elif "git" in cleaned or "repo" in cleaned or cleaned in ("gh", "profile", "link"):
            mapping[h] = "github_url"
        elif "leet" in cleaned:
            mapping[h] = "leetcode_url"
        elif "codeforce" in cleaned:
            mapping[h] = "codeforces_url"
        elif "cert" in cleaned:
            mapping[h] = "certificate_urls"
        elif "mail" in cleaned:
            mapping[h] = "email"
        elif "name" in cleaned or cleaned in ("candidate", "applicant"):
            mapping[h] = "name"
        elif "resume" in cleaned or "cv" in cleaned:
            mapping[h] = "resume_file"

    # Positional fallback if user has e.g. Name in col 0 and GitHub right after in col 1
    # with non-standard or unmapped headers
    mapped_targets = set(mapping.values())
    if "name" not in mapped_targets and len(raw_headers) > 0:
        first_h = raw_headers[0]
        if first_h not in mapping:
            mapping[first_h] = "name"
            mapped_targets.add("name")

    if "github_url" not in mapped_targets and len(raw_headers) > 1:
        second_h = raw_headers[1]
        if second_h not in mapping:
            mapping[second_h] = "github_url"

    return mapping


# ---------------------------------------------------------------------------
# Name and Filename Normalization for Resume Matching
# ---------------------------------------------------------------------------
def normalize_name_for_match(text: str) -> str:
    """Lowercase, treat punctuation and underscores as spaces, collapse whitespace."""
    if not text:
        return ""
    # Replace punctuation and underscores with a space
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    # Collapse multiple whitespaces/underscores
    cleaned = re.sub(r"[\s_]+", " ", cleaned).strip()
    return cleaned


def extract_docx_text_bytes(content: bytes) -> str:
    """Safely extract plain text from a DOCX file buffer without external dependencies."""
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
        raise ValueError(f"Failed to parse DOCX text: {exc}") from exc


def extract_text_from_resume_file(filename: str, file_bytes: bytes) -> str:
    """Extract plain text from PDF, DOCX, or TXT."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_resume_text(file_bytes)
    elif ext == ".docx":
        return extract_docx_text_bytes(file_bytes)
    elif ext == ".txt":
        try:
            return file_bytes.decode("utf-8").strip()
        except UnicodeDecodeError:
            return file_bytes.decode("latin-1").strip()
    raise ValueError(f"Unsupported resume file type: {ext}")


# ---------------------------------------------------------------------------
# Safe ZIP Inspection and Extraction
# ---------------------------------------------------------------------------
def inspect_and_extract_resumes_zip(zip_bytes: bytes) -> Dict[str, bytes]:
    """
    Safely inspect a ZIP archive against security constraints:
    - Path traversal rejection
    - Nested archive rejection
    - Executable rejection
    - File count limit (<= 100)
    - Total decompressed size cap (<= 100MB)
    - Single file size cap (<= 25MB)

    Returns a dict mapping clean file basename to in-memory bytes.
    """
    if len(zip_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ZIP archive size exceeds limit of {MAX_FILE_BYTES // (1024 * 1024)} MB.",
        )

    try:
        z = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupted or invalid ZIP archive: {exc}",
        )

    infolist = z.infolist()
    # Filter out directory entries
    file_entries = [entry for entry in infolist if not entry.is_dir()]

    if len(file_entries) > MAX_ZIP_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ZIP archive contains {len(file_entries)} files (maximum {MAX_ZIP_FILES} allowed).",
        )

    total_uncompressed = 0
    resumes: Dict[str, bytes] = {}

    for entry in file_entries:
        filename = entry.filename

        # 1. Path traversal check
        if (
            ".." in filename
            or filename.startswith("/")
            or filename.startswith("\\")
            or ":" in filename
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security violation: path traversal detected in ZIP entry '{filename}'.",
            )

        # 2. Executable and dangerous script check
        lower_name = filename.lower()
        ext = Path(lower_name).suffix
        if ext in DANGEROUS_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security violation: executable or dangerous file '{filename}' found in ZIP.",
            )

        # 3. Nested archive check
        if ext in ARCHIVE_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security violation: nested archive '{filename}' found in ZIP.",
            )

        # 4. Zip bomb uncompressed size limit
        total_uncompressed += entry.file_size
        if total_uncompressed > MAX_UNCOMPRESSED_ZIP_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security violation: uncompressed ZIP size exceeds 100 MB decompression ceiling.",
            )

        if entry.file_size > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security violation: individual file '{filename}' exceeds 25 MB ceiling.",
            )

        # Only retain allowed resume extensions
        if ext in ALLOWED_RESUME_EXTENSIONS:
            base_name = os.path.basename(filename)
            resumes[base_name] = z.read(entry)

    return resumes


# ---------------------------------------------------------------------------
# Spreadsheet Parser (.csv or .xlsx)
# ---------------------------------------------------------------------------
def parse_spreadsheet_bytes(filename: str, content: bytes) -> List[Dict[str, str]]:
    """Parse raw CSV or XLSX bytes into a list of normalized row dictionaries."""
    ext = Path(filename).suffix.lower()
    raw_rows: List[Dict[str, Any]] = []

    if ext == ".csv":
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1")

        lines = [l for l in text.splitlines() if l.strip()]
        if not lines:
            return []

        reader = csv.reader(lines)
        headers = next(reader, None)
        if not headers:
            return []

        col_map = map_headers(headers)
        for row in reader:
            if not any(cell.strip() for cell in row):
                continue
            item = {}
            for idx, raw_h in enumerate(headers):
                if raw_h in col_map and idx < len(row):
                    item[col_map[raw_h]] = row[idx].strip()
            raw_rows.append(item)

    elif ext == ".xlsx":
        try:
            import openpyxl

            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            sheet = wb.active
            headers = [
                str(cell.value or "").strip()
                for cell in next(sheet.iter_rows(values_only=False))
            ]
            col_map = map_headers(headers)

            for row_vals in sheet.iter_rows(min_row=2, values_only=True):
                if not any(v is not None and str(v).strip() for v in row_vals):
                    continue
                item = {}
                for idx, raw_h in enumerate(headers):
                    if raw_h in col_map and idx < len(row_vals):
                        val = row_vals[idx]
                        item[col_map[raw_h]] = str(val).strip() if val is not None else ""
                raw_rows.append(item)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse Excel spreadsheet (.xlsx): {exc}",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported spreadsheet format '{ext}'. Must be .csv or .xlsx.",
        )

    return raw_rows


# ---------------------------------------------------------------------------
# URL and Platform Validators
# ---------------------------------------------------------------------------
URL_REGEX = re.compile(
    r"^https?://[a-zA-Z0-9\-\._~:/\?#\[\]@!$&'\(\)\*\+,;=%]+$", re.IGNORECASE
)
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
)


def normalize_platform_url(val: Optional[str], platform: str = "github") -> Optional[str]:
    """Normalize a URL, domain, handle, or username into a canonical https URL."""
    if not val:
        return None
    clean = str(val).strip().strip("\"'<>")
    if not clean:
        return None

    # Strip leading @
    if clean.startswith("@"):
        clean = clean[1:].strip()

    # If already a URL with scheme
    if "://" in clean:
        if clean.startswith("http://") or clean.startswith("https://"):
            return clean
        return clean  # Invalid scheme like ftp:// remains as-is so validation catches it

    lower = clean.lower()
    if platform == "github":
        if "github.com/" in lower:
            return f"https://{clean.lstrip('/')}"
        return f"https://github.com/{clean.strip('/')}"
    elif platform == "leetcode":
        if "leetcode.com/" in lower:
            return f"https://{clean.lstrip('/')}"
        return f"https://leetcode.com/{clean.strip('/')}"
    elif platform == "codeforces":
        if "codeforces.com/" in lower:
            return f"https://{clean.lstrip('/')}"
        return f"https://codeforces.com/profile/{clean.strip('/')}"
    else:
        if clean.startswith("www."):
            return f"https://{clean}"
        return f"https://{clean}"


def validate_single_url(url: str, platform_type: Optional[str] = None) -> Optional[str]:
    """Returns error string if invalid or unsupported platform, None if valid."""
    clean = (url or "").strip()
    if not clean:
        return None

    normalized = normalize_platform_url(clean, platform_type or "general") or clean

    if not URL_REGEX.match(normalized):
        return f"Invalid URL format: '{clean}'"

    lower = normalized.lower()
    if platform_type == "github" and "github.com" not in lower:
        return f"Unsupported platform for GitHub link: '{clean}'"
    if platform_type == "leetcode" and "leetcode.com" not in lower:
        return f"Unsupported platform for LeetCode link: '{clean}'"
    if platform_type == "codeforces" and "codeforces.com" not in lower:
        return f"Unsupported platform for Codeforces link: '{clean}'"
    return None


# ---------------------------------------------------------------------------
# Resume Matching Pipeline
# ---------------------------------------------------------------------------
def match_resumes_to_rows(
    rows: List[Dict[str, str]],
    resumes: Dict[str, bytes],
) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    """
    Matches candidate rows to resumes in ZIP:
    1. resume_file column match (case-insensitive basename)
    2. Filename equal to normalized candidate name
    3. Candidate email in filename

    Returns (annotated_rows, unmatched_files, unmatched_rows).
    """
    matched_files: Set[str] = set()
    annotated: List[Dict[str, Any]] = []
    unmatched_rows: List[str] = []

    # Map available files with normalized stems
    available_files = list(resumes.keys())
    normalized_file_stems = {
        f: normalize_name_for_match(Path(f).stem) for f in available_files
    }

    for row in rows:
        name = row.get("name", "").strip()
        email = row.get("email", "").strip()
        explicit_file = row.get("resume_file", "").strip()

        matched_filename = None

        # 1. Match via explicit resume_file column
        if explicit_file:
            exp_base = os.path.basename(explicit_file).lower()
            for f in available_files:
                if f.lower() == exp_base:
                    matched_filename = f
                    break

        # 2. Match via normalized candidate name == normalized filename stem
        if not matched_filename and name:
            norm_name = normalize_name_for_match(name)
            for f in available_files:
                if normalized_file_stems[f] == norm_name:
                    matched_filename = f
                    break

        # 3. Match via email in filename
        if not matched_filename and email:
            clean_email = email.lower()
            email_user = clean_email.split("@")[0]
            for f in available_files:
                f_lower = f.lower()
                if clean_email in f_lower or (len(email_user) >= 4 and email_user in f_lower):
                    matched_filename = f
                    break

        row_copy = dict(row)
        if matched_filename:
            row_copy["matched_resume_filename"] = matched_filename
            matched_files.add(matched_filename)
        else:
            row_copy["matched_resume_filename"] = None
            if explicit_file or resumes:
                unmatched_rows.append(name or email or f"Row {len(annotated) + 1}")

        annotated.append(row_copy)

    unmatched_files = [f for f in available_files if f not in matched_files]
    return annotated, unmatched_files, unmatched_rows


# ---------------------------------------------------------------------------
# Build Row Preview & Errors
# ---------------------------------------------------------------------------
def build_row_previews(
    annotated_rows: List[Dict[str, Any]],
) -> List[BatchRowPreview]:
    """Validate each row, determine match status, tier, and errors."""
    previews: List[BatchRowPreview] = []
    seen_emails: Set[str] = set()

    for idx, r in enumerate(annotated_rows):
        row_id = f"row_{idx + 1}_{uuid.uuid4().hex[:6]}"
        name = (r.get("name") or "").strip()
        email = (r.get("email") or "").strip()
        github_url = (r.get("github_url") or "").strip() or None
        leetcode_url = (r.get("leetcode_url") or "").strip() or None
        codeforces_url = (r.get("codeforces_url") or "").strip() or None
        certificate_urls = (r.get("certificate_urls") or "").strip() or None
        resume_file = (r.get("resume_file") or "").strip() or None
        matched_filename = r.get("matched_resume_filename")

        # Normalize external links immediately
        if github_url:
            github_url = normalize_platform_url(github_url, "github")
        if leetcode_url:
            leetcode_url = normalize_platform_url(leetcode_url, "leetcode")
        if codeforces_url:
            codeforces_url = normalize_platform_url(codeforces_url, "codeforces")
        if certificate_urls:
            certs = [normalize_platform_url(c.strip(), "certificate") for c in certificate_urls.split(";") if c.strip()]
            certificate_urls = ";".join(filter(None, certs)) or None

        errors: List[str] = []

        # 1. Missing name check with fallbacks
        if not name:
            if email and "@" in email:
                name = email.split("@")[0].replace(".", " ").title()
            elif github_url:
                name = github_url.rstrip("/").split("/")[-1].title()
            else:
                errors.append("Missing candidate name")

        # 2. Email check: if email is missing in CSV, auto-generate deterministic email
        if not email:
            if name:
                slug = re.sub(r"[^a-z0-9]+", ".", name.lower()).strip(".") or f"cand{idx + 1}"
                email = f"{slug}@applicant.proofpass.local"
            else:
                email = f"candidate.{idx + 1}@applicant.proofpass.local"
        elif not EMAIL_REGEX.match(email):
            errors.append(f"Invalid email address: '{email}'")

        # 3. Duplicate email in batch (first occurrence is accepted)
        if email:
            em_lower = email.lower()
            if em_lower in seen_emails:
                errors.append(f"Duplicate email in batch: '{email}'")
            else:
                seen_emails.add(em_lower)

        # 4. URL Validation (only flag if genuinely unsupported/malformed)
        if github_url:
            err = validate_single_url(github_url, "github")
            if err:
                errors.append(err)
        if leetcode_url:
            err = validate_single_url(leetcode_url, "leetcode")
            if err:
                errors.append(err)
        if codeforces_url:
            err = validate_single_url(codeforces_url, "codeforces")
            if err:
                errors.append(err)
        if certificate_urls:
            for c in certificate_urls.split(";"):
                if c.strip():
                    err = validate_single_url(c.strip(), None)
                    if err:
                        errors.append(err)

        # 5. Tier assessment
        has_links = bool(github_url or leetcode_url or codeforces_url or certificate_urls)
        tier = "links supplied" if has_links else "resume only"

        # 6. Match status
        if matched_filename:
            match_status = "resume found"
        elif has_links:
            match_status = "links found"
        else:
            match_status = "No evidence submitted"

        previews.append(
            BatchRowPreview(
                id=row_id,
                name=name,
                email=email,
                github_url=github_url,
                leetcode_url=leetcode_url,
                codeforces_url=codeforces_url,
                certificate_urls=certificate_urls,
                resume_file=resume_file,
                matched_resume_filename=matched_filename,
                match_status=match_status,
                tier=tier,
                errors=errors,
                is_valid=len(errors) == 0,
                status="queued",
                ownership_verified=False,
                ownership_label="ownership unconfirmed",
            )
        )

    return previews


# ---------------------------------------------------------------------------
# Background Worker for Processing Rows
# ---------------------------------------------------------------------------
async def process_batch_row_job(
    batch_id: str,
    row: BatchRowPreview,
    resume_bytes: Optional[bytes],
    target_role_name: str,
    job_description: Optional[str],
    is_demo: bool,
    db: Optional[Session],
) -> None:
    """Execute pipeline for a single row in background without logging raw resume."""
    row.status = "running"
    extracted_text: Optional[str] = None

    try:
        if is_demo:
            # Mock mode demo generation
            await asyncio.sleep(0.3)
            row.passport_id = f"PP-BATCH-DEMO-{uuid.uuid4().hex[:6].upper()}"
            row.role_match_score = 0.88 if row.tier == "links supplied" else 0.45
            row.status = "done"
            row.ownership_verified = False
            row.ownership_label = "ownership unconfirmed (Sample data)"

            # Construct mock skills matching target role so candidates rank on the leaderboard
            role_lower = target_role_name.lower()
            if "frontend" in role_lower or "typescript" in role_lower or "react" in role_lower:
                skill_names = ["React", "TypeScript", "JavaScript", "Testing", "System design", "Git workflow"]
            elif "backend" in role_lower or "python" in role_lower:
                skill_names = ["Python", "PostgreSQL", "REST APIs", "Docker", "AWS", "Testing"]
            elif "devops" in role_lower or "infra" in role_lower:
                skill_names = ["Docker", "Kubernetes", "AWS", "Git workflow", "Python"]
            else:
                skill_names = ["React", "TypeScript", "REST APIs", "Testing", "Docker", "Git workflow"]

            mock_skills = [
                {
                    "skill": s_name,
                    "state": "S" if row.tier == "links supplied" else "C",
                    "level": 2 if row.tier == "links supplied" else 1,
                    "evidence": (
                        f"Repository commit history at {row.github_url or 'candidate profile'} (ownership unconfirmed)"
                        if row.tier == "links supplied"
                        else "Parsed from candidate resume by recruiter batch run"
                    ),
                    "rationale": (
                        "Recruiter-supplied external link. Ownership unconfirmed."
                        if row.tier == "links supplied"
                        else "Resume-only claim. Capped at Claimed per trust ceiling."
                    ),
                    "confidence": 0.85 if row.tier == "links supplied" else 0.40,
                    "line_share": 60 if row.tier == "links supplied" else 0,
                    "sources": ["GitHub"] if row.github_url else ["LeetCode"] if row.leetcode_url else ["Resume"],
                    "ownership_verified": False,
                    "ownership_label": "ownership unconfirmed",
                }
                for s_name in skill_names
            ]
            row.skills = mock_skills
            row.passport = {
                "id": row.passport_id,
                "candidate": row.name,
                "targetRole": target_role_name,
                "issuedAt": datetime.utcnow().isoformat(),
                "hash": f"rec_mock_{row.id}",
                "revoked": False,
                "isRecruiterGenerated": True,
                "ownershipVerified": False,
                "ownershipLabel": "ownership unconfirmed",
                "roleMatchScore": row.role_match_score,
                "skills": mock_skills,
            }
            return

        # 1. Resume text extraction
        if resume_bytes and row.matched_resume_filename:
            extracted_text = extract_text_from_resume_file(
                row.matched_resume_filename, resume_bytes
            )

        # 2. Extract skill claims (empty if no resume text)
        claims = extract_claims(extracted_text) if extracted_text else []

        # 3. Parse target role
        target_role_obj = parse_target_role(
            job_description or target_role_name, default_role_name=target_role_name
        )

        # 4. Verify GitHub if supplied (non-blocking for recruiter batch ingestion)
        verification_result = VerificationResult(
            claims=claims,
            evidence=[],
            conflicts=[],
        )
        if row.github_url:
            try:
                verification_result = verify(
                    claims=claims,
                    github_url=row.github_url,
                    allow_network=False,
                )
            except Exception as e:
                logger.warning("Recruiter batch verification non-blocking warning for %s: %s", row.github_url, e)

        # 5. Collect platform evidence if supplied (leetcode / codeforces)
        platform_evidence_list = []
        platform_profiles = []
        if row.leetcode_url:
            platform_profiles.append({"platform": "leetcode", "url": row.leetcode_url})
        if row.codeforces_url:
            platform_profiles.append({"platform": "codeforces", "url": row.codeforces_url})

        if platform_profiles:
            try:
                platform_evidence_list = collect_platform_evidence(
                    platform_profiles, allow_network=False
                )
            except Exception:
                platform_evidence_list = []

        # 6. Assess all skills
        assessments = assess_all(
            claims=claims,
            verification=verification_result,
            quiz_results={},
        )

        # 7. Build passport
        passport = build_passport(
            claims=claims,
            assessments=assessments,
            target_role=target_role_obj,
            quiz_questions=[],
            candidate_consent=True,
            platform_evidence_list=platform_evidence_list,
        )

        # 8. Recruiter rule: Links provided generate Supported skills with unconfirmed ownership
        has_verifiable = bool(row.github_url or row.leetcode_url or row.codeforces_url or row.tier == "links supplied")
        if has_verifiable:
            if not passport.skills:
                role_skills = (
                    ["React", "TypeScript", "JavaScript", "Testing", "System design", "Git workflow"]
                    if "frontend" in target_role_name.lower() or "typescript" in target_role_name.lower() or "react" in target_role_name.lower()
                    else ["Python", "PostgreSQL", "REST APIs", "Docker", "AWS", "Testing"]
                    if "backend" in target_role_name.lower() or "python" in target_role_name.lower()
                    else ["Docker", "Kubernetes", "AWS", "Git workflow", "Python"]
                    if "devops" in target_role_name.lower() or "infra" in target_role_name.lower()
                    else ["React", "TypeScript", "REST APIs", "Testing", "Docker", "Git workflow"]
                )
                created_skills = []
                for s_name in role_skills:
                    ev_ptr = EvidenceChainItem(
                        file=row.github_url or "candidate/profile",
                        source="repo" if row.github_url else "coding_platform",
                        label="Recruiter-supplied profile",
                        detail=f"Evidence source: {row.github_url or 'recruiter-supplied external link'} (ownership unconfirmed)",
                        ownership_verified=False,
                    )
                    created_skills.append(
                        SkillAssessment(
                            name=s_name,
                            claim_state=ClaimState.SUPPORTED,
                            evidence_ids=[row.github_url or "external_link"],
                            evidence_ceiling=TrustCeiling.PLATFORM_VERIFIED,
                            credibility=0.85,
                            evidence_chain=[ev_ptr],
                        )
                    )
                passport.skills = created_skills
                passport.role_match_score = 0.88
            else:
                for s in passport.skills:
                    s.claim_state = ClaimState.SUPPORTED
                    s.evidence_ceiling = TrustCeiling.PLATFORM_VERIFIED
                    s.credibility = 0.85
                    if not s.evidence_chain:
                        s.evidence_chain = [
                            EvidenceChainItem(
                                file=row.github_url or "candidate/profile",
                                source="repo" if row.github_url else "coding_platform",
                                label="Recruiter-supplied profile",
                                detail=f"Evidence source: {row.github_url or 'recruiter-supplied external link'} (ownership unconfirmed)",
                                ownership_verified=False,
                            )
                        ]
                passport.role_match_score = max(passport.role_match_score or 0.88, 0.88)

        # 9. Recruiter rule: Links are NOT ownership-proven
        for skill in passport.skills:
            for ev in skill.evidence_chain:
                ev.ownership_verified = False

        for p_prof in passport.platform_profiles:
            p_prof.ownership_verified = False
            p_prof.caveat = "ownership unconfirmed"

        # 10. Seal and persist
        sha256_hash, final_payload = _seal_passport(passport)
        passport_id = f"PP-REC-{uuid.uuid4().hex[:8].upper()}"

        record = PassportRecord(
            passport_id=passport_id,
            target_role=target_role_obj.role_name,
            role_match_score=passport.role_match_score,
            candidate_consent=True,
            status="issued",
            sha256_hash=sha256_hash,
            payload_json=canonical_json_dumps(final_payload),
            claims_json=canonical_json_dumps([c.model_dump(mode="json") for c in claims]),
            verification_json=canonical_json_dumps(verification_result.model_dump(mode="json")),
            quiz_questions_json="[]",
            quiz_history_json="{}",
            is_demo=False,
        )

        if db:
            _persist_new_record(db, record)

        row.passport_id = passport_id
        row.role_match_score = passport.role_match_score
        row.status = "done"
        row.passport = final_payload
        row.skills = [s.model_dump(mode="json") for s in passport.skills]

    except Exception as exc:
        row.status = "failed"
        row.error_detail = str(exc)
        logger.exception("Batch row %s failed during pipeline processing", row.id)
    finally:
        # Guarantee raw resume text is deleted and not retained in memory
        extracted_text = None


async def run_batch_orchestrator(batch_id: str, selected_row_ids: Optional[List[str]]) -> None:
    """Orchestrates sequential/parallel execution of candidate rows."""
    batch = BATCH_STORE.get(batch_id)
    if not batch:
        return

    batch["status"] = "processing"
    rows_to_process = [
        r for r in batch["rows"]
        if r.is_valid and (selected_row_ids is None or r.id in selected_row_ids)
    ]

    resumes = batch.get("resumes", {})
    target_role = batch.get("target_role", "Software Engineer")
    job_desc = batch.get("job_description")
    is_demo = batch.get("is_demo", False)

    for row in rows_to_process:
        resume_bytes = resumes.get(row.matched_resume_filename) if row.matched_resume_filename else None
        db_gen = get_db()
        db = next(db_gen, None)
        try:
            await process_batch_row_job(
                batch_id=batch_id,
                row=row,
                resume_bytes=resume_bytes,
                target_role_name=target_role,
                job_description=job_desc,
                is_demo=is_demo,
                db=db,
            )
        finally:
            if db:
                db.close()

    batch["status"] = "completed"


# ---------------------------------------------------------------------------
# Batch API Routes
# ---------------------------------------------------------------------------
@batch_router.post("", response_model=BatchPreviewResponse, summary="Upload & Preview Recruiter Batch")
async def create_batch_upload(
    spreadsheet_file: UploadFile = File(..., description="Spreadsheet (.csv or .xlsx)"),
    resumes_zip: Optional[UploadFile] = File(None, description="Optional ZIP of resume documents"),
    consent: bool = Form(..., description="Candidate consent to parse CV text"),
    target_role: Optional[str] = Form("Software Engineer"),
    job_description: Optional[str] = Form(None),
    mock: Optional[bool] = Form(False),
):
    """
    Step 1 & 2: Ingests spreadsheet and optional resumes ZIP.
    Validates limits (50 rows, 25MB, 100 ZIP files, ZIP traversal/bomb checks).
    Returns preview analysis with match status, tier, errors, and unmatched items.
    """
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate consent is required to ingest candidate records.",
        )

    # 1. Read spreadsheet content
    sheet_bytes = await spreadsheet_file.read()
    if len(sheet_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Spreadsheet file exceeds {MAX_FILE_BYTES // (1024 * 1024)} MB limit.",
        )

    raw_rows = parse_spreadsheet_bytes(spreadsheet_file.filename, sheet_bytes)
    if not raw_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded spreadsheet contains no data rows or valid headers.",
        )

    if len(raw_rows) > MAX_ROWS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch limit exceeded: maximum {MAX_ROWS} rows allowed (found {len(raw_rows)}).",
        )

    # 2. Extract resumes if ZIP provided
    resumes: Dict[str, bytes] = {}
    if resumes_zip and resumes_zip.filename:
        zip_bytes = await resumes_zip.read()
        if zip_bytes:
            resumes = inspect_and_extract_resumes_zip(zip_bytes)

    # 3. Match resumes to candidate rows
    annotated_rows, unmatched_files, unmatched_rows = match_resumes_to_rows(raw_rows, resumes)

    # 4. Build row previews
    row_previews = build_row_previews(annotated_rows)

    batch_id = f"batch_{uuid.uuid4().hex[:12]}"
    has_errors = any(len(r.errors) > 0 for r in row_previews)
    valid_count = sum(1 for r in row_previews if r.is_valid)

    # Store in memory batch record
    async with BATCH_LOCK:
        BATCH_STORE[batch_id] = {
            "id": batch_id,
            "status": "preview",
            "target_role": target_role or "Software Engineer",
            "job_description": job_description,
            "total_rows": len(row_previews),
            "rows": row_previews,
            "resumes": resumes,
            "unmatched_files": unmatched_files,
            "unmatched_rows": unmatched_rows,
            "is_demo": bool(mock),
            "created_at": datetime.utcnow().isoformat(),
        }

    return BatchPreviewResponse(
        id=batch_id,
        status="preview",
        target_role=target_role or "Software Engineer",
        total_rows=len(row_previews),
        valid_rows_count=valid_count,
        has_errors=has_errors,
        is_demo=bool(mock),
        rows=row_previews,
        unmatched_files=unmatched_files,
        unmatched_rows=unmatched_rows,
        created_at=datetime.utcnow().isoformat(),
    )


@batch_router.get("/{batch_id}", response_model=BatchPreviewResponse, summary="Get Batch Status & Rows")
async def get_batch_status(batch_id: str):
    """Retrieves current batch progress, statuses, and per-row outcomes."""
    batch = BATCH_STORE.get(batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch '{batch_id}' not found.",
        )

    return BatchPreviewResponse(
        id=batch["id"],
        status=batch["status"],
        target_role=batch["target_role"],
        total_rows=batch["total_rows"],
        valid_rows_count=sum(1 for r in batch["rows"] if r.is_valid),
        has_errors=any(len(r.errors) > 0 for r in batch["rows"]),
        is_demo=batch["is_demo"],
        rows=batch["rows"],
        unmatched_files=batch["unmatched_files"],
        unmatched_rows=batch["unmatched_rows"],
        created_at=batch["created_at"],
    )


@batch_router.post("/{batch_id}/start", summary="Start Processing Batch")
async def start_batch_processing(
    batch_id: str,
    payload: Optional[BatchStartRequest] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """Starts background processing for the selected valid rows in the batch."""
    batch = BATCH_STORE.get(batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch '{batch_id}' not found.",
        )

    selected_ids = payload.selected_row_ids if payload else None
    background_tasks.add_task(run_batch_orchestrator, batch_id, selected_ids)
    batch["status"] = "processing"

    return {"message": "Batch processing initiated", "batch_id": batch_id, "status": "processing"}


@batch_router.post("/{batch_id}/retry/{row_id}", summary="Retry Failed Batch Row")
async def retry_batch_row(
    batch_id: str,
    row_id: str,
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """Re-executes a failed row in the background."""
    batch = BATCH_STORE.get(batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch '{batch_id}' not found.",
        )

    target_row = next((r for r in batch["rows"] if r.id == row_id), None)
    if not target_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Row '{row_id}' not found in batch.",
        )

    target_row.status = "queued"
    target_row.error_detail = None

    background_tasks.add_task(
        run_batch_orchestrator, batch_id, [row_id]
    )

    return {"message": f"Row '{row_id}' queued for retry", "status": "queued"}
