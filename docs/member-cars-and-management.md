# Member cars and owner management

Verified engineering continuation on 6 November 2026. Exact final source, deployment, CI and live-browser receipts are retained in the external deployment receipt. The E34 Physics Laboratory, existing canonical catalog, journals, account system and owner-private hosting audience are preserved.

## Member workflow

In My Garage, choose an existing current or previous car and upload a photograph. Uploads stay private. The browser accepts JPEG, PNG and WebP up to 15 MB and prepares a JPEG no larger than 1600 pixels. The hosted service independently decodes and reencodes pixels and stores only the result. Metadata removal does not blur details visible in the photo.

Publish the car's separate shared story, then use Share photo, inspect the exact preview and submit for review. No private service history, odometer or notes are copied. Approved photos appear on the existing car page and its community card. Owners can withdraw a photo or the parent story. Photo deletion also removes its publication; car deletion revokes its public copies and queues file cleanup.

The community has a dedicated `/community/cars` directory, model/story search and Featured cars filter. The community overview shows moderator-selected real member cars. A feature requires a published, nonhidden story and an approved photo. There are no seeded member cars. The car page retains the existing journal timeline, canonical reference links and linked discussions. Enlarged photos support zoom, scroll panning, in-plane rotation and reporting.

## Owner management

`/manage` requires the existing moderator permission and a genuinely MFA-verified Auth session. Sign in and verify the authenticator under `/account`. Staff permissions cannot be assigned through a profile. The actual owner must complete member signup, email confirmation and authenticator enrollment; a disposable test identity is not owner onboarding.

The dashboard provides counts and optional section totals, photo review, car features and hiding/restoration, discussion locks/hiding, content reports with audited dispositions, and member restriction actions. Existing restrictions/appeals/audit history and the technical review desk remain linked. Every staff change requires a reason. Photo review reasons are visible to the submitting owner and staff, not ordinary readers. The dashboard excludes private garage sources and email addresses.

## Upload and storage boundaries

`car-media` version 2 validates the access token against Auth before using any supplied input. A scoped client enforces ownership; service operations normalize pixels, store files and finalize trusted metadata. Both JSON and multipart streams have byte limits before parsing. Direct browser writes and trusted-completion calls are denied. Quotas are 12 photos per car, 100 per account and 24 attempts per hour. JPEG decoding is limited to three megapixels, a 1600px edge and bounded decoder memory; output is at most 2 MiB.

The private bucket's byte-read policy is independent of row visibility. Owner-ready files, approved files on visible shared cars, and MFA staff review are the permitted cases. No public bucket or long-lived signed URL is used. Hiding/withdrawal blocks future reads; already downloaded copies cannot be recalled. Source deletion revokes publication first and records a file-removal receipt. Owner cleanup retries through the Storage API. No claim is made of an antivirus service, global scheduled file sweeper or image recognition of visible personal details.

`delete-account` version 3 removes car-photo and existing twin-source files before account deletion, while retaining fresh-identity validation and global session revocation. The canonical domain and reviewed local origins are accepted. A failed storage cleanup stops account deletion. Owner exports include private photo metadata and publication status.

## Analytics

The optional footer switch defaults off. An accepted count transmits a fixed public section name only. The database stores day, section and count; it has no account, IP, session, search or full-route fields. Local per-section deduplication stays in sessionStorage. Private account/garage/staff routes and discussion editors are excluded.

The owner dashboard shows the latest 30 days. Counts represent section opens rather than unique people and can include automated traffic. The `e34-usage-retention` job keeps today and the previous 89 dates, runs at 03:15 UTC, and prunes its own job history after 30 days. Its scheduled execution succeeded during a bounded test before restoring the daily schedule. Provider request/security logs remain separate from this analytics store.

## Manual navigation and remaining technical work

All 47 repair chapters and the wiring/partial-index appendices have source-specific hubs, exact printed/PDF ranges, canonical system links and FK-backed chapter discussions. Existing walkthrough links are determined by actual source pages. Four visually checked original orientations cover maintenance organization, electrical observations, fuse/relay arrangement identification and HVAC identification. These are not new full repair procedures.

The source drawing and 3D viewers remain distinct. Source drawings support pan/zoom/in-plane rotation and selection. Existing models support all-axis orbit, underside views, zoom, separation and selection. Expanded views have explicit exit controls and a focus-contained in-page fallback when native fullscreen is unavailable. Escape closes the fallback. Dialogs are centered. A flat source image does not supply hidden geometry. Full reviewed repair coverage and dimensionally verified engine/chassis geometry remain open; the six walkthrough drafts and zero verified physical removal paths are not reclassified by this release.

## Executed verification

- Typecheck, 93 Vitest checks, 23 Python checks and production build passed.
- The served Worker passed 34 core route/API checks and fetched all 49 manual chapter/appendix hubs with canonical question handoffs.
- Hosted rollback suites passed for community, garages, journals and car media. The media suite covers private bytes and metadata, service-only completion, cross-owner denial, explicit pending publication, actual role/MFA enforcement, approved visibility, hidden review reasons, features, parent withdrawal, invalid chapter rejection and deletion cleanup receipts. Fixture-specific predicates prevent unrelated approved photos from invalidating the test.
- Browser checks against the production build and hosted backend exercised private car creation, a real 1600 × 1067 processed upload, explicit submission, an actual authenticator challenge, photo approval, feature selection, car gallery, enlargement/zoom/rotation, chapter question publication/backlinks and optional count persistence. Mobile chapter width was 375px with no horizontal overflow.
- Existing source drawing controls were exercised at mobile width; model underside, zoom, vertical keyboard orbit, spin, selection and separation were exercised in the browser. Final canonical-domain checks and disposable-data cleanup are recorded in the release receipt.
- Latest security advisor findings contain only the previously documented leaked-password-protection warning. That provider feature requires the paid plan; no upgrade was made. Every one of the 77 custom tables has RLS.
- After the owner's replacement SMTP save, controlled signup and recovery requests succeeded. Resend displayed Delivered for both simulation messages. The simulation account was deleted. Real-owner inbox confirmation and completed recovery links are distinct remaining checks.

No public launch, complete manual conversion, measured factory CAD, actual Android device journey or backup restoration is certified by this checkpoint.
