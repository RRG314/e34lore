"use client";
import { DocumentLink } from "./DocumentLink";

import { lazy, Suspense, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Droplet, Layers, MapPin, Search, Zap } from "lucide-react";
import {
  referenceSections, referenceModels, referenceScope, referenceModelLabel,
  referenceModelForVehicle, fuseLocations, serviceLocations, type ServiceLocation,
} from "../data/quick-reference";
import { filterFusePositions, findFuseIn, relayLayouts, fusePanels, listedFuseCount } from "../data/fuse-reference";
import { useApp } from "./context";
import { e30ManualSources, e30Handbook } from "../series/e30-manual";
import { FuseBoxDrawing, FuseButton, type FuseRow } from "./FuseBoxDrawing";
import { e30FuseDrawing, e34FuseDrawings, e34FuseReference, usesE34FactoryFuseLayout } from "../data/fuse-panel-layouts";
import { e30FusePanel, e30FuseReference, e30FuseLocation, e30Locations } from "../series/e30-quick-reference";
import { seriesHref } from "../series/registry";
import { Notice, PageIntro } from "./common";
import { ReferenceLocationMap } from "./ReferenceLocationMap";
import { quickReferenceModelHref, quickReferenceModelTopic, quickReferenceModelTopics } from "../data/quick-reference-model";

const base = "/quick-reference";
const sectionIcons = { fluids: Droplet, fuses: Zap, locations: MapPin, model: Layers };
const WorkshopExplorer = lazy(() => import("../digital-twin/public/WorkshopExplorer").then(module => ({ default: module.WorkshopExplorer })));
const gearboxCapacities: [string, number][] = [
  ["Manual S5D 310 Z", 1.2],
  ["Manual S5D 250 G", 1],
  ["Manual 260/5 or 260/6 G", 1.25],
  ["Manual S6S 560 G", 2.3],
  ["Automatic A4S 310R", 3],
  ["Automatic A5S 310Z", 3],
  ["Automatic A5S 560Z", 5.5],
];

function updateQuery(values: Record<string, string | undefined>) {
  const url = new URL(window.location.href);
  Object.entries(values).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  });
  window.history.replaceState(window.history.state, "", url);
}

export function QuickReference({ section, query }: {
  section?: string;
  query: Record<string, string | undefined>;
}) {
  const { series } = useApp();
  const current = referenceSections.find((item) => item.id === section);
  return (
    <div className="page qr-page">
      <PageIntro eyebrow={series.toUpperCase() + " LORE / SERVICE DESK"} title={current?.title || "Quick reference"}
        description={current?.detail || "Find the right fluid, identify a fuse, or locate a component at the car."} share={section !== "model"}>
        {section !== "model" && <DocumentLink className="button outline" href={section==="fuses"?"/electrical":"/manual"}><BookOpen size={17} /> {section==="fuses"?"Wiring & Electrical":"Service manual"}</DocumentLink>}
        {!section&&<DocumentLink className="button outline" href="/repairs">Repair walkthroughs <ArrowUpRight size={16}/></DocumentLink>}
      </PageIntro>
      <nav className="qr-nav" aria-label="Quick reference sections">
        {!current ? referenceSections.map((item) => {
          const Icon = sectionIcons[item.id];
          return (
            <DocumentLink className="qr-nav-card" key={item.id} href={base + "/" + item.id}>
              <Icon size={23} />
              <div><strong>{item.title}</strong><span>{item.detail}</span></div>
              <ArrowUpRight size={17} />
            </DocumentLink>
          );
        }) : <>
          <DocumentLink href={base}>Overview</DocumentLink>
          {referenceSections.map((item) => (
            <DocumentLink key={item.id} href={base + "/" + item.id}
              aria-current={section === item.id ? "page" : undefined}>{item.title}</DocumentLink>
          ))}
        </>}
      </nav>
      {!current && <div className="qr-home-tools">
        <form className="qr-field-guide" action={seriesHref(base + "/fuses", series)}>
          <span className="eyebrow">ELECTRICAL LOOKUP</span>
          <h2>Which fuse?</h2>
          <p>Try a fuse number, wipers, horn or 12 V socket.</p>
          <label className="qr-search"><Search size={18} /><input name="q" aria-label="Fuse number or circuit" maxLength={90} placeholder="Fuse number or circuit" /></label>
          <button className="button primary">Find a fuse <ArrowRight size={16} /></button>
        </form>
        <div className="qr-field-guide">
          <span className="eyebrow">FREQUENT LOOKUPS</span>
          <h2>At the car</h2>
          <div className="qr-links">
            <DocumentLink href={base + "/fluids#engine-oil"}>Engine oil capacity <ArrowUpRight size={14} /></DocumentLink>
            <DocumentLink href={base + "/locations?point=battery-rear"}>Battery location <ArrowUpRight size={14} /></DocumentLink>
            <DocumentLink href={base + "/locations?point=tires"}>Cold tire pressure placard <ArrowUpRight size={14} /></DocumentLink>
            <DocumentLink href="/electrical">Wiring diagrams <ArrowUpRight size={14} /></DocumentLink>
          </div>
        </div>
      </div>}
      {section !== "model" && <p className="qr-scope"><strong>Manual coverage</strong> {series === "e30" ? "U.S. 325i / 325is handbook and 1989 wiring manual. The component map shows the late 325i coupe." : referenceScope + ". Check the installed equipment and labels, particularly on imports, engine swaps and cars with modified wiring."}</p>}
      {section === "fluids" && (series === "e30" ? <E30Fluids /> : <FluidReference initialModel={query.model} />)}
      {section === "fuses" && <FuseReference initialPanel={query.panel} initialFuse={query.fuse} initialQuery={query.q} />}
      {section === "locations" && <LocationReference initialPoint={query.point} />}
      {section === "model" && <ModelReference initialReference={query.reference} initialFocus={query.focus} />}
    </div>
  );
}

function ModelReference({initialReference, initialFocus=""}:{initialReference?:string;initialFocus?:string}) {
  const {series} = useApp();
  const [focus,setFocus] = useState(initialFocus);
  const topic = quickReferenceModelTopic(focus,series);
  return <>
    <div className="qr-model-topic">
    <label className="reference-model-choice">
      <span>Highlight on the car</span>
      <select value={topic ? focus : ""} onChange={event=>{
        const value=event.target.value;
        setFocus(value);
        updateQuery({focus:value||undefined});
      }}>
        <option value="">Whole car</option>
        {topic?.fuse&&<option value={focus}>{topic.label}</option>}
        {quickReferenceModelTopics(series).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    {topic&&<DocumentLink className="qr-text-link" href={topic.lookup.href}>{topic.lookup.label}<ArrowUpRight size={14}/></DocumentLink>}
    </div>
    <Suspense fallback={<p role="status">Loading the 3D view…</p>}>
      <WorkshopExplorer quickReference initialReference={initialReference} referenceFocus={topic ? focus : ""}/>
    </Suspense>
  </>;
}

function Capacity({ liters }: { liters: number }) {
  return <><strong>{liters} L</strong><small> ≈ {(liters / 0.946352946).toFixed(2)} US qt</small></>;
}

function E30Fluids() {
  const { vehicle } = useApp();
  const cards = [
    {id:"engine-oil", title:"Engine oil", point:"oil", rows:[["M20 325i · with filter",4.25],["Without filter",4]], note:"Use the dipstick for the final level. The handbook lists oil grades by temperature."},
    {id:"cooling-system", title:"Coolant", point:"coolant", rows:[["System including heater circuit",10.5]], note:"This is total capacity. A partial drain takes less. Open the expansion tank only after the engine has cooled."},
    {id:"transmission-fluid", title:"Transmission oil", point:"gearbox", rows:[["Manual gearbox",1.25],["Automatic · service drain and refill",3]], note:"Identify the fitted gearbox and read its oil label. The period handbook lists Dexron II for the automatic."},
    {id:"differential-fluid", title:"Final drive and transfer case", point:"differential", rows:[["Rear final drive",1.7],["325iX front final drive",.7],["325iX transfer case",.5]], note:"Confirm the fitted differential and its lubricant. The 325iX uses separate front and transfer-case fills."},
    {id:"washer-fluid", title:"Washer fluid", point:"washer", rows:[["Windshield washer reservoir",3]], note:"Use a washer fluid suitable for the temperature."},
    {id:"brake-fluid", title:"Brake fluid", point:"brake", rows:[], note:"Check the reservoir MIN/MAX marks and the fluid specification for the fitted brake system. Investigate an unexplained drop before driving."},
  ] as const;
  const matches = ["325i","325iX"].includes(vehicle.model) && (!vehicle.engine || vehicle.engine === "M20");
  return <>
    <p>{matches ? "325i, 325is and 325iX · M20 handbook" : "325i, 325is and 325iX handbook figures. See the service manual for other engines and drivetrains."}</p>
    <div className="qr-fluid-grid">{cards.map(card => <article key={card.id} id={card.id} className="qr-fluid-card">
      <h2>{card.title}</h2>
      {card.rows.length > 0 && <dl className="qr-spec-list">{card.rows.map(([label, liters]) => <div key={label}><dt>{label}</dt><dd><Capacity liters={liters}/></dd></div>)}</dl>}
      <p>{card.note}</p>
      <div className="qr-card-footer">
        <DocumentLink className="qr-text-link" href={quickReferenceModelHref(card.point === "oil" ? "oil-change" : card.point)}><Layers size={15}/> Show service parts in 3D</DocumentLink>
        <DocumentLink className="qr-text-link" href={card.id === "brake-fluid" ? e30ManualSources[0].url : e30Handbook + "#page=85"}><BookOpen size={15}/>{card.id === "brake-fluid" ? "BMW repair manual · 00-16" : "BMW handbook · p. 84"}</DocumentLink>
      </div>
    </article>)}</div>
  </>;
}

function FluidReference({ initialModel }: { initialModel?: string }) {
  const { vehicle } = useApp();
  const [selection, setSelection] = useState(initialModel);
  const matched = referenceModelForVehicle(vehicle);
  const effective = selection ?? matched?.id ?? "";
  const rows = referenceModels.filter((row) => !effective || row.id === effective);
  const visible = rows.length ? rows : referenceModels;
  return (
    <div className="qr-fluids">
      <div className="qr-fluids-toolbar">
        <label>Engine and model year
          <select value={rows.length ? effective : ""} onChange={(event) => {
            const value = event.target.value;
            setSelection(value);
            updateQuery({ model: value || "all" });
          }}>
            <option value="">Compare all covered engines</option>
            {referenceModels.map((row) => <option key={row.id} value={row.id}>{referenceModelLabel(row)}</option>)}
          </select>
        </label>
        <p>{selection === undefined && matched
          ? "Showing the matching source family from your saved vehicle context."
          : "Choose the installed engine. Years shown are U.S. model years."}</p>
      </div>
      <div className="qr-fluid-grid">
        <FluidCard id="engine-oil" title="Engine oil" badge="With filter change" point="oil" chapter="020" source="020-8, Table e · PDF p. 30">
          <p>Use the viscosity specified for your engine and ambient temperature. The period table lists API SG/SH. Confirm current oil suitability for the engine.</p>
          <dl className="qr-spec-list">
            {visible.map((row) => (
              <div key={row.id}><dt>{referenceModelLabel(row)}</dt><dd>{row.oil === null ? "See source discrepancy" : <Capacity liters={row.oil} />}</dd></div>
            ))}
          </dl>
          {visible.some((row) => row.oil === null) && <p className="qr-warning">The M20 row prints 4.25 L and 5.0 US qt, which disagree. Verify the fill amount in the vehicle’s service documentation. Use the dipstick for the final level.</p>}
          {visible.some((row) => row.engine.startsWith("M50")) && (
            <DocumentLink className="qr-text-link" href="/guides/m50-engine-oil-and-filter">M50 oil and filter walkthrough <ArrowUpRight size={14} /></DocumentLink>
          )}
        </FluidCard>
        <FluidCard id="cooling-system" title="Engine coolant" badge="Approximate total system capacity" point="coolant" chapter="170" source="020-8, Table e and 170-5, Table b · PDF pp. 30, 209">
          <p>The manual specifies a 50/50 mix of suitable antifreeze and water. Check the level on a cold engine. A partial drain takes less than the total capacity.</p>
          <dl className="qr-spec-list">
            {visible.map((row) => (
              <div key={row.id}><dt>{referenceModelLabel(row)}</dt><dd>{row.coolant === null ? "See source discrepancy" : <Capacity liters={row.coolant} />}</dd></div>
            ))}
          </dl>
          {visible.some((row) => row.coolant === null) && <p className="qr-warning">M20 capacity differs between the maintenance table (10.5 L) and cooling chapter (10 L). Confirm the installed cooling system and follow its fill and bleed procedure.</p>}
          <DocumentLink className="qr-text-link" href="/guides/cooling-system-visual-check">Cooling system visual check <ArrowUpRight size={14} /></DocumentLink>
        </FluidCard>
        <FluidCard id="brake-fluid" title="Brake fluid" badge="DOT 4" point="brake" chapter="020" source="020-8 and 020-15, Fig. 16 · PDF pp. 30, 37">
          <p>Read the MIN and MAX marks on the reservoir. The hydraulic clutch on manual cars draws from the same reservoir. A low level needs investigation. A sinking pedal, brake warning or active leak calls for inspection before driving.</p>
          <DocumentLink className="qr-text-link" href="/guides/brake-fluid-level-inspection">Brake fluid inspection <ArrowUpRight size={14} /></DocumentLink>
        </FluidCard>
        <FluidCard id="steering-fluid" title="Power steering fluid" badge="Read the reservoir label" point="steering" chapter="020" source="020-8 and 020-15, Fig. 15 · PDF pp. 30, 37">
          <p>The manual lists Dexron-type ATF and CHF 7.1 for different systems. Use the specification marked on the reservoir and confirm the correct product before topping up. Keep the two fluid families separate.</p>
          <DocumentLink className="qr-text-link" href="/guides/power-steering-fluid-level-inspection">Power steering fluid inspection <ArrowUpRight size={14} /></DocumentLink>
        </FluidCard>
        <FluidCard id="transmission-fluid" title="Transmission fluid" badge="Identify the gearbox tag first" point="gearbox" chapter="230" source="230-1–230-2 and 240-15–240-16 · PDF pp. 231–232, 251–252">
          <p>Manual boxes can use ATF or a different approved lubricant. Read the case label. These approximate values are listed by gearbox, with automatic amounts for service drain and refill.</p>
          <dl className="qr-spec-list">
            {gearboxCapacities.map(([name, liters]) => (
              <div key={name}><dt>{name}</dt><dd><Capacity liters={liters} /></dd></div>
            ))}
          </dl>
          <p>The A4S 310R and A5S 310Z entries specify period Dexron II. The A5S 560Z calls for Shell LA 2634 and excludes Dexron. Confirm the applicable replacement specification and temperature-dependent level procedure for the exact unit.</p>
          <DocumentLink className="qr-text-link" href="/manual/240">Automatic transmission chapter <ArrowUpRight size={14} /></DocumentLink>
        </FluidCard>
        <FluidCard id="differential-fluid" title="Differential oil" badge="Open and limited-slip fluids differ" point="differential" chapter="331" source="020-8 and 331-4, Fig. 6 · PDF pp. 30, 316">
          <p>The period reference lists BMW SAF-XO for open differentials and SAF-XLS for limited-slip units. Check the installed differential tag and its current approved lubricant.</p>
          <dl className="qr-spec-list">
            <div><dt>525i · drain and refill</dt><dd><Capacity liters={1.7} /></dd></div>
            <div><dt>540i · drain and refill</dt><dd><Capacity liters={1.9} /></dd></div>
            <div><dt>530i / 535i</dt><dd>Verify installed unit</dd></div>
          </dl>
          <p className="qr-warning">The maintenance table and final-drive chapter group the 530i and 535i differently. Confirm the capacity for the actual differential.</p>
        </FluidCard>
        <FluidCard id="washer-fluid" title="Washer fluid" badge="Use a climate-appropriate washer fluid" point="washer" chapter="611" source="611-8, Fig. 22 · PDF p. 394">
          <p>Check the windshield washer reservoir under the hood. The Touring has a separate rear washer reservoir behind the right luggage-compartment trim.</p>
          <a className="qr-text-link" href={base + "/locations?point=washer-rear"}>Find the Touring reservoir <ArrowUpRight size={14} /></a>
        </FluidCard>
        <FluidCard id="tire-pressure" title="Cold tire pressure" badge="Use the vehicle placard" point="tires" chapter="020" source="020-16 · PDF p. 38">
          <p>Read the row for the fitted tires and vehicle load on the driver’s door pillar. Check both axles before driving, when the tires are cold.</p>
          <DocumentLink className="qr-text-link" href="/guides/cold-tire-pressure-check">Cold tire pressure walkthrough <ArrowUpRight size={14} /></DocumentLink>
        </FluidCard>
      </div>
    </div>
  );
}

function FluidCard({ id, title, badge, point, chapter, source, children }: {
  id: string; title: string; badge: string; point: string; chapter: string; source: string; children: React.ReactNode;
}) {
  return (
    <article className="qr-fluid-card" id={id}>
      <span className="eyebrow">{badge}</span>
      <h2>{title}</h2>
      {children}
      <div className="qr-card-footer">
        <DocumentLink className="qr-text-link" href={quickReferenceModelHref(point === "oil" ? "oil-change" : point)}><Layers size={15}/> Show service parts in 3D</DocumentLink>
        <a className="qr-text-link" href={"/manual/" + chapter}><BookOpen size={15} /> Manual {chapter}</a>
        <small>Bentley {source}</small>
      </div>
    </article>
  );
}

function LocationReference({ initialPoint }: { initialPoint?: string }) {
  const { series } = useApp();
  const locations = series === "e30" ? e30Locations : serviceLocations;
  const initial = locations.find((point) => point.id === initialPoint) ?? locations[0];
  const [selected, setSelected] = useState(initial);
  const points = locations.filter((point) => point.group === selected.group);
  const choose = (id: string) => {
    const point = locations.find((point) => point.id === id);
    if (!point) return;
    setSelected(point);
    updateQuery({ point: id });
  };
  return <>
    <div className="qr-switches" aria-label="Car areas">
      {(["Engine bay", "Cabin & luggage", "Underbody"] as const).map((group) => (
        <button key={group} type="button" aria-pressed={selected.group === group} onClick={() =>
          choose(locations.find((point) => point.group === group)!.id)
        }>{group}</button>
      ))}
    </div>
    <div className="qr-location-layout">
      <ReferenceLocationMap series={series} points={points} selected={selected.id} onSelect={choose} />
      <div className="qr-location-sidebar">
        <LocationDetail point={selected} />
        <div className="qr-location-list" aria-label="Locations in this area">
          {points.map((point, index) => (
            <button key={point.id} type="button" aria-pressed={point.id === selected.id} onClick={() => choose(point.id)}>
              <span>{index + 1}</span>{point.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  </>;
}

function LocationDetail({ point }: { point: ServiceLocation }) {
  return (
    <article className="qr-location-detail">
      <span className="eyebrow">{point.group}</span>
      <h2 aria-live="polite">{point.title}</h2>
      <strong>{point.location}</strong>
      <p>{point.detail}</p>
      <small>{point.source}</small>
      <div className="qr-links">
        <DocumentLink href={quickReferenceModelHref(point.id)}><Layers size={15}/> Show in 3D</DocumentLink>
        {point.links.filter(link=>!link.href.startsWith("/workshop?")).map((link) => <DocumentLink href={link.href} key={link.href}>{link.label} <ArrowUpRight size={14} /></DocumentLink>)}
      </div>
    </article>
  );
}

function FuseReference({ initialPanel, initialFuse, initialQuery }: {
  initialPanel?: string; initialFuse?: string; initialQuery?: string;
}) {
  const { series, vehicle } = useApp();
  const e30 = series === "e30";
  const panels: readonly {id:string;title:string;location:string;note:string}[] = e30 ? [e30FusePanel] : fusePanels;
  const mapPoints = e30 ? [e30FuseLocation] : fuseLocations;
  const positions: FuseRow[] = e30 ? e30FuseReference(vehicle) : e34FuseReference(vehicle.year,vehicle.model);
  const find = (query: string) => findFuseIn(query, positions);
  const exact = find(initialFuse || initialQuery || "");
  const [panelId, setPanelId] = useState(exact?.panel ?? panels.find((panel) => panel.id === initialPanel)?.id ?? "front");
  const [selected, setSelected] = useState(exact?.number);
  const [search, setSearch] = useState((initialQuery || "").slice(0, 90));
  const panel = panels.find((item) => item.id === panelId)!;
  const layout=e30 ? e30FuseDrawing : usesE34FactoryFuseLayout(vehicle.year,vehicle.model) ? e34FuseDrawings[panelId] : undefined;
  const active = selected === undefined ? undefined : find(String(selected));
  const searching = !!search.trim();
  const results = filterFusePositions(search, positions);
  const point = mapPoints.find((item) => item.id === panelId)!;
  const choosePanel = (id: string) => {
    const next = panels.find((item) => item.id === id);
    if (!next) return;
    setPanelId(next.id);
    setSelected(undefined);
    setSearch("");
    updateQuery({ panel: next.id, fuse: undefined, q: undefined });
  };
  function selectFuse(fuse:FuseRow) {
    setPanelId(fuse.panel);
    setSelected(fuse.number);
    updateQuery({panel:fuse.panel,fuse:String(fuse.number)});
  }
  function locateFuse() {
    setSearch("");
    updateQuery({panel:panelId,fuse:active?String(active.number):undefined,q:undefined});
  }
  return (
    <div className="qr-fuse-reference">
      <Notice tone="warning">Match the panel cover and applicable wiring diagram before replacing a fuse. Use only the confirmed amperage. A fuse that blows again needs a circuit diagnosis.</Notice>
      <label className="qr-search">
        <Search size={18} />
        <input aria-label="Search fuse number or circuit" placeholder="Fuse number or circuit" maxLength={90} value={search}
          onChange={(event) => {
            const value = event.target.value;
            const fuse = find(value);
            setSearch(value);
            setSelected(fuse?.number);
            if (fuse) setPanelId(fuse.panel);
            updateQuery({ q: value || undefined, fuse: undefined, panel: fuse?.panel ?? panelId });
          }} />
        {searching && <button type="button" onClick={() => choosePanel(panelId)}>Clear</button>}
      </label>
      <div className="qr-switches" aria-label="Fuse panels">
        {panels.length > 1 && panels.map((item) => (
          <button key={item.id} type="button" aria-pressed={!searching && item.id === panelId} onClick={() => choosePanel(item.id)}>
            {item.title}
          </button>
        ))}
      </div>
      <div className="qr-fuse-layout">
        <div className="qr-fuse-board">
          <span className="eyebrow">{searching ? "CIRCUIT LOOKUP" : "POWER DISTRIBUTION"}</span>
          <h2>{searching ? "Matching positions" : panel.title}</h2>
          <p aria-live="polite">{searching
            ? `${results.length} ${results.length === 1 ? "position" : "positions"} found across all panels.`
            : panel.location}</p>
          {!searching && !layout && <p>{panel.note}</p>}
          {searching && !results.length && <p>Try a fuse number or a shorter term such as wiper, horn or defogger.</p>}
          {active && <a className="qr-text-link" href="#fuse-circuit">Go to F{active.number} circuit details <ArrowRight size={15} /></a>}
          {!searching && layout
            ? <FuseBoxDrawing layout={layout} positions={positions.filter(fuse=>fuse.panel===panelId)} selected={selected} onSelect={selectFuse}/>
            : panels.map(group=>{
              const fuses=results.filter(fuse=>fuse.panel===group.id);
              if(!fuses.length||(!searching&&group.id!==panelId))return null;
              return <section key={group.id} className="qr-fuse-group" aria-label={group.title+' fuse positions'}>
                {searching&&<h3>{group.title}</h3>}
                <div className="qr-fuse-grid">{fuses.map(fuse=><FuseButton key={fuse.number} fuse={fuse} selected={selected} onSelect={selectFuse}/>)}</div>
              </section>;
            })}
          <div className="qr-fuse-detail" id="fuse-circuit" aria-live="polite">
            {active ? <>
              <h3>F{active.number} · {active.amps ? active.amps + " A in the source table" : active.status}</h3>
              <p>{active.circuits}</p>
              {!e30 && !layout && active.number === 37 && <p>Check this position only on the Touring rear washer/wiper circuit.</p>}
              <small>{active.source} · {panel.title}</small>
              {layout&&<a className="qr-text-link" href={active.chart??layout.chart} target="_blank" rel="noopener noreferrer">Open the original circuit chart <ArrowUpRight size={14}/></a>}
              {searching&&layout&&<button type="button" className="text-link" onClick={locateFuse}>Show F{active.number} in the physical layout</button>}
            </> : <p>{!searching && panel.id === "electronics"
              ? "See the wiring appendix for relay assignments. The main blade fuses are in the front, rear and auxiliary panels."
              : "Select a position to see its circuit, rating and source page."}</p>}
          </div>
          {!layout&&<small>{listedFuseCount} entries from Bentley Table a.</small>}
          {!layout&&<div className="qr-links">
            <DocumentLink href="/manual/610">Manual 610 · Fuses and relays <ArrowUpRight size={14} /></DocumentLink>
            <DocumentLink href="/electrical">Wiring & Electrical <ArrowUpRight size={14} /></DocumentLink>
          </div>}
        </div>
        <div>
          <ReferenceLocationMap series={series} points={mapPoints} selected={panelId} onSelect={choosePanel} />
          <div className="qr-map-link">
            <DocumentLink className="qr-text-link" href={quickReferenceModelHref(active ? panelId+"-fuse-"+active.number : panelId)}>
              <Layers size={15} /> {e30&&active ? "Show F"+active.number+" in 3D" : "Show "+point.title.toLowerCase()+" in 3D"}
            </DocumentLink>
          </div>
        </div>
      </div>
      {!layout&&<section className="qr-relays">
        <h2>{panel.title} relay and module keys</h2>
        <p>Check the installed cover and wiring diagram for the physical arrangement.</p>
        {relayLayouts[panel.id as keyof typeof relayLayouts].map((layout) => (
          <details key={layout.title}>
            <summary>{layout.title}</summary>
            <ol>{layout.labels.map((label, index) => <li key={index}>{label}</li>)}</ol>
            <small>{layout.source}</small>
          </details>
        ))}
      </section>}
    </div>
  );
}
