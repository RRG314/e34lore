# Licensed category comparison — local review

Updated 10 November 2026. The original evaluation below was performed 9 November (UTC receipts dated 10 November). This is a category proposal system, not an exact BMW number recognizer. Nothing in this batch has been deployed.

## Reference library and policy

The current candidate uses 16 licensed photograph references with original source URLs, author/license records, derivative hashes and a pinned q8 image encoder. There are no retailer, member-upload or exact-OEM photo vectors in this index. A thrust bearing, vacuum-cleaner motor and bicycle brake are deliberate negative examples. The original frozen evaluation used 12 references. Installed engine photographs establish a category example, not exact component placement or fitment.

Every view must independently agree on the family, reach photo cosine similarity 0.80 and a different-family margin of 0.035, and have corroborating text comparison. Cosine values are not probabilities. All results retain `accepted: false`; the owner must select and check the actual catalog identity.

Original retailer research and reserved evaluation photographs remain private. The worker uses the same candidate policy in development and production builds; production publication still requires approval of this batch.

## Original frozen convenience evaluation

| Partition and policy | Positive cases | Correct proposals | Wrong proposals | Recall | Unknowns rejected |
| --- | ---: | ---: | ---: | ---: | ---: |
| Known regression, released text policy | 9 | 0 | 0 | 0/9 | 1/1 |
| Known regression, licensed candidate | 9 | 1 | 0 | 1/9 | 1/1 |
| Reserved examples, released text policy | 2 | 0 | 1 | 0/2 | 2/3 |
| Reserved examples, licensed candidate | 2 | 1 | 0 | 1/2 | 3/3 |

Top-one category ranking on the nine known positive examples improved from 3/9 to 6/9. Ranking and proposals passing the acceptance gates are different measurements. Precision is undefined when a policy makes no proposals. The candidate's two correct proposals with no observed false proposals are far too few to establish dependable population precision.

These are 15 convenience examples. File/pixel/perceptual-hash separation was checked against the 12 reference files, but physical-object independence and model-pretraining independence are unproven. Node CPU timing is not phone timing. No exact-OEM precision/recall, representative real-phone accuracy, damaged-part coverage or physical-device camera certification is claimed.

## Reproducibility and integration

- `tools/scanner/build-licensed-family-index.mjs` builds the pinned index from the licensed manifest.
- `tools/scanner/evaluate-licensed-families.mjs` scores the frozen partition; detailed private receipts are under `work/accuracy-review/scanner-evaluation/`.
- `node tools/scanner/evaluate-licensed-families.mjs --regression` writes a separate maintenance receipt under `work/accuracy-review/scanner-maintenance-regression/`. On 10 November it reproduced all 15 earlier policy outputs after the typed-result cleanup. These are historical regressions, with no newly reserved cases; the original freeze is unchanged.
- `data/scanner/licensed-family/provenance.json` records the media, policy and index hashes.
- `tests/scanner-licensed-families.test.ts` checks licensing, rejection, distinct category/exact metrics and comparison → photo-draft → restore integration for every reference, including the negative bearing.
- The browser integration check exposed and corrected an old stored-result schema that admitted only the prior experimental recognizer. Validation failure now produces a short recoverable message, never a raw validator dump or a false success status.

Before release acceptance, test complete real-phone sessions with independently identified parts, including unsupported objects, damaged parts, multiple angles of the same part, interrupted scans, repeat capture and reload. Expand the verified library before treating this as broad dependable identification.

## 10 November expansion check

The retained 12-photo baseline and current 16-photo library were compared using 18 unique queries: the original 15 historical regressions plus three additional convenience examples. Both policies proposed two of twelve positive cases, made no observed wrong proposals, and rejected six of six unknowns. There was **no recall gain**. Historical positive top-one ranking declined from 7/11 to 6/11. None of these figures certifies population precision or physical-phone accuracy.

The new evaluator `tools/scanner/evaluate-reference-expansion.mjs` freezes the input hashes before inference and rejects reference/query source-byte, decoded-pixel and near-perceptual duplicates. Duplicate and unsuitable candidate sources were excluded. Failed preflight directories are marked rejected; the valid receipt is `work/scanner-accuracy-20261110/final-unique-evaluation/`. The original freeze remains unchanged. See [the current model and journey review](../reviews/2026-11-10-scanner-525i-journey.md) for source limits and phone acceptance work.
