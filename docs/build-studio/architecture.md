# Build Studio: audit and implementation plan

9 November 2026. Base: Site48 source 26364b9678ab98b9f65abf7b5fa4bd8ae7772896. Worktree e34-workshop-build-studio, branch steven/workshop-build-studio. Unfinished E30 work remains separately preserved in e34-scanner-repair-lab. This batch is local-only until reviewed; nothing has been deployed or applied to the hosted database.

## Reuse audit

- ReferenceWorkshop, ReferenceRenderer, immutable vehicle releases and existing Three.js GLTF/material/selection/load/dispose logic remain the only renderer. Explore and supported Repair retain their current release boundaries. Build supplies a bounded appearance projection and project panel to the same reader. Existing workshop saved views remain separately preserved.
- owned_vehicles remains the actual-car record. Multiple build_projects may reference one owned car through a composite owner FK, or remain conceptual. No preview or autosave writes actual vehicle configuration, installed_parts, service_records or journals.
- Canonical parts, source assembly positions, fitments and interchange relationships remain authoritative. Manufacturer/product IDs for aftermarket parts are separate, owner-entered identities. The existing fitment evaluator and source readers feed a cautious build compatibility projection; a visually fitting mesh is never technical proof.
- Existing tools/service/guide revision indexes and repair DAGs provide tools, procedure links and known access relationships. Major-change dependency checklists are explicit research requirements, with owner progress separate from mechanical safety.
- Existing restoration journal records and modification/service records receive only an explicit, confirmed transfer of selected completed work. New build events retain project-specific history without copying an existing journal into a second store.
- Existing Supabase identity, live-session checks, community contribution restrictions, RLS/MFA moderation, private media bucket, JPEG normalization, cleanup queue, notifications and opt-in analytics are extended. No new auth provider, bucket, paid service or forum.
- Existing public garage publication is the pattern for a separately versioned public build projection. Private bindings never enter the public table/API. Existing community discussions reference the public build identity.

## State and persistence

A bounded versioned state references immutable model/package IDs and hashes, not geometry bytes. It stores a base configuration, planned target, supported appearance, selected OEM/aftermarket/custom components, tasks/dependencies, milestones, owner costs/notes and selected photo IDs. Owner-entered estimates remain nullable; unknown is never zero. Each CAS save appends an immutable revision and change summary. Autosave, explicit save, local undo/redo, account-scoped interruption recovery and conflict/reload/duplicate actions share one state contract. Restoring an old revision creates a new current revision; it does not rewrite history. Server RPCs validate JSON shape/size, canonical identifiers, asset allowlists, graph references, ownership and expected version.

## Publication and privacy

Permanent /builds/<public-id> URLs expose an explicit whitelisted snapshot. Private project IDs, garage IDs, private notes, unapproved/private photo paths, full VINs and private costs are excluded. Publication requires preview plus confirmation. Private edits do not republish; republishing appends a public revision. Unpublish/delete/moderation revoke future public reads including earlier snapshot/media access. Already downloaded copies cannot be recalled. Private project ownership and public snapshot visibility have independent policies.

## Supported visuals and evidence

Paint/finish, supported upholstery/trim, wheel/tire appearance and visual ride height apply to actual cloned renderer materials/transforms using node/material whitelists. Lamps, plates, gauges, source textures and cached original materials are protected. Wheel variants use licensed or original versioned packages, loaded on demand. Branded style labels describe a planning direction, not endorsed or authentic parts. Unsupported body kits, seat geometries, lighting/exhaust/engine swaps remain plan-only with explicit missing-preview labels. Existing E34 GLB bytes are not changed. Geometry never establishes wheel/brake/packaging clearance.

## Migration and test sequence

1. Define shared bounded state, compatibility, task graph, appearance targets and public projection; add domain tests.
2. Stage additive private projects/revisions/events, restricted public snapshots/bindings, media references, moderation/follows and RPCs. Preserve existing ownership constraints and account-deletion cascades. Test in disposable local Postgres, with actual REST/RLS integration where available. No hosted fixtures.
3. Add real material/asset effects to existing renderer; integrate Explore/Repair/Build, My Garage Builds, public pages/gallery/discussion links and exports.
4. Verify create→customize→wheel change→mechanical selection→compatibility→save→close/reopen→progress→publish→public view→private edit→republish, optimistic conflict handling, cross-account/media/public isolation and deletion.
5. Run legacy regressions, typecheck, lint delta, production/confidentiality build, SQL/RLS/recovery, desktop/390px browser journeys and measured asset/memory/loading checks. Present a local phone preview and explicit coverage/dependency/release status.
