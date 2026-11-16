# Local catalog source recovery

This batch extends the current catalog rather than creating another identity database. The accepted snapshot audit found 39 missing observed source pages across ten of the twelve saved source selections. These are holes in the project's current source-index coverage, not a claim that twelve catalogs cover every E34 market, year, engine, gearbox or factory option.

Recovery reuses `tools/fetch_catalog_sources.py` and `tools/import_public_catalog.py`: observed routes only, robots checks, one worker, a shared one-second request interval, response-size limits, E34 source context validation and bounded page parsing. No private retailer APIs, user sessions, checkout, prices, executable source code, bulk artwork download or access-challenge bypass is involved. Raw pages remain in ignored local staging.

`tools/stage_catalog_gaps.py` verifies accepted/recovered byte hashes, rejects repeated pages, checks the complete route set and exact vehicle context, and verifies the resulting canonical context ID. It merges original accepted pages with the recovered facts and generates the existing transactional SQL format. It **does not connect to a database or execute SQL**. Existing canonical IDs, conditions, source quantities, replacement edges, drawings and source callouts are preserved by the established importer contract. Recovered descriptions are source facts, not reviewed fitment or complete repair instructions.

Local job receipts, raw snapshots, normalized facts, per-context complete candidates and reviewable SQL are under `work/part-evidence/`. `catalog-candidates/receipt.json` records actual recovered-page, additional-position and drawing counts and immutable candidate fact hashes. The original accepted snapshots and native model catalog hashes remain unchanged. The website still reads the current hosted catalog; no hosted import or publication was performed.

To regenerate validated candidates after fetching and normalizing the observed missing pages:

```sh
python3 tools/stage_catalog_gaps.py
python3 tools/audit_part_evidence.py
```

The shared evidence audit continues reporting accepted snapshot gaps separately from recovered/staged coverage. Full physical fitment, product-photo rights, exact geometry and complete repair procedures need separate evidence; catalog artwork is not an individual-part photograph. See [shared evidence coverage](parts-evidence-coverage.md), [owned catalog contract](owned-catalog.md) and [local scanner acceptance](scanner/bare-parts-v2-2026-11-09.md).

Actual recovery completed with no fetch/normalization errors: **39 pages, 767 additional source positions and 50 drawing records across ten selections**. Those ten complete candidates contain 3,802 assemblies, 84,924 positions and 4,512 drawings. With the two previously complete accepted selections, all twelve saved source indexes have complete local page coverage. These are staged factual imports; the browser and hosted database still use the accepted catalog. Python syntax checks, the existing 40 importer tests and actual per-context hash/route/context/ID validation pass.
