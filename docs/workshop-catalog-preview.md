# Whole-car reference and account preview

Historical r13 receipt. The later [r14 readiness report](home-workshop-readiness.md) supersedes the geometry, catalog counts and explosion behavior below. All four outer door skins and detailed component separation are now implemented in the local preview. The original release hold remains in effect.

This is a local review milestone on `steven/full-car-reference-preview`. The public website remains Sites version 32 at the previously verified commit `dfce7484e901295b5bc91f25c1a770a1efdd34a8`. No new website version or Edge Function is deployed by this milestone. No source geometry, master asset or earlier implementation was replaced.

## Catalog and service integration

The existing r13 reader now has 450 authored component bindings, one for every selectable renderable instance, spanning all 19 vehicle systems. They replace the four-only sidebar lookup. The bindings distinguish a component, combined assembly, repair set, integral part supplied with its parent, and display reference. Multiple BMW numbers remain selectable alternatives with their source restrictions; a combined mesh is not silently assigned one ordering number. Left/right doors, glazing, lamps, fenders and calipers use source-side descriptions where stated. Some combined artist surfaces still include multiple real components and say so.

The reference selection is the observed **1995 525i Sedan** catalog: **397/397 source pages, 10,541 source positions, 8,314 distinct BMW numbers and 499 drawing records**. These are source listing counts, including alternatives, accessories and superseded records, not an installed vehicle BOM. Production month, equipment, engine and transmission applicability are not inferred from the illustration. The overall owned catalog inventory is **24,324 canonical BMW numbers / 90,274 active positions / 4,573 drawing records / ten source selections**. Existing canonical IDs and curated aliases are preserved.

The new source selection was imported into the existing hosted catalog **before** the user's later preview-only instruction. Subsequent work is local. No hosted account, garage, role, permission or content mutation was made for this preview. Ordinary owner sign-in and sign-out used the real existing authentication flow, creating and ending only the new local-browser session.

Each component sidebar offers its actual mesh thumbnail, source catalog positions and conditions, number copying, source listing, manual job locators, available original walkthroughs, linked community discussions, owner journals, safe sharing and the existing approved-retailer component. Retailer/program approval gates are unchanged. A manual locator is explicitly labeled a manual procedure reference; it is not represented as a finished walkthrough. Integral geometry such as a pump impeller or intake runner identifies the parent assembly rather than inventing a separately orderable number.

The existing catalog reciprocally links exact source positions to the matching model component and service material. The model's search also searches the full source selection, so small unmodeled service parts remain discoverable. The system directory includes an entire-selection view for accessory and equipment pages outside the modeled systems.

The compiler runs offline from the retained checksum-verified factual snapshot and existing canonical aliases:

```sh
python3 tools/author_component_catalog_rules.py
node --experimental-strip-types scripts/compile-component-catalog.mts
```

It rejects missing/ambiguous authored rules, empty selectors, unknown manual jobs/guides and incomplete source coverage. The browser validates the bytes, SHA-256, schemas, selection and source identity of immutable per-assembly JSON before use. Only final referenced assets are public; intermediate outputs stay ignored. No source HTML, prices, account data, manual scan or additional unlicensed drawing copies are included. Large catalog components load separately from ordinary site pages.

## Exploded reference behavior

Separation is now a deterministic slider pose. It no longer uses mesh radius, iterative repulsion, arbitrary per-mesh offsets or time-based mesh easing. Whole-car separation moves the engine as a rigid assembly; doors retain their glass and matching trim. Wheel, hood, door, axle, transmission, exhaust and cooling movements have authored stages and directions. Opening the engine or a component exposes a finer level. A selected displaced component has a subtle line to its installed position. Strut companions and focused internal components are included correctly. Orbit, zoom, focus, isolation, hide/show, body visibility, seated views, expand mode and saved inspections remain intact.

The original artist body spans fenders, pillars, roof and adjacent surfaces continuously. Its current triangle regions are **not factory panel seams**. Those continuous regions now stay connected during explosion to prevent false jagged panel separation. This is an interim, honest display behavior, not completion of separate accurate fenders or collision-checked removal paths. Some door groups show inner door surfaces while the exterior skin remains in the continuous source body; their linked door records are assembly references pending correct panel geometry. The model remains r13; no new calibrated OEM CAD is claimed. Detailed fastener geometry, actual panel boundaries, dimensional verification, component packaging and complete installed parts modeling remain reconstruction work.

## Accounts and garage

A stalled initial auth read now has a deadline and can recover through a later real auth event. Sign-out uses the supported local SDK scope, clears only this project's browser credentials, has a bounded fallback and returns to the signed-out page. It does not sign out other browser sessions. Normal members see garage and sign-out actions first; optional security settings are collapsed. Moderator privileges remain server-assigned and MFA-gated; there is no member activation control.

Garage reads are abortable, distinguish failures from an empty garage and offer retry. Anonymous guest sessions are guided to member sign-in for durable private garage records. Saves and vehicle edits have busy guards, deadlines and recovery messages that do not falsely report an uncertain write as success. Existing vehicle details, private notes, photos, journals, publication choices, service records, modifications, installed parts and exports are retained.

Account deletion requires typed confirmation and a confirmed server acknowledgement before clearing credentials or showing success. API failures are presented from the bounded JSON error response, with a usable retry state. The local Edge Function change preserves approved-origin CORS and no-store headers for unexpected failures. Its authorization still uses a fresh Auth-server identity, session revocation and owned-file cleanup. This function change is **not deployed**. No real account was deleted to test it.

The Cloudflare 500 in the supplied screenshot could not be reproduced. Current live route reads returned 200; available site error logs contained no matching application stack. This evidence does not establish the edge failure's cause or prove that it cannot recur.

## Verification and remaining boundaries

Final automated verification passes: **202 unit tests in 26 files, 30 importer tests, TypeScript checking and the production build**. `git diff --check` passes. Receipts are recorded in the [historical implementation notes](https://github.com/RRG314/e34lore/blob/site-v56/IMPLEMENTATION_STATUS.md). Local PostgreSQL checks use disposable synthetic clusters, test owner/non-owner permissions and restore/account cascades, and clean up those clusters. They never target the hosted database.

Browser verification includes real owner Google sign-in to localhost, username/moderator navigation visibility, private empty-garage and add-car form loading, disabled deletion submission without confirmation, cancellation without deletion, and successful sign-out from that local session. At 390×844 the page has no horizontal overflow (375-pixel document width), and selected part details fit below the model. Left front caliper and right front door source alternatives were checked; the latter retains the September 1991 production change. All 397 assembly links are available, radiators appear under cooling, and blind plugs can be discovered without pretending they have individual meshes. Both-axis orbit and zoom preserve the held exploded pose; reassembly returns the slider and part offsets to zero. Console checks were clean. The thermostat model's two source alternatives round-trip to the exact 1995 source position, its original drawing, service locator and related model link. The account and add-car forms loaded normally; deletion submission was disabled without confirmation and was cancelled. Only the new localhost owner session was signed out. No real vehicle, photo or community post was created for testing. Browser photo upload, real deletion, provider mailbox delivery and physical Android-device verification must not be inferred from these checks.

Still open: complete accurate geometry for every installed item; physical clearances/removal trajectories; a finished original walkthrough for every one of the 301 indexed manual jobs; technical/physical review of current drafts; Apple/Meta public-provider completion; external affiliate approvals and live offer feeds; the existing full-repository lint debt; broader device and member write-flow testing. Earlier Android, manual, community and affiliate implementations remain preserved. A public release requires a later user decision after preview testing.

Local review: [workshop](http://127.0.0.1:3002/workshop). The compiled preview listens on loopback port 3002 and remains running for the owner to test. Browser proof files are retained under `outputs/review/preview-workshop-reference.png`, `preview-phone-caliper.png`, `preview-engine-separation.png` and `preview-car-door-reference.png`; they are local QA artifacts, not public assets. Restart this owned preview after any new build because Wrangler snapshots static asset paths at startup.
