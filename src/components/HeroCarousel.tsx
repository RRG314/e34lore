"use client";

import { DocumentLink } from './DocumentLink';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, ArrowUpRight } from 'lucide-react';
import e34Photos from '../data/hero-photos.json';
import e30Photos from '../data/e30-hero-photos.json';
import { useApp } from './context';
import { seriesDefinitions } from '../series/registry';
import { demoAssets } from '../lib/backend';
import vehicleReferences from '../../data/digital-twin/vehicle-references.json';

const WorkshopDemo = lazy(() => import('./WorkshopDemo').then(m => ({ default: m.WorkshopDemo })));

export function HeroCarousel() {
    const { series } = useApp();
    const seriesCode = series.toUpperCase();
    const photos = series === 'e30' ? e30Photos : e34Photos;
    const label = demoAssets ? 'Workshop demonstration' : series === 'e30' ? '1991 325i Coupe' : '1995 525i';
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [reduced, setReduced] = useState(true);
    const [hidden, setHidden] = useState(false);
    const stop = useCallback(() => setPaused(true), []);
    const count = photos.length + 1;
    const photo = index ? photos[index - 1] : null;
    const photoReference = photo && (series === 'e34'
        ? vehicleReferences.find(reference => reference.model === photo.model && reference.body === photo.bodyStyle)?.id
        : photo.id === 'e30-325i-coupe' ? seriesDefinitions.e30.reference : null);
    const photoLink = photoReference ? '/workshop?reference=' + encodeURIComponent(photoReference)
        : photo ? '/models/' + encodeURIComponent(photo.model) : '/workshop';

    useEffect(() => {
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(media.matches);
        const visibility = () => setHidden(document.hidden);
        update();
        visibility();
        media.addEventListener('change', update);
        document.addEventListener('visibilitychange', visibility);
        return () => {
            media.removeEventListener('change', update);
            document.removeEventListener('visibilitychange', visibility);
        };
    }, []);
    const rotating = count > 1 && !paused && !hovered && !reduced && !hidden;
    useEffect(() => {
        if (!rotating) return;
        const timer = setTimeout(() => setIndex(i => (i + 1) % count), index === 0 ? 16000 : 8000);
        return () => clearTimeout(timer);
    }, [rotating, index, count]);

    function advance(direction: number) {
        stop();
        setIndex(i => (i + direction + count) % count);
    }

    function chooseSlide(next: number) {
        stop();
        setIndex(next);
    }

    function toggleRotation() {
        if (reduced) {
            setReduced(false);
            setPaused(false);
        } else {
            setPaused(value => !value);
        }
    }

    return (
        <section
            className="hero-photo"
            aria-roledescription="carousel"
            aria-label={'Explore the BMW ' + seriesCode}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={event => {
                if (!(event.target as HTMLElement).closest('[data-rotation-toggle]')) stop();
            }}
        >
            <div className="hero-slide-media">
                {photo ? (
                    <div className="hero-image-frame">
                        <img key={photo.id} src={photo.localPath} alt={photo.alt} width={photo.width} height={photo.height} fetchPriority={index === 1 ? 'high' : 'auto'}/>
                        <div className="photo-top">
                            <span>{seriesDefinitions[series].designation.toUpperCase()}</span>
                            <span>{photo.bodyStyle.toUpperCase()}</span>
                        </div>
                    </div>
                ) : (
                    <Suspense fallback={<div className="hero-demo-placeholder" role="status">Loading the interactive {seriesCode}…</div>}>
                        <WorkshopDemo onInteraction={stop}/>
                    </Suspense>
                )}
            </div>
            <div className="photo-bottom" aria-live={rotating ? 'off' : 'polite'}>
                {photo ? (
                    <>
                        <p>
                            <strong>{series === 'e30' ? photo.title : 'BMW ' + photo.model + ' · ' + seriesCode}</strong><br/>
                            {photo.bodyStyle} / {index + 1} of {count}
                        </p>
                        <div className="hero-photo-credit">
                            <DocumentLink className="hero-workshop-link" href={photoLink}>
                                {photoReference ? 'Open 3D reference' : 'View model references'} <ArrowUpRight size={15}/>
                            </DocumentLink><br/>
                            <a href={photo.filePageUrl} target="_blank" rel="noreferrer">Photo: {photo.creator}</a><br/>
                            <a href={photo.licenseUrl} target="_blank" rel="noreferrer" title={photo.changes}>{photo.license}</a>
                            {series === 'e30' && <> · Resized for web</>}
                        </div>
                    </>
                ) : (
                    <>
                        <p><strong>{label} · Interactive reference</strong><br/>Rotate, zoom and explore the assembled car.</p>
                        <DocumentLink className="hero-workshop-link" href="/workshop">
                            Open the full workshop <ArrowUpRight size={15}/>
                        </DocumentLink>
                    </>
                )}
            </div>
            {count > 1 && (
                <div className="hero-carousel-controls">
                    <button aria-label="Previous hero slide" onClick={() => advance(-1)}><ChevronLeft size={18}/></button>
                    <div className="hero-slide-buttons">
                        <button aria-label={'Show interactive ' + seriesCode + ' demo'} aria-current={index === 0 ? 'true' : undefined} onClick={() => chooseSlide(0)}>3D</button>
                        {photos.map((item, i) => (
                            <button key={item.id} aria-label={'Show ' + item.title} aria-current={i + 1 === index ? 'true' : undefined} onClick={() => chooseSlide(i + 1)}>
                                {String(i + 1).padStart(2, '0')}
                            </button>
                        ))}
                    </div>
                    <button aria-label="Next hero slide" onClick={() => advance(1)}><ChevronRight size={18}/></button>
                    <button data-rotation-toggle aria-label={paused || reduced ? 'Play slideshow' : 'Pause slideshow'} onClick={toggleRotation}>
                        {paused || reduced ? <Play size={15}/> : <Pause size={15}/>}
                    </button>
                </div>
            )}
        </section>
    );
}
