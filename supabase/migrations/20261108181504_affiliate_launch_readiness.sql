-- Owner-only operational projection. Reuse the public offer gate instead of
-- treating a saved published flag or a successful HEAD as proof of availability.
create function e34_private.affiliate_launch_readiness() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if not e34_private.commercial_admin() then
  raise exception 'Administrator permission and MFA required';
 end if;
 with scopes as materialized (
  select distinct r.part_id,r.scope_position_id
  from e34_private.merchant_offers o
  join e34_private.affiliate_match_reviews r on r.id=o.match_id
  where o.published
 ), visible as materialized (
  select distinct x->>'id' as offer_id
  from scopes s cross join lateral jsonb_array_elements(
   e34_private.public_affiliate_offers(s.part_id,s.scope_position_id)
  ) x
 ), retailers as (
  select m.id,m.name,m.active,m.program_id,p.status as program_status,
   (p.status='approved' and (p.expires_at is null or p.expires_at>now())) as program_current,
   (cardinality(p.tracking_hosts)>0) as tracking_configured,
   (select count(*) from e34_private.merchant_products x where x.merchant_id=m.id) as products,
   (select count(*) from e34_private.affiliate_match_reviews r
    join e34_private.merchant_products x on x.id=r.product_id
    where x.merchant_id=m.id and r.review_status='approved') as reviewed_matches,
   (select count(*) from e34_private.affiliate_links l where l.merchant_id=m.id) as saved_links,
   (select count(*) from e34_private.affiliate_links l where l.merchant_id=m.id
    and l.check_status='ok' and l.last_checked_at>=now()-interval '30 days'
    and (l.expires_at is null or l.expires_at>now())) as checked_links,
   (select count(*) from e34_private.merchant_offers o
    join e34_private.affiliate_links l on l.id=o.link_id
    where l.merchant_id=m.id and o.id::text in (select offer_id from visible)) as public_offers,
   (select count(*) from e34_private.affiliate_links l where l.merchant_id=m.id
    and l.product_id is null and e34_private.resolve_affiliate_link(l.id) is not null) as public_retailer_links,
   coalesce((select jsonb_agg(to_jsonb(sample)) from (
    select r.part_id,r.scope_position_id,o.link_id
    from e34_private.merchant_offers o
    join e34_private.affiliate_match_reviews r on r.id=o.match_id
    join e34_private.affiliate_links l on l.id=o.link_id
    where l.merchant_id=m.id and o.id::text in(select offer_id from visible)
    order by o.id limit 3
   ) sample),'[]'::jsonb) as samples
  from e34_private.affiliate_merchants m
  join e34_private.affiliate_programs p on p.id=m.program_id
 )
 select jsonb_build_object('checked_at',now(),'retailers',coalesce(
  (select jsonb_agg(to_jsonb(r) order by r.name) from retailers r),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.affiliate_launch_readiness() returns jsonb
language sql stable security invoker set search_path = ''
as $$select e34_private.affiliate_launch_readiness()$$;
revoke all on function e34_private.affiliate_launch_readiness(),public.affiliate_launch_readiness() from public,anon,authenticated;
grant execute on function e34_private.affiliate_launch_readiness(),public.affiliate_launch_readiness() to authenticated;

-- Approved general retailer/tool-store links have no BMW fitment assertion.
-- Product-specific links remain in the reviewed catalog projection.
create function e34_private.public_affiliate_retailers() returns jsonb
language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
  select l.id as link_id,m.name as retailer
  from e34_private.affiliate_links l
  join e34_private.affiliate_merchants m on m.id=l.merchant_id
  where l.product_id is null and e34_private.resolve_affiliate_link(l.id) is not null
  order by m.name,l.id limit 20
 ) x
$$;
create function public.public_affiliate_retailers() returns jsonb
language sql stable security invoker set search_path = ''
as $$select e34_private.public_affiliate_retailers()$$;
revoke all on function e34_private.public_affiliate_retailers(),public.public_affiliate_retailers() from public,anon,authenticated;
grant execute on function e34_private.public_affiliate_retailers(),public.public_affiliate_retailers() to anon,authenticated;
