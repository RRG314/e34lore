#!/usr/bin/env python3
"""Generate reviewable, transactional PostgreSQL batches from normalized E34 facts."""
import argparse,hashlib,json,re
from pathlib import Path

# A legacy snapshot can contain reviewed applicability children. Retain the
# original source file, but never generate an ordering/replacement row for them.
QUARANTINED_POSITIONS=frozenset(json.loads((Path(__file__).resolve().parents[1]/'data/catalog-position-exclusions.json').read_text())['excludedPositions'])

def sql(value):return 'null' if value is None else "'"+str(value).replace("'","''")+"'"
def js(value):return sql(json.dumps(value,ensure_ascii=False,separators=(',',':')))+'::jsonb'
def stable(prefix,value):return prefix+'-'+hashlib.sha256(value.encode()).hexdigest()[:24]
def model_context(manifest):
 context=manifest['context'];display_model={'m5':'M5','m3':'M3','325ix':'325iX'}.get(context['model'].lower(),context['model']);raw=context['body'];body='Touring' if raw=='Wagon' else raw
 model_id='e30-'+display_model.lower() if context.get('platform')=='E30' else display_model
 return {'id':stable(context.get('platform','E34').lower()+'-context',json.dumps(context,sort_keys=True)),'name':f"{context['modelYear']} {display_model}"+(f" {body}" if body else ' · body unspecified')+(f" · {context['engine']}" if context.get('engine') else ''),'model_id':model_id,'model_year':context['modelYear'],'body':body,'engine':context.get('engine'),'market':context.get('market'),'selection':context}

def assembly_sql(page,context):
 assembly=stable('catalog-assembly',page['source_url']);source=stable('catalog-source',page['source_url'])
 statements=["insert into public.sources(id,title,publisher,url,rights,coverage,review_status) values("+','.join([sql(source),sql(page['title']),sql('BMWPartsDeal public catalog'),sql(page['source_url']),sql('Factual ordering observations; artwork permissions tracked independently'),js({'context':page['context'],'source_vehicle_label':page['source_vehicle_label'],'unselected_options':page['unselected_options'],'source_sha256':page['source_sha256']}),sql('catalog-observed')])+") on conflict(id) do update set coverage=excluded.coverage;",
 "insert into public.assemblies(id,title,source_id,source_locator,boundary,catalog_context_id,source_category,catalog_status) values("+','.join([sql(assembly),sql(page['title']),sql(source),sql(page['source_url']),sql('Source selection: '+page['source_vehicle_label']+'. Unselected options: '+(page['unselected_options'] or 'not stated')+'. Position candidates retain production/equipment restrictions; no VIN-specific fitment is asserted.'),sql(context['id']),sql(page['category']),sql('source-listed')])+") on conflict(id) do update set title=excluded.title,boundary=excluded.boundary,source_category=excluded.source_category;"]
 rows=[row for row in page['parts'] if assembly+'-'+row['record_hash'][:24] not in QUARANTINED_POSITIONS]
 for row in rows:
  if not re.fullmatch(r'\d{11}',row['number']):raise ValueError('Invalid canonical OEM identity')
  if len(row['conditions'])>40:raise ValueError('Too many source conditions')
 if rows:
  encoded=js(rows)
  record="jsonb_to_recordset("+encoded+") as r(number text,reference text,name text,source_description text,quantity integer,package_quantity integer,conditions jsonb,replaced_by jsonb,record_hash text)"
  statements.append("insert into public.parts(id,assembly_id,name,number_normalized,source_id,source_locator,review_status,detail) select distinct on(r.number) 'bmw-'||r.number,"+sql(assembly)+",r.name,r.number,"+sql(source)+",r.reference,'catalog-listed',jsonb_build_object('source_import',true,'source_url',"+sql(page['source_url'])+") from "+record+" where true order by r.number,r.name on conflict(number_normalized) do update set name=excluded.name,assembly_id=excluded.assembly_id,source_id=excluded.source_id,source_locator=excluded.source_locator,detail=(public.parts.detail-'description_not_established')||excluded.detail where public.parts.detail->>'description_not_established'='true';")
  replacements=sorted({number for row in rows for number in row['replaced_by']})
  if replacements:
   statements.append("insert into public.parts(id,assembly_id,name,number_normalized,source_id,source_locator,review_status,detail) select 'bmw-'||n.number,"+sql(assembly)+",'BMW part '||n.number,n.number,"+sql(source)+",'Source-listed replacement','catalog-listed',jsonb_build_object('source_import',true,'description_not_established',true) from jsonb_array_elements_text("+js(replacements)+") as n(number) where true on conflict(number_normalized) do nothing;")
  statements.append("update public.part_assembly_positions set active=false where assembly_id="+sql(assembly)+" and active;")
  statements.append("insert into public.part_assembly_positions(id,assembly_id,part_id,context_id,reference,source_name,required_quantity,package_quantity,conditions,source_url,source_sha256,record_sha256) select "+sql(assembly+'-')+"||substr(r.record_hash,1,24),"+sql(assembly)+",p.id,"+sql(context['id'])+",r.reference,r.name,r.quantity,r.package_quantity,r.conditions,"+sql(page['source_url'])+","+sql(page['source_sha256'])+",r.record_hash from "+record+" join public.parts p on p.number_normalized=r.number on conflict(id) do update set active=true,last_seen_at=now(),source_sha256=excluded.source_sha256,record_sha256=excluded.record_sha256,conditions=excluded.conditions,source_name=excluded.source_name,required_quantity=excluded.required_quantity,package_quantity=excluded.package_quantity;")
  for row in rows:
   position=assembly+'-'+row['record_hash'][:24]
   for replacement in row['replaced_by']:
    if not re.fullmatch(r'\d{11}',replacement):raise ValueError('Invalid replacement identity')
    sid=stable('replacement',position+':'+replacement)
    statements.append("insert into public.part_supersessions(id,previous_part_id,replacement_part_id,position_id,source_id,conditions) select "+sql(sid)+",p.id,n.id,"+sql(position)+","+sql(source)+","+js(row['conditions'])+" from public.parts p,public.parts n where p.number_normalized="+sql(row['number'])+" and n.number_normalized="+sql(replacement)+" on conflict(id) do nothing;")
 for drawing in page['drawings']:
  did=stable('catalog-drawing',assembly+':'+drawing['source_id'])
  statements.append("insert into public.technical_drawings(id,assembly_id,source_id,remote_url,credit,applicability,rights_status,coordinate_space,hotspots,source_label) values("+','.join([sql(did),sql(assembly),sql(source),sql(drawing['image_url']),sql('BMW catalog illustration · source: BMWPartsDeal'),sql((drawing.get('scope') or '')+' Source-selected diagram; consult position conditions.'),sql('external-source-artwork-unconfirmed'),sql('percent'),js(drawing['hotspots']),sql(drawing['name'] or page['title'])])+") on conflict(id) do update set remote_url=excluded.remote_url,hotspots=excluded.hotspots,applicability=excluded.applicability,source_label=excluded.source_label;")
 return '\n'.join(statements)+'\n'

def generate(facts,manifest,inventory,output,max_chars=350000):
 context=model_context(manifest);output.mkdir(parents=True,exist_ok=True)
 setup="begin;\nset local standard_conforming_strings=on;\ninsert into public.vehicle_catalog_contexts(id,name,model_id,model_year,body,engine,market,source_index_url,selection,expected_pages,scope) values("+','.join([sql(context['id']),sql(context['name']),sql(context['model_id']),str(context['model_year']),sql(context['body']),sql(context['engine']),sql(context['market']),sql(inventory['sourceUrl']),js(context['selection']),str(manifest['expected_pages']),sql(manifest['scope'])])+") on conflict(id) do update set expected_pages=excluded.expected_pages,selection=excluded.selection,last_checked_at=now();\ncommit;\n"
 (output/'000-setup.sql').write_text(setup)
 chunk=[];size=0;index=1;pages=0
 def save():
  nonlocal index,chunk,size
  (output/f'{index:03d}-assemblies.sql').write_text("begin;\nset local standard_conforming_strings=on;\n"+''.join(chunk)+'commit;\n');index+=1;chunk=[];size=0
 for line in facts.read_text().splitlines():
  if not line.strip():continue
  page=json.loads(line)
  if page['context']!=manifest['context']:raise ValueError('Mixed catalog contexts in import batch')
  statement=assembly_sql(page,context)
  if chunk and size+len(statement)>max_chars:save()
  chunk.append(statement);size+=len(statement);pages+=1
 if chunk:save()
 run=stable('catalog-run',manifest['facts_sha256'])
 final="begin;\nupdate public.vehicle_catalog_contexts set imported_pages=(select count(*) from public.assemblies where catalog_context_id="+sql(context['id'])+"),import_status="+sql(manifest['status'])+",last_checked_at=now() where id="+sql(context['id'])+";\ninsert into e34_private.catalog_import_runs(id,context_id,source_manifest_sha256,counts) values("+','.join([sql(run),sql(context['id']),sql(hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest()),js({k:manifest[k] for k in ['expected_pages','successful_pages','parts','drawings','rejected_records','errors']})])+") on conflict(id) do nothing;\ncommit;\n"
 # SQL status is a clear source-index completion claim, never universal fitment.
 if manifest['status'] not in ['partial','source-index-imported']:raise ValueError('Invalid import state')
 (output/'999-finalize.sql').write_text(final)
 summary={'context':context,'assembly_pages':pages,'batches':index-1,'facts_sha256':manifest['facts_sha256'],'files':['000-setup.sql']+[f'{i:03d}-assemblies.sql' for i in range(1,index)]+['999-finalize.sql']}
 (output/'load-plan.json').write_text(json.dumps(summary,indent=2)+'\n');return summary

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--facts-dir',type=Path,required=True);p.add_argument('--inventory',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
 if 'public' in a.output_dir.resolve().parts:p.error('SQL load batches are not public assets')
 manifest=json.loads((a.facts_dir/'manifest.json').read_text());facts=a.facts_dir/'assemblies.jsonl'
 if hashlib.sha256(facts.read_bytes()).hexdigest()!=manifest['facts_sha256']:raise ValueError('Fact file hash does not match manifest')
 summary=generate(facts,manifest,json.loads(a.inventory.read_text()),a.output_dir);print(json.dumps({k:summary[k] for k in ['assembly_pages','batches','facts_sha256']}))
if __name__=='__main__':main()
