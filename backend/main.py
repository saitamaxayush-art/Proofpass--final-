"""
ProofPass Backend Entry Point (FastAPI).
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from backend.api.routes import router as api_v1_router
    from backend.database import init_db
except ImportError:
    from api.routes import router as api_v1_router
    from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes SQLite tables on application startup."""
    init_db()
    yield


app = FastAPI(
    title="ProofPass API",
    description="Evidence-first Technical Credibility Passport Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Configuration
# Configurable via CORS_ORIGINS environment variable.
# Never combines wildcard origins with credentialed requests.
# ---------------------------------------------------------------------------
cors_origins_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000",
)
origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
has_wildcard = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=not has_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Route Registration
# ---------------------------------------------------------------------------
app.include_router(api_v1_router)


@app.get("/")
def root():
    return {
        "service": "ProofPass API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/v1/health",
            "docs": "/docs",
            "openapi": "/openapi.json",
        },
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
