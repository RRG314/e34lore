# Community architecture decision

This decision records why E34 Lore uses its own forum and moderation tools.

## Decision

Retain and extend the native forum. The existing implementation already has Supabase identities, PostgreSQL row-level security, private reports, canonical part/guide/model links, author acceptance, account export/deletion and atomic contribution history. These are working systems, not a starter mockup. The application is deployed as a Sites Worker; it cannot run a persistent forum daemon or a Rails/PostgreSQL/Redis deployment inside that Worker. A separate forum would need additional hosting, identity synchronization, deletion coordination, webhook delivery and duplicate search integration.

This is the repository-specific reason to depart from the specification's Discourse default. It avoids a replacement of completed functionality and adds no new subscription. It also leaves the operator responsible for the native moderation, abuse, accessibility and recovery controls; choosing native does not make those responsibilities disappear.

| Option | Deployment and integration | Costs and responsibilities | Assessment |
|---|---|---|---|
| Discourse | Separate supported hosting or self-hosted installation; identity bridge, API/webhooks, search and canonical-link integration. Mature community tooling. | Official hosted pricing checked 5 November 2026 lists Pro at $100/month and Business at $500/month; the listed SSO option is on Business. Self-hosting still needs infrastructure, email, upgrades, backups and monitoring. | Strong choice for a new standalone forum. Here it would replace existing identities/data controls and add an operational system. No plan was purchased. |
| NodeBB | Persistent Node.js service with a supported database and reverse proxy. Separate process lifecycle and identity integration. | Self-hosting requires a host, database, email, upgrades, plugin maintenance and backup operations; no hosting quote or purchase made. | Cannot be installed as a daemon in the current Worker. Its separate identity and canonical-link work does not improve the current dependency order. |
| Existing native forum | Same application, Supabase account/session and authoritative entities. Browser calls bounded SQL APIs; RLS controls ordinary records. | Existing Sites/Supabase infrastructure only. Usage, storage and email still have costs/limits; no claim that operation is free at any scale. Native engineering and moderation remain operator responsibilities. | Selected. Preserve working content, account and privacy mechanisms. |

Sources: [Discourse pricing](https://www.discourse.org/pricing), [official Discourse installation](https://github.com/discourse/discourse/blob/main/docs/INSTALL.md), [NodeBB Ubuntu deployment](https://docs.nodebb.org/installing/os/ubuntu/). These references support platform requirements and the dated pricing comparison, not a purchase authorization.

## Data boundaries

- `threads` and `posts` remain the sole member-contribution records. Eight normalized categories, controlled tags, seven template types and a foreign key to an editorial starter extend those records. The four legacy category names normalize on insertion and remain supported by `browse_discussions`.
- Forty-eight original editorial resources live in `src/community/content.ts`. `community_editorials` stores their identity/title/category registry for foreign keys. They are attributed to **Site editorial**, not assigned to invented Auth users. No example conversations, votes or repair outcomes are seeded.
- Existing canonical `parts`, drawing positions, `guides`, vehicle models and component links are retained. Parts, guides, model pages and system articles show reverse discussion links. The global search and sitemap include the editorial library. Engine is a disclosed installed-configuration field, not an inferred VIN decode.
- `community_feedback` has one private row per voter/comment. The aggregate API returns counts, the caller's vote and their explanation link, never another voter's identity. Ratings apply only to the exact current `content_version`. Editing substantive context starts a new version and expires previous endorsements.
- `set_community_feedback` locks the actor and target, verifies email, checks visibility/blocks/version/rate limits and inserts a bad-advice explanatory reply and its vote in one transaction. Bad-advice reasons require 40–6,000 characters and a controlled reason code. A failed request creates neither record. Self-votes are rejected. A changed or removed vote does not erase the already published explanation. A deleted explanation removes its dependent vote; hidden explanations do not count.
- `top_helpful_comments` selects at most five visible comments with current Helpful votes; helpful count desc, concern count asc, then stable chronological/UUID order. It respects the caller's muted/blocked members. Rankings are member recommendations, not technical verification. No invented fill appears when fewer than five qualify.
- `browse_community_replies` uses `(created_at,id)` cursor ordering, 50 visible replies plus a look-ahead row, and an exact focus target for ranked-comment links. Parent RLS applies to both focus and page records.
- A review proposal refers to the original immutable post/version through `contribution_revisions`. The source is validated even for direct inserts, and deleting a source account clears dependent links without obstructing account deletion. Review dispositions do not automatically publish a reference change.

## Security and moderation

RLS is enabled on every new table. Direct feedback writes are revoked. Privileged implementations are in unexposed `e34_private`; public RPCs are invoker facades. Schema usage and individual helper execution grants do not grant direct table access. Private rate/restriction tables explicitly deny client reads/writes. Helpers use an empty search path and qualified objects. Their privilege is intentional: the implementation must aggregate other voters' rows, insert an atomic explanation and protect staff-only records.

Verified email is required for thread/reply/feedback contributions. Existing hourly contribution limits remain. Accounts younger than 24 hours have lower posting limits and no more than two external links per post. Plain text is rendered as React text; no arbitrary member HTML is interpreted. There is no user-editable staff-role claim.

Mute filters a member's discussions/replies. Block also prevents replies to either member's discussion and feedback to their comments. It is an interaction preference, not a promise that otherwise public content becomes secret. Preferences and feedback identities are owner-only and included in account export.

Moderation operations require a private staff role **and** an `aal2` session verified by Supabase. The new trigger also prevents direct content-update bypass; restrictive delete/report-update policies enforce MFA for staff actions. Normal owner deletion rights remain. Staff can hide/restore, lock/unlock, warn, time out, suspend, ban, revoke a restriction and resolve an appeal. Each operation requires a reason and writes private audit metadata. Restriction expiry is evaluated on every contribution request. Restricted members can still access their reason, account tools and appeal route.

The authenticator UI uses Supabase enrollment/challenge/verification rather than a custom OTP service. No initial staff role is assigned automatically. Actual MFA enrollment and recovery still require operator verification before staff onboarding.

Public image/file uploads, private messages, live chat and marketplace transactions remain disabled. The separate existing private GLB reconstruction workflow is not a general forum upload service. Quarantine, metadata removal, scanning and rights review are prerequisites to enabling community uploads.

## Local and production environments

`npm run dev` runs the existing app; `npm run build` and `npm start -- --port 3002` use the existing Worker preview. Backend configuration remains the existing publishable client configuration. No service-role key, database password or forum admin secret belongs in client assets.

Production uses the same application and dedicated Supabase project. Apply the additive database files in this order after the established platform migrations:

1. `database/community.sql`
2. `database/community-editorials.sql` (rebuild with `node --experimental-strip-types scripts/seed-community.mjs`)
3. `database/community-integration.sql`
4. `database/community-hardening.sql`
5. `database/community-api-boundary.sql`
6. `database/community-entities.sql` and `database/community-entity-index.sql`
7. `database/community-visibility.sql`
8. `database/community-article-review.sql`
9. `database/garages.sql`

Hosted migration history includes small scope/cascade corrections found by integration tests; the checked-in files incorporate them. Do not reapply these one-time files to the already migrated project. A fresh backend must first restore the complete established platform schema and canonical data.

## Release limits

The private review build is usable for editorial browsing and tested community flows. It is not a declaration of public launch readiness. SMTP, redirect/confirmation/recovery delivery, compromised-password protection, operator staff/MFA onboarding, a full isolated backup restore, legal policy review, accessibility review and operational staffing remain launch gates. See [community operations](community-operations.md) and the status matrix.

## E34 Lore domain and shared garages

Both e34lore.com and www.e34lore.com are active with HTTPS. Supabase Site URL and exact account redirects are configured; custom SMTP is enabled with the verified E34-only Resend domain, but controlled confirmation requests fail and delivery remains unresolved. The owner approved a replacement restricted key; its credential save and transport test require the existing user hand-off. The public garage table contains only explicitly shared stories and limited configurations. Its private source bindings never appear in the browser API. Removal of a source vehicle clears public snapshots and foreign keys without erasing other members' discussions. Rollback tests cover those lifecycle and moderation boundaries.
