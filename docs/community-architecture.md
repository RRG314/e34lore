# Community architecture

The forum shares accounts and canonical part, guide and model references with the Workshop and My Garage. PostgreSQL row-level security controls access to member submissions, reports and private records.

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

## Development

The standalone demo displays the editorial library. A local database is required for submissions, moderation and member records. Use the disposable security database suite to exercise verified and legacy guest roles.
