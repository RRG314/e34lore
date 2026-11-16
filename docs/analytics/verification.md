# Analytics release verification

8 November 2026 UTC. Branch `steven/analytics-growth-platform` in the existing private `RRG314/e34lore` repository. No production visitor history was backfilled or used as a test fixture.

## Verified implementation

- TypeScript type checking passes.
- 300 application tests in 32 files pass, including 45 new analytics tests: payload/PII validation, consent isolation/withdrawal, private-route and localhost/QA exclusion, deferred-auth race handling, server-confirmed erasure, collector authorization/bounds, referrer reduction, UTC ranges, missing baselines, opportunity thresholds, Search Console property restrictions/presence queries/scrubbing and provider error redaction.
- 37 Python importer/asset/security harness tests pass.
- Full isolated PostgreSQL application bootstrap, analytics pipeline, existing RLS/MFA/session/upload/support policies and synthetic restore pass. The analytics fixture verifies real ingest→pages/sessions/events→report/funnel→erase→rollup behavior, duplicate delivery, actual same-session attribution and refusal to join different visitors into a journey. The restore checks 12 synthetic object byte hashes. This is not a production backup/restore certification.
- Production website build passes. Build confidentiality verifies 1,806 client assets exclude private configuration and the framework prerender credential.
- New analytics files pass ESLint. Broader pre-existing repository lint debt remains (see the security release); it is not suppressed by this change.
- npm audit: zero high/critical, 16 pre-existing moderate advisories. No forced dependency upgrades applied.
- Credential scan of 24.97 MB of candidate Git text/source files: no leaks. Binary media, ignored local state and generated bundles are excluded from this source scan; the compiled-client confidentiality check is separate.
- Local served checks: 70 SSR/data/source-link/isolation checks and 17 HTTP security-boundary checks pass. The first route attempt preceded preview readiness; rerunning against the ready owned preview passed. No authenticated writes or messages are used by these probes.
- Local native browser: management without a current administrator MFA session shows the permission error and returns no report. Public privacy preferences show all new choices disabled while collection is paused, retain independent legacy/commercial choices, and explain identifiers, retention, deletion and the erasure marker.

## Hosted backend receipt

Installed additive migrations: `20261108045347_analytics_growth_platform.sql` and `20261108052048_analytics_first_seen_integrity.sql`. The latter preserves the deployed collector/grants and derives first-seen time from accepted pages, with no orphan visitor identity from missing-page batches. Three additional real SQL assertions cover these edge cases; the full isolated security and restore suite passes after the patch.

Analytics Edge Function version 1 is ACTIVE, with its own origin/body/schema/auth checks. Build digest: `80117666d49964b62664734b254dc2f7997f443030462739b1c9b24154081694`.

Actual hosted verification: 646 registered public resources; hourly retention cron active; zero new visitor rows and zero event rows; collection disabled; hash key not created; all new private tables RLS enabled; anonymous/member raw-event grants false. The original four rows/five section opens remain. Public configuration returns only `{enabled:false,revision:2}`. Anonymous reports and direct ingest are denied (HTTP 401); malformed collector data returns 400; Search Console sync without owner MFA returns 403. These boundary probes do not create visitor events.

No existing Auth, Google sign-in, Resend/SMTP or support credential was changed. Email setup remains deferred. No analytics reports were sent to anybody.

## Release and activation

**Initial publication: Site version 34**, https://e34lore.com/manage/analytics. Source `eb6a0df6332935f60ed098f522ce73b68872f82b`. Deployment succeeded at 2026-11-08T05:09:46Z, retaining the public audience.

The local gzip package is 64,705,439 bytes, SHA256 `f19c3a9eee3c79e78efe005ea09859107fc161a17bdfc0b808548ea8c728c645`. Sites normalized archive receipt: 2,059 files, 107,315,200 bytes, content hash `54902c58c5650b5080f5c7dc93bd6d4b107190aeacaf77f24515434b3eb0dc85` (uncompressed archive, a different representation).

Live custom-domain checks pass: 70 SSR/data/source/isolation checks and 17 HTTP security checks. The real owner's current administrator/MFA session loads every report section. Last-7-day filtering shows the preserved four rows/five section opens; catalog row filtering returns two rows, and numeric sorting orders one before two opens. The actual weekly download exists and validates the five historical opens, unavailable visitor history and real aggregate community data. No test event is posted to the visitor collector. Search Console's owner sync returns the actual missing dedicated-authorization state, not a false connection. The owner approval checkbox stays unchecked and the enable button stays disabled.

Responsive browser verification at 390×844 shows no page overflow (375-pixel document width; viewport reset to its original 1280 width afterward). Screenshots and the downloaded report are retained locally under `outputs/analytics-release/`; they are not published as public site assets. Browser download event interception timed out although the actual file completed; the file content was independently verified rather than clicking Download again.

GitHub PR #9 is merged as `bbd8bf08933b42f82c4eff0f7dc13081fa16ef69`. Both website/SQL and Android jobs pass on the matching feature head (run) and merged main (run). The small post-release database integrity patch has a separate source receipt below.

 Expanded collection must remain paused unless the owner explicitly approves privacy revision 2; visitors still need fresh opt-in afterward. This release does not grant Search Console access or certify the unavailable scanner, scheduled email, geographic or database-query metrics.


### Final integrity and source receipt

PR #10, source `1f53085e2074ad7d070e3d901557cba78671e020`, is merged as `6811406cfbd98f9e9aa9aaa3b4031ca76b49633f`. Both website/SQL and Android pass on the patch and merged main. The installed SQL patch is identical to the tracked migration; website version 34's JS/CSS is unchanged and remains tied to its original source receipt above.

Post-patch hosted state: collection disabled, approval revision null, zero visitors/events, five original section opens. No new key or Google/SMTP setting was created. The owner's explicit privacy-approval question remains pending. The live Collection & privacy page is left ready; expanded tracking is not activated on an assumed answer.

Final security-advisor review reports no ERROR-level findings. Its general executable-definer/anonymous-access/extension/password-protection warnings remain review items; the new intentionally service-only RLS tables have no direct policies/grants, and the public configuration RPC returns only enabled/revision. This is not a claim that all pre-existing security advisories are resolved. Full repository lint debt and the 16 moderate dependency advisories remain as documented in the security baseline.

The owned localhost preview was stopped after live verification. The disposable PostgreSQL fixtures stop/remove their clusters automatically. Temporary source-scan copies were removed; source, package, test logs, screenshots and the verified local report remain available. No unrelated project process, account or asset was changed.

### Legacy public catalog coverage

The old `/parts` URL maps to the existing canonical catalog analytics resource, discarding its query parameters. Actual public catalog IDs were checked: all assembly IDs fit the existing alphabet; four manual reference IDs end in uppercase A–D. Those exact IDs now retain their case through link/selection telemetry and remain subject to the same server-side public-catalog validation. Two added regression tests cover the alias, private-configuration exclusion and case-sensitive reference selection. Typecheck, all 300 application tests, the registry guard and the website build pass. No privacy-policy or backend-grant changes are introduced.

The legacy service-figure reader also emits assembly/part selections through the same validated collector. Downloaded summaries derive external-connection status and Search Console dated totals from actual report data, so later authorization cannot leave a hard-coded disconnected message or add query/page rows to date totals. An added regression test covers that reporting boundary.

### Ledger sort precision

All report tables share a comparator that keeps integer-valued strings exact through `BigInt`, while preserving numeric-counter and ISO-date ordering. This prevents lexicographic cent sorting and rounding of adjacent values above JavaScript's safe-integer limit. Two additional tests pass; the final suite has 300 application tests. Ledger storage, currency separation and approval controls are unchanged.


### Session, permission and financial precision patch

Installed additive migration `20261108063624_analytics_session_recovery.sql` preserves existing grants and history. Public document identities survive guest sign-in and preference changes. Expired shared sessions return an explicit result; pending interactions resume once with stable event IDs and a new page, without the old acquisition fields. Passive late errors do not create visits. Category checks use current batch permission without mutating the original consent snapshot; report coverage also recognizes actual permitted category events. The five-minute foreground cap persists across preference changes, and browser identifiers expire even in a long-open page. Late responses cannot disable a newer permitted recording context. Five new client regressions and the SQL pipeline exercise these cases. Financial integer-cent columns sort exactly beyond the JavaScript safe-integer limit.

Validation: 300 application tests (45 analytics additions), 37 Python tests, TypeScript, targeted analytics lint, generated resource registry, full disposable PostgreSQL/security/restore suite, production build and 1,806-asset confidentiality check pass. Collection remains disabled; no production visitor/event fixtures were created. Final publication and CI receipts follow below.


### Current live release — version 36

Published https://e34lore.com/manage/analytics, preserving the public Site audience. Application source `f75724efa772f25dc112916f8ef92506b8029214`. Deployment succeeded at 2026-11-08T06:40:49Z. This includes version 35's legacy aliases, service-figure selections and provider-aware downloaded summaries, plus the session/consent and exact-cent sorting corrections.

Local gzip: `outputs/analytics-release/e34-lore-analytics-session-final.tar.gz`, 64,707,907 bytes, SHA256 `d5495b1c0b5f55b95fd9f1e75cba66028ba4b4e23544fa1ce72ae4684b917752`. Sites archive: 2,059 files, 107,325,440 bytes, SHA256 `c427532aa06ae4c1623b06c5d6f3359e592280706a0c4cf07a9448f50a88cbf6` (normalized tar representation).

Both website/SQL and Android CI pass on the exact application source (run 42455491059). PR #12 is merged as `65f33f90a06942c6b7c7752c4e6bf913677f85a1`; its automatic main rerun is 42455743609. All **70 live custom-domain SSR/data/source-link/isolation checks** and **17 HTTP security boundaries** pass after version 36 publication. No authenticated writes or messages were used by these live probes.

Post-release hosted query confirms collection disabled, approval revision null, **zero new visitors/events**, the original **four rows/five opens**, and active hourly retention. The owner privacy-approval question remains pending. No analytics hash key, Google/SMTP credential or unrelated project setting was created/changed. No email was sent. Search Console access, scheduled email, scanner, geographic and database-query measurements remain explicitly unavailable as described in the architecture/audit, rather than populated with examples.
