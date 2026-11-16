# Independently maintained E34 catalog

The catalog uses the project's own PostgreSQL database. A monthly catalog API is not a dependency. Existing curated parts, sources, figures, discussions and owner records remain in place. Import jobs reuse canonical OEM identities by their full eleven-digit number and preserve existing IDs.

## Two source contracts

The public BMWPartsDeal model-year/body or engine selections provide assembly ordering observations: full numbers, source descriptions, installation and package quantities, production/equipment notes, explicit replacement links, source drawings and original callout rectangles. A source selection is not VIN-specific fitment. Market and engine remain unknown when the source does not establish them. A selected model year is not an inferred production date.

The separate, pinned community ETK export provides an identity index: 24,236 explicit full identifiers from105,331 numeric source rows. Two blank placeholders are rejected. Each number has an explicit four-digit prefix and seven-digit suffix; the importer never guesses a prefix from a drawing or converts an incomplete identifier into an orderable number. Existing canonical records gain archive evidence without losing their names, IDs or curated detail. New archive-only identities remain `reference-only`.

The export contains127 source vehicle variants and2,074 diagram references, including non-U.S. engines, diesel,525iX andM5 Touring. Its exporter omits some option-condition tables. Consequently these type-code associations are retained as provenance, not imported as confirmed physical fitment. Archive ordering conditions, artwork and CAD are not published by the identity job. Software licensing is not treated as an artwork/data license. The archive and its normalized identity export stay in ignored private storage. Catalog developers should use the reviewed import tools with data they have permission to use.

Pinned archive revision: `16a2ec76850fd70d24a6376aadfe179f310008b9`.
Archive SHA256: `ef3a8ea9b7072d1c7a15ef9e08b4dba30bb4a7894ebd36a0c3db34be64917228`.
The public source URL and exact audit counts are retained in `data/archive-identities/manifest.json`. The source-contract research is retained locally in `outputs/catalog-research/BULK_E34_SOURCE_REVIEW.md`. A changed archive revision requires format review and a new immutable source registration.

## Tables and search

- `parts` remains the canonical identity table. Legacy curated IDs are preserved; newly observed IDs use `bmw-<number>`.
- `vehicle_catalog_contexts` identifies explicit source selections. Unknown body, engine and market are nullable; missing values are never invented.
- `assemblies` extends the existing table with context, category and catalog status.
- `part_assembly_positions` separates each source ordering observation from canonical identity. Alternatives at one callout retain independent quantities, conditions, source hashes and stable IDs. Superseded observations can be archived without breaking linked discussions.
- `part_supersessions` stores direct, source-scoped replacement observations. Replacement relationships do not imply transitive interchange.
- `technical_drawings` accepts a local image or an allowlisted external source image, with source attribution, original coordinate system and selection anchors. External artwork rights remain separate from factual catalog records.
- Private import receipts and position history remain inaccessible to browser clients.

`catalog_inventory` is a security-invoker view. `catalog_find_parts` provides bounded, stable number/position cursors within a source selection. `catalog_search_parts` limits distinct identities, so a frequently repeated fastener cannot consume every result. It also resolves exact archive-only numbers. Both RPCs use the caller's read permissions; browsers have no catalog mutation grant.

## User journeys

`/parts` and `/parts/catalog` open the main catalog. Vehicle selection leads to system groups, illustrated assembly cards, source drawings and complete source tables. Multiple candidate numbers at a callout remain visible as alternatives. The viewer preserves pan, pinch/wheel zoom, focus, in-plane rotation, fullscreen and keyboard selection. Original360-degree relationship models and manual figures remain available through `/parts/reference` and existing deep links; they are not represented as factory CAD for every catalog assembly.

Part selection exposes numbers, quantity distinctions, production/equipment notes, direct replacements, other source occurrences, corrections, bookmarks, question handoff and garage installation records. A question carries a composite position/part reference enforced by the database. Archive-only records have a separate source card; they do not inherit an unrelated vehicle catalog selection. Catalog search, global search, bookmarks and installed-part links all resolve the same canonical IDs.

CSV exports quote source text and neutralize spreadsheet formula prefixes. JSON exports preserve identifiers as strings and include all source alternatives and provenance. They are assembly records, not an automatically verified shopping list.

## Reproduce and resume

Run from the checkout:

```sh
python3 tools/run_catalog_queue.py --inventory data/catalog-sources/source-route-inventory.json --work-dir outputs/catalog-queue
```

The queue uses only observed public routes, robots rules, bounded concurrency and a shared request interval. It does not execute source scripts, call private commerce APIs, import prices/user state or solve access challenges. Raw HTML stays outside `public` and `src`. Failed pages remain coverage gaps.

Normalized facts can be packaged with `tools/package_catalog_snapshot.py`, then restored with its `--unpack` option. SHA256 checks cover both the compressed payload and normalized facts. Generate transactional SQL with `tools/generate_catalog_import.py`; apply only the explicit ordered files in `load-plan.json` through the project's administrative database connection. No privileged credential belongs in the frontend or checked-in scripts. Reapplying the same source preserves canonical identity, source positions and history; rollback-only integration checks verified this contract, including replacement-description enrichment.

`tools/import_archive_identities.py` validates the separately staged archive against its registered revision/hash and compiles only explicit factual identities. the private normalized identity file is the normalized identity backup. The original ZIP, images, line-validity and hotspot sidecars remain outside published assets.

After successful loads, run `node scripts/catalog-inventory.mjs` to record exact counts in `data/catalog-snapshots/inventory.json`. The home-page count is built from that snapshot. Count unique image URLs separately from per-selection drawing records; shared drawings must not be advertised as distinct illustrations.

## Remaining work

The canonical number index is broad; complete current BMW fitment is not established. Reconcile the archive's condition semantics, missing option tables, discontinued/supersession observations and source conflicts before publishing complete application claims. Expand reviewed repair procedures and dimensional CAD independently. Public artwork redistribution and production Auth/email operation remain separate launch dependencies.

## Historical nine-selection inventory

Superseded by the anonymous public read recorded in [shared evidence coverage](parts-evidence-coverage.md): 24,393 rows, 24,324 numbered rows including the reserved placeholder, 105,344 active positions, 5,476 drawings and twelve source selections. The 39 missing pages in the accepted snapshots are now recovered in **local staged candidates**, without a hosted import. Counts below are retained as a historical load receipt.

The latest recorded load contains 24,324 unique BMW numbers and 79,733 active source-position records across nine selections. The 4,074 per-selection drawing records reuse 901 distinct source image URLs. Four pages previously unavailable through a gateway error were recovered. Their factual rows and receipts preserve exact source hashes. Twenty-nine observed routes remain open.

| Source selection | Registered pages | Position records |
| --- | ---: | ---: |
| 1991 525i · body unspecified · M50 | 393/397 | 10482 |
| 1991 525i · body unspecified · M20 | 375/379 | 8886 |
| 1994 525i Sedan | 397/397 | 10541 |
| 1995 525i Touring | 372/376 | 8096 |
| 1994 530i Sedan | 385/389 | 7918 |
| 1995 530i Touring | 378/381 | 7620 |
| 1993 535i Sedan | 386/390 | 10402 |
| 1995 540i Sedan | 387/390 | 7901 |
| 1993 M5 Sedan | 326/329 | 7887 |
