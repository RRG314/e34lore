# Retailer links and advertising

The application supports approved retailer offers, referral links and advertising placements. Retailer records and financial administration use the existing backend and staff permissions.

## Catalog offers

Offers link to canonical part identities and, where applicable, an exact catalog position. A public offer requires an approved program, reviewed product match, published offer and checked destination.

Price, stock and shipping observations have separate validity dates. Product changes require a new review. A retailer link alone establishes neither fitment nor interchange.

## Link handling

The [referral route](../app/go) resolves a saved link identifier. Destination hosts and redirect hops are checked against the configured program. Account credentials and private vehicle information are excluded from outbound links.

Public links include the relevant commercial disclosure. Analytics counts remain separate from recorded conversions and revenue.

## Staff tools

Partner administration covers program applications, retailers, product matching, offers, advertising and revenue. Private contracts, contact information and financial records require staff authorization with MFA.

Provider credentials belong in runtime secret storage. Database records hold references to those secrets. Feed imports use the normalization tools and the same review workflow as manually entered offers.

Operators configure the programs and advertising services available in their deployment. See [API and data](api-and-data.md) and [local development and releases](local-development-and-release.md).
