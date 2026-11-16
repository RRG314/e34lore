create or replace function public.current_permissions() returns text[] language sql stable security invoker set search_path='' as $$
 select array_remove(array[
 case when e34_private.has_role('reviewer') then 'reviewer' end,
 case when e34_private.has_role('moderator') then 'moderator' end,
 case when e34_private.has_role('admin') then 'admin' end
 ],null);
$$;
drop policy moderator_threads_read on public.threads;
drop policy moderator_posts_read on public.posts;
alter policy thread_read on public.threads to anon;
alter policy post_read on public.posts to anon;
create policy authenticated_threads_read on public.threads for select to authenticated using(not hidden or author_id=(select auth.uid()) or (select e34_private.has_role('moderator')));
create policy authenticated_posts_read on public.posts for select to authenticated using(((not hidden or author_id=(select auth.uid())) and exists(select 1 from public.threads where id=thread_id and not hidden)) or (select e34_private.has_role('moderator')));
create index answers_acceptor on public.accepted_answers(accepted_by);
create index answers_post on public.accepted_answers(post_id,thread_id);
create index assemblies_component on public.assemblies(component_id);
create index assemblies_source on public.assemblies(source_id);
create index guides_component on public.guides(component_id);
create index guides_source on public.guides(source_id);
create index notifications_thread on public.notifications(thread_id);
create index vehicles_model on public.owned_vehicles(model_id);
create index fitments_model on public.part_fitments(model_id);
create index fitments_source on public.part_fitments(source_id);
create index interchange_source on public.part_interchanges(source_id);
create index interchange_from on public.part_interchanges(source_part_id);
create index interchange_to on public.part_interchanges(target_part_id);
create index parts_assembly on public.parts(assembly_id);
create index parts_source on public.parts(source_id);
create index outcomes_vehicle on public.repair_outcomes(vehicle_id,user_id);
create index threads_component on public.threads(component_id);
create index threads_model on public.threads(model_id);
