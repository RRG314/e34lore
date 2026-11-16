# Scanner workflow and comparison release — 9 November 2026

Owner authorized this batch for deployment after functional and security checks. It continues the existing implementation and preserves the live audience and account data.

## Included

- Use photo confirmation before retaining a shot; Add another angle keeps another view of the same part. Retakes replace the selected view, including at the three-photo limit. Asynchronous capture, cancellation and scan-generation guards prevent stale results. Reload recovery and the existing 24-hour draft expiry remain.
- Small reference images beside candidate choices. Desktop and phone comparison panels show an attributed loose-part reference and a source catalog illustration/callout; both enlarge. Source selection is visible and loads a reference automatically. Manual figure locators and service steps are retained; unavailable cleared manual images show a plain availability message. Supplied manual originals remain development-only.
- Selected part → catalog source → matching interactive car → repair steps/tools/manual → private result save on one page. Missing diagrams, model bindings and procedures remain explicit. 525i automatic is the default model; model order and earlier geometry remain intact.
- Repair library: 302 service topics, 22 original illustrated guide links covering 34 topics, manual locators, existing owner walkthroughs and comments; no reader completion counters.
- Verified members can save up to three confirmed-part photos privately. Separate optional consent permits catalog/scanning reuse. MFA reviewers can access only opted-in images; approval is required for public references and bounded dataset exports. Only loose-part photos fill loose-part product slots. Images are decoded/reencoded server-side to remove metadata and appended content; quotas and object ownership are checked before decoding.
- Withdraw/delete controls, idempotent retries that cannot increase consent, expiring processing reservations, parent/account deletion cleanup and durable file cleanup receipts. No live member fixture, source catalog import, training run or automatic model update.

## Verification

502 TypeScript tests in 57 files, 41 Python tests, typecheck, production build/confidentiality checks and isolated application SQL/RLS/restore pass. Full lint retains 254 inherited errors and 81 warnings with no new diagnostics. Read-only production checks cover 24 release boundaries, 33 security boundaries and 79 routes/catalog/source relationships.

Real browser checks cover explicit keeping, second/third views, replacing at capacity, rotate/cancel/retry, pending-action blocking, small result images, actual product/catalog images, phone overflow and car reference selection. These are browser and mobile-viewport checks; no new claim of physical Android camera hardware certification or exact-part recognition accuracy is made. The recognition system still presents candidates requiring physical confirmation.

Hosted migration scanner_photo_contributions and scanner-media v1 are applied. Live anonymous/invalid-token/origin and protected RPC checks pass without writing member data. New private photo objects use the existing private e34-car-photos bucket. Security advisors report no new photo-function issue; existing notices include guest-capable policies (ownership tested), intentional older definer RPCs, extension placement and disabled leaked-password protection. This is not a claim of zero platform findings.

## Rollback and publication

Application rollback: Site version 47. The additive photo schema/function may remain after application rollback; preserve saved photos and consent records. Never drop member data for an application rollback. Final source/archive/version receipt is retained with the release outputs.
