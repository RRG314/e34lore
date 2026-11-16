"use client";
import {track} from "../analytics/client";
import { DocumentLink } from "./DocumentLink";
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { useApp } from './context';
import { canOpenPanels, defaultView, toggleOpening, type OpeningPanel, type ReferenceModel } from '../digital-twin/public/model';
import { loadReference } from '../digital-twin/public/load-reference';
import { seriesDefinitions } from '../series/registry';
import type { ReferenceRenderer } from '../digital-twin/public/renderer';
export function WorkshopDemo({ onInteraction }: {
    onInteraction: () => void;
}) {
    const host = useRef<HTMLDivElement>(null), renderer = useRef<ReferenceRenderer | null>(null);
    const {series}=useApp();
    const referenceId = seriesDefinitions[series].reference;
    const seriesCode = series.toUpperCase();
    const [model, setModel] = useState<ReferenceModel | null>(null);
    const [view, setView] = useState(defaultView), [status, setStatus] = useState('Loading the 3D ' + seriesCode + '…'), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        const abort = new AbortController();
        const deadline = setTimeout(() => abort.abort(), 20000);
        const select = (id: string) => {
            track('component_select', 'node:' + id);
            onInteraction();
        };
        Promise.all([loadReference(abort.signal, undefined, referenceId), import('../digital-twin/public/renderer')])
            .then(([loadedModel, module]) => {
                if (!active || !host.current) return;
                setModel(loadedModel);
                renderer.current = new module.ReferenceRenderer(host.current, loadedModel, defaultView(),
                    id => {
                        select(id);
                        setView(view => ({ ...view, selected: id }));
                    },
                    (text, error = false) => {
                        if (!active) return;
                        setStatus(text);
                        setFailed(error);
                    },
                    undefined,
                    id => {
                        select(id);
                        setView(view => toggleOpening(loadedModel, { ...view, selected: id }, id));
                    },
                );
            }).catch(() => {
                if (!active) return;
                setStatus('The 3D preview could not load. Try again or open the workshop.');
                setFailed(true);
            }).finally(() => clearTimeout(deadline));
        return () => {
            active = false;
            clearTimeout(deadline);
            abort.abort();
            renderer.current?.dispose();
            renderer.current = null;
        };
    }, [retry, onInteraction, referenceId]);
    useEffect(() => { renderer.current?.update(view); }, [view]);
    const selected = model?.nodes.find(n => n.id === view.selected);
    function reassemble() {
        onInteraction();
        setView(defaultView());
        requestAnimationFrame(() => renderer.current?.viewpoint('overview'));
    }
    function choosePanel(panel: OpeningPanel) {
        if (!model) return;
        const opening = !view.openPanels?.includes(panel.id);
        onInteraction();
        const cabin = opening && panel.label === 'Glove box';
        setView(view => toggleOpening(model, { ...view, selected: panel.id, cabin: cabin ? 'driver' : null }, panel.id));
        const camera = panel.camera;
        if (opening && camera) requestAnimationFrame(() => renderer.current?.restoreCamera({ ...camera, fov: 48 }));
        else if (view.cabin) requestAnimationFrame(() => renderer.current?.viewpoint('overview'));
    }
    return <div className="hero-workshop-demo" onPointerDown={onInteraction} onWheel={onInteraction} onKeyDown={onInteraction}>
        <div className="hero-demo-stage">
            <div className="hero-demo-canvas" ref={host}/>
            <div className="hero-demo-label"><span className="eyebrow">EXPLORE THE {seriesCode}</span><strong>Take it apart. Put it together.</strong></div>
            {status && <div className="hero-demo-loading" role="status"><span>{status}</span>{failed && <button className="button outline" onClick={() => {
                setStatus('Loading the 3D ' + seriesCode + '…');
                setFailed(false);
                setModel(null);
                setView(defaultView());
                setRetry(r => r + 1);
            }}>Retry 3D preview</button>}</div>}
            {!status && <p className="hero-demo-hint">{model?.openingPanels?.length && canOpenPanels(view) ? 'Drag to rotate · tap a panel to open it' : 'Drag to rotate · scroll or pinch to zoom'}</p>}
            {selected && <DocumentLink className="hero-demo-part" href={'/workshop?' + new URLSearchParams({ reference: referenceId, node: selected.id })}>
                {selected.name.replace(/ reference$| envelope only$/g, '')} <ArrowUpRight size={13}/>
            </DocumentLink>}
        </div>
        <div className="hero-demo-controls">
            <label htmlFor="hero-separation">Assembled</label>
            <input aria-label="Demo exploded view separation" id="hero-separation" type="range" min={0} max={4} step={.01} value={view.explosion} disabled={!!status}
                onChange={event => {
                    onInteraction();
                    setView(view => ({ ...view, explosion: Number(event.target.value), openPanels: [], cabin: null }));
                }}
                onPointerUp={() => { track('explode', '/', { value: view.explosion }); renderer.current?.fit(); }}
                onKeyUp={event => {
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
                        track('explode', '/', { value: view.explosion });
                        renderer.current?.fit();
                    }
                }}/>
            <span>Exploded</span>
            {!status && !!model?.openingPanels?.length && canOpenPanels(view) && <select aria-label="Open or close a demo panel" value="" onChange={event => {
                const panel = model.openingPanels?.find(panel => panel.id === event.target.value);
                if (panel) choosePanel(panel);
            }}>
                <option value="">Panels</option>
                {model.openingPanels.map(panel => <option value={panel.id} key={panel.id}>
                    {view.openPanels?.includes(panel.id) ? 'Close ' : 'Open '}{panel.label.toLowerCase()}
                </option>)}
            </select>}
            <button aria-label="Reassemble demo car" title="Reassemble" onClick={reassemble}><RotateCcw size={16}/></button>
        </div>
    </div>;
}
