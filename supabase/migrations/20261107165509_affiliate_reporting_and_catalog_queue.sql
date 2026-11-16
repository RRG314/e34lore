-- Bounded owner reporting and a source-preserving unmatched-number queue.
create index affiliate_offers_link on e34_private.merchant_offers(link_id);
create index affiliate_links_product on e34_private.affiliate_links(product_id);
create index affiliate_clicks_retention on e34_private.affiliate_clicks_daily(day);
create index advertising_counts_retention on e34_private.advertising_daily(day);
create or replace function e34_private.affiliate_workspace(section_name text default 'overview',search_text text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare names text[];t text;rows jsonb;output jsonb='{}';begin
 if not e34_private.commercial_admin() then raise exception 'Administrator permission and MFA required';end if;
 if char_length(search_text)>120 then raise exception 'Search is too long';end if;
 names=case section_name when 'applications' then array['affiliate_programs','affiliate_applications'] when 'retailers' then array['affiliate_networks','affiliate_programs','affiliate_merchants','affiliate_credentials_metadata'] when 'matching' then array['merchant_products','merchant_product_identifiers','affiliate_match_reviews','affiliate_links','merchant_offers','affiliate_import_jobs'] when 'advertising' then array['commercial_settings','advertising_placements','advertising_campaigns','sponsorships'] when 'revenue' then array['affiliate_commissions','sponsorship_payments','revenue_records'] else array[]::text[] end;
 foreach t in array names loop
  execute format('select coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) from(select * from e34_private.%I where $1='''' or to_jsonb(%I)::text ilike ''%%''||$1||''%%'' order by updated_at desc,id limit 100)x',t,t) into rows using search_text;
  output=output||jsonb_build_object(t,rows);
 end loop;
 return output||jsonb_build_object('counts',jsonb_build_object('approved_programs',(select count(*) from e34_private.affiliate_programs where status='approved'),'pending_applications',(select count(*) from e34_private.affiliate_applications where status in ('submitted','under_review','awaiting_owner_submission')),'active_retailers',(select count(*) from e34_private.affiliate_merchants where active),'published_offers',(select count(*) from e34_private.merchant_offers where published),'unreviewed_matches',(select count(*) from e34_private.affiliate_match_reviews where review_status='pending'),'unmatched_oem_numbers',(select count(*) from public.parts p where number_normalized is not null and not exists(select 1 from e34_private.affiliate_match_reviews r where r.part_id=p.id and r.review_status='approved')),'referral_clicks',(select coalesce(sum(clicks),0) from e34_private.affiliate_clicks_daily where day>=current_date-29),'campaign_impressions',(select coalesce(sum(impressions),0) from e34_private.advertising_daily where day>=current_date-29)),
 'monthly_revenue',coalesce((select jsonb_agg(to_jsonb(x)) from(select date_trunc('month',occurred_on)::date as month,currency,channel,sum(case when kind='estimate' then amount_cents else 0 end)::text as estimated_cents,sum(case when kind='earning' then amount_cents when kind='reversal' then -amount_cents else 0 end)::text as confirmed_net_cents,sum(case when kind='receipt' then amount_cents else 0 end)::text as received_cents from e34_private.revenue_records group by 1,2,3 order by 1 desc,2,3 limit 180)x),'[]'::jsonb),
 'programs',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status,'tracking_hosts',tracking_hosts,'query_parameters',query_parameters,'link_template',link_template,'public_parameters',public_parameters)),'[]'::jsonb) from e34_private.affiliate_programs),
 'referrals_by_merchant',coalesce((select jsonb_agg(to_jsonb(x)) from(select m.id,m.name,sum(c.clicks)::text as clicks from e34_private.affiliate_clicks_daily c join e34_private.affiliate_links l on l.id=c.link_id join e34_private.affiliate_merchants m on m.id=l.merchant_id where c.day>=current_date-29 group by m.id,m.name order by sum(c.clicks) desc,m.id limit 20)x),'[]'::jsonb),
 'popular_linked_parts',coalesce((select jsonb_agg(to_jsonb(x)) from(select p.id,p.name,p.number_normalized,sum(c.clicks)::text as clicks from (select distinct r.part_id,l.id as link_id from e34_private.affiliate_match_reviews r join e34_private.affiliate_links l on l.product_id=r.product_id) identities join public.parts p on p.id=identities.part_id join e34_private.affiliate_clicks_daily c on c.link_id=identities.link_id where c.day>=current_date-29 group by p.id,p.name,p.number_normalized order by sum(c.clicks) desc,p.id limit 20)x),'[]'::jsonb),
 'campaign_activity',coalesce((select jsonb_agg(to_jsonb(x)) from(select c.id,c.title as name,c.status,c.starts_at,c.ends_at,coalesce(sum(d.impressions),0)::text as impressions,coalesce(sum(d.clicks),0)::text as clicks from e34_private.advertising_campaigns c left join e34_private.advertising_daily d on d.campaign_id=c.id and d.day>=current_date-29 group by c.id,c.title,c.status,c.starts_at,c.ends_at order by c.updated_at desc,c.id limit 100)x),'[]'::jsonb),
 'advertising_enabled',(select advertising_enabled from e34_private.commercial_settings where id='site'),
 'merchants',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'program_id',program_id,'allowed_hosts',allowed_hosts)),'[]'::jsonb) from e34_private.affiliate_merchants));
end$$;


create function e34_private.affiliate_catalog_gaps(search_text text default '',after_number text default null,after_id text default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare results jsonb;begin
 if not e34_private.commercial_admin() then raise exception 'Administrator permission and MFA required';end if;
 if char_length(search_text)>120 or (after_number is not null and after_number !~ '^[0-9]{11}$') or (after_id is not null and char_length(after_id)>200) or ((after_id is null)<>(after_number is null)) then raise exception 'Invalid catalog queue search';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into results from(
  select p.id,p.name,p.number_normalized,
   (select count(*) from e34_private.affiliate_match_reviews r where r.part_id=p.id and r.review_status='pending') as pending_candidates,
   (select count(*) from e34_private.affiliate_match_reviews r where r.part_id=p.id and r.review_status='rejected') as rejected_candidates
  from public.parts p where p.number_normalized is not null
  and not exists(select 1 from e34_private.affiliate_match_reviews r where r.part_id=p.id and r.review_status='approved')
  and (after_number is null or (p.number_normalized,p.id)>(after_number,after_id))
  and (trim(search_text)='' or p.number_normalized=regexp_replace(search_text,'[^0-9]','','g') or to_tsvector('simple',p.name||' '||coalesce(p.number_normalized,'')) @@ websearch_to_tsquery('simple',search_text))
  order by p.number_normalized,p.id limit 26
 )x;
 return jsonb_build_object('rows',coalesce((select jsonb_agg(value) from jsonb_array_elements(results) with ordinality x(value,n) where n<=25),'[]'::jsonb),'has_more',jsonb_array_length(results)>25,'next_number',case when jsonb_array_length(results)>25 then results->24->>'number_normalized' end,'next_id',case when jsonb_array_length(results)>25 then results->24->>'id' end);
end$$;
create function public.affiliate_catalog_gaps(search_text text default '',after_number text default null,after_id text default null) returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.affiliate_catalog_gaps(search_text,after_number,after_id)$$;
revoke all on function e34_private.affiliate_catalog_gaps(text,text,text),public.affiliate_catalog_gaps(text,text,text) from public,anon,authenticated;
grant execute on function e34_private.affiliate_catalog_gaps(text,text,text),public.affiliate_catalog_gaps(text,text,text) to authenticated;
