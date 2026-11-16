# Catalog diagrams

Catalog drawings show an assembly and its numbered positions. Selecting a position opens the corresponding part record, source restrictions, quantities and related service information.

## Drawing coordinates

A drawing retains its source dimensions and coordinate system. Callout anchors refer to the original image so selection continues to work after zoom, pan or rotation. Several part records can share one callout when the source lists alternatives.

The viewer supports pointer and touch navigation, zoom controls, reset, focus on the selected position, rotation and an expanded view. Keep keyboard controls and touch targets usable when changing the viewer.

## Part identity and applicability

A canonical BMW number identifies a part. Its occurrence in a drawing records the source vehicle and the conditions attached to that position. Production dates, equipment, transmission and other restrictions remain attached to the occurrence.

Required quantity, package quantity and unnumbered figure labels have separate meanings. A manual figure label becomes a part number only when a source establishes that identity.

## Images and permissions

Record the creator, source, license and permitted use of each illustration. Preserve attribution and callout mappings. Use an original or appropriately licensed replacement when a drawing cannot be redistributed.

The standalone demo includes original drawings and synthetic part numbers. Deployment asset packs can supply additional catalog images and source records under their applicable permissions.

See [the catalog data model](owned-catalog.md), [Diagram.tsx](../src/components/Diagram.tsx), and the [contribution guide](../CONTRIBUTING.md).
