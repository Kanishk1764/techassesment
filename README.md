# 🎯 TalentScan AI — Full-Stack AI Resume Screener & Evaluation Platform

An enterprise-grade, end-to-end full-stack AI Resume Screening and Candidate Evaluation web application built with **Python (FastAPI + SQLAlchemy SQLite + PyMuPDF)**, **Next.js (React 18 + TypeScript + Tailwind CSS)**, and **OpenAI Multi-Modal (`gpt-4o-mini`, `gpt-4o`)**.

---

## 🌐 Live Cloud Deployments

| Component | URL | Description |
| :--- | :--- | :--- |
| **🎨 Web Application (Frontend)** | **[https://resume-screener-frontend-vdjp.onrender.com](https://resume-screener-frontend-vdjp.onrender.com/)** | Next.js Cloud Deployment on Render |
| **⚡ REST API Service (Backend)** | **[https://resume-screener-backend-wra5.onrender.com](https://resume-screener-backend-wra5.onrender.com/)** | FastAPI Service on Render |
| **📖 Interactive API Docs (Swagger)** | **[https://resume-screener-backend-wra5.onrender.com/docs](https://resume-screener-backend-wra5.onrender.com/docs)** | OpenAPI 3.0 Interactive Documentation |
| **🐙 GitHub Source Code** | **[https://github.com/Kanishk1764/techassesment](https://github.com/Kanishk1764/techassesment)** | Complete Source Code (Branch: `main`) |

---

## 🌟 Key Features & Capabilities

### 1. 👁️ Multi-Modal Document Parsing & Vision Analysis
- **PDF Processing (`PyMuPDF` / `fitz` + Vision LLM)**: Renders every page of PDF resumes into high-resolution PNG images at 150 DPI and passes them directly to OpenAI's Multi-Modal Vision API (`gpt-4o` / `gpt-4o-mini`) to analyze visual formatting, tables, multi-column career timelines, and certifications.
- **DOCX Processing (`python-docx`)**: Extracts paragraphs, bullet points, and complex table data from `.docx` documents.
- **Text & Zero-Prompt Extraction**: Automatically extracts candidate name, contact email, and verified tenure from documents without manual form fields.

### 2. 🎯 Automated 3-Tier Threshold Segregation
- **⭐ Fast-Track Shortlist (Score ≥ 80%)**: Meets or exceeds all core skills and experience requirements; auto-shortlisted for high-priority hiring.
- **🧐 Human Reviewer Lead (Score 50% – 79%)**: Borderline fit where the AI provides matched/missing skill justification and the human recruiter takes the lead to make the final Shortlist/Reject call.
- **❌ Auto-Rejected (Score < 50%)**: Clear skill and experience gaps below minimum requirements; automatically placed in the low-match pool.
- **One-Click Batch Actions**: Includes `Shortlist All ≥80%` and `Reject All <50%` batch triggers.

### 3. ⚖️ Configurable Screening Weight Distribution
- Recruiters can fine-tune evaluation weights using smooth 0–100% sliders with auto-normalization:
  - **Technical Skills Match %**
  - **Experience Duration Fit %** (with strict timeline experience deficit penalty)
  - **Domain / Education Fit %**

### 4. ✨ AI Job Description Enhancer & Auto-Skill Extractor
- Paste rough notes or upload raw JD documents (`.pdf`, `.docx`, `.txt`) to auto-generate professional Markdown descriptions, auto-extract required skills, and infer minimum experience thresholds.

### 5. ⚡ Real-Time AI Summary Streaming (SSE)
- Typewriter token-by-token live streaming via Server-Sent Events (`POST /jobs/{id}/candidates/{candidate_id}/stream-summary`) during intake and on candidate cards.

### 6. 🔄 Async Bulk Queueing & Cross-Job Re-scoring
- **Bulk Upload Queue**: Background queue manager (`BatchQueueManager`) processes resumes with concurrency throttling, live progress polling (0% → 100%), and per-file status reports.
- **Cross-Job Re-scoring**: Re-evaluate candidates against any other open role with multi-evaluation audit history.
- **Raw LLM I/O Inspection**: View exact system prompts and raw unparsed JSON payloads for 100% auditability.

---

## 🚀 Local Development Setup

### ⚡ Option A: Run Both in One Command (From Root)
```bash
npm install
npm run dev
```
> Starts both the **FastAPI backend** (`http://127.0.0.1:4000`) and the **Next.js frontend** (`http://localhost:3000`) concurrently.

---

### 🖥️ Option B: Run in Two Terminals

#### Terminal 1: Backend (`python main.py`)
```bash
cd backend
pip install -r requirements.txt
python main.py
```
*(Backend runs on `http://127.0.0.1:4000`, API docs at `http://127.0.0.1:4000/docs`)*

#### Terminal 2: Frontend (`npm run dev`)
```bash
cd frontend
npm install
npm run dev
```
*(Frontend runs on `http://localhost:3000`)*

---

### 🐳 Option C: Run with Docker Compose
```bash
docker-compose up --build
```
- **Next.js Frontend**: `http://localhost:3000`
- **FastAPI Backend**: `http://localhost:4000`

---

## ⚙️ Environment Variables

### Backend (`backend/.env` or Render Env)
```env
PORT=4000
DATABASE_URL="sqlite:///./dev.db"
OPENAI_API_KEY="sk-..."             # OpenAI API key (gpt-4o-mini / gpt-4o)
OPENAI_MODEL="gpt-4o-mini"
MAX_UPLOAD_MB=10
MAX_BULK_FILES=20
```

### Frontend (`frontend/.env.local` or Render Env)
```env
PORT=3000
BACKEND_URL="https://resume-screener-backend-wra5.onrender.com"  # In production
```

---

## 🧪 Automated Integration Tests

Run the Pytest suite:
```bash
cd backend
pytest
```

### Test Suite Results:
```
tests\test_candidates.py .........                                       [100%]
======================== 9 passed in 0.63s =========================
```
- Covers: Job creation, weight validation, zero-prompt upload, experience gating, non-recomputation on GET, bad file rejection, status patching, JD enhancement, and bulk queue worker.

---

## ⚖️ Trade-offs & Future Improvements (With More Time)

1. **Distributed Task Queue (Celery + Redis)**: Currently uses an in-memory `asyncio.Semaphore` queue manager. For high-scale distributed deployments across multiple containers, a Redis/RabbitMQ queue with Celery workers would provide horizontal task scaling.
2. **Enterprise SSO & Role-Based Access Control**: Add OAuth2/SAML with granular recruiter, hiring manager, and interviewer permissions.
3. **Automated Candidate Interview Scheduling**: Add automated email dispatch and calendar invite generation directly from shortlisted candidate cards.
4. **Vector Database Semantic Search**: Add vector indexing (`pgvector` / `ChromaDB`) over the talent database to search past applicants using natural language queries across positions.

---

## 📄 Deliverables Summary
- **Source Code**: [https://github.com/Kanishk1764/techassesment](https://github.com/Kanishk1764/techassesment)
- **Live Frontend Application**: [https://resume-screener-frontend-vdjp.onrender.com](https://resume-screener-frontend-vdjp.onrender.com/)
- **Live Backend API & Swagger Docs**: [https://resume-screener-backend-wra5.onrender.com/docs](https://resume-screener-backend-wra5.onrender.com/docs)
- **Author**: Kanishk Mishra (`Kanishkmishra402@gmail.com`)
