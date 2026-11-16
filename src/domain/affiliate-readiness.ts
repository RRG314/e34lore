import { z } from "zod";
const count = z.number().int().nonnegative();
export const affiliateReadinessSchema = z.object({
  checked_at: z.string().datetime({ offset: true }),
  retailers: z.array(z.object({
    id: z.string(), name: z.string(), active: z.boolean(),
    program_id: z.string(), program_status: z.string(),
    program_current: z.boolean(), tracking_configured: z.boolean(),
    products: count, reviewed_matches: count, saved_links: count,
    checked_links: count, public_offers: count, public_retailer_links: count,
    samples: z.array(z.object({
      part_id: z.string(), scope_position_id: z.string().nullable(), link_id: z.string().uuid(),
    })).max(3),
  })),
});
export type AffiliateReadiness = z.infer<typeof affiliateReadinessSchema>;
export type RetailerReadiness = AffiliateReadiness["retailers"][number];
export function nextAffiliateStep(r: RetailerReadiness): {
  section: "applications" | "retailers" | "matching"; message: string;
} {
  if (!r.program_current) return { section: "applications", message: "Record current provider approval and the written linking terms." };
  if (!r.active || !r.tracking_configured) return { section: "retailers", message: "Configure the issued tracking rules and activate this retailer." };
  if (r.program_id === "kc-tool-refersion") return { section: "matching", message: "Save KC Tool’s issued storefront link without a product identity, check it, then activate it for the retailer links page." };
  if (!r.products) return { section: "matching", message: "Add an authorized product with its retailer URL and identifier evidence." };
  if (!r.reviewed_matches) return { section: "matching", message: "Review the product against the exact OEM identity and source conditions." };
  if (!r.checked_links) return { section: "matching", message: "Save the provider-issued tracking link and run a permitted link check." };
  return { section: "matching", message: "Publish a reviewed offer, or resolve the public eligibility checks on an existing offer." };
}
export function affiliateCatalogUrl(sample: RetailerReadiness["samples"][number]) {
  const params = new URLSearchParams({ part: sample.part_id });
  if (sample.scope_position_id) params.set("position", sample.scope_position_id);
  return "/parts/catalog?" + params.toString();
}
