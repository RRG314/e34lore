-- Fail closed for null/wrongly typed session identities, including JSON null.
create or replace function e34_private.twin_session_identity() returns trigger language plpgsql security definer set search_path='' as $$
declare g jsonb;
begin
 select graph into g from public.digital_twin_configuration_revisions where id=new.configuration_revision_id and configuration_id=new.configuration_id;
 if new.state->'schemaVersion' is distinct from '1'::jsonb or new.state->>'graphId' is distinct from g->>'id' or new.state->>'graphRevision' is distinct from g->>'revision' or coalesce(new.state->>'mode','') not in ('explore','constrained') then raise exception 'Invalid typed workshop identity'; end if;
 return new;
end; $$;
create trigger twin_session_identity before insert or update on public.user_workshop_sessions for each row execute function e34_private.twin_session_identity();
create function e34_private.twin_graph_row_immutable() returns trigger language plpgsql security definer set search_path='' as $$
declare revision_id text;
begin
 revision_id=case when tg_op='DELETE' then old.configuration_revision_id else new.configuration_revision_id end;
 if exists(select 1 from public.digital_twin_configuration_revisions where id=revision_id and publication_status='published') then raise exception 'Create a new graph revision before editing published assembly metadata'; end if;
 return case when tg_op='DELETE' then old else new end;
end; $$;
create function e34_private.twin_geometry_immutable() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.asset_id is distinct from new.asset_id or old.revision is distinct from new.revision or old.runtime_path is distinct from new.runtime_path or old.source_sha256 is distinct from new.source_sha256 or old.source_units is distinct from new.source_units or old.meters_per_unit is distinct from new.meters_per_unit then raise exception 'Create a new geometry revision when the source, scale or runtime asset changes'; end if;return new;
end; $$;
create trigger twin_geometry_identity before update on public.geometry_revisions for each row execute function e34_private.twin_geometry_immutable();
alter table public.reconstruction_jobs add constraint twin_target_revision check(node_id is null or configuration_revision_id is not null),add constraint twin_view_bounds check(jsonb_typeof(required_views)='array' and jsonb_array_length(required_views)<=100),add constraint twin_measurement_bounds check(jsonb_typeof(required_measurements)='array' and jsonb_array_length(required_measurements)<=100);
revoke all on function e34_private.twin_session_identity(),e34_private.twin_graph_row_immutable(),e34_private.twin_geometry_immutable() from public,anon,authenticated;
create trigger twin_published_metadata before insert or update or delete on public.assembly_nodes for each row execute function e34_private.twin_graph_row_immutable();
create trigger twin_published_metadata before insert or update or delete on public.assembly_relationships for each row execute function e34_private.twin_graph_row_immutable();
create trigger twin_published_metadata before insert or update or delete on public.mounting_points for each row execute function e34_private.twin_graph_row_immutable();
create trigger twin_published_metadata before insert or update or delete on public.fastener_connections for each row execute function e34_private.twin_graph_row_immutable();
create trigger twin_published_metadata before insert or update or delete on public.electrical_connections for each row execute function e34_private.twin_graph_row_immutable();
create trigger twin_published_metadata before insert or update or delete on public.fluid_connections for each row execute function e34_private.twin_graph_row_immutable();
create trigger twin_published_metadata before insert or update or delete on public.disassembly_dependencies for each row execute function e34_private.twin_graph_row_immutable();
create trigger twin_published_metadata before insert or update or delete on public.removal_animations for each row execute function e34_private.twin_graph_row_immutable();
create trigger twin_published_metadata before insert or update or delete on public.repair_scene_steps for each row execute function e34_private.twin_graph_row_immutable();
create trigger twin_published_metadata before insert or update or delete on public.component_condition_examples for each row execute function e34_private.twin_graph_row_immutable();
