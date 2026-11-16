# Operations runbook

Current staff/guest update (6 November 2026): member staff self-activation is removed. The verified owner was provisioned through a private migration; moderation still requires role plus MFA. Guest questions/replies have a separate bounded hidden submission and review path. See [guest access and operations](guest-access-and-operations.md).


Current access update (6 November 2026): the owner explicitly opened E34 Lore to public browsing; historical ChatGPT/owner-private hosting statements below are superseded. Member data still uses independent Supabase authentication, RLS and MFA. See [member identity and sharing](member-identity-and-sharing.md) for the new username, OAuth, owner-binding and share-link contracts and unfinished provider setup.

The application is a public Sites deployment with a separate Supabase project. Full technical and operational acceptance remains tracked in the [post-inventory audit](post-inventory-audit.md). Reuse the existing Site and database project.

## Local work

Checkout: `/local/owner/Developer/e34-collective`. The original workspace's `e34-hub/app` links here. Keeping the new checkout outside the physics lab avoids unresolved iCloud ancestor dependencies. The physics app remains separate.

Run `npm ci`, then `npm run dev`. Verify `npm run typecheck`, `npm test`, `npm run test:import`, `npm run build`, and `npm run test:e2e` with the development server running. Unit/import tests require no production credential. The HTTP integration test uses the published browser key and reads the dedicated E34 reference dataset; its anonymous write checks must be denied. Full local Supabase/Docker packaging is not completed.

`tests/rls-transaction.sql` runs through the authenticated database tool against the dedicated project. It creates disposable identities inside a transaction and always rolls back. It asserts owner access, cross-user isolation, relationship integrity, acceptance, notification and verification boundaries. Never remove its final rollback.

## Source and schema

Apply tracked SQL snapshots through Supabase's migration tool in this order: `schema.sql`, `community-garage.sql`, `explicit-api-grants.sql`, `review-and-indexes.sql`, `thread-configuration-search.sql`, `notifications.sql`, `owner-export-access.sql`. Existing installations already have these applied; inspect migration history before any continuation. Do not rerun CREATE statements blindly.

Run `node --experimental-strip-types scripts/generate-seed.mjs` after a reviewed catalog/source change, then execute the resulting `database/seed.sql` through the database tool. Stable source IDs make the seed idempotent. This does not certify imported technical data. Preserve existing community records.

The manual importer is `python3 tools/import_manual.py --pdf <path> --private-dir <explicit-private-folder> --publisher <publisher>`. It hashes input, extracts OCR, indexes running headers, flags overlaps and writes a private batch manifest/audit. It never publishes scans or automatically verifies technical claims. The current source batch is `23032c541d08d764`; raw OCR remains outside the source checkout.

## Authentication setup requiring dashboard access

Authentication URL Configuration was saved and verified in the signed-in dashboard on 5 November 2026. Site URL is `https://e34lore.com`. The eight exact redirects are the apex and www `/account`, the retained `e34-collective.sreid1118.chatgpt.site/account` alias, 127.0.0.1 ports 3000/3002/3004 and localhost ports 3000/3002 `/account`. Custom SMTP is enabled and persisted, verified by an independent dashboard reload after the owner credential hand-off; controlled confirmation delivery failed with HTTP 500; the transport/credential failure is unresolved. Resend login is complete; the approved `mail.e34lore.com` sender is verified and its domain-restricted Sending key is created (2 of 3 Free domain slots used). No paid features have been selected. Supabase's built-in sender is restricted to project-team addresses and is not a public community mail service. Preserve email confirmation and complete production delivery and recovery checks. The server minimum is now 12 characters, verified through a rejected 11-character Auth request. Direct dashboard inspection showed leaked-password protection off and plan-gated to Pro; do not infer otherwise from an empty security-advisor result. Both custom Site hostnames have active DNS validation and HTTPS; no domain transfer, paid DNS feature or hosting-plan change was made.

The `delete-account` Edge Function is deployed. Its pinned SDK and source live in `supabase/functions/delete-account`. It authenticates through a fresh `getUser` lookup rather than the legacy gateway verifier. The standard Supabase server runtime supplies its service key; never copy that key into this repository or the browser config. Update its CORS allowlist if the reviewed production domain changes.

## Publishing and rollback

Use the Sites source-workflow helper to commit and push the exact source, run remaining checks/builds, and produce an archive from that commit. Save and deploy that matching archive using the existing public access mode. Poll only pending/building/publishing deployments to a terminal result. Preserve version IDs after partial success rather than saving duplicate versions.

A deployment rollback should redeploy a known saved Site version. It does not roll back database migrations. Use forward-compatible schema changes and a separately reviewed data restore plan. Backup schedule, retention, recovery objectives and a successful restoration drill are not yet established for this project; verify the plan's actual backup options rather than assuming them.

## Incident checks

Read Supabase health/security advisors and relevant logs before changing a failing backend. Check the Site deployment status and server logs for hosting failures. Avoid logging tokens, source PDF content, VINs or private garage notes. Disable affected writes through reviewed policy changes if required; do not drop RLS or use a service key in the client as a workaround.

Latest follow-on SQL snapshots: owner-export-access.sql and diagnostic-observation-bounds.sql are also applied. Inspect the migration history rather than replaying already applied files.

Follow-on applied SQL: `contribution-revisions.sql`, `discussion-pagination.sql`, `technical-drawings.sql`. The source generator now registers all curated sources/drawings and updates canonical source/number/name fields on stable IDs. Month-based end dates use the final day of the cited month; the earlier cooling cutoffs were corrected in place. Additional rollback-only integration fixtures are `tests/revisions-transaction.sql` and `tests/discussion-pagination.sql`.

No monthly catalog subscription is authorized. Build the E34 factual catalog in the project's own database; treat a source's artwork permissions independently from its factual ordering identities.

## Owned catalog operations

Applied follow-on snapshots: `owned-catalog.sql`, `catalog-drawing-labels.sql`, `catalog-identity-search.sql`, `catalog-inventory-scaling.sql`, `catalog-indexed-search.sql`. Existing installations already have these migrations; do not replay CREATE statements. `tests/catalog-transaction.sql` verifies canonical/source integrity, catalog lookup, garage/discussion linkage and write isolation inside a mandatory rollback.

Use `docs/owned-catalog.md` for source compilation, hashed fact backups, explicit SQL load plans and the pinned archive identity job. Runtime search uses the owned database. Source artwork remains independently attributed; the full archive and manual remain outside publication assets. Regenerate the inventory only after completed loads, preserve archive evidence when reseeding curated parts, then publish the exact checked source/archive through the existing Site workflow.

See community-operations.md for moderation, backup/restore, retention and early-member procedures. The current audience is public.

## E34 Lore source and owner access

The private repository is https://github.com/RRG314/e34lore (`github` remote). Preserve it and the existing native Sites source identity. Publish through the Sites helper, then push the identical verified source head to GitHub. GitHub Actions runs typecheck, unit checks, importer checks and build. The initial run passed; record later outcomes in the external release receipt. CI does not yet run isolated hosted-Postgres fixtures or automatic Site deployments.

Private hosting access uses the owner’s ChatGPT sign-in before the application's separate Supabase member account. Real Chrome and fresh in-app browser owner sign-ins reached the live home. The earlier in-app account-chooser error did not recur in the verified fresh session. Service checks must use `OAI-Sites-Authorization: Bearer <token>`; never place this secret in URLs, source or saved logs. No public audience change is authorized by routine publication.

The approved E34-only sender `mail.e34lore.com` is verified in Resend. Three DNS records were added while preserving existing Site/NS/SOA/DMARC records. A Sending-only key is restricted to that domain. The owner pasted the credential and saved. A fresh dashboard reload confirmed custom SMTP enabled, a stored hidden password and the expected host/port/sender values. Controlled confirmation requests to Resend’s documented simulation recipient delivered@resend.dev failed with HTTP 500 “Error sending confirmation email” using both supported encrypted transports. Port 587 STARTTLS was saved and independently verified after reload. No test Auth user remains. This unresolved transport/credential failure blocks verified signup email; recovery and actual-inbox checks remain open. Do not infer delivery from a successful settings save or diagnose masked form values as mismatches. Non-secret settings are smtp.resend.com, port 587, username resend, sender noreply@mail.e34lore.com, sender name E34 Lore. No credentials are stored here.

Run `node tools/audit_catalog_images.mjs` for a rate-bounded availability audit of registered source illustrations. It uses HEAD requests on known source hosts, stops further remote checks on rate limiting, and writes its detailed report only to ignored `.codex/reports/`. Availability does not establish image rights or technical accuracy.

## Journals, guide archives and Android continuation

New migrations are in supabase/migrations, generated by the verified Supabase CLI 3 migration-new command and aligned to the hosted migration-list versions. The historical database/ SQL remains the existing baseline; these five files alone are not a fresh database bootstrap. Do not run a blind CLI db push against this project without reconciling that legacy history. Guide content changes require node scripts/generate-guide-revisions.mjs, review of generated index/archive SQL, application of new immutable rows, then the matching source deployment. Never rewrite an existing guide revision.

The owner explicitly approved the free Android SDK license, the E34-only upload key/draft upload, then an internal-test rollout with their own account first. JDK 21 already existed; the verified SDK lives in ignored .codex/android-sdk. The private PKCS12 keystore is in android/.private, with its password in Mac Keychain (service com.e34lore.android.upload, account E34 Lore Android). Only the public certificate fingerprint is tracked. Signing scripts use environment-based keytool/jarsigner inputs; never log a password or copy a keystore into source/archive assets. Google Play reports Active / Available to internal testers for version 1 / 0.1.0. The dedicated E34 tester list has one owner address, and https://play.google.com/apps/internaltest/4699494991122724102 is enabled. No external invitations were sent. Actual enrollment/installation remains unverified. The actual app ID is 4975993992850603055 under the owner’s existing account. Follow android/README.md for reproduction, independent app-signing versus upload certificates, and release prerequisites.

For later testers, add only owner-provided Google-account addresses to the E34-specific list and save the track. The Play allowlist does not grant Site viewer access or create a Supabase member. Obtain the required website audience decision separately. Internal rollout does not complete the dashboard's 12-member / 14-day closed-test requirement for production access.

The PWA offline cache is restricted to public app icons and the clean /offline reconnect route. The .html URL redirects under asset hosting, so cache the clean route; tests require a direct 200 response. Never cache navigation HTML, Supabase/Auth/API responses or private garage data.

## Member photos, owner management and aggregate retention

Use `/manage` after signing into the assigned moderator account and verifying an authenticator in `/account`. Photo submissions wait in Photo review; inspect the actual image/caption and record a reason before approving. Feature only a visible shared car with an approved photo. Hiding a parent also blocks its public photos/journal updates. Reports can hide the specific photo and record a separate resolution. Existing `/community/admin` handles restrictions, appeals and audit history.

Car media is in private `e34-car-photos`; never use public bucket URLs or delete `storage.objects` with SQL. `car-media` handles normalized upload, own-photo deletion and queued Storage API cleanup. Deleting a private car cascades publication metadata and queues bytes; cleanup retries when the owner opens car photos. Account deletion removes both twin and car files before deleting Auth. Investigate any queue growth or incomplete reservations; file retries are not a scheduled global sweeper.

`e34-usage-retention` runs daily at 03:15 UTC with pg_cron; it keeps today plus the prior 89 dates and prunes only its own run details older than 30 days. Check `cron.job` and `cron.job_run_details` by this exact job name. The RPC also prunes on accepted counts. Do not delete other projects' jobs or extend the analytics payload to personal identifiers. Supabase primary references: https://supabase.com/docs/guides/cron/install and https://supabase.com/docs/guides/cron/quickstart . A paused database cannot execute jobs until resumed.

SMTP replacement: the owner saved the restricted E34-only key; controlled signup and reset messages both succeeded and Resend showed Delivered to its official simulation recipient. This verifies transport, not the owner's inbox or a completed recovery link. Preserve confirmation, canonical redirects and 12-character passwords. After real signup, assign only the verified owner identity the requested moderation role, then complete owner-controlled authenticator enrollment/recovery planning. Remove only the superseded E34 sending key after replacement delivery is confirmed; leave unrelated sender keys untouched.
