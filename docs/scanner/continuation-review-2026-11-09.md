> Later owner feedback changed walkthrough discovery again. See [the repair-library continuation](../repair-library-2026-11-09.md) for the job-based library, removal of reader completion counters, original DIY links, and owner write-ups/comments. The verification figures below describe the earlier scanner/selection checkpoint.

# Scanner, walkthrough and model-selection continuation — local only

Continues `/local/owner/Developer/e34-scanner-repair-lab`, branch `steven/scanner-bare-parts-v2`, base/released HEAD `589ba7282bc68296580d8b790c4dd25d6e77b25c`. The original uncommitted implementation and ignored research are retained. Site 47 remains unchanged. No push, PR, source synchronization, hosted SQL/import/migration, deployment or invented member record was performed.

## Scanner continuity and identification fixes

- A complete BMW marking must occur within one photograph. Partial text in different photos can no longer be concatenated into an invented complete number. Grouped/newline text within a single photo remains supported; no character substitutions or missing-digit inference were added.
- Reading text and checking a number preserve the existing selected part and its provenance. Provenance changes only when the owner explicitly selects a record. Reading OCR over a catalog-comparison selection no longer turns it into an owner-confirmed marking.
- Photo edits/additions/removals clear transient lookup candidates and measurements. Retained OCR stays visibly stale and its lookup controls are disabled until reread. Notes, the chosen part, prior comparison and the established 24-hour device draft remain.
- One catalog-check path owns cancellation/generation checks. Superseded results cannot select an OEM record or clear the newer operation's busy state. Stale save completions cannot mutate a new account/car/photo operation. Queued callbacks from a terminated recognition worker cannot orphan a new worker.
- The tab and page are **Part scanner**. The tab follows **Walkthroughs**; the phone header has a 44px scan-icon target. Capture and results explain that up to three views are combined for **one physical part**, with a new scan for a different part. Mixed parts should remain unresolved; this is not a batch of three independent identifications.

The scanner still leads to the existing canonical part, complete source diagram, selected native car/location, written service/manual reference and private garage observation. No new identity, photo-storage or garage database was created. Owner photos/text are not added to public references or training. The native bearing highlight remains an assembly location, not certified part CAD.

## Shared photo and source integrity

Two CC BY-SA 4.0 used thermostat-housing views were added from [Raimond Spekking's front view](https://commons.wikimedia.org/wiki/File:VEMO_V22-99-0018_Thermostat_Housing-3996.jpg) and [alternate view](https://commons.wikimedia.org/wiki/File:VEMO_V22-99-0018_Thermostat_Housing-3998.jpg). Both show one VEMO/Citroën/Peugeot object; neither establishes a BMW identity or E34 fitment. Source, SHA-256, attribution/license, view, used condition, identity boundary, review date and shared physical-object/photographer groups are recorded. The shared family reader can show alternate views with their credits.

Current media: **nine licensed family photos, six exact-number external source links, zero licensed embedded exact-part product photos**. Current private/local photo index: **fourteen prototypes across eleven families**, retaining the five private retailer research references. No large model or heavier phone model was added.

`tools/scanner/reference-integrity.mjs` is shared by the builder/evaluator and standalone source audit. It checks actual file hashes; canonical source/image URLs; known physical-object groups; byte/pixel equality; dHash near-duplicate review candidates; and same-provider holdouts. The runtime index must match current reference IDs, family labels, source hashes and shared-media evidence before evaluation. The reserved retailer bearing now participates in the builder's exclusion checks as well as the regression set.

The actual audit of 14 references and 11 queries found no cross-partition byte/pixel duplicates and no dHash pairs at distance <=6. This cannot prove independent imagery. Four reference/query pairs share BimmerWorld; 22 records lack independently established physical-object identity. Same-provider holdouts and unknown identity are explicitly **not independent accuracy**. Known duplicate object/source groups are rejected across partitions; multiple views inside the reference partition remain one object.

## Measured recognition limits

The unchanged hybrid policy and q8 phone encoder, with the added housing views, still achieve **6/9 known positive category leaders**, zero incorrect leads reaching review, and one correct reserved bearing review. All results remain `accepted:false`. The broken housing still leads incorrectly as a shock; the industrial negative and other unresolved leads remain unresolved. No substantial new visual-accuracy gain, calibrated confidence, exact OEM recognition or owner's bare-bearing acceptance is claimed. Convenience/regression images are not an independent real-world evaluation.

## Catalog audit

The coverage audit now verifies staged candidates' fact/receipt/manifest hashes, vehicle contexts, unique and complete route sets, assembly/position/drawing counts and recovery deltas before reporting coverage. It no longer trusts a stale success receipt alone. Accepted snapshots, model bindings and hosted data remain unchanged.

All 39 recovered pages across ten selections still validate: 767 extra positions and 50 drawings. With the two accepted complete selections, 12/12 saved source indexes have complete **local** page coverage. This is not every E34 variant, universal fitment, complete photographs, CAD or repair coverage. Accepted snapshots still contain the 39 gaps; no hosted import was applied.

## Walkthrough coherence

The audit covers 40 immutable guide contents: **17 replacements, 12 inspections, eight planning checklists, three references**. All have applicability, tools, cautions, estimates and completion checks; all 40 still await technical review. Source-page locators resolve to the registered manual index, including the explicitly recorded Foreword v / PDF 5 exception. Source pointers are not per-step certification.

- Discovery groups the four job types. Conversion/modification planning no longer appears as a complete installation walkthrough.
- Before the steps, the reader visibly lists applicability, time and its editorial basis, listed tools/supplies, review status and individual printed/PDF page links. Preparation is no longer buried in nested details.
- A manual `?pdf=` link now displays the actual requested printed/PDF locator, with an out-of-chapter state. The private scan is not redistributed. These links do not pretend to open unavailable page artwork.
- Four guides provide orientation visuals (engine-family photos, two assembly drawings, one bulb diagram). **No guide has a complete process-photo sequence.** Missing process pictures and the limited role of orientation images are stated before the steps. Failed reference images offer a short explanation and retry. Fault injection exposed images failing before hydration, before `onError` was attached; a mount-time image-state check fixes that case and passes the actual browser failure test. Native document links also replace the inherited internal-anchor lint error in that reader.
- Planning/inspection/reference sequences keep their respective labels and journal handoff. They do not offer a repair-outcome action as if a plan or inspection itself repaired the car.

No mechanical instructions, numerical specifications, source-checked flags, immutable content hashes, guide revisions, progress keys or hosted repair records were rewritten. A detailed technical/manual review and permissioned process photographs remain necessary; the display changes do not certify the guide collection.

## 525i automatic and selection regression

Git blame identifies `f37a68c` (8 November 2026) as the introduction of the hard-coded `525i Sedan · Manual` registration. The underlying source vehicle metadata had transmission unset; later illustrative manual-driveline nodes were separate from the licensed artist body/cabin. Automatic matching then omitted the retained car. The original source/model files were not deleted.

An additive local 525i automatic reference now preserves the original exterior/cabin, M50 and common-system asset bytes while excluding later manual gearbox/clutch/flywheel nodes. Automatic gearbox/torque-converter internals are **not modeled**. The artist controls and shared driveline locations remain illustrative; the reader states the gap and links to the accepted 1995 525i automatic source diagrams. No manual gearbox was relabeled as an automatic, and no replacement shape, dimension or fitment was invented.

The default for an unselected car is **525i Sedan · Automatic**. An explicitly selected actual car/reference still wins. All ten choices use model-number order, then Sedan/Touring, then Automatic/Manual. The accepted manual r14 and its original separation policy, hashes and revision-bound saved views remain available. Current automatic reference: r23, 448 renderable groups. Existing eight variant exports and the independent automatic registration are retained separately so re-exporting the former cannot erase the latter. `node tools/build-525i-automatic-reference.mjs` reproduces the additive manifest and validates the original hashes; its detailed receipt stays under ignored `work/525i-automatic-reference/`.

## Verification and remaining owner test

Baseline reproduced: 451 TypeScript tests/52 files, 40 Python tests, typecheck, 6/9 known positive recognition. Full lint baseline: 255 errors, 83 warnings.

Current unit/type checks: **464 TypeScript tests/54 files, 41 Python tests, typecheck** pass. New checks cover cross-photo marking fabrication, source/physical-object separation and stale index contracts, selection provenance through OCR, stale worker events, catalog receipt tampering, exact manual locators and automatic/default/model order. Full lint has **254 inherited errors, 81 warnings, no added diagnostics** by file/rule/severity. New authored modules pass focused lint; the whole repository is not lint-clean.

Actual Chrome checks pass same-device photo/text retention, selected-part/provenance recovery after OCR/reload, stale OCR disabling after edits, full source diagram/manual handoff, four repair groups, visible tools/time/source locators, planning boundaries, ordered/default 525i automatic model rendering and 320/390px overflow checks. The restarted production preview passes 24 release, 33 security and 75 route/data checks; 31 unique served scanner JS/CSS entries byte-match the final build, and 2,438 production text assets exclude private prototype data and lab controls.

Browser and production verification receipts are under ignored `work/scanner-v2/continuation-20261109/`; screenshots are under ignored `output/playwright/`. The synthetic typography fixture is explicitly labeled as an OCR software test and is not a real identification result. No fabricated hosted owner car, scan, repair or outcome was saved. Production-style servers must be restarted after every build and served asset bytes matched against that build.

Pending: the owner's actual Android camera/gallery test on the loose bearing, authenticated save of a genuine observation, broader independently labeled worn/broken/confusable/negative photos, independent calibration, permissioned exact-part/process photography, technical walkthrough review and actual automatic transmission geometry.

## Phone review

Same Wi-Fi: http://127.0.0.1:3010/scanner (address verified on `en1`). Keep the computer awake.

1. Start a new scan, photograph the bare bearing, then optionally add other angles of that **same bearing**. One image is sufficient to run; a box or readable number is optional.
2. Scan, review the family, and explicitly choose the OEM record. Check its source conditions, complete diagram, car location and written bearing/manual material.
3. Read text, edit a photo and reload: the chosen part should remain, while old OCR number buttons become unavailable until reread. Use a separate scan for another physical part.
4. Review `/repairs` and a guide's visible tools/time/manual/picture coverage. Open a printed-page link and check the locator.
5. With no vehicle selected, `/workshop` should default to 525i automatic. Inspect the ordered list and the automatic-geometry coverage note. A previously selected real car remains selected.

No release approval is inferred from opening or testing the preview.
