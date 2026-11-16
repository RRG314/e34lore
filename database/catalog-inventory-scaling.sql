create index part_positions_active_context_part on public.part_assembly_positions(context_id,part_id) where active;
create index catalog_import_runs_context on e34_private.catalog_import_runs(context_id);
create or replace view public.catalog_inventory with(security_invoker=true) as
 select c.*,coalesce(a.assembly_count,0::bigint) as assembly_count,
 coalesce(p.position_count,0::bigint) as position_count,coalesce(p.distinct_parts,0::bigint) as distinct_parts
 from public.vehicle_catalog_contexts c
 left join(select catalog_context_id,count(*) as assembly_count from public.assemblies where catalog_context_id is not null group by catalog_context_id) a on a.catalog_context_id=c.id
 left join(select context_id,count(*) as position_count,count(distinct part_id) as distinct_parts from public.part_assembly_positions where active group by context_id) p on p.context_id=c.id;
