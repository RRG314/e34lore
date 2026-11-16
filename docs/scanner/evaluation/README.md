# Evaluation receipts

- `source-manifest.json`: seven independent reference photos and nine held-out query photos, source revisions/licenses/authors/hashes and rejected labeling evidence.
- `fetch-photos.py`: restores the private local corpus with strict source hosts and checksum verification.
- `evaluate.mjs`: actual pinned OWL-ViT then CLIP inference on local query photos, nine synthetic references kept separate, incremental result/latency/RSS output.
- `export-references.mjs`: creates the 16-reference runtime index and attributed image derivatives, then evaluates the mixed index. Each vector has 512 normalized values. This is an experimental category search, not exact OEM identification.
- `synthetic-only-results-9.json` and `mixed-reference-results-9.json`: observed outcomes from Node CPU. Detailed limitations and reproduction commands are in [models and data](../models-and-data.md).

Do not turn these tiny-sample category hit rates into calibrated confidence, automotive certification or mobile compatibility claims. None of the images is an E34 exact-OEM ground-truth label. No production data was used.
