"use client";
import { DocumentLink } from "../../components/DocumentLink";

import { lazy, Suspense, useEffect, useState } from 'react';
import { db, useApp } from '../../components/context';
import { PageIntro } from '../../components/common';
import { reconstructionAccess } from './access';
const Legacy = lazy(() => import('../Workshop').then(m => ({ default: m.Workshop })));
export function PrivateWorkshop({ assets = false, archive = false, initialPart, initialNode, initialRevisionId }: {
    assets?: boolean;
    archive?: boolean;
    initialPart?: string;
    initialNode?: string;
    initialRevisionId?: string;
}) {
    const { user, authReady, authRevision } = useApp();
    const key = (user?.id || 'guest') + ':' + authRevision;
    const [permission, setPermission] = useState<{
        key: string;
        allowed: boolean;
        error: string;
    } | null>(null);
    useEffect(() => { if (!assets || !user || user.is_anonymous)
        return; let active = true; const abort = new AbortController(), deadline = setTimeout(() => abort.abort(), 10000); Promise.all([db.rpc('current_permissions').abortSignal(abort.signal), db.auth.mfa.getAuthenticatorAssuranceLevel()]).then(([roles, aal]) => { if (!active)
        return; if (roles.error || aal.error)
        throw Error('Staff access could not be verified.'); setPermission({ key, allowed: reconstructionAccess(roles.data, aal.data?.currentLevel || null), error: '' }); }).catch(() => { if (active)
        setPermission({ key, allowed: false, error: 'Staff access could not be verified. Refresh this page after signing in.' }); }).finally(() => clearTimeout(deadline)); return () => { active = false; abort.abort(); clearTimeout(deadline); }; }, [assets, user, key]);
    if (!archive && !authReady)
        return <div className="page" role="status">Checking your account…</div>;
    if (!archive && (!user || user.is_anonymous))
        return <div className="page narrow"><PageIntro eyebrow="E34 LORE / ACCOUNT" description="Private workshop access." title={assets ? 'Staff workspace.' : 'Your saved inspections.'}/><p>{assets ? 'This workspace is restricted to authorized staff.' : 'Sign in to open your private workshop inspections.'}</p><a className="button" href={'/account?next=' + encodeURIComponent(assets ? '/manage/models' : '/workshop/inspections')}>Sign in</a></div>;
    if (assets && permission?.key !== key)
        return <div className="page" role="status">Checking staff access…</div>;
    if (assets && !permission?.allowed)
        return <div className="page narrow"><PageIntro eyebrow="E34 LORE / STAFF" title="Staff workspace." description="Source and reconstruction records."/><p>{permission?.error || 'This page requires an authorized staff account and authenticator verification.'}</p><DocumentLink className="button outline" href="/account">Account security</DocumentLink><DocumentLink className="text-link" href="/workshop?mode=explore">Return to the car explorer</DocumentLink></div>;
    return <><div className="page reference-legacy-link"><DocumentLink href="/workshop?mode=explore">← Return to the updated car explorer</DocumentLink></div><Suspense fallback={<p className="page">Loading your workshop…</p>}><Legacy readOnly={archive} assets={assets} initialPart={initialPart} initialNode={initialNode} initialRevisionId={initialRevisionId}/></Suspense></>;
}
