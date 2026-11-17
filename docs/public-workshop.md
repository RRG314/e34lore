# Interactive Workshop

The E34 and E30 Workshops share the Three.js viewer with separate vehicle references and catalog contexts. The local demo includes a simplified model for each series. Search for the sample coolant pump and select **Open the catalog diagram** to follow the part into its assembly. In the full build, each released model and its compatible catalog context are pinned together.

## Viewing and persistence

Orbit works across both axes with zoom/pan. Camera presets, seated cabin look/zoom, body transparency/hiding, system scopes, selection/isolation and expand mode are visitor controls. Exploded separation is a held slider value, never a timed loop. Input cancels camera fitting. Rendering is demand-driven and shared geometry, textures, materials and controls are disposed on unmount. Each GLB’s bytes and SHA-256 are checked before decoding; invalid or missing content produces a retry view.

Named views use bounded, revision-aware local storage scoped to the current member or visitor. They do not claim cloud sync. Existing member cloud inspections remain available at `/workshop/inspections` using their original immutable configuration revisions and existing RLS. Public legacy `configuration_revision` links open their exact legacy renderer in read-only mode. They retain the revision on which the inspection was saved.

## Author boundary and preferences

Source/import/reconstruction controls require a real admin or reviewer role from `current_permissions` and a verified AAL2 session. `/manage/models` and `/workshop/assets` are not public navigation destinations; anonymous accounts and ordinary members cannot open the source workspace. Query parameters and user metadata do not grant roles. Private source/inspection routes are excluded from sharing, robots and usage counts.

The footer contains site navigation and attribution. Optional page/retailer count settings are in `/resources#privacy`; both remain off by default. The page recorder renders no interface and records only already-authorized aggregate public sections. Existing consent and commercial gates are retained.

## Verification

Source model: 142 TypeScript tests / 16 files, 50 Python tests, typecheck, build and Khronos validation pass at source commit 8727305. Host: 182 unit tests / 23 files, 30 importer tests, typecheck and production build. Browser checks cover direct mesh selection and OEM panel, system/isolation, phone layout, stable explosion, orbit/zoom, source cabin, private routing and public footer. See the deployment receipt for the actual published version and source commit. Incomplete exact-car applicability, complete OEM modeling, reviewed full-manual procedures and broader physical-device testing remain tracked requirements.
