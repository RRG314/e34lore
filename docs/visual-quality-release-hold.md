# Visual quality and real-part release hold

8 November 2026. Owner instruction after Site43: visually review new cars against the original reference, and test the scanner on actual parts before releasing unfinished functionality. **No new 3D variant or public visual-recognition release is authorized by this review.**

## What is actually available

| Item | Current evidence | Release decision |
| --- | --- | --- |
| 525i Sedan M50TU / r14 | Existing illustrative full-car reference, 454 selectable groups; immutable assets and previous separation/selection tests preserved. Live browser review below. | Existing release remains; not certified factory CAD or a complete installed-parts inventory. |
| 530i, 535i, 540i full-car 3D | No complete correctly assembled variant assets exist. Catalog diagrams are not substitute 3D twins. | Blocked: do not add variant badges to the 525i model or claim equivalent geometry. |
| Manual/automatic full-car variants | Distinct gearbox internals, mounts, clutch/control hardware and installed driveline layouts are not all modeled or dimensionally verified. | Blocked until correct assemblies, source identity and installation evidence exist. |
| Model-specific source exploded diagrams | Site43 exposes actual existing model/year/body drawings, exact callouts and canonical OEM records. 530i S5D, 535i Getrag 260/6 and 540i S6S420G browser checks are recorded separately. | Existing 2D references remain available, with scope/availability and mismatch notices. |
| Number reading and catalog lookup | Existing local image/OCR/manual-number flow; a candidate is not verified fitment. | Existing flow; real owner-part and physical-phone acceptance remains pending. |
| Shape-based recognition | Live anonymous runtime: `visual_available=false`, `public_visual_enabled=false`, `exact_visual_verified=false`. Genuine inference is current-MFA administrator testing only. Prior real-photo evaluation has wrong categories and false acceptance. | Keep private; no public photo-to-OEM or accuracy claim. |

The Site43 source is `155fad3d94d156c5cb0d5ce91a44f20c3efeff5c`; PR19 is merged as `aba9bdf`. This review does not alter the deployed artifact or publish new features. No roles, credentials, member records, gallery permissions or analytics settings change.

## Visual acceptance for each future 3D variant

Inspect actual renders, not just graph counts or a successful build. Capture assembled front/rear/left/right/top/underbody views and front/rear cabin views at desktop and mobile sizes. Check body completeness, panels/roof/glass/lamps, wheel centers inside the actual arches, tire/rim sizes, wheelbase, engine clearance, correct six-cylinder/V8 installation, body style, transmission, pedals and shifter. A reference asset's nominal dimensions do not certify every part's dimensions.

At 0%, intermediate and full separation, verify independent doors, proportional held motion, coherent part boundaries and surroundings, reversible assembly and no idle loop. Check settled frames rather than intermediate camera transitions. Rotate on both axes, zoom, isolate every supported system and select representative large and small parts into their exact OEM/source/service panel. Do not accept a new variant with hidden or borrowed engine/body/transmission assemblies as complete. Unmodeled/uncertain parts remain explicit gaps.

Only after geometry/source review, browser checks, owner visual approval and relevant regression tests may that variant enter a separately authorized release. Passing the existing 525i tests does not approve a different car.

## Live visual observations during this review

The existing r14 reference was inspected assembled from above, rear and left side. The roof and rear lamps render; side-view wheel centers sit within the visible wheel openings. This is visual inspection, not a measurement/clearance certification. Full separation reports 454 rendered groups, `partsMoving=false` and slider value4 (100%); the original body shell remains continuous and four doors have separate targets. Appearance and clearances of all 454 components were not individually certified. Existing source/accuracy limits remain.

The cabin remains a simplified artist-derived reference with faceted geometry and limited texture resolution; it is not photographic or measured factory detail.

## Private M60 source reconstruction — later owner correction

The owner rejected the simplified engine appearance and explicitly requires actual part photographs/catalog drawings. Work continues in the existing companion repository `/local/owner/Developer/e34-digital-twin-studio`, branch `steven/m60-engine-candidate`, committed as `f82eff0`. This adds original B30/B40 source-based engine studies; it does not insert an M60 into the live M50 car or create complete 530i/540i vehicle variants.

The current private r11 source has separate source-nominal bores/strokes/valve sizes and photo-guided stepped rocker covers, recessed coil trays, individual sealing hardware, oil filler, broad interleaved intake runners, mounting features, sculpted timing cases, openings/ribs, perimeter seals and plate/roller chains. Source photographs are original same-number intake-casting and M60 rebuild references; M62 donor accessories and E36 custom sump/mounts are explicitly excluded. No source photographs are published as new site assets. The detailed study has462 rendered groups per engine; that is not an OEM-completeness or visual-acceptance count. Many castings, internal passages, accessories, routing and interfaces remain unfinished.

Blender5.2.3 imported/rendered both actual candidates and saved editable scenes. FreeCAD1.1.4 produced/reopened editable specification fixtures with69 features,8 analytic bores and41 valid STEP solids per variant. These are nominal bore/piston/valve-diameter fixtures with inferred envelopes, not certified engine castings. The source facts, exclusions, exact output hashes, tool receipts and reproduction commands are documented in the companion `M60_SOURCE_RECONSTRUCTION.md`.

**Release remains blocked.** A manufacturer source gives192 primary-chain links at9.525 mm pitch; the current inferred route is1.690724 m against1.8288 m nominal, a7.55% length mismatch. This is an exposed dimensional failure, not a passed accuracy check. Sprocket/guide geometry and installed fit require reconstruction. The later detailed candidates also exceed the unchanged300,000-triangle runtime budget. Earlier smaller medium LOD checks do not approve the later geometry. All part-level mechanical/release flags remain false, canonical geometry identities stay unassigned, and installed vehicle transforms remain absent.

The source-candidate linker now requires component, category, exact assembly and name, with bank-specific rocker/coil-cover references. It rejects unrelated trim covers, gearbox/oil-pump pistons, airboxes and crank sensors. Source conditions/alternatives remain; missing540i valve-train pages are not hidden by relabeling530i data. Current private sidecars have212/474 B30 and110/474 B40 graph rows with source candidates; these are not exact fitment approvals.

Verification:168 TypeScript tests /20 files,51 Python tests, type checking and production build pass in the companion repo. Both detailed GLBs have0 Khronos errors/warnings. Browser review checks both candidates, real mesh selection into11121736003 and its exact catalog position, component focus, held100% separation and a390×844 layout without horizontal overflow. Portrait framing and stale selection notes were corrected. The temporary review tab/server were closed. These are software/render checks, not physical-phone performance, owner visual approval, full-car installation or successful scanner acceptance. Site43 and all live assets, database/member records, Auth/providers and recognition gates remain unchanged.

The owner's 530i Touring comparison explicitly reports unavailable engine, Touring body/interior and automatic-transmission geometry. Selecting the separate 525i reference for review does not create or modify an owned car. No 530i/535i/540i 3D screenshots are presented as if those complete models existed. Local review images are under `outputs/quality-review`; photos are not committed or published by this report.

## Actual-part scanner acceptance

The owner has a boxed 540i center support bearing. The box can establish independent test ground truth; box text, a part number and vehicle selection must not be required scanner inputs. Installed and loose broken-part photos both belong in the intended flow. No actual owner-part photographs or ground-truth number have been supplied. The owner explicitly deferred actions and asked that independent work continue first. **No real-part scanner result is claimed.**

For each supplied part, record model/installed configuration only if known, a clear whole-part photo from two angles and a close-up of the marking. Compare every read digit against the actual marking and independently sourced catalog record. Check the description, diagram position, quantity and production/transmission conditions. Test a second distinct part and a visually similar incompatible or unmarked example; uncertainty must stay uncertainty. Never assign an OEM number from shape similarity or turn a casting number into an ordering number without evidence.

Test permission allow/deny, rear camera, retake/crop/rotation, glare and blur, no-number/wrong-object outcomes, stop/background/navigation camera cleanup and cold/warm latency on the owner's actual phone. Check catalog/walkthrough/garage handoffs without inventing an installation or completed repair. A successful desktop gallery run does not prove mobile camera reliability.

Use the existing staff/current-MFA scanner on `/scanner`; camera photos and OCR pixels remain local. Do not automatically save observations, publish photos, train on owner photos or upload a test corpus. Existing experimental similarity scores are not confidence percentages. An owner demonstration alone does not validate E34-wide recognition; expand independent labeled/held-out testing before changing the public model gate.

| Actual test | Ground truth | Observed result | Status |
| --- | --- | --- | --- |
| 540i center support bearing, bare part | Box retained only as independent ground truth; number not supplied | Not run | Pending |
| Owner part 1, second angle / glare / blur | Same physical part | Not run | Pending |
| Owner part 2 | Awaiting supplied part | Not run | Pending |
| Unmarked / visually similar incompatible part | Independent label required | Not run | Pending |
| Physical phone capture and cleanup | Actual device/browser required | Not run | Pending |

See [scanner evaluation evidence](scanner/models-and-data.md), [hardware protocol](scanner/verification.md), [variant diagram release](workshop-variants.md) and [existing geometry limits](home-workshop-readiness.md).
