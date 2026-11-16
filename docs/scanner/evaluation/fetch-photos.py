"""Reproduce the licensed, hash-checked local evaluation corpus. No site/backend writes."""
import hashlib, json, pathlib, sys, urllib.request, urllib.parse, time
here=pathlib.Path(__file__).parent
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else here.parents[2]/'work/scanner-evaluation').resolve()
root.mkdir(parents=True,exist_ok=True)
manifest=json.loads((here/'source-manifest.json').read_text())
for kind,key in [('reference','reference_records'),('query','query_records')]:
 for row in manifest[key]:
  rel=('reference-photos/' if kind=='reference' else '')+row['file'];target=(root/rel).resolve()
  if not target.is_relative_to(root): raise ValueError('Unsafe fixture path')
  if urllib.parse.urlparse(row['download_url']).hostname not in ('upload.wikimedia.org','thumb.wikimedia.org'): raise ValueError('Unapproved source host')
  if not (row['creator'] and row['license'] and row['source_url']): raise ValueError('Missing provenance')
  target.parent.mkdir(parents=True,exist_ok=True)
  if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==row['sha256']:continue
  for attempt in range(4):
   try:
    data=urllib.request.urlopen(urllib.request.Request(row['download_url'],headers={'User-Agent':'E34LoreResearch/1.0 (offline evaluation)'}),timeout=45).read();break
   except Exception:
    if attempt==3:raise
    time.sleep(5*(attempt+1))
  if hashlib.sha256(data).hexdigest()!=row['sha256']: raise ValueError('Source changed; review licensing/version before replacing '+row['id'])
  target.write_bytes(data);print('Downloaded',row['id']);time.sleep(1)
(root/'manifest.json').write_text(json.dumps({'schema':1,'purpose':manifest['scope'],'records':manifest['query_records']},indent=2))
(root/'reference-photos/manifest.json').write_text(json.dumps({'schema':1,'purpose':manifest['scope'],'records':manifest['reference_records']},indent=2))
print('Verified',len(manifest['reference_records'])+len(manifest['query_records']),'licensed photo hashes')
