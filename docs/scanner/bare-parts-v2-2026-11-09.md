# Bare-part scanner v2 — local phone review

Branch `steven/scanner-bare-parts-v2` extends released source `589ba7282bc68296580d8b790c4dd25d6e77b25c`. Site 47 and its released category-comparison behavior remain unchanged. No push, source synchronization, publication, hosted migration or real member fixture was performed. New geometry and exact-part experiments have not been enabled in production.

## Follow-up batch

[Continuation review](continuation-review-2026-11-09.md) records the subsequent OCR/provenance/race fixes, source-integrity audit, two licensed used-housing views, Part scanner navigation, walkthrough presentation and 525i automatic default. Current library: nine licensed family photos, six exact-number links, fourteen local photo prototypes across eleven families. The known regression remains 6/9. Original milestone counts below are historical.

## Connected flow

1. Camera capture or gallery upload keeps one to three photos in the existing account-scoped device draft. Existing reload recovery, selected catalog record, notes, OEM drawing, native car context, service reference and private garage metadata contract are retained.
2. Local v2 fits the entire image into the encoder input. It no longer silently center-crops mounting ears, connectors or broken edges. Edge-median padding preserves aspect ratio; it does not fabricate the hidden part.
3. Pinned q8 CLIP vision embeddings are compared with independently generated FP32 text prototypes and separately recorded photograph references. Strong photograph leads require supporting text evidence in every supplied view. Conflicting views, strong non-part evidence, low scores and disagreements abstain. Thresholds are engineering review rules, not calibrated identification probabilities.
4. The lead family opens its feature review automatically without recording a user confirmation. Selecting an OEM number still requires a person. Existing source conditions and fitment checks remain authoritative.
5. The same scan reads text across all kept photos, sequentially with one local Tesseract worker. Full eleven-digit marks can be checked against the existing canonical catalog. Partial/casting/supplier text stays visible but never gains an inferred prefix or O/0 substitution. Unclear readings are collapsed. A number from a previous text pass is not left as a current OCR match. Automatic text reading preserves an already chosen part.
6. Raw recognized text is retained only in the same bounded device draft, with per-photo IDs, revision, confidence and timing. Existing 24-hour expiry-on-open and account isolation apply. It is neither sent to a recognition service nor saved in garage evidence, analytics or training data. Owner selection and supported metadata still use the existing observation table; no new account/garage database exists.

The local label distinguishes this test from the public scanner. Recognition and extra-angle diagnostics are secondary to the actual result. The compact result flow keeps the complete OEM diagram, selected native car location and written bearing-service tools/steps together.

## Shared catalog evidence

`data/parts-media/manifest.json` and `src/servicing/part-media.ts` provide one validated media registry for scanner examples, OEM catalog details, the original part reader and the selected native workshop component. Seven attributed licensed photos are category examples; none is relabeled as an exact BMW SKU. Six source links explicitly identify full BMW numbers, but their photos are not copied into the website. Existing purchase offers, interchange, source drawings, guide revisions and owner observations remain in their established systems.

The read-only public inventory observed 24,393 part/reference records, including 24,324 eleven-digit records and 69 unnumbered references. Excluding the reserved `00000000000` identity leaves 24,323 numbered identities. It also observed 105,344 active source positions, 5,476 drawing records and 12 source selections. These counts are not claims of complete physical fitment or a complete photograph library. The [per-evidence coverage report](../parts-evidence-coverage.md) makes the major photo/guide/model gaps explicit.

Three observed 1994 540i pages were fetched under the existing robots/rate/size/source-contract checks: engine block mounting parts, ski-bag components and round electrical sockets. They add 49 positions and four drawings. The local merged candidate contains all 390 observed source assemblies, 7,739 positions and 458 drawings. It retains the existing context/canonical identities and produces the existing transactional SQL format. It is staged under ignored `work/part-evidence/540i-complete-candidate`; no hosted import has been applied and accepted model bindings/snapshots have not been rewritten. The same recovery was completed for the remaining source gaps: all 39 pages, 767 additional positions and 50 drawings across ten selections are staged locally. Together with the two accepted complete selections, all twelve saved source indexes have full local page coverage. See [recovery](../catalog-gap-recovery-2026-11-09.md).

## Measured recognition limits

The frozen original ten-image set is now a **known regression set**, not independent accuracy. Broad positive top-one classification improves from 3/9 in the released baseline to 6/9 with whole-photo framing and text precision. Four correct regression leads meet the stricter review rules; three wrong positive leaders and the industrial negative remain unresolved. A separate reserved retailer bearing photo leads with the correct family and reaches review. Every result remains `accepted:false`; none establishes an exact OEM identity.

| Query | Leading family | Review status |
| --- | --- | --- |
| Center support bearing | Center support bearing | Review |
| Engine bay | Engine | Unresolved |
| Alternator | Alternator | Review |
| Cutaway alternator | Starter | Unresolved |
| Brake calipers | Brake caliper | Review |
| Cutaway filter | Oil filter | Review |
| Spark plug | Spark plug | Unresolved |
| Broken thermostat housing | Shock absorber | Unresolved |
| Industrial pump negative | Center support bearing | Unresolved |
| Water pump | Loose bearing | Unresolved |
| Reserved retailer bearing | Center support bearing | Review |

These are convenience photos, not the owner's physical bearing. Source hashes and evaluation partitions exclude the evaluation images from the reference index. The reserved photo was first evaluated after the initial hybrid policy was frozen. Subsequent corrections excluded a source line drawing mistakenly classified as a photo and tightened non-part rejection; they did not tune thresholds to the reserved photo. A simple dHash comparison found no identical bearing image (17–24 differing bits versus the regression bearing); this does not establish independent photographers or prove absence of shared imagery.

The local index has twelve real-photo prototypes across eleven families. Five retailer references remain private research material with no redistribution license asserted; seven existing licensed family photos retain their attributions. One wheel-hub line drawing is explicitly excluded from photo retrieval. Original retailer images and the local prototype index are absent from production assets/routes. No owner scan photo has been used as a reference or training example.

FP32 vision and a pinned SigLIP2 q8 comparison did not justify heavier phone downloads and were rejected. The phone keeps the existing approximately 90 MB vision model. Only offline text prototype generation uses the larger FP32 text weights. Rebuilding the 35 text vectors reproduced every coordinate exactly. The new local reference index is approximately 516 KB.

## Verification and remaining acceptance

Typecheck, 451 tests/52 TypeScript files, 40 Python import tests, focused authored-file lint and production build pass. Browser checks cover actual local comparison, two/three-photo keeping, OCR over a clearly labeled synthetic typography fixture, full/partial mark distinction, actual catalog lookup, reload recovery, stale-mark clearing, chosen-part preservation, the complete 540i diagram/native bearing location/manual handoff and 390px layout without horizontal overflow. Synthetic typography validates OCR software only; it is not a real part-recognition result. No synthetic owner car, service record or scan was inserted into hosted data.

The restarted final production-style preview passes 24 release-boundary checks, 33 security HTTP checks and 75 route/data checks. Its served scanner JS/CSS entries are byte-compared with the final build. The 2,438 production text assets exclude private prototype vectors, the local comparator version, the lab endpoint and preview controls; local reference paths return 404 in production. A stale preview process was found referring to the prior build’s assets and was stopped before the final checks. Future production-style tests must restart after a rebuild. Receipts are in ignored `work/scanner-v2/`; the companion source/coverage records contain no credentials.

**Pending:** owner's Android Chrome test on the actual bare 540i bearing; photographed worn/broken examples and hard negatives across additional families; permissioned exact-number multi-view product photos; expert identity labels; independent calibration; complete per-variant fitment, service and geometry coverage. Scanner reliability for arbitrary broken parts is not complete and is not approved for release.

## Reproduce locally

```sh
node --experimental-strip-types tools/scanner/build-family-vectors.mjs ../e34-collective/work/scanner-evaluation/model-cache work/scanner-v2/fp32-prototypes.json fp32
node tools/scanner/build-bare-part-references.mjs
node tools/scanner/evaluate-bare-parts.mjs
node tools/snapshot_public_part_inventory.mjs
python3 tools/audit_part_evidence.py
node scripts/prepare-scanner-runtime.mjs
node scripts/prepare-scanner-models.mjs
npm run dev -- --port 3010 --host 0.0.0.0
```

Local files listed by `data/scanner/local-v2/sources.json` and the frozen hashed regression inputs must be present; missing sources fail instead of substituting training/evaluation images. Research originals remain in ignored work folders. Do not copy the model cache or reference photos to public assets. The builder verifies source hashes, shared media links and evaluation separation.

At this check the phone URL is `http://127.0.0.1:3010/scanner` on the same Wi-Fi. Keep this computer awake. Photograph the bare mount from front, back and side; keep both mounting ears and the opening in view. Press Scan, review the suggested family, then choose the source record to inspect its diagram, location and service reference. Check any detected text independently. Actual physical dimensions and fitment are not inferred from the photo.
