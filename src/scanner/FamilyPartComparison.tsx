'use client';
import { useEffect, useState } from 'react';
import { db } from '../components/context';
import { PartComparison, PartChoiceImage } from '../components/PartComparison';
import { FamilyPhoto } from '../components/PartMedia';
import { familyComparisonParts, numberPhotograph } from '../servicing/part-media';
import { preferredCatalogContext, sourceDrawingAdapter, type CatalogAssembly, type CatalogPosition, type SourceDrawing } from '../domain/catalog';
import { catalogOrderingRows } from '../lib/catalog-integrity';
import { fetchAllRows } from '../lib/data-export';
import { useVehicleCatalog } from '../lib/use-vehicle-catalog';
import type { Vehicle } from '../data/catalog';
import { centerSupportReference } from './center-support-reference';
import { formatPartNumber } from '../domain/fitment';
import type { Series } from '../series/registry';

type Snapshot = { key: string; positions: CatalogPosition[]; assemblies: CatalogAssembly[]; drawings: SourceDrawing[]; error: string };
export function FamilyPartComparison({ family, vehicle, series = "e34", disabled, onCatalogNumber }: { family: string; vehicle: Vehicle; series?: Series; disabled: boolean; onCatalogNumber: (number: string) => void }) {
  const examples = familyComparisonParts(family);
  const bearing = family === 'center-support-bearing' || family === 'ball-bearing' ? centerSupportReference(vehicle.model, series) : null;
  const numbers = bearing ? family === 'ball-bearing' ? bearing.numbers.slice(1) : bearing.numbers : examples.map(example => example.number);
  const [choice, setChoice] = useState<{ family: string; number: string } | null>(null);
  const number = choice?.family === family && numbers.includes(choice.number) ? choice.number : numbers[0] || '';
  const [sourceChoice, setSourceChoice] = useState(''), [drawingChoice, setDrawingChoice] = useState(''), [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<Snapshot | null>(null);
  const inventory = useVehicleCatalog(), key = number + ':' + refresh;
  const current = result?.key === key ? result : null;
  useEffect(() => {
    if (!number) return;
    let active = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    async function read() {
      try {
        const part = await db.from('parts').select('id').eq('number_normalized', number).abortSignal(controller.signal).maybeSingle();
        if (part.error) throw Error('The catalog part could not load.');
        if (!part.data) throw Error('No source diagram is linked to this number yet.');
        const rows = await fetchAllRows((from, to) => db.from('part_assembly_positions').select('*,parts(id,name,number_normalized)').eq('part_id', part.data!.id).eq('active', true).order('id').range(from, to).abortSignal(controller.signal));
        const positions = catalogOrderingRows(rows as CatalogPosition[]), ids = [...new Set(positions.map(p => p.assembly_id))];
        if (!ids.length) throw Error('No source diagram is linked to this number yet.');
        const [assemblies, drawings] = await Promise.all([
          db.from('assemblies').select('id,title,source_category,source_id,boundary,catalog_context_id').in('id', ids).abortSignal(controller.signal),
          db.from('technical_drawings').select('*').in('assembly_id', ids).order('id').abortSignal(controller.signal),
        ]);
        if (assemblies.error || drawings.error) throw Error('The source diagram could not load.');
        if (active) setResult({ key, positions, assemblies: assemblies.data || [], drawings: drawings.data || [], error: '' });
      } catch (error) { if (active) setResult({ key, positions: [], assemblies: [], drawings: [], error: error instanceof Error ? error.message : 'The source diagram could not load.' }); }
      finally { clearTimeout(timer); }
    }
    void read();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [number, key]);
  const preferred = preferredCatalogContext(inventory.rows, vehicle);
  const contextIds = new Set(inventory.rows.map(row => row.id));
  const sources = current?.positions.filter(p => contextIds.has(p.context_id)).filter((p, i, all) => all.findIndex(other => other.assembly_id === p.assembly_id) === i) || [];
  const source = sources.find(p => p.id === sourceChoice) || sources.find(p => p.context_id === preferred?.id)
    || (bearing && sources.find(p => p.source_url === bearing.source)) || sources[0];
  const drawings = current?.drawings.filter(d => d.assembly_id === source?.assembly_id) || [];
  const drawing = drawings.find(d => d.id === drawingChoice) || drawings[0];
  const adapted = drawing && current ? sourceDrawingAdapter(drawing, current.positions.filter(p => p.assembly_id === drawing.assembly_id)) : undefined;
  const photo = numberPhotograph(number), name = photo?.kind === 'provider-image' ? photo.label : source?.source_name || 'Catalog reference';
  if (!number) return <div className="scan-family-example"><FamilyPhoto family={family}/><p className="small muted">A numbered loose-part reference is not linked for this category yet. Choose an OEM record below to compare its available images.</p></div>;
  const contextName = inventory.rows.find(c => c.id === source?.context_id)?.name;
  return <section className="scan-family-example" aria-label="Catalog examples for comparison">
    <p className="small">Compare a catalog example below. Choosing an example does not identify the part in your photos.</p>
    <div className="scan-example-parts">{numbers.map(candidate => <button type="button" disabled={disabled} key={candidate} aria-pressed={candidate === number} onClick={() => setChoice({ family, number: candidate })}>
      <PartChoiceImage number={candidate}/><span><strong>{formatPartNumber(candidate)}</strong><small>{family === 'center-support-bearing' ? candidate === numbers[0] ? 'Complete center mount' : 'Separate ball bearing' : 'Catalog comparison'}</small></span>
    </button>)}</div>
    {sources.length > 1 && <label>Diagram source<select value={source?.id || ''} onChange={event => setSourceChoice(event.target.value)}>{sources.map(p => <option key={p.id} value={p.id}>{inventory.rows.find(c => c.id === p.context_id)?.name || 'Source catalog'} · {current?.assemblies.find(a => a.id === p.assembly_id)?.title}</option>)}</select></label>}
    {drawings.length > 1 && <label>Catalog drawing<select value={drawing?.id || ''} onChange={event => setDrawingChoice(event.target.value)}>{drawings.map((d, index) => <option key={d.id} value={d.id}>{d.source_label || 'Drawing ' + (index + 1)}</option>)}</select></label>}
    <PartComparison series={series} key={number} number={number} name={name} drawing={adapted} positionId={source?.id} sourceLabel={contextName ? 'Source: ' + contextName : undefined} loading={!current} error={current?.error} onRetry={() => setRefresh(n => n + 1)}/>
    {source && preferred && source.context_id !== preferred.id && <p className="small muted">This example comes from a different source vehicle. It does not confirm fitment for your selected car.</p>}
    <button type="button" className="button outline" disabled={disabled} onClick={() => onCatalogNumber(number)}>Review BMW {formatPartNumber(number)} in the full catalog ↗</button>
  </section>;
}
