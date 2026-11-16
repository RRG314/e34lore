# E34 Lore public-readiness audit

8 November 2026. Candidate: `steven/workshop-controls-layout`, based on the verified workshop milestone `8cf14e8`. The owner approved this exact candidate on 9 November 2026; it is now live as Site 46 at https://e34lore.com. [Release and rollback record](releases/2026-11-09-v46.md). This document records actual implementation and verification; it does not certify all source rights, factory geometry or every real-world repair.

## What changed

- Canonical `/terms`, `/privacy` and `/copyright` pages replace the public operational-policy drafts. Community guidelines link to these pages, and old `/resources#privacy` and `/community/policies#privacy` destinations remain useful. The operator is **E34 Lore, operating as E34 Lore**, as confirmed by the owner. The public contact is **support@e34lore.com**, explicitly selected by the owner.
- The copyright notice covers eligible original expression and excludes contributor work, third-party materials and unprotectable facts. It does not claim BMW affiliation, copyright registration, a registered DMCA agent or ownership of OEM numbers. Contribution text is prospective and limited to operating the service at the chosen visibility; older contributions are not backfilled as accepting new rights. Notices appear beside posting/upload/publication actions. This is not an auditable server-side history of legal assent.
- Credits preserve photo/model attribution and modifications. The original UVZZZ/Silbergrau and additional Nieve5677/niev Touring credits remain attached to the models. A downloadable index records **125 unique active/reference viewer GLBs**, their actual byte hashes and recorded source creators. No GLB, immutable manifest or component geometry was changed.
- Third-party software notices preserve 713 installed package notice sets. The generator records 54 installed packages without a root notice file for further packaging review; it does not invent missing license text.
- Public asset packaging reuses the earlier IP audit implementation. It rejects source documents, maps, keys, editable masters, archives and symlinks, and requires a reviewed path/hash inventory. Three private Vite/build indexes are physically moved out of the client upload tree. Two unused images with unresolved provenance are preserved in private quarantine instead of being served.
- Unreleased shop/exchange URLs retain a simple coming-soon explanation pointing to the roadmap, with no mock products or checkout controls. They are excluded from the sitemap and indexing.
- Member URLs in discussions, journals and garage stories are clickable without embedding external content or making background requests. Untrusted text remains React-escaped, credentials/script schemes are rejected, original punctuation is retained and rendered link counts are bounded.
- A compact community navigation and grouped footer put discussions, cars/projects, BMW specialists, help, policies and credits in predictable locations. Policy controls appear on the privacy page rather than in every footer.
- Guide labels say **Source-based guide** or **Source-based service reference**, with technical review still explicitly pending. Changing the label does not promote a guide to technical verification. The manual PDF and figure excerpts remain private research material.
- The final copy pass removes outdated public-review/legal-draft claims from community topics, replaces internal editorial labels with ordinary reference wording and checks the complete 48-topic library. It retains actual unresolved technical scope rather than pretending it was reviewed.

## Usable feature paths

| Entry | Working destination and integration | Verification |
| --- | --- | --- |
| Model → part | Nine existing native model choices; system selection, search, focus/isolation, separation, details, exact source options, OEM position and interchange links | Existing model tests; 41 immutable model/asset/page HTTP checks; actual 540i browser flow |
| Part → service/community | Current guide and manual references, native discussions, published journals and link-only external repair discussions | Browser selected `11510007042` from its two source alternatives and opened the references |
| Replacement lookup | Existing reviewed-offer reader, fetched only after opening **Find replacement parts**; clear loading/error/retry/empty states; OEM interchange link | Browser reader plus 12 existing affiliate HTTP checks; no fake offers/prices or merchant activation |
| Selected vehicle → reference | Unique supported match follows the header selection; ambiguous or missing references ask for an explicit choice | Selection tests, including engine displacement, M50/M50TU, RHD and unavailable variants |
| Reference switching | Changes the illustrated reference, drops stale node/source/private query context and preserves the actual header/owned-car selection | Pure URL tests; no owned vehicle or account records changed |
| Selected vehicle → catalog | Equally suitable sources no longer silently choose the first row; explicit source choices remain possible | Catalog tests; live backend queries and actual component/catalog reader |
| Repair → garage/journal | Existing revision-aware guide/progress/servicing and private planning-journal architecture retained | Existing isolated persistence/RLS tests; all 40 current guide revisions are registered in the hosted archive; required journal columns exist |
| Community → BMW specialists | Search by business/location, filter country/service, read source websites, recommend a business or suggest a correction | Actual directory browser checks and isolated recommendation/report/moderation transaction |
| Account access | Existing Google, email and guest flows retained; provider settings use a bounded shared lookup | Hosted settings checked; Google and email identities exist; guest sign-in enabled; inherited account/security fixtures and unauthorized HTTP tests |
| App installation | Existing PWA/home-screen instructions and home-page install section retained | Public route and existing app/release checks; no claim of public Google Play availability |

### BMW specialists

`/community/specialists` starts with three sourced businesses: Korman Autoworks (Greensboro, North Carolina), Munich Legends (Chelwood Gate, East Sussex) and Ziggy’s Bimmer Center (Somerville, New Jersey). Locations/services were checked against their own websites on 8 November. Descriptions are original factual summaries, not copied reviews or certifications. No ratings or endorsements were invented.

**Suggest a business**, **Share your experience** and **Suggest a listing correction** open the existing community post form with a dedicated recommendation template and separate unsent-draft key. They do not overwrite an ordinary unsent question. An unchanged template cannot be submitted, and the business title label is retained so recommendations remain discoverable. The post asks for the official website/location, first-hand work and business connections. Recommendations use existing searchable public discussions; guest submissions retain their existing moderator review. Hidden posts disappear under existing RLS. Reports stay private. The owner dashboard links to specialist recommendations. Sourced listing changes remain an editorial source-data update after review, rather than silently treating every member post as a verified listing.

Official listing sources:
- https://kormanautoworks.com/contact-us/ and https://kormanautoworks.com/restoration/
- https://munichlegends.co.uk/bmw-servicing-sussex/
- https://www.ziggysbimmercenterllc.com/services

### External repair discussions

Five authored link records reuse the contextual source data prepared in the integration worktree. They appear in existing component/part/guide contexts, without importing forum posts, images, comments or identities. Source families filter explicit engine/model mismatches; workshop links use the illustrated model’s context while preserving the owner’s actual vehicle selection. Restricted hosts are marked as potentially restricting access. Advanced member source proposals/reviewer workflows remain in the separate integration worktree and are not exposed here as working backend features.

## Coming soon and release holds

The roadmap clearly distinguishes usable features from upcoming work. Photo scanning, sound-assisted investigation, guided interactive repairs, deeper measured assemblies, installed-configuration analysis, expanded notifications/reminders, additional sign-in providers, merchandise/member transactions and broader chassis coverage have no public working-feature claims. Production scanner, repair and experimental configuration routes remain 404, including direct URLs/query attempts. The native workshop and its existing useful inspection controls remain available.

Apple is enabled in hosted Auth settings, but there is no completed Apple identity and its credential handoff has not been verified. Its public button is held in this candidate. Google/email/guest remain available; no backend provider or existing identity was disabled. Additional social providers need a real sign-in/callback/recovery trial before their release gate changes.

The public workshop is illustrative. Measured factory CAD for every fastener/configuration, collision-verified disassembly, physical scanner trials and comprehensive source-backed procedures are still distinct work. They were not replaced with fabricated precision. The completed analytics/notification work and richer source-review implementation are preserved in `e34-workshop-correction`; this candidate does not overwrite them or deploy their unaccepted migrations.

## Verification

- TypeScript check: passed.
- Unit suite: **413 tests / 42 files** passed, including engine/vehicle-source selection and public asset packaging. Existing geometry/hash tests remain intact.
- Python import suite: **40 tests** passed.
- Isolated full-schema/security/persistence test: passed, including specialist recommendations, search, author isolation, private reports and MFA moderation visibility. Synthetic restore verified 12 object-byte hashes. No production member fixtures were created.
- Read-only hosted audit: all **51 directly referenced RPC names** exist; all **40 current guide revisions** exist; planning-journal reference columns exist. Presence is not proof of every real member mutation.
- Existing HTTP checks: **32 security**, **12 affiliate**, **17 release boundary**, **41 model/asset/page** checks passed.
- Public-page/notice/private-file and complete topic-library checks: **72** passed. The HTTP suite totals **174** checks. A separate read-only crawl checked **204** same-site destinations from the public navigation with no broken status responses.
- Production build and client confidentiality/asset checks passed: 4,870 reviewed public files and 4,945 packaged client files. Final receipt records the source commit.
- Browser checks: directory filters and recommendation handoff; desktop/mobile overflow; workshop expansion, 100% separation, search, isolation/details, source-option selection, OEM/catalog/interchange/service/journal/discussion links and lazy replacement reader. Final screenshots are under ignored `outputs/public-readiness/`; the immutable runtime and receipt are under `outputs/local-review/20261108-release-candidate-r1/`. Desktop model/view controls are52px; mobile controls are105px, model first and tabs below search. Catalog view retains the same order below its source/search row. Browser-loaded JS/CSS hashes match this exact frozen artifact.

Full-tree lint was not clean at the starting milestone. Fourteen new modules have no lint errors or warnings. Across 37 changed authored files, errors decreased from 128 at HEAD to 123 with no rule-count regressions; do not describe inherited errors as a clean lint run. The final nine-file copy/support follow-up also retains the same33 inherited lint errors and8 warnings, with no rule-count regressions. Actual destructive account deletion, a real owner photo upload/repair save and physical phone/part trials are not certified by read-only browser checks or synthetic tests.

## Release status and remaining scope

The owner explicitly approved publishing this batch on 9 November 2026. Site 46 is now live from the exact tested source and archive. Live verification repeats all 174 HTTP checks and confirms the corrected desktop/mobile controls on the actual custom domain. Future changes retain the local-first hold. The release made no new production migration or unrelated backend change.

The owner accepted the preview and authorized this release. Existing third-party artwork/provider terms remain part of the recorded source-rights review. The earlier IP audit records five existing OEM illustration permissions without supporting evidence, brand clearance questions, and a hosted remix/source-setting check. Boilerplate, attribution or a file hash does not establish those permissions. Source notices here do not claim that those remaining matters are cleared.

Copyright/attribution references used: https://www.copyright.gov/circs/circ03.pdf, https://www.copyright.gov/512/, https://creativecommons.org/licenses/by/4.0/. Provider privacy references: https://supabase.com/privacy, https://resend.com/legal/privacy-policy, https://www.cloudflare.com/privacypolicy/.
