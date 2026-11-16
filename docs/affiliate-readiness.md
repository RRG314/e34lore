# Affiliate readiness — 8 November 2026

**The site has tested affiliate infrastructure, but it is not yet ready to earn commissions.** The live database has zero active retailers, products, reviewed matches, saved referral links, published offers, feed imports, campaigns and commission records. No acceptance or tracking identifier has been invented. Display advertising remains disabled.

Owner workspace: [Affiliates & advertising](https://e34lore.com/manage/partners). Visitor policy and approved general retailer links: [Retailer links & advertising](https://e34lore.com/partnerships). Reviewed product offers appear beside the exact OEM catalog identity/source position and in the existing related walkthrough/workshop references.

## Actual application status

| Program | Evidence checked on 8 November | What is needed |
| --- | --- | --- |
| ECS / Turner, shared EAH/Impact program | Live application/program records: under review. The existing Impact session became available during final checks; its actual EAH application still displays In Review. | Wait for actual acceptance in the existing Impact account, then obtain the approved brand coverage, linking instructions and issued public identifiers/links. Do not submit a duplicate ECS/Turner application. |
| KC Tool / Refersion | Live records: under review. The actual Refersion email says Account in Review, not approved. The current portal requires login and CAPTCHA. | Confirm acceptance in the existing KC Tool affiliate account and obtain its issued link/HTML. Use only authorized placements. |
| FCP Euro | Owner reports submission; the live record is submitted. The official page describes a brand partnership request. No commission relationship, feed or tracking access is confirmed. | Obtain a response explaining whether the partnership includes referral commissions and the actual terms. A sponsorship application alone does not supply a working affiliate URL. |
| Google AdSense | Signed-in dashboard still displays Getting your site ready and completed connection/profile steps. Matching verification meta and ads.txt are present. | Site approval, ad units/code and applicable privacy/consent configuration, followed by separate owner authorization to serve ads. AdSense is independent of retailer links. |

Current official references: [ECS](https://www.ecstuning.com/Page/partner-with-ecs/), [Turner](https://www.turnermotorsport.com/t-partner-with-tms), [KC Tool](https://kctool.com/pages/affiliate-program), [FCP Euro](https://info.fcpeuro.com/fcp-euro-sponsorship-request-form). Public program availability is not approval of E34 Lore. KC Tool's agreement requires the supplied linking code; generic hand-made affiliate parameters are not a substitute.

## Gaps corrected in this audit

- The private overview previously showed only EAH and AdSense. It now includes all applications beyond research, including KC Tool and FCP Euro.
- A private retailer launch checklist reads current server data, with product, approved-review, fresh-check, actual public-offer and storefront-link counts. Actual public eligibility is reused rather than inferred from a saved publication flag. Up to three real catalog samples preserve the exact source position. Expired/suspended/withdrawn records cannot appear as live offers.
- General affiliate store links were supported by the resolver but had no visitor placement. Approved, active, recently checked product-free links can now appear at `/partnerships#retailer-links`, with nearby disclosure and no BMW fitment assertion. This gives KC Tool a legitimate store-link route without falsifying an OEM part match. Unapproved/empty records render no shopping panel.
- Retailer service failures no longer silently look like an empty result. A readable failure message and retry button appear. Product links name the product, retailer and new-tab behavior for assistive technology. Mobile browser checks found small new text controls; checklist and retry controls now provide at least 44px touch targets.
- Affiliate SQL checks now run in GitHub CI alongside the existing full schema/security replay. CI exposed a missing log-directory assumption; the runner now creates its own private directory, verified from a minimal fresh checkout. A repeatable HTTP audit checks the real public/private boundaries without following a referral, clicking an ad or making a purchase.

No ad scripts, fictional products, synthetic production users, offers, revenue or live network tracking tests were introduced. The separately held engine/car/scanner work is not part of this release.

## First approved part offer: exact operator sequence

1. In **Applications → Programs & agreements**, record actual approval, its evidence URL, approval/terms dates, expiry when applicable, exact authorized tracking hosts and query names. Enter an issued template and public publisher/campaign identifiers only where documented. Tokens, passwords and API secrets stay outside these fields and out of chat.
2. In **Retailers → Retailers**, verify the covered brand and exact destination hosts, then activate that retailer. Approval for one brand is not automatically permission for another.
3. In **Product matching**, add an authorized retailer product and its exact product URL. Add source-backed identifiers, then review the canonical BMW identity and any direct replacement/source conditions. Importing a candidate never approves fitment. Image, price, stock and shipping fields may remain absent until their permissions and dated observations are available. A feed subscription is not required to enter an approved product manually.
4. In **Affiliate links**, save the issued link with the exact destination, rules evidence and product identity, initially inactive. Run **Check link** only if the network permits automated HEAD checks. The bounded checker refuses outside hosts, loops and unsafe destinations. A blocked check stays blocked; do not bypass it by marking an unverified link good. Obtain a provider-compatible verification method before activation if the network blocks HEAD or prohibits it.
5. Activate the checked link; publish its reviewed **Where to Buy offer**. Refresh the overview and inspect its actual public sample. Confirm the number, configuration notes, disclosure, accessible button, mobile layout and final destination. There are currently no real links with which to complete this step.
6. Use the provider's permitted referral test to verify the visit reaches the correct publisher account. Local redirect tests establish routing and permissions, not merchant attribution. Do not create false purchases or click ads. Validate commissions later against an actual network report, retaining estimates, confirmed earnings and received payments separately.
7. Complete any payout, identity, tax and banking steps directly inside the provider. Do not copy those details into E34 Lore. This audit does not certify financial or legal eligibility.

For a general tool-store link, complete steps 1–2, save an issued **Affiliate link** without a product ID, check it, then activate it. It appears in the separate retailer directory. It does not need an invented BMW product, match or catalog offer. Confirm this placement is covered by the actual agreement.

## Executed verification

- Full `npm run check`: typecheck, analytics registry, **348 unit tests / 36 files**, **40 Python importer tests**, production Worker build.
- Targeted affiliate tests: **36 tests / four files**. Tests cover generated URL rules, disclosure, conditional matches, exact allowed hosts, unsafe redirects, count opt-in, service failures, scoped catalog links, readiness dependencies and general store disclosure.
- Disposable Unix-socket PostgreSQL affiliate suite: approved and unapproved paths, storefront projection, publication gates, broken/suspended links, stale prices, direct source supersessions, concurrent saves, money reversals, roles/MFA denial and no private data leaks. Synthetic rows exist only in the disposable database inside a rollback transaction.
- Full migration replay and security/recovery drill: passed, including 12 restored synthetic object hashes. These checks do not certify the provider's OAuth/SMTP or real backups.
- Built Worker: **77 server-rendered routes** plus catalog/reference checks passed. Client confidentiality check: **1,854 assets**, no prerender credential or private configuration.
- Read-only affiliate HTTP audit: **12 checks** against both loopback and live e34lore.com. Live broader HTTP security: **32 boundaries** passed. The real public affiliate RPCs return empty arrays; private readiness/workspace/check rules deny unsigned callers.
- Targeted changed-file lint: passed. Global lint was not rerun and is not claimed clean. Native security advisors have no ERROR finding; the prior warnings remain unchanged, including leaked-password protection. See the existing security audit for those separate operator items.
- Browser checks: real signed-in administrator/MFA could load the live owner workspace and product-matching controls; loopback disclosure and signed-out boundary checked at desktop and 390px mobile width. Final live checklist/navigation verification is recorded with the release receipt.

Reproduce: `npm run check`, `npm run test:affiliates:db`, `npm run test:security:db`, `E34_TEST_ORIGIN=http://127.0.0.1:3003 npm run test:affiliates:http`, `E34_TEST_ORIGIN=http://127.0.0.1:3003 npm run test:e2e`. Use `https://e34lore.com` as the origin for read-only production HTTP checks. Start the built local Worker first with `npm run start -- --port 3003`.

**Remaining proof:** a real approved merchant link, allowed public placement and its correct publisher attribution. No implementation or simulated test can supply retailer acceptance. The owner dashboard now separates these external dependencies from working site code.

## Published result

**Site45 is live** at https://e34lore.com. Runtime source `db77a9611ce84ba13e0bc37b8c2630e7240a3c9b` passed both push CI and PR CI, including website checks, both PostgreSQL suites and Android compilation. The first CI run exposed the missing log folder; that defect was corrected and independently tested from a fresh checkout before these successful runs.

Final production checks passed:77 served routes,12 affiliate HTTP checks and32 security boundaries. The actual signed-in administrator/MFA session loaded the checklist and followed its application CTA; the affiliate-link form opened and cancelled without saving. Desktop1280px and mobile390px checks show no horizontal overflow; new checklist controls measure44px high. The saved images remain in the local private QA folder. No prototype geometry/scanner feature was released.
