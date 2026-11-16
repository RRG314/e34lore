-- Real hosted RLS/atomicity checks. These identities and contributions never commit.
begin;
insert into auth.users(id,email,aud,role,created_at,updated_at,email_confirmed_at) values
 ('ed340000-0000-4000-8000-000000000201','community-author@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now()),
 ('ed340000-0000-4000-8000-000000000202','community-voter@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now()),
 ('ed340000-0000-4000-8000-000000000203','community-staff@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now()),
 ('ed340000-0000-4000-8000-000000000204','community-unconfirmed@example.invalid','authenticated','authenticated',now(),now(),null);
insert into e34_private.staff_roles(user_id,role) values('ed340000-0000-4000-8000-000000000203','moderator');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000201","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
insert into public.threads(id,title,body,category,starter_topic_id,tag_ids) values('ed340000-0000-4000-8000-000000000220','Community feedback integration','A genuine transaction-only test observation, never published.','Technical help','cooling-triage',array['engine:m50']);
insert into public.posts(id,thread_id,body) values('ed340000-0000-4000-8000-000000000230','ed340000-0000-4000-8000-000000000220','Original test advice with configuration-specific context.');
do $$ begin
 if (select category from public.threads where id='ed340000-0000-4000-8000-000000000220')<>'Technical Help & Troubleshooting' then raise exception 'Legacy category normalization failed'; end if;
 begin perform public.set_community_feedback('ed340000-0000-4000-8000-000000000230',1,'helpful'); raise exception 'TEST: self vote allowed'; exception when raise_exception then if sqlerrm='TEST: self vote allowed' then raise; end if; end;
 begin update public.threads set tag_ids=array['status:reviewed'] where id='ed340000-0000-4000-8000-000000000220'; raise exception 'TEST: verification tag forged'; exception when raise_exception then if sqlerrm='TEST: verification tag forged' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000202","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 begin perform public.set_community_feedback('ed340000-0000-4000-8000-000000000230',1,'bad-advice','too short','incorrect'); raise exception 'TEST: missing explanation accepted'; exception when raise_exception then if sqlerrm='TEST: missing explanation accepted' then raise; end if; end;
 if exists(select 1 from public.posts where author_id=auth.uid()) then raise exception 'Failed feedback left an orphan reply'; end if;
 begin insert into public.community_feedback(post_id,user_id,value,target_version) values('ed340000-0000-4000-8000-000000000230',auth.uid(),'helpful',1); raise exception 'TEST: direct feedback mutation allowed'; exception when insufficient_privilege then null; end;
end $$;
select public.set_community_feedback('ed340000-0000-4000-8000-000000000230',1,'bad-advice','This test advice omits a configuration condition. Compare the installed hardware with the source drawing before choosing this method.','configuration');
do $$ declare e uuid; begin
 select explanation_post_id into e from public.community_feedback where user_id=auth.uid();
 if not exists(select 1 from public.posts where id=e and in_reply_to_post_id='ed340000-0000-4000-8000-000000000230' and author_id=auth.uid()) then raise exception 'Explanation not linked to target or voter'; end if;
 if (select bad_advice from public.community_feedback_summary(array['ed340000-0000-4000-8000-000000000230'::uuid]))<>1 then raise exception 'Bad-advice aggregate failed'; end if;
 begin update public.posts set body='No.' where id=e; raise exception 'TEST: explanation shortened'; exception when raise_exception then if sqlerrm='TEST: explanation shortened' then raise; end if; end;
 begin perform public.set_community_feedback('ed340000-0000-4000-8000-000000000230',1,'bad-advice',repeat('Explanation ',8),'other'); raise exception 'TEST: duplicate explanation created'; exception when raise_exception then if sqlerrm='TEST: duplicate explanation created' then raise; end if; end;
end $$;
select public.set_community_feedback('ed340000-0000-4000-8000-000000000230',1,'helpful');
select public.set_community_feedback('ed340000-0000-4000-8000-000000000230',1,'helpful');
do $$ begin
 if (select count(*) from public.community_feedback where user_id=auth.uid())<>1 then raise exception 'Duplicate vote'; end if;
 if (select helpful from public.community_feedback_summary(array['ed340000-0000-4000-8000-000000000230'::uuid]))<>1 then raise exception 'Helpful count not exact'; end if;
 if not exists(select 1 from public.posts where author_id=auth.uid() and in_reply_to_post_id is not null) then raise exception 'Changing vote erased the discussion explanation'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 begin perform * from public.community_feedback; raise exception 'TEST: private voter rows exposed'; exception when insufficient_privilege then null; end;
 if not exists(select 1 from public.top_helpful_comments() where post_id='ed340000-0000-4000-8000-000000000230' and helpful=1) then raise exception 'Top comments did not include ranked reply'; end if;
 if exists(select 1 from public.community_feedback_summary(array['ed340000-0000-4000-8000-000000000230'::uuid]) where my_vote is not null) then raise exception 'Anonymous voter identity exposed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000201","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
update public.posts set body='Edited test advice now changes the recommendation and must be re-evaluated.' where id='ed340000-0000-4000-8000-000000000230';
do $$ begin
 if exists(select 1 from public.top_helpful_comments() where post_id='ed340000-0000-4000-8000-000000000230') then raise exception 'Old endorsement carried to edited advice'; end if;
 if exists(select 1 from public.community_feedback) then raise exception 'Another voter identity exposed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000202","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 begin perform public.set_community_feedback('ed340000-0000-4000-8000-000000000230',1,'helpful'); raise exception 'TEST: stale vote accepted'; exception when raise_exception then if sqlerrm='TEST: stale vote accepted' then raise; end if; end;
end $$;
select public.set_community_feedback('ed340000-0000-4000-8000-000000000230',2,'helpful');
select public.propose_comment_for_review('ed340000-0000-4000-8000-000000000230',2,'guide','cooling-system-visual-check','A transaction-only correction proposal tied to the current immutable comment version.');
insert into public.community_preferences(target_user_id,mode) values('ed340000-0000-4000-8000-000000000201','block');
do $$ begin
 if exists(select 1 from public.top_helpful_comments() where post_id='ed340000-0000-4000-8000-000000000230') then raise exception 'Muted author remained in recommendations'; end if;
 begin perform public.set_community_feedback('ed340000-0000-4000-8000-000000000230',2,'helpful'); raise exception 'TEST: block bypassed'; exception when raise_exception then if sqlerrm not like 'A member block%' then raise; end if; end;
 begin insert into public.posts(thread_id,body) values('ed340000-0000-4000-8000-000000000220','Blocked reply should not be accepted.'); raise exception 'TEST: blocked reply allowed'; exception when raise_exception then if sqlerrm not like 'A member block%' then raise; end if; end;
end $$;
delete from public.community_preferences where user_id=auth.uid();
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000204","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 begin perform public.set_community_feedback('ed340000-0000-4000-8000-000000000230',2,'helpful'); raise exception 'TEST: unverified contribution allowed'; exception when raise_exception then if sqlerrm='TEST: unverified contribution allowed' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000203","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 begin perform public.moderate_community('hide-post','ed340000-0000-4000-8000-000000000230','Test moderation reason'); raise exception 'TEST: staff bypassed MFA'; exception when raise_exception then if sqlerrm='TEST: staff bypassed MFA' then raise; end if; end;
 begin update public.posts set hidden=true where id='ed340000-0000-4000-8000-000000000230'; raise exception 'TEST: direct staff update bypassed MFA'; exception when raise_exception then if sqlerrm='TEST: direct staff update bypassed MFA' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000203","role":"authenticated","aal":"aal2"}',true);
select public.moderate_community('hide-post','ed340000-0000-4000-8000-000000000230','Test hide of unsupported advice');
do $$ begin
 if exists(select 1 from public.top_helpful_comments() where post_id='ed340000-0000-4000-8000-000000000230') then raise exception 'Hidden advice still ranked'; end if;
 if exists(select 1 from public.community_feedback_summary(array['ed340000-0000-4000-8000-000000000230'::uuid])) then raise exception 'Hidden advice aggregate exposed'; end if;
end $$;
select public.moderate_community('restore-post','ed340000-0000-4000-8000-000000000230','Restore after integration check');
select public.moderate_community('restrict','ed340000-0000-4000-8000-000000000202','Temporary test posting restriction','timeout',now()+interval '1 hour','Private test staff note');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000202","role":"authenticated","aal":"aal1"}',true);
do $$ declare r uuid; begin
 begin perform public.set_community_feedback('ed340000-0000-4000-8000-000000000230',2,'helpful'); raise exception 'TEST: restricted user voted'; exception when raise_exception then if sqlerrm='TEST: restricted user voted' then raise; end if; end;
 select id into r from public.my_community_restrictions() limit 1;
 perform public.appeal_community_restriction(r,'This is a transaction-only test appeal with enough detail to review.');
 if not exists(select 1 from public.community_appeals where user_id=auth.uid()) then raise exception 'Restricted user could not appeal'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
-- Stable reply pages include equal timestamps and a direct focus target.
insert into public.posts(id,thread_id,author_id,body,created_at)
 select ('ed340000-0000-4000-8000-'||lpad((500+n)::text,12,'0'))::uuid,'ed340000-0000-4000-8000-000000000220','ed340000-0000-4000-8000-000000000201','Pagination observation '||n,now()+interval '1 minute' from generate_series(1,55)n;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ declare c public.posts; begin
 if (select count(*) from public.browse_community_replies('ed340000-0000-4000-8000-000000000220',51))<>51 then raise exception 'Reply page not bounded'; end if;
 select * into c from public.browse_community_replies('ed340000-0000-4000-8000-000000000220',51) offset 49 limit 1;
 if exists(select 1 from public.browse_community_replies('ed340000-0000-4000-8000-000000000220',51,c.created_at,c.id) where id=c.id) then raise exception 'Reply cursor duplicated boundary'; end if;
 if (select id from public.browse_community_replies('ed340000-0000-4000-8000-000000000220',51,null,null,'ed340000-0000-4000-8000-000000000555') limit 1)<>'ed340000-0000-4000-8000-000000000555' then raise exception 'Ranked reply focus failed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
-- Removing a source account must not be blocked by a linked review submission.
delete from auth.users where id='ed340000-0000-4000-8000-000000000201';
do $$ begin
 if exists(select 1 from public.community_feedback where post_id='ed340000-0000-4000-8000-000000000230') then raise exception 'Account removal left votes'; end if;
 if exists(select 1 from public.review_submissions where source_post_id='ed340000-0000-4000-8000-000000000230') then raise exception 'Account removal left source linkage'; end if;
end $$;
select 'PASS: category compatibility, atomic explanations, one vote, no self-votes, private identities, version expiry, hidden-content exclusion, email confirmation, MFA, restrictions, appeals, block enforcement, review-source cascade and reply pagination' as verification;
rollback;
