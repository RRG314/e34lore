#!/usr/bin/env python3
"""Compile public E34 ordering facts into an owned, source-addressed catalog.
Never executes source scripts, calls private APIs, copies prices or imports user state.
"""
from __future__ import annotations
import argparse, datetime as dt, gzip, hashlib, json, re, time, urllib.request, urllib.parse, urllib.robotparser
from pathlib import Path
from html import unescape

HOST='www.bmwpartsdeal.com'
UA='E34CollectiveReferenceImport/0.1'

def text(value, limit=1200):
    if not isinstance(value,(str,int,float)): return ''
    return re.sub(r'\s+',' ',unescape(re.sub(r'<[^>]*>',' ',str(value)))).strip()[:limit]

def initial_store(html):
    marker='window.__INITIAL_STORE__'
    if marker not in html: raise ValueError('No public catalog state found')
    literal=html.split(marker,1)[1].lstrip()
    if not literal.startswith('='): raise ValueError('Malformed catalog state assignment')
    literal=literal[1:].split('</script>',1)[0].strip().removesuffix(';').strip()
    # Preserve quoted strings verbatim, replace only the bare JS undefined literal.
    literal=re.sub(r'"(?:\\.|[^"\\])*"|\bundefined\b',lambda m:'null' if m.group(0)=='undefined' else m.group(0),literal)
    result=json.loads(literal)
    if not isinstance(result,dict): raise ValueError('Catalog state must be an object')
    return result

def identifier(value):
    number=re.sub(r'[\s-]','',str(value or ''))
    return number if re.fullmatch(r'\d{11}',number) else None

def source_image(value):
    if not isinstance(value,str): return None
    url=urllib.parse.urljoin('https://'+HOST,value)
    parsed=urllib.parse.urlsplit(url)
    if parsed.scheme!='https' or parsed.hostname!=HOST or parsed.username or parsed.password: return None
    if not parsed.path.startswith('/resources/encry/diagram/') or not parsed.path.endswith(('.png','.jpg','.jpeg')): return None
    return url

def position_ref(value):
    ref=text(value,40)
    return ref.zfill(2) if ref.isdigit() else ref

def percent(value):
    if not isinstance(value,str) or not re.fullmatch(r'\d+(?:\.\d+)?%',value): raise ValueError('Invalid hotspot percentage')
    number=float(value[:-1])
    if number<0 or number>100: raise ValueError('Out-of-bounds hotspot')
    return number

def flatten_parts(value):
    if isinstance(value,list):
        for child in value: yield from flatten_parts(child)
    elif isinstance(value,dict) and ('partNumberAbbr' in value or 'partNumber' in value): yield value

def replacement_numbers(item):
    values=[]
    # replaceOE associates an applicability child with its parent; it is not a supersession.
    for key in ['replace']:
        value=item.get(key)
        if isinstance(value,dict):
            for name in ['partNumber','partNumberAbbr','number','article']:
                number=identifier(value.get(name))
                if number:values.append(number)
            value=json.dumps(value,ensure_ascii=False)
        if isinstance(value,str): values.extend(re.findall(r'(?<!\d)\d{11}(?!\d)',value))
    for fact in item.get('allExtraInfoList') or []:
        if isinstance(fact,dict) and text(fact.get('name')).lower() in ['replaced by','replaced by:']:
            values.extend(re.findall(r'(?<!\d)\d{11}(?!\d)',text(fact.get('desc'))))
    return sorted(set(values))

def parse_page(html,url,context):
    root=initial_store(html)
    data=root.get('partList')
    if not isinstance(data,dict) or not isinstance(data.get('partList'),list):raise ValueError('Catalog fact table is missing')
    vehicle=data.get('cartVehicle') or {}
    label=text(vehicle.get('vehicleInfo') or data.get('requiredInfo'),300)
    if context.get('platform') not in ('E34','E30'):raise ValueError('Unsupported generation')
    if label and context['platform'] not in label:raise ValueError('Source selected a different chassis')
    if label and str(context['modelYear']) not in label:raise ValueError('Source model-year selection changed')
    if label and not re.search(r'\b'+re.escape(context['model'])+r'\b',label,re.I):raise ValueError('Source model selection changed')
    rows=[];rejected=[]
    for item in flatten_parts(data['partList']):
        if item.get('codeEmpty') is True and not text(item.get('pncCode')) and identifier(item.get('replaceOE')):
            rejected.append({'reason':'Applicability reference, not a drawing position','number':identifier(item.get('partNumberAbbr') or item.get('partNumber')),'applies_to':identifier(item.get('replaceOE'))})
            continue
        number=identifier(item.get('partNumberAbbr') or item.get('partNumber'))
        if not number:
            rejected.append({'reason':'Nonstandard or absent OEM identifier','reference':text(item.get('code'),40)})
            continue
        facts=[{'name':text(x.get('name'),100),'value':text(x.get('desc'),2000)} for x in (item.get('allExtraInfoList') or []) if isinstance(x,dict) and text(x.get('name'))]
        quantities={x['name'].lower():x['value'] for x in facts}
        qty=quantities.get('require quantity')
        qty=int(qty) if qty and re.fullmatch(r'\d{1,5}',qty) else None
        pack=quantities.get('package quantity')
        pack=int(pack) if pack and re.fullmatch(r'\d{1,5}',pack) else None
        row={'number':number,'reference':position_ref(item.get('code') or item.get('pncCode')),'name':text(item.get('mainDesc') or item.get('pncDesc') or 'BMW part '+number,240),'source_description':text(item.get('pncDesc'),240),'quantity':qty,'package_quantity':pack,'conditions':facts,'replaced_by':[n for n in replacement_numbers(item) if n!=number]}
        stable=json.dumps(row,sort_keys=True,ensure_ascii=False,separators=(',',':'))
        row['record_hash']=hashlib.sha256(stable.encode()).hexdigest()
        if not any(old['record_hash']==row['record_hash'] for old in rows):rows.append(row)
    drawings=[]
    for drawing in data.get('diagramList') or []:
        image=source_image(drawing.get('largeImg')) or source_image(drawing.get('img'))
        if not image:continue
        hotspots=[]
        for spot in drawing.get('hotSpotList') or []:
            try:
                rect={key:percent(spot[key]) for key in ['left','top','width','height']}
                if rect['left']+rect['width']>100.5 or rect['top']+rect['height']>100.5:raise ValueError('Hotspot extends outside drawing')
                hotspots.append({'reference':position_ref(spot.get('code')),**rect})
            except (KeyError,ValueError,TypeError):continue
        drawings.append({'source_id':text(drawing.get('id'),100),'name':text(drawing.get('name'),240),'image_url':image,'hotspots':hotspots,'scope':text(drawing.get('fitVehicle') or drawing.get('desc'),1000),'rights_status':'external-source-artwork-unconfirmed'})
    return {'source_url':url,'source_sha256':hashlib.sha256(html.encode()).hexdigest(),'source_vehicle_label':label,'unselected_options':text(vehicle.get('unSelectedOptions'),500),'context':context,'category':text(data.get('category'),160),'title':text(data.get('subCategory'),240),'source_conditions':text(data.get('options'),1000),'parts':rows,'drawings':drawings,'rejected_records':rejected}

def source_prefix(inventory):
    path=urllib.parse.urlsplit(inventory["routes"][0]["url"]).path
    prefix="/"+"/".join(path.strip("/").split("/")[:2])+"/"
    context=inventory["context"]
    if not prefix.startswith(f"/parts-list/{context['modelYear']}-bmw-{context['model'].lower()}-") or not prefix.endswith("_"+context["platform"].lower()+"/"):
        raise ValueError("Observed source route prefix does not match the selected chassis")
    suffix=(str(context.get('body')).lower() if context.get('body') else str(context.get('engine') or '').lower()+'_engine')
    if suffix and prefix!=f"/parts-list/{context['modelYear']}-bmw-{context['model'].lower()}-{suffix}_{context['platform'].lower()}/":
        raise ValueError('Observed source body/engine prefix does not match its context')
    return prefix

def allowed_url(url,context,prefix=None):
    parsed=urllib.parse.urlsplit(url)
    slug=f"{context['modelYear']}-bmw-{context['model'].lower()}-{str(context.get('body') or '').lower()}_{context['platform'].lower()}"
    prefix=prefix or '/parts-list/'+slug+'/'
    return parsed.scheme=='https' and parsed.hostname==HOST and not parsed.username and not parsed.password and parsed.path.startswith(prefix) and parsed.path.endswith('.html') and not parsed.query

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory',type=Path,required=True);parser.add_argument('--cache-dir',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True);parser.add_argument('--delay',type=float,default=1.0);parser.add_argument('--limit',type=int);parser.add_argument('--offline',action='store_true')
    args=parser.parse_args()
    if args.delay<.5:parser.error('Use at least0.5 seconds between public requests')
    for folder in [args.cache_dir,args.output_dir]:
        if 'public' in folder.resolve().parts or 'src' in folder.resolve().parts:parser.error('Raw source cache and import batches must stay outside public/src')
        folder.mkdir(parents=True,exist_ok=True)
    inventory=json.loads(args.inventory.read_text());context=inventory['context'];routes=inventory['routes'][:args.limit];prefix=source_prefix(inventory)
    if context.get('platform') not in ('E34','E30'):parser.error('Only registered E34/E30 source contexts are accepted')
    robots=urllib.robotparser.RobotFileParser('https://'+HOST+'/robots.txt')
    if not args.offline:
        with urllib.request.urlopen(urllib.request.Request(robots.url,headers={'User-Agent':UA}),timeout=25) as response:robots.parse(response.read().decode().splitlines())
    manifest={'schema_version':1,'source':'Public source ordering facts','context':context,'inventory_sha256':hashlib.sha256(args.inventory.read_bytes()).hexdigest(),'expected_pages':len(inventory['routes']),'selected_pages':len(routes),'started_at':dt.datetime.now(dt.timezone.utc).isoformat(),'successful_pages':0,'rejected_records':0,'parts':0,'drawings':0,'errors':[],'scope':'Model-year/body source selection; unselected options and source restrictions retained. No universal fitment or complete-generation claim.'}
    output=args.output_dir/'assemblies.jsonl';last_request=0.;consecutive=0
    with output.open('w') as stream:
        for index,route in enumerate(routes):
            url=route['url']
            try:
                if not allowed_url(url,context,prefix):raise ValueError('Route is outside the observed catalog context')
                key=hashlib.sha256(url.encode()).hexdigest();cache=args.cache_dir/(key+'.html.gz')
                if cache.exists():html=gzip.decompress(cache.read_bytes()).decode()
                elif args.offline:raise ValueError('No cached source snapshot')
                else:
                    if not robots.can_fetch(UA,url):raise ValueError('Public source robots rules disallow this route')
                    pause=args.delay-(time.monotonic()-last_request)
                    if pause>0:time.sleep(pause)
                    last_request=time.monotonic()
                    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=25) as response:
                        if not allowed_url(response.url,context,prefix):raise ValueError('Source redirected outside the selected public catalog')
                        raw=response.read(4000000)
                        if len(raw)>=4000000:raise ValueError('Source exceeds the bounded catalog page size')
                    html=raw.decode('utf-8');cache.write_bytes(gzip.compress(raw))
                page=parse_page(html,url,context);stream.write(json.dumps(page,ensure_ascii=False)+'\n');stream.flush();manifest['successful_pages']+=1;manifest['parts']+=len(page['parts']);manifest['drawings']+=len(page['drawings']);manifest['rejected_records']+=len(page['rejected_records']);consecutive=0
            except Exception as error:
                manifest['errors'].append({'url':url,'error':str(error)[:300]});consecutive+=1
                if consecutive>=3 and not args.offline:print('Stopped after three consecutive source failures',flush=True);break
            if (index+1)%10==0:print(f"{index+1}/{len(routes)} pages;{manifest['parts']} source records;{manifest['drawings']} drawings;{len(manifest['errors'])} errors",flush=True)
            (args.output_dir/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    manifest['completed_at']=dt.datetime.now(dt.timezone.utc).isoformat();manifest['status']='source-index-imported' if manifest['successful_pages']==manifest['expected_pages'] and not manifest['errors'] else 'partial';manifest['facts_sha256']=hashlib.sha256(output.read_bytes()).hexdigest();(args.output_dir/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({key:manifest[key] for key in ['status','successful_pages','parts','drawings','rejected_records']}),flush=True)
if __name__=='__main__':main()
