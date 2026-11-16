import {describe,it,expect} from 'vitest';
import {catalogPositionAllowed,catalogOrderingRows,correctedCatalogInventory} from '../src/lib/catalog-integrity';
import review from '../data/catalog-position-exclusions.json';
import fullReview from '../data/catalog-applicability.json';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import catalog from '../data/digital-twin/component-catalog.json';
describe('catalog position integrity',()=>{
 it('quarantines source applicability children without discarding canonical BMW identities',()=>{
  expect(review.excludedPositions).toHaveLength(2712);expect(new Set(review.excludedPositions).size).toBe(2712);
  const bad=review.excludedPositions[0];
  expect(catalogOrderingRows([{position_id:bad,part_id:'a'},{position_id:'valid-position',part_id:'b'},{position_id:null,part_id:'canonical-only'}])).toEqual([{position_id:'valid-position',part_id:'b'},{position_id:null,part_id:'canonical-only'}]);
  expect(catalogPositionAllowed(bad)).toBe(false);expect(catalogPositionAllowed()).toBe(true);
 });
 it('updates old inventory counts once and preserves subsequent hosted imports',()=>{
  const c=review.contexts[0];
  const before={id:c.id,position_count:c.beforePositionCount,distinct_parts:999};
  const expected={...before,position_count:c.correctedPositionCount,distinct_parts:c.correctedDistinctNumbers};
  expect(correctedCatalogInventory([before])).toEqual([expected]);
  expect(correctedCatalogInventory([expected])).toEqual([expected]);
  expect(correctedCatalogInventory([{...before,position_count:c.beforePositionCount+1}])[0].position_count).toBe(c.beforePositionCount+1);
 });
 it('pins the correction receipt and preserves a reviewed, reversible data repair',()=>{
  expect(fullReview.unreviewedPages).toEqual([]);expect(fullReview.contexts.reduce((n,c)=>n+c.checkedPages,0)).toBe(3796);
  expect(catalog.applicabilityReviewSha256).toBe(createHash('sha256').update(fs.readFileSync('data/catalog-position-exclusions.json')).digest('hex'));
  const sql=fs.readFileSync('supabase/migrations/20261108011951_catalog_applicability_corrections.sql','utf8');
  expect(sql).toContain('set active=false');expect(sql).not.toMatch(/delete from|drop table/i);
 });
});
