"use client";
import { previewFeatures } from "../release/features";
import { DocumentLink } from '../components/DocumentLink';
import { useRepairJourney } from './use-journey';
import { journeyHref } from '../domain/repair-journey';
export function JourneyBar({ journey }: { journey: ReturnType<typeof useRepairJourney> }) {
  if (!journey.selected && !journey.error && !journey.scanLoading) return null;
  return <section className="journey-bar" aria-label="Your car and saved identification">
    {journey.selected && <><strong>Working on {journey.selected.nickname}</strong><DocumentLink href={journey.href('/garage')}>Open this car’s garage</DocumentLink>{previewFeatures.scanner && <DocumentLink href={journey.href('/scanner')}>Identify another part</DocumentLink>}</>}
    {journey.scanLoading && <p role="status">Loading your saved identification…</p>}
    {journey.scan && <p>Saved identification: <strong>{journey.scan.parts?.name || 'Component category'}</strong>{journey.scan.parts?.number_normalized && <> · {journey.scan.parts.number_normalized}</>}. {journey.scan.status === 'owner_confirmed' ? 'Confirmed by you; fitment must be checked separately.' : 'Possible match; identity and fitment remain unconfirmed.'}</p>}
    {journey.error && <p role="alert">{journey.error} {journey.requestedScan && <DocumentLink href={journeyHref(typeof location === 'undefined' ? '/parts/catalog' : location.pathname + location.search, { vehicle: journey.activeId })}>Continue without this identification</DocumentLink>}</p>}
  </section>;
}
