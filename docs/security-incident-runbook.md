# E34 Lore security incident and recovery runbook

Scope: member compromise, staff/provider compromise, malicious uploads, availability, email and database exposure. Read alongside the dated security audit. This is an operating procedure, not evidence that a production recovery or alert delivery succeeded.

## First response

1. Record UTC time, affected feature, deployment/migration version and symptom. Keep evidence private. Do not paste tokens, cookies, SMTP/OAuth/private keys, message bodies or raw private photographs into chat, issue trackers or shared logs.
2. From a trusted device inspect Supabase Auth/API/Postgres/function logs, hosting runtime logs, private audit metadata and Resend events as appropriate. Record aggregate status/operation counts and event IDs; restrict any raw export and give it a deletion date. Do not interpret an empty/unsupported log query as no attack.
3. Contain the narrow affected capability: suspend a member through existing moderation, withdraw a public snapshot, disable an affiliate/ad record, or use a reviewed forward migration/feature rollback. Do not disable RLS, publicize a private bucket, grant a service key to the frontend, drop tables or restore over production as a troubleshooting shortcut.
4. Escalate suspected provider/owner-account compromise immediately. Application moderator access does not secure the hosting, GitHub, email or Supabase owner accounts.

## Compromised member or staff session

- In a verified trusted account use Account → Authenticator security → Sign out other devices. Use provider administrative session revocation when the target account is inaccessible. Reset affected passwords and secure the associated email/OAuth account.
- The pending security migration checks staff access against a current same-user AAL2 session and a verified factor. Deleting/revoking that session removes staff authorization on the next DB request. Ordinary member access JWTs can remain usable until expiry; provider revocation prevents refresh. Do not claim immediate revocation of all ordinary JWT reads.
- If staff access itself is compromised, remove the affected private staff assignment through a reviewed owner-only provider operation and revoke sessions. Preserve audit evidence first. Do not implement a public recovery/role-assignment endpoint.
- MFA recovery: verify identity through existing trusted provider-owner access and established records, never just a matching email message, username, screenshot or public profile. Add and verify a replacement factor on a trusted device. If all owner factors are lost, follow the provider's account recovery process. A member password reset must not silently remove staff MFA.
- Before restoring access, test a non-staff account, AAL1 staff account, revoked AAL2 session and a fresh verified staff session. Confirm moderator-only accounts cannot open the admin security/commercial workspace.

## Credential exposure

- Identify the exact credential and authority (Resend sending key, Supabase secret/service credential, Google/Apple/Meta OAuth secret, deployment token, upload signing key). Revoke or rotate only that credential through its provider, with explicit authorization for production secrets. Secure provider access and investigate how the exposure occurred.
- Enter the replacement directly in the provider/secret store; never commit it to source, browser config or documentation. Redeploy affected server functions only after configuration is saved. Check old credential rejection and one narrowly scoped successful operation.
- A Supabase publishable/anon key and public DKIM certificate are public identifiers. Rotating those does not repair a leaked service credential or broken RLS. If signing/JWT authority is compromised, follow the provider's full signing-key/session incident procedure rather than changing one frontend value.
- Preserve redacted evidence of Git history exposure and coordinate cleanup; do not rewrite shared history in this side worktree. Review server and built-browser artifacts before release.

## Upload and content incident

- Withdraw/hide the public photo/journal or disable the affected write path; approval/publication controls must remain enforced. The next unauthorized Storage fetch must be denied after withdrawal. Already downloaded copies cannot be recalled.
- Inspect private cleanup queue counts; retry cleanup with the legitimate processor. Do not manually delete `storage.objects` rows as a substitute for deleting bucket bytes through Storage API. Confirm owner retention/deletion intent.
- Uploaded models remain untrusted private evidence. Do not auto-publish or import unknown files in an unrestricted desktop Blender/CAD process. Use an isolated tool environment and no secrets/network access. No deployed antivirus/recognition pipeline is claimed.
- For repeated abuse inspect per-account and aggregate API/upload volume. The new limits are 24 JPEG reservations/hour, 12 photos/car, 100/account; 5 model objects/hour, 10 retained objects/account, 10 source jobs/hour and 30 evidence rows/hour. Confirm current deployed values before enforcing operational decisions. Multi-account abuse requires provider controls beyond these limits.

## Availability, analytics and email

- Check hosting deployment status/5xx latency and Supabase connection/API health before restarting or changing data. Roll back to a known application version when appropriate; a source rollback does not undo database migrations.
- For analytics floods, disable the optional collection path or apply provider endpoint limits after preserving evidence. Aggregate counts are not billing-grade; do not block repair/manual access because telemetry is unavailable. Avoid introducing permanent per-visitor tracking as a shortcut.
- Check Resend sender/delivery errors and Supabase Auth mail events. Test only a controlled owner mailbox. Inspect delivered message SPF/DKIM/DMARC alignment without publishing headers that contain recipients/tokens. Preserve unrelated domain/project DNS records.
- Future support inbox: verify webhook signatures on the original bounded request body before parsing; durable unique provider event ID prevents retry duplication. Reply recipients must come from the private verified conversation, never arbitrary submitted To/Cc/Bcc. Keep attachments inert/private and do not turn the endpoint into a mail relay. These capabilities are not present at the audited baseline.

## Recovery preparation and drill

1. Define acceptable data loss and downtime with the owner; choose backup schedule/retention accordingly. Verify the actual provider plan rather than assuming PITR/managed backups exist.
2. Export encrypted application database records plus required Auth identities/configuration by the provider-supported method. Store restore instructions, app source/version, migration history and deployment configuration separately. Secrets remain in a protected secret store with controlled recovery access.
3. Export Storage object bytes and a bucket/object metadata manifest with hashes. Database dumps contain metadata, not the underlying remote files. Include public and private photos, private model submissions and pending cleanup state. Protect the export like private member data.
4. Store encrypted backups off the production account/device with limited access and retention. Validate encryption/decryption access and avoid retaining deleted-member data indefinitely without an explicit policy.
5. Restore first into an isolated staging project/cluster with email, webhooks, analytics, scheduled outbound tasks and public access disabled. Restore provider roles/extensions via supported mechanisms, then DB/schema/data, object bytes and required configuration. Protect Auth/MFA encryption dependencies; copying placeholder MFA metadata is not a real-factor recovery test.
6. Verify counts/hashes, private-owner/other-member/guest access, journal snapshots, approved/pending/withdrawn photos, community visibility, audit history, login/MFA/recovery and account cascades with disposable staging accounts. Re-enable outbound behavior only after verifying recipients and configuration.
7. Document achieved recovery time, backup age, errors, missing configuration and owner acceptance. Never overwrite production until the staging result is reviewed and a separately approved cutover/rollback plan exists.

`npm run test:security:db` creates only a disposable Unix-socket local cluster, applies the tracked schema/policy test setup, verifies permissions, dumps/restores synthetic records to another database and copies/hashes deterministic fixture object bytes. It does not connect to production or export remote Storage. `bash scripts/rehearse-local-recovery.sh` separately checks a two-cluster synthetic restore. Both clean up their temporary clusters/files. Neither certifies production backup availability or actual OAuth/SMTP/MFA-secret restoration.

## Monitoring and notifications

`/manage/security` is an administrator/MFA database-gated status page after this branch is deployed. It reports RLS/search-path/public-bucket checks, photo cleanup backlog, recent photo attempts and audit events. It explicitly labels owner email alerts as not configured. It is not a SIEM or proof of attack absence.

Owner operations should establish these signals using existing providers before adding paid services:

| Signal | Initial review threshold / action |
|---|---|
| Login/password/MFA failures | Repeated failures above normal baseline over 10 minutes; inspect aggregate source/provider status, apply available Auth/CAPTCHA protection |
| Unexpected staff/admin mutation | Any unexpected role/configuration/publishing action; verify owner intent and active device/session |
| API/function 5xx | Sustained error increase or repeated failed account cleanup; inspect deployment/provider health |
| Upload denials/volume | Abrupt growth or quota saturation across accounts; contain affected upload path, review provider throttles |
| Photo cleanup backlog | Backlog persists across retries; investigate processor/Storage failure while public access stays revoked |
| Webhook/mail failures | Repeated delivery/signature/retry failures when those integrations exist; preserve event IDs, prevent duplicate sends |
| Security configuration drift | Newly public bucket, missing RLS, changed role/grants, leaked credential or high dependency advisory; stop release and review |
| Backup freshness/drill failure | Missing planned backup or failed verification; investigate before risky release/migration |

Calibrate thresholds to actual traffic; do not send an alert per failed request. Future Resend notifications should be server-only to the independently verified fixed owner recipient, with a cooldown/event key and no private bodies, tokens, raw requests or scan photos. This side review did not create a Resend credential, notification cron or provider alert rule.
