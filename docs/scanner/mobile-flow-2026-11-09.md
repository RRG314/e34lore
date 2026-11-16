# Scanner mobile flow correction — 9 November 2026

Status: local owner review. The scanner remains Coming soon in the public roadmap and unavailable in production. No push, publication, hosted migration, credential change or member-data fixture is part of this batch.

## Feedback and implemented sequence

The owner used Android Chrome and subsequently confirmed recognition ran. The reported problems were process visibility, loss of earlier photos and awkward navigation after recognition. The earlier UI required a separate Keep angle action and reset results on every capture.

The revised flow is:

1. Add one to three photos. Each is kept automatically on the device.
2. Use the visible Scan photos action. One photo is sufficient; extra views are optional.
3. Review a component family and explicitly choose an OEM record. A unique record for a clicked proposed number opens directly; ambiguous records remain choices.
4. Read the selected part's full assembly diagram and numbered position. The shared OEM Diagram component retains pan, zoom, markers and source attribution. Other positions can be selected in that assembly.
5. See the existing interactive car directly underneath, with the linked component selected. The 540i center-support location starts in the underbody view; Inspect part isolates the selected assembly for a clear close view; Whole car restores the assembled context. The public workshop keeps its existing default behavior.
6. Consult the available source-linked service material, tools and repair preparation below the car.
7. Optionally save the chosen part or an unresolved candidate privately to a real garage car.

Photos, results, selected OEM record, diagram-source selection, reference model and notes survive reloads in the same browser/origin. Changing the garage destination does not discard pictures. Adding or editing photos retains the earlier result and visibly marks it as older evidence. A human-selected OEM record can still be saved; another scan remains available. Starting a new scan explicitly asks before clearing its device photos.

## Persistence and privacy

Device drafts use IndexedDB, contain at most three prepared images, and are separated by account. Expired drafts are discarded on their next load after 24 hours of inactivity. No photos are sent to a recognition service or uploaded by this flow. Guest photos are carried through same-origin sign-in only when the user explicitly chooses Sign in and keep this scan; an existing account draft is not silently overwritten.

The garage uses existing component_observations and owner RLS. Candidates are status=candidate with no invented part_id or node_id. The family's identifier is namespaced as family:... in the existing candidate_nodes field. Canonical identities remain owner-confirmed observations, not verified catalog changes.

The first database test correctly rejected the previous new fields as Unsupported evidence field. The save now uses only the existing allowed fields: models, markings, method, timings, candidate_nodes and geometry_status. No evidence whitelist or ownership rule was weakened and no migration was required. Isolated tests prove candidate save/read, hidden rows for another member, and the existing delete/repair behavior. Saving stores the part reference/result and notes; photos remain on the device. An authenticated owner browser save on the revised phone UI is still a release acceptance check; no fake hosted accounts or cars were created to simulate it.

## Shared diagrams, model and service coverage

The selected-part reference reuses sourceDrawingAdapter, catalogOrderingRows, Diagram, PartCompatibility, WhereToBuy, CatalogProcedureLinks and the native ReferenceWorkshop. It does not create another catalog or an authoring studio. It retains source alternatives, required quantities and application restrictions. No unverified illustration is invented if a drawing is unavailable.

The 540i support mount 26121226657 and loose bearing 26121225002 now have a narrowly scoped location association to the existing mounted center-support assembly. The association is supported by the saved 540i source and Bentley 260-1 Fig.1/260-7 Fig.10. It highlights the assembly location, **not exact measured CAD for either ordering number**. Unsupported models or parts are not assigned this location. No model, mesh, transform or catalog asset was replaced.

The same page now includes a written ten-step center-bearing replacement reference, with the shaft-removal sequence, tools/supplies, alignment marks, puller/press instructions, 4–6 mm forward preload, 21 Nm mount and 10 Nm sleeve values, plus the hardware-specific flange torque table. Original wording was checked against the supplied manual text and rendered pages 260-6–260-8; each dependency links back to the manual, including exhaust removal. The shared BearingServiceReference is also used by the existing bearing-inspection page, avoiding two divergent procedures. The original five-stage/16-check observation flow remains separate from a completed repair. The bolt-retained arrangement is not fully detailed by the illustrated circlip procedure; its matching hardware instructions must be established. A reviewed animated bearing repair, exact measured geometry and a universal vehicle-specific hardware match remain roadmap dependencies. Other covered components retain existing service/guide tool lists; missing coverage is not fabricated.

## Phone runtime

The private development server serves only the pinned CLIP vision config, preprocessor and 89 MB weight file from the Mac's checked cache. It is a development-only allowlist, outside public assets. No photo is transmitted to the Mac for inference. First use may transfer these model files over Wi-Fi.

The native viewer previously assumed SubtleCrypto, unavailable on LAN HTTP. Its manifest, catalog and GLB checks now use native SHA-256 where available and a pinned @noble/hashes 2.4.0 fallback otherwise. Digest comparisons and asset/version limits remain enforced. Known vectors, native/fallback equality and modified-byte detection are tested. HTTPS production retains its native path and all scanner release gates.

## Actual verification

Chrome on the Mac at the private LAN URL and a 390px viewport:
- Added photos two and three without a Keep angle action.
- Reloaded the whole page: all three photos, previous result and selected OEM record survived.
- Restored the selected source and 540i automatic reference.
- Loaded the complete driveshaft drawing and the existing car on the same page.
- Confirmed a selected model component, enabled focus and the source-backed assembly-location notice.
- Confirmed the old result remains visibly stale after another picture, rather than disappearing.
- Inspected the isolated bearing assembly and restored the whole car. Corrected the close-camera obstruction found during this check.
- Opened the written service reference and hardware-specific torque table under the model; verified a shorter mobile action bar.

Final checks: 436 unit tests in 47 files, 40 Python import tests, TypeScript, focused ESLint, isolated full SQL/RLS/restore, production build, 19 local production release checks and 32 HTTP security checks pass. Accepted model/catalog asset bytes remain unchanged. Full-repository inherited lint debt is not represented as passing. [Exact source/test receipt](mobile-flow-verification-2026-11-09.json).

These are browser/LAN and layout checks, not a claim that the new revision was physically exercised on the owner's Android phone. The owner must retest the updated flow. Recognition accuracy is unchanged from the earlier 3/9 coarse positive convenience result; this UX work does not certify exact-part recognition.

Run the preview from this worktree:

~~~sh
node scripts/prepare-scanner-runtime.mjs
node scripts/prepare-scanner-models.mjs
npm run dev -- --port 3010 --host 0.0.0.0
~~~

Computer: http://127.0.0.1:3010/scanner
Phone on the same Wi-Fi: http://127.0.0.1:3010/scanner

The model preparation script accepts an explicit cache path. Its current default reuses the existing E34 model cache, avoiding another download. Production does not expose the scanner-models route. The approved live site and accepted model bytes remain separate.

Release requirements remain: owner mobile acceptance; authenticated garage-save verification; broader recognition/confusable evaluation; part-by-part diagram/model/service coverage; applicable hardware and repair review; explicit approval of the tested batch before any push or publication.
