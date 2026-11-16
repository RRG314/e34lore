-- Public aggregate only; Auth rows and account identities remain private.
create function e34_private.community_member_count()
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from auth.users
  where email_confirmed_at is not null and not coalesce(is_anonymous, false);
$$;
revoke all on function e34_private.community_member_count() from public, anon, authenticated;
grant execute on function e34_private.community_member_count() to anon, authenticated;

create function public.community_member_count()
returns bigint language sql stable security invoker set search_path = '' as $$
  select e34_private.community_member_count();
$$;
revoke all on function public.community_member_count() from public, anon, authenticated;
grant execute on function public.community_member_count() to anon, authenticated;
comment on function public.community_member_count() is
  'Total email-confirmed registered accounts. Excludes anonymous guests and unconfirmed signups. Returns no account data.';
