# Scanner, 525i service detail and saved repair journey

10 November 2026. Local continuation of Site49 on `steven/member-reliability-and-reference-accuracy`. No push, hosted migration, function publication or deployment. The owner will test a mix of real parts before release.

## Review URLs

- Phone/LAN: http://127.0.0.1:3012/scanner
- Desktop: http://127.0.0.1:3012/scanner
- Disposable account: `studio-review@example.invalid`, password `review-only`.
- Production-build boundary check: http://127.0.0.1:3014. This uses the accepted models and excludes the local 525i candidate. It is not a hosted staging deployment.

The review banner identifies the disposable backend. Existing hosted accounts, cars, uploads and browser drafts have not been reset. Keep the development server on a trusted local network; its work directory, backups, private source files and migration source are denied by Vite.

## Scanner evidence

The category library now contains 16 licensed photographs: 13 positive references and three negative references. Four additions cover a dirty automotive air filter, an installed BMW alternator, a vacuum-cleaner motor and a bicycle brake. All are category examples. There are **zero exact-OEM references**. The oval filter photograph does not represent the E34 rectangular element.

Each admitted derivative has a retained source URL, author, license, original hash and derivative hash in `data/parts-media/manifest.json`. Images labeled as alternators but dominated by hoses/intake, a caliper hidden behind wheel spokes, and duplicate evaluation sources were excluded. No synthetic product image or member upload was added to this index.

The proposal cutoffs remain similarity 0.80 and family margin 0.035, with text corroboration. These values are not probabilities. Strong negative matches and conflicting strong categories across views suppress positive candidate cards. A scan still represents different views of one physical part; exact identity requires checking its number and catalog record.

### Frozen comparison

| Partition | Cases | Before: correct / wrong proposals | After: correct / wrong proposals | Unknowns rejected, before and after |
| --- | ---: | ---: | ---: | ---: |
| Historical regression | 11 positive + 4 unknown | 2 / 0 | 2 / 0 | 4/4 |
| Added convenience examples | 1 positive + 2 unknown | 0 / 0 | 0 / 0 | 2/2 |

There is **no measured recall gain**: both policies proposed two of the twelve positive examples. Historical positive top-one ranking declined from 7/11 to 6/11; ranking is separate from proposals passing all gates. Six observed unknowns were rejected and there were no observed wrong proposals. This small convenience set cannot establish population precision, exact-part accuracy or phone performance.

The valid receipt is `work/scanner-accuracy-20261110/final-unique-evaluation/`. It contains 18 unique queries, a pre-inference freeze, source/pixel/perceptual separation audit and before/after results. Earlier failed preflights are marked rejected. The original 15-case freeze remains unchanged. Physical-object and model-pretraining independence remain unproven; historical author metadata is incomplete. No real-phone evaluation has been completed.

## 525i candidate

The accepted 1995 525i M50TU automatic manifest, revision 23, and all four original GLBs remain byte-identical. `tools/build-525i-service-candidate.mjs` produces a separate local revision 1001 under `work/525i-service-candidate/`. Hash-named files are served only by the disposable development plugin; no URL flag or production environment setting enables them in a production build. Published candidate revisions cannot be silently overwritten with different bytes, and local archives retain earlier pins.

The candidate adds one individually selectable air-filter element inside the existing airbox: 449 renderable components versus the accepted 448. Its original illustrative mesh has an exported outer envelope of **325 × 150 × 57 mm**, matching [MANN-FILTER C 33 130](https://www.mann-filter.com/uk-en/catalogue/search-results/product.html/c33130_mann-filter.html). The manufacturer lists BMW 13721726916 and 13721730918. Both exact occurrences in the retained 1995 catalog bind to this element and the air-filter guide/manual 020-10, PDF 32.

Only the outer envelope is checked. Pleat count, sealing detail, tolerances, housing clearances, mounting interfaces, installed placement and fitment remain unverified. The housing display scale was adjusted illustratively; the element cancels that display scale to retain its checked dimensions. Containing assemblies become transparent when an internal component is inspected. Exact component bindings take precedence over a broader assembly in selection and service links.

| Coverage | Accepted revision 23 | Local revision 1001 |
| --- | ---: | ---: |
| Renderable components | 448 | 449 |
| Narrow outer-envelope checks | 1 oil filter | Oil filter + air filter |
| Fully dimensionally verified components | 0 | 0 |
| Automatic gearbox internals | Missing | Missing |

This is incremental service detail, not a completed mechanical reconstruction. Gearbox warnings now appear when inspecting the transmission, while full model limitations remain in About this reference.

## Scan → catalog → model → repair → garage

Saved identifications now pin the exact catalog occurrence, model reference, revision and manifest hash. An additive migration, `20261110182515_pinned_scan_reference_context.sql`, was applied only to the backed-up disposable database. Existing rows remain valid without these nullable fields. A composite foreign key prevents a scan from claiming another part's catalog occurrence; model fields must form a complete snapshot. Existing append-only and owner policies remain in force.

History, catalog, embedded model and service links retain the car, scan and source context. A repair step's journal link now retains the scan as well as the car. Garage journal/publication siblings have distinct React keys. Existing saved revision 23 views continue to load while revision 1001 is selected locally.

The browser integration test used a licensed generic filter photo, deliberately selected 13721730918, and labeled the record as a test fixture. It is navigation/storage evidence, never an accuracy or fitment result. Sharing stayed off. The actual scanner-media core processed the upload through the local Auth/Storage transport and real database ownership policies. The photo reloaded in the garage; owner download succeeded while another member and a visitor received404. Existing two car photos and two projects remained, alongside three local test cars and the new private scan photo.

A failed-upload test exposed a recovery gap: reloading hid the retry action even though the photos remained on the device. The photo draft now records pending, complete or skipped upload state separately from the saved result. Reloading a pending save offers Save photos; retry is idempotent and uses the original sharing choice. Old drafts default to pending without granting sharing consent. Starting another scan does not delete earlier saved identifications or uploaded photos.

The mobile action bar now distinguishes Scan complete from Saved in My garage, and offers Scan another part after saving. Starting a new scan clears the previous scan ID from the URL; a reload cannot silently attach the old identification to the new photo. Pending uploads require confirmation before their device photos are discarded. Inconclusive results do not announce nonexistent suggestions. Comparison images show a loading state and a recoverable unavailable state, and missing-image icons keep their intended size.

## Verification and acceptance

Verification receipts are under `work/accuracy-review/scanner-model-*` and `scanner-chain-*`.

- Type checking passes; 544 unit tests across 65 files pass; 43 Python importer tests pass. Lint has zero errors and 15 native-image warnings. Runtime dependency audit reports zero advisories.
- SQL security and synthetic restore tests pass, including 13 restored object-byte hashes. This does not certify hosted disaster recovery, provider secrets, SMTP or actual owner data recovery.
- The final production build passes, including 4,969 client-asset confidentiality checks. Three private build indexes and 147 server source maps remain outside the upload tree. The 79-route suite passes against this build and the disposable reference database. All 33 HTTP security checks pass.
- Local candidate manifest: development 200 with the expected SHA; production 404. Accepted revision 23 remains byte-identical and available. Private review configuration, database dump and review-document paths return 403 in development and 404 in production. Unknown model/asset routes now return 404 instead of a misleading 200 HTML page.
- Browser tests cover automatic comparison after accepting a photo, number/source selection, embedded and isolated component selection, garage save, failed photo-upload recovery, private-photo reload, catalog reopening, four source-backed repair steps, journal planning and repeat scans. The journal entry retained its guide revision, step, canonical part and Planned/Private state. It does not assert that a repair occurred.
- Mobile checks at 390px and desktop at 1440px found no horizontal overflow in the tested scanner path; the garage also passed at 390px. Screenshots were visually reviewed. A negative reference image produced zero positive cards, survived reload, and did not inherit the prior scan. The final production bundle independently completed the same negative-image comparison and restored its photo/result at 390px, without the development banner or console errors. Reference-image runs are integration checks, not independent accuracy evidence.
- Disk-space interruptions required removing failed generated build output and unused downloadable Playwright browser engines. Installed Chrome, test profiles, source, uploads, drafts and database backups were preserved. The final build and checks completed afterward.

For the owner's phone test, sign into the disposable account and select **Local scan flow 525i** (1995 M50TU automatic). Use several independently known parts, one part per scan. Include an unsupported object and two angles of the same part. Check keeping/retaking a photo, automatic scanning, adding an angle, number selection, location, repair/manual links, private save, reload and Scan another part. Record wrong suggestions and inconclusive results separately. The simple camera picker works on LAN HTTP; direct browser camera APIs can require HTTPS. Actual physical-device acceptance remains pending.
