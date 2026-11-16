"use client";
import { DocumentLink } from "./DocumentLink";

import { useEffect, useState } from "react";
import { ArrowUpRight, Camera, Search, Star } from "lucide-react";
import { db, useApp } from "./context";
import { Empty, Notice, PageIntro, Tag } from "./common";
import type {Showcase} from "./Garages";
import { CarCover } from "./CarPhotos";
export function FeaturedCars({ compact = false }: { compact?: boolean }) {
  const { user } = useApp();
  const [storedCars, setCars] = useState<Showcase[]>([]),
    [q, setQ] = useState(""),
    [query, setQuery] = useState(""),
    [featured, setFeatured] = useState(compact),
    [completedRequest,setCompletedRequest]=useState(""),[dataScope,setDataScope]=useState(""),
    [error, setError] = useState(""),
    [more, setMore] = useState(false),
    [cursor, setCursor] = useState<{ created_at: string; id: string } | null>(
      null,
    );
  const scope=JSON.stringify([query,featured,user?.id,compact]),request=JSON.stringify([scope,cursor]);
  const loading=completedRequest!==request,cars=dataScope===scope?storedCars:[];
  useEffect(() => {
    const timer = setTimeout(() => {
      setCursor(null);
      setQuery(q.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    let active = true;
    db.rpc("browse_car_showcase", {
      search_query: query,
      featured_only: featured,
      page_size: compact ? 5 : 21,
      cursor_created_at: cursor?.created_at || null,
      cursor_id: cursor?.id || null,
    }).then(({ data, error }) => {
      if (!active) return;
      setError(error?.message || "");
      const page = ((data || [])as Showcase[]).slice(0, compact ? 4 : 20);
      setCars((old) =>
        cursor
          ? [
              ...old,
              ...page.filter((r) => !old.some((x) => x.id === r.id)),
            ]
          : page,
      );
      setMore((data || []).length > (compact ? 4 : 20));
      setDataScope(scope);setCompletedRequest(request);
    });
    return () => {
      active = false;
    };
  }, [query, featured, cursor, user?.id, compact,scope,request]);
  const cards = (
    <>
      {error&&!loading ? (
        <Notice tone="warning">The car showcase could not load. {error}</Notice>
      ) : loading && !cursor ? (
        <p>Opening the car showcase…</p>
      ) : cars.length ? (
        <div className="community-car-cards">
          {cars.map((car) => (
            <a href={"/garages/" + car.user_id + "/" + car.id} key={car.id}>
              <CarCover garageId={car.id} />
              <div>
                <div className="inline-tags">
                  <Tag>{car.model_id}</Tag>
                  {car.featured_at && (
                    <Tag>
                      <Star size={12} />
                      FEATURED
                    </Tag>
                  )}
                </div>
                <h3>{car.title}</h3>
                <p>
                  {car.story.slice(0, 150)}
                  {car.story.length > 150 ? "…" : ""}
                </p>
                <span className="text-link">
                  See the car and its journal <ArrowUpRight size={14} />
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <Empty
          title={
            featured
              ? "Featured cars are being selected."
              : "Share the car you’re working on."
          }
        >
          Publish a story and submit a photo from My Garage. Featured cars are
          selected by moderators from real member projects.
          <DocumentLink href="/garage" className="button outline">
            <Camera size={16} /> Add your car and photos
          </DocumentLink>
        </Empty>
      )}
    </>
  );
  if (compact)
    return (
      <section className="community-featured-cars">
        <div className="section-row">
          <div>
            <span className="eyebrow">MEMBER CARS</span>
            <h2>Featured E34s</h2>
          </div>
          <DocumentLink className="text-link" href="/community/cars">
            All cars & projects <ArrowUpRight size={16} />
          </DocumentLink>
        </div>
        {cards}
      </section>
    );
  return (
    <div className="page car-showcase-page">
      <DocumentLink href="/community" className="back-link">
        ← Community
      </DocumentLink>
      <PageIntro
        eyebrow="E34 LORE / MEMBER CARS"
        title="Cars and projects."
        description="Daily drivers, restorations and the E34s people still remember. Photos and project updates come from members’ shared garages."
      >
        <DocumentLink href="/garage" className="button primary">
          Share your E34 <ArrowUpRight size={16} />
        </DocumentLink>
      </PageIntro>
      <div className="showcase-tools">
        <div className="input-icon">
          <Search size={16} />
          <input
            aria-label="Search cars and projects"
            placeholder="Model, project or story"
            value={q}
            maxLength={300}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="view-toggle" aria-label="Car directory filter">
          <button
            aria-pressed={!featured}
            onClick={() => {
              setCursor(null);
              setFeatured(false);
            }}
          >
            All cars & projects
          </button>
          <button
            aria-pressed={featured}
            onClick={() => {
              setCursor(null);
              setFeatured(true);
            }}
          >
            <Star size={14} /> Featured cars
          </button>
        </div>
      </div>
      {cards}
      {more && (
        <button
          className="button outline"
          disabled={loading}
          onClick={() => {
            const last = cars.at(-1);
            if(last)setCursor({ created_at: last.created_at, id: last.id });
          }}
        >
          More cars
        </button>
      )}
    </div>
  );
}
