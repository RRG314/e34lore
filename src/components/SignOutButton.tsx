"use client";
import { useRef, useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { db } from './context';
import { authStorageKey } from '../lib/supabase';
import { clearAccountStorage, signOutBrowser } from '../lib/account-actions';
export function SignOutButton() { const [busy, setBusy] = useState(false), mounted = useRef(true); useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []); return <button className="button outline" disabled={busy} onClick={async () => { if (busy)
    return; setBusy(true); await signOutBrowser(db.auth, () => { try {
    clearAccountStorage(localStorage, authStorageKey);
    clearAccountStorage(sessionStorage, authStorageKey);
}
catch { } }); if (mounted.current)
    setBusy(false); window.location.replace('/account?notice=signed-out'); }}><LogOut size={16}/>{busy ? 'Signing out…' : 'Sign out'}</button>; }
