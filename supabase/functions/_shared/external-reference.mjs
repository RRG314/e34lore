// Link normalization only. No scraping, redirects, embeds or external requests.
export function externalReferenceUrl(raw) {
  if(typeof raw!=='string'||raw.length>2048||/[\s\\<>@]/.test(raw)||/%(?:0[ad0]|5c)/i.test(raw))return null;
  let u;try{u=new URL(raw);}catch{return null;}
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  const host=u.hostname.toLowerCase(),path=u.pathname;let canonical,url,platform;
  if(/^(?:(?:www|old|new|m)\.)?reddit\.com$/.test(host)){
    const m=path.match(/^\/(?:r\/[a-z0-9_]{2,40}\/)?comments\/([a-z0-9]{4,12})(?:\/[^/]{1,180})?(?:\/[a-z0-9]{4,12})?\/?$/i);
    if(!m)return null;platform='Reddit';canonical='https://www.reddit.com/comments/'+m[1].toLowerCase()+'/';url='https://www.reddit.com'+path;
  }else if(/^(?:www\.)?bimmerforums\.com$/.test(host)){
    const archive=path.match(/^\/forum\/archive\/index\.php\/t-(\d{3,12})\.html$/),thread=path==='/forum/showthread.php'?(u.searchParams.get('t')||u.search.match(/^\?(\d{3,12})(?:[-&=]|$)/)?.[1]):null;
    const id=archive?.[1]||thread;if(!id||!/^\d{3,12}$/.test(id))return null;platform='Bimmerforums';canonical='https://www.bimmerforums.com/forum/showthread.php?'+id;
    url=archive?'https://www.bimmerforums.com'+path:canonical;
    const p=u.searchParams.get('p');if(!archive&&p&&/^\d{1,12}$/.test(p))url+='&p='+p+'#post'+p;
  }else if(/^(?:www\.)?e30zone\.net$/.test(host)&&path==='/forum/viewtopic.php'){
    const key=u.searchParams.has('t')?'t':'p',id=u.searchParams.get(key);if(!id||!/^\d{1,12}$/.test(id))return null;platform='E30 Zone';canonical=url='https://www.e30zone.net/forum/viewtopic.php?'+key+'='+id;
  }else if(/^(?:www\.)?bmwe34\.net$/.test(host)&&/^\/E34main\/[a-z0-9_/-]+\.html?$/i.test(path)&&!path.includes('..')){
    platform='BMW E34.net';canonical=url='https://www.bmwe34.net'+path;
  }else if(host==='bimmers.no'&&/^\/forums\/topic\/\d{3,12}-[a-z0-9-]+\/?$/i.test(path)){
    platform='Bimmers.no';canonical=url='https://bimmers.no'+path.replace(/\/?$/,'/');
  }else if(host==='www.shiftbmw.com'&&/^\/model\/e\d{2}\/[a-z0-9-]+\/$/.test(path)){
    platform='ShiftBMW';canonical=url='https://www.shiftbmw.com'+path;
  }else if(host==='www.exx.se'&&/^\/maintenance\/[a-z0-9_]+\/index\.shtml$/.test(path)){
    platform='Exx.se';canonical=url='https://www.exx.se'+path;
  }else if(host==='www.fcpeuro.com'&&/^\/blog\/[a-z0-9-]+$/.test(path)){
    platform='FCP Euro';canonical=url='https://www.fcpeuro.com'+path;
  }else return null;
  return {url,canonical,platform};
}
export function engineFamily(value){return String(value||'').toUpperCase().replace(/^(M\d\d|S\d\d)B\d\d.*$/,'$1');}
export function referenceScope(scope,vehicle){
  let partial=false;
  for(const [k,expected]of Object.entries(scope||{})){
    if(!expected)continue;const actual=vehicle?.[k];if(!actual){partial=true;continue;}
    const a=k==='engine'?engineFamily(actual):String(actual).toLowerCase(),b=k==='engine'?engineFamily(expected):String(expected).toLowerCase();
    if(a!==b)return 'different';
  }return partial?'partial':'related';
}
