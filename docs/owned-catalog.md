# Parts catalog

The catalog joins canonical BMW part numbers to their positions in source assemblies. Keep body, production date, market and equipment restrictions with each ordering observation. A catalog lookup should never infer VIN fitment from a model-year selection.

The demo contains one synthetic cooling assembly per series. To import real records for a separate deployment, use source data you have permission to use. Work from a separate asset pack and preserve source URLs, record hashes and corrections.

## Tables and search

- `parts` remains the canonical identity table. Legacy curated IDs are preserved; newly observed IDs use `bmw-<number>`.
- `vehicle_catalog_contexts` identifies explicit source selections. Unknown body, engine and market are nullable; missing values are never invented.
- `assemblies` extends the existing table with context, category and catalog status.
- `part_assembly_positions` separates each source ordering observation from canonical identity. Alternatives at one callout retain independent quantities, conditions, source hashes and stable IDs. Superseded observations can be archived without breaking linked discussions.
- `part_supersessions` stores direct, source-scoped replacement observations. Replacement relationships do not imply transitive interchange.
- `technical_drawings` accepts a local image or an allowlisted external source image, with source attribution, original coordinate system and selection anchors. External artwork rights remain separate from factual catalog records.
- Private import receipts and position history remain inaccessible to browser clients.

`catalog_inventory` is a security-invoker view. `catalog_find_parts` provides bounded, stable number/position cursors within a source selection. `catalog_search_parts` limits distinct identities, so a frequently repeated fastener cannot consume every result. It also resolves exact archive-only numbers. Both RPCs use the caller's read permissions; browsers have no catalog mutation grant.

## Import

The Python tools under [tools](../tools) normalize records and register source evidence. Keep source snapshots and raw provider material outside Git. A newer import must keep existing canonical IDs and archive superseded positions so earlier links still resolve. Verify search, assembly drawings, and position links against the imported data before release.
