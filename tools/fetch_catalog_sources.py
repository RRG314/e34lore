#!/usr/bin/env python3
"""Fetch observed public E34 source pages, with bounded concurrency and one shared rate limit."""
import argparse,concurrent.futures,gzip,hashlib,json,threading,time,urllib.request,urllib.robotparser
from pathlib import Path
from import_public_catalog import HOST,UA,allowed_url,parse_page,source_prefix

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--inventory',type=Path,required=True);p.add_argument('--cache-dir',type=Path,required=True);p.add_argument('--workers',type=int,default=3);p.add_argument('--delay',type=float,default=1);a=p.parse_args()
 if a.workers<1 or a.workers>3 or a.delay<.5:p.error('Use1–3 workers and at least0.5 seconds between requests')
 if 'public' in a.cache_dir.resolve().parts or 'src' in a.cache_dir.resolve().parts:p.error('Raw source snapshots cannot be public assets')
 a.cache_dir.mkdir(parents=True,exist_ok=True);inventory=json.loads(a.inventory.read_text());context=inventory['context'];routes=inventory['routes'];prefix=source_prefix(inventory);lock=threading.Lock();last=[0.];stopped=threading.Event()
 robots=urllib.robotparser.RobotFileParser('https://'+HOST+'/robots.txt')
 with urllib.request.urlopen(urllib.request.Request(robots.url,headers={'User-Agent':UA}),timeout=25) as response:robots.parse(response.read().decode().splitlines())
 def fetch(route):
  url=route['url'];key=hashlib.sha256(url.encode()).hexdigest();cache=a.cache_dir/(key+'.html.gz')
  if not allowed_url(url,context,prefix) or not robots.can_fetch(UA,url):raise ValueError('Source route is outside the allowed E34 context')
  if cache.exists():return 'cached'
  with lock:
   if stopped.is_set():return 'stopped'
   pause=a.delay-(time.monotonic()-last[0])
   if pause>0:time.sleep(pause)
   last[0]=time.monotonic()
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=25) as response:
   if not allowed_url(response.url,context,prefix):raise ValueError('Source redirected outside the observed E34 context')
   raw=response.read(4000000)
   if len(raw)>=4000000:raise ValueError('Oversized source page')
  parse_page(raw.decode('utf-8'),url,context)
  cache.write_bytes(gzip.compress(raw));return 'fetched'
 counts={'cached':0,'fetched':0,'stopped':0,'errors':[]};consecutive=0
 with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as pool:
  futures={pool.submit(fetch,r):r for r in routes}
  for index,future in enumerate(concurrent.futures.as_completed(futures),1):
   try:status=future.result();counts[status]+=1;consecutive=0
   except Exception as error:
    counts['errors'].append({'url':futures[future]['url'],'error':str(error)[:300]});consecutive+=1
    if consecutive>=3:stopped.set()
   if index%20==0:print(json.dumps({'processed':index,'total':len(routes),**{k:v for k,v in counts.items() if k!='errors'},'errors':len(counts['errors'])}),flush=True)
   (a.cache_dir/'fetch-status.json').write_text(json.dumps(counts,indent=2)+'\n')
 print(json.dumps(counts),flush=True)
if __name__=='__main__':main()
