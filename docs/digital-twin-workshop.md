# Integrated workshop and asset pipeline

## Current public reader — 7 November 2026

The native r13 reader at `/workshop` supersedes the initial public rendering experience described below. It retains catalog/guide/community identities and preserves old immutable graph links and private cloud inspections. Source authoring now requires verified staff MFA. See [public workshop architecture and verification](public-workshop.md) for the current runtime, axle/panel corrections, visitor controls, asset rights and limits. The following sections document the retained legacy systems.

The workshop extends the current E34 Collective application. It does not replace the catalog, manual references, diagnostics, community or private garage. The dedicated module is `src/digital-twin` and the route is `/workshop`; `/workshop/assets` holds source discovery, reconstruction briefs and private submissions.

## Runtime and relationships

The initial 1995 525i/M50-family reference graph has 19 primary areas and 106 structural/component records. Exact engine variant, market, build date, transmission, installed options and modifications remain unknown. A structural slot is not a complete bill of materials. Five isolated original relationship models represent 47 canonical identities. The source catalog remains the authority for the recorded conditional part occurrences. No procedural model is placed at an invented position in the engine bay.

The renderer retains the existing direct Three.js approach rather than replacing it with a second rendering framework. Three.js, assembly builders and GLTFLoader load on demand. Camera presets include front/rear/left/right/top/underside. Source drawings stay 2D; actual meshes support XYZ orbit, pan/zoom, focus, isolation, exploded reference layout, wireframe, section view, surrounding transparency and graphics settings. The nominal seal models stream medium/low GLBs. GPU resources and shared textures are explicitly released. Renderer statistics report the current scene, not an unmeasured performance guarantee.

All physical measurement tools remain gated: no configuration component has independently verified dimensions. Nominal seal dimensions are displayed as interpreted source values. They do not establish manufacturer tolerances or installed deformation.

## Mechanical state and repair integration

`graph.ts` validates parent/dependency cycles, transforms, targets and geometry references. Workshop state has an exact graph identity/revision, present/past/future, selected/hidden/removed components, detached connections and display separation. Removal in checked mode requires reviewed removal status, evidenced prerequisites and disconnected electrical/fluid connections. Reassembly follows reverse dependency order. Undo/redo are bounded to 100 snapshots. Switching modes validates the present state and clears incompatible history.

Six manual-supported M50 pump access dependencies and four planning scene steps link to the existing written guide. Selecting a step focuses its component; canonical parts link back to the catalog, guide and discussions. The complete replacement procedure remains unapproved because the bleed/cap-pressure sequence and exact installed hardware need technical review. Checked removal of these unapproved components is blocked. Free exploration can remove/reinstall them visually. No arbitrary translation is described as a verified physical removal animation.

## Persistence and security

Published configuration revisions and their graph rows are immutable. Save a new revision instead of changing a graph used by existing sessions. Private sessions pin an exact configuration revision and use `updated_at` to detect competing saves. JSON import uses a strict bounded schema and graph membership validation. The database independently validates identities, snapshots, history, node/connection membership, separation and constrained prerequisites. Browser data cannot bypass RLS or those checks.

Schema files are additive, in applied order: digital-twin.sql, digital-twin-guards.sql, digital-twin-accuracy-fix.sql, digital-twin-submissions.sql, digital-twin-account-storage.sql, digital-twin-integrity.sql, digital-twin-performance.sql, digital-twin-evidence-integrity.sql, digital-twin-review-anonymization.sql. Seed the reference graph with scripts/seed-digital-twin.ts, reference mesh associations with scripts/seed-reference-meshes.ts and the original nominal models with scripts/seed-nominal-seals.mjs. The graph seed registers its nominal-source dependencies before geometry and retains runtime hashes. tests/digital-twin-seed-transaction.sql exercises a fresh set of source/asset identities in a rollback-only transaction. Repeated seed execution is idempotent; changing a graph without a new revision is rejected. Canonical part/source/guide foreign keys are preserved.

All reference metadata has RLS and explicit API grants. Members can submit private reconstruction jobs and evidence; technical reviewers can review job status. Model publication requires a recorded redistribution license. Verified geometry accuracy requires a named review/method/evidence; verified dimensions additionally require independent measurements and tolerance records. Unreviewed uploads cannot publish themselves.

Embedded GLB submissions are checked for file limits, header/version, external network dependencies and geometry budgets before upload. Files stay in the private e34-twin-submissions bucket under the authenticated owner's prefix. Owner/reviewer read access and owner upload/delete are enforced in Storage. Jobs/evidence and sessions are included in paginated owner exports. Account deletion revokes sessions, removes owned source files with a service-only metadata function, then deletes the authenticated account and cascading rows. It stops on cleanup failure. Public/community image uploads remain disabled; this limited GLB workflow is not a full antivirus or image privacy pipeline.

## Reproducible geometry work

- scripts/register-nominal-seals.mjs reads only factual source-position/part data. Only explicit two-number O-ring dimension expressions with a consistent interpretation are registered.48 identities passed. Source-position IDs, URLs and record hashes are retained in data/digital-twin/nominal-seals.json.
- tools/digital-twin/build_nominal_seals.py generates original torus geometry in metres and three LODs. The high-detail output stays in ignored outputs/digital-twin; medium/low runtime models and a provenance/hash manifest are retained. No standard tolerance, material, seal groove or fitment is inferred. Catalog A×B is provisionally interpreted as nominal ID × circular section, consistent with the Trelleborg dimension convention; every BMW application still needs review.
- tools/digital-twin/asset_pipeline.py registers sources/licenses, validates embedded GLBs and reports available tools. Registration supports GLB/glTF, OBJ, FBX, STL, STEP, PLY and point-cloud metadata. The Blender adapter imports supported mesh formats and exports three LODs. The FreeCAD adapter segments STEP solids for later semantic mapping. STEP/point-cloud conversion is not silently simulated when dependencies are absent.
- scripts/export-canonical-identities.mjs produces a read-only canonical-ID index for pipeline checks. scripts/audit-digital-twin.ts writes the coverage/gap report.

Blender, FreeCADCmd, COLMAP and Meshroom were not installed at preflight. The Blender/FreeCAD adapters have not been executed here. Point-cloud reconstruction, photogrammetric calibration and image-to-CAD segmentation remain external-tool work, not completed features. Single-image model guesses cannot establish hidden geometry, clearances or tolerances.

## Exact remaining implementation and evidence gaps

No verified complete M50/M50TU block/head/valvetrain/timing/lubrication assembly, correct installed engine-bay mounts/hoses/wiring, complete small-fastener bill of materials, interior/chassis/drivetrain assembly, collision geometry or physical removal path was acquired. The 12-candidate source discovery inventory records unavailable licenses/downloads and variant differences. Required views, scale/mounting/mating measurements and rights evidence are listed per reconstruction brief.

The next software dependencies are private uploaded-model preview, visual transform/connection editing, revision comparison/publication controls, complete reviewer measurements UI, documented condition-photo comparisons, first-person/collision inspection, validated compression/texture pipeline and additional configuration loaders. Current admin functionality provides source inventory, reconstruction submission/upload/download, canonical association, rights/evidence collection and a reviewer job-status queue; it does not claim a finished CAD authoring desk. Further repair progression, replay and assembly streaming require reviewed assets and procedures. Auth redirects and saved custom SMTP are configured; confirmation/recovery delivery and public-launch review remain open under the main implementation status.
