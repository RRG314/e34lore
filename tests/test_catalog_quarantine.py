import json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from generate_catalog_import import assembly_sql

class CatalogQuarantineTest(unittest.TestCase):
 def test_legacy_child_does_not_generate_order_or_replacement_claims(self):
  record=json.loads((ROOT/'data/catalog-position-quarantine.json').read_text())['records'][0]
  child={'number':'07119905544','reference':'01','name':'Not an ordering row','source_description':'','quantity':1,'package_quantity':None,'conditions':[],'replaced_by':['07119900001'],'record_hash':record['record_sha256']}
  parent={**child,'number':'11517527799','name':'Real parent','record_hash':'b'*64,'replaced_by':[]}
  page={'source_url':record['source_url'],'source_sha256':record['source_sha256'],'title':'Retained source fixture','context':{},'source_vehicle_label':'525i','unselected_options':'Transmission','category':'Engine','parts':[child,parent],'drawings':[]}
  result=assembly_sql(page,{'id':record['context_id']})
  self.assertNotIn(record['record_sha256'],result)
  self.assertNotIn('07119900001',result)
  self.assertNotIn('part_supersessions',result)
  self.assertIn('11517527799',result)
  self.assertEqual(page['parts'],[child,parent])
 def test_exact_registry_matches_the_retained_client_exclusions(self):
  records=json.loads((ROOT/'data/catalog-position-quarantine.json').read_text())['records']
  excluded=json.loads((ROOT/'data/catalog-position-exclusions.json').read_text())['excludedPositions']
  self.assertEqual(len(records),2712);self.assertEqual({r['id'] for r in records},set(excluded))
  self.assertTrue(all(r['id']==r['assembly_id']+'-'+r['record_sha256'][:24] for r in records))
