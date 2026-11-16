# E34 and E30 shared platform

Both series use the same app shell, layouts, technical pages, scanner, Workshop renderer, Build Studio, account, garage, and community. Existing E34 URLs stay canonical. E30 technical pages use the `/e30` prefix. Shared account, garage, community and public-build URLs are canonical for both series. A link from a saved identification restores the correct series, catalog position and immutable 3D revision.

## Data ownership and future series

- The [series registry](../../src/series/registry.ts) supplies each series name, model choices, years, body types, default vehicle and reference. [The database registry](../../supabase/migrations/20261111191335_vehicle_series_registry.sql) supplies model identity and year bounds for source contexts, configurations and private records. Existing E34 IDs are preserved. Additional series use qualified IDs such as `e30-325i`.
- A canonical BMW number can occur in more than one series. Its ordering position belongs to a specific source catalog, assembly, vehicle configuration and callout. The inventory scopes searches by series, and saved scans validate the series against both the car and the source position. Imports retain source restrictions. Missing fitment remains unknown.
- Both series use the existing owner IDs, private vehicles, scan photo storage, builds, and community tables. The garage contains cars of either series. Existing access rules continue to govern reads, writes, and photo consent.
- Adding E28, E32, E36 or E39 uses the same page routes and member workflows. Each new series needs a registry entry, source-scoped catalog and manual records, a visual reference with its own coverage, and browser checks of the same scan, repair, garage and community journey.

## E30 review coverage

The first detailed reference is the 1991 325i coupe, M20 and manual Getrag 260. The available exterior source depicts a two-door car. The assembled pose preserves its artist proportions and triangle placement. It has 143 selectable meshes and surfaces. Both doors, inner shells, door cards, glass, mirrors, latches and hinges separate. Hood, trunk, roof, fenders, rear quarters, rocker trim, bumpers and lamps also separate. Earlier model revisions remain available through their saved links.

Nine E30 model-year/body selections contain 2,816 of 2,840 advertised catalog assembly pages, 52,751 source positions and 3,315 provider-hosted diagram records. They include 318i, 318is, 325e, 325i sedan/coupe/convertible, 325iX and M3. The model directory covers 13 families. Additional years, markets, Touring and other configurations still need original catalogs. The manual and repair pages use linked external sources and three draft authored guides. Quick reference uses the E30 sources available for each section. Physical measurements, a four-door 3D shell, smaller trim and E30-specific wheel presets remain open.

[1991 325i Coupe BMW parts index](https://www.bmwpartsdeal.com/1991-bmw-325i-coupe_e30-parts.html) · [BMW E30 Repair Manual, propeller shaft](https://e30mpower.com/index-all.html) · [Original exterior artwork](https://sketchfab.com/3d-models/low-poly-car-bmw-e30-1985-white-9dea494b447e442fafbddfc7eccbf158) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Rebuilding the local reference

Run [the read-only catalog export](../../tools/generations/export-e30-325i-catalog.sql) against the disposable review database. Save the JSON to `work/e30/catalog.json`. With the credited exterior and manifest already staged under `work/e30/assets/models/e30-lore/exterior-r1`, run `node tools/generations/build-e30-325i.mjs work/e30/catalog.json 1105`. A changed reference uses a new revision. The development server serves the checksummed manifests, geometry and catalog files from the same address. Build Studio registers local reference pins in the disposable backend.

## Local checks

The desktop browser verified 11 distinct body panel translations and their exact assembled positions after reassembly. It also opened the right door with its inner shell, trim and hardware, and changed the color of all 11 supported paint panels through Build Studio. A 390-pixel viewport loaded the Workshop without horizontal overflow.

The browser ran an unmarked historical center-support photograph through category identification, then opened the current E30 3D location after an explicit catalog selection. A separate gradient-background rendering remained unresolved. The same test account saved an E30 beside existing E34 cars, reopened the private scan photo and original pinned E30 revision, and posted and replied to an E30 repair discussion. Physical phone camera testing remains open.

Type checking, all 563 unit tests, the production build and the isolated database security and restore suite passed locally.
