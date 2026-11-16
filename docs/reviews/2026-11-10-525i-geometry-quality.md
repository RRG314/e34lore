# 525i geometry and rendering review

The local revision 1044 seats the airbox, expansion tank and steering reservoir; bridges the center bearing and transmission tunnel; mates the exhaust sections; and seats the trunk hinges and spare-wheel retainer. The fitted washer tank and radiator retain closed-hood clearance. The published 1043 model remains pinned. [Local 525i fit preview](http://127.0.0.1:3094/workshop?reference=e34-525i-sedan-automatic&model_revision=1044)

Local browser checks covered the open hood, trunk and spare cover, the underside, all panel controls, complete separation and reassembly. The production build retains revision 1043.

10 November 2026. Local continuation on `steven/member-reliability-and-reference-accuracy`. Site49 remains live. No source push, hosted migration or deployment occurred. The owner will test this batch before release.

Phone review: http://127.0.0.1:3012/workshop?reference=e34-525i-sedan-automatic. Desktop: http://127.0.0.1:3012/workshop?reference=e34-525i-sedan-automatic. The scanner and disposable garage use the same preview/backend as the [previous journey review](2026-11-10-scanner-525i-journey.md).

## Engine cutaway, trim and factory wheels

Revision 1014 has 653 selectable model components. The compressed mechanical asset keeps the reference at eight GLBs and 18,868,992 bytes. The earlier accepted files and all saved revisions remain addressable by their original hashes.

- **M50 engine** includes the crank journals, bearing shells, rods, three-ring pistons, cylinder head and cam carriers, timing chains and guides, VANOS, oil pump and pickup. Short block, cylinder head, timing drive and oil circuit have their own assembled and cutaway views. The exported Mahle example measures 83.980 mm across the piston. Profiles, shell grades and assembly clearances remain illustrative. [BMW crankshaft diagram](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/engine/crankshaft_with_bearing_shells.html) · [BMW timing diagram](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/engine/timing_timing_chain_lower_p.html).
- **Body trim** includes the eight fitted side mouldings, individual split clamps and nylon grommets, bumper inserts and their retainers, and cowl covers and expanding rivets. Clips exposed reveals the fasteners in the assembled body. The individual clip links to BMW 51131946258. Fastener positions follow the model panels and the catalog diagrams. [BMW moulding and clamp diagram](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/vehicle_trim/bumper_guard.html).
- **Build Studio** has 25 documented E34 style and variant previews. These include steel, metric TRX and TD, one-piece and composite cross-spoke, 525iX and the three M5 designs. The handed M System covers use separate left and right meshes. The preview uses representative rim sizes and preserves the original model's rolling radius. Physical fitment depends on the car and wheel specification. [BMW styling chart](https://myair-bdr.bmwgroup.com/static/manual/RadReif/RadReif/mj1996/e34_1996.pdf) · [E34 M5 wheel catalog](https://www.realoem.com/bmw/en/partgrp?id=HJ91-EUR---E34-BMW-M5&mg=36).

The desktop browser rendered all 25 wheel choices, and a saved M System II build reopened with its selected wheel and low render quality. The assembled trim, cutaway, gearbox and 390 px engine view were checked in the browser. Typecheck, 556 unit tests, the production build, 79 route checks and 33 HTTP security checks passed. The wheel files and candidate GLBs are served only by the disposable preview. Receipts are in `work/525i-detail-review`.

[Open the engine cutaway](http://127.0.0.1:3012/workshop?reference=e34-525i-sedan-automatic&system=system%3Am50-engine) · [Open Body trim](http://127.0.0.1:3012/workshop?reference=e34-525i-sedan-automatic&system=system%3Abody-trim) · [Open Build Studio](http://127.0.0.1:3012/workshop?mode=build).

## Engine bay and suspension

Local revision 1011 adds 38 selectable components and reshapes 45, for 557 modeled components and 16,036,252 bytes of model assets. The 1995 automatic reference represents the conventional rear spring struts and an aluminium front wishbone. Catalog alternatives retain their source conditions.

- The engine bay has six shaped intake runners, the airbox, meter and bellows, the throttle housing, ribbed engine covers, engine brackets and rubber mounts, a vented alternator, hydraulic lines, reservoirs and harness branches. The strut towers, aprons, cowl and radiator support show where the parts sit. [BMW intake diagram](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/engine/intake_manifold_system.html) · [BMW engine mounts](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/engine/engine_suspension_damper.html) · [Installed M50 photograph](https://commons.wikimedia.org/wiki/File:BMW_525i_M50_PL.JPG).
- The front axle has separate wishbones and thrust arms meeting the knuckles, plus damper inserts, spring plates, guide supports, boots and stabilizer links. The rear axle has two aligned bushing pivots per arm, carrier mounts, hub bores, spring struts and separate links. [BMW front wishbone diagram](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/front_rear_axle/cross_member_wishbone_rod.html) · [BMW rear trailing arm diagram](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/front_rear_axle/rear_axle_support_wheel_suspension.html).
- The workshop has Engine bay, Front suspension and Rear suspension views. Complete car has Hide hood, and each axle view has Hide wheels. Desktop and 390 px renders were inspected. The model test checks the installed bounding volumes at the chassis, strut and engine mount interfaces. A sampled closed-hood mesh check found the strut caps within about 1 mm of the modeled hood surface. Installation dimensions, clearances and hose routes remain approximate.

Typecheck, 555 unit tests, the production build, 79 route checks and 33 HTTP security checks passed. The accepted files and all eleven archived local manifests retain their hashes. Production rejected each local candidate asset. The saved test scan reopened its private photo, catalog position, pinned revision 1008, repair guide and existing journal entry. Review receipts are in `work/525i-bay-suspension`. [Open the local engine bay](http://127.0.0.1:3012/workshop?reference=e34-525i-sedan-automatic&system=system%3Aengine-bay).

## Mechanical follow-up

Local revision 1008 adds 60 selectable components and reshapes 18 existing ones, for 519 modeled components. The A4S 310R cutaway includes the converter pump, turbine, stator and lockup plate, the front oil pump, the overdrive and compound main gearsets, the clutch plates and pistons, and the brake band and parking lock. The adapter and main valve bodies have separate solenoids, wiring and oil pans. The component panel links to the factory figures and the applicable BMW catalog entries. [Hydra-Matic section drawing](https://cdn.static-repo.emanualonline.com/Other/NASa/15/87995-GM_4L30-E_4L430-E_Hydra-Matic_Transmission/8/8.jpg) · [BMW solenoid diagram](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/automatic_transmission/solenoid_valve_cable_set_a4s_270r_310r.html).

The model also adds the air-cooled ATF circuit, gearbox mounts, output housing and seal. The driveshaft now shows its two sections, universal joint and separate centre support bearing. Molded radiator hoses meet the radiator and thermostat housing, and the steering centre link, drop arm, idler arm and tie rods have separate joints and boots. The catalog sizes checked on the exported geometry are the 38 × 58 × 10 mm output seal and the 30 × 55 mm bearing bore and outside diameter. Gear profiles, hydraulic passages, harness routing and installed clearances are approximate. [BMW output parts](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/automatic_transmission/output_a4s_270r_310r.html) · [BMW oil cooler and lines](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/cooling_exhaust_system/transmission_oil_air_cooling.html).

The browser check used a licensed filter photo and manual catalog selection. The private photo and exact source position reopened in the garage, with the linked 525i revision and repair guide. Saving from the linked step created a private journal entry with Planned status. The final build passed 554 unit tests, 79 route checks, 33 HTTP security checks and 38 model file and preview boundary checks. Review receipts are under work/525i-mechanical-review. [Open the local gearbox](http://127.0.0.1:3012/workshop?reference=e34-525i-sedan-automatic&system=system%3Aautomatic-gearbox).

The sections below record the earlier revision 1006 visual review.

## Geometry changes

Local revision 1006 contains 459 individually renderable nodes, up from the accepted reference's 448. It retains the previous air-filter addition, replaces 22 existing shapes and adds 10 further components. The new GLB is 2,576,320 bytes and 83,104 triangles; total model assets are 8,102,916 bytes. These counts describe renderable groups, not 459 separately verified OEM articles.

| Area | Change |
| --- | --- |
| Cooling | Curved closed eleven-blade fan, separate finned coupling, shroud throat, radiator fins/end tanks/mounts and crimp details, shaped expansion tank/neck |
| Intake | Open housing base, separate ribbed lid, clips and hollow fresh-air snorkel; the existing dimension-checked filter remains separate |
| Brakes | Four shaped floating calipers with pad openings, four dished backing shields and four discs with central hats; the front discs have visible ventilation |
| Underbody | Stamped floor/footwell form and formed muffler with seams and pipes |
| Automatic transmission | Separate bellhousing, main case/extension, converter exterior, main and secondary pans, strainer, drive plate/ring gear |
| Cabin controls | Automatic selector/gate/grip and two-pedal arrangement; separately selectable wide brake-pedal rubber pad |

Thin gaskets, sheet parts and piston rings retain their thickness. They were reviewed separately from block or plane placeholders. The automatic selector no longer inherits the old manual selector's catalog binding. Its five source alternatives retain their individual occurrences. Replaced parts no longer show stale thumbnails of the old geometry. Authored interior controls now remain visible in the seated cabin representation.

These are original illustrative meshes. Casting ribs, wall thicknesses, connections, lever geometry, seals, fastening interfaces, installed coordinates and removal clearances remain unmeasured. Transmission gears, clutch packs, hydraulic circuits and converter internals are not reconstructed. The model is not a complete factory mechanical reconstruction.

## Source evidence and coverage

The fan follows [Cojali 8111602 / BMW 11521712058](https://www.cojaliparts.com/en/reference/11521712058/fan-blades/8111602/): 420 mm diameter, 11 blades and 134.8 mm centering. The exported diameter/centering and blade count are checked; the UI says **Diameter checked**. Pitch, blade section and thickness, fastener spacing, coupling interfaces and shroud clearance are illustrative.

[MAHLE cooling-system architecture](https://www.mahle.com/en/products-and-services/passenger-cars/cooling/) informed the radiator construction. [Chin Lang CL7010C / 17111712835](https://www.chinlang.com/en-US/p818-coolant-reservoir-tank) was visually inspected for the reservoir form. These sources do not supply verified E34 CAD or installation dimensions. The source photograph was not admitted to public assets or the scanning library.

Retained 1995 catalog occurrences bind the transmission family, pans, strainer, drive plate, selector, pedal bracket and brake pad. Sources with only supersession history remain history; the builder does not invent an ordering occurrence. Gearbox application still requires the installed tag and production restrictions. The brake-pad record states 100 mm width, used as an illustrative width without claiming the full component is measured.

The strainer 24111218899 and separate pans link to the A4S 310R ATF manual locator 240-14 / PDF 250. Removal uses 240-8 / PDF 244, and identification uses 200-2 / PDF 224. A locator is distinct from an authored replacement guide. The fan links to 170-1 / PDF 205. Catalog position IDs and retained source hashes accompany these bindings.

The private component report is `work/geometry-quality-20261110/component-coverage.json`. Its separate facets are:

| Facet | Nodes |
| --- | ---: |
| Renderable / individually selectable | 459 |
| At least one source candidate position | 458 |
| Specific manual locator | 383 |
| Linked authored replacement guide | 38 |
| Limited dimension check | 3 |
| Fully dimensionally verified | 0 |

Source candidates do not certify applicability or interchange. Broad assembly bindings can contain multiple articles. Authored guides remain draft. The three narrow geometry checks are oil-filter and air-filter outer envelopes, plus the fan diameter/blade count. They do not validate installed placement or mounting interfaces. The report's assembled visibility flag is distinct from camera visibility and occlusion. There is no overall completeness percentage.

## Rendering and preservation

New geometry uses molded plastic/rubber, cast alloy, machined metal and formed sheet-metal materials. Softer lighting and contact shadows improve depth. The contact-only floor has no opaque plane or visible horizon. Shadows are computed when the scene changes, not continuously during an idle camera. Phone viewports use a 512px shadow map; desktop uses 1024px. Low render quality disables shadows. Directional-light shadow resources are disposed when changing references.

The accepted revision 23 manifest and its four original GLBs remain byte-identical. Its manifest SHA256 is `07d858ddc5abb25b43a823e5082cf9d17b55e018df6317cf8f4c1c343569bd2d`. Archived local revisions 1001–1005 remain addressable by their original hashes. The current manifest SHA256 is `b4dd732b2f0ed33b6abe56a581aafb7c321f381bb4f4785431673aed936af179`.

`tools/build-525i-visual-candidate.mjs` builds from the immutable local service baseline, verifies original assets, enforces an extra-asset budget and writes hash-named archives before updating pointers. It rejects attempts to change an existing revision's bytes. The development plugin only serves whitelisted archive files; production builds exclude the local candidate module and files. Source changes do not force a page reload during photo capture. Existing projects, saved views and scans retain their pinned references.

Browser testing found that Build Studio's private registry originally allowed only one revision per reference ID. Creating a build with revision 1006 failed with “Unsupported model release.” Migration `20261110221800_build_reference_archives.sql` changes that private primary key to `(id, revision)`, retaining all existing rows and project states. It was applied only to the backed-up disposable database. The review adapter verifies the complete archive's hashes and manifest identities before registering its pins; conflicting pins are not overwritten. Candidate pins are never included in a hosted migration. Production release approval remains pending.

## Verification

Receipts are in `work/geometry-quality-20261110/`.

- 551 unit tests across 66 files pass, including exported geometry bounds, finite vertices, fan diameter/centering and 11 blade clusters, component depth, exact source occurrence selection, cabin visibility, archive retention and production exclusion. Damaged archive files are rejected before any registry write. These tests build their own temporary baseline and do not depend on a pre-existing work cache.
- Type checking and production build pass. Lint reports zero errors and 15 existing native-image warnings. The build checks 4,969 client assets; three private indexes and 147 server source maps remain outside the upload tree.
- 79 route/data/isolation checks and 33 HTTP security checks pass against the final production build. 32 additional byte/archive/boundary checks confirm all retained candidate archives on development, their 404 production responses, unchanged accepted bytes and private-path denial.
- Browser checks cover the complete car, cooling, brakes, intake, automatic case/pans, seated automatic controls, fan diameter/source display, hidden/shown parts, exploded view/reassembly, and strainer/manual links. Screenshots were visually reviewed. The 390px underbody view has no horizontal overflow. A settled viewer produced zero additional render frames over 900ms. Viewport simulation is not a physical-phone performance test.
- A new disposable build saves and reloads at revision 1006; the earlier build still opens at revision 23 without modification. Low quality disables contact shadows and Balanced restores them. A newly saved revision 1006 view survives a visit to revision 1001 and restores correctly on returning. The previous two projects, three cars, two car photos and private scan/photo remain; the additional third project is labeled “Local r1006 geometry review.”
- Development retains its strict CSP. React development tooling logs that optional call-stack reconstruction cannot use eval; security policy was not weakened. Production verification remains separate.
- The complete isolated SQL security suite and synthetic restore pass after the registry migration. Old and new model pins can create builds together, the older build still saves, and an incorrect digest is rejected. Owner isolation, revocation and private registry privileges remain enforced. The restore checks all 13 synthetic object-byte hashes; it does not certify hosted recovery.

The prior actual scan→catalog→model→repair→private garage test, photo-retry recovery, saved scan context and ownership checks remain recorded in the linked journey review. This batch changes only the private model registry schema, with no upload-policy changes, and makes no new scanner-accuracy claim. Real-part phone testing remains pending.

## Resource cleanup

JeepLore, physics and World Explorer had no active development servers. Two World Explorer dashboard/traffic tabs were closed. Six stale automated test/browser processes were stopped. Reinstallable dependencies and downloaded verification/emulator/math caches were removed, including World Explorer worktree dependency copies. Approximately 4 GB of logical files was removed; the exact paths, sizes and observed disk change are in `resource-cleanup.json`.

Source, Git history, maps, authoring assets, original model files, release snapshots, private database backups, uploads, account records, browser profiles and drafts were preserved. The active app updater and bundled runtimes were retained. The temporary production server and verification browser are stopped after testing; development 3012 and its disposable backend/database remain for owner testing.

Remaining mechanical work includes measured engine-bay placement, bracket and hose interfaces, full suspension/steering geometry, verified body-panel details, automatic internals and component removal clearances. Source-linked illustrative shape improvements are useful for identification, but cannot substitute for those measurements.
