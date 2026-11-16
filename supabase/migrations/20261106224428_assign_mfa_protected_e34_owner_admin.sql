-- The owner requested site administrator access for their chosen profile.
-- The private Auth binding is authoritative; a username alone never grants access.
-- The existing moderator assignment remains, and administrator privileges require MFA.
create or replace function e34_private.has_role(required_role text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from e34_private.staff_roles
    where user_id=(select auth.uid())
      and ((role=required_role and role<>'admin')
        or (role='admin' and (select auth.jwt()->>'aal')='aal2'))
  );
$$;

insert into e34_private.staff_roles(user_id,role)
select u.id,'admin'
from e34_private.owner_account_claim b
join auth.users u on u.id=b.claimed_user_id
join public.profiles p on p.id=u.id
where b.singleton and p.username is not null
  and lower(u.email)=b.verified_email and u.email_confirmed_at is not null
  and coalesce(u.email_change,'')='' and not coalesce(u.is_anonymous,false)
on conflict do nothing;
