# Build Studio appearance asset audit

Audited locally on 9 November 2026 against the released v48 source in `e34-workshop-build-studio`. E30 work is outside this batch. This audit adds an appearance-target registry and documentation; it does not change source GLBs, manifests, app code, database schemas, hosted data or release state.

`data/build-studio/appearance-targets.json` records ten immutable model-manifest hashes, seven relevant immutable GLB hashes and fourteen strict node/material selectors. A selector requires **asset SHA + native node ID + source material index**. Named materials add a further assertion. Unknown/mismatching assets must retain their original appearance rather than receiving a guessed color operation.

## Existing immutable sources

| Appearance family | Asset ID | SHA-256 |
| --- | --- | --- |
| Sedan exterior and licensed cabin | `assembled:body-v7` | `60efa3688dbd35ee6315d0da6846df6ed44ee12e3531bd6ba6cccc01e2897fab` |
| Touring exterior and rear cabin | `assembled:body-touring-c89006a5` | `c89006a5069457c76794b0a72b54ebcd7be8580d83b5006c7b8d0d4c419e495b` |
| Existing nominal wheel | `assembled:wheel-v4` | `aba6fa5cec6c1b31ca52d1e3ae1f95a08fda22d6a2eccc1a5bf21190513cc0e1` |
| M50 engine | `assembled:m50-v3` | `32334cd0a373f0e424a00b996a71353b0556f9371f440ecf323dac4e03d9d99c` |
| M30B35 engine | `vehicle-variant:engine:M30B35:r1` | `f7c368d703b9589651d9f21812c3cfc508d728d4463b5c0f06139f3480193bf3` |
| M60B30 engine | `vehicle-variant:engine:M60B30:r1` | `5345f4fc9810ef8d6694649aea81669d9913762e6a8e7f9cef9fb6ce4af0a814` |
| M60B40 engine | `vehicle-variant:engine:M60B40:r1` | `ced203cae5b4ac559e525d5dae86b85bb0cc4878864772099b34c830ed8015c0` |

Sedan body/cabin credit: UVZZZ / Silbergrau / Uralvagonzavod, [BMW 525i e34 | Project Zomboid](https://sketchfab.com/3d-models/bmw-525i-e34-project-zomboid-c65aa3b7687d4f5dbbabdfad0b7816bb), CC BY 4.0. Touring body credit: Nieve5677 / niev, [BMW 5 Series E34 Sedan and Touring](https://sketchfab.com/3d-models/bmw-5-series-e34-sedan-and-touring-e3d8d4f5cdd24a549b54d10f0f0ec8f8), CC BY 4.0. Preserve `/models/e34-525i/LICENSE.md`, `/models/ATTRIBUTION.json` and per-reference credits. Retained aggregate attribution does not turn separately constructed illustrative mechanical geometry into licensed manufacturer CAD.

## Painted panels

Sedan `body-white` is source material index **1**. It is a textured atlas shared by painted panels, lamps, plates, mouldings, mirrors and badges. A global `material.name === 'body-white'` operation is incorrect. The target list permits only the fourteen explicitly named panel groups: hood, roof, trunk, shell/pillars, four doors, two front fenders, two rear quarters and two rockers. Dark source trim and texture detail still need preservation inside those groups.

Excluded groups include registration plates, all separate lamps/lenses, roundels, side mouldings, bumpers, lower front valance and mirrors. The bumper/valance/mirror groups have mixed or ambiguous painted/trim/reflective regions and are intentionally not advertised as fully paint-separated. The registry contains the exact exclusions. Do not describe this coverage as every painted surface or quietly tint a plate/lens to make a complete-car recolor look easier.

Touring material **0**, `carpaint.044`, is cleanly separated in the eleven allowed body-panel groups. Its lamps, glazing, chrome, black trim and plate-like materials have other indices. Mixed bumper/trim groups are excluded even when they contain some `carpaint.044` faces.

Color, metalness and roughness can genuinely change cloned rendered materials. Approximate color chips are not verified factory paint codes or an accurate real-world paint match. The existing loaded body materials are `MeshStandardMaterial`: setting an unsupported `clearcoat` property alone has no rendered effect. Real clearcoat requires a `MeshPhysicalMaterial` or equivalent shader while preserving the source maps, transparency, side settings and disposal behavior.

## Upholstery and interior trim

Sedan `body-interior` is material **0**, also shared by gauges, dashboard controls, belts, pedals, steering wheel and all cabin textures. Never globally recolor it.

The registry separates:

- Seat appearance: `e34sys:front-seat--1`, `e34sys:front-seat-1`, `e34sys:rear-seat-cushion`.
- Door-card appearance: `e34sys:door-card-front--1`, `e34sys:door-card-rear--1`, `e34sys:door-card-rear-1`.
- Headliner: `e34sys:headliner`.
- Combined cabin lining: `e34sys:cabin-carpet`.

The current graph lacks a separate left-front door-card node. Do not invent that component or recolor the whole dashboard as a substitute. Seats retain their artist seams, shading and texture: changing their color/roughness is an appearance option, not proof of a genuine cloth/leather product, sport-seat shape or factory upholstery code.

Touring rear-seat and interior/cargo appearance target material **10**, `interior.043`, only on the listed `touring:` nodes. Other source uses of that material remain untouched. Gauges, switches, gear and handbrake levers, steering controls, seatbelts, pedals, mirrors and glass are excluded.

## Engine-bay accent

The target is actual rendered cover material, scoped to the selected engine's immutable asset and exact node IDs:

| Engine | Allowed source material | Target groups | Preserved detail |
| --- | --- | --- | --- |
| M50 | **3**, unnamed | `m50:valve-cover`, `m50:coil-cover` | Dark seals/details at index 4 |
| M30B35 | **2**, unnamed | `m30b35:valve-cover` | Silver raised detail at index 1 |
| M60B30 | **3**, `Material_5` | Both valve covers, both coil covers, intake cover | Silver detail/fasteners at index 4; structural index 1 |
| M60B40 | **3**, `Material_5` | Both valve covers, both coil covers, intake cover | Silver detail/fasteners at index 4; structural index 1 |

The exact M60 node suffixes and mesh selectors are in the JSON. This is a cosmetic cover finish; it does not select, install, purchase or validate a different engine or component.

## Existing wheel: actual editable roles

Every active native reference uses the same `assembled:wheel-v4` hash. The source hierarchy is `wheel-reference-geometry_aa1f838e`; each of the four `wheel:*` nodes renders that same immutable source at a separate transform.

The six source material names are **empty**. Runtime mesh names from the installed Three.js GLTF loader are `mesh_0` through `mesh_7`. Capture `gltf.parser.associations.get(material)?.materials` before material cloning; indices below are stable only with the pinned GLB hash.

| Source material index | Runtime meshes | Actual role | Existing finish |
| --- | --- | --- | --- |
| 0 | `mesh_0` | Tire casing | `#242627`, roughness .94, metalness 0 |
| 1 | `mesh_1` | Dark barrel/hub/backing | `#353d42`, roughness .50, metalness .65 |
| 2 | `mesh_2` | Alloy rim, rings and basket-weave spokes | `#bdc2c6`, roughness .30, metalness .82 |
| 3 | `mesh_3` | Sidewall/tread detail | `#171b1c`, roughness .86, metalness 0 |
| 4 | `mesh_4`, `mesh_6` | Light decorative center quadrants | `#d7e1e6` |
| 5 | `mesh_5`, `mesh_7` | Blue decorative center quadrants | `#3f718e` |

A wheel-finish choice may modify **1 and 2** while preserving **0 and 3** as rubber. Tire appearance may alter rubber finish/roughness, without claiming a brand, new tread design, actual wear, grip or roadworthiness. Existing tread detail is geometry, so a different tread pattern needs real replacement/parameterized geometry rather than a label change. Center quadrants are separate decorative meshes; an original unbranded wheel may omit them rather than copying/claiming a commercial badge.

The nominal source recipe in the companion reconstruction repository's `vendor/e34-wheel-geometry.ts` uses a 205/65 R15 label, .381 m rim diameter, .6475 m tire outside diameter and .205 m tire width. These are procedural nominal assumptions. They do not authenticate a BMW wheel option, BBS product, offset, width, bolt circle, center bore or clearance. The asset catalog already records that limitation.

The axle axis is **Z**, with the radial wheel plane in **XY**. Native centers are:

| Instance | Position (nominal display meters) | Orientation |
| --- | --- | --- |
| `wheel:front-left` | `[1.3805, .32375, -.735]` | Identity |
| `wheel:front-right` | `[1.3805, .32375, .735]` | 180° around Y |
| `wheel:rear-left` | `[-1.3805, .32375, -.7475]` | Identity |
| `wheel:rear-right` | `[-1.3805, .32375, .7475]` | 180° around Y |

Full matrices and source bounds are in the JSON. Independently scaling the metal and rubber submeshes is not enough for a credible larger rim inside the same tire: the old tire's inner profile stays fixed, causing gaps/intersections. Parameterized replacement geometry must coordinate inner/outer profiles. Changes in visual tire radius must also preserve ground contact and appropriate center height. None of these visual adjustments constitutes fitment verification.

## Already licensed alternate wheel

There is one distinct existing artist wheel package at `/models/e34-525i/e34-wheel.glb`: **71,772 bytes**, SHA-256 `9fa22896feab63d5d8f5ca665d1bb1a54a05d659c3e6582791c2cd3f8f5638da`. It is covered by the existing UVZZZ/Silbergrau CC BY 4.0 notice. Its actual source node is `e34-wheel`, mesh `e34-wheel-Mesh`, one textured material `wheel`.

This is genuinely different geometry from the active procedural v4 reference and could be an optional **licensed artist wheel reference**. It is not a verified OEM/BBS product. It is one combined textured wheel; independent rim and tire recoloring/sizing cannot be assumed. Source units and adaptation scale are unverified, with bounds approximately ±.350493 in X/Y and ±.107565 in Z. Those numbers must not be interpreted as certified inches or millimeters.

The native asset path allowlist currently excludes this legacy URL. A safe optional swap needs explicit immutable loader registration/copy, byte-hash verification, controlled visual normalization and attribution. No other distinct wheel package occurs in active r13–r23 manifests; repeated file paths/revisions all point to the same v4 hash. Original generic, unbranded parameterized geometry remains an option if a more controllable appearance is needed.

## Ride-height preview

Y is up. Translating body/cabin surfaces relative to stationary wheels genuinely changes rendered stance; the registry lists the actual body/cabin node IDs. It does **not** articulate suspension or solve hub, brake, control-arm, steering or driveline geometry. Moving every non-wheel node together would visibly disconnect brake/hub centers from stationary wheels. Moving only the body would disconnect it from fixed engine/chassis internals when those are exposed.

Use an exterior stance-specific presentation or explicitly expose that limitation. A UI adjustment range is a display limit, not approved suspension travel, tire clearance, alignment, safe lowering or roadworthiness. There is no verified kinematic suspension model in these assets.

## Verification and integration boundary

Audited original GLB JSON containers, material references and descendant node membership; decoded the active wheel with installed Three.js/MeshoptDecoder; checked source material associations and all selected material indices against their exact native node groups. Every declared target exists in at least one pinned reference and uses the recorded material. Source/manifests are byte-hash checked before registry output.

Renderer/application implementation remains root-owned. Clone per-build runtime materials/geometries; keep immutable assets and unrelated workshop instances intact. Reset must restore the actual original source materials/transforms. Final proof must show changed rendered materials/geometry, not only changed labels, and must include relevant desktop/mobile screenshots and appearance-state round trips.
