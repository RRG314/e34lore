"use client";
import { DocumentLink } from "./DocumentLink";
import { useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { ArrowUpRight } from "lucide-react";
import { db } from "./context";
import {
  affiliateDisclosure,
  advertisingSection,
  money,
} from "../domain/affiliates";
import { PageIntro } from "./common";
import { partGuideIds } from "../data/guide-parts";
import { parts } from "../data/catalog";

const consentKey = "e34.commercial.counts.v1";
const consentEvent = "e34-commercial-consent";
function subscribeConsent(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(consentEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(consentEvent, callback);
  };
}
function readConsent() {
  try {
    return localStorage.getItem(consentKey) === "yes";
  } catch {
    return false;
  }
}
export function useCommercialConsent() {
  return useSyncExternalStore(subscribeConsent, readConsent, () => false);
}
export function CommercialConsent() {
  const enabled = useCommercialConsent();
  return (
    <div className="privacy-choice commercial-consent">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            try {
              localStorage.setItem(consentKey, e.target.checked ? "yes" : "no");
            } catch {
              return;
            }
            window.dispatchEvent(new Event(consentEvent));
          }}
        />
        Retailer link counts
      </label>
      <small>
        Optional. Counts contain a day and link or campaign only. No account
        IDs, private vehicle records or browsing history.{" "}
        <DocumentLink href="/partnerships">
          Retailer links & advertising
        </DocumentLink>
      </small>
    </div>
  );
}

const offerSchema = z.object({
  id: z.string(),
  link_id: z.string(),
  retailer: z.string(),
  title: z.string(),
  matched_identifier: z.string().nullable(),
  kind: z.enum(["exact_verified", "verified_replacement", "conditional"]),
  compatibility_notes: z.string(),
  source_url: z.string(),
  match_reviewed_at: z.string().nullable(),
  price_cents: z.number().int().nonnegative().nullable(),
  currency: z.string(),
  availability: z.string().nullable(),
  availability_observed_at: z.string().nullable().optional(),
  price_observed_at: z.string().nullable(),
  shipping_information: z.string().nullable(),
  image_url: z.string().nullable(),
});
export type Offer = z.infer<typeof offerSchema>;
export function GuideRetailerReferences({ guideId }: { guideId: string }) {
  const identities = Object.entries(partGuideIds)
    .filter(([, guides]) => guides.includes(guideId))
    .flatMap(([id]) => {
      const part = parts.find((item) => item.id === id);
      return part ? [part] : [];
    });
  if (!identities.length) return null;
  return (
    <section className="guide-retailer-references">
      <h2>Related part references</h2>
      <p>
        Check the catalog identity and application notes against your car.
        Approved retailer options, when available, appear with their own match
        evidence and disclosure.
      </p>
      <ul>
        {identities.map((part) => (
          <li key={part.id}>
            <DocumentLink
              href={"/parts/catalog?part=" + encodeURIComponent(part.id)}
            >
              {part.name} <ArrowUpRight size={14} />
            </DocumentLink>
            <WhereToBuy partId={part.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
export function WhereToBuy({
  partId,
  positionId = null,
}: {
  partId: string;
  positionId?: string | null;
}) {
  const consent = useCommercialConsent();
  const key = JSON.stringify([partId, positionId]);
  const [response, setResponse] = useState<{
    key: string;
    offers: Offer[];
    error?: boolean;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const [open,setOpen]=useState(false);
  useEffect(() => {
    if(!open)return;
    let active = true;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 8000);
    Promise.resolve(
      db
        .rpc("public_affiliate_offers", {
          canonical_part_id: partId,
          source_position_id: positionId,
        })
        .abortSignal(controller.signal),
    )
      .then(({ data, error }) => {
        if (error) throw error;
        const parsed = z.array(offerSchema).parse(data);
        if (active) setResponse({ key, offers: parsed });
      })
      .catch(() => { if (active) setResponse({ key, offers: [], error: true }); })
      .finally(() => clearTimeout(deadline));
    return () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [partId, positionId, key, retry,open]);
  const current=response?.key===key?response:null;
  return <details className="part-discovery" onToggle={e=>setOpen(e.currentTarget.open)}><summary>Find replacement parts</summary>{open&&<div className="part-discovery-body">
    {current?.error?<RetailerLinksUnavailable onRetry={()=>{setResponse(null);setRetry(r=>r+1);}}/>:!current?<p role="status">Checking reviewed retailer listings…</p>:current.offers.length?<WhereToBuyPanel offers={current.offers} partId={partId} consent={consent}/>:<p>No reviewed retailer listings are available for this part yet. Use the OEM number and source conditions when checking a retailer.</p>}
    <DocumentLink className="text-link" href={"/parts/interchange?part="+encodeURIComponent(partId)}>Check documented replacements & interchange ↗</DocumentLink>
    <p className="small muted">A retailer listing does not change the technical fitment result. Prices and stock are shown only when an authorized observation is current.</p>
  </div>}</details>;

}
export function RetailerLinksUnavailable({ onRetry }: { onRetry: () => void }) {
  return <div className="where-to-buy" role="status"><p>Retailer links are temporarily unavailable.</p><button className="text-link" onClick={onRetry}>Retry retailer links</button></div>;
}
export function WhereToBuyPanel({
  offers,
  partId,
  consent = false,
}: {
  offers: Offer[];
  partId: string;
  consent?: boolean;
}) {
  if (!offers.length) return null;
  return (
    <section className="where-to-buy" aria-labelledby={"offers-" + partId}>
      <div className="commercial-heading">
        <div>
          <p className="eyebrow">INDEPENDENT RETAILERS</p>
          <h3 id={"offers-" + partId}>Where to Buy</h3>
        </div>
        <DocumentLink href="/partnerships">
          How retailer links work <ArrowUpRight size={14} />
        </DocumentLink>
      </div>
      <p className="affiliate-disclosure">{affiliateDisclosure}</p>
      <p className="small muted">
        Retailer offers are separate from the technical reference. Confirm your
        installed configuration and the retailer’s current terms before
        ordering.
      </p>
      <div className="retailer-offers">
        {offers.map((offer) => (
          <article key={offer.id}>
            {offer.image_url &&
              (offer.image_url.startsWith("https://e34lore.com/") ||
                consent) && (
                // Authorized images stay out of the image optimizer; third-party image requests require this site's commercial opt-in.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="offer-product-image"
                  src={offer.image_url}
                  alt={offer.title}
                  loading="lazy"
                />
              )}
            <p className="eyebrow">{offer.retailer}</p>
            <h4>{offer.title}</h4>
            <p className="small">
              {offer.kind === "conditional"
                ? "Conditional match — check the notes"
                : offer.kind === "verified_replacement"
                  ? "Reviewed replacement"
                  : "Reviewed part-number match"}
              {offer.matched_identifier ? " · " + offer.matched_identifier : ""}
            </p>
            <p>{offer.compatibility_notes}</p>
            {offer.match_reviewed_at && (
              <p className="small muted">
                Match reviewed{" "}
                {new Date(offer.match_reviewed_at).toLocaleDateString()}
              </p>
            )}
            {offer.price_cents !== null && (
              <p className="offer-price">
                {money(offer.price_cents, offer.currency)}
                {offer.price_observed_at && (
                  <small>
                    Price observed{" "}
                    {new Date(offer.price_observed_at).toLocaleDateString()}
                  </small>
                )}
              </p>
            )}
            {offer.availability && offer.availability !== "unknown" && (
              <p className="small">
                {offer.availability.replaceAll("_", " ")}
                {offer.availability_observed_at
                  ? " · observed " +
                    new Date(
                      offer.availability_observed_at,
                    ).toLocaleDateString()
                  : ""}
              </p>
            )}
            {offer.shipping_information && (
              <p className="small">{offer.shipping_information}</p>
            )}
            {offer.price_cents === null && (
              <p className="small muted">
                See retailer for current price and availability.
              </p>
            )}
            <div className="form-actions">
              <a
                className="button outline"
                href={"/go/" + offer.link_id + (consent ? "?count=1" : "")}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                aria-label={"View " + offer.title + " at " + offer.retailer + " (opens in a new tab)"}
              >
                View at {offer.retailer}
                <ArrowUpRight size={14} />
              </a>
              <a
                href={offer.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="small"
              >
                Match evidence
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const adSchema = z.object({
  id: z.string(),
  placement_id: z.enum(["public_top", "public_bottom"]),
  title: z.string(),
  body: z.string(),
  image_url: z.string().nullable(),
  image_alt: z.string(),
  destination_url: z.string(),
  ends_at: z.string().datetime({ offset: true }),
  sponsor: z.string(),
});
export type Advertisement = z.infer<typeof adSchema>;
export function usePublicAdvertising(path: string) {
  const section = advertisingSection(path);
  const [result, setResult] = useState<{
    section: string;
    ads: Advertisement[];
  } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!section) return;
    let active = true;
    const controller = new AbortController();
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const deadline = setTimeout(() => controller.abort(), 8000);
    Promise.resolve(
      db
        .rpc("public_advertisements", { page_section: section, preview: false })
        .abortSignal(controller.signal),
    )
      .then(({ data, error }) => {
        const parsed = z.array(adSchema).max(2).safeParse(data);
        if (active && !error && parsed.success) {
          setResult({ section, ads: parsed.data });
          if (parsed.data.length) {
            const until =
              Math.min(...parsed.data.map((ad) => Date.parse(ad.ends_at))) -
              Date.now();
            expiry = setTimeout(
              () => {
                if (active) {
                  setResult({ section, ads: [] });
                  setRevision((r) => r + 1);
                }
              },
              Math.min(2_000_000_000, Math.max(100, until)),
            );
          }
        }
      })
      .catch(() => {})
      .finally(() => clearTimeout(deadline));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(deadline);
      clearTimeout(expiry);
    };
  }, [section, revision]);
  return section && result?.section === section ? result.ads : [];
}
function SponsorCard({
  ad,
  section,
  preview = false,
}: {
  ad: Advertisement;
  section: string;
  preview?: boolean;
}) {
  const consent = useCommercialConsent();
  const [element, setElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!consent || preview || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        db.rpc("record_advertising_event", {
          campaign_id: ad.id,
          event_name: "impression",
          page_section: section,
        }).then(() => {});
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ad.id, section, consent, preview, element]);
  const showImage =
    ad.image_url &&
    (ad.image_url.startsWith("https://e34lore.com/") || consent || preview);
  return (
    <aside
      className="sponsor-card"
      ref={setElement}
      aria-label={"Advertisement from " + ad.sponsor}
    >
      <div>
        <p className="eyebrow">
          {preview ? "OWNER PREVIEW · " : ""}ADVERTISEMENT · {ad.sponsor}
        </p>
        <h3>{ad.title}</h3>
        <p>{ad.body}</p>
        <a
          href={ad.destination_url}
          rel="sponsored nofollow noopener noreferrer"
          target="_blank"
          onClick={() => {
            if (consent && !preview)
              db.rpc("record_advertising_event", {
                campaign_id: ad.id,
                event_name: "click",
                page_section: section,
              }).then(() => {});
          }}
        >
          Visit sponsor <ArrowUpRight size={14} />
        </a>
      </div>
      {showImage && (
        // The contract-authorized creative is rendered directly; it is not sent through an optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.image_url!} alt={ad.image_alt} loading="lazy" />
      )}
    </aside>
  );
}
export function AdvertisingSlot({
  ads,
  placement,
  path,
  preview = false,
}: {
  ads: Advertisement[];
  placement: "public_top" | "public_bottom";
  path: string;
  preview?: boolean;
}) {
  const section = advertisingSection(path);
  if (!section) return null;
  const ad = ads.slice(0, 2).find((item) => item.placement_id === placement);
  return ad ? (
    <div className="public-ad-slot">
      <SponsorCard ad={ad} section={section} preview={preview} />
    </div>
  ) : null;
}
const retailerSchema = z.array(z.object({ link_id: z.string().uuid(), retailer: z.string() })).max(20);
export function RetailerDirectoryPanel({ retailers, consent = false }: {
  retailers: z.infer<typeof retailerSchema>; consent?: boolean;
}) {
  if (!retailers.length) return null;
  return <section id="retailer-links" aria-labelledby="retailer-directory-title">
    <h2 id="retailer-directory-title">Visit a retailer</h2>
    <p className="affiliate-disclosure">{affiliateDisclosure}</p>
    <p>These links open the retailer’s store. They do not confirm that any product fits your car. For a reviewed part-number match, use the OEM catalog.</p>
    <div className="form-actions">{retailers.map(r => <a key={r.link_id} className="button outline" href={"/go/" + r.link_id + (consent ? "?count=1" : "")} target="_blank" rel="sponsored nofollow noopener noreferrer" aria-label={"Visit " + r.retailer + " (opens in a new tab)"}>Visit {r.retailer}<ArrowUpRight size={14}/></a>)}</div>
  </section>;
}
function RetailerDirectory() {
  const consent = useCommercialConsent();
  const [retailers, setRetailers] = useState<z.infer<typeof retailerSchema>>([]);
  const [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    Promise.resolve(db.rpc("public_affiliate_retailers").abortSignal(controller.signal))
      .then(({ data, error }) => {
        if (error) throw error;
        const parsed = retailerSchema.parse(data);
        if (active) { setRetailers(parsed); setError(false); }
      }).catch(() => { if (active) { setRetailers([]); setError(true); } })
      .finally(() => clearTimeout(timer));
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [retry]);
  if (error) return <RetailerLinksUnavailable onRetry={() => { setError(false); setRetry(r => r + 1); }}/>;
  return <RetailerDirectoryPanel retailers={retailers} consent={consent}/>;
}
export function PartnershipPolicy() {
  return (
    <div className="page partnership-policy">
      <PageIntro
        eyebrow="E34 LORE"
        title="Retailer links & advertising."
        description="A technical reference first. Commercial links stay separate from compatibility evidence."
      />
      <RetailerDirectory />
      <section>
        <h2>Retailer links</h2>
        <p>{affiliateDisclosure}</p>
        <p>
          “Where to Buy” appears only when a retailer program, product match and
          link have been reviewed and enabled. A matching number does not by
          itself confirm that a part fits your car. Conditional matches keep
          their application notes. Unknown or incompatible candidates do not
          become buying recommendations.
        </p>
        <p>
          Retailers handle orders, prices, shipping, warranties and returns. E34
          Lore does not sell the catalog’s parts. Offers are ordered by retailer
          name rather than commission.
        </p>
      </section>
      <section>
        <h2>Advertising</h2>
        <p>
          Enabled sponsor placements are marked Advertisement and name the
          advertiser. At most two placements appear on eligible public pages.
          Display ads are excluded from walkthroughs, diagnostic flows, the 3D
          workshop, private garages, account settings and management pages.
        </p>
        <p>
          Site ownership verification with Google and Impact does not load their
          advertising scripts. AdSense display advertising requires separate
          approval and the applicable consent configuration before activation.
        </p>
      </section>
      <section>
        <h2>Privacy and optional counts</h2>
        <p>
          Following a retailer link can take you through its affiliate network.
          The retailer and network may use their own cookies and process your
          visit under their privacy terms. Our links do not include your account
          ID, email, private garage, full VIN or diagnostic answers.
        </p>
        <p>
          The optional retailer and sponsor counter is off by default. If you
          allow it, E34 Lore records aggregate day-level link clicks and
          campaign impressions/clicks, without account IDs, IP addresses, search
          text or referrers in those tables. Counts are retained for 90 days.
          Hosting and external providers have separate logs and policies. Counts
          may include automated traffic and do not establish unique visitors or
          purchases.
        </p>
      </section>
      <section>
        <h2>Editorial independence</h2>
        <p>
          Commercial terms do not change OEM records, fitment evidence, repair
          steps, community feedback or technical review. A commission,
          sponsorship or application approval is not evidence of compatibility.
          Report a problem using the existing community reporting controls.
        </p>
      </section>
      <p>
        <DocumentLink href="/resources#privacy">
          Site privacy information
        </DocumentLink>{" "}
        ·{" "}
        <DocumentLink href="/community/policies">
          Community policies
        </DocumentLink>
      </p>
    </div>
  );
}
