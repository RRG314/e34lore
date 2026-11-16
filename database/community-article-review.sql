create or replace function public.propose_comment_for_review(source_post uuid,expected_version integer,target_kind text,target_identity text,proposal text,source_url text default null) returns uuid
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
 elsif target_kind='article' then
  if not exists(select 1 from public.reference_article_index where id=target_identity) then raise exception 'Choose a canonical article'; end if;
 else raise exception 'Choose a guide, part or article review target'; end if;
 insert into public.review_submissions(target_type,target_id,correction,evidence_url,source_post_id,source_post_version)
 values(target_kind,target_identity,proposal,source_url,source_post,expected_version) returning id into submission;
 return submission;
end $$;
