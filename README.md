# 🎯 TalentScan AI — AI Resume Screener & Evaluation Platform

An end-to-end full-stack AI Resume Screener web application built with **Python (FastAPI + SQLAlchemy SQLite)**, **Next.js (React 18 + TypeScript + Tailwind CSS)**, and **OpenAI (`gpt-4o-mini`)** with an automatic offline deterministic fallback mode.

---

## 🚀 Quick Start

### 1. Run the Python Backend (`python main.py`)

#### Prerequisites
- **Python** 3.10+
- **pip**

#### Setup & Start
```bash
cd backend
pip install -r requirements.txt
python main.py
```
> The backend server starts immediately on **`http://localhost:4000`** with OpenAPI docs available at `http://localhost:4000/docs`.

*(Optional)* Create `backend/.env` with your OpenAI key:
```env
PORT=4000
DATABASE_URL="sqlite:///./dev.db"
OPENAI_API_KEY=sk-...           # Leave blank to use deterministic MockProvider
OPENAI_MODEL=gpt-4o-mini
LLM_PROVIDER=openai             # "openai" | "mock"
```

---

### 2. Run the Next.js Frontend (`npm run dev`)

#### Prerequisites
- **Node.js** v18+
- **npm**

#### Setup & Start
Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
```
> The Next.js frontend application opens at **`http://localhost:3000`** (and automatically proxies `/api` requests to `http://localhost:4000`).

---

### 3. Run with Docker Compose (Single Command)

```bash
docker-compose up --build
```
- **Next.js Frontend**: `http://localhost:3000`
- **FastAPI Backend**: `http://localhost:4000`
- SQLite database is persisted inside the `sqlite_data` volume across restarts.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Port for the FastAPI backend REST API |
| `DATABASE_URL` | `sqlite:///./dev.db` | SQLite database location |
| `OPENAI_API_KEY` | *(empty)* | OpenAI API key. If omitted, the app **automatically falls back to MockProvider** |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI Chat model (`gpt-4o-mini`, `gpt-4o`) |
| `LLM_PROVIDER` | `openai` | Explicit provider switch: `openai` or `mock` |
| `MAX_UPLOAD_MB` | `5` | Maximum allowed resume file size in megabytes |
| `MAX_BULK_FILES`| `20` | Maximum number of files processed in a single bulk batch |

### How to Get an OpenAI API Key
1. Register at [platform.openai.com](https://platform.openai.com/).
2. Create an API Key in the Dashboard.
3. Add `OPENAI_API_KEY=sk-...` to `backend/.env`.

---

## 🤖 LLM Implementation & Deterministic Fallback

- **Default Model**: OpenAI **`gpt-4o-mini`** via the official Python `openai` SDK (`temperature: 0.1`, structured JSON mode `response_format={"type": "json_object"}`).
- **Zero-Crash Offline Fallback**: If no `OPENAI_API_KEY` is present (or `LLM_PROVIDER=mock`), the application automatically activates `MockProvider`.
- **Deterministic Mocking**: `MockProvider` extracts keywords, computes verifiable match scores against required skills and experience, and simulates streaming token-by-token for complete UI fidelity with zero network dependencies.
- **Safety & Bias Mitigation**:
  - Impartial recruitment system prompt guardrails.
  - Instructs model to strictly ignore protected characteristics (gender, race, age, religion, marital status).
  - Prompt-injection defenses: sanitizes prompt manipulation strings (e.g. `"ignore previous instructions"`).
  - Runtime validation with **Pydantic**: clamps scores to `[0, 100]`, validates recommendation enum (`strong`, `maybe`, `no`), filters skills strictly to the job's required list.
  - Automatic single retry on malformed JSON; records `Evaluation.status = "error"` rather than crashing the server.

---

## 🏛️ Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│               Next.js Frontend (React 18)              │
│  - Candidate Ranking & Metrics   - Single & Bulk Upload│
│  - Optimistic UI Status Updates  - Re-score & Debug I/O│
└───────────────────────────▲────────────────────────────┘
                            │ REST / SSE
┌───────────────────────────▼────────────────────────────┐
│                  FastAPI Backend (Python)              │
│  - /jobs, /candidates            - Multipart Uploads   │
│  - Pydantic Validation & Filters - Global Error Handler│
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Services Layer                      │
│  - Resume Text Extractor (pypdf / UTF-8)               │
│  - Evaluation Coordinator & Concurrency Limiter        │
│  - Swappable LlmProvider Interface                     │
│    ├── OpenAiProvider (gpt-4o-mini + retries)          │
│    └── MockProvider   (deterministic + sim-stream)     │
└───────────────────────────▲────────────────────────────┘
                            │ SQLAlchemy ORM
┌───────────────────────────▼────────────────────────────┐
│                  SQLite Database Layer                 │
│  - Job             - Candidate      - Evaluation       │
└────────────────────────────────────────────────────────┘
```

---

## ✨ Stretch Goals Implemented (All 6 Included)

| # | Stretch Goal | Implementation Details |
| :--- | :--- | :--- |
| **1** | **Raw Prompt & Response Audit Storage** | Stored on the `Evaluation` model (`raw_prompt`, `raw_response`). Viewable in the candidate UI via a collapsible "Debug: Raw LLM I/O" modal with one-click copy. |
| **2** | **AI Summary Live Streaming** | Implemented via Server-Sent Events (`POST /jobs/{id}/candidates/{candidate_id}/stream-summary`). A practical two-tier architecture provides immediate streamed summary feedback with typing cursor animations, while saving structured JSON. |
| **3** | **Candidate Re-scoring Against Another Role** | `POST /candidates/{id}/rescore` re-evaluates stored resume text against any target job. A candidate can have multiple `Evaluation` records, preserving the original evaluation history without mutating prior evaluations. |
| **4** | **Bulk Resume Upload & Batch Intake** | `POST /jobs/{id}/candidates/bulk` accepts up to 20 files under `resumes`. Employs `asyncio.Semaphore(3)` concurrency throttling (max 3 concurrent evaluations) with per-file status reports (`{ filename, status, candidateId, error }`) so partial failures do not fail the batch. |
| **5** | **Automated Pytest Suite** | 9 comprehensive Pytest integration tests covering job creation, resume upload, evaluation persistence, non-recomputation on GET, bad file handling, nonexistent jobs, status patches, re-scoring, and bulk upload. |
| **6** | **Full Dockerization & Compose** | Multi-stage `backend/Dockerfile` (Python) and `frontend/Dockerfile` (Next.js) orchestrated with `docker-compose.yml` and SQLite data volume persistence. |

---

## 🧪 Running Automated Tests

Run the Pytest suite:
```bash
cd backend
pytest
```

### Test Suite Output
```
collected 9 items

tests\test_candidates.py .........                                       [100%]
======================== 9 passed in 0.42s ========================
```

---

## ⚖️ Trade-offs & Future Improvements (With More Time)

1. **Authentication & Multi-Tenancy**: The current build is designed as an internal tool without user accounts. In production, JWT/OAuth2 authentication and role-based access control (Admin, Recruiter, Hiring Manager) would be added.
2. **True Token-Level JSON Streaming**: Currently uses a two-tier approach (stream natural-language summary first, then compute and persist structured evaluation). OpenAI function calling / JSON schema streaming could be used for unified single-pass streaming.
3. **Distributed Rate Limiting**: The current concurrency control uses in-memory `asyncio.Semaphore`. In a horizontally scaled multi-instance setup, a Redis-backed queue (e.g. Celery / BullMQ) would be used for background worker processing.
4. **Rich Document Format Support**: Currently supports standard `.pdf` and `.txt`. Expanding to scanned image OCR (`tesseract`) and `.docx` would support edge-case applicant formats.
5. **Pagination & Virtualized Lists**: Candidate lists currently load all records for a job. For roles with thousands of applicants, server-side cursor pagination (`?cursor=...&limit=50`) and virtual list rendering (`react-window`) would improve performance.
6. **Configurable Weighting & Rubrics**: Recruiters could customize scoring weights (e.g., 60% skills, 40% experience vs 80% skills, 20% experience) on a per-job basis.

---

## 📄 License
MIT License. Built for full-stack engineering take-home evaluation.
