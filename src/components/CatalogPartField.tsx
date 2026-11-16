"use client";
import {useKeyedResource} from "../hooks/use-keyed-resource";
import { db, useApp } from "./context";
import { formatPartNumber } from "../domain/fitment";
import { catalogSearchQuery, type CatalogIdentityHit } from "../domain/catalog";
import { catalogOrderingRows } from "../lib/catalog-integrity";
export type PartIdentity = {
  id: string;
  name: string;
  number_normalized: string | null;
  positionId?: string;
  assemblyId?: string;
  contextId?: string;
  contextName?: string;
};
export function CatalogPartField({
  value,
  selected,
  onChange,
  onSelect,
  catalogOnly=false,
  contextId,
}: {
  catalogOnly?: boolean;
  contextId?: string;
  value: string;
  selected: PartIdentity | null;
  onChange: (value: string) => void;
  onSelect: (part: PartIdentity) => void;
}) {
  const {series} = useApp();
  const query=value.trim();
  const resource=useKeyedResource<PartIdentity[]>(JSON.stringify([series,query,selected?.id,catalogOnly,contextId]),async signal=>{
    const number=query.replace(/[\s-]/g,"");
    if(series==="e34" && /^\d{11}$/.test(number)){
      const r=await db.from("parts").select("id,name,number_normalized").eq("number_normalized",number).abortSignal(signal).maybeSingle();
      if(r.error)throw r.error;return r.data?[r.data]:[];
    }
    const params={search_query:series==="e30" ? catalogSearchQuery(query) : query.slice(0,200),max_results:30};
    const lookup=series==="e30"
      ? db.rpc("catalog_find_series_parts",{...params,series_filter:series,context_preference:contextId||null})
      : contextId ? db.rpc("catalog_find_parts",{...params,context_filter:contextId})
      : db.rpc("catalog_search_parts",params);
    const r=await lookup.abortSignal(signal);
    if(r.error)throw r.error;
    const seen=new Set<string>();
    return catalogOrderingRows((r.data||[])as CatalogIdentityHit[]).filter(part=>{
      if(seen.has(part.part_id))return false;
      seen.add(part.part_id);
      return true;
    }).slice(0,8).map(part=>({
      id:part.part_id,name:part.name,number_normalized:part.number_normalized,
      ...(series==="e30" ? {
        positionId:part.position_id||undefined,assemblyId:part.assembly_id||undefined,
        contextId:part.context_id||undefined,contextName:part.context_name||undefined,
      } : {}),
    }));
  },{enabled:query.length>=2&&!selected,delayMs:250,failureMessage:catalogOnly?"Catalog lookup is unavailable. Retry, or add a custom research item for now.":"Catalog lookup is unavailable. The entered number can still be recorded."});
  const hits=resource.data||[],error=resource.error,loading=resource.loading;
  return (
    <div className="catalog-part-field">
      <label>
        Manufacturer / OEM number or catalog search
        <input
          aria-label="Manufacturer / OEM number or catalog search"
          name="number"
          maxLength={60}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      {selected ? (
        <p className="small">
          Selected part: <strong>{selected.name}</strong> ·{" "}
          {formatPartNumber(selected.number_normalized)}
        </p>
      ) : (
        <>
          {loading && (
            <p role="status" className="small muted">
              Searching catalog…
            </p>
          )}
          {hits.length > 0 && (
            <div
              className="catalog-part-suggestions"
              aria-label="Matching catalog identities"
            >
              {hits.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => onSelect(part)}
                >
                  <code>{formatPartNumber(part.number_normalized)}</code>
                  <span>{part.name}{part.contextName && part.contextId !== contextId && <small> · {part.contextName}</small>}</span>
                </button>
              ))}
            </div>
          )}
          {error && (
            <p role="status" className="small muted">
              {error} <button type="button" className="text-link" onClick={resource.retry}>Retry lookup</button>
            </p>
          )}

        </>
      )}
    </div>
  );
}
