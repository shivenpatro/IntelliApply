# IntelliApply: Apply smarter, not harder.

IntelliApply is a full-stack web application designed to automate and personalize the job search process. It takes a user's resume and preferences, scrapes job boards, uses AI to find and rank the most relevant job postings, and presents them on a personalized dashboard.

## Project Overview

### Core Problem Addressed

Job seekers waste excessive time manually searching multiple job boards, filtering irrelevant postings, and performing repetitive tasks, hindering efficient connection with suitable opportunities.

### Core Solution

IntelliApply acts as an AI co-pilot. It parses user profiles/resumes, automatically discovers relevant jobs via web scraping, uses AI (TF-IDF + Cosine Similarity) for accurate profile-to-job matching, and displays prioritized results — significantly reducing manual effort.

### Key Features

- **User Authentication** — Secure Sign-up, Login, and Google OAuth via Neon Auth (Better Auth)
- **Profile Creation & Resume Upload** — Upload a PDF/DOCX resume to auto-populate skills and experience
- **Resume Parsing** — Extracts key entities from resumes using NLP
- **Web Scraping Engine** — Scrapes job postings from HackerNews and WeWorkRemotely
- **AI Matching Engine** — Matches your profile against jobs using TF-IDF vectorization and Cosine Similarity
- **Job Dashboard** — Displays ranked job postings sorted by relevance
- **Job Tracking** — Mark jobs as *Interested*, *Applied*, or *Ignored*

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js (Vite), TypeScript, Tailwind CSS |
| **Backend** | Python, FastAPI |
| **Database** | PostgreSQL via **Neon** |
| **Authentication** | **Neon Auth** (Better Auth) |
| **Resume Parsing** | PyPDF2 / python-docx, spaCy, Affinda API |
| **Web Scraping** | BeautifulSoup4, requests |
| **AI Matching** | scikit-learn (TF-IDF + Cosine Similarity) |
| **Task Scheduling** | APScheduler (AsyncIOScheduler) |

---

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+ and npm
- A [Neon](https://neon.tech) account (for PostgreSQL + Auth)

### 1. Clone and install dependencies

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Frontend (new terminal)
cd frontend
npm install
```

### 2. Configure environment variables

**`backend/.env`** — already exists with working Neon credentials:
```env
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/neondb?sslmode=require
NEON_AUTH_URL=https://<your-neon-auth-endpoint>/auth
SECRET_KEY=<your-secret-key>
FRONTEND_URL=http://localhost:5174
UPLOAD_DIRECTORY=./uploads
GEMINI_API_KEY=<optional>
AFFINDA_API_KEY=<optional>
```

**`frontend/.env`** — already exists with working Neon credentials:
```env
VITE_API_URL=http://localhost:8000
VITE_NEON_AUTH_URL=https://<your-neon-auth-endpoint>/auth
```

### 3. Run the application

#### Option A — Single command (recommended)

From the project root:
```bash
npm start
```

This starts both the FastAPI backend and the Vite frontend server concurrently.

#### Option B — Run individually

```bash
# Terminal 1 — Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5174` and the backend API on `http://localhost:8000`.

---

## Project Structure

```
IntelliApply/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers (auth, jobs, profile)
│   │   ├── core/         # Config, schemas, security, Neon Auth JWT verification
│   │   ├── db/           # SQLAlchemy models and database session
│   │   └── services/     # Business logic: scraping, matching, resume parsing
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/   # Shared UI components (Navbar, Footer, etc.)
│       ├── context/      # AuthContext (Neon Auth session management)
│       ├── lib/          # neon.ts — Neon Auth client library
│       ├── pages/        # Page components (Dashboard, Profile, Login, etc.)
│       └── services/     # api.ts — Axios API client
├── package.json          # Root scripts to start both servers
└── README.md
```

---

## Authentication

This project uses **Neon Auth** (powered by Better Auth) for all authentication:

- The frontend communicates directly with the Neon Auth REST API for sign-up, sign-in, and Google OAuth.
- JWTs issued by Neon Auth are stored in `localStorage` and sent with every backend API request via the `Authorization: Bearer <token>` header.
- The backend verifies these JWTs using the Neon Auth JWKS endpoint (`app/core/neon_auth.py`).
- On first authenticated request, the backend auto-creates a local user record + empty profile in the database.

---

## License

MIT License
