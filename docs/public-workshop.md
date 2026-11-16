# Public interactive workshop

**Local preview update, 7 November:** the unpublished catalog/account branch extends this deployed r13 baseline with 450 source-bound component mappings, assembly-stage separation and account reliability fixes. See [the preview report](workshop-catalog-preview.md) for verification and explicit reconstruction limits. The four-mapping description below records the v32 public baseline, not the new preview.

The public `/workshop` uses the existing site shell, typography, colors, catalog, guide and discussion components. It loads a read-only r13 vehicle reference natively with the host’s existing Three.js version. There is no second React framework, embedded author application, local API transport or credential in the published model.

## Model and selection

`data/digital-twin/public-reference.json` pins the source commit, model revision, public manifest hash and runtime budget. `scripts/publish-reference-model.mts` exports only explicitly cleared active runtime GLBs and actual mesh thumbnails from the dedicated reconstruction repository. Content-addressed files are immutable; old receipts and unpromoted candidates are preserved separately. There are 501 graph nodes, 19 systems and 450 rendered instances across four GLBs totaling 5,466,324 bytes, plus 447 distinct component thumbnails. The licensed body/cabin retains its CC BY 4.0 attribution and original texture atlas. No manual scan or unlicensed catalog artwork is included.

R13 corrects the artist body’s longitudinal axle datum, ground/arch fit and body width below the mirrors. Nominal 205/65 R15 tires, 2.761 m wheelbase and 1.470 / 1.495 m tracks are unchanged. Five small structural holes are repaired with six faces. The source pipeline verifies actual compressed tire silhouettes against panel faces and retains separate visual body-envelope checks for 408 internal groups. This does not certify factory panel dimensions, manufacturing seams, suspension travel, pairwise packaging or physical repair clearance.

Clicking a mesh opens its details automatically without losing the assembly context. Desktop details sit beside the model; phone details follow the viewport and scroll into view. A repeated click on the same selected part also reveals the panel. Name, BMW number, copy control and catalog link precede the component thumbnail. Search supports component names, instance IDs, canonical IDs and formatted OEM numbers. Focus, Isolate, Show all and Hide/Show part remain visible. Direct part links preserve the selected node; saved views also pin the model revision. Search results open the selected component in isolation so it is visible even when found from another system or a seated view.

Four established OEM identities currently connect geometry to the live catalog: coolant pump 11517527799, thermostat housing 11531722531, filter element 11421730389 and filter housing 11421738640. Unknown numbers are labeled honestly. Canonical IDs resolve existing notes, guide relationships, community composer context and `WhereToBuy`. The public parts lookup is bounded/abortable and rejects a mismatching number. Affiliate offers still require the existing approval and publication gates; no publishable offers were returned in the anonymous verification.

## Viewing and persistence

Orbit works across both axes with zoom/pan. Camera presets, seated cabin look/zoom, body transparency/hiding, system scopes, selection/isolation and expand mode are visitor controls. Exploded separation is a held slider value, never a timed loop. Input cancels camera fitting. Rendering is demand-driven and shared geometry, textures, materials and controls are disposed on unmount. Each GLB’s bytes and SHA-256 are checked before decoding; invalid or missing content produces a retry view.

Named views use bounded, revision-aware local storage scoped to the current member or visitor. They do not claim cloud sync. Existing member cloud inspections remain available at `/workshop/inspections` using their original immutable configuration revisions and existing RLS. Public legacy `configuration_revision` links open their exact legacy renderer in read-only mode. They are not silently rebound to the new r13 graph.

## Author boundary and preferences

Source/import/reconstruction controls require a real admin or reviewer role from `current_permissions` and a verified AAL2 session. `/manage/models` and `/workshop/assets` are not public navigation destinations; anonymous accounts and ordinary members cannot open the source workspace. Query parameters and user metadata do not grant roles. Private source/inspection routes are excluded from sharing, robots and usage counts. This change adds no database grants, writes, role activation or schema migration.

The footer contains site navigation and attribution. Optional page/retailer count settings are in `/resources#privacy`; both remain off by default. The page recorder renders no interface and records only already-authorized aggregate public sections. Existing consent and commercial gates are retained.

## Verification

Source model: 142 TypeScript tests / 16 files, 50 Python tests, typecheck, build and Khronos validation pass at source commit 8727305. Host: 182 unit tests / 23 files, 30 importer tests, typecheck and production build. Browser checks cover direct mesh selection and OEM panel, system/isolation, phone layout, stable explosion, orbit/zoom, source cabin, private routing and public footer. See the deployment receipt for the actual published version and source commit. Incomplete exact-car applicability, complete OEM modeling, reviewed full-manual procedures and broader physical-device testing remain tracked requirements.
