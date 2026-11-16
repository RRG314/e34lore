# Owner-supplied service manual

Reviewed 5 November 2026. This document records the evidence behind `src/data/manual.ts`; it is not a redistribution license or a technical certification.

## Registered source

The supplied file is **E34 5 Series Service Manual (1).pdf**, published by Bentley Publishers. It contains 472 physical PDF pages and scanned page images with an existing OCR layer. The publisher edition and publication year have not been established from this scan. The SHA-256 identity is stored in `manualSource`; the PDF creation date is a scanning metadata date and is not treated as the publication date.

The foreword at physical PDF page 5, printed page v, establishes coverage for U.S.-market 525i model years 1989-1995, 535i model years 1989-1993, and 530i/540i model years 1994-1995. Engine-General, physical PDF page 43 / printed 100-1, distinguishes the M20, M50, M50TU, M30 and M60 applications. Sedan/Touring applicability still needs to be read at the procedure level.

The source does not establish repair or fitment coverage for 518i, 520i, diesel models, 525iX, M5, non-U.S. configurations or modified vehicles. A matching engine-family name does not establish a part fitment or a production-date restriction.

The upload ends at printed Index 6, within P entries. Its completeness as a publisher edition is therefore **unknown**. The available wiring appendix is physical PDF pages 441-466, printed EWD-1 through EWD-26. This identifies the pages present; it does not assert that all E34 circuits are covered.

## Index method and checks

1. Extract text with Poppler `pdftotext -layout`. Split on form-feed characters to preserve physical PDF page positions.
2. Inspect only the first two extracted lines of physical pages 1-440 for a running header containing a three-digit repair-group number and a printed page number. Never infer a chapter boundary from an index entry or a cross-reference in the page body.
3. Normalize the OCR's optional spaces in a header such as `121 -1` or `3 0 0-1`.
4. Require each indexed group to start at printed page 1 and its running headers to progress contiguously through the final printed page. Record the physical positions of the first and final matching header. Blank divider pages are excluded from `pdfEnd`.
5. Confirm the index has 47 distinct repair groups, no overlapping physical ranges, and 420 content pages. The front matter, interleaved blanks, wiring appendix and index are separate.
6. Render representative source pages with `pdftoppm` and inspect the actual page images. Visually reviewed material includes the foreword; Engine-General 100-1; Battery, Starter, Alternator 121-1; Cooling 170-1, 170-2, 170-3, 170-8, 170-9; and Front Suspension 310-1 through 310-4.

The resulting chapter state is `header-indexed`. This means the index is checked against the scanned running headers. It does not mean that every paragraph, specification, diagram or repair in that chapter has been reviewed.

Representative boundaries:

| Group | Physical PDF pages | Printed pages |
| --- | --- | --- |
| 010 Fundamentals | 9-22 | 010-1 to 010-14 |
| 020 Maintenance | 23-42 | 020-1 to 020-20 |
| 100 Engine-General | 43-57 | 100-1 to 100-15 |
| 121 Battery, Starter, Alternator | 163-168 | 121-1 to 121-6 |
| 170 Cooling | 205-216 | 170-1 to 170-12 |
| 310 Front Suspension | 277-288 | 310-1 to 310-12 |
| 340 Brakes | 317-328 | 340-1 to 340-12 |
| 721 Airbag System | 435-439 | 721-1 to 721-5 |

The complete 47-group index is the typed `manualChapters` export.

## Original website entries

Six original entries are supplied as `manualGuides`:

| Entry | Bounded purpose | Source pages |
| --- | --- | --- |
| Identify the engine | Record identity and uncertainty | PDF 5, 43 / foreword v, 100-1 |
| Cold cooling-system visual check | Gather leak, belt, hose and airflow observations | PDF 205-206 / 170-1 to 170-2 |
| Cooling fan airflow check | Identify both fan arrangements and record safe visual observations | PDF 205, 207 / 170-1, 170-3 |
| M50 coolant-pump job planning | Prepare correct procedure, access tools, seals and completion checks | PDF 212-213 / 170-8 to 170-9 |
| Battery cable and ground inspection | Gather connection and belt observations | PDF 163 / 121-1 |
| Front strut component identification | Distinguish components and production-dependent upper stacks | PDF 277-280 / 310-1 to 310-4 |

Each entry has a source identity, printed section, physical PDF positions, tools, cautions, ordered steps and a check for each step. Its kind distinguishes an inspection, reference or planning task. The M50 planning entry is explicitly not a stand-alone pump replacement procedure. No guide claims a verified repair outcome. All guides remain `draft`, despite their cited source pages being visually checked. Reading/inspection durations are editorial estimates, not publisher labor times.

The entries deliberately do not import numerical tightening specifications, OEM numbers, fluid capacities or live circuit-bridging tests. Those require separate, condition-specific verification before becoming actionable structured records. The scan's historical pump-material recommendation is not promoted into a current universal parts recommendation.

The front-strut illustration at physical PDF 280 / printed 310-4 shows different upper stacks for 1989-1992 and 1993-on applications, as well as camber-correcting mount identification. Any original interactive teaching diagram must state its intended configuration and remain distinct from a verified OEM catalog drawing. A selectable shape alone must never certify fitment.

## Publication boundary

The source PDF, raw OCR and full publisher pages stay outside the site assets. Following the user’s explicit request, six bounded figure excerpts are now included in the owner-private review with native captions/callouts and exact citations. See diagram-catalog.md. This does not establish public redistribution rights. Original reference entries and bibliographic/page metadata remain available. `downloadAvailable` is false. A source reference is useful even when the site cannot display the underlying copyrighted page. Record explicit permission or a license before publishing publisher diagrams, scans or downloads.

## Remaining work

- Obtain the exact edition and complete source inventory; resolve the apparent index ending before calling the scan complete.
- Review each proposed specification with its fastener/component identity, conditions, units, exact source position and applicability.
- Validate production-date, option, market, transmission and body differences against suitable source records.
- Have a qualified reviewer approve actionable repair procedures and diagnostic decision graphs. A successful website test does not certify a physical repair.
- Obtain documented catalog data and illustration rights before claiming complete OEM coverage or manufacturer-confirmed fitment.
- Add independent and current evidence for all unsupported models, modified applications and replacement-part supersessions.

## Follow-up: M50 coolant-pump replacement evidence

The replacement sequence and its dependencies were inspected more closely for a potential full repair entry. The applicable source sequence is M50 pump removal/installation at PDF 212-213 / 170-8 to 170-9; draining, filling and bleeding at PDF 209 / 170-5; the M50 belt tensioner at PDF 35 / 020-13; and fan/shroud removal at PDF 216 / 170-12. General lifting/support precautions are PDF 11-12 / 010-3 to 010-4. The battery precautions and location differences are PDF 163 / 121-1. All these pages were rendered and visually inspected.

The source supports the following facts. This ledger is evidence for editorial review; it is not an approved repair procedure or a current replacement-part recommendation.

| Identity | Source-supported value or operation | Conditions and source |
| --- | --- | --- |
| Source-shown M50 belt tensioner | 8 mm Allen drive; rotate clockwise to relieve tension | PDF 35 / 020-13, Fig. 11. Verify actual installed tensioner; the scan does not establish every replacement arrangement. |
| M50 coolant-pump retaining nuts | Four nuts; tighten alternately and evenly, then 10 Nm | PDF 212-213 / 170-8 to 170-9. Table identity: coolant pump to timing-chain cover. Thread lubrication condition is not specified. |
| Pump extraction points | Two M6 bolts, advanced evenly in the pump ears | PDF 212-213 / 170-8 to 170-9. Bolt lengths and minimum engagement are not specified. |
| Coolant-pump pulley fasteners | 10 Nm | PDF 213 / 170-9. Table identity: coolant-pump pulley to coolant pump. Thread lubrication condition is not specified. |
| Fan-clutch nut to coolant pump | 32 mm wrench; left-hand thread; loosen clockwise when viewed from the front of the car | PDF 216 / 170-12. M50 holding-tool reference is BMW 11 5 050. Store the removed clutch upright. |
| Fan-clutch nut tightening | 40 Nm without BMW 11 5 040; 30 Nm with BMW 11 5 040 | PDF 216 / 170-12. The tool condition is part of the value; these values must not be collapsed into a universal torque. |
| M50 engine-block coolant drain plug | 40 Nm, new sealing washer | PDF 209 / 170-5. Source locates the plug below cylinder 6 on the exhaust side. |
| Radiator drain plug | 2-3 Nm; source calls for new sealing washers when refitting the drains | PDF 209 / 170-5. Verify actual radiator/drain construction and seal arrangement. |
| Source M50 cooling-system capacity | 10.5 litres | PDF 209 / 170-5, Table b. Nominal system capacity, not an instruction to force that volume into a partly drained system. |
| Source coolant mixture | 50% antifreeze and 50% water | PDF 209 / 170-5. PDF 36 / 020-14 and PDF 210 / 170-6 require suitable BMW-approved coolant/equivalent. Current product choice and mixing-water requirements need manufacturer evidence. |
| M50 pump seal | New O-ring; the source suggests a thin petroleum-jelly film for assembly | PDF 212-213 / 170-8 to 170-9. Confirm compatibility with the actual replacement seal and manufacturer instructions rather than applying this historical suggestion universally. |

The source's bleed procedure fills to the cold mark, opens the applicable bleed screw while adding coolant, then closes it. It later calls for loosening that screw with the engine idling at normal operating temperature until discharged coolant has no air bubbles, followed by a coolant-level recheck after cooling. However, the text never explicitly establishes the expansion-tank cap's position during that warm stage. Its warnings also prohibit opening a hot pressurized cap. No bleed-screw tightening torque is provided.

A stand-alone beginner repair should not silently invent that pressure/cap sequence or convert a source omission into a checked instruction. Before a full replacement entry is published, a qualified reviewer must resolve the complete bleed/cap sequence for the actual 525i arrangement, confirm the actual tensioner and replacement-part instructions, and review how the hot-coolant and rotating-fan hazards are controlled. The exact guide scope would be U.S. 1991-1995 525i with a confirmed M50/M50TU installation and source-matching cooling/belt hardware. M20, M30, M60, engine swaps and modified cooling arrangements would be excluded.

## Maintenance walkthrough expansion — 6 November 2026

Six original drafts extend the existing guide library. Each has applicability, tools, stop conditions, completion checks and versioned steps. The cited Bentley pages were rendered and visually checked. No new scans, OCR or publisher illustrations are bundled.

| Walkthrough | Scope | Printed and PDF pages |
| --- | --- | --- |
| Engine air filter | Replacement in the factory two-piece, spring-clipped housing | 020-10, Figs. 5–6 / PDF 32 |
| Front windshield blades | Replacement of source-matching complete blade assemblies | 020-18 and 611-1 to 611-2 / PDF 40, 387–388 |
| Accessory drive belts | Engine-off visual check of accessible spans | 020-12 to 020-13 / PDF 34–35 |
| Brake/clutch reservoir | External level check and escalation | 020-15 to 020-16 / PDF 37–38 |
| Steering fluid | Source-shown labeled reservoir and dipstick check | 020-15, Fig. 15 / PDF 37 |
| Tire pressures | Cold placard-matched readings and follow-up | 020-16 / PDF 38 and [NHTSA TireWise](https://www.nhtsa.gov/vehicle-safety/tires) |

The brake-fluid reservoir image is Fig. 16 on PDF 37. The text on that page points to Fig. 15, whose caption and illustration identify the steering dipstick. The new guide cites the brake-fluid image by its actual figure number.

The shared search index uses editorial component and symptom terms, the actual guide text headings and the existing chapter titles. Source hits are chapter pointers. For example, head gasket, brake-pad replacement, and cabin filter searches can route to Bentley chapters while the corresponding site procedures are still pending. Exact page locators, revision archives and FK-backed step references preserve the source and discussion links. This release does not resolve the coolant-pump bleed ambiguity or provide complete shop procedures for all manual groups.

## Production polish and coverage follow-up

The four new draft guides use visually checked PDF 30–32 (M50 oil and filter), 163 and 407–408 (factory halogen headlight), 163, 407 and 410 (Sedan body-mounted tail lamp), and 353 (front window inspection). The new halogen quarter-turn graphic is original explanatory artwork, with the direction verified against 630-1 and 630-2. The oil guide separates sump-plug torque from filter-cover torque and ties each value to identified hardware. Complete physical testing and technical sign-off remain pending.

Bentley image excerpts are stored outside the source checkout used for distribution. The site retains source locators and indexed components. Public asset checks assert that the old image URLs return 404.

## Mobile reference release

The mobile chapter index at `/manual` shares the existing repair search and exposes the indexed chapters, appendices and original walkthroughs. Quick Reference lives at `/quick-reference`, with `fluids`, `fuses` and `locations` subroutes. The locations and fuse views share an original vector car map. Positions are approximate; location text and printed page references carry the applicability details.

- Fluids use Bentley 020-8, 020-15–16, 170-1 and 170-5, 230-1–2, 240-15–16, 331-4 and 611-8. Capacity units are normalized from the supported liter values. Oil is with a filter change, coolant is total system volume and gearbox entries use the stated service conditions. The M20 oil and cooling figures and the 530i and 535i final-drive quantities have documented conflicts and no single fill amount in the interface.
- Fuse data reproduces the factual positions and ratings in 610-3–5 Table a with original circuit summaries. Seven relay and module keys correspond to Figures 1–7. Numbered but unlisted positions and listed vacancies carry no recommended amperage. Use the installed cover and applicable wiring diagram for physical rows and fuse rating.
- Component locators include both battery locations, the Touring rear washer reservoir and the four fuse/relay boxes. Explicit U.S. model-year, engine and equipment boundaries are shown. The fluid selector may suggest a compatible saved U.S. engine family. The manual’s model years and the garage’s production dates are separate.
- The original PDF and publisher illustrations remain outside the public bundle. No new database tables, credentials or paid data service are required.

## Job-level indexing and conversion guides

The chapter contents were used to create 301 original job labels and exact starting locators across the 47 repair groups. The labels group related entries where that helps navigation. Site search and Repair Center search distinguish a manual job locator from an authored guide. The chapter index exposes both and connects verified guide scopes directly. The TOC index is a coverage map, and rows without a guide remain source pointers.

The 24 additions share the existing guide renderer, pinned revision and step contracts, garage progress, discussion links and journal handoffs. The prior 16 revision hashes are preserved. New archived snapshots include any supporting source links and related guides.

- Factory service cites the uploaded Bentley source. The VANOS air test and timing reinstallation use the documented tools and checks. The access-plug torque units in Bentley conflict and the guide calls for confirming the correct value.
- The VANOS piston seal procedure uses [Beisan Systems’ bench work](https://beisansystems.com/single-vanos-6-cyl-e36-e34-e39/) alongside the factory removal and timing procedure. The fixed-timing guide links the exact [VAC kit instructions](https://store.vacmotorsports.com/articles/INST-VEK-M50.htm) and keeps measurements and cam timing targets build-specific.
- Swaps separate factory baseline procedures from recipient, donor, wiring, inspection and commissioning decisions. The S52 guide cites a [first-person build](https://www.ascfabrics.com/post/e34s52-5). U.S. road-use coverage refers to [EPA enforcement guidance](https://www.epa.gov/enforcement/air-enforcement) and [California BAR’s engine-change process](https://www.bar.ca.gov/engine-changes/) where applicable.
- Equipment scope remains U.S. factory unless the individual guide establishes other evidence. No change to the database schema or permissions was needed. Register the new guide rows, step indices and immutable archives before deploying their source revision.
