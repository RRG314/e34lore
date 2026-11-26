"use client";
import { useState } from "react";
import { ComponentWorkspace } from "../servicing/ComponentWorkspace";
import { componentHref, type ComponentPartIdentity } from "../servicing/context";
import type { Journey } from "../domain/repair-journey";
import type { Vehicle } from "../data/catalog";
import { navigateDocument } from "./DocumentLink";

/** The canonical number, source scope and actual garage journey travel together. */
export function PartWorkspace({ part, vehicle, navigation, initialReference,initialModelRevision }: { part: ComponentPartIdentity; vehicle: Vehicle; navigation: Journey; initialReference?: string;initialModelRevision?:number }) {
  const [selected, setSelected] = useState(part);
  const [context, setContext] = useState({ referenceId: initialReference || "", sourcePositionId: part.positionId || "",modelRevision:initialModelRevision||null });
  return <div className="part-workspace">
    <ComponentWorkspace anchor={part} selected={selected} vehicle={vehicle} navigation={navigation} context={context} onContextChange={patch => {
      setContext(old => ({ ...old, ...patch }));
      const url=new URL(location.href);url.searchParams.set('workspace','part');
      if(patch.sourcePositionId)url.searchParams.set('position',patch.sourcePositionId);
      if(patch.modelRevision)url.searchParams.set('model_revision',String(patch.modelRevision));
      else if(patch.modelRevision===null)url.searchParams.delete('model_revision');
      if(patch.referenceId)url.searchParams.set('reference',patch.referenceId);
      if(patch.sourceAssemblyId)url.searchParams.set('assembly',patch.sourceAssemblyId);
      if(patch.sourceContextId)url.searchParams.set('context',patch.sourceContextId);
      history.replaceState(null,'',url.pathname+url.search+url.hash);
    }} onSelect={next => {
      if (next.id === part.id) { setSelected(next); return; }
      navigateDocument(componentHref({ partId: next.id, positionId: next.positionId, assemblyId: next.assemblyId, catalogContextId: next.contextId, referenceId: context.referenceId,modelRevision:context.modelRevision||undefined }, {vehicle:navigation.vehicle}));
    }}/>
  </div>;
}
