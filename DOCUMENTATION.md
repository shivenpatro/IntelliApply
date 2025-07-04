### IntelliApply – Comprehensive Documentation

Welcome to the IntelliApply code-base!  This guide is your single source of truth for working with the public HTTP API exposed by the backend **FastAPI** server _and_ the reusable React/TypeScript components, hooks, and helper functions that power the frontend SPA.

---

## Table of contents

1. Backend HTTP API
   1. Authentication
   2. User Profile
   3. Jobs & Matching
   4. Utility End-points
2. Backend Python helper functions
3. Front-end React library
   1. Pages
   2. Layout & common components
   3. 3-D / visual components
   4. Job-centric components
   5. Hooks, context & utilities
4. Environment & local development

---

## 1. Backend HTTP API (FastAPI)

All routes are prefixed by the server root.  In local development that is typically:

```
http://localhost:8000
```

Unless noted otherwise, routes **require an `Authorization: Bearer <access-token>` header** obtained from the login end-point.

### 1.1 Authentication (`/api/auth`)

| Verb | Path | Body | Response | Notes |
|------|------|------|----------|-------|
| `POST` | `/api/auth/register` | `{ "email": "user@example.com", "password": "strongPass123" }` | `200` → newly-created `User` object | Creates account in Supabase _and_ local cache. |
| `POST` | `/api/auth/token` | `application/x-www-form-urlencoded`: `username`, `password` | `{ "access_token": "…", "token_type": "bearer" }` | Standard OAuth2 password-grant.
| `GET`  | `/api/auth/me` | – | `User` | Identity of current token.

> **cURL example – login**
>
> ```bash
> curl -X POST \
>      -F "username=user@example.com" \
>      -F "password=strongPass123" \
>      http://localhost:8000/api/auth/token
> ```

### 1.2 Profile (`/api/profile`)

| Verb | Path | Body | Response |
|------|------|------|----------|
| `GET`  | `/api/profile` | – | `Profile` | Fetch current profile. |
| `PUT`  | `/api/profile/preferences` | Partial `Profile` fields | Updated `Profile` |
| `POST` | `/api/profile/resume` | `multipart/form‐data` → `file` | `{ success, message }` | Upload & parse resume; stored in Supabase Storage. |
| `POST` | `/api/profile/skills` | `[ { name, level? } ]` | `Skill[]` | Up-sert list. |
| `DELETE` | `/api/profile/skills/all` | – | `204 No Content` |
| `DELETE` | `/api/profile/skills/{skillId}` | – | `204` |
| `POST` | `/api/profile/experiences` | `[ExperienceCreate]` | `Experience[]` |
| `DELETE` | `/api/profile/experiences/{expId}` | – | `204` |

> **Example – Updating preferences (JS)**
> ```ts
> await api.put('/api/profile/preferences', {
>   first_name: 'Ada',
>   desired_roles: 'Full-Stack Engineer'
> });
> ```

### 1.3 Jobs & Matching (`/api/jobs`)

| Verb | Path | Body | Response | Notes |
|------|------|------|----------|-------|
| `GET` | `/api/jobs/matched` | – | `JobWithMatch[]` sorted by `relevance_score desc` |
| `PUT` | `/api/jobs/{jobId}/status` | `{ "status": "interested" \| "applied" \| … }` | `{ success: true }` |
| `POST` | `/api/jobs/refresh` | – | `{ task_id, message }` | Triggers scraping + matching in background. |
| `GET` | `/api/jobs/refresh/status/{taskId}` | – | `{ task_id, status, message }` |
| `GET` | `/api/jobs/counts` | – | `{ total, by_status: { pending, … } }` |

> **Refreshing job matches**
> ```bash
> # Trigger
> curl -H "Authorization: Bearer $TOKEN" -X POST http://localhost:8000/api/jobs/refresh
> # Later poll
> curl http://localhost:8000/api/jobs/refresh/status/$TASK_ID
> ```

### 1.4 Utility

| Verb | Path | Purpose |
|------|------|---------|
| `GET` | `/` | Welcome endpoint. |
| `GET` | `/health` | Health probe for orchestrators. |

---

## 2. Backend helper functions (Python)

These are **importable** from `app.services` and can be reused in other scripts or unit tests.

| Function | Module | Signature | Purpose |
|----------|--------|-----------|---------|
| `trigger_job_scraping` | `app.services.job_scraper` | `async def trigger_job_scraping(task_id: str | None = None, task_statuses_ref: dict | None = None)` | Scrapes external job boards and persists new `Job` rows. Accepts optional task tracking. |
| `match_jobs_for_user` | `app.services.job_matcher` | `async def match_jobs_for_user(user_id: uuid.UUID, task_id: str | None = None, task_statuses_ref: dict | None = None)` | Computes TF-IDF + cosine similarity between a user's skills/experiences and all jobs. |
| `match_jobs_for_all_users` | `app.services.job_matcher` | `async def match_jobs_for_all_users()` | Broadcast version used by scheduler.
| `fit_vectorizer_globally`, `load_global_vectorizer` | `app.services.vectorizer` | – | Maintains a persisted global sklearn TF-IDF vectorizer. |
| `parse_resume` | `app.services.resume_parser` | `def parse_resume(storage_path: str, profile_id: uuid.UUID, db_session)` | Extracts structured data from uploaded PDF/Docx and populates profile rows. |

> **Example – ad-hoc scraping in a maintenance script**
> ```py
> import asyncio
> from app.services.job_scraper import trigger_job_scraping
>
> asyncio.run(trigger_job_scraping())
> ```

---

## 3. Frontend React/TypeScript Library (`frontend/src`)

### 3.1 Pages (under `src/pages`)

These are route-level containers meant to be wired into React-Router. They already consume context/hooks internally, so you usually do **not** import them inside other components.

* `HomePage` – Landing page with hero 3-D animation.
* `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `UpdatePasswordPage` – Auth flows.
* `DashboardPage` – Main signed-in view listing matched jobs.
* `ProfilePage` – CRUD UI around profile, skills, experiences & resume upload.

Usage:
```tsx
<Route path="/dashboard" element={<DashboardPage />} />
```

### 3.2 Layout & Common Components (`src/components/common`)

| Component | Description | Props |
|-----------|-------------|-------|
| `Navbar` | Responsive top navigation that reflects auth state. | `links?: NavItem[]` |
| `Footer` | Simple CTA + copyright footer. | – |
| `Spotlight` | Animated gradient spotlight wrapper. | `{ children, className? }` |
| `SplineScene` | Embeds a Spline 3-D scene. | `{ url: string }` |

Example:
```tsx
import { Navbar } from '@/components/common/Navbar';

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

### 3.3 3-D / Visual Components (`src/components/three`)

| Component | Purpose |
|-----------|---------|
| `BackgroundScene` | full-screen WebGL shader background driven by `three.js`. |
| `ParticleBackground` | Lightweight particle system alternative. |
| `Card3D` | Interactive tilt-card wrapper. |
| `FloatingLogo` | Floating branded logo mesh. |
| `Scene3D` | Composable scene orchestrator for nested 3-D elements. |
| `SkillsVisualization` | Graph-based visualization of extracted skills. |
| `AnimatedButton3D` | Call-to-action button with depth & hover animation. |

All components share the same interface pattern: `className?` and optionally dimension props.  They are *decorative* and have no runtime dependencies beyond `three`, `@react-three/fiber`, and `leva`.

### 3.4 Job-centric Components (`src/components/jobs`)

| Component | Description | Key props |
|-----------|-------------|-----------|
| `JobCard` | Compact card showing title, company, location & relevance chip. | `{ job: JobWithMatch, onSelect? }` |
| `JobDetailsModal` | Modal overlay with full description and status actions. | `{ job, isOpen, onClose }` |

Example:
```tsx
<JobCard job={job} onSelect={() => setSelected(job)} />
<JobDetailsModal job={selected} isOpen={!!selected} onClose={() => setSelected(undefined)} />
```

### 3.5 Hooks, Context & Utilities

* `AuthContext` – Provides `{ user, token, login(), logout() }` globally.
* `useLoadingState()` – Tiny helper that returns `[isLoading, withLoading]` to wrap async callbacks with spinner state.
* `api.ts` – Axios instance pre-configured with base URL & token injection; exports strongly-typed CRUD helpers that mirror the backend routes.

---

## 4. Environment & Local Development

1. **Backend**
   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
2. **Frontend**
   ```bash
   cd frontend
   npm i
   npm run dev
   ```
3. **Environment variables** – see `backend/app/core/config.py` & `frontend/.env.example`. Make sure to provide your Supabase credentials and database URL.

Happy hacking! 🎉