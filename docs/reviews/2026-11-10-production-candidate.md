# E34 Lore production candidate

The candidate is staged for owner testing. The hosted site and database received no release or migration. The local review still serves the previous reference receipts and uses disposable garage records.

| Review | URL |
| --- | --- |
| Phone scanner on the same network | [Part Scanner](http://127.0.0.1:3012/scanner) |
| Phone Workshop on the same network | [Complete 525i](http://127.0.0.1:3012/workshop?reference=e34-525i-sedan-automatic) |
| Production-built desktop preview | [Complete 525i](http://127.0.0.1:3015/workshop?reference=e34-525i-sedan-automatic) |

## Scanner and saved photos

- Opening the scanner starts with a blank camera. Resume is an explicit choice. Editing, adding or replacing a photo clears the comparison and confirmation for the previous set.
- One scan accepts up to three angles of the same part. The first photo can run the scan immediately or be kept while another angle is taken. A failed photo upload retains the photo for retry from the original saved result, even after starting another scan.
- Weak or conflicting evidence produces no part suggestion. The 525i comparison distinguishes complete mount **26 12 1 226 723** from insert **26 12 1 225 071**. The 540i comparison uses its own catalog numbers. The selected part opens the catalog, installed location, tools and manual references. [1995 525i catalog](https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/steering_drive_shaft/drive_shaft_universal_joint_centre_mounting.html)
- The production browser ran the released recognition worker with the pinned model and returned no match on a known center-support image in 13.5 seconds on the first download. Four center-support reference photographs and a flex-disc look-alike were checked during development. The existing model did not reliably recognize the support, and render-only examples did not clear the release criteria. The scanner therefore offers a manual comparison. Automatic recognition of the owner's photo and native camera behavior on the owner's installed phone app remain unverified.
- Production links to the Bentley figure and retains the original written guide. The owner-supplied manual page image remains local while reuse permission is unresolved.

## Workshop and Build Studio

- Production candidate revision 24 repackages local revision 1015. It contains 653 renderable parts in eight GLBs totaling 18,947,900 bytes. The staged manifest SHA-256 is `c26f8aecf883dd9788fa086d78c4850773e233c4c287de457539c1774fa49646`.
- The complete-car slider exposes the detailed engine, transmission, engine bay, suspension, trim clips, center-support bracket and insert. Selecting a search result in the exploded car keeps the complete-car view. Continuous artist body surfaces move together so the original regional cuts stay closed. Doors, hood, trim and fasteners remain selectable. The explosion illustrates assembly relationships and should not be used as a removal path.
- The 525i insert follows the retained catalog's 30 × 55 mm size. The complete support and surrounding parts are visual references with documented dimensional limits.
- The staged Build Studio contains 25 additional factory-style wheel previews. Browser testing rendered and saved a choice, then reopened it on revision 24. The additive migration retains the earlier revision 23 receipt and existing wheel choices. Wheel previews illustrate appearance.

## Verification

- TypeScript and 557 tests passed. The production asset scan checked 5,029 files. The production route suite passed 79 routes against disposable catalog and garage data. The HTTP security suite passed 33 checks. The database suite restored synthetic private records, previous model pins and 13 media byte hashes.
- Browser testing selected seven revised parts in the full-car explosion, reassembled the car, loaded the catalog and repair reference, and reopened a saved private photo. A forced upload interruption verified that the original photo could be saved after a new scan was started. Installed-mode behavior was simulated in Chromium. The built app also served the offline page from its service worker.
- The staged SQL ran in disposable PostgreSQL. The live scanner returned HTTP 200, and public read checks found all four 525i and 540i center-support comparison numbers. The production dependency audit reported zero advisories for the audited runtime dependencies.

The staged artifact and additive SQL are under `work/production-candidate-20261110`. Apply only the reviewed migrations when publishing this batch after the physical-phone check and owner approval. Retain prior site and database recovery points.
