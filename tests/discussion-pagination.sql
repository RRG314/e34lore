begin;
insert into auth.users(id,email,aud,role,created_at,updated_at) values('ed340000-0000-4000-8000-000000000299','e34-pagination-test@example.invalid','authenticated','authenticated',now(),now());
insert into public.threads(id,author_id,title,body,category,hidden) values
('ed340000-0000-4000-8000-000000000301','ed340000-0000-4000-8000-000000000299','e34paginationfixture first','Disposable catalog pagination integration fixture.','Parts & fitment',false),
('ed340000-0000-4000-8000-000000000302','ed340000-0000-4000-8000-000000000299','e34paginationfixture second','Disposable catalog pagination integration fixture.','Parts & fitment',false),
('ed340000-0000-4000-8000-000000000303','ed340000-0000-4000-8000-000000000299','e34paginationfixture third','Disposable catalog pagination integration fixture.','Parts & fitment',false),
('ed340000-0000-4000-8000-000000000304','ed340000-0000-4000-8000-000000000299','e34paginationfixture hidden','Disposable catalog pagination integration fixture.','Parts & fitment',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ declare first_page uuid[]; second_page uuid[]; cut_time timestamptz; begin
 select array_agg(id order by created_at desc,id desc) into first_page from public.browse_discussions('e34paginationfixture','Parts & fitment',2);
 if first_page<>array['ed340000-0000-4000-8000-000000000303'::uuid,'ed340000-0000-4000-8000-000000000302'::uuid] then raise exception 'First page ordering or hidden isolation failed'; end if;
 select created_at into cut_time from public.threads where id=first_page[2];
 select array_agg(id) into second_page from public.browse_discussions('e34paginationfixture','Parts & fitment',2,cut_time,first_page[2]);
 if second_page<>array['ed340000-0000-4000-8000-000000000301'::uuid] then raise exception 'Cursor skipped or duplicated equal-time records'; end if;
 if exists(select 1 from public.browse_discussions('e34paginationfixture','General discussion',2)) then raise exception 'Category filter failed'; end if;
end $$;
reset role;
select 'PASS: full-text/category filtering, hidden isolation and cursor pagination across equal timestamps' as verification;
rollback;
