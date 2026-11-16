# Retailer products and technical matching

BMW parts remain in the existing canonical catalog. Merchant products, SKUs and identifiers live in separate private tables. Product titles, visual similarity, commission rates and retailer search results do not establish compatibility.

The review classifications are exact verified identifier, verified replacement, conditional, unverified candidate and known incompatible. Only approved reviews in the first three classes can be published. Conditional matches keep their conditions. Unknown and incompatible records are withheld from purchasing recommendations. An exact identifier match does not certify vehicle fitment.

Exact matching requires an explicit eleven-digit BMW identifier equal to the selected canonical record. A directed replacement requires the existing direct supersession ID, source and replacement canonical IDs, exact active source position, and the product's replacement identifier. Reverse and transitive substitutions are not inferred. A documented aftermarket equivalent requires specific public evidence and human review. Manufacturer part numbers and retailer SKUs are retained without automatically treating them as BMW numbers.

Changing product identity or identifiers revokes its match review and withdraws associated offers. Public reads recheck source activity, exact identifiers, direct edges, program approval, link status and validity. Number-only browsing cannot expose a position-scoped offer without its matching source position. Retailers are ordered by name rather than commission.

The offer has separate permission and freshness fields for price, stock and shipping. Missing, future or expired observations are hidden. Authorized images are optional; third-party image requests require the commercial opt-in, while authorized same-origin images can render normally. Source and match review dates remain visible. No prices or availability are invented.

Normalize a provider-authorized file:

```sh
python3 tools/affiliate_feeds.py --input /absolute/path/feed.csv --format csv \
  --merchant retailer-id --source-url https://retailer.example/authorized-feed \
  --authorization-url https://retailer.example/feed-agreement \
  --out /absolute/path/reviewed-batch.json
```

The `.example` addresses above document argument structure; they are not configured retailers. Optional `--field-map` accepts a JSON mapping from normalized field names to provider keys. Supported normalized identifiers and fields are documented by `--help` and the adapter source. XML product/item/entry records and namespaces are supported; DTDs/entities, excessive nesting, non-UTF-8 text, oversized files and more than 5,000 rows are rejected. JSON arrays or a `products` array and header-based CSV are supported.

The preview reports invalid rows, duplicate SKUs and conflicts. Identical duplicates are coalesced; conflicting rows for a SKU are withheld. Decimal money uses exact arithmetic. File import time is not automatically a price-observation time. The MFA-gated import is hash-idempotent, stores an error receipt and creates only pending candidates for known canonical numbers. It never creates or overwrites BMW identities. Raw price/image candidates do not become authorized published observations automatically.

The owner Product matching tab has a cursor-paginated **Catalog parts without an approved retailer match** queue. Search by canonical BMW number or component name; results retain pending and rejected candidate counts and the actual catalog ID. An approved source-conditional supersession must keep the Conditional classification. The public matched identifier is selected for the reviewed target, rather than an unrelated OEM number on the same retailer product.
