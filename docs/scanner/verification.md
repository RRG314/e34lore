# Verification and release record

8 November 2026 UTC. Dedicated branch `steven/scanner-repair-vehicle`; baseline main `97cb24f201eb5ae4e6e95efb383252cfcc9ddc0f`, Site36. **Site38 is published at https://e34lore.com.** The public marking/catalog path is available; visual comparison remains administrator/current-MFA only. See the [completion matrix](completion-matrix.md) and [exact change inventory](https://github.com/RRG314/e34lore/blob/site-v56/docs/scanner/change-inventory.md).

## Actual measured evidence

Bill Bounty434647a4d84345f18af8c831e28e4a7f179c4b19 was cloned read-only; its working tree remains clean. No secrets, backend, build or deployment were used. Its destructive build command was explicitly avoided.

Pinned real OWL-ViT and CLIP models ran on licensed real photographs in Node22/Transformers.js4.3.2, not mocked responses. The [evaluation manifest/results](evaluation/README.md) distinguishes reference and held-out images and synthetic geometry. On nine held-out photos (eight categories-positive, one industrial negative): detector top1 1/8, top5 3/8; synthetic-reference CLIP top1 1/8, top5 5/8; mixed-reference CLIP top1 4/8, category-deduplicated top5 7/8. All falsely accepted the industrial negative at the probe thresholds. No calibrated recognition claim, localization IoU/precision/recall, exact OEM accuracy or representative population statistic is established.

M1 CPU observations: detector median352ms/image, mixed-reference CLIP median39ms/image (31–43ms). Peak RSS322MiB for CLIP alone and630MiB for sequential detector/CLIP evaluation. These are local Node observations, not browser/mobile guarantees or download-inclusive first-use times. Browser inference uses separate single-thread WASM workers and terminates them between models.

Real Tesseract7 OCR ran both a clearly labelled synthetic marking fixture and a real licensed engine-bay photo. Synthetic text `BMW 11 51 1 315 559` was read correctly (reported OCR confidence95); the real bay produced low-confidence noise (35), not a fabricated component identity. That is a negative observation, not a real OEM-label accuracy estimate. Actual Chrome in the served application read the fixture in828ms and retrieved the real `11511315559` catalog record. This M20-era pump example was not incorrectly mapped to the M50 repair. No photo or synthetic member record was saved to production.

## Verification ledger

- TypeScript and production build pass; inference dependencies are lazy, WASM selected explicitly and no emitted asset exceeds25MiB.
- 318 application tests /33 files pass, including18 new scanner/configuration/repair tests. Tests cover camera grant-after-unmount cleanup, playback failure, crop geometry, quality flags, complete-number extraction, genuine reference-vector shape/normalization, unknown rejection, VIN parsing, factory/current/conflict separation, DAG forward/reverse and invalid steps, pinned guide identity and telemetry PII rejection.
- 37 Python importer/asset/security tests pass.
- Full disposable PostgreSQL application bootstrap, scanner pipeline, existing analytics/security/support tests and synthetic schema/object restore pass. New assertions cover owner privacy, cross-car/account constraints, revision concurrency, immutable source evidence, unsupported payloads, operation prerequisites, valid staff-MFA review, factor revocation, explicit journal privacy, completion/new-run history, scan deletion and owned-car cascade. The restore verifies12 fixture object byte hashes. It is not a production recovery certification.
- New scanner/vehicle/repair files pass targeted ESLint. Existing repository lint debt is not suppressed. npm audit remains0 high/critical,16 moderate. Build confidentiality verifies1,851 client assets exclude private configuration and the server prerender credential.
- Local and live Site38 served tests pass75 SSR/data/source/isolation checks and31 HTTP security boundaries, including anonymous scanner-table/review denial, a false public visual flag and absent diagnostic HTML. No authenticated writes/messages occur in these live-backend probes.
- Native Chrome local browser verifies gallery input, local photo preprocessing, actual OCR, real catalog candidate, conditional compatibility and public navigation. Scanner and repair layouts at320,375,390,768,1280 were inspected without horizontal overflow; the discovered tablet header overflow is corrected by the menu breakpoint. Desktop camera absence gives the usable photo fallback. This is not physical phone-camera proof.

## Hosted backend

Installed additive migration `20261108072214_scanner_vehicle_repair.sql`. It registers454 actual r14 model components, three real model/runtime versions and one immutable source-backed17-operation plan; all private observation/evidence/revision/run/review tables begin empty. Existing identities, member data, parts, photos, Auth settings and production secrets are preserved.

Analytics Edge **version3 ACTIVE**, SHA256 `215b3697c57d458b59806171f40929c477314474480aca195f18c272376f8da9`; origin/auth/PII/consent/rate guards remain. It adds only typed scanner events and the647th public resource. Version2 first deployed the extension; version3 synchronizes the same source digest. Collection remains off, five original legacy opens preserved and zero new analytics events. The first bundling attempt omitted a shared request helper and failed before deployment; the complete dependency bundle then deployed successfully.

Security advisors: no ERROR-level finding before/after. Baseline warnings remain; the extra guarded-definer warnings identify explicitly authorized RPCs/private helpers, and the private review table intentionally has no direct policy/grant. This is not a clean-all-advisories certification.

## Hardware and remaining release gates

Actual iOS/Android camera, focus/torch/zoom combinations, browser WASM memory, sustained latency, thermal behavior and native-store permission behavior remain **unverified**. Desktop width emulation is not hardware verification. Public visual matching stays off. No real owner's car/repair/photo was created/deleted for QA. No fake scan history, vehicle identity or recognition event was seeded into production.

Device protocol: on current Android Chrome and iOS Safari over HTTPS, test allow/deny and camera-less fallback; rear preview, capture, rotate/crop, orientation, retake, up to3angles, supported zoom/torch and leaving/backgrounding while permissions resolve. Confirm camera indicator switches off. Read a permissioned actual E34 OEM label, compare every digit/source conditions, repeat under glare/dirt/occlusion and with a visually similar incompatible part. Verify uncertain/negative rejection. With a disposable non-production member/car, save observations and configuration, switch accounts/devices, reconcile conflicting saves, complete/undo/resume a repair, save parts/outcome/private journal and separately publish/withdraw. Record measured timings/memory and release evidence; never send VIN/images to analytics. Staff-only visual testing requires an actual current MFA session and must retain failure cases.

Missing domain evidence cannot be replaced with a confidence percentage: acquire expert-labelled E34 reference/negative photographs, independently calibrate/evaluate and verify physical dimensions/removal geometry before expanding the claims or visual audience. Segmentation, public continuous inference, complete build sheets and complete per-variant geometry remain open.


## Browser-worker correction after version37

Live owner-MFA testing exposed a real worker initialization failure: Vinext's client optimization folded `typeof window` to `object` inside Transformers.js, causing `window is not defined` in the dedicated worker. A scoped worker pre-transform preserves runtime detection via `globalThis.window`; no fake window, simulated inference or global page behavior change is used. Worker output is ES module format. Error/timeout paths now preserve their useful failure messages and terminate resources. Detection boxes clip genuine small boundary overhang while retaining their label/score; out-of-frame/empty regions are rejected.

Actual Chrome worker runs on the licensed held-out caliper image now finish: OWL-ViT took27,181.9ms including first model loading and ranked an incorrect starter-motor category; CLIP took11,904.3ms including loading and ranked the independent caliper photo first at cosine0.6959. The latter is a visual similarity, not a probability or exact E34 identity. Both are real WASM/browser results, distinct from the faster cached native-Node measurements. The public recognition gate remains off. Temporary local diagnostic HTML is removed before packaging and explicitly denied by the served security checks.

## Exact publication receipt

The feature was integrated through PR13, merge `f419a036e883ac865dda55f44dc6963d1bc2783d`, and the browser-worker correction through PR14, merge `effd19a81174744d732c7a8a9aa0e9f72e3feafc`. No application commit was pushed directly to main. Feature website/SQL and Android checks passed in GitHub run42461141610 on source `9ca6dc17996e3c5435ee3d5838df33d7027f083b`; merged-main run42461546885 also succeeded. Initial feature run42459959570 and merged-main run42460208116 passed before the worker correction.

| Release | Source and saved version | Deployment |
| --- | --- | --- |
| Site37, initial feature | `2f85d2c77bc5d03b2363ffb9420007c79eb8c171` | Succeeded 2026-11-08T07:47:17.694234Z |
| **Site38, current** | `9ca6dc17996e3c5435ee3d5838df33d7027f083b` | Succeeded 2026-11-08T08:07:03.211636Z |

Current local archive `outputs/scanner/e34-lore-scanner-repair-worker-fix.tar.gz`:89,185,009 bytes, SHA256 `99bda5c39303275720661128a1c095b5cd8f833da4dd17ec9c12693b05ee6006`. Sites normalized archive:2,125 files,172,707,840 bytes, SHA256 `c96175d06f664ac527b834db35f153ef34b3d86abc91366110b75d73dd8911a7`. Source identities are fixed above; subsequent documentation-only commits do not change the released application artifact. Existing public audience, custom domain, Supabase project and Android package are preserved.

## Final live-browser evidence and production state

On **live Site38**, the real owner/current-MFA session ran the full detector → crop → embedding/reference-comparison workflow on the licensed held-out caliper photo. Detector25,804ms and retrieval6,973ms include model loading; the independent caliper comparison led at cosine0.687. The page displayed actual detection regions and reference images, **“Unable to identify confidently”**, and no established exact OEM identity or fitment. No console errors/warnings were observed. These timings differ from the isolated worker diagnostic because the production pipeline includes its selected region; neither run is phone performance evidence. Pixels remained local and no observation was saved.

The live repair selected operation7 and opened the existing **Coolant-pump pulley** reference/catalog panel. A separate multi-node fan/shroud check preserves the exact selected shroud while selecting the matching operation. Forward skipping remains blocked; see-through surroundings, native viewer controls and guide/community links remain available. The real owner opened the MFA correction queue (empty) and owned-configuration selector (no owned car yet). Full mutating scan → repair → private garage/journal persistence is verified in isolated PostgreSQL; it is **not certified as a real-owner browser completion** because no actual owned car/repair was supplied. No fake vehicle was inserted to claim that result.

Final read-only production counts after browser verification: observations0, configuration evidence0, revisions0, repair runs0, analytics events0; optional collectionfalse and original legacy opens5. Existing member/garage/forum data was not used as QA fixtures. The camera/photo workers were disposed on navigation; the owned port3004 preview was stopped. Bill Bounty remains unchanged.

Local ignored receipts: `outputs/scanner/live-inference.txt`, `live-inference.png`, `live-repair.png`, `browser-detector-summary.json`, `browser-retrieval.json`; test logs in `work/scanner/*v38*.log`, `unit-worker-final.log`, `database-final.log` and `python.log`. They are local evidence, not uploads or committed user records.
