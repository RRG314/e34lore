-- Full VINs stay out of owned_vehicles configuration and every public car projection.
create table if not exists public.vehicle_vins (
  vehicle_id uuid primary key,
  user_id uuid not null default auth.uid(),
  vin text not null check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  unique (user_id, vin),
  foreign key (vehicle_id, user_id) references public.owned_vehicles (id, user_id) on delete cascade
);
alter table public.vehicle_vins enable row level security;
revoke all on public.vehicle_vins from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.vehicle_vins to authenticated;
drop policy if exists vehicle_vins_owner on public.vehicle_vins;
create policy vehicle_vins_owner on public.vehicle_vins for all to authenticated
  using (user_id = (select auth.uid()) and (select e34_private.scan_photo_session()))
  with check (user_id = (select auth.uid()) and (select e34_private.scan_photo_session()));
