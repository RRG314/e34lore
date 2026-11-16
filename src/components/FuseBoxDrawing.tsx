'use client';

import {ArrowLeft,ArrowUpRight} from 'lucide-react';
import {useEffect,useRef} from 'react';
import type {FusePanelDrawing} from '../data/fuse-panel-layouts';

export type FuseRow={number:number;panel:string;amps:number|null;status:string;circuits:string;source:string;chart?:string};
export function FuseButton({fuse,selected,onSelect}:{
  fuse:FuseRow;selected?:number;onSelect:(fuse:FuseRow)=>void;
}) {
  return <button type="button" data-rating={fuse.amps??'none'} aria-controls="fuse-circuit"
    aria-label={`Fuse F${fuse.number}, ${fuse.amps ? fuse.amps+' amps' : fuse.status}`}
    aria-pressed={fuse.number===selected} onClick={()=>onSelect(fuse)}>
    <strong>F{fuse.number}</strong><span>{fuse.amps ? fuse.amps+' A' : '—'}</span>
  </button>;
}
export function FuseBoxDrawing({layout,positions,selected,onSelect}:{
  layout:FusePanelDrawing;positions:FuseRow[];selected?:number;onSelect:(fuse:FuseRow)=>void;
}) {
  const scrollRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const region=scrollRef.current;
    const active=region?.querySelector('button[aria-pressed="true"]');
    if(!region||!active)return;
    const viewport=region.getBoundingClientRect();
    const button=active.getBoundingClientRect();
    if(button.left<viewport.left||button.right>viewport.right)
      region.scrollLeft+=button.left-viewport.left-(region.clientWidth-button.width)/2;
  },[selected,layout]);
  const byNumber=new Map(positions.map(fuse=>[fuse.number,fuse]));
  return <figure className="qr-factory-figure">
    <figcaption>{layout.label}</figcaption>
    {layout.frontOfCar&&<p className="qr-fuse-orientation"><ArrowLeft size={15}/> Front of car</p>}
    <div ref={scrollRef} className="qr-panel-scroll" tabIndex={0} role="region" aria-label="Physical fuse box layout"
      aria-description="Scroll sideways to see all positions.">
      <div className="qr-panel-drawing" style={{width:layout.width,height:layout.height}}>
        {layout.banks.map(bank=><div className={'qr-fuse-grid qr-physical-bank'+(bank.vertical?' vertical':'')}
          key={bank.numbers[0]} aria-label={`Fuse positions ${bank.numbers[0]} to ${bank.numbers.at(-1)}`}
          style={{left:bank.x+'%',top:bank.y+'%',width:bank.width+'%',gridTemplateColumns:bank.vertical?'1fr':`repeat(${bank.numbers.length},1fr)`}}>
          {bank.holder&&<span className="qr-fuse-holder">{bank.holder}</span>}
          {bank.numbers.map(number=>{
            const fuse=byNumber.get(number);
            return fuse?<FuseButton key={number} fuse={fuse} selected={selected} onSelect={onSelect}/>:<span key={number}>F{number}</span>;
          })}
        </div>)}
        {layout.modules.map(([label,x,y,width,height],index)=>
          <div key={index} className="qr-layout-module" style={{left:x+'%',top:y+'%',width:width+'%',height:height+'%'}}>{label}</div>)}
      </div>
    </div>
    <div className="qr-links">
      <a href={layout.figure} target="_blank" rel="noopener noreferrer">Open BMW’s layout drawing <ArrowUpRight size={14}/></a>
      <a href={layout.chart} target="_blank" rel="noopener noreferrer">Open BMW’s fuse chart <ArrowUpRight size={14}/></a>
    </div>
  </figure>;
}
