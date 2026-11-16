#!/usr/bin/env python3
"""Merge validated recovered pages into LOCAL catalog candidates; never execute SQL."""
import datetime,gzip,hashlib,json
from pathlib import Path
from generate_catalog_import import generate,model_context
ROOT=Path(__file__).resolve().parents[1]
def main():
    work=ROOT/'work/part-evidence';jobs=json.loads((work/'gap-jobs/jobs.json').read_text())
    jobs.append(dict(id='e34-context-a680f2f2f6013e86a6164d30',folder='work/part-evidence',originalInventory='data/catalog-sources/bpd-1994-bmw-540i-sedan_e34-route-inventory.json',factsFolder='work/part-evidence/540i-gap-facts'))
    results=[]
    for job in jobs:
        folder=ROOT/job['folder'];facts_folder=ROOT/job.get('factsFolder',str(Path(job['folder'])/'facts'))
        if not (facts_folder/'manifest.json').exists():results.append(dict(id=job['id'],status='missing-recovered-facts'));continue
        recovered_manifest=json.loads((facts_folder/'manifest.json').read_text());recovered_file=facts_folder/'assemblies.jsonl'
        if recovered_manifest['errors'] or recovered_manifest['status']!='source-index-imported':results.append(dict(id=job['id'],status='incomplete-recovery'));continue
        if hashlib.sha256(recovered_file.read_bytes()).hexdigest()!=recovered_manifest['facts_sha256']:raise ValueError('Changed recovery facts')
        source=ROOT/'data/catalog-snapshots'/f"{job['id']}.jsonl.gz";accepted=json.loads(source.with_name(source.name.replace('.jsonl.gz','.manifest.json')).read_text())
        if hashlib.sha256(source.read_bytes()).hexdigest()!=accepted['compressed_sha256']:raise ValueError('Changed accepted snapshot')
        original=[json.loads(line) for line in gzip.open(source,'rt')];recovered=[json.loads(line) for line in recovered_file.read_text().splitlines()]
        if {r['source_url'] for r in original}&{r['source_url'] for r in recovered}:raise ValueError('Recovery repeats accepted source pages')
        rows=sorted(original+recovered,key=lambda r:r['source_url']);inv_file=ROOT/job['originalInventory'];inventory=json.loads(inv_file.read_text())
        if len(rows)!=len(inventory['routes']) or {r['source_url'] for r in rows}!={r['url'] for r in inventory['routes']}:raise ValueError('Recovery does not complete the observed source index')
        if any(r['context']!=accepted['manifest']['context'] for r in rows):raise ValueError('Source vehicle changed')
        out=work/'catalog-candidates'/job['id'];out.mkdir(parents=True,exist_ok=True);facts=out/'assemblies.jsonl';facts.write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
        manifest={**accepted['manifest'],'successful_pages':len(rows),'selected_pages':len(rows),'expected_pages':len(rows),'parts':sum(len(r['parts']) for r in rows),'drawings':sum(len(r['drawings']) for r in rows),'errors':[],'status':'source-index-imported','inventory_sha256':hashlib.sha256(inv_file.read_bytes()).hexdigest(),'facts_sha256':hashlib.sha256(facts.read_bytes()).hexdigest(),'completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'localOnly':True}
        (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
        if model_context(manifest)['id']!=job['id']:raise ValueError('Canonical source context changed')
        generate(facts,manifest,inventory,out/'sql')
        results.append(dict(id=job['id'],status='staged-local-only',recoveredPages=len(recovered),additionalPositions=sum(len(r['parts']) for r in recovered),additionalDrawings=sum(len(r['drawings']) for r in recovered),assemblies=len(rows),positions=manifest['parts'],drawings=manifest['drawings'],factsSha256=manifest['facts_sha256']))
    receipt=dict(checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),scope='Local complete-source candidates; no SQL executed, no hosted import, no model/catalog binding rewrites.',results=results)
    (work/'catalog-candidates/receipt.json').parent.mkdir(parents=True,exist_ok=True);(work/'catalog-candidates/receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()
