# Workshop models and component relationships

The Workshop connects a Three.js model to component identities, catalog positions, wiring references and repair information. E30 and E34 share the viewer and interaction code.

## Model assets

A released reference has an immutable model identifier, revision, manifest and asset hashes. The loader verifies the files before displaying them. New geometry receives a new revision so saved views and builds can reopen the version they used.

The public reader is in [src/digital-twin/public](../src/digital-twin/public). Geometry generators are in [tools/geometry](../tools/geometry) and [tools/generations](../tools/generations).

## Selection and movement

Nodes describe individual parts, assemblies, systems and their parent relationships. Catalog bindings link selectable nodes to source positions. Panel definitions specify hinges and opening motion. Exploded views use the component hierarchy to separate assemblies and their members.

Guided repairs define access, ordered operations, selected parts, tools and manual links for a particular reference. Verify that hardware remains attached to its parent until the procedure removes it. Refit should restore the original installed positions.

Wiring views add source-linked harness routes to supported references. Check the reference revision and manual edition when extending routing or circuit details.

## Geometry and evidence

Store source dimensions, units, mounting faces and the applicable vehicle configuration with a model contribution. Validate both assembled and separated views. Dimensions inferred from a photograph should retain their uncertainty.

Nominal seal generators and import tools are in [tools/digital-twin](../tools/digital-twin). Imported models need creator, license and source information. CAD and photogrammetry adapters require their corresponding external tools.

## Saved inspections and authoring

Workshop view preferences use revision-aware browser storage. Authenticated inspection sessions use the database's recorded configuration revision and ownership policies.

Source uploads and publication use staff permissions and the model review workflow. Contributor files remain separate from published model assets until review is complete.

See [Workshop behavior](public-workshop.md), [API and data](api-and-data.md), and [Build Studio](build-studio/architecture.md).
