-- Extend the existing canonical catalog; retain all stable curated part IDs.
create table public.vehicle_catalog_contexts (
 id text primary key,
 name text not null check(char_length(name)<=240),
 model_id text not null references public.vehicle_models,
 model_year integer not null check(model_year between 1987 and 1997),
 body text, engine text, market text,
 source_index_url text not null check(source_index_url like 'https://www.bmwpartsdeal.com/%'),
 selection jsonb not null default '{}',
 expected_pages integer not null check(expected_pages>=0),
 imported_pages integer not null default 0 check(imported_pages>=0),
 import_status text not null default 'partial' check(import_status in ('partial','source-index-imported')),
 scope text not null, last_checked_at timestamptz not null default now()
);
alter table public.vehicle_catalog_contexts enable row level security;
revoke all on public.vehicle_catalog_contexts from public,anon,authenticated;
grant select on public.vehicle_catalog_contexts to anon,authenticated;
create policy catalog_context_read on public.vehicle_catalog_contexts for select to anon,authenticated using(true);
create index catalog_context_model on public.vehicle_catalog_contexts(model_id,model_year,body);

alter table public.assemblies add column catalog_context_id text references public.vehicle_catalog_contexts,
 add column source_category text,
 add column catalog_status text not null default 'curated' check(catalog_status in ('curated','source-listed'));
create index assemblies_catalog_context on public.assemblies(catalog_context_id,source_category);

create table public.part_assembly_positions (
 id text primary key,
 assembly_id text not null references public.assemblies,
 part_id text not null references public.parts,
 context_id text not null references public.vehicle_catalog_contexts,
 reference text not null check(char_length(reference)<=40),
 source_name text not null check(char_length(source_name) between 1 and 240),
 required_quantity integer check(required_quantity>=0),
 package_quantity integer check(package_quantity>=0),
 conditions jsonb not null default '[]' check(jsonb_typeof(conditions)='array' and jsonb_array_length(conditions)<=40 and octet_length(conditions::text)<=32000),
 source_url text not null check(source_url like 'https://www.bmwpartsdeal.com/parts-list/%'),
 source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
 record_sha256 text not null check(record_sha256 ~ '^[a-f0-9]{64}$'),
 active boolean not null default true,
 first_seen_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 unique(id,part_id)
);
create index part_positions_assembly on public.part_assembly_positions(assembly_id,reference,id);
create index part_positions_part on public.part_assembly_positions(part_id);
create index part_positions_context on public.part_assembly_positions(context_id);
create index part_positions_name_search on public.part_assembly_positions using gin(to_tsvector('simple',source_name));
alter table public.part_assembly_positions enable row level security;
revoke all on public.part_assembly_positions from public,anon,authenticated;
grant select on public.part_assembly_positions to anon,authenticated;
create policy catalog_position_read on public.part_assembly_positions for select to anon,authenticated using(true);

create table public.part_supersessions (
 id text primary key,
 previous_part_id text not null references public.parts,
 replacement_part_id text not null references public.parts,
 position_id text not null references public.part_assembly_positions,
 source_id text not null references public.sources,
 conditions jsonb not null default '[]',
 status text not null default 'source-listed' check(status='source-listed'),
 check(previous_part_id<>replacement_part_id)
);
create index supersessions_previous on public.part_supersessions(previous_part_id);
create index supersessions_replacement on public.part_supersessions(replacement_part_id);
create index supersessions_position on public.part_supersessions(position_id);
create index supersessions_source on public.part_supersessions(source_id);
alter table public.part_supersessions enable row level security;
revoke all on public.part_supersessions from public,anon,authenticated;
grant select on public.part_supersessions to anon,authenticated;
create policy catalog_supersession_read on public.part_supersessions for select to anon,authenticated using(true);

-- Remote public source artwork is separate from factual catalog ownership.
alter table public.technical_drawings alter column image_path drop not null,
 alter column pixel_width drop not null, alter column pixel_height drop not null,
 add column remote_url text check(remote_url ~ '^https://www[.]bmwpartsdeal[.]com/resources/encry/diagram/[A-Za-z0-9_./-]+[.](png|jpg|jpeg)$'),
 add column coordinate_space text not null default 'native' check(coordinate_space in ('native','percent')),
 add constraint drawing_asset_location check(num_nonnulls(image_path,remote_url)=1);

create table e34_private.catalog_import_runs (
 id text primary key, context_id text not null references public.vehicle_catalog_contexts,
 source_manifest_sha256 text not null,
 counts jsonb not null,
 completed_at timestamptz not null default now()
);
create table e34_private.catalog_position_history (
 id bigint generated always as identity primary key,
 position_id text not null references public.part_assembly_positions,
 source_sha256 text not null,
 snapshot jsonb not null,
 recorded_at timestamptz not null default now()
);
create index catalog_history_position on e34_private.catalog_position_history(position_id,recorded_at);
alter table e34_private.catalog_import_runs enable row level security;
alter table e34_private.catalog_position_history enable row level security;
revoke all on e34_private.catalog_import_runs,e34_private.catalog_position_history from public,anon,authenticated;
create policy import_no_client on e34_private.catalog_import_runs for all to authenticated using(false) with check(false);
create policy position_history_no_client on e34_private.catalog_position_history for all to authenticated using(false) with check(false);
create function e34_private.capture_catalog_position() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or new.record_sha256 is distinct from old.record_sha256 then
  insert into e34_private.catalog_position_history(position_id,source_sha256,snapshot) values(new.id,new.source_sha256,to_jsonb(new));
 end if;
 return new;
end;
$$;
revoke all on function e34_private.capture_catalog_position() from public,anon,authenticated;
create trigger record_source_position after insert or update on public.part_assembly_positions for each row execute function e34_private.capture_catalog_position();

alter table public.threads add column catalog_position_id text,
 add constraint thread_catalog_part_required check(catalog_position_id is null or part_id is not null),
 add constraint thread_catalog_part_link foreign key(catalog_position_id,part_id) references public.part_assembly_positions(id,part_id);
create index threads_catalog_position on public.threads(catalog_position_id,part_id);
create index parts_catalog_search on public.parts using gin(to_tsvector('simple',name||' '||coalesce(number_normalized,'')));

create view public.catalog_inventory with(security_invoker=true) as
 select c.*,
 (select count(*) from public.assemblies a where a.catalog_context_id=c.id) as assembly_count,
 (select count(*) from public.part_assembly_positions p where p.context_id=c.id and p.active) as position_count,
 (select count(distinct p.part_id) from public.part_assembly_positions p where p.context_id=c.id and p.active) as distinct_parts
 from public.vehicle_catalog_contexts c;
revoke all on public.catalog_inventory from public,anon,authenticated;
grant select on public.catalog_inventory to anon,authenticated;

create function public.catalog_find_parts(search_query text,context_filter text default null,max_results integer default 31,after_number text default null,after_position text default null)
 returns table(position_id text,part_id text,number_normalized text,name text,assembly_id text,assembly_title text,context_id text,context_name text,reference text,required_quantity integer,conditions jsonb)
 language sql stable security invoker set search_path='' as $$
 select x.id,p.id,p.number_normalized,x.source_name,a.id,a.title,c.id,c.name,x.reference,x.required_quantity,x.conditions
 from public.part_assembly_positions x join public.parts p on p.id=x.part_id join public.assemblies a on a.id=x.assembly_id join public.vehicle_catalog_contexts c on c.id=x.context_id
 where x.active and char_length(btrim(search_query)) between 2 and 200
 and (context_filter is null or c.id=context_filter)
 and (p.number_normalized=regexp_replace(search_query,'[^0-9]','','g') or to_tsvector('simple',p.name||' '||coalesce(p.number_normalized,'')) @@ websearch_to_tsquery('simple',search_query) or to_tsvector('simple',x.source_name) @@ websearch_to_tsquery('simple',search_query))
 and ((after_number is null and after_position is null) or (p.number_normalized,x.id)>(after_number,after_position))
 order by p.number_normalized,x.id limit least(greatest(max_results,1),101);
$$;
revoke all on function public.catalog_find_parts(text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.catalog_find_parts(text,text,integer,text,text) to anon,authenticated;
