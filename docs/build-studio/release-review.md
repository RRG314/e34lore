# Build Studio release review

Branch: `steven/workshop-build-studio`. Isolated from unfinished E30 work; based on released Site48 (26364b9678ab98b9f65abf7b5fa4bd8ae7772896). Nothing in this batch has been pushed, applied to hosted Supabase, synchronized to Sites or deployed.

## Working implementation

- Workshop Explore / Repair / Build navigation retains its illustrated reference. Build uses the existing native Three.js viewer, selection, immutable asset loader, controls and credits. Repair links use existing procedures; held experimental repair routes remain held.
- Members can start conceptual, factory-reference or owned-car projects; keep alternatives; rename, duplicate, archive, save, autosave, undo/redo, restore revisions and recover interrupted account-scoped browser drafts. CAS saves reject concurrent overwrites; idempotent request receipts handle lost responses. Deletion checks the version too.
- Actual cars, private plans and explicitly published snapshots stay separate. Only a confirmed transfer of selected owner-verified work creates existing service, modification, installed-parts and journal records. Repeated transfers do not repeat the same work.
- Actual cloned materials support paint, finishes, supported upholstery/trim and engine-cover colors. Reference, original unbranded ten-spoke and licensed artist wheel choices change geometry. The original wheel has 109,128-byte and 48,944-byte detail levels; low quality selects the smaller package. Optional packages load only when selected; all bytes/hashes are pinned and disposed on replacement. Original vehicle assets are unchanged.
- Structured OEM, aftermarket and custom parts cover 17 systems. OEM identities must exist in the canonical catalog; aftermarket maker/SKU fields are separate. Fitment/interchange evidence uses existing records; source absence remains unknown. Wheel dimensions, fabrication, dependencies, owner stages, tools, guide links, milestones, dates, nullable estimated/actual costs, private/public notes and photos are supported.
- Guide selections pin immutable archive revisions. Current matching content supplies its existing tools, duration basis and manual locators; older revisions link to their archived procedure rather than silently substituting new instructions.
- My Garage lists projects without requiring a real car. Public `/builds/<id>` URLs expose whitelisted, versioned snapshots. Preview includes exact public fields and the approved photograph selection. Private edits do not republish. Gallery search/model/style/system filters, lazy interactive public preview, existing discussions/reporting, opt-in follows, due-task notifications, staff MFA review, print sheets and private/public JSON exports are integrated.
- Build activity uses the existing opt-in analytics collector with fixed event/category names. No private project IDs, colors, costs, text or configuration payloads are accepted for these events.

## Asset and evidence coverage

The [appearance audit](appearance-assets.md) records 10 pinned references, seven existing asset hashes and strict material selectors. Paint colors are authored screen approximations; cited BMW product records establish code/name pairs, not every E34 year/market option. Dashboard markings, lamps, plates and ambiguous shared-material surfaces are excluded from recoloring.

Seat replacement geometry, dashboard veneers, branded body kits, bumpers, spoilers, grilles, lighting/exhaust variants and engine-swap geometry remain explicitly plan-only. Style labels do not authenticate branded parts or imply endorsement. Stance is an exterior illustration, not suspension kinematics, travel, clearance or roadworthiness. A preview never proves mechanical fitment. Reviewed source evidence is still needed for unknown configurations and custom fabrication; owner progress cannot certify safety.

Supplier availability and automatic part-correction feeds are not fabricated. Published updates and due-task reminders are implemented; replies use existing discussion notifications. Original body models retain their existing level of detail and texture assets; quality controls bound render resolution, and the optional original wheel supplies real geometry LOD.

## Backend and security

The additive migration is `supabase/migrations/20261109212217_workshop_build_studio.sql`. New private records require a verified, nonanonymous, still-live Auth session. Clients have owner SELECT access and narrowly granted RPCs, not direct project/revision/snapshot mutation rights. Server validation enforces the same strict bounded state contract plus canonical identities, reference pins, guide archive pins, graph ownership/cycles, receipts and media ownership. Save equality compares values independently of JSON field order, while preserving array order; a browser regression caught and fixed false conflicts for newly generated tasks. Limits include 100 projects/account, 300 KB/state, 150 parts, 300 tasks, 24 photos/build, 100 existing-bucket photos/account, save/publication/upload rates and bounded revision storage.

Public bindings stay private. Projection construction uses an explicit field allowlist and blocks full VINs and private project/garage IDs in public text. Selected costs are opt-in. Unpublish, source deletion and active-MFA moderation revoke future public snapshot/revision/media access. Already downloaded files cannot be recalled.

Conceptual build photos extend the existing private car-photo table, bucket, server JPEG normalizer, quotas and cleanup queue. Source metadata deletion revokes access before file removal. Cleanup is attempted after project deletion and retried on subsequent uploads; durable failures remain visible to existing health monitoring. Account deletion retains existing owner-prefix object removal before Auth cascade. Staff cannot inspect unshared project photos or private plans. Review staff receive a narrow queue projection, not direct access to private photo metadata. Revoked sessions cannot read private build records or photo metadata. Deleting an actual car preserves its separate build plan and historical transfer receipts.

## Local testing and review

The disposable review process uses actual PostgreSQL 17 migrations, PostgREST 16.5, the production Supabase JS client, real RLS/RPCs and the existing JPEG processor. Auth/Storage **transport** is a local fixture, clearly labeled in the preview; it is not another production authentication system. Provider OAuth/SMTP, actual MFA secrets and hosted Storage are not certified by this local setup. The official PostgREST release archive matched its published SHA-256.

Review setup:

1. Obtain the official macOS ARM PostgREST 16.5 binary in ignored `work/build-studio/bin/postgrest` (other platforms need their matching release).
2. Run `E34_BUILD_REVIEW=1 E34_REVIEW_FRONT=http://<LAN-IP>:3012 npm run test:security:db` in this checkout. This boots a disposable local cluster, runs security/restore tests and starts its loopback-only review adapter. Keep it running.
3. Run `E34_BUILD_REVIEW=1 npm run dev -- --host 0.0.0.0 --port 3012`. The serve-only plugin proxies the local adapter and uses the current browser origin. It refuses production builds with the review flag enabled.
4. Open `/workshop?mode=build`. Local-only credentials: `studio-review@example.invalid` / `review-only`. The review database is disposable and separate from all real accounts. Stopping its process removes it.

## Verification receipts

- 519 tests across 58 Vitest files; 41 Python regressions.
- Typecheck passes. Full lint has 253 errors / 81 warnings against the released baseline of 254 / 81; no additional diagnostic counts after normalization.
- Disposable SQL/RLS checks cover project ownership, immutable revisions, strict state/asset validation, CAS/idempotence, restoration, public isolation, media consent/MFA/revocation, follows, actual-work transfer, aggregate analytics and deletion.
- Real REST-to-database/media journey: create → customize → canonical part and pinned guide → reopen → concurrent edits → restore → private JPEG upload → preview/confirm publication → consent/MFA review → explicit photo republish → private edit isolation → republish → actual-work transfer → moderation/unpublish → deletion/byte cleanup. Linked discussion FK cleanup is included.
- Synthetic backup/restore includes private build state/revisions, public snapshot isolation, model pins, source image ownership and revocation, as well as the preexisting application recovery fixtures and object-byte hashes.
- Production build/public-asset/confidentiality checks pass. No development review credentials or fixture transport are bundled.
- Actual Chromium browser journeys cover offline interruption/recovery, save/reopen, generated dependency tasks, public preview/confirmation, anonymous snapshot reads, private edit isolation, republish, linked discussion context and version restoration. Both 1440px desktop and 390px mobile layouts were inspected. Actual LAN HTTP sign-in/project/part creation and autosave/reopen pass with `crypto.randomUUID` unavailable. This is browser emulation, not a physical-phone camera or FPS certification.
- Four real wheel replacements took 498 / 67 / 49 / 47 ms in the local Chromium run. Repeated original wheels returned to 369 GPU geometries / 4 textures; artist wheels to 355 / 5, with one canvas. Low-detail original wheels rendered 217,496 total triangles vs 227,384 at high detail. These are this machine’s measurements, not a mobile FPS promise.
- The private build sheet was exported through Chromium’s actual print pipeline and both A4 PDF pages rendered and visually inspected. Dialog chrome is removed; private notes and costs stay in the private sheet. Screenshots, PDFs and raw test logs are under ignored `output/playwright/` and `work/build-studio/`.

## Release status and remaining external steps

Local review only. The owner must test and approve this batch before release. A later authorized release needs the additive migration, updated `car-media` and analytics collector contract/registry, then the independently tested E34 source/build. No E30 files belong in that release. Verify hosted migration/function application and real authenticated image transport during that release; keep existing records intact. Existing unrelated lint findings and the previously documented hosted breached-password protection setting are not certified away by these changes.

## Scanner follow-up included in this batch

One scan represents one part, with optional extra views of that same part. Removed the quota-style photo counter. Photo review now offers **Use photo and scan**, **Keep photo**, **Retake** and **Cancel**; the steady main action is **Scan this part**. Automatic comparison waits for the accepted photo revision and local save to finish. It cannot start with an unconfirmed replacement or an old photo set. Existing explicit catalog-number confirmation and optional contribution consent remain intact.

Retake used to refer to a file input unmounted during photo review. Inputs now stay mounted, so the phone picker can reopen immediately. Accepted images are not unnecessarily revoked/replaced during parent synchronization. On the actual LAN HTTP preview at 390px, verified review → Retake opens picker, replacement → automatic scan, keep/add/rotate, multiple views of the same part, reload with the active view preserved, cancellation and replacement at capacity, and successful real local inference. Identical uploaded views are deduplicated for inference; these tests do not establish exact-part recognition accuracy. Optional extra-view bounds remain internal; users see an explanation only when they need to remove a view.

The local runtime uses the existing pinned CLIP revision and its validated 89,117,001-byte ONNX file; no experimental recognition model or E30 implementation was added to this release. The first run correctly retained photos on a missing-local-file failure; after preparing the already pinned runtime, real comparison completed. Public production recognition assets are unchanged.

## Deliverable index

| # | Deliverable | Evidence / status |
|---|---|---|
| 1 | Existing architecture audit | `architecture.md`, reuse audit |
| 2 | Build Studio architecture | Same document; bounded actual/planned/public split |
| 3 | Workshop integration | Explore / Repair / Build in the existing Workshop |
| 4 | Visual controls | Real material, wheel, stance changes; coverage in `appearance-assets.md` |
| 5 | Mechanical configuration | 17-system OEM, aftermarket and custom component records |
| 6 | Compatibility / interchange | Existing source evidence; unknown remains unknown |
| 7 | Dependencies | Major-system research checks and task DAG |
| 8 | Persistence | Verified RLS/RPCs, autosave and interruption recovery |
| 9 | Revisions | CAS, idempotence, append-only restore, undo/redo |
| 10 | My Garage | Multiple conceptual/linked builds; confirmed actual-work transfer |
| 11 | Progress | Stages, dates, milestones, notes, costs, photo pipeline |
| 12 | Public builds | Stable URLs, explicit preview, frozen public revisions |
| 13 | Gallery | Search, model, style, system and recent-update paging |
| 14 | Public 3D | Same pinned native viewer, loaded on request |
| 15 | Exports | Private/public JSON and printable sheets |
| 16 | Notifications | Opt-in follows, existing replies, one daily due-task summary |
| 17 | Analytics | Existing opt-in aggregate collector; fixed allowed fields |
| 18 | Security | Disposable SQL/RLS, REST/media, revoked sessions, MFA and cleanup |
| 19 | Automated tests | 519 Vitest, 41 Python, SQL restore and 12 REST workflow checks |
| 20 | Desktop / mobile | Browser and LAN journeys, 390px / 1440px screenshots, actual PDF |
| 21 | Coverage | Licensed/original packages; explicit unavailable geometry and evidence |
| 22 | Deployment | Held locally for owner testing; E30 stays separate |
| 23 | External dependencies | Later hosted migration/functions and real provider verification; missing geometry/source feeds remain stated above |

## Home page and copy follow-up

The home hero now links directly to **Scan a part** and **View parts catalog**. Its member count comes from `community_member_count()`, an aggregate of email-confirmed, nonanonymous registered Auth accounts. No account identities are returned or newly granted to public clients. Anonymous/unconfirmed accounts are excluded; confirmation, guest conversion and account deletion update the next read. The signed-out and signed-in totals match. There is no invented fallback number: failed reads show a short message with Retry.

The additive `20261109235510_public_member_count.sql` migration must accompany this source in a later authorized release. It is applied only to disposable local databases so far. `tests/member-count.sql` verifies both public roles, count changes and the unchanged private Auth-table boundary; the full SQL security/restore suite passes. Browser checks cover both home links, failed count request / Retry, 390px stacked actions, 1440px desktop layout and absence of horizontal overflow.

Removed the global vehicle-context messages and repetitive vehicle-picker explanation. Shortened car-selection confirmations, configuration-save and catalog-selection labels; removed the repetitive catalog-search helper paragraph. **Part Scanner** is consistent in navigation, accessible mobile labels, page heading and page metadata. Source qualifications, missing-data messages and action-specific safety/consent copy remain available where needed.

These changes remain local, alongside Build Studio; nothing has been pushed or deployed.
