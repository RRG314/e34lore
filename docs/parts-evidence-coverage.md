# Shared part evidence coverage

Local factual snapshots and indexed links, not live image availability, physical fitment, exact CAD, complete repairs or a complete E34 photo dataset. Model/guide counts cover scanned native catalogs only; external associations remain in existing systems.

Generated with `python3 tools/audit_part_evidence.py`. Detailed per-number gaps and original missing-page URLs stay in ignored `work/part-evidence/coverage.json`. Existing canonical catalog identities and source positions are reused.

| Evidence | Distinct identities / count |
| --- | ---: |
| BMW identities (excluding reserved placeholder) | 24,323 |
| With source ordering positions | 14,310 |
| With an assembly drawing in local snapshots | 14,310 |
| With a locally licensed exact-part photograph | 0 |
| With an exact-number external photograph source | 6 |
| With an indexed native model location | 2,916 |
| With an indexed guide association | 96 |
| Licensed component-family photos (not exact BMW identities) | 9 |
| Source pages missing from accepted snapshots | 39 |

An assembly drawing is not an individual product photograph. Family photos never establish exact OEM identity. Source-page links do not grant image redistribution or training rights. Archive identity rows do not establish fitment. Counts exclude the reserved `00000000000` not-supplied-separately identity.

## Source selections with missing pages

- 1993 535i Sedan: 5 source pages missing.
- 1995 540i Sedan: 4 source pages missing.
- 1995 530i Wagon: 3 source pages missing.
- 1994 530i Sedan: 4 source pages missing.
- 1993 m5 Sedan: 4 source pages missing.
- 1994 540i Sedan: 3 source pages missing.
- 1991 525i body unspecified: 5 source pages missing.
- 1995 525i Wagon: 4 source pages missing.
- 1994 530i Wagon: 3 source pages missing.
- 1991 525i body unspecified: 4 source pages missing.

## Recovered local source coverage

10 hash-validated staged source selections recover 39 missing pages, 767 ordering positions and 50 drawing records. Together with 2 already complete selections, 12/12 saved source indexes have full page coverage locally. This is not coverage of every E34 vehicle/option or a complete product-photo library. Accepted/hosted counts above remain unchanged. [Recovery and validation](catalog-gap-recovery-2026-11-09.md).

## Staged 1994 540i completion

Three recovered pages add 49 source positions and four drawing records. The local merged candidate contains 390 assemblies, 7739 ordering positions and 458 drawings. Raw source snapshots, complete normalized facts and transactional import SQL remain in ignored `work/part-evidence/540i-complete-candidate`. The existing context identity is retained; this batch has not been applied to hosted data or released.
