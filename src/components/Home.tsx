"use client";
import { DocumentLink } from "./DocumentLink";
import { useEffect, useState } from "react";
import { Search, ArrowUpRight, ArrowRight, ScanLine } from "lucide-react";
import { systems, quickSymptoms } from "../data/catalog";
import { manualGuides, manualChapters } from "../data/manual";
import { db, useApp } from "./context";
import { Icon, LinkArrow, Tag } from "./common";
import { GuidePreview } from "./GuideVisuals";
import { HomeInstallSection } from "./HomeInstallSection";
import { HeroCarousel } from "./HeroCarousel";
import { MemberCount } from "./MemberCount";
import { displayModel, seriesDefinitions, seriesHref } from "../series/registry";
import { e30Guides } from "../series/e30-repairs";
import { useVehicleCatalog } from "../lib/use-vehicle-catalog";
import catalogInventory from "../../data/catalog-snapshots/inventory.json";
export function Home() {
  const [query, setQuery] = useState(""),
    [threads, setThreads] = useState<{ id: string; title: string; category: string; model_id: string | null; created_at: string }[]>([]);
  const { user, authRevision, series } = useApp();
  const brand = seriesDefinitions[series];
  const isE30 = series === "e30";
  const seriesCode = series.toUpperCase();
  const guides = isE30 ? e30Guides : manualGuides.filter(g => ["identify-your-engine", "m50-engine-oil-and-filter", "front-strut-component-identification"].includes(g.slug));
  const communityCompose = isE30 ? "/community/new?series=e30" : "/community/new";
  const catalog = useVehicleCatalog();
  useEffect(() => {
    db.rpc("browse_community", { page_size: 3 })
      .select("id,title,category,model_id,created_at")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setThreads(Array.isArray(data)?data:[]));
  }, [user?.id]);
  return (
    <div className="home">
      <form className="universal-search" action={seriesHref("/search", series)}>
        <Search size={24} />
        <input
          name="q"
          aria-label={"Search " + brand.name}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Part number, symptom or repair"
        />
        <span className="search-scope">ALL SECTIONS</span>
        <button aria-label="Search" type="submit">
          <ArrowRight size={23} />
        </button>
      </form>
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="small-rule" />
            {brand.designation.toUpperCase()} / {seriesCode}
          </div>
          <h1>
            BMW {seriesCode}.
            <br />
            Service reference.
            <br />
            <em>Owners’ stories.</em>
          </h1>
          <p>
            Repair information, component diagrams and owners’ records for the
            BMW {seriesCode}.
          </p>
          <div className="hero-part-actions">
            <DocumentLink className="button primary" href="/scanner">
              <ScanLine size={18} aria-hidden="true" /> Scan a part
            </DocumentLink>
            <DocumentLink className="button outline" href="/parts/catalog">
              View parts catalog <ArrowUpRight size={18} aria-hidden="true" />
            </DocumentLink>
          </div>
          <MemberCount refreshKey={(user?.id || "") + ":" + authRevision} />
          <DocumentLink className="hero-secondary" href="/encyclopedia">
            Browse technical reference
            <ArrowRight size={15} />
          </DocumentLink>
        </div>
        <HeroCarousel />
      </section>
      <section className="lore-owner-callout">
        <div>
          <span className="eyebrow">THE GARAGES</span>
          <h2>Your garage, past and present.</h2>
          <p>
            Record ownership, maintenance and restoration work. Share selected journal updates, or keep them private.
          </p>
        </div>
        <DocumentLink href="/community/garages" className="button primary">
          Meet the cars & owners <ArrowUpRight size={17} />
        </DocumentLink>
      </section>
      <section className="lore-owner-callout directory-home-callout"><div><span className="eyebrow">PEOPLE & PLACES</span><h2>Find the people who know these cars.</h2><p>Explore BMW workshops and restoration businesses. Recommend a specialist and share what they worked on.</p></div><DocumentLink className="button outline" href="/community/specialists">Find a BMW specialist <ArrowUpRight size={17}/></DocumentLink></section>
      <section className="entry-lanes" aria-label={"Explore " + brand.name}>
        {[
          {
            n: "01",
            icon: "book",
            title: "Technical reference",
            body: "Models, systems and service literature.",
            href: "/encyclopedia",
          },
          {
            n: "02",
            icon: "wrench",
            title: "Repair & diagnostics",
            body: "Inspections, diagnostic tests and service guides.",
            href: "/repairs",
          },
          {
            n: "03",
            icon: "layers",
            title: "Component diagrams",
            body: "Assembly drawings, OEM numbers and application notes.",
            href: "/parts",
          },
          {
            n: "04",
            icon: "users",
            title: "Community discussions",
            body: "Technical questions, repair results and build records.",
            href: "/community",
          },
        ].map((item) => (
          <DocumentLink key={item.n} href={item.href} className="entry-lane">
            <div>
              <Icon name={item.icon} size={25} />
              <span>{item.n}</span>
            </div>
            <h2>
              {item.title}
              <ArrowUpRight size={19} />
            </h2>
            <p>{item.body}</p>
          </DocumentLink>
        ))}
      </section>
      <nav className="qr-manual-shortcuts qr-home-shortcuts" aria-label="At the car">
        <DocumentLink href="/manual">Mobile service manual <ArrowUpRight size={15} /></DocumentLink>
        <DocumentLink href="/quick-reference/fluids">Fluids and capacities <ArrowUpRight size={15} /></DocumentLink>
        <DocumentLink href="/quick-reference/fuses">Fuse diagrams <ArrowUpRight size={15} /></DocumentLink>
        <DocumentLink href="/quick-reference/locations">Component locations <ArrowUpRight size={15} /></DocumentLink>
      </nav>
      <section className="workshop-grid">
        <div className="explorer-feature">
          <div className="section-heading">
            <div>
              <div className="eyebrow">ASSEMBLY DRAWINGS</div>
              <h2>Find parts by assembly.</h2>
            </div>
          </div>
          <DocumentLink className="catalog-home-card" href={isE30 ? "/parts/catalog?q=water+pump" : "/parts/catalog?part=coolant-pump&workspace=part"}>
            <strong>Water pump &amp; thermostat</strong>
            <p>Compare part numbers, check application notes and open the original catalog drawing.</p>
            <span>Open part workspace <ArrowUpRight size={18} /></span>
          </DocumentLink>
        </div>
        <div className="symptom-panel">
          <div className="eyebrow">DIAGNOSTICS</div>
          <h2>
            Something
            <br />
            doesn’t feel right?
          </h2>
          <p>
            You don’t need to know the name of a part to ask a useful question.
          </p>
          <div className="symptom-list">
            {quickSymptoms.map((s) => (
              <DocumentLink key={s.id} href={"/diagnostics?symptom=" + s.id}>
                <span className="symptom-icon">
                  <Icon
                    name={
                      systems.find((x) => x.id === s.system)?.icon || "wrench"
                    }
                    size={19}
                  />
                </span>
                <span>{s.title}</span>
                <ArrowUpRight size={17} />
              </DocumentLink>
            ))}
          </div>
          <LinkArrow href="/diagnostics">
            Open the diagnostic workbench
          </LinkArrow>
        </div>
      </section>
      <section className="home-guides">
        <div className="section-heading">
          <div>
            <div className="eyebrow">SERVICE INFORMATION</div>
            <h2>Inspection and service references.</h2>
          </div>
          <LinkArrow href="/repairs">All repair & inspection guides</LinkArrow>
        </div>
        <div className="guide-card-grid">
          {guides.map((g) => (
              <DocumentLink className="guide-card" key={g.slug} href={"/guides/" + g.slug}>
                {!isE30 && <GuidePreview slug={g.slug} />}
                <div className="guide-card-body">
                  <div>
                    <Tag>{g.level}</Tag>
                    <span>{g.duration}</span>
                  </div>
                  <h3>
                    {g.title}
                    <ArrowUpRight size={18} />
                  </h3>
                  <p>{g.summary}</p>
                  <span className="source-line">
                    {isE30 ? g.source.title : "BENTLEY " + g.source.section + " · SOURCE-BASED GUIDE"}
                  </span>
                </div>
              </DocumentLink>
            ))}
        </div>
      </section>
      <section className="system-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">TECHNICAL SYSTEMS</div>
            <h2>Browse by vehicle system.</h2>
          </div>
          <LinkArrow href="/encyclopedia">Open the encyclopedia</LinkArrow>
        </div>
        <div className="system-grid">
          {systems.map((s) => (
            <DocumentLink key={s.id} href={"/encyclopedia?system=" + s.id}>
              <Icon name={s.icon} size={25} />
              <span>{s.name}</span>
              <small>{s.group}</small>
              <ArrowUpRight size={16} />
            </DocumentLink>
          ))}
        </div>
      </section>
      <section className="community-strip">
        <div>
          <div className="eyebrow">COMMUNITY DISCUSSIONS</div>
          <h2>
            Repair questions
            <br />
            and owner records.
          </h2>
          <p>
            Discuss diagnosis, confirm part identity and document repair results
            with vehicle and component context.
          </p>
          <DocumentLink className="button primary" href={communityCompose}>
            Start a conversation
            <ArrowUpRight size={17} />
          </DocumentLink>
        </div>
        <div className="community-latest">
          <div className="section-heading">
            <h3>Recent discussions</h3>
            <LinkArrow href="/community">View discussions</LinkArrow>
          </div>
          {threads.length ? (
            threads.map((t) => (
              <DocumentLink
                key={t.id}
                className="thread-preview"
                href={"/community/" + t.id}
              >
                <Tag>{t.category}</Tag>
                <h4>
                  {t.title}
                  <ArrowUpRight size={16} />
                </h4>
                <span>{t.model_id ? displayModel(t.model_id) : "BMW community"}</span>
              </DocumentLink>
            ))
          ) : (
            <div className="founding-note">
              <span>DISCUSSIONS</span>
              <h3>
                No discussions
                <br />
                have been posted.
              </h3>
              <p>
                Post a technical question, document a repair result or start a
                build record.
              </p>
              <DocumentLink href={communityCompose}>
                Create a discussion
                <ArrowRight size={17} />
              </DocumentLink>
            </div>
          )}
        </div>
      </section>
      <HomeInstallSection />
      <div className="coverage-strip">
        <div>
          <strong>{isE30 ? 3 : manualChapters.length}</strong>
          <span>{isE30 ? "SERVICE MANUAL SOURCES" : "MANUAL CHAPTER REFERENCES"}</span>
        </div>
        <div>
          <strong>{isE30 ? e30Guides.length : manualGuides.length}</strong>
          <span>SOURCED EDITORIAL GUIDES</span>
        </div>
        <div>
          <strong>
            {(isE30 ? catalog.rows.length : catalogInventory.registered_bmw_numbers).toLocaleString()}
          </strong>
          <span>{isE30 ? "CATALOG CONFIGURATIONS" : "BMW NUMBERS INDEXED"}</span>
        </div>
        <DocumentLink href="/resources#evidence">
          Know what’s covered.
          <br />
          <b>
            See sources & open gaps
            <ArrowUpRight size={15} />
          </b>
        </DocumentLink>
      </div>
    </div>
  );
}
