"use client";
import { useEffect, useSyncExternalStore } from 'react';
import { db } from './context';
import { usageArea } from '../domain/usage';
const key = 'e34.usage.enabled', event = 'e34-usage-consent';
function subscribe(callback: () => void) { window.addEventListener('storage', callback); window.addEventListener(event, callback); return () => { window.removeEventListener('storage', callback); window.removeEventListener(event, callback); }; }
function read() { try {
    return localStorage.getItem(key) === 'yes';
}
catch {
    return false;
} }
export function useUsageConsent() { return useSyncExternalStore(subscribe, read, () => false); }
/** Background recorder only. Preferences belong on the privacy page. */
export function UsageAnalytics({ path }: {
    path: string;
}) { const enabled = useUsageConsent(); useEffect(() => { if (!enabled)
    return; const area = usageArea(path); if (!area)
    return; try {
    const sessionKey = 'e34.usage.' + area, last = Number(sessionStorage.getItem(sessionKey) || 0);
    if (Date.now() - last < 30 * 60 * 1000)
        return;
    sessionStorage.setItem(sessionKey, String(Date.now()));
    db.rpc('record_usage', { area_name: area }).then(() => { });
}
catch { } }, [enabled, path]); return null; }
export function UsageConsent() { const enabled = useUsageConsent(); return <div className="privacy-choice"><label><input type="checkbox" checked={enabled} onChange={e => { try {
    localStorage.setItem(key, e.target.checked ? 'yes' : 'no');
    window.dispatchEvent(new Event(event));
}
catch { } }}/>Page activity counts</label><p>Optional totals by public section and day, kept for 90 days. Account IDs, IP addresses, searches and private-page details are not included in these counts.</p></div>; }
