"use client";
import { displayCatalogModels, seriesInventory } from "../series/catalog";
import { correctedCatalogInventory } from "./catalog-integrity";
import { useEffect, useState } from 'react';
import { useApp } from '../components/context';
import { preferredCatalogContext, catalogContextMatch, type CatalogContext } from '../domain/catalog';
export function useVehicleCatalog() {
    const { vehicle, vehicleReady, series } = useApp();
    const [state, setState] = useState<{
        rows: CatalogContext[];
        loading: boolean;
        error: string;
    }>({ rows: [], loading: true, error: '' });
    const [revision, retry] = useState(0);
    useEffect(() => { const abort = new AbortController(), deadline = setTimeout(() => abort.abort(), 12000); let active = true; Promise.resolve(seriesInventory(series).order('model_id').order('model_year').abortSignal(abort.signal)).then(({ data, error }) => { if (active)
        setState({ rows: error ? [] : correctedCatalogInventory(displayCatalogModels((data || []) as CatalogContext[])), loading: false, error: error ? 'Vehicle catalogs could not load. Please try again.' : '' }); }).catch(() => { if (active)
        setState({ rows: [], loading: false, error: 'Vehicle catalogs could not load. Please try again.' }); }).finally(() => clearTimeout(deadline)); return () => { active = false; clearTimeout(deadline); abort.abort(); }; }, [revision,series]);
    const context = vehicle.model ? preferredCatalogContext(state.rows, vehicle) : undefined;
    const candidates=state.rows.filter(c=>catalogContextMatch(c,vehicle)!=="different");
    const ambiguous=!!vehicle.model&&!context&&candidates.length>0;
    return { ...state, context, candidates,ambiguous, ready: vehicleReady && !state.loading, missing: vehicleReady && !state.loading && !state.error && !!vehicle.model && !context, retry: () => {setState(s => ({...s,loading:true,error:''}));retry(r => r + 1);} };
}
