-- Coarse opt-in analytics only. Schedule retention independently of site traffic.
create extension if not exists pg_cron with schema pg_catalog;
create or replace function e34_private.record_usage(area_name text) returns void language plpgsql security definer set search_path='' as $$begin
 if area_name not in ('home','reference','manual','guides','catalog','workshop','diagnostics','community','cars','app') then return; end if;
 insert into e34_private.usage_daily(day,area,opens) values(current_date,area_name,1) on conflict(day,area) do update set opens=least(1000000,e34_private.usage_daily.opens+1);
 delete from e34_private.usage_daily where day<current_date-89;
end$$;
select cron.schedule('e34-usage-retention','15 3 * * *',$job$
 delete from e34_private.usage_daily where day<current_date-89;
 delete from cron.job_run_details where jobid=(select jobid from cron.job where jobname='e34-usage-retention') and end_time<now()-interval '30 days';
$job$);
