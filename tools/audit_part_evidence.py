#!/usr/bin/env python3
"""Audit existing factual catalog backups and shared media; never import/mutate hosted data."""
import gzip,hashlib,json,re
from collections import Counter,defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def audit_staged_candidates(root,contexts):
    receipt=root/'work/part-evidence/catalog-candidates/receipt.json'
    if not receipt.exists():return []
    results=json.loads(receipt.read_text())['results'];seen=set();validated=[]
    for row in results:
        if row['id'] in seen:raise ValueError('Repeated staged source context')
        seen.add(row['id'])
        if row['status']!='staged-local-only':continue
        context=next((c for c in contexts if c['id']==row['id']),None)
        if not context:raise ValueError('Unknown staged source context')
        folder=receipt.parent/row['id'];manifest=json.loads((folder/'manifest.json').read_text());data=(folder/'assemblies.jsonl').read_bytes()
        digest=hashlib.sha256(data).hexdigest()
        if digest!=row['factsSha256'] or digest!=manifest['facts_sha256']:raise ValueError('Stale staged candidate hash: '+row['id'])
        facts=[json.loads(line) for line in data.splitlines()]
        if manifest['errors'] or not manifest.get('localOnly') or manifest['status']!='source-index-imported' or len(facts)!=manifest['expected_pages']:raise ValueError('Incomplete staged candidate')
        urls=[f['source_url'] for f in facts]
        if len(set(urls))!=len(urls) or any(f['context']!=context['context'] for f in facts):raise ValueError('Repeated pages or changed candidate vehicle')
        counts={'assemblies':len(facts),'positions':sum(len(f['parts']) for f in facts),'drawings':sum(len(f['drawings']) for f in facts)}
        if any(row[k]!=v for k,v in counts.items()) or counts['assemblies']!=manifest['successful_pages'] or counts['positions']!=manifest['parts'] or counts['drawings']!=manifest['drawings']:raise ValueError('Staged candidate counts disagree')
        if row['recoveredPages']!=len(context['missingSourcePages']) or counts['assemblies']!=context['assemblies']+row['recoveredPages']:raise ValueError('Staged page coverage disagrees')
        expected=set(context['sourcePages'])|{gap['url'] for gap in context['missingSourcePages']}
        if set(urls)!=expected:raise ValueError('Staged routes do not complete the accepted source selection')
        if row['additionalPositions']!=counts['positions']-context['rawPositionCount'] or row['additionalDrawings']!=counts['drawings']-context['drawings']:raise ValueError('Staged recovery deltas disagree')
        validated.append(row)
    return validated
def build(root=ROOT):
    inventory=json.loads((root/'data/catalog-snapshots/inventory.json').read_text())
    records=defaultdict(lambda:dict(positions=0,drawings=0,contexts=set(),model_locations=set(),guides=set(),photos=[],photo_sources=[]))
    contexts=[]; categories=Counter(); files=[]
    for file in sorted((root/'data/catalog-snapshots').glob('*.jsonl.gz')):
        manifest=json.loads(file.with_name(file.name.replace('.jsonl.gz','.manifest.json')).read_text())
        digest=hashlib.sha256(file.read_bytes()).hexdigest()
        if digest!=manifest['compressed_sha256']:raise ValueError('Snapshot hash mismatch: '+file.name)
        facts=manifest['manifest'];assemblies=0;positions=0;drawings=0;source_pages=[]
        for line in gzip.open(file,'rt'):
            row=json.loads(line);assemblies+=1;drawings+=len(row['drawings']);source_pages.append(row['source_url'])
            for part in row['parts']:
                number=part['number']
                if not re.fullmatch(r'\d{11}',number) or number=='00000000000':continue
                r=records[number];r['positions']+=1;r['drawings']+=len(row['drawings']);r['contexts'].add(file.stem.replace('.jsonl',''));positions+=1;categories[row['category']]+=1
        contexts.append(dict(id=file.stem.replace('.jsonl',''),context=facts['context'],assemblies=assemblies,positions=positions,rawPositionCount=facts['parts'],drawings=drawings,sourcePages=sorted(source_pages),missingSourcePages=facts.get('errors',[]),expectedPages=facts.get('expected_pages')))
        files.append(dict(file=str(file.relative_to(root)),sha256=digest))
    archive=root/'private/open-source-review/e34-identities.jsonl.gz'
    if archive.is_file():
        for line in gzip.open(archive,'rt'):
            row=json.loads(line)
            if row['number']!='00000000000':records[row['number']]
    live_file=root/'work/part-evidence/public-inventory.json'
    live=json.loads(live_file.read_text()) if live_file.exists() else None
    if live:
        for row in live['parts']:
            if re.fullmatch(r'\d{11}',row['number_normalized'] or '') and row['number_normalized']!='00000000000':records[row['number_normalized']]
    media=json.loads((root/'data/parts-media/manifest.json').read_text())
    for row in media['records']:
        if row['scope']!='number':continue
        for number in row['numbers']:
            if number not in records:raise ValueError('Media has no catalog identity: '+number)
            records[number]['photos' if row['kind']=='photograph' else 'photo_sources'].append(row['id'])
    catalogs=[root/'data/digital-twin/component-catalog.json',*sorted((root/'public/models').rglob('*catalog*.json'))]
    # Only the native catalog contract, never arbitrary model JSON or guessed name matches.
    for file in catalogs:
        data=json.loads(file.read_text())
        if not isinstance(data.get('bindings'),dict):continue
        for node,binding in data['bindings'].items():
            for position in binding.get('positions',[]):
                number=position['number']
                if number in records:
                    records[number]['model_locations'].add(data.get('id',file.name)+':'+node)
                    records[number]['guides'].update(binding.get('guideIds',[]))
    rows=[dict(number=n,**{k:sorted(v) if isinstance(v,set) else v for k,v in r.items()}) for n,r in sorted(records.items())]
    summary=dict(identities=len(rows),withOrderingPositions=sum(bool(r['positions']) for r in rows),withAssemblyDrawing=sum(bool(r['drawings']) for r in rows),withExactLocalPhoto=sum(bool(r['photos']) for r in rows),withExternalPhotoSource=sum(bool(r['photo_sources']) for r in rows),withIndexedModelLocation=sum(bool(r['model_locations']) for r in rows),withIndexedGuide=sum(bool(r['guides']) for r in rows),licensedFamilyPhotos=sum(r['kind']=='photograph' and r['scope']=='family' for r in media['records']),missingSourcePages=sum(len(c['missingSourcePages']) for c in contexts))
    staged=audit_staged_candidates(root,contexts)
    return dict(schema=1,scope='Local factual snapshots and indexed links, not live image availability, physical fitment, exact CAD, complete repairs or a complete E34 photo dataset. Model/guide counts cover scanned native catalogs only; external associations remain in existing systems.',publicReadObservedAt=live['observedAt'] if live else None,publicReadCounts=live['counts'] if live else None,savedInventoryObservedAt=inventory['observed_at'],savedInventoryCounts={k:inventory[k] for k in ['registered_bmw_numbers','active_positions','source_drawings','unique_source_images']},summary=summary,snapshotFiles=files,contexts=contexts,stagedCandidates=staged,positionsByCategory=dict(sorted(categories.items())),parts=rows)
def main():
    report=build();out=ROOT/'work/part-evidence';out.mkdir(parents=True,exist_ok=True)
    (out/'coverage.json').write_text(json.dumps(report,indent=2)+'\n')
    s=report['summary'];lines=['# Shared part evidence coverage','',report['scope'],'','Generated with `python3 tools/audit_part_evidence.py`. Detailed per-number gaps and original missing-page URLs stay in ignored `work/part-evidence/coverage.json`. Existing canonical catalog identities and source positions are reused.','', '| Evidence | Distinct identities / count |','| --- | ---: |']
    labels={'identities':'BMW identities (excluding reserved placeholder)','withOrderingPositions':'With source ordering positions','withAssemblyDrawing':'With an assembly drawing in local snapshots','withExactLocalPhoto':'With a locally licensed exact-part photograph','withExternalPhotoSource':'With an exact-number external photograph source','withIndexedModelLocation':'With an indexed native model location','withIndexedGuide':'With an indexed guide association','licensedFamilyPhotos':'Licensed component-family photos (not exact BMW identities)','missingSourcePages':'Source pages missing from accepted snapshots'}
    lines += [f'| {labels[k]} | {v:,} |' for k,v in s.items()]
    lines+=['','An assembly drawing is not an individual product photograph. Family photos never establish exact OEM identity. Source-page links do not grant image redistribution or training rights. Archive identity rows do not establish fitment. Counts exclude the reserved `00000000000` not-supplied-separately identity.','', '## Source selections with missing pages','']
    for c in report['contexts']:
        if c['missingSourcePages']:lines.append(f"- {c['context']['modelYear']} {c['context']['model']} {c['context'].get('body') or 'body unspecified'}: {len(c['missingSourcePages'])} source pages missing.")
    recovery=ROOT/'work/part-evidence/catalog-candidates/receipt.json'
    if recovery.exists():
        complete=report['stagedCandidates'];totals={key:sum(r[key] for r in complete) for key in ['recoveredPages','additionalPositions','additionalDrawings']}
        accepted={c['id'] for c in report['contexts'] if not c['missingSourcePages']};covered=accepted|{r['id'] for r in complete}
        lines+=['','## Recovered local source coverage','',f"{len(complete)} hash-validated staged source selections recover {totals['recoveredPages']} missing pages, {totals['additionalPositions']} ordering positions and {totals['additionalDrawings']} drawing records. Together with {len(accepted)} already complete selections, {len(covered)}/{len(report['contexts'])} saved source indexes have full page coverage locally. This is not coverage of every E34 vehicle/option or a complete product-photo library. Accepted/hosted counts above remain unchanged. [Recovery and validation](catalog-gap-recovery-2026-11-09.md)."]
    candidate=ROOT/'work/part-evidence/540i-complete-candidate/manifest.json'
    if candidate.exists():
        c=json.loads(candidate.read_text());lines+=['','## Staged 1994 540i completion','',f"Three recovered pages add 49 source positions and four drawing records. The local merged candidate contains {c['successful_pages']} assemblies, {c['parts']} ordering positions and {c['drawings']} drawings. Raw source snapshots, complete normalized facts and transactional import SQL remain in ignored `work/part-evidence/540i-complete-candidate`. The existing context identity is retained; this batch has not been applied to hosted data or released."]
    (ROOT/'docs/parts-evidence-coverage.md').write_text('\n'.join(lines)+'\n');print(json.dumps(s))
if __name__=='__main__':main()
