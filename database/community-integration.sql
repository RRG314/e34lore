-- Stable pages of replies; a ranked-comment link can open its exact page.
create function public.browse_community_replies(discussion uuid,page_size integer default 51,cursor_created_at timestamptz default null,cursor_id uuid default null,focus_post uuid default null)
returns setof public.posts language sql stable security invoker set search_path='' as $$
 select p.* from public.posts p where p.thread_id=discussion
 and ((cursor_created_at is null and cursor_id is null) or(p.created_at,p.id)>(cursor_created_at,cursor_id))
 and (focus_post is null or (p.created_at,p.id)>=(select f.created_at,f.id from public.posts f where f.id=focus_post and f.thread_id=discussion))
 order by p.created_at,p.id limit least(greatest(page_size,1),51);
$$;
revoke all on function public.browse_community_replies(uuid,integer,timestamptz,uuid,uuid) from public,anon,authenticated;
grant execute on function public.browse_community_replies(uuid,integer,timestamptz,uuid,uuid) to anon,authenticated;

-- A review refers to the original immutable version; it never auto-publishes it.
alter table public.review_submissions add column source_post_id uuid,
 add column source_post_version integer,
 add constraint review_source_version foreign key(source_post_id,source_post_version) references public.contribution_revisions(post_id,content_version) on delete set null,
 add constraint review_source_pair check((source_post_id is null)=(source_post_version is null));
create index review_source on public.review_submissions(source_post_id,source_post_version);
create function public.propose_comment_for_review(source_post uuid,expected_version integer,target_kind text,target_identity text,proposal text,source_url text default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare p public.posts; submission uuid;
begin
 select * into p from public.posts where id=source_post and not hidden;
 if p.id is null or not exists(select 1 from public.threads where id=p.thread_id and not hidden) then raise exception 'Comment unavailable'; end if;
 if p.content_version<>expected_version then raise exception 'Comment changed. Review its latest version first.'; end if;
 if target_kind='guide' then
  if not exists(select 1 from public.guides where id=target_identity) then raise exception 'Choose a canonical guide'; end if;
 elsif target_kind='part' then
  if not exists(select 1 from public.parts where id=target_identity) then raise exception 'Choose a canonical part'; end if;
 else raise exception 'Choose a guide or part review target'; end if;
 insert into public.review_submissions(target_type,target_id,correction,evidence_url,source_post_id,source_post_version)
 values(target_kind,target_identity,proposal,source_url,source_post,expected_version) returning id into submission;
 return submission;
end $$;
revoke all on function public.propose_comment_for_review(uuid,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function public.propose_comment_for_review(uuid,integer,text,text,text,text) to authenticated;
