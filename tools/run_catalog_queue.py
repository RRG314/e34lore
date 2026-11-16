#!/usr/bin/env python3
"""Resume the explicitly registered E34 source contexts without subscription APIs."""
import argparse,json,subprocess,sys
from pathlib import Path

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--inventory',type=Path,required=True);parser.add_argument('--work-dir',type=Path,required=True);args=parser.parse_args()
 aggregate=json.loads(args.inventory.read_text());indexes=aggregate['sources'][0]['indexInventories']
 order={'m5':0,'540i':1,'535i':2,'530i':3,'525i':4};indexes=sorted(indexes,key=lambda x:(order.get(x['context']['model'].lower(),9),x['context']['modelYear'],str(x['context']['body'])))
 args.work_dir.mkdir(parents=True,exist_ok=True);status={'queued':len(indexes),'completed':[],'errors':[]}
 for entry in indexes:
  inventory=Path(entry['inventoryFile']);inventory=inventory if inventory.is_absolute() else args.inventory.parent/inventory
  label=inventory.stem.removesuffix('-route-inventory');cache=args.work_dir/'cache'/label;facts=args.work_dir/'facts'/label;load=args.work_dir/'sql'/label
  print('SOURCE CONTEXT '+label,flush=True)
  fetch=subprocess.run([sys.executable,str(Path(__file__).with_name('fetch_catalog_sources.py')),'--inventory',str(inventory),'--cache-dir',str(cache),'--workers','3','--delay','1'])
  if fetch.returncode!=0:status['errors'].append({'context':label,'stage':'fetch','code':fetch.returncode})
  parse=subprocess.run([sys.executable,str(Path(__file__).with_name('import_public_catalog.py')),'--inventory',str(inventory),'--cache-dir',str(cache),'--output-dir',str(facts),'--offline'])
  if parse.returncode==0:
   generate=subprocess.run([sys.executable,str(Path(__file__).with_name('generate_catalog_import.py')),'--facts-dir',str(facts),'--inventory',str(inventory),'--output-dir',str(load)])
   if generate.returncode==0:status['completed'].append({'context':label,'facts':str(facts),'loadPlan':str(load/'load-plan.json')})
   else:status['errors'].append({'context':label,'stage':'sql-generation'})
  else:status['errors'].append({'context':label,'stage':'fact-validation'})
  (args.work_dir/'queue-status.json').write_text(json.dumps(status,indent=2)+'\n')
 print(json.dumps(status),flush=True)
if __name__=='__main__':main()
