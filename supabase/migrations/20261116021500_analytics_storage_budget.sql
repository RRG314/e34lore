-- Limit the collector's own storage independently of the parts catalog.
-- Retain the deployed collector's event validation, rate limits and grants.
do $migration$
declare
  definition text := pg_get_functiondef('public.analytics_ingest(uuid,jsonb)'::regprocedure);
  old_check constant text := 'pg_database_size(current_database())>=471859200';
begin
  if strpos(definition, old_check) = 0 then
    raise exception 'The analytics storage check has changed';
  end if;

  execute replace(definition, old_check, $budget$(
    select sum(pg_total_relation_size(relation))
    from unnest(array[
      'e34_private.analytics_visitors'::regclass,
      'e34_private.analytics_sessions'::regclass,
      'e34_private.analytics_pages'::regclass,
      'e34_private.analytics_events'::regclass,
      'e34_private.analytics_quality'::regclass,
      'e34_private.analytics_daily'::regclass,
      'e34_private.analytics_erased'::regclass
    ]) as storage(relation)
  ) >= 16 * 1024 * 1024$budget$);
end
$migration$;

-- Reuse the private daily counter and its existing 90-day retention schedule.
-- Only the category and series are accepted. No individual activity rows are stored.
create or replace function e34_private.record_usage(area_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if area_name is null or length(area_name) > 32 or (
    area_name not in ('home','reference','manual','guides','catalog','workshop','diagnostics','community','cars','app')
    and area_name !~ '^e(30|34):(scanner_open|scanner_capture|scanner_result|scanner_confirm|component_select|assembly_view|explode|search|search_result|guide_step|diagnostic_complete)$'
  ) then return; end if;

  insert into e34_private.usage_daily(day,area,opens)
  values((statement_timestamp() at time zone 'UTC')::date,area_name,1)
  on conflict(day,area) do update set opens=e34_private.usage_daily.opens+1
  where e34_private.usage_daily.opens<1000000;
end$$;

insert into e34_private.analytics_resources(id, path, title, kind)
values
  ('/electrical','/electrical','Wiring & electrical','page'),
  ('/e30','/e30','E30 Home','page'),
  ('/e30/workshop','/e30/workshop','E30 Workshop','page'),
  ('/e30/scanner','/e30/scanner','E30 Part Scanner','page'),
  ('/e30/parts/catalog','/e30/parts/catalog','E30 OEM catalog','page'),
  ('/e30/repairs','/e30/repairs','E30 Repair walkthroughs','page'),
  ('/e30/quick-reference','/e30/quick-reference','E30 Quick reference','page'),
  ('/e30/electrical','/e30/electrical','E30 Wiring & electrical','page'),
  ('/e30/manual','/e30/manual','E30 Service manual','page'),
  ('/e30/diagnostics','/e30/diagnostics','E30 Diagnostics','page'),
  ('/e30/encyclopedia','/e30/encyclopedia','E30 Encyclopedia','page'),
  ('/e30/resources','/e30/resources','E30 Resources','page'),
  ('/e30/search','/e30/search','E30 Site search','page')
on conflict(id) do nothing;
