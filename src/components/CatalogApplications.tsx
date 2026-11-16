"use client";
import { catalogOrderingRows } from "../lib/catalog-integrity";
import {useKeyedResource} from "../hooks/use-keyed-resource";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { db } from "./context";
import { catalogPositionHref } from "../domain/catalog";
type Listing = {
  id: string;
  context_id: string;
  assembly_id: string;
  reference: string;
  assemblies: { title: string };
  vehicle_catalog_contexts: { name: string };
};
export function CatalogApplications({
  partId,
  currentPosition,
}: {
  partId: string;
  currentPosition?: string;
}) {
  return <ApplicationListings key={JSON.stringify([partId,currentPosition])} partId={partId} currentPosition={currentPosition}/>;
}
function ApplicationListings({partId,currentPosition}:{partId:string;currentPosition?:string}){
  const [page,setPage]=useState(0),limit=(page+1)*10;
  const resource=useKeyedResource<{rows:Listing[];more:boolean}>(JSON.stringify([partId,currentPosition,limit]),async signal=>{
    const rows: Listing[]=[];
    const pageSize=100;
    for(let from=0;;from+=pageSize){
      let query=db.from("part_assembly_positions").select("id,context_id,assembly_id,reference,assemblies(title),vehicle_catalog_contexts(name)").eq("part_id",partId).eq("active",true);
      if(currentPosition)query=query.neq("id",currentPosition);
      const result=await query.order("context_id").order("assembly_id").order("id").range(from,from+pageSize-1).abortSignal(signal);
      if(result.error)throw result.error;
      rows.push(...catalogOrderingRows((result.data||[]) as unknown as Listing[]));
      if(rows.length>limit||(result.data||[]).length<pageSize)break;
    }
    return {rows:rows.slice(0,limit),more:rows.length>limit};
  },{failureMessage:"Other source listings could not be loaded."});
  const rows=resource.data?.rows||[],more=resource.data?.more||false,loading=resource.loading,error=resource.error;
  return (
    <section className="catalog-applications">
      <h3>Other catalog listings</h3>
      <p className="small muted">
        Occurrences of this BMW number in the imported catalogs. Each listing
        retains its own conditions.
      </p>
      {rows.map((row) => (
        <a key={row.id} href={catalogPositionHref(row)}>
          <span>
            <strong>{row.vehicle_catalog_contexts.name}</strong>
            <small>
              {row.assemblies.title} · position {row.reference}
            </small>
          </span>
          <ArrowUpRight size={13} />
        </a>
      ))}
      {error && <p role="status">{error} <button className="text-link" onClick={resource.retry}>Retry source listings</button></p>}
      {loading && (
        <p role="status" className="small muted">
          Loading source listings…
        </p>
      )}
      {!loading && !error && !rows.length && (
        <p className="small muted">
          No other active source positions are registered.
        </p>
      )}
      {more && (
        <button
          className="text-link"
          disabled={loading}
          onClick={() => setPage((p) => p + 1)}
        >
          More source listings
        </button>
      )}
    </section>
  );
}
