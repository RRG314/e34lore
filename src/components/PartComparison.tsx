/* eslint-disable @next/next/no-img-element -- Attributed reference images load from the original provider; no proxy or copied product photos. */
'use client';
import { useCallback, useEffect, useState } from 'react';
import { ImageOff, Maximize2 } from 'lucide-react';
import { useApprovedPartImage } from "./ApprovedPartImage";
import { Modal } from './common';
import { DocumentLink } from './DocumentLink';
import { numberPhotograph, familyThumbnail } from '../servicing/part-media';
import { formatPartNumber } from '../domain/fitment';
import type { Series } from '../series/registry';
import type { TechnicalDrawing } from '../data/diagrams';

type Crop = { viewBox: string; width: number; height: number };
export function ComparisonImage({ src, alt, crop, thumbnail = false }: { src?: string; alt: string; crop?: Crop; thumbnail?: boolean }) {
  const [loaded,setLoaded]=useState(false), [failed, setFailed] = useState(false), [open, setOpen] = useState(false), [attempt, setAttempt] = useState(0), [zoom, setZoom] = useState(1);
  const imageRef = useCallback((image: HTMLImageElement | null) => { if(image?.complete){if(image.naturalWidth)setLoaded(true);else setFailed(true);} }, []);
  useEffect(()=>{if(!src||loaded||failed||thumbnail)return;const timer=setTimeout(()=>setFailed(true),20000);return()=>clearTimeout(timer);},[src,loaded,failed,attempt,thumbnail]);
  if (!src || failed) return <div className={thumbnail ? 'part-choice-image missing' : 'part-comparison-image missing'}>
    <ImageOff size={thumbnail ? 20 : 28}/><span>{failed ? 'Image unavailable' : 'No image linked'}</span>
    {failed && !thumbnail && <button type="button" className="text-link" onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>Retry image</button>}
  </div>;
  const image = crop ? <><svg viewBox={crop.viewBox} role="img" aria-label={alt}><image href={src} width={crop.width} height={crop.height}/></svg><img className="sr-only" ref={imageRef} src={src} alt="" onLoad={()=>setLoaded(true)} onError={() => setFailed(true)}/></> : <img ref={imageRef} key={attempt} src={src} alt={alt} loading={thumbnail?'lazy':'eager'} referrerPolicy="no-referrer" onLoad={()=>setLoaded(true)} onError={() => setFailed(true)}/>;
  if (thumbnail) return <span className="part-choice-image">{image}</span>;
  return <><button className="part-comparison-image" type="button" disabled={!loaded} aria-label={'Enlarge ' + alt} onClick={() => { setZoom(1); setOpen(true); }}>{image}{!loaded&&<span className="part-image-loading" role="status">Loading image…</span>}<span className="part-image-enlarge"><Maximize2 size={13}/>Enlarge</span></button>
    {open && <Modal wide title={alt} onClose={() => setOpen(false)}><div className="part-image-zoom-controls"><button type="button" className="button outline" disabled={zoom <= 1} onClick={() => setZoom(n => Math.max(1, n - .5))}>Zoom out</button><span>{Math.round(zoom * 100)}%</span><button type="button" className="button outline" disabled={zoom >= 3} onClick={() => setZoom(n => Math.min(3, n + .5))}>Zoom in</button></div><div className="part-comparison-enlarged" tabIndex={0} aria-label="Enlarged reference; scroll to pan">{crop ? <svg style={{ width: zoom * 100 + '%' }} viewBox={crop.viewBox} role="img" aria-label={alt}><image href={src} width={crop.width} height={crop.height}/></svg> : <img style={{ width: zoom * 100 + '%' }} src={src} alt={alt} referrerPolicy="no-referrer" onError={() => { setOpen(false); setFailed(true); }}/>}</div><p className="small muted">Compare the shape and mounting features with the actual part.</p></Modal>}
  </>;
}
export function PartChoiceImage({ number, family }: { number?: string; family?: string }) {
  const photo = number ? numberPhotograph(number) : family ? familyThumbnail(family) : undefined;
  return <ComparisonImage key={photo?.image || number || family} src={photo?.image} thumbnail alt={number ? 'Catalog reference for BMW ' + formatPartNumber(number) : 'Reference example of ' + (family || 'part').replaceAll('-', ' ')}/>;
}
export function bearingManualReference(number: string, series: Series = 'e34') {
  if (!['26121226657','26121225002','26121225071','26121226723'].includes(number)) return null;
  if (series === 'e30') {
    if (!['26121225071','26121226723'].includes(number)) return null;
    const href = 'https://e30mpower.com/26%20-%20Propellor%20Shaft/26-10.jpg';
    return { title: 'Propeller shaft center mount replacement', printed: '26-10', figure: '', publisher: 'BMW Repair Manual', href, preview: href, crop: undefined };
  }
  return { publisher: 'Bentley Publishers', title: 'Center bearing removal' , printed: '260-8', figure: '12', href: '/manual/260?pdf=268',
    // Owner-requested internal manual preview. Supplied page bytes never enter a production asset tree.
    preview: import.meta.env.DEV ? '/source-preview/manual/center-bearing-removal.png' : undefined,
    crop: { viewBox: '25 840 500 455', width: 1130, height: 1500 },
  };
}
export function PartComparison({ number, name, drawing, positionId, sourceLabel, series = 'e34', loading = false, error = '', onRetry }: {
  number: string; name: string; series?: Series; drawing?: TechnicalDrawing; positionId?: string; sourceLabel?: string; loading?: boolean; error?: string; onRetry?: () => void;
}) {
  const photo = numberPhotograph(number), manual = bearingManualReference(number, series);
  const approvedPhoto=useApprovedPartImage(number,!photo);
  const [view, setView] = useState<'catalog' | 'manual'>('catalog');
  const spot = drawing?.hotspots.find(h => h.partIds.includes(positionId || ''));
  return <section className="part-comparison" aria-label="Part and source image comparison">
    <div className="part-comparison-heading"><h3>Compare the reference images</h3><p>BMW <strong>{formatPartNumber(number)}</strong> · {name}</p></div>
    <div className="part-comparison-panels">
      <figure><figcaption><strong>Loose part</strong><span>Catalog product reference</span></figcaption>
        <div className="part-comparison-tab-spacer" aria-hidden="true"/>
        <ComparisonImage key={photo?.image || number} src={photo?.image||approvedPhoto} alt={'Loose part · BMW ' + formatPartNumber(number)}/>
        <p className="part-comparison-number">{formatPartNumber(number)}</p>
        <p className="small">{photo?.kind === 'provider-image' ? photo.label : name}</p>
        {approvedPhoto?<p className="small">Owner-contributed catalog reference · reviewed</p>:photo ? <DocumentLink className="text-link" href={photo.source} target="_blank" rel="noopener noreferrer">Original photo & part details ↗</DocumentLink> : <p className="small muted">A loose-part photograph is not linked to this number yet. The source illustration can still be checked.</p>}
      </figure>
      <figure><figcaption><strong>{view === 'catalog' ? 'Catalog diagram' : 'Service manual'}</strong><span>{view === 'catalog' ? 'Assembly and numbered positions' : 'Page ' + manual?.printed + (manual?.figure ? ' · Fig. ' + manual.figure : '')}</span></figcaption>
        <div className="part-comparison-tabs" aria-label="Comparison illustration"><button type="button" aria-pressed={view === 'catalog'} onClick={() => setView('catalog')}>Catalog</button>{manual && <button type="button" aria-pressed={view === 'manual'} onClick={() => setView('manual')}>Manual</button>}</div>
        {view === 'catalog' ? loading ? <div className="part-comparison-image missing" role="status">Loading diagram…</div> : error ? <div className="part-comparison-image missing" role="status"><span>{error}</span>{onRetry && <button type="button" className="text-link" onClick={onRetry}>Retry diagram</button>}</div> : <ComparisonImage key={drawing?.image || number} src={drawing?.image} alt={'Catalog diagram for ' + name}/>
          : manual?.preview ? <ComparisonImage key={manual.preview} src={manual.preview} crop={manual.crop} alt={manual.publisher + ' · ' + manual.printed + ' · ' + manual.title}/>
          : <div className="part-comparison-image missing"><ImageOff size={26}/><span>The manual figure is not available on this site.</span></div>}
        {view === 'catalog' ? <><p className="part-comparison-number">{spot?.label ? 'Position ' + spot.label : 'Check numbered positions'}</p>{sourceLabel && <p className="small">{sourceLabel}</p>}{drawing && <DocumentLink className="text-link" href={drawing.source} target="_blank" rel="noopener noreferrer">Original diagram ↗</DocumentLink>}</> : manual && <><p className="part-comparison-number">{manual.printed}{manual.figure && ' · Fig. ' + manual.figure}</p><p className="small">{manual.title} · {manual.publisher}</p><DocumentLink className="text-link" href={manual.href} target="_blank" rel="noopener noreferrer">Open manual reference ↗</DocumentLink></>}
      </figure>
    </div>
    <p className="small muted part-comparison-boundary">Reference images only. Compare the number, dimensions and installed hardware before choosing a replacement. Product photographs and source illustrations retain their original credits.</p>
  </section>;
}
