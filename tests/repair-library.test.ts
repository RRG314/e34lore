import { describe, expect, it } from 'vitest';
import { manualChapters, manualGuides } from '../src/data/manual';
import { manualJobs } from '../src/data/manual-jobs';
import { browseRepairTopics, manualTopicHref, repairTopic, repairTopics, topicForGuide, topicGuide } from '../src/repair/library';
import { attachRepairContext, repairComposeContext, repairComposeDefaults, repairContributionHref, repairDraftKey, repairFromObservations, repairMarker, repairObservationFilter, repairOwnerPostsHref } from '../src/repair/community';
import { communityBoardHref, communityBoardLabel, communityBoardSelection } from '../src/community/boards';
import { seriesHref } from '../src/series/registry';
import { createClient } from '@supabase/supabase-js';
import { repairSources, illustratedRepairSources } from '../src/repair/sources';
import sources from '../src/references/starter-sources.json';
import { externalReferenceUrl } from '../supabase/functions/_shared/external-reference.mjs';

describe('job-based repair library', () => {
  it('makes every manual job discoverable without a search and preserves exact page locators', () => {
    const jobs = browseRepairTopics();
    expect(jobs.length).toBeGreaterThan(280);
    expect(new Set(repairTopics.map(t => t.id)).size).toBe(repairTopics.length);
    for (const chapter of manualChapters) for (const job of manualJobs(chapter.id)) {
      const topic = jobs.find(t => t.id === `${chapter.id}-${job.anchor}`);
      expect(topic, job.title).toBeDefined();
      expect(topic!.manual!.pdfPage).toBe(chapter.pdfStart + job.page - 1);
      expect(manualTopicHref(topic!)).toBe(`/manual/${chapter.id}?pdf=${chapter.pdfStart + job.page - 1}#${job.anchor}`);
    }
  });
  it.each(['head gasket replacement', 'window regulator', 'brake pads', 'water pump', 'automatic transmission fluid'])('finds actual jobs for %s', query => {
    expect(browseRepairTopics({ query }).some(t => t.manual)).toBe(true);
  });
  it('separates standalone conversion plans from repair procedures without losing existing guides', () => {
    expect(browseRepairTopics().some(t => topicGuide(t)?.track === 'swap')).toBe(false);
    expect(browseRepairTopics({ planning: true }).some(t => t.guide === 'e34-525i-five-speed-swap')).toBe(true);
    expect(browseRepairTopics({ planning: true, track: 'swap' }).every(t => topicGuide(t)?.track === 'swap')).toBe(true);
    expect(browseRepairTopics({ planning: true, track: 'mod' }).every(t => topicGuide(t)?.track === 'mod')).toBe(true);
    for (const g of manualGuides) expect(topicForGuide(g.slug)?.guide).toBe(g.slug);
    expect(repairTopic('missing-job')).toBeUndefined();
  });
  it('filters explicit engine titles and systems without inventing applicability for unscoped jobs', () => {
    const jobs = browseRepairTopics({ engine: 'M50', system: 'cooling' });
    expect(jobs.some(t => t.title === 'M50 water pump replacement planning')).toBe(true);
    expect(jobs.some(t => t.title === 'M60 water pump replacement')).toBe(false);
    expect(jobs.every(t => t.systems.includes('cooling'))).toBe(true);
  });
  it('links only canonical supported source URLs and registered jobs', () => {
    for (const source of sources) {
      expect(externalReferenceUrl(source.url), source.url).not.toBeNull();
      for (const target of source.targets.filter(t => t.kind === 'repair')) expect(repairTopic(target.id), target.id).toBeDefined();
      expect('body' in source).toBe(false);
    }
    expect(sources.filter(s => s.targets.some(t => t.kind === 'repair')).length).toBeGreaterThanOrEqual(20);
  });
  it('labels a different-engine external guide rather than silently asserting fitment', () => {
    const topic = repairTopics.find(t => t.title === 'M30 water pump replacement')!;
    expect(repairSources(topic, { engine: 'M50' }).some(s => s.applicabilityMatch === 'different')).toBe(true);
    expect(repairSources(topic, { engine: 'M30B35' }).some(s => s.applicabilityMatch === 'related')).toBe(true);
  });
  it('keeps discussion links out of the photo walkthrough filter', () => {
    const discussionOnly = repairTopics.find(t => t.title === 'M60 water pump replacement')!;
    expect(repairSources(discussionOnly).length).toBeGreaterThan(0);
    expect(illustratedRepairSources(discussionOnly)).toHaveLength(0);
    expect(repairTopics.filter(t => illustratedRepairSources(t).length > 0)).toHaveLength(34);
  });
  it('does not widen external sources into arbitrary URLs or redirectors', () => {
    for (const url of ['https://www.shiftbmw.com/redirect?url=https://evil.example', 'https://www.shiftbmw.com.evil.example/model/e34/test/', 'https://www.exx.se/maintenance/../private/index.shtml', 'https://www.fcpeuro.com/products/anything', 'http://www.shiftbmw.com/model/e34/test/']) expect(externalReferenceUrl(url)).toBeNull();
  });
});

describe('repair comments and owner walkthroughs', () => {
  it('returns a linked discussion to the correct generation and repair section', () => {
    expect(repairOwnerPostsHref(repairTopic('e30-air-filter','e30')!)).toBe('/e30/repairs/e30-air-filter#owner-experience');
    expect(repairOwnerPostsHref(repairTopic('020-job-air-filter-replacement','e34')!)).toBe('/repairs/020-job-air-filter-replacement#owner-experience');
  });
  it('keeps a shared board and its filters when linking to an E30 draft or thread', () => {
    const filter = communityBoardSelection({board:'maintenance',tag:'unknown',q:' air filter & seal '});
    expect(filter).toEqual({board:'maintenance',tag:'',q:'air filter & seal'});
    const href = seriesHref(communityBoardHref(filter,'/community/new'),'e30');
    const url = new URL(href,'https://example.test');
    expect(url.pathname).toBe('/community/new');
    expect(url.searchParams.get('series')).toBe('e30');
    expect(communityBoardSelection(Object.fromEntries(url.searchParams))).toEqual(filter);
    expect(communityBoardLabel('General E34 Community')).toBe('General discussion');
  });
  const topic = repairTopics.find(t => t.title === 'Window regulator and motor')!;
  it('serializes the actual Supabase JSONB containment request rather than a PostgreSQL array', async () => {
    let requested = '';
    const client = createClient('https://example.supabase.co', 'test-public-key', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async input => { requested = String(input); return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }); } } });
    const response = await client.from('threads').select('id').contains('observations', repairObservationFilter(topic));
    expect(response.error).toBeNull();
    expect(new URL(requested).searchParams.get('observations')).toBe('cs.' + JSON.stringify([repairMarker(topic)]));
    expect(requested).not.toContain('object');
  });
  it.each(['repair-comment', 'repair-writeup'] as const)('round-trips the %s handoff with canonical context', intent => {
    const url = new URL(repairContributionHref(topic, intent), 'https://example.test');
    expect(repairComposeContext(url.searchParams)).toEqual({ topic, intent });
    const defaults = repairComposeDefaults(topic, intent);
    expect(defaults.template).toBe(intent === 'repair-writeup' ? 'repair' : 'general');
    expect(repairFromObservations(defaults.observations)?.id).toBe(topic.id);
    if (intent === 'repair-writeup') for (const field of ['Tools', 'time taken', 'Step-by-step', 'Photo or video', 'Manual pages', 'outcome']) expect(defaults.body).toContain(field);
  });
  it('rejects arbitrary topics and unknown compose modes', () => {
    expect(repairComposeContext(new URLSearchParams('repair=made-up&intent=repair-writeup'))).toBeNull();
    expect(repairComposeContext(new URLSearchParams({ repair: topic.id, intent: 'specialist' }))).toBeNull();
    expect(repairFromObservations([{ question: 'E34 Lore repair topic', answer: 'made-up' }])).toBeUndefined();
  });
  it('keeps each job and contribution type in its own draft slot', () => {
    const other = repairTopics.find(t => t.title === 'Caliper removal')!;
    expect(new Set([repairDraftKey(topic, 'repair-comment'), repairDraftKey(topic, 'repair-writeup'), repairDraftKey(other, 'repair-writeup')]).size).toBe(3);
  });
  it('preserves real draft text while clearing stale links and replacing old job markers', () => {
    const restored = { body: 'My actual repair and result', title: 'My window repair', guide: 'another-guide', chapter: '340', part: 'old-part', journal: 'old-journal', observations: [{ question: 'E34 Lore repair topic', answer: 'another-topic' }, { question: 'Observed', answer: 'Teeth worn' }] };
    const attached = attachRepairContext(restored, topic);
    expect(attached.body).toBe(restored.body);
    expect(attached.title).toBe(restored.title);
    expect(attached.chapter).toBe('512');
    expect(attached.part).toBe('');
    expect(attached.journal).toBe('');
    expect(attached.observations).toEqual([repairMarker(topic), restored.observations[1]]);
  });
  it('keeps the canonical topic within existing observation count and byte limits', () => {
    const attached = attachRepairContext({ observations: Array.from({ length: 25 }, () => ({ question: 'q'.repeat(1000), answer: 'a'.repeat(1000) })) }, topic);
    expect(attached.observations.length).toBeLessThanOrEqual(20);
    expect(new TextEncoder().encode(JSON.stringify(attached.observations)).length).toBeLessThanOrEqual(15000);
    expect(repairFromObservations(attached.observations)?.id).toBe(topic.id);
  });
});
