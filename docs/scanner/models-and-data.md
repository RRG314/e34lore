# Scanner models, image rights and measured limitations

8 November 2026. The implemented browser scanner can run genuine OCR, object-detection and embedding inference. The visual recognizer is **not validated for public automotive identification**. The measured errors below justify keeping visual inference behind the existing staff/MFA release gate. A category match must never become an exact BMW part number or compatibility claim.

## Pinned models and runtime

| Subsystem | Exact source | Payload | License and decision |
| --- | --- | ---: | --- |
| Open-vocabulary region proposals | `Xenova/owlvit-base-patch32` at `b75f4e52949639c3bb0b96546ea4149482f6e7ef`, `onnx/model_quantized.onnx` | 155,431,700 bytes | Upstream Google OWL-ViT Apache-2.0; the conversion card links that base but omits a license tag. Actual inference returns boxes and text-query scores; these scores are not calibrated OEM confidence. |
| Image embedding/retrieval | `Xenova/clip-vit-base-patch32` at `6b7c523703ae26e39be4b03774966f8571c7f523`, `onnx/vision_model_quantized.onnx` | 89,117,001 bytes | MIT, as declared by this pinned conversion card and upstream CLIP. Image-only projected output is a 512-element vector. Normalize it and compare cosine similarity with independently labeled references. |
| Runtime | `@huggingface/transformers` 4.3.2 | Downloaded lazily by the app's inference worker | Apache-2.0. CPU measurements below use Node ONNX Runtime, not browser WebAssembly or WebGPU. |

The downloaded detector SHA256 is `06af49bd5db977936bcddad2b45d0031072673517579d15b8cb42bf015a94156`; the vision encoder SHA256 is `583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299`. Both were checked against the actual local files and Hugging Face's immutable-revision LFS metadata. Tokenizer/configuration files add to those weight sizes. No remote inference service receives the photographs.

Primary sources: [Google OWL-ViT model card](https://huggingface.co/google/owlvit-base-patch32), [pinned browser conversion](https://huggingface.co/Xenova/owlvit-base-patch32/tree/b75f4e52949639c3bb0b96546ea4149482f6e7ef), [pinned CLIP conversion](https://huggingface.co/Xenova/clip-vit-base-patch32/tree/6b7c523703ae26e39be4b03774966f8571c7f523), [CLIP source/license](https://github.com/openai/CLIP), [Transformers.js](https://huggingface.co/docs/transformers.js).

OWL-ViT is preferable to a tiny COCO detector for this experiment because the requested component categories are not COCO classes. `Xenova/yolos-tiny` q8 is only 9,661,148 bytes, but it cannot establish that an object is a water pump or alternator. MobileCLIP might reduce resource requirements, but an audited, compatible model conversion and matching browser runtime were not established in this milestone. No such replacement is claimed to work. Segmentation and calibrated automotive fine-tuning remain open; no segmentation mask is fabricated.

## Reference data and rights

[The source manifest](evaluation/source-manifest.json) freezes **16 real photos**: seven reference-only photographs and nine held-out query photographs. It records source-page revisions, authors, licenses, license links, downloads, hashes, viewpoints, label provenance and review status. The labels are source-described/visually reviewed categories, not expert-verified part identities. None establishes an E34 part number or fitment.

The seven public reference derivatives are resized to at most 320 pixels, JPEG re-encoded without EXIF and kept under their original licenses. One Chevrolet Bolt photograph is cropped to its visible caliper. [Public image credits](/scanner/REFERENCE-CREDITS.md) and the `provenance` entries in `/scanner/reference-index.json` preserve attribution, license links and the changes. CC BY-SA derivatives retain their source share-alike license. No photographer endorsement, trademark grant or engineering approval is implied. The source of a rejected Nissan rotor close-up is retained in the manifest: its filename suggested a caliper, but visual review did not support that label.

The runtime index holds seven real-photo references plus nine separately flagged **synthetic r14 model thumbnails**. References map to canonical workshop node IDs for category navigation only. `exactOemVerified` is false. Existing synthetic component credits and geometry limitations remain applicable. References and held-out queries have different source photos, photographers and physical examples; no query photo was used to create its reference vector. This is a small convenience sample, not a representative dataset, and undiscovered pretraining overlap is unknown.

No user images, private garages, VINs or production scan records were used for this evaluation. Reference source descriptions deliberately include non-BMW Chevrolet, Citroën and Nissan parts so visual category evidence cannot be mistaken for E34 compatibility.

## Actual inference measurements

All runs used Node v22.23.4, Transformers.js 4.3.2 and native ONNX Runtime CPU with two intra-op threads on an Apple M1 Mac with 8 GB RAM. All images were processed locally. These figures are **not mobile-browser measurements**.

| Run | Primary-category top-1 hits | Category visible among top five | Industrial negative falsely accepted |
| --- | ---: | ---: | ---: |
| OWL-ViT, threshold 0.1 | 1 / 8 | 3 / 8 returned boxes | 1 / 1 |
| CLIP, nine synthetic references only | 1 / 8 | 5 / 8 | 1 / 1 at cosine 0.5 |
| CLIP, seven real + nine synthetic references | 4 / 8 | 7 / 8 distinct categories | 1 / 1 at cosine 0.5 |

These are observed primary-category hits, not exact-part accuracy, localized detection precision/recall or population estimates. The detector can identify other visible objects in an installed scene; this sample has no expert bounding-box ground truth, so IoU, object-level precision and recall are unavailable. Its five boxes may repeat a category. The retrieval top-five comparison deduplicates categories. Thresholds 0.1 and 0.5 were uncalibrated probes; they were not tuned on these held-out outcomes. Calibration error and exact-OEM top-1/top-5 are unavailable because verified identity/confidence ground truth does not exist here.

The mixed reference run improved coarse category retrieval but still gave incorrect first matches for the M50 engine bay, cutaway alternator, thermostat housing and Citroën water pump. The Chevrolet alternator's correct category led its next category by only 0.004 cosine. The industrial pump image also matched an automotive category. Cosine scores around 0.7–0.8 therefore do not justify a verified identity, a percentage confidence, automatic saving, or an OEM part assignment.

| Performance measurement | Observed result |
| --- | --- |
| Detector inference, nine-image rerun | 342–363 ms/image, median 352 ms |
| CLIP image inference, synthetic-only | 32–47 ms/image, median 38 ms |
| CLIP image inference, mixed-reference run | 31–43 ms/image, median 39 ms |
| Peak process RSS, sequential detector then CLIP | 660,739,136 bytes (about 630 MiB) |
| Peak process RSS, CLIP-only mixed-reference process | 338,118,400 bytes (about 322 MiB) |

Peak RSS includes the process, native runtime and loaded assets; it is not model-only GPU or WASM memory. A separate first eight-image run peaked at 705,696,256 bytes. Disposal does not prove that a runtime returns all allocated memory to the OS. Terminating the inference worker between model stages is preferable on memory-constrained phones. Warm CPU throughput does not certify cold downloads, Safari memory limits, WebGPU, thermal behavior, rear-camera capture or continuous recognition.

Machine-readable receipts: [nine-image detector/synthetic run](evaluation/synthetic-only-results-9.json), [mixed-reference run](evaluation/mixed-reference-results-9.json), and [earlier eight-image run](initial-vision-evaluation.json). Latencies are actual observations, not service-level targets.

## Reproduce and extend

Run from the existing repository with its installed, pinned dependencies:

```sh
python3 docs/scanner/evaluation/fetch-photos.py work/scanner-evaluation
node docs/scanner/evaluation/evaluate.mjs work/scanner-evaluation
node docs/scanner/evaluation/export-references.mjs work/scanner-evaluation
```

The fetcher accepts only Wikimedia upload/thumbnail hosts, checks all image hashes and fails if an upstream image changes. Evaluation writes to ignored `work/scanner-evaluation`; the export command intentionally regenerates the public reference index, derived thumbnails and credits. Review its diff before a release. Tests must never call the live collector or save fabricated scans to production.

Before broader release, acquire permissioned, multi-angle E34 component photos with verified component and OEM labels, separate vehicles/physical parts/near-duplicates across reference/training/calibration/test partitions, include difficult incompatible and unrelated negatives, and annotate detection boxes where localization is evaluated. Preserve reviewer evidence. Add category references and evaluate held-out performance before expanding the public recognition claims. Current software can report unknowns and support manual markings/catalog evidence; this experiment does not remove the dataset and hardware verification requirements.
