-- Only synthetic fixtures in the disposable local database; never hosted accounts.
begin;
create function pg_temp.check_member_count(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL member count: %', message; end if; end $$;
select public.community_member_count() as initial_count \gset
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('e34c0000-0000-4000-8000-000000000001','count-member@example.invalid',now(),false),
 ('e34c0000-0000-4000-8000-000000000002','count-guest@example.invalid',now(),true),
 ('e34c0000-0000-4000-8000-000000000003','count-unconfirmed@example.invalid',null,false),
 ('e34c0000-0000-4000-8000-000000000004','count-legacy@example.invalid',now(),null);
select pg_temp.check_member_count(public.community_member_count()=:'initial_count'::bigint+2,'registered accounts only; no guests or unconfirmed signups');
set local role anon;
select pg_temp.check_member_count(public.community_member_count()=:'initial_count'::bigint+2,'signed-out visitors can read the aggregate');
do $$begin
 begin perform email from auth.users; raise exception 'FAIL member count: exposed Auth rows';
 exception when insufficient_privilege then null; end;
 begin perform public.community_member_count('count-member@example.invalid'); raise exception 'FAIL member count: accepted an identity lookup';
 exception when undefined_function then null; end;
end$$;
reset role;
set local role authenticated;
select pg_temp.check_member_count(public.community_member_count()=:'initial_count'::bigint+2,'signed-in users get the same aggregate');
reset role;
update auth.users set email_confirmed_at=now() where id='e34c0000-0000-4000-8000-000000000003';
select pg_temp.check_member_count(public.community_member_count()=:'initial_count'::bigint+3,'newly confirmed account increases total');
delete from auth.users where id='e34c0000-0000-4000-8000-000000000001';
select pg_temp.check_member_count(public.community_member_count()=:'initial_count'::bigint+2,'account removal decreases total');
update auth.users set is_anonymous=false where id='e34c0000-0000-4000-8000-000000000002';
select pg_temp.check_member_count(public.community_member_count()=:'initial_count'::bigint+3,'guest conversion counts only after registration');
select pg_temp.check_member_count(not(select prosecdef from pg_proc where oid='public.community_member_count()'::regprocedure),'public wrapper does not have elevated privileges');
select pg_temp.check_member_count((select prosecdef and proconfig@>array['search_path=""'] from pg_proc where oid='e34_private.community_member_count()'::regprocedure),'private aggregate has a fixed search path');
rollback;
select 'PASS public member aggregate, signup/confirmation/removal, anonymous exclusion and private Auth boundary' as result;
