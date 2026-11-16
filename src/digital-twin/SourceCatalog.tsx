"use client";
import {useKeyedResource} from "../hooks/use-keyed-resource";
import type {CatalogContext} from "../domain/catalog";
import { useState } from "react";
import { db } from "../components/context";
export function SourceCatalog({ area }: { area: string }) {
  return <SourceCatalogArea key={area} area={area}/>;
}
const areaTerms:Record<string,string>={engine:'engine',cooling:'cooling','engine-accessories':'engine','front-suspension':'front suspension','rear-suspension':'rear suspension',brakes:'brake',electrical:'electrical',fuel:'fuel',hvac:'air conditioning',steering:'steering',transmission:'transmission'};
type Context=Pick<CatalogContext,'id'|'name'|'model_id'|'model_year'|'body'|'engine'>;
type SourceAssembly={id:string;title:string;source_category:string;technical_drawings:{remote_url:string|null}[]};
function SourceCatalogArea({area}:{area:string}){
  const [chosenContext,setContextId]=useState(''),[filter,setFilter]=useState(areaTerms[area]||''),[limit,setLimit]=useState(8);
  const contextResource=useKeyedResource<Context[]>('source-contexts',async signal=>{
    const r=await db.from('vehicle_catalog_contexts').select('id,name,model_id,model_year,body,engine').order('model_id').order('model_year').abortSignal(signal);
    if(r.error)throw r.error;return r.data||[];
  },{failureMessage:'Catalog sources could not load.'});
  const contexts=contextResource.data||[],contextId=contexts.find(c=>c.id===chosenContext)?.id||contexts.find(c=>c.model_id==='525i'&&c.model_year===1994&&c.body==='Sedan')?.id||contexts[0]?.id||'';
  const assemblyResource=useKeyedResource<SourceAssembly[]>(contextId,async signal=>{
    const r=await db.from('assemblies').select('id,title,source_category,technical_drawings(remote_url)').eq('catalog_context_id',contextId).order('title').limit(1000).abortSignal(signal);
    if(r.error)throw r.error;return r.data||[];
  },{enabled:!!contextId,failureMessage:'This source catalog could not load.'});
  const assemblies=assemblyResource.data||[],error=contextResource.error||assemblyResource.error;
  const rows = assemblies.filter((a) =>
    (a.title + " " + a.source_category)
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <section className="twin-source-catalog">
      <div className="twin-panel-title">
        <div>
          <span className="eyebrow">SOURCE DRAWINGS & SMALL PARTS</span>
          <h2>Assembly catalog</h2>
        </div>
        <span>{rows.length} matching assemblies</span>
      </div>
      <p>
        Select a catalog vehicle independently. The drawing’s production
        conditions determine applicability; a workshop reference configuration
        does not certify fitment.
      </p>
      <div className="twin-catalog-filters">
        <label>
          Catalog source selection
          <select
            aria-label="Workshop catalog source"
            value={contextId}
            onChange={(e) => {
              setContextId(e.target.value);
              setLimit(8);
            }}
          >
            {contexts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Find an assembly
          <input
            aria-label="Filter workshop source assemblies"
            placeholder="Engine, cylinder, oil pump…"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setLimit(8);
            }}
          />
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="twin-catalog-grid">
        {rows.slice(0, limit).map((a) => {const drawing=a.technical_drawings.find(d=>d.remote_url);return (
          <a
            key={a.id}
            href={
              "/parts/catalog?context=" +
              encodeURIComponent(contextId) +
              "&assembly=" +
              encodeURIComponent(a.id)
            }
          >
            {drawing?.remote_url ? (
              <img
                loading="lazy"
                src={
                  drawing!.remote_url!
                }
                alt={a.title + " source drawing"}
              />
            ) : (
              <div className="twin-drawing-pending">
                Source image unavailable
              </div>
            )}
            <small>{a.source_category} · 2D catalog drawing</small>
            <strong>{a.title}</strong>
            <span>Callouts, quantities and part numbers ↗</span>
          </a>
        );})}
      </div>
      {!rows.length && !error && (
        <p>
          {assemblies.length
            ? "No assemblies match. Try a shorter component name."
            : "Loading source assemblies…"}
        </p>
      )}
      {rows.length > limit && (
        <button className="button" onClick={() => setLimit((x) => x + 8)}>
          Show more assemblies
        </button>
      )}
    </section>
  );
}
