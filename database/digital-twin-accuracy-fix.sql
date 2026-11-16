create or replace function e34_private.gate_twin_accuracy() returns trigger language plpgsql security definer set search_path='' as $$
declare accuracy_axis text; accuracy_decision text;
begin
 foreach accuracy_axis in array array['visual','dimensions','alignment','mechanical','removal'] loop
  accuracy_decision=new.accuracy->>accuracy_axis;
  if accuracy_decision is null or accuracy_decision not in ('missing','illustrative','source-checked','verified','disputed') then raise exception 'Five independent accuracy states are required'; end if;
  if accuracy_decision='verified' and not exists(select 1 from public.accuracy_reviews r where r.geometry_revision_id=new.id and r.axis=accuracy_axis and r.decision='verified' and r.reviewer_id is not null and r.discrepancies='') then raise exception 'Verified geometry requires a recorded reviewer, method and evidence'; end if;
 end loop;
 if new.accuracy->>'dimensions'='verified' and (new.meters_per_unit is null or not exists(select 1 from public.geometry_measurements m where m.geometry_revision_id=new.id and m.review_state='verified' and m.independent_check and m.tolerance is not null)) then raise exception 'Verified dimensions require independent measurements and tolerances'; end if;
 if new.runtime_path is not null and (new.runtime_path like '%..%' or new.runtime_path like '%//%') then raise exception 'Invalid runtime asset path'; end if;
 return new;
end; $$;
