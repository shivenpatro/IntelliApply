# IntelliApply remediation report

Updated: 2026-10-09 (Asia/Kolkata). The release is published in [PR #3](https://github.com/shivenpatro/IntelliApply/pull/3), based on `2ea161540b22c85567f1c2f5c42632bbdf0db070`. Vercel has created a frontend preview and the initial remote regression/advisory checks pass. The production branch has not been merged, the production database has not been migrated, and authenticated production acceptance remains incomplete. See [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) for current hosting/access evidence.

The original audit recorded 37 failed expectations and 27 additional findings. The reproducible local defects have been addressed. Production account settings, hosting configuration, actual quotas and successful live integrations remain acceptance gates, rather than being marked fixed without evidence.

## Implementation plan and outcome

| Order | Work | Local outcome |
| --- | --- | --- |
| 1 | Repair account recovery, pending forms, session recovery, sensitive logging and mobile/dialog behavior | Implemented and checked with signed test tokens, synthetic browser sessions, code review and browser workflows. |
| 2 | Introduce versioned schema changes, validation, concurrent identity handling and persistent owned task status | Implemented. PostgreSQL integration tests cover fresh and existing schemas, conflicting-data refusal, isolation, concurrency and deadlines. |
| 3 | Replace simulated resume success, guard uploads/profile edits, repair matching freshness and source/provider failure handling | Implemented. Real-client mock transport tests and database/browser workflows exercise completion, errors and preservation of existing data. |
| 4 | Upgrade vulnerable dependencies, repair tooling/configuration, add permanent tests/CI and truthful feature documentation | Implemented. Hash-verified Python locks and a clean npm install reproduce the environment; current advisory scans report zero known vulnerabilities. |
| 5 | Run the complete local checks and prepare the release procedure | Completed locally. The next release stage is the controlled staging walkthrough in [RELEASE.md](RELEASE.md). |

## Verification evidence

| Check | Result | Scope |
| --- | --- | --- |
| Root `npm test` | **67 PostgreSQL/backend cases and 17 Chromium workflows passed** | 84 passing cases, no failures or skips. Backend parametrization contributes to the count; these are not 84 independent live integrations. |
| Backend correctness lint | Passed | Flake8 undefined names/import correctness and syntax checks (`F,E9`). This is not a claim that every formatting rule was enforced. |
| Frontend lint | Passed with zero warnings | Existing hook/refresh issues were corrected without globally suppressing the rules. |
| TypeScript and production build | Passed | Runs as part of the browser test setup with explicit synthetic API/auth configuration. |
| Clean frontend `npm ci` | Passed | Lockfile installs successfully with Node 24. `npm ls` reports a resolved dependency tree. |
| Hash-verified Python installation | Passed | Runtime/development locks install; an independent fresh virtual environment also passed the then-current backend suite. |
| Frontend `npm audit` | **0 known vulnerabilities** | Full installed frontend tree, including development dependencies, at scan time. This does not cover the hosted auth service's implementation. |
| Python `pip-audit` | **0 known vulnerabilities across 81 installed packages** | Includes development tools, using the PyPI advisory service. This is an advisory snapshot, not a guarantee of security. |
| Local migration/startup | Passed | Development database retained its ten synthetic jobs and zero users/profiles/matches/tasks. No disposable test databases remained after verification. |
| Local probes, Docker runtime and Vite API proxy | Passed | `/health` and `/ready` returned 200; unauthenticated protected requests returned 401. The built image imports the API at UID 10001 and passes health/readiness/auth-guard checks against the migrated local database. |
| Cloud setup | Updated and exercised | Reusable installation/start instructions and required outbound destinations were saved in a configuration draft. A saved draft does not apply network changes or publish a deployment. |

The original 80-case run and finding map are saved under `/workspace/intelliapply-audit-20261008/`. The expanded 83-case run is `/workspace/intelliapply-audit-20261009-release/release-test.log`; the latest 17-browser run is `final-frontend-test.log` in that directory, alongside packaging and live/public deployment evidence. The original frontend/Python advisory files are `remediation-npm-audit.json` and `remediation-python-audit.json`; remote Actions advisory checks have also passed for the published release. These paths are session artifacts, not portable repository dependencies. The permanent tests are [backend/tests](../backend/tests) and [frontend/tests/workflows.spec.ts](../frontend/tests/workflows.spec.ts); the runner is [scripts/test.mjs](../scripts/test.mjs).

Browser tests use the actual built frontend with intercepted synthetic provider/API responses. Backend tests execute the real handlers, services and PostgreSQL transactions with generated signed identities. Model/source contract tests exercise the supported clients against mock HTTP responses. None of those tests establish actual email delivery, OAuth/cookies on Vercel, paid account authorization, production database health or remaining credits.

## Disposition of all 37 failed audit expectations

“Local fix” below means implementation and local evidence; every deployed result still requires the release walkthrough. Some original expectations were corrected to match an explicit supported contract, as identified below.

Backend evidence abbreviations:

- **W**: [test_workflows.py](../backend/tests/test_workflows.py), covering API behavior, signed claims, validation, concurrency, matching, tasks and readiness.
- **R**: [test_reliability.py](../backend/tests/test_reliability.py), covering database constraints, admission, stale work, real client contracts, retention and migrations.
- **B**: [workflows.spec.ts](../frontend/tests/workflows.spec.ts), covering the built frontend's auth, resume, refresh, editor and mobile interactions.

| # | Original failed expectation | Disposition and evidence |
| --- | --- | --- |
| 1 | Wrong JWT issuer accepted | Local fix. Signed tokens require the configured issuer. W `test_invalid_token_claims`. Production must bind the issuer from actual Neon claims. |
| 2 | Wrong JWT audience accepted | Local fix with a conditional contract. A configured audience is enforced; an absent provider audience is not invented. W `test_invalid_token_claims`. The actual production audience remains unverified. |
| 3 | Signed token without expiry accepted | Local fix. Expiry is required. W `test_invalid_token_claims`. |
| 4 | Negative salary accepted | Local fix. API validates nonnegative values. Salary filtering is explicitly unavailable in the product copy/docs. W `test_invalid_profile_input`. |
| 5 | Blank skill accepted | Local fix. Whitespace is trimmed and empty names rejected. W `test_invalid_profile_input`. |
| 6 | Case-variant skills duplicated | Local fix. Normalized identity is unique and upserted under profile locking. W profile workflow; R `test_concurrent_skill_upserts_share_normalized_identity`. |
| 7 | Inverted experience dates accepted | Local fix. Comparable normalized dates must be ordered. W input validation and R experience editing. |
| 8 | Blank title/company accepted | Local fix. Trimmed nonempty bounded fields are required. W input validation; frontend displays API validation errors. |
| 9 | Empty PDF acknowledged | Local fix. Invalid content is rejected before task acceptance. W `test_upload_validation`. |
| 10 | Corrupt PDF acknowledged | Local fix. Bounded PDF parsing validates the container. W upload validation and R bounded parsing cases. |
| 11 | Missing AI configuration hidden from caller | Local fix. Upload returns an unavailable response instead of false success; readiness reports capability configuration. W `test_missing_model_is_not_false_success`. |
| 12 | Refresh status readable anonymously | Local fix. Every task lookup requires authentication, owner and correct task kind. W authentication/refresh ownership cases. |
| 13 | Nonmatching refresh leaves stale recommendations | Local fix. Recommendation membership is recomputed; tracked decisions remain labelled history. Edits also invalidate current recommendations. W `test_matching_freshness_preserves_status_history_and_counts`. |
| 14 | Scraper 429 becomes successful final task | Local fix. Partial/error metadata survives matching against retained listings. W `test_refresh_dedup_throttle_partial_failure_and_ownership` and `test_scraper_failure_remains_partial`. |
| 15 | Hacker News request has no timeout | Local fix. Bounded connect/read and outer execution budgets; upstream failures propagate. R `test_hackernews_uses_bounded_fetch_and_rejects_upstream_failure`. |
| 16 | WWR invocation incompatible with Firecrawl SDK | Corrected contract. Removed the incompatible SDK path and use documented Firecrawl v2 REST HTML responses with bounded timeouts. R `test_firecrawl_rest_contract_and_failures`. Live account/credits still need verification. |
| 17 | Resume provider 429 invisible | Local fix. Owned persistent failure status and provider cooldown; existing profile data is preserved. W `test_resume_quota_failure_preserves_data`; R real-client 429 contract. |
| 18 | Profile/user relationship lacks database FK | Local fix. Migration preflight and an enforced foreign key. W database constraints; R existing-schema migration. |
| 19 | Duplicate match identity allowed | Local fix. Unique `(user_id, job_id)` and transactional writes. W/R database constraint tests; migration refuses conflicting existing duplicates. |
| 20 | Out-of-range match score allowed by DB | Local fix. Database check enforces `[0,1]`. R `test_match_constraints_are_enforced_by_postgresql`. |
| 21 | Health does not detect DB failure | Corrected contract. `/health` remains process liveness; new `/ready` fails on database/schema unavailability. W `test_constraints_and_readiness`. |
| 22 | Unrelated CORS origins allowed | Local fix. Explicit origins and exposed `Retry-After`. W readiness/CORS tests. Actual deployed origin bindings still need inspection. |
| 23 | Concurrent first-use creation races | Local fix. Per-identity PostgreSQL advisory locking creates/reuses one transactional user/profile. W `test_concurrent_first_use_is_idempotent`. |
| 24 | Refresh has no application throttle | Local fix. Database-coordinated per-user cooldown, active capacity and `Retry-After`. W refresh workflow; R admission capacity. |
| 25 | Same-user pending refresh not deduplicated | Local fix. Atomic admission reuses one active task. W refresh workflow. |
| 26 | Status disappears after process-store reset | Local fix. Status is stored in PostgreSQL; new sessions can retrieve it and expired work becomes interrupted. W `test_task_status_persists_and_expired_work_is_interrupted`. Execution is not automatically resumed after a crash. |
| 27 | Pending login button re-enables early | Local fix. Stable loading state through rerenders and late responses. B delayed-provider login. |
| 28 | Dialog keyboard close/focus restoration fails | Local fix. Headless UI dialog handles Escape, focus restoration and scroll locking. B mobile dialog workflow. |
| 29 | File picker offers unsupported DOC | Local fix. Picker and runtime handler accept only PDF/DOCX. Code review of ProfilePage plus B upload workflows; server format validation is covered by W. |
| 30 | Resume UI declares success on a timer | Local fix. Polls actual owned task status; loads the committed profile before success. B pending/completed and provider-failure workflows. |
| 31 | Protected API 401 leaves stale signed-in UI | Local fix. One forced session attempt, then clear cache/context and redirect with return path. B stale-cache and successful-login-return workflows. |
| 32 | Refresh ignores `Retry-After` | Local fix. Cooldown disables refresh and displays retry status. B partial-refresh/cooldown workflow. |
| 33 | Mobile dashboard overflows | Local fix. Responsive grids, wrapping and shrinkable cards. B mobile hero/cards and 320px reduced-motion case. |
| 34 | Settled 390px hero text exceeds viewport | Local fix. Responsive typography and bounds. B mobile hero/cards. |
| 35 | Mobile dialog description squeezed out | Local fix. Sidebar/content stack on small screens. B dialog measures usable description width. |
| 36 | Tab escapes open dialog | Local fix. Dialog focus containment. B dialog keyboard workflow. |
| 37 | Method link changes hash without scrolling | Local fix. Correct Lenis/native anchor handling. B method-link workflow. |

## Disposition of the 27 additional findings

| # | Finding | Outcome / remaining evidence |
| --- | --- | --- |
| 1 | Wrong password-reset provider route | Uses the SDK's supported request/reset operations. Browser request/body and expired-token handling pass. Real email → callback → changed-password login remains a staging gate. |
| 2 | Database URL and personal profile/resume logging | Removed secret-bearing and content logging from the active source. Historical production exposure was not established; review existing logs and rotate a credential if exposure is confirmed. |
| 3 | No production deployment/key/quota/DB visibility | Public Vercel/Render/Neon checks and authenticated GitHub reads now work. Backend hosting and baseline deployment are identified. Host-management credentials, real account access, actual quotas and database state remain unverified. The new preview hostname is blocked by this environment's proxy; access requirements/domains are saved in the cloud configuration draft. |
| 4 | Status persistence confused with durable execution | Explicit interruption/deadline contract. Work executes in FastAPI background tasks; no queue, automatic replay or retained upload bytes is claimed. If automatic crash recovery becomes a product requirement, a worker queue and secure temporary file store are separate work. |
| 5 | No cleanup or polling deadline | Terminal retention, task deadline, expired-work interruption and bounded cancellable browser polling implemented. W/R task and cleanup cases. |
| 6 | Unsafe size/content and DOCX expansion | Bounded reads, PDF page/content checks and DOCX entry/decompressed-size/expansion limits implemented; invalid inputs fail before paid processing. W/R upload cases. |
| 7 | Filename implies nonexistent stored resume | Processing does not retain a file or manufacture a download path. UI reports extraction status; docs state re-upload is necessary after interruption. |
| 8 | Resume overwrites intervening edits | Profile row/version guards and active task/deadline checks; atomic profile updates and terminal status. R `test_resume_cannot_overwrite_intervening_manual_edit`. |
| 9 | Match status lacks DB check | Allowed status check added through migration; invalid direct DB writes fail. W/R constraints. |
| 10 | Missing preference controls / experience editing | Desired locations and owned add/edit/delete experience flows implemented. Salary filtering is not offered. W/R ownership tests and B editor workflow. |
| 11 | Missing salary data / soft location matching | Explicit capability limits in UI/docs. No fabricated salary data or strict-location promise. Homepage also replaces unverified usage/accuracy figures and culture subscores with supported features and labelled examples. |
| 12 | Unused remember-me checkbox | Removed rather than implying a persistence choice that was not implemented. |
| 13 | Pickle/cwd/small-corpus/stale vocabulary | Process-local immutable corpus fitting handles small corpora and refits after changes; no pickle deserialization or required artifact path. Latest 500-job default is documented. R vectorizer tests. |
| 14 | Blocking async requests/sleeps/DB work | Blocking paths run in worker threads; async HTTP clients and bounded budgets replace unbounded source/provider requests. Local contracts pass; hosted load/cold-start latency remains unmeasured. Cancellation cannot forcibly stop an already executing blocking provider/thread call. |
| 15 | Duplicated / uncertain scheduling | PostgreSQL interval claims coordinate workers; concurrent ownership test passes. Host uptime and successful deployed scheduled cycles still need staging/hosting evidence. |
| 16 | DB connection, SSL, backup limits unknown | Pool/overflow/timeouts are explicit per process. Actual connection ceiling, TLS binding, backup and restore remain release gates. No production database was inspected or migrated. |
| 17 | Vercel SPA fallback mistaken for API proxy | Explicit production API/auth build variables required. Existing SPA rewrite handles pages; use the actual HTTPS API host or an explicitly configured API rewrite. Real Vercel route reloads/destination remain unverified. |
| 18 | Stale Supabase / wrong variable docs | Replaced README/environment examples with the active Neon/Gemini configuration and public-versus-secret distinction. Frontend template README also replaced. |
| 19 | `create_all` at import / no migrations | Removed import-time schema mutations. Versioned Alembic migration supports clean and legacy schemas, refuses inconsistent data without deleting rows, and tests transactional refusal/idempotence. Production preflight and backup are required. |
| 20 | Unused source/provider stubs | Removed obsolete security/scraper code and unused legacy clients/settings. Docs identify Hacker News and optional WWR as supported sources. |
| 21 | npm/Python advisory findings | Compatible upgrades/removals, maintained clients, pinned SDK and documented transitive overrides; fresh scans show zero known advisories. Hosted provider code remains outside this scan. |
| 22 | Deprecated Gemini / Lenis clients | Supported `google-genai` and `lenis` clients; structured request/429/malformed-output contracts and anchor behavior tested. |
| 23 | Lint errors/warnings | Frontend lint now passes with zero warnings; backend correctness lint added. |
| 24 | Development resolver conflict | Compatible requirements and reproducible hash locks; independent fresh installation succeeds. |
| 25 | Large bundles / absent live performance data | The active WebGL orb is replaced by a 2.7 KB Canvas2D chunk, with pausing/backing-store caps and no WebGL dependency. Mobile/reduced-motion tests prove it is not loaded. Core/Home chunks remain sizeable; real-device performance measurement and further bundle work remain open. Bundle reduction alone is not a live Web Vitals result. |
| 26 | Placeholder test command / external-only suite | Permanent suites, root runner and GitHub Actions workflow added. 67 local backend cases and 17 local browser workflows and the published release's initial remote regression/advisory/Docker jobs pass. Preview access/browser diagnostics report their real outcome separately from mock-backed account workflows. |
| 27 | Incomplete real auth/email/Google/model/DB journey | Still a staging acceptance gate. [RELEASE.md](RELEASE.md) gives the exact journey, required configuration and deployment/rollback order. |

## Current endpoint contract

The original 16 application operations remain represented by the regression suite. Three operations were added: readiness, resume task status and owned experience editing. All `/api/*` operations below require a verified identity; status lookups additionally enforce owner and task kind.

| Operations | Expected behavior |
| --- | --- |
| `GET /`, `GET /health` | Public process responses; no paid-provider probe. |
| `GET /ready` | Database/schema readiness; 503 on unavailable dependency/schema, with configured capability reporting. |
| `GET /api/auth/me` | Verified claims, transactional identity/profile creation; outage is distinct from invalid authentication. |
| `GET /api/profile`, `PUT /api/profile/preferences` | Own profile; bounded validated partial edits and recommendation invalidation when matching inputs change. |
| `POST /api/profile/resume`, `GET /api/profile/resume/status/{task_id}` | Validated PDF/DOCX → 202/task ID; persistent completion/failure/interruption, owned polling. |
| `POST /api/profile/skills`, `DELETE /api/profile/skills/all`, `DELETE /api/profile/skills/{skill_id}` | Normalized upsert and owned deletion; invalid input/foreign identity rejected. |
| `POST /api/profile/experiences`, `PUT /api/profile/experiences/{experience_id}`, `DELETE /api/profile/experiences/{experience_id}` | Validated dates/text, owned CRUD and stale-recommendation invalidation. |
| `GET /api/jobs/matched`, `GET /api/jobs/counts` | Current recommendations plus intentional tracked history; consistent owner-scoped counts. |
| `PUT /api/jobs/{job_id}/status` | Owned matched job and allowed status only; tracked decisions survive recomputation. |
| `POST /api/jobs/refresh`, `GET /api/jobs/refresh/status/{task_id}` | 202/task ID with atomic dedup/admission; authenticated owner-scoped status and retained partial failure. |

## Defaults, practical limits and remaining release work

- Uploads: PDF/DOCX, 5 MiB browser/default backend limit. No DOC, pasted-text input or retained-file download. Provider requests use bounded transport/retry settings; task expiry defaults to 120 seconds and browser polling is bounded.
- Admission: four active tasks, 60-second per-user refresh interval, 30-second per-user resume interval, ten seconds between global resume starts and a 15-minute shared source scrape interval. These are configurable application limits, **not measurements of provider RPM/TPM/RPD or credits**. Quota failures extend provider cooldowns.
- Data: seven-day terminal task retention, 30-day untracked listing retention, preservation of tracked applications, latest 500 listings for matching. Constraints deliberately reject invalid writes; existing conflicting production rows require reviewed reconciliation before migration.
- Authentication: require signature, subject, expiry and actual configured issuer; audience only when the real provider supplies a contract. The Neon browser SDK is pinned to a beta release and needs real staging cookie/OAuth/reset acceptance.
- Operations: schedulers require a running host; database pools multiply across processes. Background work can be interrupted, and status persistence does not guarantee execution recovery. The Canvas2D decoration is small; the core/Home bundles still warrant real-device measurement.

To establish that the resume URL is ready, obtain usable deployment access, verify actual deployed revisions and variables, rehearse the migration/restore in an isolated database, complete the real staging visitor journey and inspect provider quota/credit settings. Then deploy schema/backend before the frontend and run the deployed smoke checks. Those steps require actual environment bindings and release authorization; they were not silently substituted with mocks or performed on production during this remediation.
