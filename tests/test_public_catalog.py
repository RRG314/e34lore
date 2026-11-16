import json,sys,unittest,tempfile,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from import_public_catalog import initial_store,parse_page,identifier,allowed_url,source_image,source_prefix
from generate_catalog_import import sql,stable,assembly_sql,model_context
from package_catalog_snapshot import package,unpack
class PublicCatalogTest(unittest.TestCase):
 def context(self):return {'platform':'E34','model':'525i','modelYear':1994,'body':'Sedan','engine':None,'market':None}
 def html(self):
  value={'initApp':{'clientIp':'PRIVATE_VALUE'},'userInfo':{'token':'NEVER_IMPORT'},'partList':{'category':'Front / Rear Axle','subCategory':'Upper mount','cartVehicle':{'vehicleInfo':'525i | 1994 | Sedan(E34)','unSelectedOptions':'Transmission'},'partList':[[{'code':'1','partNumberAbbr':'31331139452','mainDesc':'Guide support','priceInfo':{'price':'999'},'allExtraInfoList':[{'name':'Require Quantity','desc':'2'},{'name':'Package Quantity','desc':'10'},{'name':'Production Date','desc':'From 199209'}],'replace':'31331139484'}]],'diagramList':[{'id':'3569','name':'Upper mount','largeImg':'/resources/encry/diagram/bpd/2021/large/test.png','hotSpotList':[{'code':'1','left':'6.6%','top':'43.41%','width':'1.4%','height':'2.42%'}]}]}}
  return '<script>window.__INITIAL_STORE__ = '+json.dumps(value)+'</script>'
 def test_bare_undefined_without_executing_script(self):
  self.assertEqual(initial_store('<script>window.__INITIAL_STORE__ = {"a":undefined,"b":"undefined"}</script>'),{'a':None,'b':'undefined'})
  with self.assertRaises(json.JSONDecodeError):initial_store('<script>window.__INITIAL_STORE__ = {"a":dangerousFunction()}</script>')
 def test_import_only_ordering_facts(self):
  page=parse_page(self.html(),'https://www.bmwpartsdeal.com/parts-list/1994-bmw-525i-sedan_e34/front_rear_axle/test.html',self.context());encoded=json.dumps(page)
  for private in ['PRIVATE_VALUE','NEVER_IMPORT','priceInfo','999']:self.assertNotIn(private,encoded)
  row=page['parts'][0];self.assertEqual(row['quantity'],2);self.assertEqual(row['package_quantity'],10);self.assertEqual(row['reference'],'01');self.assertEqual(row['replaced_by'],['31331139484']);self.assertEqual(page['unselected_options'],'Transmission');self.assertEqual(page['drawings'][0]['hotspots'][0]['left'],6.6)
 def test_applicability_children_are_not_positions_or_replacements(self):
  root=initial_store(self.html());parent=root['partList']['partList'][0][0]
  parent['allExtraInfoList'].append({'name':'Only Applies To','desc':'11511741001'})
  child={'code':'1','codeEmpty':True,'pncCode':'','partNumberAbbr':'11511741001','mainDesc':'Exchange water pump','replaceOE':'31331139452','replace':'11510004163'}
  root['partList']['partList'][0].append(child)
  html='<script>window.__INITIAL_STORE__ = '+json.dumps(root)+'</script>'
  page=parse_page(html,'https://www.bmwpartsdeal.com/parts-list/test',self.context())
  self.assertEqual(len(page['parts']),1)
  self.assertEqual(page['parts'][0]['replaced_by'],['31331139484'])
  self.assertIn({'name':'Only Applies To','value':'11511741001'},page['parts'][0]['conditions'])
  self.assertEqual(page['rejected_records'][0]['reason'],'Applicability reference, not a drawing position')
  self.assertEqual(page['rejected_records'][0]['applies_to'],'31331139452')
 def test_replace_oe_never_creates_a_reverse_or_parent_supersession(self):
  root=initial_store(self.html());row=root['partList']['partList'][0][0]
  row['replaceOE']='11511741001'
  page=parse_page('<script>window.__INITIAL_STORE__ = '+json.dumps(root)+'</script>','https://www.bmwpartsdeal.com/parts-list/test',self.context())
  self.assertEqual(page['parts'][0]['replaced_by'],['31331139484'])
 def test_reject_other_vehicle_and_external_images(self):
  with self.assertRaises(ValueError):parse_page(self.html().replace('Sedan(E34)','Sedan(E39)'),'https://www.bmwpartsdeal.com/parts-list/test',self.context())
  self.assertIsNone(source_image('https://evil.example/image.png'));self.assertFalse(allowed_url('https://www.bmwpartsdeal.com/onlineapi/private',self.context()))
 def test_preserve_leading_zero_and_reject_invalid_numbers(self):
  self.assertEqual(identifier('07-11-9-905-374'),'07119905374');self.assertIsNone(identifier('07119905374<script>'))
 def test_sql_literals_are_escaped_and_ids_repeat(self):
  self.assertEqual(sql("mount';drop table parts;--"),"'mount'';drop table parts;--'");self.assertEqual(stable('part','x'),stable('part','x'))
 def test_engine_selected_context_does_not_invent_a_body(self):
  context={**self.context(),'modelYear':1991,'body':None,'engine':'M20'}
  url='https://www.bmwpartsdeal.com/parts-list/1991-bmw-525i-m20_engine_e34/engine/test.html'
  prefix=source_prefix({'context':context,'routes':[{'url':url}]})
  self.assertTrue(allowed_url(url,context,prefix));self.assertFalse(allowed_url(url.replace('m20_engine','m50_engine'),context,prefix))
  mapped=model_context({'context':context});self.assertIsNone(mapped['body']);self.assertIn('body unspecified',mapped['name'])
 def test_vendor_m5_key_maps_to_the_existing_canonical_model(self):
  mapped=model_context({'context':{**self.context(),'model':'m5'}});self.assertEqual(mapped['model_id'],'M5');self.assertEqual(mapped['selection']['model'],'m5')
 def test_owned_snapshot_round_trip_and_tamper_detection(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);facts=root/'facts';facts.mkdir();raw=(json.dumps({'context':self.context(),'parts':[{'number':'07119905374'}]})+'\n').encode();(facts/'assemblies.jsonl').write_bytes(raw)
   (facts/'manifest.json').write_text(json.dumps({'context':self.context(),'successful_pages':1,'facts_sha256':hashlib.sha256(raw).hexdigest()}))
   receipt=package(facts,root/'backup');unpack(receipt,root/'restored');self.assertEqual((root/'restored'/'assemblies.jsonl').read_bytes(),raw)
   file=root/'backup'/json.loads(receipt.read_text())['file'];file.write_bytes(file.read_bytes()+b'tampered')
   with self.assertRaisesRegex(ValueError,'hash mismatch'):unpack(receipt,root/'rejected')
if __name__=='__main__':unittest.main()
