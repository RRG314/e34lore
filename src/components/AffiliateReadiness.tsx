"use client";
import { useEffect, useState } from "react";
import { db } from "./context";
import { DocumentLink } from "./DocumentLink";
import { affiliateCatalogUrl, affiliateReadinessSchema, nextAffiliateStep, type AffiliateReadiness } from "../domain/affiliate-readiness";

export function AffiliateReadinessPanel({ data, onSection }: {
  data: AffiliateReadiness;
  onSection: (section: "applications" | "retailers" | "matching") => void;
}) {
  const started = data.retailers.filter(r => r.program_status !== "researching");
  return <section className="affiliate-readiness" aria-labelledby="affiliate-readiness-title">
    <h2 id="affiliate-readiness-title">Retailer launch checklist</h2>
    <p>Public offers below pass the same checks as the catalog. Saved records alone do not make a link available. This check does not confirm network attribution or a commission.</p>
    <p className="small muted">Checked {new Date(data.checked_at).toLocaleString()}</p>
    <div className="affiliate-readiness-grid">
      {started.map(r => {
        const next = nextAffiliateStep(r);
        const live = r.public_offers > 0 || r.public_retailer_links > 0;
        return <article key={r.id} aria-labelledby={"readiness-" + r.id}>
          <h3 id={"readiness-" + r.id}>{r.name}</h3>
          <p className="eyebrow">{live ? "Public links available" : "Not live"} · {r.program_status.replaceAll("_", " ")}</p>
          <dl className="affiliate-readiness-counts">
            <div><dt>Products</dt><dd>{r.products}</dd></div>
            <div><dt>Reviewed matches</dt><dd>{r.reviewed_matches}</dd></div>
            <div><dt>Checked links</dt><dd>{r.checked_links}</dd></div>
            <div><dt>Public offers</dt><dd>{r.public_offers}</dd></div>
            <div><dt>Storefront links</dt><dd>{r.public_retailer_links}</dd></div>
          </dl>
          {r.program_id === "fcp-partnership" && <p className="small">FCP Euro’s submission is a partnership request. A commission program and tracking access still need written confirmation.</p>}
          {r.program_id === "kc-tool-refersion" && <p className="small">Tool-store links appear on the retailer links page. They do not claim to replace a BMW part.</p>}
          {!live && <><p>{next.message}</p><button className="text-link" onClick={() => onSection(next.section)}>Open {next.section === "matching" ? "product matching" : next.section}</button></>}
          {r.public_retailer_links > 0 && <DocumentLink className="text-link" href="/partnerships#retailer-links">Inspect public storefront links</DocumentLink>}
          {r.samples.map((sample, i) => <DocumentLink key={sample.link_id + ":" + i} className="text-link" href={affiliateCatalogUrl(sample)}>Inspect public offer {i + 1} in the catalog</DocumentLink>)}
        </article>;
      })}
    </div>
    {!started.length && <p>No retailer applications are in progress.</p>}
    <details className="commercial-tool"><summary>Before the first earning link</summary>
      <ol>
        <li>Obtain actual approval, an issued tracking link or approved template, authorized domains and placement rules.</li>
        <li>Review each product’s OEM number and configuration. Use product or image feeds only with permission; price and stock can stay hidden.</li>
        <li>Check the published catalog on a phone and desktop: disclosure, part identity, source conditions and retailer destination.</li>
        <li>Use the network’s permitted test procedure to verify the referral reaches your publisher account. A successful redirect does not establish attribution.</li>
        <li>Confirm reporting, payment and tax setup directly with the provider. Do not create a test purchase or click an ad to simulate earnings.</li>
      </ol>
      <p>Display advertising is configured separately. Affiliate links do not require ads to be switched on.</p>
    </details>
  </section>;
}

export function AffiliateReadinessCheck({ scope, onSection }: {
  scope: string; onSection: Parameters<typeof AffiliateReadinessPanel>[0]["onSection"];
}) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([scope, revision]);
  const [result, setResult] = useState<{ key: string; data?: AffiliateReadiness; error?: string }>();
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    Promise.resolve(db.rpc("affiliate_launch_readiness").abortSignal(controller.signal))
      .then(({ data, error }) => {
        if (error) throw error;
        const parsed = affiliateReadinessSchema.parse(data);
        if (active) setResult({ key, data: parsed });
      }).catch(() => {
        if (active) setResult({ key, error: "Retailer readiness could not be checked. Refresh your account security if your session has expired, then retry." });
      }).finally(() => clearTimeout(timer));
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [key]);
  if (result?.key !== key) return <p role="status">Checking retailer readiness…</p>;
  if (result.error) return <div className="affiliate-readiness" role="alert"><p>{result.error}</p><button className="text-link" onClick={() => setRevision(r => r + 1)}>Retry readiness check</button></div>;
  return result.data ? <AffiliateReadinessPanel data={result.data} onSection={onSection}/> : null;
}
