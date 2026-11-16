#!/usr/bin/env python3
"""Register an E34 model/year/body index only after observing its public root link and H1."""
import argparse, gzip, hashlib, json, re, time, urllib.parse, urllib.request, urllib.robotparser
from html.parser import HTMLParser
from pathlib import Path
from import_public_catalog import HOST, UA

class IndexLinks(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.anchor=None; self.label=[]; self.h1=False; self.heading=[]
    def handle_starttag(self,tag,attrs):
        if tag=='a': self.anchor=dict(attrs).get('href'); self.label=[]
        if tag=='h1': self.h1=True
    def handle_data(self,value):
        if self.anchor: self.label.append(value)
        if self.h1: self.heading.append(value)
    def handle_endtag(self,tag):
        if tag=='a' and self.anchor: self.links.append((self.anchor,' '.join(' '.join(self.label).split()))); self.anchor=None
        if tag=='h1': self.h1=False

def observed_inventory(model,year,body,root_html,index_html,url,platform="E34"):
    if platform not in ("E34","E30"): raise ValueError("Unsupported generation")
    root=IndexLinks(); root.feed(root_html)
    if url not in [urllib.parse.urljoin('https://'+HOST,h) for h,_ in root.links]: raise ValueError('The model root does not advertise this exact selection')
    return verified_index_inventory(model,year,body,index_html,url,platform)

def verified_index_inventory(model,year,body,index_html,url,platform):
    page=IndexLinks(); page.feed(index_html); heading=' '.join(' '.join(page.heading).split())
    if not re.fullmatch(fr'{year} BMW {re.escape(model)} {re.escape(body)}\({platform}\) Parts',heading,re.I): raise ValueError('Index heading does not verify the requested chassis selection')
    prefix=f'/parts-list/{year}-bmw-{model.lower()}-{body.lower()}_{platform.lower()}/'
    routes={}
    for href,title in page.links:
        link=urllib.parse.urljoin('https://'+HOST,href); parsed=urllib.parse.urlsplit(link)
        if parsed.scheme!='https' or parsed.hostname!=HOST or parsed.query or not parsed.path.startswith(prefix) or not parsed.path.endswith('.html'): continue
        segments=parsed.path[len(prefix):].split('/')
        if len(segments)!=2:continue
        routes[link]={'url':link,'title':title,'categorySlug':segments[0],'leafSlug':segments[1][:-5],'status':'discovered','fetched':False}
    if len(routes)<100:raise ValueError('The source index is unexpectedly incomplete')
    return {'schemaVersion':1,'source':'BMWPartsDeal','sourceUrl':url,'sourceHttpStatus':200,'sourceModelRoot':f'https://{HOST}/bmw-{model.lower()}-parts.html','sourceHtmlSha256':hashlib.sha256(index_html.encode()).hexdigest(),'heading':heading,'context':{'platform':platform,'model':model,'modelYear':year,'body':body,'engine':None,'market':None,'contextEvidence':'Observed model-root link plus index H1; marketing prose excluded.'},'routeCount':len(routes),'leafFetchesPerformed':0,'routes':[routes[k] for k in sorted(routes)]}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--platform',choices=['E34','E30'],default='E34');p.add_argument('--model',choices=['518i','520i','525i','530i','535i','540i','m5','316','316i','318i','318is','320i','320is','323i','324d','324td','325','325e','325i','325ix','m3'],required=True);p.add_argument('--year',type=int,choices=range(1982,1998),required=True);p.add_argument('--body',choices=['Sedan','Wagon','Coupe','Convertible'],required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--cache',type=Path,required=True);a=p.parse_args()
    if {'public','src'} & set(a.cache.resolve().parts):p.error('Raw HTML must stay outside published source/assets')
    robots=urllib.robotparser.RobotFileParser('https://'+HOST+'/robots.txt')
    with urllib.request.urlopen(urllib.request.Request(robots.url,headers={'User-Agent':UA}),timeout=25)as r:robots.parse(r.read().decode().splitlines())
    def fetch(url):
        if not robots.can_fetch(UA,url):raise ValueError('Robots rules disallow this index')
        time.sleep(max(1,robots.crawl_delay(UA)or 0))
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=25)as r:
            if r.url!=url:raise ValueError('Unexpected index redirect')
            raw=r.read(4000000)
            if len(raw)>=4000000:raise ValueError('Oversized index')
        a.cache.mkdir(parents=True,exist_ok=True);(a.cache/(hashlib.sha256(url.encode()).hexdigest()+'.html.gz')).write_bytes(gzip.compress(raw));return raw.decode()
    root=fetch(f'https://{HOST}/bmw-{a.model}-parts.html')
    url=f'https://{HOST}/{a.year}-bmw-{a.model}-{a.body.lower()}_{a.platform.lower()}-parts.html'
    links=IndexLinks();links.feed(root)
    if url not in [urllib.parse.urljoin('https://'+HOST,h)for h,_ in links.links]:raise ValueError('No observed root link for this selection')
    inventory=observed_inventory(a.model,a.year,a.body,root,fetch(url),url,a.platform)
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(inventory,indent=2)+'\n');print(json.dumps({'inventory':str(a.output),'pages':inventory['routeCount'],'heading':inventory['heading']}))
if __name__=='__main__':main()
