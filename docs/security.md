# Latest security review

The dated [security audit](security-audit-2026-11-07.md) supersedes historical status claims below. Its fixes are isolated on `steven/security-audit-20261107` and are not deployed. See the report for verified tests, production observations, remaining risks and deployment order.

# Security and privacy boundaries

Current integrated review and deployment state: [security release report](security-current-release.md). It supersedes the historical provider, upload, MFA and clean-advisor statements below. Owner MFA is enrolled; photo processing exists; support exists but is inactive. Current advisors retain intentional and operational warnings.

The post-inventory audit confirmed one verified-email staff account and no verified authenticator on that account at the time of the check. Role plus MFA remains required. The owner recovery checklist and production backup requirements are in [community operations](community-operations.md). The local synthetic restore passed and production rollback fixtures exercised the current permissions. Real mailbox and production recovery checks remain open.

Current staff/guest update (6 November 2026): member staff self-activation is removed. The verified owner was provisioned through a private migration; moderation still requires role plus MFA. Guest questions/replies have a separate bounded hidden submission and review path. See [guest access and operations](guest-access-and-operations.md).


Current access update (6 November 2026): the owner explicitly opened E34 Lore to public browsing; historical ChatGPT/owner-private hosting statements below are superseded. Member data still uses independent Supabase authentication, RLS and MFA. See [member identity and sharing](member-identity-and-sharing.md) for the new username, OAuth, owner-binding and share-link contracts and unfinished provider setup.

Public records: model families, source metadata, assemblies, part identities, draft guides, profile display names, and visible discussions/replies. VINs are neither requested nor decoded. Threads attach only an explicit allowlist of configuration fields.

Private records: owned vehicles, maintenance, modifications, installed parts, bookmarks, repair outcomes, reports, corrections and notifications. Each exposed table has RLS. Explicit SQL grants are a separate boundary: Supabase's broad default grants have been revoked, and future tables start without client grants.

Technical reviewer, moderator and administrator permissions are stored in `e34_private.staff_roles`, never in user-editable profile/JWT metadata. `current_permissions` is a security-invoker facade; private permission checks use fixed-search-path functions. Client accounts cannot assign themselves roles or certify outcomes. No initial staff role has been granted automatically.

Discussion ownership and creation timestamps are immutable; moving a reply to another thread is prohibited. Contribution triggers serialize per-user rate checks: ten new threads/reports/corrections per hour and forty replies per hour. Acceptance requires the thread author and a post belonging to that thread. Acceptance remains an owner report, not technical certification. Moderation cannot implicitly certify a technical claim.

All contributions render as plain text. No raw HTML or user attachments are rendered. Upload processing remains unavailable; no malware-scanning claim is made.

Account deletion is a separate authenticated Edge Function. It performs a fresh Auth-server lookup, derives the target ID from that identity, requires explicit confirmation, revokes refresh sessions globally, then deletes the identity and cascading data. The service credential exists only in the Supabase Edge runtime. Existing access JWTs may remain cryptographically valid until expiry, but deleted-user foreign keys prevent new contributions and the sensitive endpoint rechecks the Auth server. Client deletion signs out locally as well. Community conversations and their replies are removed when the owner deletes their account; the UI discloses this behavior before submission.

Private exports include garage records, outcomes, bookmarks, notifications and the user's own contributions/reports/corrections. No service credential is needed. Authentication tokens are not exported.

Audit records store actor IDs and mutation metadata, not copies of private body text. A complete operational retention policy, recovery drill and human security review remain public-release requirements. Immutable contribution history and guide archives are implemented below. The latest advisor response returned no findings, but direct dashboard inspection confirmed leaked-password protection remains off and plan-gated. Email confirmation and secure email changes are enabled, the server minimum password length is 12, and custom SMTP is saved; actual confirmation/recovery delivery remains unverified. An empty advisor result does not supersede these directly observed settings.

Contribution text history is implemented for discussions/replies. The immutable browser contract allows SELECT only; private, fixed-search-path triggers append content snapshots atomically. Hidden/deleted content cannot leak through a looser history endpoint. History is purged by parent/account cascades; operational audit stores metadata rather than historical text. Full guide objects and exact step identities are also archived immutably. The broader technical editorial approval/publication workflow and operational retention policy remain open.

Restoration journals retain private source rows and separate public snapshots. Publishing copies an explicit field list; cost, mileage, private notes and private vehicle bindings are excluded. Owner edits do not auto-publish. Snapshot withdrawal, parent visibility and deletion cascades are independently enforced. Moderator access to hidden public journal snapshots requires MFA and does not grant access to private source records. Progress and journal writes reject cross-owner vehicle links and stale optimistic versions. Guide/step snapshots are immutable read-only references.

The app service worker caches only icons and the generic reconnect page, never Auth/API responses or navigation HTML. Android contains no backend service credential, authentication bypass, signing key or password. The encrypted E34 upload keystore is ignored by Git and its password is in the owner’s Mac Keychain. A public app-signing certificate is distinct from that upload identity.

## Car media and owner dashboard

Car uploads enter through a fresh-token-validated Edge Function; service credentials stay in the function environment. The function uses the signed-in user client for reservation/ownership and a service client only for normalized upload/completion/removal. It does not accept a caller-supplied target account. Both JSON and multipart streams have byte limits before parsing. Only freshly JPEG-encoded pixels are stored; source comments, EXIF/GPS and appended data are discarded. Visible personal details are not automatically blurred.

Row and Storage authorization are separate and tested. Public snapshots require explicit owner submission, MFA staff approval and a visible published parent. The source row is never public, review reasons are private, and direct client storage writes/completion are denied. Hidden/rejected moderation survives withdrawal/resubmission. Account deletion removes physical files before cascading metadata, with fresh identity/session revocation retained. A queue retries source-deletion file cleanup; public access is revoked immediately even if physical cleanup must retry. Existing downloaded copies cannot be revoked.

The owner management RPC and every mutation independently require the established moderator permission and Auth `aal2`; possessing a route URL or enrolling a factor does not assign staff. Photo/report/feature/restriction actions require an audit reason. Technical review remains a separate role.

Optional analytics is off by default and sends only a public section enum, without IDs, paths, searches or IP fields in the analytics store. No third-party analytics script is introduced. Provider request/security logs are separate. The database retains 90 daily aggregate dates and the named daily job prunes its own run history after 30 days.
