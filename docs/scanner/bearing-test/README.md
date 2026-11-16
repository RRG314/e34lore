## Superseded capture instructions

The current automatic-photo and same-page component workflow is documented in [the mobile correction](../mobile-flow-2026-11-09.md). The implementation/evaluation below records the earlier milestone; do not use its Keep angle steps for the updated preview.

---

# Bare-part scanner and bearing inspection — local test, 9 November 2026

This continues released E34 Lore in an isolated worktree. It is **not a scanner release or proof that a photograph establishes an OEM identity**. The next acceptance case is the owner's loose 540i center support bearing, without packaging or a readable number. No owner-part photographs have been supplied yet.

- Worktree: /local/owner/Developer/e34-scanner-repair-lab
- Branch: steven/scanner-bearing-local; base 1f6fcbe80b039a79a9d5bd7eb20107c800104271.
- Computer preview: http://127.0.0.1:3010/scanner
- Same-Wi-Fi phone preview: http://127.0.0.1:3010/scanner (the Mac's current local IP).
- Inspection: /workshop/repair?task=center-support-bearing&system=system%3Adriveshaft&reference=e34-540i-sedan-automatic
- Production remains Site 46. Scanner, interactive repair and experimental configuration are production 404s. No GitHub push, Sites sync, provider change, hosted migration or publication is part of this batch.

## Implementation

The previous runtime had no bearing category and analyzed only the active picture. The new comparison embeds up to three distinct prepared photos with the existing pinned CLIP vision encoder in one disposable worker. Frozen text prototypes cover 29 component families and six background/nonpart families. The bearing competes with a bare ball bearing, flex disc, CV joint, wheel hub, suspension bushing, engine mount and other components. Neither vehicle configuration, typed numbers nor the expected test answer enters inference. Reusing the active saved view does not add evidence; byte-identical reuploads count once.

Text vectors are generated offline with the matching pinned text encoder. The browser loads the 89,117,001-byte vision model for this comparison, avoiding the 155 MB detector. OCR and the older detector/photo-reference experiment remain separate optional tools. Model revision, weight SHA-256, taxonomy digest and vector artifact digest are in prototype-receipt.json. No training or probability calibration is claimed.

Weak similarities, competing classes, inconsistent views and leading nonparts leave identification unresolved. Every result has accepted:false for exact OEM identity. Engineering abstention cutoffs are not calibrated confidence thresholds.

A reviewed family reaches the existing canonical catalog, diagrams, manual, native 3D workshop, community and garage/journal paths. The saved 1994 540i source distinguishes centre mount 26121226657 from separate bearing 26121225002 (D=55/D=35 in that source). Transmission was unselected: the UI retains that limit and does not certify fitment. A chosen catalog record is recorded as a catalog comparison, with no invented observed marking.

The bearing inspection reuses the existing workshop and journey context. Five stages contain 16 original inspection/preparation checks derived from Bentley 260-1 and 260-4–260-8. Printed 260-7–260-8/PDF 267–268 were rendered and visually reviewed. Steps cover assembly versus bearing, location, observed damage, ordering evidence and repair preparation. Notes stay on this device, separately for each account/car/scan; they do not create a completed repair or publish a journal. Existing M50 water-pump repair and persistence remain intact. This is not a completed bearing replacement animation or registered backend repair plan.

Phone capture uses the native rear-camera file input on LAN HTTP; live video remains available on secure origins. Fixed insecure-context randomUUID, unavailable CacheStorage and Vite's rejection of the dynamically imported public ONNX factory. The development middleware serves only two named vendored runtime assets; production static serving and browser protections remain unchanged. Saved-view selection and detector crops now update both the displayed and analyzed photo. Processing stops on cancellation, car/account change, page hiding and unmount. Catalog lookup has a 12-second abortable deadline.

## Evidence and limits

evaluation-sources.json freezes ten private inputs, hashes, URLs and category labels: one retailer bearing photograph, eight other component photographs and one industrial-pump negative. These photos are evaluation only, not training or runtime references. The retailer image has **no redistribution license asserted** and stays in ignored work/, never public assets. Commons images retain existing provenance. Prompts were not changed after this evaluation.

The bearing ranked first in Node and real Chrome inference, but nearby alternatives were too close to resolve. Only **3/9 coarse positive top-one labels** matched across the convenience set. All ten exact identities were withheld. The industrial negative remained unresolved despite a bearing appearing in its similarity list. This demonstrates why production recognition stays held. See evaluation-results.json for scores and timing.

Chrome loopback comparison took about 1,215 ms with cached files; the LAN HTTP path completed in about 4,147 ms at a mobile viewport. Two-image inference returned a two-view unresolved result. These are Mac/Chrome measurements, **not physical phone acceptance**. Actual camera, memory and accuracy checks on the owner's phone remain outstanding. JavaScript-string evaluation remains prohibited; React's development debugging emits its known eval/CSP warning.

## Owner's first phone test

1. Keep the Mac running this preview and use the same Wi-Fi on the phone. Open the phone URL. No account or vehicle selection is required for the blind shape test.
2. Remove the box from view. Put the bearing on a plain surface in even light. Tap **Take photo** for a complete front view, then **Keep this angle**.
3. Take and keep a back view, then take a side view showing bracket depth and mounting points. Tap **Compare part shape**.
4. Record the ranked families and unresolved status before checking the known answer. Only then compare rubber, bracket and bore with the catalog. If the phone produces an unsupported image format, use JPEG or its supported gallery picker.
5. Try a nonpart or another automotive part. Any confident exact bearing/OEM assertion is a failure. Asking for another view or measurement is valid when photos cannot distinguish it.
6. Choose the real car for catalog/garage navigation. Open guided inspection and source pages. Reference links open another tab to preserve scanner photos. Save an account observation only after independently checking it.

Stage criteria: usable capture/crop/rotation/three-view controls; no box/number requirement; no false OEM or fitment claim; cleanup/cancellation; correct source/model/car context; no production exposure. One successful owner example does not certify broad E34 recognition or authorize release.

## Reproduction

From this worktree with the existing dependencies:

~~~sh
node scripts/prepare-scanner-runtime.mjs
npm run dev -- --port 3010 --host 0.0.0.0
npm run typecheck
npm test
npm run test:import
npm run build
~~~

The separate local production check is port 3011; it is not the phone test. Scanner and repair routes must remain 404 there, including the bearing task.

~~~sh
node --experimental-strip-types tools/scanner/build-family-vectors.mjs work/bearing-test/model-cache
node tools/scanner/fetch-family-evaluation.mjs work/bearing-test
node tools/scanner/evaluate-families.mjs work/bearing-test work/bearing-test/model-cache
~~~

The existing cache at /local/owner/Developer/e34-collective/work/scanner-evaluation/model-cache can be supplied to avoid another download. Fetching fails on changed hashes. Future training/reference and calibration photos must stay separate from evaluation and the owner's held-out example.

Technical sources: [pinned CLIP model](https://huggingface.co/Xenova/clip-vit-base-patch32/tree/6b7c523703ae26e39be4b03774966f8571c7f523), [Transformers.js API](https://huggingface.co/docs/transformers.js/api/models), [Vite middleware](https://vite.dev/guide/api-plugin.html#configureserver). Code uses installed Transformers.js 4.3.2.

## Remaining release dependencies

- Owner bare-bearing images and physical phone tests, including damaged parts and confusables.
- Larger independent recognition evaluation; current coarse CLIP results do not justify release.
- Independently measured/marked OEM identity, vehicle fitment and retailer listing validation before an exact purchase recommendation.
- A reviewed full bearing repair plan, hardware applicability, persistence registry/tests and verified geometry before replacement animations or repair-completion recording.
- Explicit owner acceptance before GitHub backup or publication.

## Final verification

423 unit tests in 43 files, 40 Python import tests, typecheck, the production build, 18 production release HTTP checks and 32 security HTTP checks passed. Focused ESLint for the changed scanner/inspection/runtime/tool modules and git diff whitespace checks pass. Full-repository inherited lint debt remains; this is not a full lint pass. No accepted model/catalog assets changed. The first build ran out of disk; after stopping stale previews and removing superseded generated builds, the final build passed. The exact working-source file hashes and browser evidence are in verification.json.
