# ProofPass

Deterministic Evidence Verification, Skill Passport, and Recruiter Intelligence Platform.

ProofPass checks every technical skill claim against authentic evidence (GitHub repositories, coding platform profiles like LeetCode and Codeforces, and commit histories) to issue verifiable, tamper-evident skill passports with transparent audit trails.

---

## Architecture Overview

- **Frontend**: Vite + React single-page application with 3D passports, interactive applicant verification workflow, recruiter candidate ranking, and side-by-side candidate comparison.
- **Backend API**: Python FastAPI application (`backend/main.py`) providing resume text extraction, coding platform evidence collection, deterministic skill state assignment, cheat-resistant micro-quizzes, tamper-proof SHA-256 passport signing, and GitHub OAuth verification.
- **Persistence**: SQLite database via SQLAlchemy (`proofpass.db` at repo root).

---

## Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup

```bash
# 1. Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Create your local environment configuration
cp .env.example .env
```

### 3. Frontend Setup

```bash
# 1. Install frontend dependencies
npm --prefix frontend install

# 2. (Optional) Configure frontend environment variables
cp frontend/.env.example frontend/.env
```

### 4. Running the Application

In terminal 1 (Backend API):
```bash
# Start backend server with uvicorn reloader
npm run backend
# Alternatively: python3 -m uvicorn backend.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- API Health Check: `http://localhost:8000/api/v1/health`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- OpenAPI Specification: `http://localhost:8000/openapi.json`

In terminal 2 (Frontend Dev Server):
```bash
# Start Vite development server
npm run dev
# Alternatively: npm --prefix frontend run dev
```
- Web Application: `http://localhost:5173`
- The Vite dev server automatically proxies `/api` requests to `http://localhost:8000`.

---

## GitHub OAuth App Setup

To enable real GitHub sign-in and OAuth-verified repository authorship:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) -> **OAuth Apps** -> **New OAuth App**.
2. Fill in the application details:
   - **Application name**: `ProofPass Local Dev`
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:8000/api/v1/auth/github/callback`
3. Click **Register application**.
4. Generate a **Client Secret**.
5. Copy your Client ID and Client Secret into your root `.env`:
   ```bash
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   GITHUB_REDIRECT_URI=http://localhost:8000/api/v1/auth/github/callback
   ```
6. Restart the backend server.

### Offline & Mock Mode (`VITE_USE_MOCK`)
- If GitHub OAuth is not configured on the backend, the verification screen automatically detects this via `GET /api/v1/auth/config` and offers a **"Use sample GitHub account"** button.
- You can also force mock mode in the frontend at any time by setting `VITE_USE_MOCK=true` in `frontend/.env`. In mock mode, the app uses simulated GitHub data without contacting external servers.

---

## Testing

Run the automated backend test suite:

```bash
# Run all backend unit and integration tests
npm run test:backend

# Or directly with pytest
python3 -m pytest -q

# Run an individual test file
python3 -m pytest tests/test_backend_api.py -v
```

Run demo pipeline CLI:
```bash
npm run demo
# Alternatively: python3 rundemo.py
```

Run frontend build check:
```bash
npm run build
```

---

## Troubleshooting

### 1. Only 3 API routes mounted in `/openapi.json`
- **Cause**: Missing `httpx` or `python-dotenv` in virtual environment, causing `backend/api/auth.py` import failure which was silently caught.
- **Fix**: Run `pip install -r requirements.txt`. Startup errors in `backend/main.py` are now loud and will output full tracebacks rather than failing silently.

### 2. `ModuleNotFoundError: No module named 'intelligence'` during pytest
- **Cause**: Folder casing discrepancy (`backend/Intelligence` vs `backend/intelligence`) on case-insensitive filesystems like macOS.
- **Fix**: The folder is canonically named `backend/intelligence` with `backend` as an explicit package (`backend/__init__.py`), and all imports use the absolute style `from backend.intelligence...`.

### 3. Session tokens resetting on restart
- **Cause**: `SESSION_SECRET` is unset in `.env`, triggering automatic generation of an ephemeral random secret at startup.
- **Fix**: Define a static secret in `.env` (e.g. `SESSION_SECRET=my_long_random_secret_string`).

### 4. Database schema missing columns (e.g. `github_id`)
- **Cause**: An older `proofpass.db` file without recent schema migrations.
- **Fix**: `backend/database.py` defaults to `proofpass.db` at the repository root and runs `init_db()` automatically on module load to guarantee table and column existence. To start completely fresh, delete `proofpass.db` and restart the backend.