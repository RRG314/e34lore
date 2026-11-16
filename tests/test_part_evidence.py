import hashlib,json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from audit_part_evidence import audit_staged_candidates

class StagedEvidenceTests(unittest.TestCase):
    def test_receipt_cannot_claim_coverage_for_changed_facts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder=root/'work/part-evidence/catalog-candidates/source';folder.mkdir(parents=True)
            context={'model':'540i'};facts=[{'source_url':'https://example.org/a','context':context,'parts':[{}],'drawings':[]}]
            data=(json.dumps(facts[0])+'\n').encode();(folder/'assemblies.jsonl').write_bytes(data);digest=hashlib.sha256(data).hexdigest()
            manifest={'facts_sha256':digest,'errors':[],'localOnly':True,'status':'source-index-imported','expected_pages':1,'successful_pages':1,'parts':1,'drawings':0}
            (folder/'manifest.json').write_text(json.dumps(manifest))
            row={'id':'source','status':'staged-local-only','factsSha256':digest,'assemblies':1,'positions':1,'drawings':0,'recoveredPages':1,'additionalPositions':1,'additionalDrawings':0}
            (folder.parent/'receipt.json').write_text(json.dumps({'results':[row]}))
            contexts=[{'id':'source','context':context,'assemblies':0,'sourcePages':[],'rawPositionCount':0,'drawings':0,'missingSourcePages':[{'url':'https://example.org/a'}]}]
            self.assertEqual(audit_staged_candidates(root,contexts),[row])
            (folder/'assemblies.jsonl').write_bytes(data+b'\n')
            with self.assertRaisesRegex(ValueError,'hash'):audit_staged_candidates(root,contexts)

if __name__=='__main__':unittest.main()
