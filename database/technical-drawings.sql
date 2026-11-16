create table public.technical_drawings (
 id text primary key,
 assembly_id text not null references public.assemblies,
 source_id text not null references public.sources,
 image_path text not null check(image_path like '/assets/diagrams/%'),
 pixel_width integer not null check(pixel_width>0), pixel_height integer not null check(pixel_height>0),
 credit text not null, applicability text not null,
 rights_status text not null default 'private-review-only',
 hotspots jsonb not null check(jsonb_typeof(hotspots)='array' and jsonb_array_length(hotspots)<=200),
 recorded_at timestamptz not null default now()
);
create index technical_drawings_assembly on public.technical_drawings(assembly_id);
create index technical_drawings_source on public.technical_drawings(source_id);
alter table public.technical_drawings enable row level security;
revoke all on public.technical_drawings from public,anon,authenticated;
grant select on public.technical_drawings to anon,authenticated;
create policy technical_drawing_read on public.technical_drawings for select to anon,authenticated using(true);
