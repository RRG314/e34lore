# Repair library continuation — local, 9 November 2026

This continues the existing E34 Lore implementation and the earlier scanner/525i automatic batch. It responds to the owner's request to replace the checklist-centered walkthrough area with actual repair discovery and community contributions. No source control push, Sites synchronization, hosted migration/import or release was performed.

## What the owner sees

- `/repairs` opens **302 repair and service topics**, browsable without a search. Search, system and engine filters, available-material filters and incremental browsing cover the existing manual contents. Standalone conversion plans and identification/preparation notes have a separate view; existing swap/modification links still filter correctly.
- **22 newly linked illustrated DIY guides** cover **34 job topics**. The existing external-source registry now contains 27 records total; 37 topics have some linked external material. Photo walkthroughs and discussion threads have different labels and filters. These are link records, not copied articles or images.
- Each `/repairs/<topic>` page collects the exact printed/PDF manual locator, available E34 Lore notes, original illustrated guides and owner experience. Source credits, example vehicles, engine differences, tool/time availability and older-host/image limitations appear with the source. An unknown time or missing procedure/photo sequence is stated rather than filled in.
- The manual job index and site search lead to the same repair pages. Source pages remain reachable directly. Job pages are registered in the sitemap and have individual share metadata; invalid job paths return 404.
- Written E34 Lore guides read as ordinary numbered articles. The completion counter, progress bar, compact checkbox, step-toggle buttons and account checklist controls are removed from that reader. Existing guide content/revision hashes and saved progress records are preserved; no saved owner records were deleted.

The 302 topics are **not 302 newly authored complete walkthroughs**. Most are accurate contents locators into the supplied private service manual. The 40 existing written guides remain source-based drafts awaiting technical review. Their specifications and mechanical instructions were not rewritten in this batch. Permissioned process-photo sequences are still absent from those authored guides; original external photo guides open on their publishers' sites.

## Owner fixes, comments and follow-up

Every repair page and existing written guide offers **Add my walkthrough** and **Add a comment or question**. Both use the established community, including sign-in, moderated guest submission, author controls, replies, reports, revision history and moderation. Write-ups use the existing `repair` template; comments use `general`. The write-up form asks for the actual car, confirmed symptoms/cause, tools/parts/time, numbered work, manual/source links, process photo/video links, final checks and unresolved issues.

Manual topics without a guide attach a canonical `{question: "E34 Lore repair topic", answer: <registered topic ID>}` observation to the existing thread JSONB. Native guides retain their existing `guide_id` link. The marker organizes discovery; it confers no source-review, fitment or repair certification. No parallel comments database, new schema or hosted migration was introduced.

The reader shows separate owner write-up and comment sections, excerpts, links to full posts/replies and stable pagination. Existing blocked/muted-member preferences apply. Errors show a retry; a request failure is not displayed as an empty community. Published threads link back to the repair page. Each topic and contribution type has a separate versioned tab draft; real text survives reload, while stale cross-job attachments are replaced by the canonical job context. Existing ordinary/specialist drafts keep their separate keys.

The browser check caught PostgREST serializing an array of observation objects as a PostgreSQL array. The corrected reader passes JSON text to JSONB containment. A test exercises the actual Supabase query builder's URL encoding, and the real anonymous reader was checked without creating hosted contributions.

## Verification

Receipts are local under `work/repair-library-20261109/`. Browser images are under `output/playwright/repair-*.png`. The production preview is a local production build; served JS/CSS hashes are compared with its disk assets, alongside scanner confidentiality checks. The existing LAN development preview on port 3010 remains available.

The database test uses a disposable local PostgreSQL cluster and rolled-back synthetic contributions. It verifies repair-template persistence, exact JSONB job discovery, comments, ordinary replies, author permissions, visitor reads and existing MFA moderation visibility. No invented member contributions were sent to the hosted backend. Real OAuth/SMTP/provider settings and an owner's actual mobile camera session are outside that isolated test.

Final validation: **483 TypeScript tests in 55 files, 41 Python tests, typecheck, production build and the isolated database suite pass**. The final local production build passes 79 page/data checks, 24 release checks and 33 HTTP security checks. Browser verification covers 390×844 and 1440×1100, job discovery, live read-only comments, precise manual handoff, article steps, source links and injected comments-unavailability/retry. A separate browser check confirms write-up draft restoration and an empty, separate comment draft. It attempted zero hosted writes.

Thirty-eight unique served JS/CSS entries byte-match the final build; 2,445 production text assets pass the scanner-private-marker audit. Build confidentiality checks cover 4,954 client assets. Full-tree lint remains at **254 inherited errors and 81 warnings**, with no added diagnostics by file/rule/severity. Full receipts and source hashes are recorded in `work/repair-library-20261109/verification.json`.

## Local review

- Computer: `http://localhost:3010/repairs`
- Same Wi-Fi phone: `http://127.0.0.1:3010/repairs`
- Example job: `/repairs/512-job-window-regulator-and-motor`

The preceding Part scanner/mobile shortcut and the additive default 525i automatic reference remain intact. Actual Android camera/bare-part acceptance and technical review of the native guide contents remain open. Publishing this combined batch still requires the owner's specific approval after local testing.
