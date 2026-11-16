begin;
insert into auth.users(id,email,aud,role,created_at,updated_at,email_confirmed_at) values('ed340000-0000-4000-8000-000000000601','community-context@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now());
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000601","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ declare n public.assembly_nodes; other_part text; begin
 select a.* into n from public.assembly_nodes a join public.digital_twin_configuration_revisions r on r.id=a.configuration_revision_id where r.publication_status='published' and a.part_id is not null order by a.configuration_revision_id,a.id limit 1;
 if n.id is null then raise exception 'Published canonical node fixture unavailable'; end if;
 insert into public.threads(id,title,body,category,part_id,article_slug,diagnostic_slug,configuration_revision_id,node_id,tag_ids)
 values('ed340000-0000-4000-8000-000000000620','Linked canonical context integration','Temporary transaction-only reference context verification.','Technical help',n.part_id,'cooling-system','overheating',n.configuration_revision_id,n.id,array['engine:m21']);
 if not exists(select 1 from public.browse_community('Linked canonical context','Technical Help & Troubleshooting','engine:m21') where id='ed340000-0000-4000-8000-000000000620') then raise exception 'Controlled tag or context browse failed'; end if;
 select id into other_part from public.parts where id<>n.part_id order by id limit 1;
 begin update public.threads set part_id=other_part where id='ed340000-0000-4000-8000-000000000620'; raise exception 'TEST: mismatched node/part accepted'; exception when raise_exception then if sqlerrm not like 'Choose a published workshop node%' then raise; end if; end;
 begin update public.threads set article_slug='not-a-canonical-article' where id='ed340000-0000-4000-8000-000000000620'; raise exception 'TEST: forged article accepted'; exception when foreign_key_violation then null; end;
 begin update public.threads set configuration_revision_id='not-a-published-revision' where id='ed340000-0000-4000-8000-000000000620'; raise exception 'TEST: invalid revision accepted'; exception when raise_exception then if sqlerrm not like 'Choose a published workshop node%' then raise; end if; end;
end $$;
insert into public.posts(id,thread_id,body) values('ed340000-0000-4000-8000-000000000630','ed340000-0000-4000-8000-000000000620','A transaction-only comment proposed for review against a canonical article.');
select public.propose_comment_for_review('ed340000-0000-4000-8000-000000000630',1,'article','cooling-system','A sourced clarification proposal for the canonical article, kept distinct from an accepted discussion answer.');
do $$ begin
 if not exists(select 1 from public.review_submissions where source_post_id='ed340000-0000-4000-8000-000000000630' and source_post_version=1 and target_id='cooling-system' and status='pending') then raise exception 'Original-version article proposal missing'; end if;
 begin update public.reference_article_index set title='Member rewrite' where id='cooling-system'; raise exception 'TEST: member changed canonical index'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
update public.digital_twin_configuration_revisions set publication_status='withdrawn' where id=(select configuration_revision_id from public.threads where id='ed340000-0000-4000-8000-000000000620');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000601","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
-- Withdrawal of a reference must not block correction of an existing discussion.
update public.threads set body='An updated observation after its reference revision was withdrawn.' where id='ed340000-0000-4000-8000-000000000620';
do $$ begin
 if (select content_version from public.threads where id='ed340000-0000-4000-8000-000000000620')<>2 then raise exception 'Withdrawal blocked a normal correction'; end if;
end $$;
reset role;
select 'PASS: canonical article/diagnostic/workshop FKs, node-part consistency, controlled tags, source-version article review, index protection and withdrawn-source correction' as verification;
rollback;
