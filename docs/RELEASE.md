# Release guide

See [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) for the latest release state. The original production frontend/backend still require coordinated replacement and migration. Successful real account, email/OAuth, Gemini quota and database checks must not be inferred from the local regression suite or a public frontend preview.

## Prepare staging

1. Identify the deployed frontend/backend revisions and actual API host. Inspect variable names/presence without printing secret values. Make staging use a separate database and dedicated test identities.
2. Confirm the Neon Auth endpoint, JWT issuer, available audience claim, JWKS URL, Google callbacks, password-reset redirect and allowed frontend origins. Require valid signature, subject, expiry and issuer. Configure audience when present in the real contract; do not invent one. The SDK is pinned to `0.5.0-beta`, so exercise real cookie/session and OAuth behavior before releasing its upgrade.
3. Verify the configured Gemini model is available to the account. Read RPM/TPM/RPD and usage from its dashboard; tune `RESUME_GLOBAL_INTERVAL_SECONDS`, `MAX_ACTIVE_TASKS` and cooldowns. Inspect Firecrawl credits and enable `weworkremotely` only after one successful real integration test. Mock HTTP contract tests do not establish account authorization or quota.
4. Set production/staging backend variables: `ENVIRONMENT=production`, an explicit TLS `DATABASE_URL`, `NEON_AUTH_URL`, the verified `NEON_AUTH_ISSUER`, HTTPS `FRONTEND_URL`, and an explicit comma-separated HTTPS `CORS_ORIGINS`. `AUTO_CREATE_SCHEMA=false`. Keep secrets server-side. Configure scheduling according to hosting uptime and all worker/database connection budgets.
5. Set Vercel's build root to `frontend`, Node 24, install `npm ci`, build `npm run build`, output `dist`. The reviewed public `frontend/.env.production` identifies the existing Render API and Neon project. Override `VITE_API_BASE_URL` and `VITE_NEON_AUTH_URL` with isolated staging destinations for a full staging test. A relative API base works only with an explicit API rewrite before the SPA fallback. The checked-in rewrite provides direct-page SPA reloads, not an API proxy.

## Migrate and deploy in order

Take a verified database backup first and rehearse restoring it in isolation. Quiesce writes while performing the first migration. Preserve an export of conflicting identities/skills/matches rather than deleting history automatically. The migration reports only conflict counts and refuses to proceed until they are deliberately reconciled.

From the backend release directory, with secure staging/production bindings:

```bash
python -m pip install --require-hashes -r requirements.lock
python -m alembic upgrade head
python -m alembic current
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Expected revision: `0001_reliability`. Set the host's required port through its startup command. The backend has no automatic startup migration or paid-provider probe. Deploy schema/backend before the frontend that requires task IDs and authenticated status endpoints. New tables/columns are additive, but tighter validation is intentional; keep both application rollback revisions available and coordinate the two deployments.

## Acceptance walkthrough

- Direct landing and `/login`/`profile`/`dashboard` page reloads; registration and any email verification; password and Google sign-in; sign-out and return; expired-token recovery.
- Password reset email → actual callback → new password → login; invalid and expired tokens show useful errors. Check browser cookie behavior on the real Vercel origin.
- One small PDF and one small DOCX, each with an authorized provider budget; actual completion updates the profile. A controlled provider failure shows failure and preserves existing data. Never exhaust a live quota as a test.
- Experience and location edits, case-duplicate skills, fresh recommendations, application status persistence, an empty relevant profile, and preservation of tracked history.
- Refresh completion, partial source failure, repeated refresh cooldown, task ownership, restart/interruption, readiness under a controlled database outage, and one scheduled cycle or equivalent controlled invocation.
- A phone-width view, keyboard Tab/Escape/focus restoration, reduced motion, disabled WebGL, and actual page/interaction performance. The active wireframe now uses Canvas2D and does not require WebGL; the core/home bundles still warrant measurement on real devices.
- Confirm deployed commit/configuration and sanitized logs. Search old logs for the previously printed database URL/resume content. Rotate a credential if exposure is established, coordinating both hosts.

## Rollback

The migration's `downgrade` deliberately refuses destructive reversal. Prefer rolling back both application releases while retaining the additive schema. Verify the previous app against the tightened constraints in staging; do not assume every old invalid write remains compatible. If schema rollback is necessary, use the verified pre-migration backup and account for all writes since that backup. Rehearse that process before production changes.

Outbound Vercel, Render, GitHub and Neon reads now work. Authenticated GitHub repository access is available, but Render/Vercel management credentials, a production/staging database binding and a dedicated real test identity are still required for the coordinated rollout and full integration checks. The user has authorized deployment; no further generic deployment confirmation is needed once those prerequisites are satisfied.
