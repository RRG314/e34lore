# E34 Lore post-inventory audit

Audit date 6 November 2026, America/New_York. The owner handbook remains a historical snapshot of `3e008d84a4b2c7f39d2c7d1c3b4b1ff150040c4e`. This report supersedes its release counts. The implementation baseline before this audit was `b60aa0209a28ba14e1d1c5f2f285ce690b9b2f6e`, Sites v23. The external deployment receipt records the exact audit build and verification results.

## Owner access follow-up — 7 November 2026

The owner completed TOTP enrollment and verification in the signed-in Chrome account. The account page showed **Authenticator verified**. The actual `/manage` dashboard loaded its seven sections and live counts. Guest review loaded its empty queue, Members showed the owner's chosen handle with restriction controls, and `/community/admin` loaded the action form, appeals, restrictions and audit. No real moderation action was submitted. The hosted aggregate independently confirmed one staff identity with a verified TOTP factor. This closes initial owner enrollment and real dashboard access, superseding the zero-factor checkpoint below. Recovery using a lost or replacement factor remains untested on the owner account.

The follow-up fixes a separate stale-session path: staff pages previously depended only on the account UUID and would not automatically reconsider an AAL1 denial after that same account completed MFA. New session tokens now advance an in-memory authorization revision and reset staff page state; duplicate focus notifications preserve forms. Late initial reads cannot overwrite newer MFA or sign-out events. Account settings, private garages and community preferences reset on identity changes. No credentials are added to application context or staff permissions. The server's existing role and AAL2 gates are unchanged.

Authenticator setup now includes pending enrollments, distinct setup names, recoverable request errors, a direct continuation link and a stable security anchor. The private QR stays in the account component. Staff query responses are validated, stale requests are discarded and reads cancel after 15 seconds. The dashboard and moderation/review desks now expose retries; empty cars, discussions, restrictions and audit lists are explicit. Failed mutations release their busy state. Operations documentation now reflects the existing public audience and moderated car-photo pipeline.

Live follow-up also reproduced a search-focus bug: each debounced search replaced the entire dashboard with its loading state. The final repair retains the last response only within the same account and authorization revision, keeps the search input mounted, announces updates and disables result actions until the current query finishes. An account or authorization change still drops the earlier response immediately.

The dashboard screenshot exposed a shared footer defect: analytics consent still used pale text intended for a dark footer, and the global column layout separated its checkbox from the label. Consent now uses the site's dark text, a horizontal checkbox label, larger readable text and the existing light-footer divider. The opt-in default and analytics data behavior are unchanged.

Typecheck, 146 unit tests, 24 Python checks and the production build passed. The unit additions cover same-account MFA renewal, duplicate focus events, stale initial reads after MFA/sign-out, network recovery, observer cleanup and the three staff response contracts. Three hosted rollback suites passed again: identity, community and car showcase. These include direct member denial, staff AAL1 rejection, AAL2 access, reasoned staff actions, audit and private photo/journal boundaries using disposable transaction fixtures. Full lint remains red at 247 errors and 66 warnings, improved from the previous 263/71; rules remain enabled. New auth observer, response contracts and authenticator component have no lint diagnostics. Internal document-link diagnostics and other older application debt remain open.

Live verification and the exact published source/version are recorded in the external deployment receipt. No member data, catalog identity, source archive, geometry record or Android signing identity was replaced. Mailbox recovery, a complete production-and-Storage restore, physical-device accessibility and missing technical measurements remain separate acceptance requirements.

## Discrepancies verified against source and hosted data

| Area | Inventory snapshot | Current audit evidence |
| --- | --- | --- |
| Site and source | Public E34 Lore, private GitHub, dedicated Supabase | Same site and domain, repository and backend. Sites returned public audience revision 2. |
| Quick reference | Earlier manual chapter browse | Live since v22. Three quick-reference sections, 44 factual fuse-table rows and 15 schematic location markers. |
| Walkthroughs | 16 current guides, 66 step references | v23 added 24 guides and 109 steps. This audit revises one guide in place with a new archive. Hosted database has 40 current guides, 41 immutable revisions and 180 indexed steps including history. |
| Manual | 47 repair chapters and two appendices | v23 added 301 job and topic locators. The source PDF is private. The supplied scan ends partway through its index. |
| OEM catalog | 24,324 normalized BMW numbers, nine selections, 79,628 active positions | 24,324 unique normalized numbers across 24,393 total part rows. Four recovered pages bring active positions to 79,733. No existing canonical ID or source record was replaced. |
| Drawings | 4,069 per-selection source records and 901 unique source images | 4,074 per-selection records and 901 distinct URLs. New records reused existing source images. |
| Interchange | Directed supersessions with an empty general interchange table | 77 legacy fitment rows and 8,988 direct supersessions before the audit. One new position-scoped interchange record and new evidence UI. The recovered import can add direct supersession observations through the existing importer. |
| Community | Native forum, eight categories, 48 starter resources | All eight categories and 48 editorial resources verified in the hosted database. Existing versioned feedback, report, appeal and role model retained. |
| Owner security | Confirmed owner with assigned staff access | One confirmed-email account holds two staff roles. Zero verified TOTP factors at audit check. A role alone cannot open staff tools. |
| Android | Internal test, `com.e34lore.app`, version 0.1.0 code 1 | Same package, signing files and track in existing records. Local Gradle bundle and debug build passed. ADB listed zero devices. |

## Operational security and recovery

- Hosted rollback-only checks exercised account isolation, the AAL1/AAL2 gate with fixture claims, reviewer separation, private journals and progress, public snapshot withdrawal, guest review and audit records, appeals and report handling, photo metadata and byte policy, deletion cleanup queue, catalog RLS, revisions and pagination. Thirteen scripts completed. Eleven returned explicit PASS assertions. The digital-twin and seed scripts completed without an exception or PASS marker. A stale catalog fixture initially lacked a confirmed email. The corrected fixture passed with a bounded identity lookup and the new interchange assertions. The follow-up found zero test accounts matching the synthetic email marker.
- Hosted schema inspection counted RLS on all 79 custom base tables. Tests used the dedicated project with transactions that roll back. Production account-deletion and photo cleanup had passed on a disposable authenticated fixture in the prior release. This audit re-ran the SQL permission and queue checks. It did not delete a real member or send a message to one.
- Public Auth settings advertise email and Google and require email confirmation. Apple and Facebook were inactive at the audit check. The prior Resend simulation received confirmation and recovery messages. The owner-controlled inbox, completed recovery link, expiry and replay checks remain open. A confirmed Google identity cannot establish email-password confirmation.
- The recovery harness created two disposable PostgreSQL 17 clusters, used a custom-format dump and restored it to the second cluster. The archive contained 107,956 bytes and SHA-256 `f9eea7c4b1e11e860a53232932b4e124f6351249b090a2a396e75ded086dcf10`. Dump, restore and assertions took one second at the recorded timing resolution. It recovered synthetic identity, private vehicle, service, discussion and audit records. It verified owner access, cross-owner denial, public reading, audit privacy and deletion cascades. Both clusters and the synthetic dump were removed. This is a foundational database rehearsal. It did not restore production Auth state, journals, managed roles and extensions, or Storage bytes.
- A production restore needs authorized database-dump access, an isolated recovery target and a separately verified Storage-object copy. Staff enrollment and lost-factor recovery need the owner's trusted sign-in. Follow [the recovery and mailbox checklist](community-operations.md) and [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups).

## Original guide audit

Each original guide was checked against its recorded scope, source locator, step content, specifications and cautions. Current walkthroughs remain editorial drafts pending technical sign-off. A location or planning guide has a narrower scope than a replacement procedure.

| Guide at the inventory release | Audit disposition |
| --- | --- |
| Engine identification | Retain as identification workflow. Installed swaps and non-U.S. engine assignments require separate evidence. |
| Cold cooling inspection | Retain cold visual scope. Pressure testing, combustion-gas tests and warm running checks require the applicable procedure. |
| Cooling airflow check | Retain inspection. The mechanical clutch and auxiliary-fan test cannot be certified from a stationary observation. |
| M50 pump planning | Revised to U.S. 1991–95 525i M50/M50TU, four studs. Added documented access, two M6 extraction bolts, new seal, even tightening and factory 10 Nm values for both identified fastener groups. The source leaves a reservoir-cap sequence ambiguity. Confirm the installed cooling system’s fill and bleed before draining. |
| Battery connections and grounds | Battery location by year is already specific. Retain external inspection scope and defer live measurements to the appropriate charging procedure. |
| Front strut identification | Retain identification scope. The source list and illustration cannot certify spring, damper or upper mount interchange. Loaded spring removal remains a separate procedure. |
| Air filter | Ready as an editorial clip-fastened airbox replacement for the named factory layouts. Housing and replacement element must match. |
| Front wiper blades | Complete for the described front retainer. The Touring rear assembly, insert and arm are separate jobs. |
| Accessory belt inspection | Retain engine-off inspection. Tensioner identification, routing and actual belt replacement need separate variant procedures. |
| Brake and clutch reservoir | External check only. A leak, low fluid, warning or sinking pedal needs diagnosis before driving. |
| Power steering fluid | Retain labeled reservoir check. Shared hydraulic equipment and installed cap determine fluid family. |
| Cold tire pressure | Retain vehicle placard, tire-size and load method. Unlisted sizes need a separate supported pressure specification. |
| M50 oil and filter | Source includes fill condition, dipstick confirmation and separate filter-cap versus sump torque. Retain the factory housing and plug restrictions. |
| Factory halogen headlight | Retain matching quarter-turn installation and beam check. It does not establish fitment for other lamp housings or conversions. |
| Sedan tail-lamp bulb | Retain body-mounted quarter-turn scope and function check. Touring and other locations are excluded by scope. |
| Dropped front window | Retain external inspection. Regulator replacement and supported glass removal still need an original variant-specific procedure. |

The published M50 guide kept its slug. The previous archive `a0ebe9e0e41c6f2c55976074` remains accessible. The new revision is `5c458d5b100cc7b4c5c2b469`. The remaining manual topics are indexed in the site and still need authored steps where a guide link is absent. See [manual ingestion](manual-ingestion.md).

## Vehicle and subsystem coverage

| Vehicle families | Engines in the vehicle selector | Factory service evidence | Imported diagram scope |
| --- | --- | --- | --- |
| 525i | M20, M50, M50TU | U.S. 1989–95. 1989–90 M20, 1991–92 M50, 1993–95 M50TU. Confirm installed engine and options. | Four vendor selections. The vendor's 1991 M20 and M50 labels remain separate, with market and body unknown where the vendor omitted them. |
| 535i | M30 | U.S. 1989–93 | One 1993 Sedan selection |
| 530i | M30, M60 | U.S. M60 only, 1994–95. M30 is outside this service source. | 1994 Sedan and 1995 Touring vendor selections |
| 540i | M60 | U.S. 1994–95 | One 1995 Sedan selection |
| M5 | S38 | Outside supplied repair manual | One 1993 Sedan selection. Other body and market scope remains unverified. |
| 525iX, 520i | M50/M50TU for 525iX. M20/M50/M50TU for 520i. | Outside supplied E34 model coverage even where engine names overlap | Identity/archive evidence where observed. No full position import for these models. |
| 518g, 518i, 524td, 525td, 525tds | M43, M40/M43, M21 and M51 | Outside supplied repair manual | Identity/archive evidence where observed. No full position import for these models. |

| System | Current site guidance | Illustration or diagnostics boundary |
| --- | --- | --- |
| Cooling | Cold inspection, fan triage, M50 pump and fluid reference. Electric fan project is configuration-specific. | Overheating graph, sourced pump diagram, existing workshop dependencies. Physical geometry and bleed verification are separate. |
| Engine and ignition | Identification, belts, plugs, cam-cover seal, M20 belt, M50TU VANOS and donor planning. | No-start graph shares ignition, fuel and electrical checks. No complete engine CAD or internal rebuild coverage. |
| Transmission and drive | Identification, factory manual fill, differential service, clutch installation and donor plans. | Direct parts listings retain individual restrictions. Swap plans require verified donor, shaft and wiring interfaces. |
| Suspension and steering | Strut identification, steering fluid and self-leveling project planning. | Vibration graph and catalog strut/damper drawings. Full geometry and travel measurements are absent. |
| Brakes | Fluid and wear inspection plus source-matching sliding-caliper pad replacement. | Braking graph and front caliper/disc/shield drawings. No general fitment approval or hydraulic bleed coverage for every option. |
| Electrical and HVAC | Battery/ground inspection, fuses, lighting, wipers/washer, microfilter and blower diagnosis. | Wiring appendix is indexed. Equipment-specific circuits and control variants require matching diagrams. |
| Body and interior | Hood struts and dropped-window inspection. | Most body, safety restraints and trim work remain manual job locators. |

Four diagnostic graphs are implemented and checked for start nodes, terminal outcomes, reachable branches and cycles. Other diagnostic groups in the master specification remain coverage gaps.

## Catalog recovery and interchange

The prior nine source manifests had 33 missing pages. The audit retried four transient HTTP 502 routes through the existing robots-aware importer. All four parsed and passed the fact checks. Existing 403 and absent public catalog-state responses were left as coverage gaps. The additions are the 1991 M20-selected 525i door harness, 1993 535i illuminated shift knob retrofit, 1993 M5 wood trim and 1995 540i pump/thermostat. Each retains its source URL, snapshot hash, row hashes and an independent private import receipt. The canonical count stayed at 24,324. Twenty-nine registered pages remain open. [Updated source-selection counts](owned-catalog.md).

The catalog now reads `part_fitments` and `part_interchanges` alongside the existing `part_supersessions`. Matching source records can be conditional, conflicting, explicitly incompatible or unknown. An unselected field, a partial production month or another source scope cannot prove fitment. The added fastener record is directional and requires the exact 1995 525i Touring water-pump callout 03, from BMW 07 12 9 900 681 to BMW 07 12 9 904 553. No aftermarket identity, reverse edge or transitive claim was added. [Catalog source](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-wagon_e34/engine/water_pump_thermostat.html).

## Digital twin evidence

The M50 pump and seal were chosen because the existing graph has an exact catalog number, an independently cited manual removal sequence and a quantitative nominal seal expression. The binary position vertices in both shipped GLB detail levels measure 68 mm inside, 78 mm outside and 5 mm section under the documented circular interpretation. The workshop shows the values and source. The geometry and graph IDs, transforms and accuracy fields are preserved.

The source documents fan/shroud, belt, pulley and four retaining nuts before pump removal. It documents two extraction ears and a new seal, then even refitting. It does not give the chassis coordinate frame, installed transforms, mounting hole centers, seating depth, O-ring groove diameters and width, hardware tolerances, hose/steering clearance or a validated sweep path. Measure an identified original pump and matching timing cover, studs, pulley plane, seal groove and installed access envelope. Record measuring equipment and uncertainty, capture cross-check images and pair with the confirmed cooling variant and a supervised extraction and reassembly. Until then the graph supports illustration and procedural dependencies. Physical dimensional and installed-removal approval remain open.

## Community operations and Android

Existing taxonomy, templates, typed links, versioned feedback and staff boundaries passed inspection. The [owner review draft](community-policy-owner-review.md) covers privacy, evidence, moderation and appeals. It remains separate from the current public policy. The audit did not generate permanent member activity or buy a service.

The Android release bundle and debug APK built locally. The Play package, version code and signing certificates were preserved. The [physical-device checklist](../android/README.md#physical-verification-checklist) covers Play installation, TWA verification, links, sharing, offline recovery, login, private records, and TalkBack. ADB found no connected authorized device.

## Verification and release gates

- Typecheck, 137 unit checks, 24 import/pipeline checks and production build passed. HTTP integration checks cover live source routes and hosted database boundaries. The exact build, count, timing observations and CI job results are pinned in the external receipt.
- Mobile browser checks covered the catalog evidence, exact source-position link activated by keyboard, the workshop seal evidence and viewport overflow at 320 CSS pixels. Browser accessibility roles were inspected. Physical screen-reader and Android testing remain open.
- ESLint exposed a nested React effect in the public journal that could throw an invalid-hook error. The scroll effect now runs at component scope, after the journal data arrives. Full lint reported 264 errors and 73 warnings at baseline and 263 errors and 71 warnings after the repair. Remaining diagnostics include internal links, broad types and synchronous state changes. The audit left those rules enabled. The live workshop-to-guide link uses document navigation because the client Link failed to navigate in the deployed Worker.
- Operational acceptance still requires the owner MFA and recovery check, real inbox confirmation/recovery, full production backup plus Storage restoration, and policy approval. Technical claims remain bounded by the per-source coverage above. Physical validation and missing documents are explicit release gates for new certified procedures or CAD.
