# Deployment follow-up

Date: 2026-10-09 (Asia/Kolkata). The user has authorized deployment and real integration checks. Deployment permission is established; the remaining prerequisites are access and release evidence.

## Hosting confirmed from the live application

| Component | Confirmed destination | Evidence |
| --- | --- | --- |
| Frontend | `https://intelli-apply.vercel.app` on Vercel | Landing page/assets return 200. GitHub records the Vercel Production deployment for baseline revision `2ea161540b22c85567f1c2f5c42632bbdf0db070`. |
| Backend | `https://intelliapply.onrender.com` on Render | The served JavaScript uses this API origin. `/health` and `/openapi.json` respond with the old API contract. |
| Authentication | The existing `ep-green-glade-ajuf7urf` Neon Auth project | Live frontend configuration and reachable session/JWKS endpoints agree. |

The backend is not hosted by Vercel. The Vercel rewrite serves frontend pages; it does not replace or proxy the Render API.

## Verified live, without using customer identities

- Landing, login, registration, recovery, password-update and callback pages return 200 on direct navigation. Anonymous dashboard/profile visits redirect to login. No JavaScript page exceptions occurred in the browser run.
- The Render health response is 200 and protected profile access is 401 without a token. The deployed API is still version `0.1.0`; `/ready` is 404 and the new resume-status/experience-edit operations are absent. That is expected for the unreleased baseline, not proof that the fixes are deployed.
- Neon session and JWKS endpoints return 200 and allow the production frontend origin. Signing keys use EdDSA. OpenID discovery returns 404, so it cannot establish the actual JWT issuer/audience.
- Reset-request, reset-password, email-sign-in, signup and social-sign-in routes reject missing fields with 400 rather than 404. These validation requests create no identities and send no emails.
- A real Google OAuth initiation succeeds: Neon responds with a managed handoff URL, which redirects to `accounts.google.com` with a client ID, state and Neon callback. The check stops before entering a Google account. Successful Google login and the frontend callback are still unverified.

Browser traffic passes through the cloud environment's proxy. Chromium was configured with the public-key pins of the environment's installed proxy CAs after its default trust store rejected that chain. This is a route/layout check, not an independent production-origin certificate audit. No account credentials were entered into that browser.

## Additional release fixes

- The animated wireframe preserves projected icosahedron geometry using Canvas2D. The built decoration chunk is **2.7 KB**, compared with approximately **856 KB** for the previous WebGL chunk. The core and Home chunks remain about 669 KB and 268 KB; their warnings are not suppressed and real-device performance still needs measurement.
- Rendering uses one decorative canvas with no hit testing or focus targets. HTML retains all controls/labels. It is disabled for small screens/reduced motion, pauses offscreen and in hidden tabs, draws at most 30 frames/second and caps backing pixels near two million (about 8 MB). SVG could render this geometry, but the batched Canvas path avoids updating many projected edge elements every frame. No WebGL context or rendering framework is needed by the active decoration.
- Navigation anchors now resolve from other routes and account for the lazily mounted landing page.
- The Dockerfile uses Python 3.12.14, hash-verified runtime dependencies, explicit runtime/migration source copies and a nonroot user. `.dockerignore` excludes local credentials, uploads, virtual environments and test files. Explicit copy permissions make the runtime readable even when workspace files are owner-only. The image builds, imports at UID 10001, serves health, and passes readiness/auth-guard checks against the migrated local database. The cloud build supplied the approved proxy's DNS/CA configuration; the initial GitHub runner also built and checked the image normally.
- Node 24, npm install/build commands and the Vercel output directory are explicit. `frontend/.env.production` contains only the existing two public service URLs and can be overridden by host variables. Full staging must override them with isolated staging services.
- Four additional browser regressions cover the Canvas fallback/reduced motion, navigation from another page, anonymous backend warm-up and cancellation of outstanding status requests. The local checks pass **67 backend cases + 17 browser workflows**, plus lint/build. The production-default build also passes.

The existing Render service also exceeded a 15-second read budget during a later probe, after previously successful responses. This is an observed latency/intermittency issue, not proof of a particular hosting plan or cause. The client now makes one cancellable, credential-free health warm-up on app mount, allows a bounded 45-second API request, and cancels in-flight status requests on navigation or the three-minute polling deadline. No periodic keepalive, automatic mutation retry or paid-provider request is introduced by the warm-up. Actual host logs, availability and cold-start behavior still require management access. The remaining framework favicon was replaced with the application's existing logo.

## Release state and remaining prerequisites

The published release branch is `fix/reliability-release-20261009` and its draft pull request is [PR #3](https://github.com/shivenpatro/IntelliApply/pull/3). The first release commit is `86218eca5488de7b761f68c847bce6caa4dbcebb`. Vercel reports a successful [frontend preview](https://intelli-apply-qhquqetg2-shivenpatros-projects.vercel.app), and the initial [GitHub Actions run](https://github.com/shivenpatro/IntelliApply/actions/runs/37842738555) passes regression, dependency-advisory and Docker checks. Later documentation/diagnostic revisions and preview URLs are recorded in the PR checks. A frontend preview is not a full-stack staging deployment when its API/auth defaults still point at the existing production services.

The cloud proxy denies the new preview hostname (CONNECT 403), including a request with elevated shell permissions. This is a network policy response, not a Vercel outage or an automatic approval rejection. The exact hostname and Render management endpoint, plus personal credential requirements, were saved in an environment configuration draft. Saving does not activate/publish that draft; review/save the settings and publish the environment to apply them.

The GitHub Actions runner also reports the preview's actual accessibility and, if publicly served, runs anonymous Chromium route/layout checks without fixture responses or credentials. Its report is also published to the PR checks API and explicitly distinguishes a served app from authentication protection, a network error or a not-yet-ready deployment. This diagnostic does not claim successful account login or a migrated backend.

The production branch has not been updated or merged during this preparation. Do not promote the frontend ahead of the database/backend: the new frontend needs the new task-status contract.

Available access: authenticated GitHub repository reads/writes and public Vercel/Render/Neon reads. Missing access: Vercel/Render management credentials or callable authenticated connectors, a staging/production database binding for backup/preflight/migration, and a dedicated test identity with inbox access. This session exposes no authenticated computer-use session for those dashboards. GitHub access alone does not reveal Render or Vercel environment secrets.

Once those bindings are available, follow [RELEASE.md](RELEASE.md): verify the actual JWT issuer/audience and host configuration; rehearse backup/restore and the migration; test dedicated auth/email/OAuth and PDF/DOCX inference in staging; migrate/deploy backend; promote frontend; verify deployed revision/readiness and the visitor journey. Inspect actual Gemini/Firecrawl account quotas/credits and database connection/backup settings rather than inferring them from public responses. Do not exhaust a provider quota to test its limit.

Background task status is durable, but uploaded bytes are not retained and execution is not automatically replayed after a crash. Reliable replay requires an agreed worker/storage setup with secured temporary resume retention and production host configuration; it is not silently enabled by the current release. Interrupted tasks accurately report interruption and require retry/re-upload.

## Session evidence

`/workspace/intelliapply-audit-20261009-release/` contains the baseline served HTML/JavaScript/OpenAPI, anonymous browser screenshots/results, public auth checks, Google initiation metadata, release test/build logs and Docker packaging evidence. OAuth state URLs, passwords and provider/database secrets are not included in the report or repository.
