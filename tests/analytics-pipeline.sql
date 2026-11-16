-- Disposable database only. This transaction never touches production data.
begin;
create function pg_temp.analytics_assert(ok boolean,label text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL analytics: %',label;end if;end$$;
insert into auth.users(id,email,email_confirmed_at,is_anonymous)values('a3400000-0000-4000-8000-000000000001','analytics-fixture@example.invalid',now(),false);
insert into auth.sessions(id,user_id,aal)values('a3400000-0000-4000-9000-000000000001','a3400000-0000-4000-8000-000000000001','aal2');
insert into auth.mfa_factors(user_id,status)values('a3400000-0000-4000-8000-000000000001','verified');
insert into e34_private.staff_roles values('a3400000-0000-4000-8000-000000000001','admin');
select pg_temp.analytics_assert((public.analytics_public_config()->>'enabled')::boolean=false,'initially disabled without owner approval');
set local role anon;
do $$begin begin perform public.analytics_report(current_date,current_date,null);raise exception 'should deny';exception when insufficient_privilege then null;end;begin perform public.analytics_ingest(gen_random_uuid(),'{}');raise exception 'should deny';exception when insufficient_privilege then null;end;begin perform public.analytics_forget(gen_random_uuid());raise exception 'should deny';exception when insufficient_privilege then null;end;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"a3400000-0000-4000-8000-000000000001","session_id":"a3400000-0000-4000-9000-000000000001","aal":"aal1","role":"authenticated"}',true);
set local role authenticated;
do $$begin begin perform public.analytics_configure(true,2);raise exception 'should deny';exception when insufficient_privilege then null;end;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"a3400000-0000-4000-8000-000000000001","session_id":"a3400000-0000-4000-9000-000000000001","aal":"aal2","role":"authenticated"}',true);
set local role authenticated;
select public.analytics_configure(true,2);
reset role;
-- Strict public page events; intentionally use current timestamps, never real visitors.
create function pg_temp.ev(n integer,pg integer,event_name text,r text,seq integer,extra jsonb default '{}')returns jsonb language sql as $$select jsonb_build_object('v',1,'id','a3400000-0000-4000-8000-'||lpad(n::text,12,'0'),'page','a3400000-0000-4000-9000-'||lpad(pg::text,12,'0'),'name',event_name,'resource',r,'seq',seq,'at',extract(epoch from clock_timestamp())*1000)||extra$$;
create function pg_temp.batch(events jsonb)returns jsonb language sql as $$select jsonb_build_object('revision',2,'consent',jsonb_build_object('traffic',true,'search',true,'performance',true),'device','mobile','browser','Safari','events',events)$$;
select set_config('test.batch',pg_temp.batch(jsonb_build_array(pg_temp.ev(1,1,'page_view','/search',0),pg_temp.ev(2,1,'search','/search',1,'{"search_id":"a3400000-0000-4000-8000-000000000500","topic":"vanos","results":0}'),pg_temp.ev(3,1,'search_result','/search',2,'{"search_id":"a3400000-0000-4000-8000-000000000500","target":"part:coolant-pump"}'),pg_temp.ev(4,2,'page_view','/guides/identify-your-engine',0)))::text,true);
select pg_temp.analytics_assert((public.analytics_ingest('a3400000-0000-4000-8000-000000000100',current_setting('test.batch')::jsonb)->>'accepted')::integer=4,'page→search→catalog→guide accepted');
select pg_temp.analytics_assert((public.analytics_ingest('a3400000-0000-4000-8000-000000000100',current_setting('test.batch')::jsonb)->>'accepted')::integer=0,'retry event UUIDs deduplicated');
select pg_temp.analytics_assert((select count(*)from e34_private.analytics_sessions)=1,'same browser cross-tab pages share server session');
select pg_temp.analytics_assert(not exists(select 1 from e34_private.analytics_visitors v where v.first_seen is distinct from(select min(p.viewed_at)from e34_private.analytics_sessions ss join e34_private.analytics_pages p on p.session_id=ss.id where ss.visitor=v.id)),'first seen uses the accepted page timestamp, not its queued flush');
select pg_temp.analytics_assert((public.analytics_ingest('a3400000-0000-4000-8000-000000000300',pg_temp.batch(jsonb_build_array(pg_temp.ev(7,99,'component_select',(select id from e34_private.analytics_resources where kind='component' order by id limit 1),0))))->>'accepted')::int=0,'missing page cannot accept an interaction');
select pg_temp.analytics_assert((select count(*)from e34_private.analytics_visitors)=1,'no empty visitor identity survives a missing-page batch');

select public.analytics_ingest('a3400000-0000-4000-8000-000000000200',pg_temp.batch(jsonb_build_array(pg_temp.ev(10,3,'page_view','/workshop',0),pg_temp.ev(11,3,'component_select',(select id from e34_private.analytics_resources where kind='component' order by id limit 1),1),pg_temp.ev(12,3,'search_result','/workshop',2,'{"search_id":"a3400000-0000-4000-8000-000000000500","target":"part:coolant-pump"}'))));
select pg_temp.analytics_assert((select count(*)from e34_private.analytics_events where name='search_result')=1,'foreign-session search ID rejected');
set local role authenticated;
select set_config('test.report',public.analytics_report((now()at time zone 'UTC')::date,(now()at time zone 'UTC')::date,null)::text,true);
reset role;
select pg_temp.analytics_assert((current_setting('test.report')::jsonb#>>'{current,views}')::int=3,'exact views');
select pg_temp.analytics_assert((current_setting('test.report')::jsonb#>>'{current,browsers}')::int=2,'range distinct IDs, not sum of pages');
select pg_temp.analytics_assert((current_setting('test.report')::jsonb#>>'{current,sessions}')::int=2,'actual server sessions');
select pg_temp.analytics_assert((current_setting('test.report')::jsonb#>>'{current,zero_results}')::int=1,'zero-result outcome');
select pg_temp.analytics_assert(current_setting('test.report')::jsonb#>'{current,funnels,0,steps}'='[2,1,1,1]'::jsonb,'ordered search funnel');
select pg_temp.analytics_assert(current_setting('test.report')::jsonb#>'{current,funnels,1,steps}'='[1,1,0]'::jsonb,'does not join another visitor guide to workshop');
select pg_temp.analytics_assert((current_setting('test.report')::jsonb#>>'{previous,available}')::boolean=false,'history before activation unavailable, not measured zero');
select pg_temp.analytics_assert(current_setting('test.report') not like '%analytics-fixture%' and current_setting('test.report') not like '%a3400000%' and current_setting('test.report') not like '%hash_key%','no individual/private identifiers in report');
-- Unknown resources cause atomic rejection, including earlier events in the batch.
do $$begin begin perform public.analytics_ingest('a3400000-0000-4000-8000-000000000100',pg_temp.batch(jsonb_build_array(pg_temp.ev(20,4,'page_view','/garage/private-vin',0))));raise exception 'should reject';exception when raise_exception then if sqlerrm='should reject'then raise;end if;end;end$$;
select pg_temp.analytics_assert((select count(*)from e34_private.analytics_pages)=3,'private route never persisted');
select public.analytics_forget('a3400000-0000-4000-8000-000000000100');
select pg_temp.analytics_assert((select count(*)from e34_private.analytics_visitors)=1 and (select count(*)from e34_private.analytics_pages)=1 and (select count(*)from e34_private.analytics_events)=2,'forget cascades browser sessions/pages/events');
select pg_temp.analytics_assert((public.analytics_ingest('a3400000-0000-4000-8000-000000000100',current_setting('test.batch')::jsonb)->>'status')='erased','late retries cannot recreate erased history');

-- Metadata restarts for new choices reuse the public document instead of counting another view.
select public.analytics_ingest('a3400000-0000-4000-8000-000000000400',jsonb_set(pg_temp.batch(jsonb_build_array(pg_temp.ev(60,8,'page_view','/manual',0))),'{consent,search}','false'));
select pg_temp.analytics_assert(not(select search_enabled from e34_private.analytics_pages where id='a3400000-0000-4000-9000-000000000008'),'initial category choice retained');
select public.analytics_ingest('a3400000-0000-4000-8000-000000000400',pg_temp.batch(jsonb_build_array(pg_temp.ev(61,8,'page_view','/manual',1),pg_temp.ev(62,8,'search','/search',2,'{"search_id":"a3400000-0000-4000-8000-000000000600","topic":"brake","results":0}'))));
select pg_temp.analytics_assert((select count(*)from e34_private.analytics_pages where id='a3400000-0000-4000-9000-000000000008')=1 and (select count(*)from e34_private.analytics_events where page='a3400000-0000-4000-9000-000000000008' and name='page_view')=1,'preference changes do not duplicate a page view');
select pg_temp.analytics_assert((select count(*)from e34_private.analytics_events where name='search' and search_id='a3400000-0000-4000-8000-000000000600')=1,'newly permitted category accepted with current batch consent');
select pg_temp.analytics_assert(not(select search_enabled from e34_private.analytics_pages where id='a3400000-0000-4000-9000-000000000008'),'later choices do not manufacture historical consent coverage');
select public.analytics_forget('a3400000-0000-4000-8000-000000000400');
-- Another tab may have started the shared session earlier than this document.
update e34_private.analytics_sessions set started_at=clock_timestamp()-interval '5 hours',last_seen=clock_timestamp();
select pg_temp.analytics_assert((public.analytics_ingest('a3400000-0000-4000-8000-000000000200',pg_temp.batch(jsonb_build_array(pg_temp.ev(70,3,'explode','/workshop',5,'{"value":2}'))))->>'status')='page_expired','expired shared session is explicit instead of silently dropping activity');
select public.analytics_ingest('a3400000-0000-4000-8000-000000000200',pg_temp.batch(jsonb_build_array(pg_temp.ev(71,9,'page_view','/workshop',0),pg_temp.ev(70,9,'explode','/workshop',1,'{"value":2}'))));
select pg_temp.analytics_assert((select count(*)from e34_private.analytics_sessions)=2 and (select count(*)from e34_private.analytics_events where id='a3400000-0000-4000-8000-000000000070')=1,'resumed view uses a new session and original action is recorded exactly once');
-- Leave the same single surviving public view for the rollup assertion below.
delete from e34_private.analytics_pages where id='a3400000-0000-4000-9000-000000000003';
set local role authenticated;
select public.analytics_configure(false,2);
reset role;
select pg_temp.analytics_assert((public.analytics_ingest('a3400000-0000-4000-8000-000000000100',current_setting('test.batch')::jsonb)->>'status')='disabled','paused collection writes no visits');
select e34_private.analytics_maintain();
select pg_temp.analytics_assert((select sum(views)from e34_private.analytics_daily)=1,'rollup rebuilt from surviving pages');
select public.analytics_gsc_import(jsonb_build_object('property','sc-domain:e34lore.com','start',current_date::text,'end',current_date::text,'capped',false,'rows',jsonb_build_array(jsonb_build_object('day',current_date::text,'dimension','date','key','all','clicks',3,'impressions',10,'position_sum',20))));
select pg_temp.analytics_assert((select sum(clicks)from e34_private.analytics_gsc_daily)=3,'provider facts stored separately');
-- All sensitive tables have RLS and no general API grants.
select pg_temp.analytics_assert(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='e34_private' and c.relname like 'analytics_%' and c.relkind='r' and not c.relrowsecurity),'RLS remains enabled');
select pg_temp.analytics_assert(not has_table_privilege('authenticated','e34_private.analytics_events','select'),'member raw event access denied');
rollback;
