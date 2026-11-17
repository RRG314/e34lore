import { ArrowUpRight } from 'lucide-react';
import { DocumentLink } from '../../components/DocumentLink';
import type { WiringRoute } from '../../data/wiring-routes';
import type { Series } from '../../series/registry';
import { RepairSpecCard } from '../../servicing/RepairSpecCard';
import { specsForNode } from '../../servicing/repair-specs';

export function WiringDetails({ route, name, node, series }: { route: WiringRoute; name: string; node: string; series: Series }) {
  return <div className="component-service">
    <h3>{name}</h3>
    <p>{route.location}</p>
    {route.connections&&<p>{route.connections}</p>}
    <h4>Diagrams &amp; references</h4>
    <ul>{route.sources.map(source=><li key={source.href}>
      <DocumentLink href={source.href} target={source.href.startsWith('https:') ? '_blank' : undefined} rel="noopener noreferrer">
        {source.label} <ArrowUpRight size={13}/>
      </DocumentLink>
    </li>)}</ul>
    {specsForNode(series,node).map(job=><RepairSpecCard key={job.id} job={job} compact entry="workshop"/>)}
    <DocumentLink className="text-link" href="/electrical">Wiring &amp; Electrical <ArrowUpRight size={13}/></DocumentLink>
  </div>;
}
