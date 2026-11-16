# E34 model and transmission diagrams

8 November 2026. Extends Site42 and the connected scanner/catalog/garage workflow, without changing canonical identities, member records or the r14 model.

## Available experience

`/workshop` now explicitly separates the existing interactive 525i Sedan reference from `/workshop?tab=diagrams`. The diagram view reuses `CatalogBrowser` rather than creating a parallel parts system. Both workshop and catalog expose 525i, 530i, 535i, 540i and M5 model buttons, exact indexed year/body/engine source selections, and all/manual/automatic transmission views. Existing OEM callouts, alternate source illustrations, pan/zoom/rotation, expansion, part details, quantities/conditions, replacements, related service references, retailer links, discussion and private garage handoffs remain available.

Quick destinations open engine, manual gearbox, automatic gearbox, clutch/gearshift and bodywork groups. Model changes retain an indexed body/year where possible and always show the actual new source selection. This is source browsing, not editing a garage car. The existing selected-car comparison explains when that source differs from the owner's car. Shared links retain the exact source/assembly/position/transmission and exclude private car/scan identifiers.

Manual/automatic filtering only excludes an explicitly opposite source group or unambiguous transmission title. Shared and unspecified assemblies remain visible, with source conditions intact. Unknown equipment does not become verified fitment. A speed count in an automatic description does not make it a manual. Source-specific drawings include the 530i S5D sections, 535i Getrag 260/6 sections and 540i S6S 420G sections, including internals and housings. No new universal transmission identity is inferred from a model badge.

Some Touring selections do not contain manual-transmission sections. Those selections show a coverage explanation and an explicitly separate indexed Sedan reference link, without inventing factory Touring manual availability or conversion compatibility. Missing upstream pages remain gaps in the existing source inventory.

## Implementation

- `src/domain/catalog-variants.ts`: deterministic source selection, conservative assembly transmission classification and public browser URLs.
- `src/digital-twin/public/WorkshopExplorer.tsx`: lazy view choice. Diagram browsing does not initialize the full-car WebGL renderer.
- `CatalogBrowser`: one shared data/interaction implementation, contextual URLs and model/transmission/group controls.
- Existing Shell route, public-share allowlist, metadata and established CSS are extended.
- No migration, permission, Auth, secret, email, analytics opt-in or external project change.

## Verification

335 application tests / 35 files, 40 Python tests, TypeScript, analytics registry and production build pass. Seven new tests cover source/model transitions, transmission classification, public/private share boundaries and the actual retained 530i/535i/540i gearbox diagrams and OEM records. The served-route/data/anonymous-boundary suite passes 77 routes after adding the diagram view. Matching website/SQL and Android CI pass in GitHub run 42496771438 on source `155fad3d94d156c5cb0d5ce91a44f20c3efeff5c`. The client confidentiality scan passes all 1,854 assets.

Real Chrome local checks: 535i Getrag 260/6 internal diagram callout 20 opens BMW 23 31 1 224 358; zoom, rotation slider and fit operate. The 540i S6S420G gear-wheel diagram opens BMW 23 21 1 222 770. The 530i S5D housing diagram opens BMW 23 11 1 224 969. A manual Touring selection displays its source gap and explicit Sedan reference. At 390×844 the selected 530i manual view has no document overflow. No member content or repair outcome is fabricated for testing.

## Remaining geometry boundary

This adds model-specific source exploded drawings, not new measured whole-car 3D twins. The full-car r14 geometry remains the 525i/M50TU reference, with existing component isolation and held separation. Complete M30, M60, S38, Touring and transmission-specific assembled geometry, validated installation dimensions and additional interactive repair plans remain unfinished. Two-dimensional source drawings support identification and cannot establish hidden surfaces or exact three-dimensional factory dimensions by themselves.

## Published release receipt

**Site43 is live at https://e34lore.com/workshop?tab=diagrams.** Source `155fad3d94d156c5cb0d5ce91a44f20c3efeff5c`. Deployment succeeded at 2026-11-08T15:52:51.025764+00:00. Normalized artifact SHA256 `041a955b236993e1394eade625c7b7ef275c6cbff6a50f2e469345e38b6f640b`, 2,134 files / 172,840,960 bytes. Changes use PR19. Documentation-only receipts do not change the published artifact.

All 77 route/data checks and 32 HTTP security boundaries pass against the actual custom domain. Live Chrome opens the 535i Getrag internal diagram, selects callout20 into BMW 23 31 1 224 358, expands the viewer, uses zoom/rotation/fit and exits successfully. The header retains the owner's actual 530i Touring while the source selector explicitly shows the 535i manual reference and mismatch notice. Switching to the 540i keeps manual mode and loads the S6S420G internal diagram and BMW 23 21 1 222 770. No browser console errors are observed. Local automatic filtering/search and the 390px mobile check also pass. No garage record, configuration, installation, repair, photo or discussion was changed. Browser proof is retained locally under `outputs/workshop-variants/live-535i-manual.png`. The owned port3004 preview is stopped at teardown.
