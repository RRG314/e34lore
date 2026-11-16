import {describe,it,expect} from 'vitest';
import {manualGuides} from '../src/data/manual';
import {emptyVehicle} from '../src/data/catalog';
import {repairPlan} from '../src/repair/plan';
import {serviceGuide,serviceApplicability,toolList,prerequisites,servicingNotes} from '../src/servicing/service';
import {componentGuideHref,componentHref,componentWorkshopHref,requestedComponent} from '../src/servicing/context';
import {moneyInput,sumBudget,laborBudget,budgetJournal} from '../src/servicing/budget';
import {publicShareUrl} from '../src/domain/identity';
import {catalogProcedures} from '../src/digital-twin/public/catalog';
import {seriesHref} from '../src/series/registry';
const guide=manualGuides.find(g=>g.slug===repairPlan.guide)!;
describe('one existing component context',()=>{
 const context={partId:'bmw-11510007042',positionId:'source-position',catalogContextId:'source-context',nodeId:'m60b30:water-pump',referenceId:'e34-530i-touring-automatic',modelRevision:22};
 const journey={vehicle:'c3400000-0000-4000-9000-000000000001',scan:'c3400000-0000-4000-9000-000000000002'};
 it('uses the existing catalog URL and retains exact source/model identity',()=>{const u=new URL(componentHref(context,journey),'https://e34lore.com');expect(u.pathname).toBe('/parts/catalog');expect(u.searchParams.get('position')).toBe(context.positionId);expect(u.searchParams.get('vehicle')).toBe(journey.vehicle);expect(u.searchParams.get('reference')).toBe(context.referenceId);});
 it('returns to the actual selected model and clicked position',()=>{const u=new URL(componentWorkshopHref(context,journey),'https://e34lore.com');expect(u.searchParams.get('node')).toBe(context.nodeId);expect(u.searchParams.get('catalog_position')).toBe(context.positionId);expect(u.searchParams.get('model_revision')).toBe('22');});
 it('shares only public identity while excluding private journey data',()=>{const u=new URL(publicShareUrl(componentHref(context,journey))!);expect(u.searchParams.get('vehicle')).toBeNull();expect(u.searchParams.get('scan')).toBeNull();expect(u.searchParams.get('reference')).toBe(context.referenceId);expect(u.searchParams.get('model_revision')).toBe('22');});
 it.each(['e34', 'e30'] as const)('keeps the selected %s component through a guide step and back to its drawing and model', series => {
   const selected = {
     ...context,
     assemblyId:'source-assembly',
     referenceId:series === 'e30' ? 'e30-325i-coupe-manual' : context.referenceId,
   };
   const prefix = series === 'e30' ? '/e30' : '';
   const url = new URL(seriesHref(componentGuideHref('example', selected, journey, {revision:'saved-guide-revision', step:2}), series), 'https://e34lore.com');
   expect(url.pathname).toBe(prefix + '/guides/example');
   expect(url.hash).toBe('#guide-step-2');
   expect(url.searchParams.get('revision')).toBe('saved-guide-revision');
   expect(url.searchParams.get('scan')).toBe(journey.scan);
   const restored = requestedComponent(Object.fromEntries(url.searchParams));
   expect(restored).toEqual(selected);
   expect(seriesHref(componentHref({...restored, partId:selected.partId}, journey), series)).toContain(prefix + '/parts/catalog?part=' + selected.partId + '&position=' + selected.positionId);
   const workshop = new URL(seriesHref(componentWorkshopHref(restored, journey), series), 'https://e34lore.com');
   expect(workshop.pathname).toBe(prefix + '/workshop');
   expect(workshop.searchParams.get('node')).toBe(selected.nodeId);
   expect(workshop.searchParams.get('catalog_position')).toBe(selected.positionId);
   expect(workshop.searchParams.get('reference')).toBe(selected.referenceId);
   expect(workshop.searchParams.get('model_revision')).toBe('22');
 });
 it('allows a node-only return and ignores arbitrary destinations and invalid model revisions', () => {
   const restored = requestedComponent({ node:'e30assembly:engine:oil-filter', part:'/admin', model_revision:'9999999999999999', from:'https://example.com', scan:journey.scan });
   expect(restored).toEqual({nodeId:'e30assembly:engine:oil-filter'});
   expect(componentWorkshopHref(restored)).toBe('/workshop?node=e30assembly%3Aengine%3Aoil-filter');
   expect(componentGuideHref('example')).toBe('/guides/example');
 });
 it('carries E30 context into the shared Garage alongside the existing vehicle and tab', () => {
   const url = '/garage?vehicle=' + journey.vehicle + '&tab=scans#results';
   expect(seriesHref(url, 'e34')).toBe(url);
   const e30 = seriesHref(url, 'e30');
   expect(e30).toBe('/garage?vehicle=' + journey.vehicle + '&tab=scans&series=e30#results');
   expect(seriesHref(e30, 'e30')).toBe(e30);
 });
 it('does not infer service instructions from an unrelated source position',()=>{expect(catalogProcedures(context.partId,'unrelated')).toEqual({nodes:[],guides:[],manual:[]});});
});
describe('source-bound component servicing',()=>{
 it('provides source-specific parts and tools for every step of the five source-checked maintenance procedures',()=>{for(const slug of ['m50-engine-oil-and-filter','m50-spark-plug-replacement','m50-valve-cover-gasket','engine-air-filter-replacement','accessory-drive-belt-inspection']){const guide=manualGuides.find(g=>g.slug===slug)!;expect(guide.jobSupport?.steps.length).toBe(guide.steps.length);expect(guide.jobSupport?.requiredParts.length).toBeGreaterThan(0);expect(guide.jobSupport?.stopConditions.length).toBeGreaterThan(0);for(const [index,step]of guide.jobSupport!.steps.entries()){expect(step.number).toBe(index+1);expect(step.tools.length).toBeGreaterThan(0);for(const tool of step.tools)expect(guide.tools,slug+' step '+step.number).toContain(tool);expect(step.source.href).toMatch(/^\/manual\/\d+\?pdf=\d+$/);}expect(toolList(guide).some(tool=>tool.stepNumbers?.length)).toBe(true);expect(guide.reviewStatus).toBe('draft');}});
 it('pins the current immutable guide revision and refuses to apply current steps to an archive',()=>{expect(serviceGuide(repairPlan.guide,repairPlan.revision)?.guide).toBe(guide);expect(serviceGuide(repairPlan.guide,'0'.repeat(24))).toBeNull();});
 it('consolidates tools while retaining every operation assignment',()=>{const tools=toolList(guide);expect(new Set(tools.map(t=>t.id)).size).toBe(tools.length);for(const op of repairPlan.operations){expect(tools.some(t=>t.operations.includes(op.id))).toBe(true);}expect(tools.find(t=>t.id==='m6-extraction')?.specification).toContain('M6');expect(tools.find(t=>t.id==='sockets')?.specification).toBeNull();expect(tools.find(t=>t.id==='sockets')?.operations).toEqual(['loosen-pulley','pulley','nuts']);});
 it('uses the full prerequisite closure, in source order, without treating later reassembly as prior access',()=>{expect(prerequisites('pump').map(o=>o.id)).toEqual(['identify','cold-drain','fan-shroud','hoses','loosen-pulley','belt','pulley','nuts']);expect(()=>prerequisites('absent')).toThrow('Unknown');const bad=structuredClone(repairPlan.operations);bad[0].requires=['pump'];expect(()=>prerequisites('pump',bad)).toThrow('cycle');});
 it('does not guess per-step tools for unindexed procedures',()=>{const other=manualGuides.find(g=>g.slug==='battery-connections-first-check')!;expect(toolList(other).every(t=>!t.operations.length)).toBe(true);expect(servicingNotes(other.slug)).toBeNull();});
 it('retains uncertainty and rejects the M50 job for a V8 car',()=>{expect(serviceApplicability(guide,emptyVehicle).status).toBe('unknown');expect(serviceApplicability(guide,{...emptyVehicle,engine:'M60',model:'540i',year:'1994',market:'USA'}).status).toBe('incompatible');expect(serviceApplicability(guide,{...emptyVehicle,engine:'M50TU',model:'525i',year:'1994',market:'USA'}).status).toBe('conditional');});
});
describe('personal repair budget snapshots',()=>{
 it('keeps missing values unknown and rounds decimal money without binary float multiplication',()=>{expect(moneyInput('')).toBeNull();expect(moneyInput('0')).toBe(0);expect(moneyInput('1.01')).toBe(101);expect(()=>moneyInput('1.001')).toThrow();expect(()=>moneyInput('-5')).toThrow();});
 it('excludes owned tools and never presents a missing quote as a zero-cost repair',()=>{const result=sumBudget([{id:'parts',name:'Parts',cents:12001,owned:false},{id:'tool',name:'Wrench',cents:null,owned:true},{id:'coolant',name:'Coolant',cents:null,owned:false}]);expect(result).toEqual({known:12001,total:null,missing:['Coolant']});expect(laborBudget('2.5','85.50')).toBe(21375);expect(laborBudget('','85.50')).toBeNull();});
 it('saves the entered estimate and exact guide revision as a private journal snapshot without marking repair completion',()=>{const line={id:'parts',name:'Parts',cents:10000,owned:false};const entry=budgetJournal({title:guide.title,guide:guide.slug,revision:repairPlan.revision,currency:'USD',lines:[line],hours:'',rate:'',at:'2026-11-08T22:00:00Z'});line.cents=20000;expect(entry.body).toContain('USD 100.00');expect(entry.body).toContain(repairPlan.revision);expect(entry.body).toContain('not retailer quotes');expect(entry.body).toContain('does not record a completed repair');expect(entry.cost).toBe(100);});
});
