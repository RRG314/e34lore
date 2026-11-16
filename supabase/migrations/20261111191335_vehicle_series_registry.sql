begin;

create table public.vehicle_series (
  id text primary key check (id ~ '^e[0-9]{2}$'),
  name text not null,
  first_year integer not null,
  last_year integer not null,
  catalog_last_year integer not null,
  check (first_year between 1900 and last_year and last_year <= catalog_last_year)
);
alter table public.vehicle_series enable row level security;
revoke all on public.vehicle_series from public, anon, authenticated;
grant select on public.vehicle_series to anon, authenticated;
create policy vehicle_series_read on public.vehicle_series for select to anon, authenticated using (true);
insert into public.vehicle_series values
  ('e34','BMW 5 Series',1987,1996,1997),
  ('e30','BMW 3 Series',1982,1994,1994);

alter table public.vehicle_models
  add constraint vehicle_models_series_fk foreign key (series) references public.vehicle_series;
create index vehicle_models_series on public.vehicle_models(series,id);
alter table public.component_observations
  drop constraint component_observations_series_check,
  add constraint component_observations_series_fk foreign key (series) references public.vehicle_series;

alter table public.vehicle_catalog_contexts drop constraint vehicle_catalog_contexts_model_year_check;
alter table public.owned_vehicles
  drop constraint owned_vehicles_acquired_year_check,
  drop constraint owned_vehicles_released_year_check;
alter table public.garage_showcases
  drop constraint garage_showcases_acquired_year_check,
  drop constraint garage_showcases_released_year_check;

create function e34_private.guard_vehicle_series_years() returns trigger
language plpgsql security invoker set search_path='' as $$
declare supported public.vehicle_series;
begin
  select s.* into strict supported from public.vehicle_models m
  join public.vehicle_series s on s.id=m.series
  where m.id=new.model_id;
  if tg_table_name = 'vehicle_catalog_contexts' then
    if new.model_year not between supported.first_year and supported.catalog_last_year then
      raise exception 'Catalog year is outside the model series';
    end if;
  else
    if new.acquired_year not between supported.first_year and 2100
      or new.released_year not between supported.first_year and 2100 then
      raise exception 'Ownership year is outside the model series';
    end if;
  end if;
  return new;
end $$;
revoke all on function e34_private.guard_vehicle_series_years() from public, anon, authenticated;
create trigger catalog_series_year before insert or update of model_id, model_year on public.vehicle_catalog_contexts
for each row execute function e34_private.guard_vehicle_series_years();
create trigger garage_car_series_year before insert or update of model_id, acquired_year, released_year on public.owned_vehicles
for each row execute function e34_private.guard_vehicle_series_years();
create trigger showcase_series_year before insert or update of model_id, acquired_year, released_year on public.garage_showcases
for each row execute function e34_private.guard_vehicle_series_years();

create or replace function e34_private.guard_observation_series() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op = 'UPDATE' and new.series is distinct from old.series then
    raise exception 'The saved scan series cannot be changed';
  end if;
  if new.vehicle_id is not null and exists (
    select 1 from public.owned_vehicles v
    join public.vehicle_models m on m.id=v.model_id
    where v.id=new.vehicle_id and v.user_id=new.user_id and m.series<>new.series
  ) then
    raise exception 'Choose a garage car from the same series';
  end if;
  if new.catalog_position_id is not null and exists (
    select 1 from public.part_assembly_positions p
    join public.vehicle_catalog_contexts c on c.id=p.context_id
    join public.vehicle_models m on m.id=c.model_id
    where p.id=new.catalog_position_id and m.series<>new.series
  ) then
    raise exception 'Choose a catalog position from the same series';
  end if;
  return new;
end $$;
drop trigger scan_series_guard on public.component_observations;
create trigger scan_series_guard before insert or update of series, vehicle_id, catalog_position_id on public.component_observations
for each row execute function e34_private.guard_observation_series();
revoke all on function e34_private.guard_observation_series() from public, anon, authenticated;

create or replace function e34_private.save_vehicle_configuration(car uuid,expected_revision integer,selected jsonb)
returns public.vehicle_configuration_revisions language plpgsql security definer set search_path='' as $$
declare current_config jsonb; base_model text; model text; supported public.vehicle_series;
latest integer; r public.vehicle_configuration_revisions; item record; e public.vehicle_configuration_evidence;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,98234));
  if (select count(*) from public.vehicle_configuration_revisions where user_id=auth.uid())>=1000 then
    raise exception 'Configuration revision limit reached';
  end if;
  select configuration,model_id into current_config,base_model from public.owned_vehicles where id=car and user_id=auth.uid() for update;
  if not found then raise exception 'Vehicle unavailable'; end if;
  select s.* into strict supported from public.vehicle_models m join public.vehicle_series s on s.id=m.series where m.id=base_model;
  select coalesce(max(revision),0) into latest from public.vehicle_configuration_revisions where vehicle_id=car;
  if latest<>expected_revision then raise exception 'Configuration changed. Reload before saving.'; end if;
  if jsonb_typeof(selected)<>'object' or octet_length(selected::text)>4000 then raise exception 'Invalid selection'; end if;
  for item in select * from jsonb_each_text(selected) loop
    if item.key not in('manufacturer','platform','model','year','month','market','body','engine','transmission','drivetrain','steering','options') then
      raise exception 'Unknown attribute';
    end if;
    select * into e from public.vehicle_configuration_evidence where id=item.value::uuid and vehicle_id=car and user_id=auth.uid();
    if not found then raise exception 'Evidence unavailable'; end if;
    if e.attribute<>item.key then raise exception 'Evidence attribute mismatch'; end if;
    current_config:=jsonb_set(current_config,array[item.key],to_jsonb(case when e.kind='unknown' then '' else e.value end));
  end loop;
  select m.id into model from public.vehicle_models m where m.series=supported.id and
    (case when coalesce(current_config->>'model','')='' then m.id=base_model
      else m.id=current_config->>'model' or lower(m.name)=lower(current_config->>'model')
        or m.id=supported.id||'-'||lower(current_config->>'model') end)
  order by (m.id=base_model) desc limit 1;
  if model is null then raise exception 'Choose a model in the garage car’s series'; end if;
  current_config:=jsonb_set(current_config,'{model}',to_jsonb(case when supported.id='e34' then model else
    (select m.name from public.vehicle_models m where m.id=model) end));
  if coalesce(current_config->>'year','')<>'' and (current_config->>'year' !~ '^\d{4}$'
    or (current_config->>'year')::integer not between supported.first_year and supported.last_year) then
    raise exception 'Use a production year in the garage car’s series';
  end if;
  if coalesce(current_config->>'month','')<>'' and (current_config->>'month' !~ '^\d{1,2}$'
    or (current_config->>'month')::integer not between 1 and 12) then
    raise exception 'Use a production month from 1 through 12';
  end if;
  insert into public.vehicle_configuration_revisions(user_id,vehicle_id,revision,selection,configuration)
  values(auth.uid(),car,latest+1,selected,current_config) returning * into r;
  update public.owned_vehicles set configuration=current_config,model_id=model where id=car and user_id=auth.uid();
  return r;
end $$;

create or replace view public.catalog_inventory with (security_invoker=true) as
select c.*, coalesce(a.assembly_count,0::bigint) as assembly_count,
  coalesce(p.position_count,0::bigint) as position_count,
  coalesce(p.distinct_parts,0::bigint) as distinct_parts, m.series
from public.vehicle_catalog_contexts c
join public.vehicle_models m on m.id=c.model_id
left join (
  select catalog_context_id,count(*) as assembly_count from public.assemblies
  where catalog_context_id is not null group by catalog_context_id
) a on a.catalog_context_id=c.id
left join (
  select context_id,count(*) as position_count,count(distinct part_id) as distinct_parts
  from public.part_assembly_positions where active group by context_id
) p on p.context_id=c.id;

notify pgrst,'reload schema';
commit;
