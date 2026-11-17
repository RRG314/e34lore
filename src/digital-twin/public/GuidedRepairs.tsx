'use client';

import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { DocumentLink } from '../../components/DocumentLink';
import type { ReferenceModel } from './model';
import { assemblyAccess, type AssemblyProcedure } from './assembly-service';

const areas: Record<string, string> = {
  'system:cooling': 'Cooling',
  'system:front-brakes': 'Brakes',
  'system:rear-brakes': 'Brakes',
  'system:front-suspension': 'Suspension & steering',
  'system:steering': 'Suspension & steering',
  'system:automatic-gearbox': 'Transmission',
  'system:manual-gearbox': 'Transmission',
};

export function GuidedRepairs({ choices, loading, onStart, workLog }: {
  choices: AssemblyProcedure[];
  loading: boolean;
  onStart: (job: AssemblyProcedure) => void;
  workLog?: string;
}) {
  const groups = new Map<string, AssemblyProcedure[]>();
  for (const job of choices) {
    const area = areas[job.scope] ?? 'Other repairs';
    const group = groups.get(area);
    if (group) group.push(job);
    else groups.set(area, [job]);
  }
  return <section className="workshop-guided" aria-labelledby="guided-repairs">
    <div className="workshop-guided-heading">
      <h2 id="guided-repairs">Guided repairs</h2>
      <nav aria-label="Repair references">
        <DocumentLink href="/repairs">Repair guides <ArrowUpRight size={14}/></DocumentLink>
        <DocumentLink href="/manual">Service manual <ArrowUpRight size={14}/></DocumentLink>
      </nav>
    </div>
    {choices.length ? <div className="workshop-guided-groups">{[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([label, jobs]) =>
      <section key={label} aria-label={label}>
        <h3>{label}</h3>
        <ul>{jobs.map(job => <li key={job.id}>
          <button type="button" onClick={() => onStart(job)} disabled={loading}>
            <span>{job.title}</span><ChevronRight size={16} aria-hidden="true"/>
          </button>
        </li>)}</ul>
      </section>,
    )}</div> : <p>{loading ? 'Loading guided repairs…' : 'No guided 3D repairs are available for this reference. The repair guides and service manual are available above.'}</p>}
    {workLog && <DocumentLink className="text-link" href={workLog}>Open the M50 water pump work log <ArrowUpRight size={14}/></DocumentLink>}
  </section>;
}

export function RepairAccess({ model, procedure, completed, onInspect }: {
  model: ReferenceModel;
  procedure: AssemblyProcedure;
  completed: number;
  onInspect: (id: string) => void;
}) {
  const steps = assemblyAccess(procedure);
  return <>
    {(steps.length > 0 || procedure.before) && <details className="repair-access">
      <summary>Parts to move for access</summary>
      {procedure.before && <p>{procedure.before}</p>}
      {steps.length > 0 && <ol>{steps.map(step => <li key={step.index}>
        <strong>{step.action}</strong>
        {completed > step.index && <span className="repair-access-done"> Done</span>}
        <div className="repair-access-parts">{step.parts.map(id => {
          const label = model.nodes.find(node => node.id === id)?.name;
          return label && <button key={id} type="button" className="text-link" onClick={() => onInspect(id)}>
            {label}<ArrowUpRight size={13} aria-hidden="true"/>
          </button>;
        })}</div>
      </li>)}</ol>}
    </details>}
    {!!procedure.supplies?.length && <details className="repair-access">
      <summary>Parts and supplies</summary>
      <ul>{procedure.supplies.map(item => <li key={item}>{item}</li>)}</ul>
    </details>}
  </>;
}
