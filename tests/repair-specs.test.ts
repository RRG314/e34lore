import {describe,expect,it} from 'vitest';
import {manualChapters,manualGuides} from '../src/data/manual';
import {e30Guides} from '../src/series/e30-repairs';
import {e30ManualGroupForPage} from '../src/series/e30-factory-index';
import {repairTopic} from '../src/repair/library';
import {componentRepairHref,requestedComponent} from '../src/servicing/context';
import {repairModelNode,repairSpecs,specsForGuide,specsForNode,specsForPart,specsForSelection,specsForTopic,supplementalServiceLinks} from '../src/servicing/repair-specs';
import {seriesHref} from '../src/series/registry';

describe('linked repair specifications', () => {
  it('keeps M20 and M50 alternator values separate and exposes the conflicting E34 source',()=>{
    const [e30] = specsForNode('e30','e30assembly:engine:alternator');
    const [e34] = specsForNode('e34','wiring:alternator');
    expect(e30.specs?.map(spec=>spec.value)).toEqual(['5 Nm','13 Nm']);
    expect(specsForNode('e30','wiring:alternator')).toContain(e30);
    expect(e34).toEqual(specsForNode('e34','m50:alternator')[0]);
    expect(e34.specs?.map(spec=>spec.condition)).toEqual([expect.stringContaining('Bentley lists 6 Nm'),expect.stringContaining('Bentley lists 14 Nm')]);
  });
  it('links the starter and E34 distribution routes to their own fasteners and sources',()=>{
    const [starter] = specsForNode('e34','wiring:starter:sleeve');
    const [distribution] = specsForNode('e34','wiring:battery');
    expect(starter).toEqual(specsForNode('e34','m50:starter')[0]);
    expect(starter.manual.href).toBe('/manual/121?pdf=168');
    expect(starter.specs?.find(spec=>spec.value==='12 Nm')?.condition).toContain('8 Nm');
    expect(distribution.specs?.map(spec=>spec.value)).toEqual(['20 Nm']);
    expect(specsForPart('e30','12411726504')).toEqual(specsForNode('e30','wiring:starter'));
  });
  it('keeps every walk-through, repair topic and indexed manual link in its own series', () => {
    for (const job of repairSpecs) {
      if (job.guide) expect((job.series==='e30' ? e30Guides : manualGuides).some(g=>g.slug===job.guide),job.id).toBe(true);
      if (job.topic) expect(repairTopic(job.topic,job.series),job.id).toBeDefined();
      if (job.modelNode) expect(specsForNode(job.series,job.modelNode),job.id).toContain(job);
      if (job.rightModelNode) expect(specsForNode(job.series,job.rightModelNode),job.id).toContain(job);
      for (const topic of job.relatedTopics??[]) expect(repairTopic(topic,job.series),job.id).toBeDefined();
      for(const {href} of [job.manual,...(job.compare??[]),...(job.specs??[]).flatMap(spec=>spec.source?[spec.source]:[])]){
        if(!href.startsWith('/manual/')) continue;
        const url=new URL(href,'https://example.invalid');
        const chapter=url.pathname.split('/').at(-1);
        const pdf=Number(url.searchParams.get('pdf'));
        if(job.series==='e30') expect(e30ManualGroupForPage(pdf)?.id,job.id).toBe(chapter);
        else expect(manualChapters.find(c=>pdf>=c.pdfStart&&pdf<=c.pdfEnd)?.id,job.id).toBe(chapter);
      }
    }
  });

  it('uses the same E30 center mount job from both entries without mixing in the E34 part', () => {
    const [modelJob]=specsForNode('e30','e30assembly:propeller:center-mount');
    expect(specsForPart('e30','26 12 1 226 723')).toEqual([modelJob]);
    expect(modelJob.manual.href).toBe('/manual/26?pdf=466');
    expect(specsForPart('e34','26121226723')[0].manual.href).toBe('/manual/260?pdf=267');
    expect(specsForPart('e30','26121225071')).toEqual([]);
  });

  it('does not offer the legacy filter procedure for E34 spark plug catalog matches', () => {
    const jobs=specsForPart('e34','bmw-12129064619');
    expect(jobs.map(job=>job.guide)).toEqual(['m50-spark-plug-replacement']);
    const links=supplementalServiceLinks(jobs,['engine-air-filter-replacement','m50-spark-plug-replacement','another-guide'],[
      {href:'/manual/020#job-air-filter-replacement',title:'Air filter',guides:['engine-air-filter-replacement'],chapter:'020',printed:'020-10',page:10,pdf:32},
      {href:'/manual/120?pdf=157',title:'Ignition',guides:[],chapter:'120',printed:'120-5',page:5,pdf:157},
    ]);
    expect(links.guideIds).toEqual(['another-guide']);
    expect(links.manual.map(entry=>entry.title)).toEqual(['Ignition']);
  });

  it('keeps front and rear E34 torque rows separate after a brake part is selected', () => {
    const jobs=specsForGuide('e34','factory-sliding-caliper-brake-pads');
    expect(jobs).toHaveLength(2);
    const [front]=specsForSelection(jobs,'e34',{nodeId:'e34sys:brake-caliper-front-1'});
    expect(front.specs).toContainEqual(expect.objectContaining({item:'Front caliper carrier to strut',value:'110 Nm'}));
    expect(specsForSelection(jobs,'e34',{partId:'bmw-34216756537'}).map(job=>job.id)).toEqual(['e34-rear-brake-rotors']);
  });

  it('separates the E30 rear-wheel-drive and 325iX hub procedures and uses the right sockets', () => {
    const [e30]=specsForTopic('e30','e30-front-wheel-bearing');
    const [e34]=specsForTopic('e34','310-job-front-wheel-bearing');
    expect(e30.tools?.[0]).toContain('36 mm');
    expect(e34.tools?.[0]).toContain('46 mm');
    expect(e30.manual.href).toBe('/manual/31?pdf=514');
    expect(repairTopic('e30-ix-front-wheel-bearing','e30')?.factory?.pages).toEqual([512,513]);
    expect(specsForTopic('e30','e30-ix-front-wheel-bearing')).toEqual([]);
  });

  it('routes the right-hand control arm to its own mesh and keeps only distinct manual links', () => {
    const jobs=specsForPart('e34','bmw-31121139988');
    expect(jobs).toHaveLength(1);
    expect(repairModelNode(jobs[0],{partId:'bmw-31121139988'})).toBe('e34sys:front-control-arm--1');
    expect(specsForTopic('e34','310-job-steel-control-arm-bushing')).toEqual(jobs);
    const base={chapter:'310',page:5,printed:'310-5',pdf:281,guides:[]};
    expect(supplementalServiceLinks(jobs,[],[
      {...base,href:'/manual/310#job-front-ride-height-and-control-arms',title:'Control arms'},
      {...base,href:'/manual/310#job-steel-control-arm-bushing',title:'Steel bushing'},
      {...base,href:'/manual/320#job-center-link-camber-and-caster',chapter:'320',title:'Alignment'},
    ]).manual.map(entry=>entry.title)).toEqual(['Alignment']);
  });

  it('carries a real catalog position and pinned model through an E30 repair topic link', () => {
    const component={partId:'bmw-11311711081',positionId:'catalog-position-01',assemblyId:'catalog-assembly',catalogContextId:'e30-context-coupe',nodeId:'e30assembly:engine:timing',referenceId:'e30-325i-coupe-manual',modelRevision:1161};
    const path=seriesHref(componentRepairHref('e30-m20-timing-belt',component),'e30');
    const url=new URL(path,'https://example.invalid');
    expect(url.pathname).toBe('/e30/repairs/e30-m20-timing-belt');
    expect(requestedComponent(Object.fromEntries(url.searchParams))).toEqual(component);
  });
});
