create function e34_private.twin_license_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.redistribution<>'allowed' and exists(select 1 from public.asset_sources s join public.three_d_assets a on a.source_id=s.id where s.license_id=new.id and a.publication_status='published') then raise exception 'Withdraw dependent models before restricting their redistribution license';end if;return new;
end;$$;
create trigger twin_license_withdrawal before update on public.asset_licenses for each row execute function e34_private.twin_license_change();
create function e34_private.twin_source_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.license_id is distinct from old.license_id or new.url is distinct from old.url or new.source_sha256 is distinct from old.source_sha256) and exists(select 1 from public.three_d_assets where source_id=old.id and publication_status='published') then raise exception 'Create a new source revision or withdraw dependent models before changing published provenance';end if;return new;
end;$$;
create trigger twin_source_identity before update on public.asset_sources for each row execute function e34_private.twin_source_change();
create function e34_private.twin_review_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'INSERT' then raise exception 'Accuracy reviews are append-only; record a new decision';end if;
 if auth.uid() is not null then new.reviewer_id=auth.uid();end if;return new;
end;$$;
create trigger twin_review_evidence before insert or update or delete on public.accuracy_reviews for each row execute function e34_private.twin_review_identity();
alter table public.geometry_measurements add column reviewer_id uuid default auth.uid() references auth.users on delete set null,add column reviewed_at timestamptz not null default now(),add constraint twin_measurement_evidence check(jsonb_typeof(evidence)='array' and jsonb_array_length(evidence)>0),add constraint twin_measurement_method check(char_length(method)>=10);
create index twin_measurement_reviewer on public.geometry_measurements(reviewer_id);
revoke all on function e34_private.twin_license_change(),e34_private.twin_source_change(),e34_private.twin_review_identity() from public,anon,authenticated;

create or replace function e34_private.gate_twin_accuracy() returns trigger language plpgsql security definer set search_path='' as $$
declare accuracy_axis text; accuracy_decision text;
begin
 foreach accuracy_axis in array array['visual','dimensions','alignment','mechanical','removal'] loop
  accuracy_decision=new.accuracy->>accuracy_axis;
  if accuracy_decision is null or accuracy_decision not in ('missing','illustrative','source-checked','verified','disputed') then raise exception 'Five independent accuracy states are required'; end if;
  if accuracy_decision='verified' and not exists(select 1 from public.accuracy_reviews r where r.geometry_revision_id=new.id and r.axis=accuracy_axis and r.decision='verified' and r.reviewer_id is not null and r.discrepancies='') then raise exception 'Verified geometry requires a recorded reviewer, method and evidence'; end if;
 end loop;
 if new.accuracy->>'dimensions'='verified' and (new.meters_per_unit is null or not exists(select 1 from public.geometry_measurements m where m.geometry_revision_id=new.id and m.review_state='verified' and m.independent_check and m.tolerance is not null and m.reviewer_id is not null)) then raise exception 'Verified dimensions require independent measurements and tolerances'; end if;
 if new.runtime_path is not null and (new.runtime_path like '%..%' or new.runtime_path like '%//%') then raise exception 'Invalid runtime asset path'; end if;
 return new;
end; $$;
