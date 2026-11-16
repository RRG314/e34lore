alter table public.notifications add column target_url text;
create function e34_private.notify_acceptance() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or new.post_id is distinct from old.post_id then
  insert into public.notifications(user_id,thread_id,message,target_url)
  select author_id,new.thread_id,'Your reply was accepted by the discussion author.','/community/'||new.thread_id::text
  from public.posts where id=new.post_id and author_id<>new.accepted_by;
 end if;
 return new;
end $$;
revoke all on function e34_private.notify_acceptance() from public;
create trigger answer_notification after insert or update on public.accepted_answers for each row execute function e34_private.notify_acceptance();
create function e34_private.notify_correction_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status is distinct from old.status then
  insert into public.notifications(user_id,message,target_url) values(new.author_id,'Your technical submission is now marked '||replace(new.status,'_',' ')||'.','/admin');
 end if;
 return new;
end $$;
revoke all on function e34_private.notify_correction_review() from public;
create trigger correction_notification after update on public.review_submissions for each row execute function e34_private.notify_correction_review();
