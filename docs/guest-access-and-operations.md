# Guest access, staff provisioning and local performance

Implemented 6 November 2026 on the existing E34 Lore platform. This supersedes the earlier member-callable owner activation workflow. The external deployment receipt records the published commit and runtime activation checks.

## Staff access

There is no Enable moderator control and no public or private `claim_owner_moderator` function. `my_account_access` returns only the caller's assigned moderator status, without an owner-eligibility field. Ordinary account pages have no staff links. These interface changes accompany server enforcement; hiding a button is not the authorization boundary.

A privileged migration bound the designated, already verified Google Auth identity to the existing private owner record and assigned that UUID the moderator role. It neither creates an identity nor matches a client-supplied address. An existing binding cannot silently move to a replacement account. Future staff assignments and recovery require deliberate operator administration; users cannot assign roles through profiles or metadata.

The site administrator role is assigned to a verified Auth identity through private provisioning. Administrator permissions, including inherited technical-review access, require an MFA session. The owner still enrolls and verifies their own authenticator. Dashboard data, guest review and moderation require the private role plus an MFA session. Role assignment alone does not permit moderation.

## Guests

Public browsing needs no account. The account page includes an explicit browsing link. When Supabase anonymous sign-ins are enabled, Continue as guest starts an anonymous Auth session without collecting an email or password. The option is hidden when that provider is disabled. Existing guest sessions retain their submission-status page.

Guest questions and replies use `submit_guest_contribution`, with a live anonymous Auth identity and session. Questions preserve the existing explicit vehicle/manual/guide/part/catalog/workshop/journal context and its foreign keys and validation triggers. Caller-supplied authorship, staff status, hidden state, creation time or lock state cannot override server choices.

A guest contribution is hidden and queued atomically. Trigger ordering ensures the existing contribution normalizer cannot make it public. Guests can submit at most two questions and ten replies per 24 hours per identity. Existing new-account link limits, locks, blocks, restrictions and source checks remain in force. Direct guest thread/reply writes and guest feedback votes remain subject to the verified-member guard. A restrictive Storage policy denies anonymous file uploads independently of other upload grants. A guest cannot use this path as an unverified permanent account by changing metadata.

The generated public author label begins with Guest. A chosen permanent username still requires verified membership. Guest access stays in the requesting browser; signing out, clearing browser storage or signing into another account does not transfer those submissions. No automatic ownership merge is claimed.

`guest_submission_state(false)` exposes only the caller's recent status and moderation response. Pending and rejected content remains outside public community lists. The private queue has RLS, explicit deny policies and no client table grants. `guest_submission_state(true)` and `review_guest_submission` require moderator permission plus MFA. The dashboard's Guest review section exposes the oldest 100 pending items; completed decisions let later items advance. Approval/rejection is atomic, requires a written reason and uses the existing moderation audit. Existing discussion hide/restore tools also synchronize guest publication status. Guest-source deletion and account deletion cascade through the queue.

Supabase's anonymous sign-in endpoint has an IP-based signup limit. CAPTCHA/Turnstile integration and an explicit anonymous-identity retention policy remain operational follow-ups; no unreviewed guest text is automatically published. The platform has no automated anonymous-account purge that would silently remove published contributions.

## Sign-in providers

Google and email are configured. The live Google journey completed account selection, basic identity consent, PKCE callback and signed-in account loading on e34lore.com. The owner session survived a published-page reload. Separate Chrome automation stalled; completed Chrome and Android device journeys are not claimed.

Apple, Facebook, Microsoft, GitHub and Discord adapters already use the same bounded provider-discovery and PKCE path. Buttons appear only for enabled providers. Apple/Facebook activation requires their developer configuration and credentials; existing personal accounts alone are not evidence that these clients exist. No placeholder provider button is presented as working.

Use the existing Supabase callback `https://ebaebzuergvpijtrloik.supabase.co/auth/v1/callback`, the approved E34 origins and the existing privacy/data-deletion instructions. Keep credentials in provider settings, never frontend configuration, Git or this document. Apple web setup requires a Services ID associated with a primary App ID; its OAuth secret needs renewal at most every six months. No paid Apple enrollment or Meta agreement was accepted by the agent.

Sources checked: [Supabase anonymous users](https://supabase.com/docs/guides/auth/auth-anonymous), [Facebook configuration](https://supabase.com/docs/guides/auth/social-sign-in/auth-facebook), [Apple configuration](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple), [Apple web requirements](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/).

## Loading and computer diagnostics

The read-only local snapshot found 8 GiB RAM, approximately 7.2 GiB swap used, 2.9 GiB available disk space and 26 days uptime. Chrome and ChatGPT together had 119 processes with about 3.7 GiB resident memory; compressed/swapped memory is additional. Chrome had been running eight days and ChatGPT nearly four. A three-second sample recorded 462 swap-in pages and 98 page-outs; it is a short observation, not a sustained memory-pressure benchmark. The system reported 36% memory free during another sample, so swap use alone does not establish continuous exhaustion.

One HTTP sample returned the E34 home page in 2.18 seconds and Google Accounts in 0.45 seconds. The unauthenticated Auth health URL responded in 1.09 seconds with its expected authentication-required status; this is reachability, not a login test. The nearly full disk, substantial swap and GUI/browser-control stalls are stronger observed explanations than a confirmed provider outage. Native browser automation shares the user's input devices and was stopped; subsequent checks use background browser/connector operations.

Sign-in options now share one provider-settings lookup per tab for 60 seconds, with a ten-second network timeout and recovery after failure. The browser must still complete OAuth and its security checks. No authentication, browser certificate checks, autofill protection or MFA was disabled.

Save work before restarting the Mac or quitting browsers. Free substantial startup-disk space using macOS Storage and review personal files yourself. No personal files, browser credentials, unrelated project servers or applications were removed or terminated. The inspection found no E34 development server requiring shutdown. A complete hardware/security investigation is outside this targeted resource snapshot. [Apple's slow-Mac guidance](https://support.apple.com/guide/mac-help/if-your-mac-runs-slowly-mchlp1731/mac) describes storage and memory checks.

## Verification

Typecheck and 102 unit tests in 13 files pass, including shared settings lookups, failure recovery and timeout behavior. Hosted rollback tests cover guest privacy, actor/session checks, context preservation, daily limits, role/MFA review, approve/reject publication, metadata spoofing and removal of member staff activation. Existing community feedback/moderation regression tests pass. All 79 custom tables have RLS. The four new migration files follow their hosted versions. Anonymous Auth is enabled. Live guest questions and replies reached private pending status and both database contributions stayed hidden. The test records were removed. Apple/Facebook setup and actual owner MFA remain separate runtime checks recorded in the receipt.
