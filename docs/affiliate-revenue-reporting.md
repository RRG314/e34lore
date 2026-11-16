# Revenue and commission reporting

No revenue is inferred from visitors, clicks, parts searches, application approval or ad impressions. Financial records require a provider report, invoice or verified manual receipt source. All financial and contact records are private to an administrator with a verified MFA session.

The network commission register retains provider reference, program, amount, currency, date, reported state and evidence. Sponsor payment receipts retain the sponsor, receipt reference, received amount/date and evidence. These source registers are separate from the consolidated ledger: do not add both registers and ledger totals together.

The ledger distinguishes estimates, earnings, reversals and receipts. Monthly summaries show estimated amounts, confirmed earnings net of documented reversals, and money actually received separately. Receipt of an already recorded earning is not another earning. Each external ledger reference is unique. Corrections append evidence rather than editing historical ledger entries. A reversal names an original earning in the same currency/channel, locks it and cannot exceed its unreversed amount.

Amounts use integer cents and the supported two-decimal currencies USD, EUR, GBP, CAD and AUD. PostgreSQL returns aggregate amounts as decimal strings; the UI formats them with integer arithmetic. Income channels and currencies are grouped rather than converted or combined. No guessed exchange rate or third-party commission estimate is introduced.

The overview also exports up to 180 month/channel/currency summary groups as exact integer cents. The owner workspace provides filtered CSV export of the actual record set, with quoted cells and protection against spreadsheet-formula text. Lists contain up to 100 recent search matches; export narrower date/reference searches as needed. A complete accounting export beyond that UI window should use an authorized backend report, not a claimed unbounded browser export.

Keep the network's reconciliation and payment schedule, chargebacks, taxes and agreement evidence under operator control. No payment processor, invoice collection or money transfer is enabled. The application is an operational ledger and does not claim to replace professional accounting or tax review.
