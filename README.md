# IntelliApply

IntelliApply extracts profile information from PDF/DOCX resumes with Gemini, discovers job listings, ranks them with TF-IDF and cosine similarity, and tracks application decisions. The frontend uses React, TypeScript, Vite and Tailwind; the API uses FastAPI and PostgreSQL. Neon Auth manages accounts, password recovery and Google OAuth.

Hacker News is the default source. WeWorkRemotely is optional and requires Firecrawl. LinkedIn, Indeed, Affinda and spaCy are not active integrations. Source descriptions can be summaries; the original listing remains the source of full application details. Similarity scores are ranking signals, not calibrated probabilities or measured hiring accuracy. Location preferences affect profile text; salary filtering is unavailable because the feeds do not provide consistent salary metadata.

## Local development

Use Python 3.12, Node.js 24 and PostgreSQL 16. From an existing checkout:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install --require-hashes -r requirements-dev.lock
cp .env.example .env
# Configure DATABASE_URL and the public Neon auth endpoint in .env.
python -m alembic upgrade head
cd ../frontend
npm ci
cp .env.example .env
# Configure the same Neon Auth project's public endpoint.
cd ..
npm start
```

On Windows, activate `backend\.venv\Scripts\activate` instead. Run migration commands from `backend`. `npm start` selects the local Python environment and starts both servers. Vite proxies `/api` and `/health` to port 8000. Process environment variables override `backend/.env`. Secret environment files and uploaded resumes must never be committed. The reviewed `frontend/.env.production` contains only the two public service destinations confirmed from the deployed site; project environment variables override those values.

The public frontend variables are `VITE_API_BASE_URL` and `VITE_NEON_AUTH_URL`. A build requires both explicitly, either in the reviewed public production file or in host environment bindings. For local development `VITE_API_BASE_URL=/` uses Vite's proxy. Vercel serves the frontend; the existing API host is Render (`https://intelliapply.onrender.com`). The SPA fallback in `frontend/vercel.json` does not provide an API proxy. A same-origin production API requires an explicit API rewrite before that fallback. A staging backend/auth project must override the production defaults.

The API does not create/alter tables at import. Alembic owns schema changes. Its first migration supports a clean database and the previous schema, rejects conflicting data before proceeding, and never deletes records to satisfy constraints. See [the release guide](docs/RELEASE.md) before applying it to existing data.

## Verification

`npm test` runs PostgreSQL integration tests, Python correctness lint, frontend lint, a TypeScript/production build and Chromium workflows. Start a **local test PostgreSQL service** whose admin can create disposable databases; tests refuse a remote admin host and create/drop only a random `intelliapply_test_*` database. They never use the application database or real provider keys.

```bash
export TEST_DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:5432/postgres
# Install Playwright's browser on a machine without system Chromium:
cd frontend
npx playwright install chromium
cd ..
npm test
```

Individual checks: `backend/.venv/bin/python -m pytest` from `backend`; `npm run lint -- --max-warnings=0` or `npm test` from `frontend`. Browser tests inject synthetic build configuration and intercept provider/API requests. Gemini contract tests use the real client with a mock HTTP transport. These prove local contracts, not deployed OAuth, email delivery, database credentials or paid-provider availability. CI is defined in [.github/workflows/ci.yml](.github/workflows/ci.yml).

`/health` is liveness. `/ready` checks database/schema availability and reports configured optional capabilities without spending model/scraper credits. API routes are documented at `/docs`; protected requests require a verified Neon JWT. Task polling is authenticated and scoped to its owner.

## Operational behavior

Refresh and resume processing return HTTP 202 with a task ID. PostgreSQL retains pending/running/completed/partial-failure/failed/interrupted status. The browser waits for an actual terminal result. Task state survives restarts; execution uses FastAPI background tasks. An interrupted upload requires another upload because resume bytes are not retained. Processing expires after 120 seconds by default; terminal status is retained for seven days. The browser cancels status requests on navigation or its three-minute overall deadline. One credential-free health warm-up on app mount helps a sleeping API start; ordinary API calls have a bounded 45-second timeout. These client measures do not guarantee hosting uptime.

Admission is coordinated across processes using PostgreSQL locks. Defaults: four active tasks, 60 seconds between a user's refresh requests, 30 seconds between resume requests, ten seconds between provider-wide resume starts, and 15 minutes between source scrapes. Limits return 429 and `Retry-After`. Provider quota failures impose a further cooldown. These application limits do not measure or guarantee Gemini/Firecrawl account RPM, TPM, RPD or credits; tune them from the actual account dashboards.

Recommendations are recomputed separately from application history. Obsolete pending recommendations disappear, while interested/applied/ignored decisions remain tracked and labelled. Retention skips listings with tracked application decisions. Matching uses at most the latest 500 listings, refits its process-local vocabulary when that corpus changes, and does not deserialize pickle artifacts.

Schedulers coordinate interval claims across workers. They run only while the API process is running; a sleeping hosting plan cannot guarantee periodic execution. Set `SCHEDULER_ENABLED=false` for isolated tests/development where periodic external calls are unwanted. Pool defaults are five connections plus two overflow **per process**; account for all workers and other clients before using a production database.

Runtime and development dependency locks include hashes. Regenerate intentionally with `uv pip compile requirements.txt -o requirements.lock --generate-hashes` and `uv pip compile requirements.txt requirements-dev.txt -o requirements-dev.lock --generate-hashes`. Use `npm ci` for the frontend. [The remediation report](docs/REMEDIATION.md) records local evidence and remaining release checks.

The landing-page wireframe uses a small Canvas2D renderer instead of a WebGL framework. It pauses offscreen/in hidden tabs, caps its backing store and stays disabled on small screens or under reduced motion. See [the release follow-up](docs/DEPLOYMENT_STATUS.md) for current deployment evidence and remaining access requirements.
