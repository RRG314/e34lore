import importlib.util,json,struct,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('twin_pipeline',Path(__file__).parents[1]/'tools/digital-twin/asset_pipeline.py')
pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)
class PipelineTests(unittest.TestCase):
 def test_actual_models(self):
  root=Path(__file__).parents[1]/'public/models/e34-525i'
  for name in ['e34-body.glb','e34-wheel.glb']:
   report=pipeline.inspect_glb(root/name);self.assertGreater(report['triangles'],0);self.assertEqual(len(report['sha256']),64)
 def test_corrupt_header(self):
  with tempfile.NamedTemporaryFile() as f:
   f.write(bytes(24));f.flush()
   with self.assertRaisesRegex(ValueError,'Invalid GLB'):pipeline.inspect_glb(f.name)
 def test_registration_cannot_self_verify(self):
  doc={'id':'test','targetIdentity':'M50','source':{},'license':{'evidence':'original work','redistribution':'allowed'},'input':'missing.step','units':'mm','partIds':[],'accuracy':{k:'verified' for k in ['visual','dimensions','alignment','mechanical','removal']},'knownGaps':[]}
  with self.assertRaisesRegex(ValueError,'self-certify'):pipeline.validate_registration(doc)
 def test_registration_missing_license(self):
  with self.assertRaisesRegex(ValueError,'Missing registration'):pipeline.validate_registration({'id':'test'})

class NominalSealTests(unittest.TestCase):
 def test_all_published_seal_lods_match_registered_hashes(self):
  import hashlib
  root=Path(__file__).parents[1];build=json.loads((root/'data/digital-twin/nominal-seal-build.json').read_text())
  self.assertEqual(len(build['assets']),48)
  for asset in build['assets']:
   reports=[]
   for f in asset['files']:
    if f['level']=='high':continue
    p=root/f['path'];self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),f['sha256']);r=pipeline.inspect_glb(p);self.assertEqual(r['triangles'],f['triangles']);self.assertIn('part:'+asset['partId'],r['namedNodes']);reports.append(r)
   self.assertEqual(len(reports),2);self.assertGreater(reports[0]['triangles'],reports[1]['triangles'])
 def test_nominal_bounds_are_in_meters_and_do_not_claim_factory_verification(self):
  root=Path(__file__).parents[1];manifest=json.loads((root/'data/digital-twin/nominal-seals.json').read_text())
  seal=next(x for x in manifest['seals'] if x['partId']=='pump-seal');data=(root/'public/models/nominal-seals'/f"{seal['number']}-medium.glb").read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);bounds=doc['accessors'][0];self.assertAlmostEqual(bounds['max'][0]*2000,78);self.assertAlmostEqual(bounds['max'][1]*2000,5);self.assertFalse(doc['nodes'][0]['extras']['installedGeometryVerified']);self.assertNotEqual(seal['accuracy']['dimensions'],'verified')

 def test_both_runtime_pump_seal_meshes_match_nominal_dimensions(self):
  import math
  root = Path(__file__).parents[1] / "public/models/nominal-seals"
  for level in ("medium", "low"):
   with self.subTest(level=level):
    data = (root / f"11511711484-{level}.glb").read_bytes()
    json_size = struct.unpack_from("<I", data, 12)[0]
    binary_start = 28 + json_size
    doc = json.loads(data[20:20 + json_size])
    accessor = doc["accessors"][doc["meshes"][0]["primitives"][0]["attributes"]["POSITION"]]
    view = doc["bufferViews"][accessor["bufferView"]]
    self.assertEqual(accessor["componentType"], 5126)
    stride = view.get("byteStride", 12)
    offset = binary_start + view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    vertices = [struct.unpack_from("<fff", data, offset + stride * i) for i in range(accessor["count"])]
    radii = [math.hypot(x, z) for x, _, z in vertices]
    height = [y for _, y, _ in vertices]
    self.assertAlmostEqual(min(radii) * 2000, 68, places=4)
    self.assertAlmostEqual(max(radii) * 2000, 78, places=4)
    self.assertAlmostEqual((max(height) - min(height)) * 1000, 5, places=4)
    self.assertFalse(doc["nodes"][0]["extras"]["installedGeometryVerified"])
