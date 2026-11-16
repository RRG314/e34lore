#!/usr/bin/env python3
"""Compile explicit BMW identifiers from a hash-verified E34 data archive.
Imports no illustrations, executable code, vehicle fitment or inferred identifiers.
"""
import argparse,collections,hashlib,json,re,zipfile
from pathlib import Path
from generate_catalog_import import sql,js
from import_public_catalog import text

def compile_identities(tree):
 if tree.get('chassis')!='E34':raise ValueError('Only the E34 archive is accepted')
 variants=tree['variants'];records={};rejected=[]
 if not isinstance(variants,list) or len(variants)>1000:raise ValueError('Invalid source variant inventory')
 for group in tree['groups']:
  for diagram in group['diagrams']:
   key=diagram['btnr']
   if not re.fullmatch(r'\d{2}_\d{4}',key):raise ValueError('Invalid source diagram identifier')
   for row in diagram['parts']:
    prefix=row.get('pre');suffix=row.get('sachnr')
    if not isinstance(prefix,str) or not isinstance(suffix,str) or not re.fullmatch(r'\d{4}',prefix) or not re.fullmatch(r'\d{7}',suffix):
     rejected.append({'diagram':key,'reference':row.get('pos'),'reason':'No explicit four-digit prefix and seven-digit suffix'});continue
    number=prefix+suffix;name=text(row.get('name'),240)
    if not name:raise ValueError('Explicit identifier has no source description')
    fit=row.get('fit')
    if not isinstance(fit,list) or any(type(i)!=int or i<0 or i>=len(variants) for i in fit):raise ValueError('Invalid source candidate variant index')
    item=records.setdefault(number,{'number':number,'name':name,'diagrams':{},'source_candidate_type_codes':set(),'source_rows':0})
    item['source_rows']+=1
    item['diagrams'][key]={'key':key,'name':text(diagram['name'],240),'group':text(group['name'],160)}
    item['source_candidate_type_codes'].update(variants[i]['key'] for i in fit)
 return [{**r,'diagrams':sorted(r['diagrams'].values(),key=lambda x:x['key']),'source_candidate_type_codes':sorted(r['source_candidate_type_codes'])} for _,r in sorted(records.items())],rejected

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--archive',type=Path,required=True);p.add_argument('--provenance',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
 if 'public' in a.output_dir.resolve().parts:p.error('Import batches are not public website assets')
 provenance=json.loads(a.provenance.read_text());revision=provenance['revision']
 if revision!='16a2ec76850fd70d24a6376aadfe179f310008b9':raise ValueError('Review the new export and register a new immutable source ID before changing the pinned revision')
 registered=next(f for f in provenance['files'] if f['file']=='E34.etk');archive_hash=hashlib.sha256(a.archive.read_bytes()).hexdigest()
 if archive_hash!=registered['sha256'] or archive_hash!='ef3a8ea9b7072d1c7a15ef9e08b4dba30bb4a7894ebd36a0c3db34be64917228':raise ValueError('Source archive hash mismatch')
 source_url='https://huggingface.co/datasets/CraigFf/bmweb-etk/resolve/'+revision+'/E34.etk'
 if registered['sourceUrl']!=source_url:raise ValueError('Source URL does not match the immutable revision')
 with zipfile.ZipFile(a.archive) as archive:
  files=archive.infolist()
  if len(files)>5000 or sum(f.file_size for f in files)>250_000_000 or any(f.filename!='tree.json' and not re.fullmatch(r'img/[A-Za-z0-9_-]+[.](png|jpg|jpeg)',f.filename) for f in files):raise ValueError('Unexpected archive layout or size')
  info=archive.getinfo('tree.json')
  if info.file_size>100_000_000:raise ValueError('Oversized source tree')
  tree=json.loads(archive.read(info))
 records,rejected=compile_identities(tree);a.output_dir.mkdir(parents=True,exist_ok=True)
 facts=''.join(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n' for row in records);(a.output_dir/'identities.jsonl').write_text(facts)
 scope='Factual identity index only. Source vehicle associations and omitted option tables do not establish physical fitment. Ordering conditions and archive illustrations are not imported by this job.'
 manifest={'schema_version':1,'source_url':source_url,'source_revision':revision,'archive_sha256':archive_hash,'facts_sha256':hashlib.sha256(facts.encode()).hexdigest(),'identities':len(records),'accepted_source_rows':sum(r['source_rows'] for r in records),'rejected':rejected,'scope':scope,'artwork_imported':False,'fitment_imported':False}
 (a.output_dir/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 source='e34-archive-identity-index';assembly='e34-archive-identity-index'
 setup="begin;\nset local standard_conforming_strings=on;\ninsert into public.sources(id,title,publisher,url,rights,coverage,review_status) values("+','.join([sql(source),sql('Archived E34 part-number index'),sql('Community ETK data export · CraigFf/bmweb-etk'),sql(source_url),sql('Factual identifiers/descriptive part names compiled independently; archive artwork excluded; no artwork license asserted'),js(manifest),sql('archive-identity-observed')])+") on conflict(id) do update set coverage=excluded.coverage;\ninsert into public.assemblies(id,title,source_id,source_locator,boundary) values("+','.join([sql(assembly),sql('E34 archive identity index'),sql(source),sql('tree.json · explicit pre + sachnr identifiers'),sql(scope)])+") on conflict(id) do nothing;\ncommit;\n"
 (a.output_dir/'000-setup.sql').write_text(setup);files=['000-setup.sql']
 for start in range(0,len(records),200):
  values=[]
  for r in records[start:start+200]:
   evidence={'source_url':source_url,'source_id':source,'revision':revision,'archive_sha256':archive_hash,'source_diagram_count':len(r['diagrams']),'diagram_references':r['diagrams'],'source_candidate_type_codes':r['source_candidate_type_codes'],'source_rows':r['source_rows'],'scope':scope}
   values.append({'number':r['number'],'name':r['name'],'detail':{'archive_evidence':evidence}})
  query="begin;\nset local standard_conforming_strings=on;\ninsert into public.parts(id,assembly_id,name,number_normalized,source_id,source_locator,review_status,detail) select 'bmw-'||r.number,"+sql(assembly)+",r.name,r.number,"+sql(source)+",'Explicit archived identifier','reference-only',r.detail from jsonb_to_recordset("+js(values)+") as r(number text,name text,detail jsonb) where true on conflict(number_normalized) do update set name=case when public.parts.detail->>'description_not_established'='true' then excluded.name else public.parts.name end,detail=(public.parts.detail-'description_not_established')||jsonb_build_object('archive_evidence',excluded.detail->'archive_evidence');\ncommit;\n"
  filename=f'{start//200+1:03d}-identities.sql';(a.output_dir/filename).write_text(query);files.append(filename)
 (a.output_dir/'load-plan.json').write_text(json.dumps({'files':files,'identities':len(records),'scope':scope,'facts_sha256':manifest['facts_sha256']},indent=2)+'\n');print(json.dumps({k:manifest[k] for k in ['identities','accepted_source_rows','rejected','artwork_imported','fitment_imported']}))
if __name__=='__main__':main()
