"""Audit preserved source caches against pinned facts; never mutates hosted data.

A row is quarantined only when the retained legacy parser reproduces the exact
normalized page and the corrected parser identifies it as a non-position child.
Run with a retained pre-fix parser path to avoid reinterpreting the old contract.
"""
import argparse,gzip,hashlib,importlib.util,json,sys
from pathlib import Path
from import_public_catalog import parse_page

def supplement_gap_pages(result,legacy):
 # Gap imports occurred after the durable snapshots; inspect their retained facts too.
 known={json.loads(line)['source_url'] for receipt in Path('data/catalog-snapshots').glob('*.manifest.json') for line in gzip.decompress((receipt.parent/json.loads(receipt.read_text())['file']).read_bytes()).splitlines()}
 for facts in Path('.codex/qa/catalog-gap-recheck').glob('*/facts/assemblies.jsonl'):
  for line in facts.read_text().splitlines():
   page=json.loads(line);url=page['source_url']
   if url in known:continue
   key=hashlib.sha256(url.encode()).hexdigest();cache=facts.parent.parent/'cache'/(key+'.html.gz');html=gzip.decompress(cache.read_bytes()).decode()
   if legacy.parse_page(html,url,page['context'])['parts']!=page['parts']:raise ValueError('Supplemental source changed: '+url)
   current=parse_page(html,url,page['context']);kept={r['record_hash'] for r in current['parts']};old={r['record_hash'] for r in page['parts']}
   if not kept.issubset(old):raise ValueError('Supplemental primary row changed: '+url)
   removed=[r for r in page['parts'] if r['record_hash'] not in kept]
   related={r['number'] for r in current['rejected_records'] if r['reason']=='Applicability reference, not a drawing position'}
   if any(r['number'] not in related for r in removed):raise ValueError('Unexplained supplemental row: '+url)
   result['excludedPositions'].extend('catalog-assembly-'+key[:24]+'-'+r['record_hash'][:24] for r in removed)
   from generate_catalog_import import model_context
   context_id=model_context({'context':page['context']})['id'];row=next(c for c in result['contexts'] if c['id']==context_id);row['checkedPages']+=1;row['quarantinedPositions']+=len(removed)
   if removed:result['observations'].append({'contextId':context_id,'sourceUrl':url,'snapshotSourceSha256':page['source_sha256'],'retainedHtmlSha256':hashlib.sha256(html.encode()).hexdigest(),'removed':len(removed)})
   known.add(url)
 result['excludedPositions']=sorted(set(result['excludedPositions']))
 return result

def inventory_counts(result):
 from generate_catalog_import import model_context
 pages={}
 for receipt in Path('data/catalog-snapshots').glob('*.manifest.json'):
  pin=json.loads(receipt.read_text());cid=pin['file'].removesuffix('.jsonl.gz')
  for line in gzip.decompress((receipt.parent/pin['file']).read_bytes()).splitlines():
   page=json.loads(line);pages[(cid,page['source_url'])]=page
 for file in Path('.codex/qa/catalog-gap-recheck').glob('*/facts/assemblies.jsonl'):
  for line in file.read_text().splitlines():
   page=json.loads(line);pages[(model_context({'context':page['context']})['id'],page['source_url'])]=page
 excluded=set(result['excludedPositions'])
 for context in result['contexts']:
  raw=[];kept=[]
  for (cid,url),page in pages.items():
   if cid!=context['id']:continue
   raw.extend(page['parts']);aid='catalog-assembly-'+hashlib.sha256(url.encode()).hexdigest()[:24]
   kept.extend(r for r in page['parts'] if aid+'-'+r['record_hash'][:24] not in excluded)
  context.update(beforePositionCount=len(raw),correctedPositionCount=len(kept),correctedDistinctNumbers=len({r['number'] for r in kept}))
 return result

def audit(legacy_path,output):
 spec=importlib.util.spec_from_file_location('retained_legacy_catalog',legacy_path)
 legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)
 caches={}
 for root in [Path('outputs'),Path('.codex/qa/catalog-gap-recheck')]:
  for file in root.rglob('*.html.gz'):caches.setdefault(file.name,[]).append(file)
 exclusions=[];missing=[];contexts=[];observations=[]
 for receipt in sorted(Path('data/catalog-snapshots').glob('*.manifest.json')):
  pin=json.loads(receipt.read_text());context_id=pin['file'].removesuffix('.jsonl.gz');context=pin['manifest']['context'];checked=0;removed=0
  payload=(receipt.parent/pin['file']).read_bytes()
  if hashlib.sha256(payload).hexdigest()!=pin['compressed_sha256']:raise ValueError('Pinned facts changed')
  for line in gzip.decompress(payload).splitlines():
   page=json.loads(line);url=page['source_url'];key=hashlib.sha256(url.encode()).hexdigest();matched=False
   for cache in caches.get(key+'.html.gz',[]):
    html=gzip.decompress(cache.read_bytes()).decode()
    try:before=legacy.parse_page(html,url,context)
    except (ValueError,KeyError):continue
    if before['parts']!=page['parts']:continue
    current=parse_page(html,url,context);kept={r['record_hash'] for r in current['parts']};old={r['record_hash'] for r in page['parts']}
    if not kept.issubset(old):raise ValueError('A primary record changed; manual review needed: '+url)
    removed_rows=[r for r in page['parts'] if r['record_hash'] not in kept]
    related={r['number'] for r in current['rejected_records'] if r['reason']=='Applicability reference, not a drawing position'}
    if any(r['number'] not in related for r in removed_rows):raise ValueError('Unexplained source-row change: '+url)
    for row in removed_rows:exclusions.append('catalog-assembly-'+key[:24]+'-'+row['record_hash'][:24])
    if removed_rows:observations.append({'contextId':context_id,'sourceUrl':url,'snapshotSourceSha256':page['source_sha256'],'retainedHtmlSha256':hashlib.sha256(html.encode()).hexdigest(),'removed':len(removed_rows)})
    checked+=1;removed+=len(removed_rows);matched=True;break
   if not matched:missing.append({'contextId':context_id,'url':url})
  contexts.append({'id':context_id,'checkedPages':checked,'quarantinedPositions':removed})
  print(context_id,checked,'pages;',removed,'applicability children',flush=True)
 output.mkdir(parents=True,exist_ok=True)
 result={'schemaVersion':1,'reason':'Applicability child references are not drawing positions or replacements. The parent conditions retain Only Applies To numbers.','contexts':contexts,'excludedPositions':sorted(set(exclusions)),'unreviewedPages':missing,'observations':observations}
 result=inventory_counts(supplement_gap_pages(result,legacy))
 (output/'catalog-applicability-review.json').write_text(json.dumps(result,indent=2)+'\n')
 if missing:raise ValueError(str(len(missing))+' pages lack matching retained evidence; release remains gated')
 return result
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--legacy-parser',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True);a=parser.parse_args();r=audit(a.legacy_parser,a.output_dir);print(len(r['excludedPositions']),'positions quarantined; no hosted data changed')
