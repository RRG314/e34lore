-- Published revisions are immutable. Sessions pin the exact graph revision.
create function e34_private.guard_twin_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.publication_status='published' then raise exception 'Withdraw the revision before deleting it'; end if; return old;
 end if;
 if old.graph is distinct from new.graph or old.configuration_id is distinct from new.configuration_id or old.revision is distinct from new.revision or old.graph_id is distinct from new.graph_id then
  raise exception 'Create a new configuration revision; existing workshop sessions must remain reproducible';
 end if; return new;
end; $$;
create trigger twin_immutable_graph before update or delete on public.digital_twin_configuration_revisions for each row execute function e34_private.guard_twin_revision();

create function e34_private.validate_twin_session() returns trigger language plpgsql security definer set search_path='' as $$
declare g jsonb; snap jsonb; elem jsonb; dep jsonb; conn jsonb; node jsonb; ids text[]; connection_ids text[]; field text; selected_mode text;
begin
 select graph into g from public.digital_twin_configuration_revisions where id=new.configuration_revision_id and configuration_id=new.configuration_id and publication_status='published';
 if g is null then raise exception 'Configuration revision is unavailable'; end if;
 if jsonb_typeof(new.state)<>'object' or new.state->>'schemaVersion'<>'1' or new.state->>'graphId'<>g->>'id' or new.state->>'graphRevision'<>g->>'revision' or new.state->>'mode' not in ('explore','constrained') then raise exception 'Invalid workshop identity or mode'; end if;
 if not(new.state ?& array['schemaVersion','graphId','graphRevision','mode','present','past','future']) or (select count(*) from jsonb_object_keys(new.state))<>7 then raise exception 'Incomplete workshop state'; end if;
 if jsonb_typeof(new.state->'past')<>'array' or jsonb_typeof(new.state->'future')<>'array' or jsonb_array_length(new.state->'past')>100 or jsonb_array_length(new.state->'future')>100 then raise exception 'Invalid workshop history'; end if;
 select array_agg(n->>'id') into ids from jsonb_array_elements(g->'nodes') n;
 select coalesce(array_agg(n->>'id'),'{}') into connection_ids from jsonb_array_elements(g->'connections') n;
 selected_mode=new.state->>'mode';
 for snap in select new.state->'present' union all select value from jsonb_array_elements(new.state->'past') union all select value from jsonb_array_elements(new.state->'future') loop
  if jsonb_typeof(snap)<>'object' or not(snap ?& array['removed','hidden','detached','selected','explosion']) or (select count(*) from jsonb_object_keys(snap))<>5 then raise exception 'Invalid workshop snapshot'; end if;
  if jsonb_typeof(snap->'explosion')<>'number' or (snap->>'explosion')::numeric not between 0 and 1 then raise exception 'Invalid separation'; end if;
  if snap->'selected'<>'null'::jsonb and (jsonb_typeof(snap->'selected')<>'string' or not(snap->>'selected'=any(ids))) then raise exception 'Unknown selected node'; end if;
  foreach field in array array['removed','hidden','detached'] loop
   if jsonb_typeof(snap->field)<>'array' or jsonb_array_length(snap->field)>10000 then raise exception 'Invalid component list'; end if;
   if (select count(*) from jsonb_array_elements(snap->field))<>(select count(distinct value) from jsonb_array_elements(snap->field)) then raise exception 'Duplicate component identity'; end if;
   for elem in select value from jsonb_array_elements(snap->field) loop
    if jsonb_typeof(elem)<>'string' or not((elem#>>'{}')=any(case when field='detached' then connection_ids else ids end)) then raise exception 'Unknown component or connection'; end if;
   end loop;
  end loop;
  if snap->'removed' ? (g->'configuration'->>'rootNodeId') then raise exception 'Vehicle root cannot be removed'; end if;
  if selected_mode='constrained' then
   for node in select value from jsonb_array_elements(g->'nodes') loop
    if snap->'removed' ? (node->>'id') then
     if coalesce(node->'accuracy'->>'removal','missing') not in ('source-checked','verified') then raise exception 'Removal needs technical review'; end if;
     for dep in select value from jsonb_array_elements(g->'dependencies') where value->>'target'=node->>'id' loop
      if not(snap->'removed' ? (dep->>'prerequisite')) or dep->>'reviewState' not in ('source-checked','verified') or jsonb_array_length(dep->'evidence')=0 then raise exception 'Removal prerequisite is not satisfied'; end if;
     end loop;
     for conn in select value from jsonb_array_elements(g->'connections') where value->>'kind' in ('electrical','fluid') and (value->>'from'=node->>'id' or value->>'to'=node->>'id') loop
      if not(snap->'detached' ? (conn->>'id')) then raise exception 'Disconnect the documented connection first'; end if;
     end loop;
    end if;
   end loop;
  end if;
 end loop;
 new.updated_at=now(); return new;
end; $$;
create trigger twin_session_validation before insert or update on public.user_workshop_sessions for each row execute function e34_private.validate_twin_session();

create function e34_private.gate_twin_accuracy() returns trigger language plpgsql security definer set search_path='' as $$
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
create trigger twin_accuracy_gate before insert or update on public.geometry_revisions for each row execute function e34_private.gate_twin_accuracy();
revoke all on function e34_private.guard_twin_revision(),e34_private.validate_twin_session(),e34_private.gate_twin_accuracy() from public,anon,authenticated;
-- Cover composite graph foreign keys, not only their first column.
create index twin_parent_node on public.assembly_nodes(configuration_revision_id,parent_id);
create index twin_reconstruction_node on public.reconstruction_jobs(configuration_revision_id,node_id);
create index twin_fastener_part on public.fastener_connections(part_id);
create index twin_connector_part on public.electrical_connections(connector_part_id);
create index twin_condition_part on public.component_condition_examples(part_id);
create index twin_condition_geometry on public.component_condition_examples(geometry_revision_id);
create index twin_repair_guide on public.repair_scene_steps(guide_id);
create index twin_repair_source on public.repair_scene_steps(source_id);
