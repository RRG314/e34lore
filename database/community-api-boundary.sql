-- Keep privileged implementations outside PostgREST's exposed public schema.
-- Public entry points are invoker facades with fixed arguments. Private helpers
-- still enforce the same identity, visibility, rate, role and MFA conditions.
alter table e34_private.community_actions enable row level security;
alter table e34_private.community_restrictions enable row level security;
revoke all on e34_private.community_actions,e34_private.community_restrictions from public,anon,authenticated;
grant usage on schema e34_private to anon,authenticated;

alter function public.community_feedback_summary(uuid[]) set schema e34_private;
alter function public.top_helpful_comments() set schema e34_private;
alter function public.set_community_feedback(uuid,integer,text,text,text) set schema e34_private;
alter function public.my_community_restrictions() set schema e34_private;
alter function public.appeal_community_restriction(uuid,text) set schema e34_private;
alter function public.moderate_community(text,uuid,text,text,timestamptz,text) set schema e34_private;
alter function public.community_moderation_state() set schema e34_private;

create function public.community_feedback_summary(post_ids uuid[])
returns table(post_id uuid,helpful bigint,bad_advice bigint,my_vote text,explanation_post_id uuid)
language sql stable security invoker set search_path='' as $$select * from e34_private.community_feedback_summary(post_ids);$$;
create function public.top_helpful_comments()
returns table(post_id uuid,thread_id uuid,thread_title text,body text,display_name text,helpful bigint,bad_advice bigint,content_version integer)
language sql stable security invoker set search_path='' as $$select * from e34_private.top_helpful_comments();$$;
create function public.set_community_feedback(target_post uuid,expected_version integer,feedback_value text,explanation text default '',reason text default null)
returns uuid language sql security invoker set search_path='' as $$select e34_private.set_community_feedback(target_post,expected_version,feedback_value,explanation,reason);$$;
create function public.my_community_restrictions()
returns table(id uuid,kind text,reason text,expires_at timestamptz,revoked_at timestamptz,created_at timestamptz)
language sql stable security invoker set search_path='' as $$select * from e34_private.my_community_restrictions();$$;
create function public.appeal_community_restriction(restriction uuid,explanation text)
returns uuid language sql security invoker set search_path='' as $$select e34_private.appeal_community_restriction(restriction,explanation);$$;
create function public.moderate_community(action text,target_id uuid,reason text,restriction_kind text default null,until_time timestamptz default null,internal_note text default '')
returns void language sql security invoker set search_path='' as $$select e34_private.moderate_community(action,target_id,reason,restriction_kind,until_time,internal_note);$$;
create function public.community_moderation_state()
returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.community_moderation_state();$$;

revoke all on function public.community_feedback_summary(uuid[]),public.top_helpful_comments(),public.set_community_feedback(uuid,integer,text,text,text),public.my_community_restrictions(),public.appeal_community_restriction(uuid,text),public.moderate_community(text,uuid,text,text,timestamptz,text),public.community_moderation_state() from public,anon,authenticated;
grant execute on function public.community_feedback_summary(uuid[]),public.top_helpful_comments() to anon,authenticated;
grant execute on function public.set_community_feedback(uuid,integer,text,text,text),public.my_community_restrictions(),public.appeal_community_restriction(uuid,text),public.moderate_community(text,uuid,text,text,timestamptz,text),public.community_moderation_state() to authenticated;

-- A mistyped staff target must not create a misleading successful audit entry.
create or replace function e34_private.moderate_community(action text,target_id uuid,reason text,restriction_kind text default null,until_time timestamptz default null,internal_note text default '') returns void
language plpgsql security definer set search_path='' as $$
begin
 if not e34_private.has_role('moderator') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Moderator permission and MFA required'; end if;
 if char_length(btrim(reason)) not between 10 and 2000 then raise exception 'Give a moderation reason in 10–2000 characters'; end if;
 if action='hide-thread' then update public.threads set hidden=true where id=target_id;
 elsif action='restore-thread' then update public.threads set hidden=false where id=target_id;
 elsif action='lock-thread' then update public.threads set locked=true where id=target_id;
 elsif action='unlock-thread' then update public.threads set locked=false where id=target_id;
 elsif action='hide-post' then update public.posts set hidden=true where id=target_id;
 elsif action='restore-post' then update public.posts set hidden=false where id=target_id;
 elsif action='restrict' then
  if restriction_kind in ('timeout','suspension') and (until_time is null or until_time<=now() or until_time>now()+interval '365 days') then raise exception 'Choose a future expiry within one year'; end if;
  insert into e34_private.community_restrictions(user_id,kind,reason,internal_note,expires_at,actor) values(target_id,restriction_kind,reason,internal_note,until_time,auth.uid());
 elsif action='revoke-restriction' then update e34_private.community_restrictions set revoked_at=now() where id=target_id;
 elsif action='resolve-appeal' then update public.community_appeals set status='resolved',response=reason where id=target_id;
 else raise exception 'Unknown moderation action'; end if;
 if not found then raise exception 'Moderation target not found'; end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata) values(auth.uid(),'community:'||action,'community',target_id::text,jsonb_build_object('reason',reason));
end $$;
revoke all on function e34_private.moderate_community(text,uuid,text,text,timestamptz,text) from public,anon;
-- Explicit deny policies document that clients only use the reviewed helpers.
create policy actions_no_client_access on e34_private.community_actions for all to anon,authenticated using(false) with check(false);
create policy restrictions_no_client_access on e34_private.community_restrictions for all to anon,authenticated using(false) with check(false);
