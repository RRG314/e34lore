import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PartComparison, PartChoiceImage, bearingManualReference } from '../src/components/PartComparison';
import { FamilyResults } from '../src/scanner/FamilyResults';
import { familyComparisonParts, familyThumbnail, numberPhotograph, partMedia, partMediaSchema } from '../src/servicing/part-media';
import { emptyVehicle } from '../src/data/catalog';
import type { TechnicalDrawing } from '../src/data/diagrams';
import type { FamilyComparison } from '../src/scanner/family-comparison';
vi.mock('../src/lib/use-vehicle-catalog', () => ({ useVehicleCatalog: () => ({ rows: [], ready: true, loading: false, error: '' }) }));

describe('reference comparison images', () => {
  it('keeps the mount and the loose bearing attached to different exact-number photos', () => {
    const mount = numberPhotograph('26121226657')!, bearing = numberPhotograph('26121225002')!;
    expect(mount.image).not.toBe(bearing.image);
    expect(mount.numbers).toEqual(['26121226657']);
    expect(bearing.numbers).toEqual(['26121225002']);
    expect(numberPhotograph('not-a-number')).toBeUndefined();
    expect(numberPhotograph('00000000000')).toBeUndefined();
  });
  it('provides thumbnails for the three reported scanner choices without using captured photos', () => {
    for (const family of ['center-support-bearing', 'ball-bearing', 'engine-mount']) {
      expect(familyThumbnail(family)?.image).toMatch(/^https:/);
      const html = renderToStaticMarkup(<PartChoiceImage family={family}/>);
      expect(html).toContain('<img');
      expect(html).not.toContain('blob:');
    }
  });
  it('does not substitute a generic licensed family photo for an exact part photograph', () => {
    expect(familyThumbnail('alternator')?.scope).toBe('family');
    expect(numberPhotograph('12311744564')).toBeUndefined();
    expect(familyComparisonParts('alternator')).toHaveLength(0);
  });
  it('restricts provider-hosted image URLs and never marks them as licensed local assets', () => {
    const row = partMedia.records.find(r => r.kind === 'provider-image')!;
    for (const image of ['http://www.bimmerworld.com/core/media/media.nl?id=1', 'https://www.bimmerworld.com.evil.example/core/media/media.nl?id=1', 'https://www.bimmerworld.com:444/core/media/media.nl?id=1', 'https://www.bimmerworld.com/redirect?url=https://evil.example', 'javascript:alert(1)']) expect(partMediaSchema.safeParse({ schema: 1, records: [{ ...row, image }] }).success).toBe(false);
    expect(row.rights.status).toBe('externally-hosted');
  });
  it('renders the exact number beside an attributed diagram and a distinct loose-part image', () => {
    const drawing: TechnicalDrawing = { id: 'test-source', assembly: 'test', image: 'https://www.bmwpartsdeal.com/test-diagram.png', width: 100, height: 100, label: 'Catalog drawing', credit: 'Original catalog', source: 'https://www.bmwpartsdeal.com/parts-list/example.html', scope: 'Source example only', hotspots: [{ partIds: ['position-7'], x: .5, y: .5, label: '07' }] };
    const html = renderToStaticMarkup(<PartComparison number="26121225002" name="Separate bearing" drawing={drawing} positionId="position-7" sourceLabel="1994 540i Sedan"/>);
    for (const text of ['Loose part', '26 12 1 225 002', 'Catalog diagram', 'Position 07', '1994 540i Sedan', 'Original photo', 'Enlarge']) expect(html).toContain(text);
    expect(html).toContain(numberPhotograph('26121225002')!.image.replaceAll('&', '&amp;'));
    expect(html).toContain(drawing.image);
    expect(html).not.toContain('blob:');
  });
  it('states missing photography and diagram failures instead of showing another part', () => {
    const html = renderToStaticMarkup(<PartComparison number="11111111111" name="Unknown source" error="The source diagram could not load." onRetry={() => {}}/>);
    expect(html).toContain('A loose-part photograph is not linked to this number yet');
    expect(html).toContain('Retry diagram');
    expect(html).not.toContain('media.nl');
  });
  it('uses the actual manual locator and clearly scopes the retained excerpt', () => {
    expect(bearingManualReference('26121226657')).toMatchObject({ printed: '260-8', figure: '12', href: '/manual/260?pdf=268' });
    expect(bearingManualReference('11811094149')).toBeNull();
  });
  it('places reference thumbnails inside the scanner choices and allows preview before choosing an OEM record', () => {
    const comparison = { status: 'inconclusive', reason: 'Review shapes', views: 1, accepted: false, candidates: ['center-support-bearing','ball-bearing','engine-mount'].map(id => ({ id, score: .3, viewScores: [.3] })) } as FamilyComparison;
    const html = renderToStaticMarkup(<FamilyResults comparison={comparison} chosen="center-support-bearing" onFamilyChange={() => {}} vehicle={emptyVehicle} navigation={{}} onCatalogNumber={() => {}}/>);
    const [choices, preview] = html.split('<article class="scan-family-review">');
    expect(choices.match(/class="part-choice-image"/g)).toHaveLength(3);
    expect(choices).toContain('Compare the loose bearing');
    expect(choices).toContain('Compare the flex disc');
    expect(preview.match(/class="part-choice-image"/g)).toHaveLength(2);
    expect(html).toContain("26 12 1 226 723");
    expect(html).not.toContain("26 12 1 226 657");
    expect(html).toContain('Complete center mount');
    expect(html).toContain('Separate ball bearing');
    expect(html).toContain('Choosing an example does not identify');
    expect(html).toContain('in the full catalog');
  });
});
