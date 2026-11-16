# API and data dictionary

Current staff/guest update (6 November 2026): member staff self-activation is removed. The verified owner was provisioned through a private migration; moderation still requires role plus MFA. Guest questions/replies have a separate bounded hidden submission and review path. See [guest access and operations](guest-access-and-operations.md).


Current access update (6 November 2026): the owner explicitly opened E34 Lore to public browsing; historical ChatGPT/owner-private hosting statements below are superseded. Member data still uses independent Supabase authentication, RLS and MFA. See [member identity and sharing](member-identity-and-sharing.md) for the new username, OAuth, owner-binding and share-link contracts and unfinished provider setup.

The application uses the dedicated Supabase project's Data API with the publishable browser key. Anonymous access reaches reference records and visible community content. Mutation requests require a Supabase Auth session; RLS is authoritative.

| Domain | Tables / contract |
| --- | --- |
| Models | `vehicle_models`: stable human-readable model-family IDs, candidate engine families and supplied-manual coverage. This is not the complete production/options database. |
| Evidence | `sources`: publisher, coverage, rights status, review state and original locator. The uploaded manual itself stays outside the hosted source repository. |
| Components | `components` and `assemblies`: stable system and assembly identities with source and boundary statements. |
| Parts | `parts`: normalized OEM identity where established; `part_fitments`: direct, conditioned applicability; `part_interchanges`: explicit sourced relationships, currently unpopulated. No transitive inference. |
| Guides | `guides`: original content, ordered checks, engine scope, source locator and draft state. The reviewed source file is also versioned with the application. |
| Community | `threads`, `posts`, `accepted_answers`: author ownership, linked system/part/guide and allowlisted vehicle configuration. Acceptance has a composite FK to its own discussion. |
| Owner | `owned_vehicles`, `service_records`, `vehicle_modifications`, `installed_parts`, `bookmarks`: private, account-owned records. Composite vehicle/user FKs prevent cross-owner linkage. |
| Review | `repair_outcomes`, `reports`, `review_submissions`: owner-reported evidence, moderation and technical dispositions with separate permissions. |
| Notifications | `notifications`: reply, acceptance and correction-review events. Clients can update only `read_at`. |
| Operations | Private staff roles and append-only mutation audit. Source import batches currently have private, hash-addressed manifests rather than a hosted ingestion queue. |

## RPCs

- `current_permissions() -> text[]`: only the signed-in account's assigned permissions. No caller-controlled user ID.
- `search_discussions(search_query text, max_results int = 30) -> threads[]`: security-invoker full-text search. Maximum fifty results, bounded input, existing thread RLS and ranking index. Client-side synonym expansion connects common symptom terms.

## Edge API

`POST /functions/v1/delete-account`

Requires `Authorization: Bearer <access JWT>` and JSON `{"confirm":"DELETE_MY_ACCOUNT"}`. Other input keys are rejected. The caller cannot supply a target identity. Returns `{"deleted":true}` only after revocation and deletion succeed. Anonymous/expired sessions return 401; invalid confirmation returns 400; operational failures return 503.

## Search and quantities

Universal search ranks explicit OEM matches, descriptive matches, system synonyms and selected-engine context across reference types, then adds RLS-filtered community results. Applicability remains separate from relevance. Converted quantities preserve canonical source value/unit; no unverified torque values are synthesized.

## Added contracts

- `technical_drawings`: source-linked image paths, native pixel dimensions, applicability, attribution, rights state and bounded component anchors. Read-only to browser clients.
- `contribution_revisions`: trigger-written original/edit/baseline snapshots. `thread_id` or `post_id` identifies exactly one parent; row visibility inherits the parent. No direct client insert/update/delete.
- `threads.content_version`, `posts.content_version`: database-assigned positive version numbers. Browser edits include an equality predicate on the loaded version and check returned affected rows. An empty result opens conflict resolution without discarding the draft.
- `browse_discussions(search_query,category_filter,page_size,cursor_created_at,cursor_id)`: security-invoker full-text/category query with stable descending timestamp/UUID cursors and a maximum51-row page. Equal-time rows cannot be skipped by a timestamp-only cursor.

## Independently owned catalog

`vehicle_catalog_contexts`, `part_assembly_positions`, `part_supersessions` and the extended `assemblies`/`technical_drawings` preserve source selection and ordering observations separately from canonical parts. `catalog_inventory` is a read-only security-invoker view. All tables remain read-only to browser clients. Private import receipts/history are not exposed.

- `catalog_find_parts(search_query,context_filter,max_results,after_number,after_position)` returns source positions with a stable number/position cursor (maximum101).
- `catalog_search_parts(search_query,max_results)` returns distinct canonical identities (maximum60), including reference-only identities without active ordering positions.
- `threads.catalog_position_id` has a composite FK with `part_id`, preventing mismatched drawing/part attachment.
- `installed_parts.part_id` is now used by the garage UI. Manual number entry remains available; choosing a catalog result attaches the canonical identity. Recording an installation is owner-reported evidence, not confirmation of fitment.
- `parts.detail.archive_evidence` retains the pinned identity-source version, source diagram references and explicitly unverified type-code associations. It contains no archive artwork or asserted complete option logic.

See `docs/owned-catalog.md` for source scopes, coverage and import/export contracts.

Catalog scaling follow-ons group inventory counts in one pass and index active context/part pairs. Source search first selects indexed candidate identities, then resolves positions; it avoids a cross-table full-text OR scan on every result. The source/identity search and inventory view retain security-invoker behavior.

## Walkthroughs and restoration journals

- guide_revision_archive stores immutable full editorial guide objects by canonical ID and SHA-derived revision; guide_step_index stores the matching ordered step identities. Browser clients have SELECT only, and database triggers reject snapshot rewrites.
- guide_progress is private to account and optional owned car, with revision-specific checks and content_version optimistic writes. Composite owner/car keys prevent recording checks on someone else’s car.
- owner_journal_entries is the private source, including body, work date/status, optional guide/step/part, mileage/cost/currency and private notes. garage_journal_entries is an explicit limited publication, with public IDs unrelated to private source vehicle IDs. e34_private.journal_publications binds source to snapshot and is not exposed.
- publish_journal_entry(source,expected_version), withdraw_journal_entry(source) and my_journal_publications() use fixed public invoker facades and private implementations with actual identity checks. Publication enforces confirmed account, posting restrictions, hourly limits, owner car/garage binding and the expected source version. Privacy withdrawal remains available during a posting restriction.
- moderate_journal_entry(entry,hide,reason) requires moderator permission plus MFA and writes an audit event. A repeated owner publication does not change hidden status.
- threads.guide_revision/guide_step has a composite FK into guide_step_index. threads.journal_update_id points to a public update; its server trigger supplies the source car and reference context. Removing a source clears obsolete links without deleting another author’s thread.
- owned_vehicles adds private exterior_color, interior_trim and private_notes. None is copied into the shared garage projection. Account export and deletion include the new private records, progress, snapshots and bindings.

## Car photographs, features, management and usage

- `owner_car_photos`: owner-readable source metadata, fixed owner/photo object path, processing/ready lifecycle and trusted dimensions/hash. Clients cannot insert, update or mark completion directly. `reserve_car_photo` checks confirmed identity, own car, restriction and quotas; `complete_car_photo` is service-only.
- `garage_photos`: explicit public snapshot. Approved photos require a published/nonhidden parent for public reads. `review_reason` is not in public column grants. Private bindings expose only the caller's publication/status through `my_car_photo_publications`.
- `publish_car_photo(photo,entry)`, `withdraw_car_photo(photo)`: owner-bound review submission and privacy withdrawal. `review_car_photo(photo,decision,reason)` and `feature_garage(entry,featured,reason)` require moderator plus MFA; hidden/rejected state cannot be cleared by an owner resubmission.
- `browse_car_showcase` bounds search/cursor/results and honors existing member preferences; feature results require an approved photo. `owner_dashboard(search_text)` returns bounded staff lists and coarse counts, excluding private ownership records and email addresses. `resolve_content_report` records an audited disposition.
- `POST /functions/v1/car-media` requires fresh Auth token validation. Multipart input accepts normalized JPEG only, at most 2 MiB plus bounded form overhead, independently decodes/reencodes pixels, and saves only the stripped result. JSON actions `delete` and `cleanup` are owner-scoped and bounded before parsing. Browser accepts JPEG/PNG/WebP up to 15 MiB and prepares at most 1600px; server rechecks dimensions/decoded memory. Quotas: 12 per car, 100 per account, 24 upload attempts/hour. This is normalization and moderation, not an antivirus service.
- `e34-car-photos` stays private. Storage read policy evaluates the exact path against ready owner sources or approved visible public snapshots, or an MFA staff review. No public URL or long-lived signed URL is generated. Cleanup queue receipts retry Storage API removal; source/visibility revocation happens first. `delete-account` removes twin and car files before deleting the account.
- `manual_chapter_index`: 49 immutable source identities/locators; `threads.manual_chapter_id` FK, validated draft context, reverse chapter discussions. No manual body OCR or complete PDF is exposed.
- `record_usage(area_name)` accepts only a fixed public-section enum; `e34_private.usage_daily` has `(day,area,opens)` only, no visitor identity. Private raw access is denied. Counts are capped and daily retention runs at 03:15 UTC, retaining today and the preceding 89 days.
