# Community operating and early-member runbook

This is the operational checklist for the existing public E34 Lore deployment, Sites audience revision 2. Preserve that audience during routine source publication. Member accounts, private garages and journals retain their separate access rules. Explicitly shared car photos use the existing upload-processing and moderation pipeline. Marketplace transactions, private messaging and live chat remain unavailable.

## Launch acceptance checks

1. The Site URL, eight exact `/account` redirects and 12-character server minimum are configured. Complete the production SMTP provider, confirmation and recovery delivery, and remaining password/recovery checks in the owner's authenticated Supabase dashboard. Assess compromised-password protection against the actual plan without purchasing an upgrade automatically. Keep email confirmation enabled. Run signup, confirmation, password recovery, expiry and replay checks using controlled real mailboxes. Client-side minimum length is not a server password policy.
2. Assign initial staff roles through the private role table only after identifying the actual staff accounts. Have each staff member enroll an authenticator and verify an MFA session. Test moderator access at `aal1` is rejected and `aal2` succeeds, including direct API attempts. Document recovery and emergency access without posting recovery material in the forum.
3. Obtain legal review of the seven policy drafts. Add the real operator identity and contact route, applicable jurisdiction, contribution license, privacy/retention terms and takedown process. Do not invent legal contacts, imply draft terms were accepted or make the review status disappear.
4. Complete the backup/restore drill below. Establish who monitors errors/reports, who can act on an urgent privacy or technical-safety report and when they are available. Do not promise an unstaffed response SLA.
5. Check keyboard navigation, focus, screen-reader names, contrast, mobile layouts and plain-text treatment. Exercise empty lists, inaccessible comments, stale edits, missing source references and failed requests. Run load/concurrency testing appropriate to the planned membership before claiming a capacity.
6. Enable the public audience only after the owner explicitly requests that launch. A deployment of a new private version does not authorize audience expansion.

Supabase documents [password security and compromised-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The latest security advisor returned no findings, but direct dashboard inspection confirmed leaked-password protection is off and requires Pro or above. No subscription or plan change has been made. The server minimum password length was saved as 12 characters and independently verified with a rejected 11-character signup request. Email confirmation and secure email changes remain enabled; production SMTP delivery and actual staff enrollment/recovery still require completion.

## Daily moderation

Review `/admin` for reports and reference correction proposals; use `/community/admin` for restrictions, appeals and audit history. Verify MFA when requested. Reports and technical review have different permissions.

For technical disagreements, ask for configuration and sources. Encourage a public explanatory correction when suitable. Hide or lock content when needed to prevent harm, preserve a recorded reason, and use the review desk for changes to canonical references. An author-accepted answer or Helpful ranking is not a reference publication.

For spam or abuse, inspect the reported content and account context. Prefer a scoped action, record the reason and expiry, and avoid internal speculation in the member-visible reason. Staff notes are private but should contain only information needed for moderation. To reverse a restriction, use its restriction UUID, not the member UUID. To resolve an appeal, provide a written disposition; revoking a restriction is a separate explicit action.

Bad-advice explanations remain discussion replies after a voter changes their rating. If an explanation is hidden, its negative rating is excluded from counts. Edited advice starts a new content version and requires fresh feedback. Explain these rules if members ask why counts changed.

## Backup and recovery

Source and editorial content are versioned in the existing Sites Git repository and deployment archive. That protects application code; it does **not** back up community database data or Auth accounts.

Use an operator-controlled PostgreSQL backup connection and the provider's documented backup tooling to make an encrypted full database backup, including the established `public`, `auth`, storage metadata and `e34_private` relationships, functions, grants and migration history. Keep connection secrets in the operator's credential store; do not put them in this repository or browser client. A public-table JSON export alone cannot restore identity mapping, private reports, feedback or RLS.

Proposed objectives for owner review: database RPO 24 hours; restore RTO 8 hours; daily encrypted backups retained 30 days with a separate recent off-host copy. These objectives have **not** been demonstrated by a full restore drill. Confirm the actual Supabase plan's backup capabilities and costs before selecting an automated service; no paid backup feature has been ordered.

For the drill, restore to an isolated, non-public target with outbound email disabled. Never restore over production to test the process. Verify:

- Auth UUID mappings, staff roles, MFA requirements and owner-only garage/report/export boundaries;
- discussion/category/tag/starter/part/guide relationships, replies, accepted answers and immutable history;
- exact feedback versions, explanation relationships, private voter identities and top-five ordering;
- active/expired/revoked restrictions, pending appeals, staff notes and audit access;
- notification and canonical catalog links; configuration of Site URLs on the restored target;
- comparison of row counts, representative content hashes and fixture tests before enabling any audience.

Record backup hash, creation time, restore target, elapsed recovery, checks and cleanup in a private operations receipt. Remove or protect the isolated restore so it does not become an unintended second community. The transaction tests in `tests/community-transaction.sql` verify constraints and cascades, not a physical backup restore.

## Retention

The draft policy proposes 30-day retention for feedback rate events and 180 days after resolution for moderation records, subject to legal holds and backup expiration. There is no unattended purge job configured. Before enabling deletion, have the owner approve the reviewed policy, implement a bounded dry run and transaction test, define legal-hold handling and reconcile backup expiry. Do not claim deletion has occurred merely because a policy draft names an interval.

Account deletion removes owned contributions, feedback, preferences and appeals through existing Auth cascades. Source review links clear when their immutable source is removed. Minimal moderation audit metadata is separately controlled and must be covered by the reviewed retention process.

## Editorial and early-member process

The 48 resources are original Site editorial entries, not invented threads. Edit the source file, retain the source/date/scope, increment the resource revision when meaning changes, regenerate the registry SQL and review the diff. Imported publisher pages and screenshots are not launch content.

Invite a small real cohort only after the owner chooses an audience. Ask each person to try one actual task: identify a part, start a configuration-specific question, add a measured reply or record a project. Do not require positive votes, seed a ranking, invent testimonials or manufacture activity. Record navigation failures and unanswered questions as work items. Keep marketplace/chat disabled until their separate abuse, identity and transaction requirements are implemented.

## Verification commands

Run `npm run typecheck`, `npm test`, `npm run test:import` and the existing Sites build helper. Against a ready local Worker, run `E34_TEST_ORIGIN=http://127.0.0.1:3002 node tests/e2e.mjs`. Run community, RLS, revisions and discussion-pagination transaction files against the intended test backend and retain **ROLLBACK**. Never use those fixtures as community seed content.

## Owner access and recovery checklist

Verified 7 November 2026: the owner enrolled TOTP and the actual signed-in Chrome account opened the dashboard, guest review, member controls and community moderation. The hosted aggregate confirms one staff identity with a verified factor. Three rollback permission suites passed, including member denial and staff AAL1 denial/AAL2 access. Lost-factor recovery, a second physical authenticator and an independent browser AAL1 session have not been exercised on the real owner account. Do not remove the working factor to simulate a failure.

- Sign in to [E34 Lore Account](https://e34lore.com/account) on a trusted device. Add a TOTP authenticator, verify the current session and confirm that [the owner dashboard](https://e34lore.com/manage) opens. In a separate browser session, confirm that the same staff role at AAL1 cannot open privileged controls.
- Keep a separately protected authenticator available before removing a working factor. The E34 owner retains control of their verified identity and authentication material. Never send setup QR codes, backup exports or six-digit values to staff or support.
- For a lost authenticator, use a working trusted session or independent factor first. If neither is available, verify the operator and account through the established owner-controlled Supabase channel. Record the recovery decision privately. Use Supabase's supported factor recovery controls, revoke stale sessions, enroll a replacement and test AAL1 denial and AAL2 access. An account-password reset does not grant moderation rights or satisfy the authenticator gate.
- For real mailbox testing, use a controlled separate mailbox or owner-approved alias. Complete sign-up and the email confirmation link on the canonical domain. Request password recovery for that fixture, set a new password and verify that the old password and replayed recovery link fail. Use the normal account-deletion flow after the test. Record only delivery times, domain, observed results and cleanup. Keep addresses, links and tokens private.

## Isolated restoration checks

`E34_POSTGRES_BIN=/opt/homebrew/opt/postgresql@17/bin bash scripts/rehearse-local-recovery.sh` creates two disposable PostgreSQL clusters on private Unix sockets. It loads the repository's foundational permission SQL and synthetic records. It then makes a logical dump, restores it into the second cluster, verifies owner and non-owner access, audit records, public reading and deletion cascades, and removes both temporary clusters. No external database connection is used.

The production drill needs an authorized database dump connection and a separate access-controlled recovery target. Use the provider's documented roles, schema and data procedure. Disable outbound email, webhooks and background jobs before restoring private records. Prepare a separate authenticated export of Storage objects with path, size and SHA-256. Restore bytes and metadata, then check object access, explicit public snapshots, rejection of direct guest writes, moderator and reviewer separation, revocation, deletion and retry behavior. Keep encrypted copies under owner control. Record dump and restore timestamps, totals, hash comparison and cleanup. This drill measures the production objectives only after a real recoverable copy is demonstrated. [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups) · [CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
