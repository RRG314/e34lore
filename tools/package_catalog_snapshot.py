#!/usr/bin/env python3
"""Package owned ordering facts reproducibly; raw source HTML is never included."""
import argparse,gzip,hashlib,json
from pathlib import Path
from generate_catalog_import import model_context

def package(facts_dir,output):
 manifest=json.loads((facts_dir/'manifest.json').read_text());raw=(facts_dir/'assemblies.jsonl').read_bytes()
 if hashlib.sha256(raw).hexdigest()!=manifest['facts_sha256']:raise ValueError('Normalized fact snapshot hash mismatch')
 # Validate the normalized contract again before a durable backup.
 pages=[json.loads(line) for line in raw.splitlines() if line.strip()]
 if len(pages)!=manifest['successful_pages'] or any(page['context']!=manifest['context'] for page in pages):raise ValueError('Snapshot source scope/count mismatch')
 payload=gzip.compress(raw,mtime=0);context=model_context(manifest);filename=context['id']+'.jsonl.gz';output.mkdir(parents=True,exist_ok=True)
 (output/filename).write_bytes(payload)
 receipt={'schema_version':1,'file':filename,'compressed_sha256':hashlib.sha256(payload).hexdigest(),'manifest':manifest}
 target=output/(context['id']+'.manifest.json');target.write_text(json.dumps(receipt,indent=2)+'\n');return target

def unpack(receipt_file,output):
 receipt=json.loads(receipt_file.read_text());filename=receipt['file']
 if Path(filename).name!=filename:raise ValueError('Snapshot filename must be local')
 payload=(receipt_file.parent/filename).read_bytes()
 if hashlib.sha256(payload).hexdigest()!=receipt['compressed_sha256']:raise ValueError('Compressed fact snapshot hash mismatch')
 raw=gzip.decompress(payload);manifest=receipt['manifest']
 if hashlib.sha256(raw).hexdigest()!=manifest['facts_sha256']:raise ValueError('Normalized fact snapshot hash mismatch')
 output.mkdir(parents=True,exist_ok=True);(output/'assemblies.jsonl').write_bytes(raw);(output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

def main():
 p=argparse.ArgumentParser(description=__doc__);source=p.add_mutually_exclusive_group(required=True);source.add_argument('--facts-dir',type=Path);source.add_argument('--unpack',type=Path);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
 if 'public' in a.output_dir.resolve().parts:p.error('Catalog backups are not website assets')
 if a.unpack:unpack(a.unpack,a.output_dir);print('Verified fact snapshot restored.')
 else:print(package(a.facts_dir,a.output_dir))
if __name__=='__main__':main()
