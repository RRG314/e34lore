-- Validate review-source links on every write path, not only the convenience RPC.
create function e34_private.guard_review_source() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.source_post_id is distinct from old.source_post_id or new.source_post_version is distinct from old.source_post_version) and not (new.source_post_id is null and new.source_post_version is null and not exists(select 1 from public.contribution_revisions r where r.post_id=old.source_post_id and r.content_version=old.source_post_version)) then raise exception 'Review source is immutable'; end if;
 if tg_op='INSERT' and new.source_post_id is not null then
  perform e34_private.community_can_contribute(auth.uid());
  if not exists(select 1 from public.posts p join public.threads t on t.id=p.thread_id where p.id=new.source_post_id and p.content_version=new.source_post_version and not p.hidden and not t.hidden) then raise exception 'Choose a visible current comment version'; end if;
 end if;
 return new;
end $$;
revoke all on function e34_private.guard_review_source() from public,anon,authenticated;
create trigger a_review_source before insert or update on public.review_submissions for each row execute function e34_private.guard_review_source();

create or replace function public.top_helpful_comments()
returns table(post_id uuid,thread_id uuid,thread_title text,body text,display_name text,helpful bigint,bad_advice bigint,content_version integer)
language sql stable security definer set search_path='' as $$
 select p.id,p.thread_id,t.title,left(p.body,500),coalesce(pr.display_name,'Member'),
 count(*) filter(where f.value='helpful'),count(*) filter(where f.value='bad-advice'),p.content_version
 from public.posts p join public.threads t on t.id=p.thread_id
 join public.community_feedback f on f.post_id=p.id and f.target_version=p.content_version
 left join public.profiles pr on pr.id=p.author_id
 where not p.hidden and not t.hidden
 and not exists(select 1 from public.community_preferences pref where pref.user_id=auth.uid() and pref.target_user_id in (p.author_id,t.author_id))
 and (f.value='helpful' or exists(select 1 from public.posts e where e.id=f.explanation_post_id and not e.hidden and e.thread_id=p.thread_id and e.author_id=f.user_id and e.in_reply_to_post_id=p.id and char_length(btrim(e.body))>=40))
 group by p.id,t.id,pr.display_name
 having count(*) filter(where f.value='helpful')>0
 order by count(*) filter(where f.value='helpful') desc,count(*) filter(where f.value='bad-advice'),p.created_at,p.id limit 5;
$$;
