"""
ProofPass Backend Entry Point Shim.
Imports the FastAPI application from backend.main and runs uvicorn.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure repo root is on sys.path if run directly
REPO_ROOT = str(Path(__file__).resolve().parent.parent)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

import uvicorn
from backend.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
