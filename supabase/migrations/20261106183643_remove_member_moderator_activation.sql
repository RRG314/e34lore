-- There is no member-callable staff activation action. Staff provisioning is
-- an operator migration, separate from browser identity and profile metadata.
drop function public.claim_owner_moderator();
drop function e34_private.claim_owner_moderator();

create or replace function e34_private.my_account_access() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('moderator',coalesce(e34_private.has_role('moderator'),false));
$$;

-- Bind only the designated, already verified Auth account. Do not manufacture
-- an account or bind a replacement UUID if an earlier owner identity is lost.
do $$
declare target e34_private.owner_account_claim%rowtype; owner_id uuid;
begin
 select * into target from e34_private.owner_account_claim where singleton for update;
 if not found then raise exception 'Designated owner configuration is missing'; end if;
 select id into owner_id from auth.users
 where lower(email)=target.verified_email and email_confirmed_at is not null
 and coalesce(email_change,'')='' and coalesce(is_anonymous,false)=false;
 if owner_id is null then
   raise notice 'No verified designated owner exists; operator provisioning remains required';
 elsif target.claimed_user_id is not null and target.claimed_user_id<>owner_id then
   raise exception 'Owner identity is already bound; deliberate operator recovery is required';
 else
   update e34_private.owner_account_claim
   set claimed_user_id=owner_id,claimed_at=coalesce(claimed_at,now()) where singleton;
   insert into e34_private.staff_roles(user_id,role) values(owner_id,'moderator') on conflict do nothing;
 end if;
end $$;
