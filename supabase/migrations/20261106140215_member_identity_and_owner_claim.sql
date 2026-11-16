-- Public handles are chosen by members; email and provider names are never defaults.
alter table public.profiles add column username text unique;
alter table public.profiles add constraint profile_username_format check (username is null or username ~ '^[a-z][a-z0-9_]{2,23}$');
revoke insert,update,delete on public.profiles from anon,authenticated;

create function public.claim_username(chosen_username text) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); existing text;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'A verified account is required'; end if;
 if chosen_username is null or chosen_username !~ '^[a-z][a-z0-9_]{2,23}$' then raise exception 'Use 3–24 lowercase letters, numbers or underscores, starting with a letter'; end if;
 if chosen_username in ('admin','administrator','moderator','owner','support','staff','e34lore','e34_lore') then raise exception 'That username is reserved'; end if;
 -- Per-account lock handles simultaneous first claims; UNIQUE handles collisions.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select username into existing from public.profiles where id=uid for update;
 if existing is not null and existing<>chosen_username then raise exception 'Your username is already set'; end if;
 insert into public.profiles(id,username,display_name) values(uid,chosen_username,chosen_username)
 on conflict(id) do update set username=excluded.username,display_name=excluded.display_name;
 return chosen_username;
exception when unique_violation then raise exception 'That username is already taken';
end $$;
revoke all on function public.claim_username(text) from public,anon;
grant execute on function public.claim_username(text) to authenticated;

-- Bootstrap is one-time, private and tied to a live verified Auth identity plus MFA.
-- No caller-supplied email, public profile or user_metadata authorizes this claim.
create table e34_private.owner_account_claim (
 singleton boolean primary key default true check(singleton),
 verified_email text not null,
 claimed_user_id uuid unique,
 claimed_at timestamptz
);
alter table e34_private.owner_account_claim enable row level security;
revoke all on e34_private.owner_account_claim from public,anon,authenticated;
insert into e34_private.owner_account_claim(singleton,verified_email) values(true,'owner@example.invalid');

create function public.my_account_access() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('moderator',coalesce(e34_private.has_role('moderator'),false),
 'owner_eligible',exists(select 1 from auth.users u cross join e34_private.owner_account_claim c where u.id=auth.uid() and lower(u.email)=c.verified_email and u.email_confirmed_at is not null and (c.claimed_user_id is null or c.claimed_user_id=u.id)))
$$;
create function public.claim_owner_moderator() returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); target e34_private.owner_account_claim%rowtype;
begin
 if uid is null or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Verify your authenticator before enabling moderator access'; end if;
 if not exists(select 1 from auth.sessions where user_id=uid and id::text=auth.jwt()->>'session_id') then raise exception 'A current signed-in session is required'; end if;
 select * into target from e34_private.owner_account_claim where singleton for update;
 if target.claimed_user_id is not null and target.claimed_user_id<>uid then raise exception 'Owner account is already bound'; end if;
 if not exists(select 1 from auth.users where id=uid and lower(email)=target.verified_email and email_confirmed_at is not null and coalesce(email_change,'')='') then raise exception 'This verified account is not the designated owner'; end if;
 update e34_private.owner_account_claim set claimed_user_id=uid,claimed_at=coalesce(claimed_at,now()) where singleton;
 insert into e34_private.staff_roles(user_id,role) values(uid,'moderator') on conflict do nothing;
end $$;
revoke all on function public.my_account_access() from public,anon;
revoke all on function public.claim_owner_moderator() from public,anon;
grant execute on function public.my_account_access(),public.claim_owner_moderator() to authenticated;
