import { applicationStatuses, matchStatuses } from "./affiliates";
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "url"
    | "textarea"
    | "number"
    | "checkbox"
    | "array"
    | "json"
    | "datetime"
    | "date"
    | "part";
  required?: boolean;
  options?: readonly string[];
  help?: string;
  default?: string | boolean | number;
};
export type Entity = {
  label: string;
  fields: Field[];
  immutable?: boolean;
  singleton?: boolean;
};
const text = (key: string, label: string, required = false): Field => ({
  key,
  label,
  required,
});
const url = (key: string, label: string, required = false): Field => ({
  key,
  label,
  required,
  type: "url",
});
const area = (key: string, label: string, required = false): Field => ({
  key,
  label,
  required,
  type: "textarea",
});
const select = (
  key: string,
  label: string,
  options: readonly string[],
  value?: string,
): Field => ({ key, label, options, default: value ?? options[0] });
const check = (key: string, label: string): Field => ({
  key,
  label,
  type: "checkbox",
  default: false,
});
const time = (key: string, label: string, required = false): Field => ({
  key,
  label,
  type: "datetime",
  required,
});
const amount = (key: string, label: string, required = false): Field => ({
  key,
  label,
  type: "number",
  required,
  help: "Integer cents: 1234 means 12.34 in the selected currency.",
});
const currency = select("currency", "Currency", [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
]);
const reasonEvidence = url(
  "evidence_url",
  "Source report or payment evidence",
  true,
);
const registry = text("id", "Registry ID", true);
export const commercialEntities: Record<string, Entity> = {
  affiliate_networks: {
    label: "Affiliate networks",
    fields: [
      registry,
      text("name", "Network name", true),
      url("website_url", "Official website", true),
      area("notes", "Notes"),
    ],
  },
  affiliate_programs: {
    label: "Programs & agreements",
    fields: [
      registry,
      text("name", "Program name", true),
      text("network_id", "Network ID"),
      url("application_url", "Official application"),
      url("official_source_url", "Official source", true),
      select("status", "Program status", applicationStatuses),
      url("approval_evidence_url", "Approval evidence"),
      time("approved_at", "Approval date"),
      time("terms_checked_at", "Terms reviewed"),
      time("expires_at", "Agreement expires"),
      {
        key: "tracking_hosts",
        label: "Authorized tracking hostnames",
        type: "array",
        help: "Exact hosts from the agreement, separated by commas. No wildcard domains.",
      },
      {
        key: "query_parameters",
        label: "Approved query parameter names",
        type: "array",
      },
      text("link_template", "Approved link template"),
      {
        key: "public_parameters",
        label: "Public tracking identifiers",
        type: "json",
        help: "Only publisher_id, campaign_id and program_id. Never paste an API key or client secret.",
      },
      area("rules", "Eligibility, linking, geographic and payment rules"),
    ],
  },
  affiliate_applications: {
    label: "Applications",
    fields: [
      text("program_id", "Program ID", true),
      select("status", "Application status", applicationStatuses),
      area("description", "Website description"),
      area("audience", "Intended audience"),
      area("placements", "Proposed placements"),
      area("traffic_statement", "Verified traffic statement"),
      area("required_information", "Required owner steps"),
      area("introduction", "Partnership introduction draft"),
      area("owner_notes", "Private application notes"),
      time("submitted_at", "Submission recorded"),
      {
        key: "follow_up_on",
        label: "Follow-up reminder date",
        type: "date",
        help: "Shown in this workspace; no email or external follow-up is sent automatically.",
      },
    ],
  },
  affiliate_merchants: {
    label: "Retailers",
    fields: [
      registry,
      text("name", "Retailer name", true),
      text("program_id", "Program ID", true),
      url("website_url", "Official website", true),
      {
        key: "allowed_hosts",
        label: "Authorized retailer hostnames",
        type: "array",
        required: true,
      },
      check("active", "Activate retailer after program approval"),
      area("contact_information", "Private business contact"),
      area("notes", "Notes"),
    ],
  },
  affiliate_credentials_metadata: {
    label: "Credential references",
    fields: [
      text("program_id", "Program ID", true),
      text("label", "Reference label", true),
      {
        key: "secret_reference",
        label: "Secret store reference",
        required: true,
        help: "Reference only, such as vault:retailer-feed. The actual secret belongs in the approved secret store.",
      },
      area("permissions", "Authorized API permissions"),
      time("expires_at", "Credential expiry"),
    ],
  },
  merchant_products: {
    label: "Retailer products",
    fields: [
      text("merchant_id", "Retailer ID", true),
      text("retailer_sku", "Retailer SKU", true),
      text("title", "Product title", true),
      text("manufacturer", "Manufacturer"),
      text("manufacturer_part_number", "Manufacturer part number"),
      url("product_url", "Product page", true),
      url("source_url", "Product source", true),
      url("image_url", "Product image URL"),
      check("image_authorized", "Image reuse permission verified"),
      url("image_permission_url", "Image permission evidence"),
    ],
  },
  merchant_product_identifiers: {
    label: "Product identifiers",
    fields: [
      text("product_id", "Retailer product ID", true),
      select("scheme", "Identifier type", [
        "bmw_oem",
        "manufacturer_part",
        "retailer_sku",
      ]),
      text("value", "Exact identifier", true),
      url("source_url", "Identifier evidence", true),
    ],
  },
  affiliate_match_reviews: {
    label: "Part-match review",
    fields: [
      text("product_id", "Retailer product ID", true),
      { key: "part_id", label: "Catalog part", type: "part", required: true },
      {
        key: "matched_part_id",
        label: "Matched canonical identity",
        type: "part",
        required: true,
      },
      select(
        "kind",
        "Match classification",
        matchStatuses,
        "unverified_candidate",
      ),
      select("basis", "Evidence basis", [
        "oem_identity",
        "direct_supersession",
        "documented_equivalent",
      ]),
      text("scope_position_id", "Exact catalog position, if scoped"),
      text("direct_supersession_id", "Direct supersession record, if used"),
      select("review_status", "Review decision", [
        "pending",
        "approved",
        "rejected",
      ]),
      url("source_url", "Public technical evidence", true),
      area(
        "compatibility_notes",
        "Compatibility and configuration notes",
        true,
      ),
    ],
  },
  affiliate_links: {
    label: "Affiliate links",
    fields: [
      text("merchant_id", "Retailer ID", true),
      text("product_id", "Retailer product ID"),
      url("destination_url", "Authorized product destination", true),
      url("tracking_url", "Approved affiliate URL", true),
      url("rule_source_url", "Documented link rules", true),
      check("active", "Activate checked link"),
      time("expires_at", "Link expiry"),
      select("check_status", "Recorded check result", [
        "unchecked",
        "ok",
        "broken",
        "blocked",
      ]),
      time("last_checked_at", "Recorded link check"),
    ],
  },
  merchant_offers: {
    label: "Where to Buy offers",
    fields: [
      text("match_id", "Approved match ID", true),
      text("link_id", "Affiliate link ID", true),
      check("published", "Publish reviewed offer"),
      currency,
      amount("price_cents", "Price in cents"),
      check("price_authorized", "Current price display authorized"),
      time("price_observed_at", "Price observed"),
      time("price_valid_until", "Price valid until"),
      select("availability", "Availability", [
        "unknown",
        "in_stock",
        "out_of_stock",
        "backorder",
      ]),
      check("availability_authorized", "Availability display authorized"),
      time("availability_observed_at", "Availability observed"),
      time("availability_valid_until", "Availability valid until"),
      area("shipping_information", "Retailer shipping information"),
      check("shipping_authorized", "Shipping information display authorized"),
      time("shipping_observed_at", "Shipping information observed"),
      time("shipping_valid_until", "Shipping information valid until"),
    ],
  },
  affiliate_import_jobs: {
    label: "Feed import history",
    immutable: true,
    fields: [],
  },
  commercial_settings: {
    label: "Site advertising settings",
    singleton: true,
    fields: [
      check("advertising_enabled", "Enable approved display campaigns"),
      text("adsense_publisher", "AdSense publisher account", true),
      select("adsense_status", "AdSense review status", [
        "awaiting_owner_submission",
        "under_review",
        "approved",
        "rejected",
        "suspended",
      ]),
      area("adsense_notes", "AdSense setup notes"),
    ],
  },
  advertising_placements: {
    label: "Display placements",
    singleton: true,
    fields: [
      text("name", "Placement name", true),
      {
        key: "allowed_sections",
        label: "Eligible sections",
        type: "array",
        help: "Only home, parts, articles, encyclopedia and community are accepted.",
      },
      check("enabled", "Enable this placement"),
    ],
  },
  sponsorships: {
    label: "Sponsors & contracts",
    fields: [
      text("name", "Sponsor name", true),
      url("website_url", "Sponsor website", true),
      area("contact_information", "Private sponsor contact"),
      url("logo_url", "Licensed logo URL"),
      select("status", "Sponsor approval", [
        "draft",
        "approved",
        "suspended",
        "expired",
      ]),
      url("contract_evidence_url", "Agreement evidence"),
      amount("contract_cents", "Contract amount in cents"),
      currency,
      select("billing_period", "Billing period", ["fixed", "monthly"]),
      select("billing_status", "Billing status", [
        "unbilled",
        "invoiced",
        "part_paid",
        "paid",
        "cancelled",
      ]),
    ],
  },
  advertising_campaigns: {
    label: "Display campaigns",
    fields: [
      text("sponsorship_id", "Sponsor ID", true),
      select("placement_id", "Placement", ["public_top", "public_bottom"]),
      text("title", "Advertisement title", true),
      area("body", "Advertisement text", true),
      url("image_url", "Licensed creative URL"),
      text("image_alt", "Image description"),
      url("creative_permission_url", "Creative permission evidence", true),
      url("destination_url", "Sponsor destination", true),
      time("starts_at", "Campaign starts", true),
      time("ends_at", "Campaign ends", true),
      select("status", "Campaign state", [
        "draft",
        "approved",
        "active",
        "suspended",
        "expired",
      ]),
      {
        key: "priority",
        label: "Placement priority",
        type: "number",
        default: 0,
      },
    ],
  },
  affiliate_commissions: {
    label: "Network commission register",
    fields: [
      text("program_id", "Program ID", true),
      text("external_reference", "Unique network reference", true),
      currency,
      amount("amount_cents", "Commission amount in cents", true),
      select("status", "Network report status", [
        "estimated",
        "confirmed",
        "reversed",
        "paid",
      ]),
      {
        key: "occurred_on",
        label: "Report date",
        type: "date",
        required: true,
      },
      reasonEvidence,
      area("notes", "Source notes"),
    ],
  },
  sponsorship_payments: {
    label: "Sponsor payment receipts",
    immutable: true,
    fields: [
      text("sponsorship_id", "Sponsor ID", true),
      text("external_reference", "Unique receipt reference", true),
      amount("amount_cents", "Received amount in cents", true),
      currency,
      {
        key: "received_on",
        label: "Receipt date",
        type: "date",
        required: true,
      },
      reasonEvidence,
      area("notes", "Receipt notes"),
    ],
  },
  revenue_records: {
    label: "Revenue ledger",
    immutable: true,
    fields: [
      select("kind", "Record type", [
        "estimate",
        "earning",
        "reversal",
        "receipt",
      ]),
      select("channel", "Income source", [
        "affiliate",
        "advertising",
        "sponsorship",
      ]),
      amount("amount_cents", "Amount in cents", true),
      currency,
      {
        key: "occurred_on",
        label: "Record date",
        type: "date",
        required: true,
      },
      text("external_reference", "Unique report / receipt reference", true),
      reasonEvidence,
      text("reverses_id", "Original earning ID, for reversals"),
      text("commission_id", "Related network commission ID"),
      text("sponsorship_id", "Related sponsor ID"),
      area("notes", "Record notes"),
    ],
  },
};
export const commercialSections = {
  overview: [],
  applications: ["affiliate_applications", "affiliate_programs"],
  retailers: [
    "affiliate_merchants",
    "affiliate_programs",
    "affiliate_networks",
    "affiliate_credentials_metadata",
  ],
  matching: [
    "merchant_products",
    "merchant_product_identifiers",
    "affiliate_match_reviews",
    "affiliate_links",
    "merchant_offers",
    "affiliate_import_jobs",
  ],
  advertising: [
    "commercial_settings",
    "advertising_placements",
    "sponsorships",
    "advertising_campaigns",
  ],
  revenue: ["revenue_records", "affiliate_commissions", "sponsorship_payments"],
} as const;
export type CommercialSection = keyof typeof commercialSections;
