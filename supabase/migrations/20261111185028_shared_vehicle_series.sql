-- One identity, owner and community system. Catalog positions remain scoped
-- by their source vehicle context, even when a BMW number is shared.
alter table public.vehicle_models add column series text not null default 'e34'
  check (series ~ '^e[0-9]{2}$');
alter table public.vehicle_models add constraint vehicle_model_series_id
  check (series = 'e34' or id like series || '-%');

insert into public.vehicle_models (id,name,engines,coverage,series) values
  ('e30-316','316',array['M10'],'E30','e30'),
  ('e30-316i','316i',array['M10','M40'],'E30','e30'),
  ('e30-318i','318i',array['M10','M40','M42'],'E30','e30'),
  ('e30-318is','318is',array['M42'],'E30','e30'),
  ('e30-320i','320i',array['M20'],'E30','e30'),
  ('e30-320is','320is',array['S14'],'E30','e30'),
  ('e30-323i','323i',array['M20'],'E30','e30'),
  ('e30-324d','324d',array['M21'],'E30','e30'),
  ('e30-324td','324td',array['M21'],'E30','e30'),
  ('e30-325e','325e',array['M20'],'E30','e30'),
  ('e30-325i','325i',array['M20'],'E30','e30'),
  ('e30-325ix','325iX',array['M20'],'E30','e30'),
  ('e30-m3','M3',array['S14'],'E30','e30');

alter table public.vehicle_catalog_contexts
  drop constraint vehicle_catalog_contexts_model_year_check,
  add constraint vehicle_catalog_contexts_model_year_check check (
    (model_id like 'e30-%' and model_year between 1982 and 1994)
    or (model_id not like 'e30-%' and model_year between 1987 and 1997)
  );

alter table public.owned_vehicles
  drop constraint owned_vehicles_acquired_year_check,
  drop constraint owned_vehicles_released_year_check,
  add constraint owned_vehicles_acquired_year_check check (acquired_year between
    case when model_id like 'e30-%' then 1982 else 1987 end and 2100),
  add constraint owned_vehicles_released_year_check check (released_year between
    case when model_id like 'e30-%' then 1982 else 1987 end and 2100);
alter table public.garage_showcases
  drop constraint garage_showcases_acquired_year_check,
  drop constraint garage_showcases_released_year_check,
  add constraint garage_showcases_acquired_year_check check (acquired_year between
    case when model_id like 'e30-%' then 1982 else 1987 end and 2100),
  add constraint garage_showcases_released_year_check check (released_year between
    case when model_id like 'e30-%' then 1982 else 1987 end and 2100);

alter table public.component_observations add column series text not null default 'e34'
  check (series in ('e34','e30'));

create function e34_private.guard_observation_series() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op = 'UPDATE' and new.series is distinct from old.series then
    raise exception 'The saved scan series cannot be changed';
  end if;
  if new.vehicle_id is not null and not exists (
    select 1 from public.owned_vehicles v
    join public.vehicle_models m on m.id=v.model_id
    where v.id=new.vehicle_id and v.user_id=new.user_id and m.series=new.series
  ) then
    raise exception 'Choose a garage car from the same series';
  end if;
  return new;
end $$;

create trigger scan_series_guard before insert or update of series, vehicle_id on public.component_observations
for each row execute function e34_private.guard_observation_series();
