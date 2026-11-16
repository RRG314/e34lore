"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '../lib/supabase';
import { useApp } from '../lib/app-state';
import { sanitizeVehicle, type Vehicle } from '../data/catalog';
import {isTechnicalSection, seriesForModel, seriesHref, seriesRoute} from '../series/registry';
import { ownedSelection } from '../domain/repair-journey';
export type OwnedCar = { id: string; nickname: string; model_id: string; configuration: Vehicle };
type Cars = { cars: OwnedCar[]; activeId: string; selected?: OwnedCar; ready: boolean; loading: boolean; error: string; selectCar: (id: string) => void; retry: () => void };
const Context = createContext<Cars | null>(null);
export function OwnedCarsProvider({ children }: { children: ReactNode }) {
  const { user, authReady, setVehicle, series } = useApp();
  const userId = user && !user.is_anonymous ? user.id : '';
  const [revision, setRevision] = useState(0);
  const key = `${userId}:${series}:${revision}`;
  const [response, setResponse] = useState<{ key: string; cars: OwnedCar[]; activeId: string; error: string } | null>(null);
  const current = response?.key === key ? response : null;
  const cars = current?.cars || [];
  const activeId = current?.activeId || '';
  const selected = cars.find(c => c.id === activeId);
  useEffect(() => {
    if (!authReady || !userId) return;
    let live = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    Promise.resolve(db.from('owned_vehicles').select('id,nickname,model_id,configuration').eq('user_id', userId).order('created_at').limit(100).abortSignal(controller.signal))
      .then(({ data, error }) => {
        if (!live) return;
        if (error) { setResponse({ key, cars: [], activeId: '', error: 'Your cars could not load. Retry before saving to a car.' }); return; }
        const rows = (data || []) as OwnedCar[], p = new URLSearchParams(location.search);
        const requested = p.has('vehicle') ? p.get('vehicle') : p.get('progress_vehicle');
        let saved = null;
        try { saved = sessionStorage.getItem('e34.owned-car.v1.' + userId); } catch {}
        const { path } = seriesRoute(location.pathname.split('/').filter(Boolean));
        const shared = !!path[0] && !isTechnicalSection(path[0]);
        const eligible = shared ? rows : rows.filter(c => seriesForModel(c.model_id) === series);
        const chosen = ownedSelection(eligible.map(c => c.id), requested, saved);
        setResponse({ key, cars: rows, activeId: chosen, error: requested && !chosen ? 'That car is not available in this account. Choose one of your garage cars.' : '' });
        try { if (chosen) sessionStorage.setItem('e34.owned-car.v1.' + userId, chosen); } catch {}
      }).catch(() => { if (live) setResponse({ key, cars: [], activeId: '', error: 'Your cars could not load. Retry before saving to a car.' }); }).finally(() => clearTimeout(timeout));
    return () => { live = false; clearTimeout(timeout); controller.abort(); };
  }, [authReady, userId, key]);
  useEffect(() => { if (selected && seriesForModel(selected.model_id)===series) setVehicle(sanitizeVehicle(selected.configuration)); }, [selected, setVehicle, series]);
  const selectCar = useCallback((id: string) => {
    if (id && !current?.cars.some(c => c.id === id)) return;
    const chosen = current?.cars.find(car => car.id===id);
    const activeSeries = chosen && seriesForModel(chosen.model_id);
    const {path} = seriesRoute(location.pathname.split('/').filter(Boolean));
    if (activeSeries && activeSeries!==series && (!path.length || isTechnicalSection(path[0]))) {
      location.assign(seriesHref('/'+path.join('/'),activeSeries)+'?vehicle='+encodeURIComponent(id));
      return;
    }
    setResponse(old => {
      if (!old || old.key !== key || (id && !old.cars.some(c => c.id === id))) return old;
      return { ...old, activeId: id, error: '' };
    });
    try { if (id) sessionStorage.setItem('e34.owned-car.v1.' + userId, id); else sessionStorage.removeItem('e34.owned-car.v1.' + userId); } catch {}
    const url = new URL(location.href);
    if (url.searchParams.has('vehicle') || url.searchParams.has('progress_vehicle')) {
      url.searchParams.delete('progress_vehicle'); url.searchParams.delete('scan');
      if (id) url.searchParams.set('vehicle', id); else url.searchParams.delete('vehicle');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }, [key, userId, current, series]);
  const ready = authReady && (!userId || !!current);
  return <Context.Provider value={{ cars, activeId, selected, ready, loading: !ready, error: current?.error || '', selectCar, retry: () => setRevision(n => n + 1) }}>{children}</Context.Provider>;
}
export function useOwnedCars() {
  const context = useContext(Context);
  if (!context) throw Error('OwnedCarsProvider is required');
  return context;
}
