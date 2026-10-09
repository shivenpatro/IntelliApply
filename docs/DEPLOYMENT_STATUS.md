# Deployment verification

Date: 2026-10-09 (Asia/Kolkata). Deployment and real integration checks are authorized. This document separates the observed baseline, verified release evidence and external requirements. Deployment revisions/results are recorded in [PR #3](https://github.com/shivenpatro/IntelliApply/pull/3) and its host checks.

## Hosting and baseline

| Component | Verified host | Initial observed state |
| --- | --- | --- |
| Frontend | `https://intelli-apply.vercel.app` on Vercel | GitHub revision `2ea161540b22c85567f1c2f5c42632bbdf0db070`; frontend build root `frontend`. |
| Backend | `https://intelliapply.onrender.com` on Render | June revision `c33524ffd739f95cd5d8c2cdf237cbf504b22f57`, Docker root `backend`, free plan in Singapore, one instance. |
| Database/auth | Existing `ep-green-glade-ajuf7urf` Neon project | PostgreSQL 17.11 and managed Neon Auth. |

The backend is on Render. Vercel's SPA rewrite does not proxy or replace it. The baseline backend and frontend were deployed from different revisions.

Authenticated Vercel/Render API access now works after publication of the cloud environment. MCP tools are not exposed to this chat, but authenticated host APIs provide the required management access. Credentials are never included in repository files or reports.

## Verification completed

- Local regression suite: **68 backend/PostgreSQL cases + 17 built-frontend Chromium workflows**, with correctness lint, zero-warning frontend lint and TypeScript/build. Previous release CI also verifies clean locked installation, a nonroot Docker image and dependency advisories; the latest revision's checks are attached to PR #3.
- A dedicated Neon test identity was registered. Real email/password SDK sign-in, JWT session creation, profile access, experience create/edit/delete, reload, provider sign-out and subsequent rejection of the remote session pass in Chromium against an isolated migrated database. This browser harness serves the release assets under the production origin and forwards API requests to the isolated backend; auth requests use the real provider without fixture replies. It is not a claim that those assets/backend were already promoted publicly.
- The observed JWT issuer and audience are both the managed auth hostname origin, **without** `/neondb/auth`. Real signature, expiry, issuer and audience checks pass. The SDK replaces the opaque session token with the signed `set-auth-jwt` response header; raw session JSON alone is not the backend credential.
- A PostgreSQL custom dump of the application's **public schema** was taken through Neon's TLS WebSocket transport. It was restored to an isolated PostgreSQL 17 instance with all table counts matching: 4 users, 4 profiles, 112 skills, 6 experiences, 86 jobs and 78 matches. Alembic revision `0001_reliability` upgrades that copy without deleting data. An AES256-encrypted copy passes a decryption/checksum round trip. Managed auth data is outside this migration and is not replaced by that application-schema backup.
- Vercel's actual project settings are corrected to Node 24, `npm ci`, `npm run build`, root `frontend`, output `dist`.
- Firecrawl account access succeeds. Its initial credit report showed 1,484 remaining credits. A real WeWorkRemotely scrape exposed the live heading change from `h4` to `h3`; the class-based selector now accepts both and is covered by a regression case. A fresh live scrape produces usable canonical listings.
- Public production routes/guards, auth session/JWKS and Google OAuth initiation were exercised. Google initiation reaches the configured provider handoff; successful Google account login and callback still require an interactive test identity.

The cloud browser uses public-key pins of the environment's installed proxy CAs. This is not an independent origin-certificate audit. Dedicated account credentials, cookies/JWTs, database backups and host bindings are held in restricted local release storage, not in source control, public evidence or PR descriptions.

## Release changes

The original 37 failed audit expectations and 27 findings are mapped in [REMEDIATION.md](REMEDIATION.md). The release adds truthful persistent owned tasks, input/resource/admission limits, concurrency/integrity constraints, safe migration preflight, provider deadlines, real task polling, correct account recovery/session behavior, profile editing and preservation of application history.

The wireframe decoration now uses a roughly 2.7 KB Canvas2D chunk instead of the roughly 856 KB active WebGL chunk. It pauses offscreen/in hidden tabs, limits rendering to 30 frames/second, caps backing pixels, and is disabled for small screens/reduced motion. Main/Home bundles still need real-device performance measurement. Navigation anchors, request cancellation, favicon and mobile/dialog behavior are repaired. Unsupported testimonials, candidate counts and delivery-time promises are removed from landing/account pages.

Docker uses Python 3.12.14, hash-verified runtime dependencies, explicit readable source/migration copies and a nonroot user. Local credentials, uploads, virtual environments and tests are excluded. Public frontend URL defaults are reviewed; full staging must supply isolated destinations explicitly.

Render's old `SCRAPER_MAX_JOBS_PER_SOURCE=70` exceeds the release's supported bound. The rollout must set a supported bounded value before startup, configure the observed JWT issuer/audience, explicit HTTPS origins, schema creation off and safe task/provider/database budgets. Health/readiness checks must validate the deployed schema/backend before frontend promotion.

## External limitations and remaining acceptance

Google rejects the Gemini key deployed at the beginning of the authenticated follow-up with `API_KEY_INVALID`. It has the expected format and no extra quotes/whitespace. A replacement must be bound server-side and verified before successful PDF/DOCX inference can be claimed. Firecrawl credits do not establish Gemini quotas; actual account RPM/TPM/RPD and billing limits need its account configuration. Never exhaust live quotas to test them.

Reset-request acceptance alone does not prove email delivery, verification-link completion or changing a password. Inbox-dependent acceptance and completed Google sign-in require the dedicated identity's inbox/interactive access. No password, token or OAuth callback should be pasted into chat.

Render's actual plan is free. Slow/cold requests were observed, including four 45-second timeouts followed by a healthy response. The client performs one cancellable credential-free warm-up and uses a bounded 45-second API budget, but this does not guarantee host availability. Scheduled work only runs while an instance is awake; continuous scheduling needs suitable uptime or an explicitly configured external runner. No paid plan was provisioned.

Task state is durable, but uploaded bytes and execution are not automatically replayed after a crash. Interrupted tasks accurately report interruption and require retry/re-upload. Secured retained uploads and an agreed worker/storage configuration are needed for replay; those services are not silently provisioned.

## Rollout and rollback

Follow [RELEASE.md](RELEASE.md): verify the current release/configuration, quiesce writes for the first migration, retain a verified backup, migrate/deploy the backend, check its revision/readiness and owned API contracts, then promote the frontend and test the public visitor/account journey. Do not promote the frontend before its task/schema contract is available.

The migration refuses conflicts without deleting records and refuses destructive downgrade. Roll back application revisions while preserving the additive schema; restoring a backup must account for all subsequent writes. Host configuration changes and actual deployment receipts belong in the release record.

## Evidence

Safe test/build/browser/provider and deployment reports are in `/workspace/intelliapply-audit-20261009-release/`. Restricted account/session, backup/restore and configuration material is in `/workspace/.intelliapply/release-access/` and must not be committed or uploaded to public artifacts. Report counts and outcomes, never customer rows or secret values.
