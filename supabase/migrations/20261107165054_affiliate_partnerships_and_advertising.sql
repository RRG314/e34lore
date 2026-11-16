-- Commercial records extend the existing private staff boundary. No catalog or member records are replaced.
create function e34_private.commercial_admin() returns boolean language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and coalesce(auth.jwt()->>'aal','')='aal2' and e34_private.has_role('admin');
$$;
revoke all on function e34_private.commercial_admin() from public,anon,authenticated;
grant execute on function e34_private.commercial_admin() to authenticated;

create function e34_private.commercial_url_host(value text) returns text language sql immutable set search_path='' as $$
 select case when char_length(value)<=4096 and value !~ '[[:space:][:cntrl:]\\]' and value !~* '[?&](api_?key|access_?token|client_?secret|password|signature|authorization)='
 then lower(substring(value from '^https://(([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,63})(?:/[^#]*|\?[^#]*)?$')) else null end;
$$;
revoke all on function e34_private.commercial_url_host(text) from public,anon,authenticated;

create table e34_private.affiliate_networks (
 id text primary key check(id ~ '^[a-z0-9][a-z0-9-]{1,80}$'), name text not null check(char_length(name) between 2 and 160),
 website_url text not null, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table e34_private.affiliate_programs (
 id text primary key check(id ~ '^[a-z0-9][a-z0-9-]{1,80}$'), network_id text references e34_private.affiliate_networks,
 name text not null check(char_length(name) between 2 and 160), application_url text, official_source_url text not null,
 status text not null default 'researching' check(status in ('researching','eligible_to_apply','application_prepared','awaiting_owner_submission','submitted','under_review','approved','rejected','suspended','expired')),
 approval_evidence_url text, approved_at timestamptz, expires_at timestamptz, terms_checked_at timestamptz,
 tracking_hosts text[] not null default '{}', query_parameters text[] not null default '{}', link_template text,
 public_parameters jsonb not null default '{}' check(jsonb_typeof(public_parameters)='object' and octet_length(public_parameters::text)<=4000),
 rules text not null default '', research_checked_at timestamptz not null default now(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table e34_private.affiliate_applications (
 id uuid primary key default gen_random_uuid(), program_id text not null unique references e34_private.affiliate_programs,
 status text not null default 'researching' check(status in ('researching','eligible_to_apply','application_prepared','awaiting_owner_submission','submitted','under_review','approved','rejected','suspended','expired')),
 description text not null default '' check(char_length(description)<=4000), audience text not null default '' check(char_length(audience)<=2000),
 placements text not null default '' check(char_length(placements)<=2000), traffic_statement text not null default '' check(char_length(traffic_statement)<=2000),
 required_information text not null default '' check(char_length(required_information)<=6000), introduction text not null default '' check(char_length(introduction)<=6000),
 owner_notes text not null default '' check(char_length(owner_notes)<=6000), submitted_at timestamptz, follow_up_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table e34_private.affiliate_merchants (
 id text primary key check(id ~ '^[a-z0-9][a-z0-9-]{1,80}$'), program_id text not null references e34_private.affiliate_programs,
 name text not null check(char_length(name) between 2 and 160), website_url text not null,
 allowed_hosts text[] not null default '{}', active boolean not null default false,
 contact_information text not null default '' check(char_length(contact_information)<=2000), notes text not null default '' check(char_length(notes)<=6000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table e34_private.affiliate_credentials_metadata (
 id uuid primary key default gen_random_uuid(), program_id text not null references e34_private.affiliate_programs,
 label text not null check(char_length(label) between 2 and 160), secret_reference text not null check(secret_reference ~ '^(vault|env):[A-Za-z0-9_.-]{2,120}$'),
 permissions text not null default '', expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table e34_private.affiliate_import_jobs (
 id uuid primary key default gen_random_uuid(), merchant_id text not null references e34_private.affiliate_merchants,
 source_url text not null, source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
 format text not null check(format in ('csv','json','xml','manual')), status text not null default 'prepared' check(status in ('prepared','completed','failed')),
 rows_seen integer not null default 0 check(rows_seen between 0 and 5000), rows_imported integer not null default 0 check(rows_imported between 0 and 5000),
 rows_unchanged integer not null default 0 check(rows_unchanged between 0 and 5000), errors jsonb not null default '[]' check(jsonb_typeof(errors)='array' and octet_length(errors::text)<=32000),
 authorized_at timestamptz not null, next_sync_at timestamptz, sync_enabled boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(merchant_id,source_sha256)
);
create table e34_private.merchant_products (
 id uuid primary key default gen_random_uuid(), merchant_id text not null references e34_private.affiliate_merchants,
 retailer_sku text not null check(char_length(retailer_sku) between 1 and 160), title text not null check(char_length(title) between 2 and 300),
 manufacturer text not null default '' check(char_length(manufacturer)<=160), manufacturer_part_number text not null default '' check(char_length(manufacturer_part_number)<=160),
 product_url text not null, source_url text not null, source_sha256 text check(source_sha256 ~ '^[a-f0-9]{64}$'), import_job_id uuid references e34_private.affiliate_import_jobs,
 image_url text, image_authorized boolean not null default false, image_permission_url text,
 feed_observation jsonb not null default '{}' check(jsonb_typeof(feed_observation)='object' and octet_length(feed_observation::text)<=8000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(merchant_id,retailer_sku)
);
create table e34_private.merchant_product_identifiers (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references e34_private.merchant_products on delete cascade,
 scheme text not null check(scheme in ('bmw_oem','manufacturer_part','retailer_sku')), value text not null check(char_length(value) between 1 and 160),
 source_url text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(product_id,scheme,value),
 check(scheme<>'bmw_oem' or value ~ '^[0-9]{11}$')
);
create table e34_private.affiliate_match_reviews (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references e34_private.merchant_products on delete cascade,
 part_id text not null references public.parts, matched_part_id text not null references public.parts,
 kind text not null default 'unverified_candidate' check(kind in ('exact_verified','verified_replacement','conditional','unverified_candidate','known_incompatible')),
 basis text not null check(basis in ('oem_identity','direct_supersession','documented_equivalent')),
 scope_position_id text references public.part_assembly_positions, direct_supersession_id text references public.part_supersessions,
 review_status text not null default 'pending' check(review_status in ('pending','approved','rejected')),
 source_url text not null, compatibility_notes text not null check(char_length(compatibility_notes) between 20 and 6000),
 reviewed_by uuid references auth.users on delete set null, reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(product_id,part_id,scope_position_id)
);
create index affiliate_matches_part on e34_private.affiliate_match_reviews(part_id,review_status);
create table e34_private.affiliate_links (
 id uuid primary key default gen_random_uuid(), merchant_id text not null references e34_private.affiliate_merchants,
 product_id uuid references e34_private.merchant_products on delete cascade, destination_url text not null, tracking_url text not null,
 rule_source_url text not null, active boolean not null default false, expires_at timestamptz,
 last_checked_at timestamptz, check_status text not null default 'unchecked' check(check_status in ('unchecked','ok','broken','blocked')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table e34_private.merchant_offers (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references e34_private.affiliate_match_reviews on delete cascade,
 link_id uuid not null references e34_private.affiliate_links, published boolean not null default false,
 currency text not null default 'USD' check(currency in ('USD','EUR','GBP','CAD','AUD')),
 price_cents bigint check(price_cents between 0 and 1000000000000), price_authorized boolean not null default false,
 price_observed_at timestamptz, price_valid_until timestamptz,
 availability text check(availability in ('in_stock','out_of_stock','backorder','unknown')), availability_authorized boolean not null default false,
 availability_observed_at timestamptz, availability_valid_until timestamptz, shipping_information text not null default '' check(char_length(shipping_information)<=1000),
 shipping_authorized boolean not null default false, shipping_observed_at timestamptz, shipping_valid_until timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(match_id,link_id)
);
create table e34_private.affiliate_clicks_daily (
 link_id uuid not null references e34_private.affiliate_links on delete cascade, day date not null default current_date,
 clicks bigint not null default 0 check(clicks between 0 and 1000000000), primary key(link_id,day)
);
create table e34_private.affiliate_commissions (
 id uuid primary key default gen_random_uuid(), program_id text not null references e34_private.affiliate_programs,
 external_reference text not null check(char_length(external_reference) between 1 and 160),
 currency text not null check(currency in ('USD','EUR','GBP','CAD','AUD')), amount_cents bigint not null check(amount_cents between 0 and 1000000000000),
 status text not null check(status in ('estimated','confirmed','reversed','paid')), occurred_on date not null,
 evidence_url text not null, notes text not null default '' check(char_length(notes)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(program_id,external_reference)
);
create table e34_private.sponsorships (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 2 and 160), website_url text not null,
 contact_information text not null default '' check(char_length(contact_information)<=2000), logo_url text,
 status text not null default 'draft' check(status in ('draft','approved','suspended','expired')),
 contract_evidence_url text, contract_cents bigint check(contract_cents between 0 and 1000000000000),
 currency text not null default 'USD' check(currency in ('USD','EUR','GBP','CAD','AUD')), billing_period text not null default 'fixed' check(billing_period in ('fixed','monthly')),
 billing_status text not null default 'unbilled' check(billing_status in ('unbilled','invoiced','part_paid','paid','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table e34_private.sponsorship_payments (
 id uuid primary key default gen_random_uuid(), sponsorship_id uuid not null references e34_private.sponsorships,
 external_reference text not null unique check(char_length(external_reference) between 1 and 160),
 amount_cents bigint not null check(amount_cents between 1 and 1000000000000), currency text not null check(currency in ('USD','EUR','GBP','CAD','AUD')),
 received_on date not null, evidence_url text not null, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table e34_private.advertising_placements (
 id text primary key check(id in ('public_top','public_bottom')), name text not null,
 allowed_sections text[] not null default array['home','parts','articles','encyclopedia','community']::text[],
 enabled boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(allowed_sections <@ array['home','parts','articles','encyclopedia','community']::text[])
);
create table e34_private.advertising_campaigns (
 id uuid primary key default gen_random_uuid(), sponsorship_id uuid not null references e34_private.sponsorships,
 placement_id text not null references e34_private.advertising_placements, title text not null check(char_length(title) between 2 and 160),
 body text not null check(char_length(body) between 1 and 500), image_url text, image_alt text not null default '' check(char_length(image_alt)<=240),
 creative_permission_url text not null, destination_url text not null,
 starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at),
 status text not null default 'draft' check(status in ('draft','approved','active','suspended','expired')),
 priority integer not null default 0 check(priority between 0 and 100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table e34_private.advertising_daily (
 campaign_id uuid not null references e34_private.advertising_campaigns on delete cascade, day date not null default current_date,
 impressions bigint not null default 0 check(impressions between 0 and 1000000000), clicks bigint not null default 0 check(clicks between 0 and 1000000000), primary key(campaign_id,day)
);
create table e34_private.commercial_settings (
 id text primary key check(id='site'), advertising_enabled boolean not null default false,
 adsense_publisher text not null default 'ca-pub-8181130301726385' check(adsense_publisher ~ '^ca-pub-[0-9]{16}$'),
 adsense_status text not null default 'awaiting_owner_submission' check(adsense_status in ('awaiting_owner_submission','under_review','approved','rejected','suspended')),
 adsense_notes text not null default 'Ownership verified. Display code is not installed; program approval, placement and consent configuration remain required.',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table e34_private.revenue_records (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('estimate','earning','reversal','receipt')),
 channel text not null check(channel in ('affiliate','advertising','sponsorship')), amount_cents bigint not null check(amount_cents between 1 and 1000000000000),
 currency text not null check(currency in ('USD','EUR','GBP','CAD','AUD')), occurred_on date not null,
 external_reference text not null unique check(char_length(external_reference) between 1 and 160), evidence_url text not null,
 reverses_id uuid references e34_private.revenue_records, commission_id uuid references e34_private.affiliate_commissions, sponsorship_id uuid references e34_private.sponsorships,
 notes text not null default '' check(char_length(notes)<=2000), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((kind='reversal')=(reverses_id is not null))
);
create index revenue_month on e34_private.revenue_records(occurred_on,currency,kind);

-- Neither credentials nor business records are exposed through the Data API.
do $$declare t text;begin
 foreach t in array array['affiliate_networks','affiliate_programs','affiliate_applications','affiliate_merchants','affiliate_credentials_metadata','affiliate_import_jobs','merchant_products','merchant_product_identifiers','affiliate_match_reviews','affiliate_links','merchant_offers','affiliate_clicks_daily','affiliate_commissions','sponsorships','sponsorship_payments','advertising_placements','advertising_campaigns','advertising_daily','commercial_settings','revenue_records'] loop
  execute format('alter table e34_private.%I enable row level security',t);
  execute format('revoke all on table e34_private.%I from public,anon,authenticated',t);
  execute format('create policy commercial_owner_only on e34_private.%I for all to authenticated using ((select e34_private.commercial_admin())) with check ((select e34_private.commercial_admin()))',t);
 end loop;
end$$;

create function e34_private.guard_commercial_record() returns trigger language plpgsql security definer set search_path='' as $$
declare p e34_private.affiliate_programs; m e34_private.affiliate_merchants; product e34_private.merchant_products; match e34_private.affiliate_match_reviews; link e34_private.affiliate_links; s e34_private.sponsorships; original e34_private.revenue_records; h text;v record;
begin
 new.updated_at=clock_timestamp();
 for v in select key,value from jsonb_each_text(to_jsonb(new)) where key in ('website_url','application_url','official_source_url','approval_evidence_url','product_url','source_url','image_url','image_permission_url','rule_source_url','destination_url','tracking_url','contract_evidence_url','creative_permission_url','evidence_url','logo_url') and value is not null loop
  if e34_private.commercial_url_host(v.value) is null then raise exception 'Use credential-free public HTTPS URLs for commercial evidence and destinations';end if;
 end loop;
 if tg_table_name='affiliate_programs' then
  if new.status='approved' and (new.approved_at is null or new.terms_checked_at is null or e34_private.commercial_url_host(new.approval_evidence_url) is null) then raise exception 'Approved programs need dated approval and terms evidence';end if;
  foreach h in array new.tracking_hosts loop if h !~ '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$' then raise exception 'Use exact authorized tracking hostnames';end if;end loop;
  if exists(select 1 from jsonb_each_text(new.public_parameters) x where x.key not in ('publisher_id','campaign_id','program_id') or char_length(x.value)>200 or x.value !~ '^[A-Za-z0-9_.:-]+$') then raise exception 'Only documented public tracking identifiers belong here';end if;
 elsif tg_table_name='affiliate_merchants' then
  select * into p from e34_private.affiliate_programs where id=new.program_id;
  foreach h in array new.allowed_hosts loop if h !~ '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$' then raise exception 'Use exact retailer hostnames';end if;end loop;
  if new.active and (p.status<>'approved' or p.expires_at<=now()) then raise exception 'Approve the program before activating a retailer';end if;
 elsif tg_table_name='merchant_products' then
  if tg_op='UPDATE' and (new.merchant_id,new.retailer_sku) is distinct from (old.merchant_id,old.retailer_sku) then raise exception 'Create a new product rather than moving its retailer identity';end if;
  select * into m from e34_private.affiliate_merchants where id=new.merchant_id;
  if not coalesce(e34_private.commercial_url_host(new.product_url)=any(m.allowed_hosts),false) then raise exception 'Product URL must use an authorized retailer host';end if;
  if e34_private.commercial_url_host(new.source_url) is null then raise exception 'A public HTTPS source is required';end if;
  if new.image_authorized and (e34_private.commercial_url_host(new.image_url) is null or e34_private.commercial_url_host(new.image_permission_url) is null) then raise exception 'Product images need permission evidence';end if;
 elsif tg_table_name='merchant_product_identifiers' then
  if tg_op='UPDATE' and new.product_id<>old.product_id then raise exception 'Product identifiers cannot move between products';end if;
  if e34_private.commercial_url_host(new.source_url) is null then raise exception 'Identifier evidence requires HTTPS';end if;
 elsif tg_table_name='affiliate_match_reviews' then
  if e34_private.commercial_url_host(new.source_url) is null then raise exception 'Match evidence requires HTTPS';end if;
  if new.scope_position_id is not null and not exists(select 1 from public.part_assembly_positions where id=new.scope_position_id and part_id=new.part_id and active) then raise exception 'Choose an active source position for this exact part';end if;
  if new.review_status='approved' then
   if new.kind in ('unverified_candidate','known_incompatible') then raise exception 'An unverified or incompatible candidate cannot be approved';end if;
   if new.kind='exact_verified' and new.basis<>'oem_identity' then raise exception 'Exact matching requires OEM identifier evidence';end if;
   if new.basis='oem_identity' and (new.part_id<>new.matched_part_id or not exists(select 1 from e34_private.merchant_product_identifiers i join public.parts b on b.number_normalized=i.value where i.product_id=new.product_id and i.scheme='bmw_oem' and b.id=new.part_id)) then raise exception 'Exact matching needs the canonical BMW identifier';end if;
   if new.basis='direct_supersession' and not exists(select 1 from public.part_supersessions where id=new.direct_supersession_id and previous_part_id=new.part_id and replacement_part_id=new.matched_part_id and position_id=new.scope_position_id) then raise exception 'Replacement matching needs a direct source-scoped supersession';end if;
   if new.basis='direct_supersession' and new.kind<>'conditional' and exists(select 1 from public.part_supersessions where id=new.direct_supersession_id and conditions<>'[]'::jsonb) then raise exception 'Source-conditional supersessions must remain conditional';end if;
   if new.basis='direct_supersession' and not exists(select 1 from e34_private.merchant_product_identifiers i join public.parts b on b.number_normalized=i.value where i.product_id=new.product_id and i.scheme='bmw_oem' and b.id=new.matched_part_id) then raise exception 'The retailer identifier must match the direct replacement target';end if;
   if new.basis='documented_equivalent' and char_length(trim(new.compatibility_notes))<40 then raise exception 'An aftermarket equivalent needs specific documented evidence';end if;
   new.reviewed_by=auth.uid();new.reviewed_at=clock_timestamp();
  else new.reviewed_by=null;new.reviewed_at=null;end if;
 elsif tg_table_name='affiliate_import_jobs' then
  if new.sync_enabled then raise exception 'Scheduled sync needs an authorized feed connector; use a reviewed file import until it is configured';end if;
 elsif tg_table_name='affiliate_links' then
  select * into m from e34_private.affiliate_merchants where id=new.merchant_id;select * into p from e34_private.affiliate_programs where id=m.program_id;
  if not coalesce(e34_private.commercial_url_host(new.destination_url)=any(m.allowed_hosts),false) or not coalesce(e34_private.commercial_url_host(new.tracking_url)=any(p.tracking_hosts),false) or e34_private.commercial_url_host(new.rule_source_url) is null then raise exception 'The link destination or tracking host is not authorized';end if;
  if new.product_id is not null and not exists(select 1 from e34_private.merchant_products where id=new.product_id and merchant_id=new.merchant_id and product_url=new.destination_url) then raise exception 'Link must use this retailer product destination';end if;
  if exists(select 1 from regexp_split_to_table(split_part(new.tracking_url,'?',2),'&') q where q<>'' and not (split_part(q,'=',1)=any(p.query_parameters))) then raise exception 'Tracking query contains an unapproved parameter';end if;
  if new.active and (not m.active or p.status<>'approved' or p.expires_at<=now() or new.expires_at<=now() or new.check_status<>'ok' or new.last_checked_at is null or new.last_checked_at<now()-interval '30 days') then raise exception 'Link activation requires an approved current program and a recently checked link';end if;
 elsif tg_table_name='merchant_offers' then
  select * into match from e34_private.affiliate_match_reviews where id=new.match_id;select * into link from e34_private.affiliate_links where id=new.link_id;
  if link.product_id is distinct from match.product_id then raise exception 'Offer must use the matched product link';end if;
  if new.published and (match.review_status<>'approved' or match.kind in ('unverified_candidate','known_incompatible') or not link.active) then raise exception 'Only approved reviewed matches and active links may be published';end if;
  if new.price_authorized and (new.price_cents is null or new.price_observed_at is null or new.price_valid_until is null or new.price_valid_until<=new.price_observed_at) then raise exception 'A price needs an authorized dated observation and expiry';end if;
  if new.availability_authorized and (new.availability is null or new.availability_observed_at is null or new.availability_valid_until is null or new.availability_valid_until<=new.availability_observed_at) then raise exception 'Availability needs an authorized dated observation and expiry';end if;
  if new.shipping_authorized and (trim(new.shipping_information)='' or new.shipping_observed_at is null or new.shipping_valid_until is null or new.shipping_valid_until<=new.shipping_observed_at) then raise exception 'Shipping information needs an authorized dated observation and expiry';end if;
 elsif tg_table_name='sponsorships' then
  if e34_private.commercial_url_host(new.website_url) is null then raise exception 'Sponsor website must use HTTPS';end if;
  if new.status='approved' and (e34_private.commercial_url_host(new.contract_evidence_url) is null or new.contract_cents is null) then raise exception 'Sponsor approval requires recorded contract evidence';end if;
 elsif tg_table_name='advertising_campaigns' then
  select * into s from e34_private.sponsorships where id=new.sponsorship_id;
  if e34_private.commercial_url_host(new.destination_url) is distinct from e34_private.commercial_url_host(s.website_url) or e34_private.commercial_url_host(new.destination_url) is null then raise exception 'Campaign link must use the sponsor website';end if;
  if e34_private.commercial_url_host(new.creative_permission_url) is null then raise exception 'Record creative permission';end if;
  if new.image_url is not null and (e34_private.commercial_url_host(new.image_url) is null or char_length(trim(new.image_alt))<5) then raise exception 'Creative images need HTTPS and descriptive text';end if;
  if new.status in ('approved','active') and s.status<>'approved' then raise exception 'Approve the sponsor before the campaign';end if;
 elsif tg_table_name='revenue_records' then
  if tg_op='UPDATE' then raise exception 'Revenue records are immutable; append a documented adjustment';end if;
  if e34_private.commercial_url_host(new.evidence_url) is null then raise exception 'Revenue requires evidence from an authorized report or record';end if;
  if new.kind='reversal' then
   select * into original from e34_private.revenue_records where id=new.reverses_id for update;
   if original.id is null or original.kind<>'earning' or original.currency<>new.currency or original.channel<>new.channel then raise exception 'Reverse an existing earning in the same currency and channel';end if;
   if new.amount_cents+(select coalesce(sum(amount_cents),0) from e34_private.revenue_records where reverses_id=original.id)>original.amount_cents then raise exception 'Reversal exceeds the remaining earning';end if;
  end if;
 elsif tg_table_name in ('affiliate_commissions','sponsorship_payments') then
  if e34_private.commercial_url_host(new.evidence_url) is null then raise exception 'A dated source record is required';end if;
 end if;
 return new;
end$$;
revoke all on function e34_private.guard_commercial_record() from public,anon,authenticated;
do $$declare t text;begin
 foreach t in array array['affiliate_networks','affiliate_programs','affiliate_applications','affiliate_merchants','affiliate_credentials_metadata','affiliate_import_jobs','merchant_products','merchant_product_identifiers','affiliate_match_reviews','affiliate_links','merchant_offers','affiliate_commissions','sponsorships','sponsorship_payments','advertising_placements','advertising_campaigns','commercial_settings','revenue_records'] loop
 execute format('create trigger commercial_record_guard before insert or update on e34_private.%I for each row execute function e34_private.guard_commercial_record()',t);end loop;
end$$;

create function e34_private.commercial_tables() returns text[] language sql immutable set search_path='' as $$select array['affiliate_networks','affiliate_programs','affiliate_applications','affiliate_merchants','affiliate_credentials_metadata','affiliate_import_jobs','merchant_products','merchant_product_identifiers','affiliate_match_reviews','affiliate_links','merchant_offers','affiliate_commissions','sponsorships','sponsorship_payments','advertising_placements','advertising_campaigns','commercial_settings','revenue_records']::text[]$$;
revoke all on function e34_private.commercial_tables() from public,anon,authenticated;

create function e34_private.affiliate_workspace(section_name text default 'overview',search_text text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare names text[];t text;rows jsonb;output jsonb='{}';begin
 if not e34_private.commercial_admin() then raise exception 'Administrator permission and MFA required';end if;
 if char_length(search_text)>120 then raise exception 'Search is too long';end if;
 names=case section_name when 'applications' then array['affiliate_programs','affiliate_applications'] when 'retailers' then array['affiliate_networks','affiliate_programs','affiliate_merchants','affiliate_credentials_metadata'] when 'matching' then array['merchant_products','merchant_product_identifiers','affiliate_match_reviews','affiliate_links','merchant_offers','affiliate_import_jobs'] when 'advertising' then array['commercial_settings','advertising_placements','advertising_campaigns','sponsorships'] when 'revenue' then array['affiliate_commissions','sponsorship_payments','revenue_records'] else array[]::text[] end;
 foreach t in array names loop
  execute format('select coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) from(select * from e34_private.%I where $1='''' or to_jsonb(%I)::text ilike ''%%''||$1||''%%'' order by updated_at desc,id limit 100)x',t,t) into rows using search_text;
  output=output||jsonb_build_object(t,rows);
 end loop;
 return output||jsonb_build_object('counts',jsonb_build_object('approved_programs',(select count(*) from e34_private.affiliate_programs where status='approved'),'pending_applications',(select count(*) from e34_private.affiliate_applications where status in ('submitted','under_review','awaiting_owner_submission')),'active_retailers',(select count(*) from e34_private.affiliate_merchants where active),'published_offers',(select count(*) from e34_private.merchant_offers where published),'unreviewed_matches',(select count(*) from e34_private.affiliate_match_reviews where review_status='pending'),'referral_clicks',(select coalesce(sum(clicks),0) from e34_private.affiliate_clicks_daily where day>=current_date-29),'campaign_impressions',(select coalesce(sum(impressions),0) from e34_private.advertising_daily where day>=current_date-29)),
 'monthly_revenue',coalesce((select jsonb_agg(to_jsonb(x)) from(select date_trunc('month',occurred_on)::date as month,currency,sum(case when kind='estimate' then amount_cents else 0 end)::text as estimated_cents,sum(case when kind='earning' then amount_cents when kind='reversal' then -amount_cents else 0 end)::text as confirmed_net_cents,sum(case when kind='receipt' then amount_cents else 0 end)::text as received_cents from e34_private.revenue_records group by 1,2 order by 1 desc,2 limit 60)x),'[]'::jsonb),
 'programs',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status,'tracking_hosts',tracking_hosts,'query_parameters',query_parameters,'link_template',link_template,'public_parameters',public_parameters)),'[]'::jsonb) from e34_private.affiliate_programs),
 'advertising_enabled',(select advertising_enabled from e34_private.commercial_settings where id='site'),
 'merchants',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'program_id',program_id,'allowed_hosts',allowed_hosts)),'[]'::jsonb) from e34_private.affiliate_merchants));
end$$;

create function e34_private.save_affiliate_record(entity text,payload jsonb,reason text,expected_updated_at timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare keys text[];cols text;record_id text;record_type text;result jsonb;previous jsonb;begin
 if not e34_private.commercial_admin() then raise exception 'Administrator permission and MFA required';end if;
 if not entity=any(e34_private.commercial_tables()) or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>64000 then raise exception 'Unsupported commercial record';end if;
 if char_length(trim(reason)) not between 10 and 2000 then raise exception 'Give a reason of 10 to 2000 characters';end if;
 if payload ?| array['created_at','updated_at','reviewed_at','reviewed_by'] then raise exception 'Server-managed fields cannot be supplied';end if;
 if exists(select 1 from jsonb_object_keys(payload) k where not exists(select 1 from information_schema.columns where table_schema='e34_private' and table_name=entity and column_name=k)) then raise exception 'Unknown record field';end if;
 select data_type into record_type from information_schema.columns where table_schema='e34_private' and table_name=entity and column_name='id';
 if not payload?'id' then
  if record_type='uuid' then payload=payload||jsonb_build_object('id',gen_random_uuid());else raise exception 'A stable registry ID is required';end if;
 end if;
 record_id=payload->>'id';
 execute format('select to_jsonb(t) from e34_private.%I t where id=%s for update',entity,case when record_type='uuid' then '$1::uuid' else '$1' end) into previous using record_id;
 if previous is not null then
  if expected_updated_at is null or (previous->>'updated_at')::timestamptz<>expected_updated_at then raise exception 'This record changed. Reload before saving';end if;
  if entity in ('revenue_records','sponsorship_payments') then raise exception 'Financial receipts and ledger records are immutable';end if;
  select string_agg(format('%I=x.%I',k,k),',') into cols from jsonb_object_keys(payload) k where k<>'id';
  if cols is null then raise exception 'No fields to update';end if;
  execute format('update e34_private.%I t set %s from jsonb_populate_record(null::e34_private.%I,$1) x where t.id=x.id returning to_jsonb(t)',entity,cols,entity) into result using payload;
 else
  select array_agg(k),string_agg(format('%I',k),',') into keys,cols from jsonb_object_keys(payload) k;
  execute format('insert into e34_private.%I(%s) select %s from jsonb_populate_record(null::e34_private.%I,$1) returning to_jsonb(%I)',entity,cols,cols,entity,entity) into result using payload;
 end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata) values(auth.uid(),'commercial:'||case when previous is null then 'create' else 'update' end,entity,record_id,jsonb_build_object('reason',trim(reason),'changed_fields',to_jsonb(array(select jsonb_object_keys(payload)))));
 return result;
end$$;

create function e34_private.public_affiliate_offers(canonical_part_id text,source_position_id text default null) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(
 select o.id,l.id as link_id,m.name as retailer,p.title,i.value as matched_identifier,r.kind,r.compatibility_notes,r.source_url,r.reviewed_at as match_reviewed_at,
 case when o.price_authorized and o.price_observed_at<=now() and o.price_valid_until>now() then o.price_cents end as price_cents,o.currency,
 case when o.availability_authorized and o.availability_observed_at<=now() and o.availability_valid_until>now() then o.availability end as availability,
 case when o.price_authorized and o.price_observed_at<=now() and o.price_valid_until>now() then o.price_observed_at end as price_observed_at,
 case when o.availability_authorized and o.availability_observed_at<=now() and o.availability_valid_until>now() then o.availability_observed_at end as availability_observed_at,
 case when o.shipping_authorized and o.shipping_observed_at<=now() and o.shipping_valid_until>now() then o.shipping_information end as shipping_information,
 case when p.image_authorized then p.image_url end as image_url
 from e34_private.merchant_offers o join e34_private.affiliate_match_reviews r on r.id=o.match_id join e34_private.merchant_products p on p.id=r.product_id join e34_private.affiliate_merchants m on m.id=p.merchant_id join e34_private.affiliate_programs a on a.id=m.program_id join e34_private.affiliate_links l on l.id=o.link_id
 left join lateral(select value from e34_private.merchant_product_identifiers where product_id=p.id order by case when scheme='bmw_oem' and value=(select number_normalized from public.parts where id=r.matched_part_id) then 0 when scheme='manufacturer_part' then 1 else 2 end,id limit 1)i on true
 where r.part_id=canonical_part_id and (r.scope_position_id is null or r.scope_position_id=source_position_id) and r.review_status='approved' and r.kind in ('exact_verified','verified_replacement','conditional') and o.published and m.active and a.status='approved' and (a.expires_at is null or a.expires_at>now()) and l.active and l.check_status='ok' and l.last_checked_at>=now()-interval '30 days' and (l.expires_at is null or l.expires_at>now()) and l.product_id=p.id and l.destination_url=p.product_url
 and coalesce(e34_private.commercial_url_host(l.destination_url)=any(m.allowed_hosts),false) and coalesce(e34_private.commercial_url_host(l.tracking_url)=any(a.tracking_hosts),false)
 and not exists(select 1 from regexp_split_to_table(split_part(l.tracking_url,'?',2),'&') q where q<>'' and not(split_part(q,'=',1)=any(a.query_parameters)))
 and (r.scope_position_id is null or exists(select 1 from public.part_assembly_positions where id=r.scope_position_id and part_id=r.part_id and active))
 and (r.basis='documented_equivalent' or (r.basis='oem_identity' and r.part_id=r.matched_part_id and exists(select 1 from e34_private.merchant_product_identifiers z join public.parts b on b.id=r.part_id and b.number_normalized=z.value where z.product_id=p.id and z.scheme='bmw_oem')) or (r.basis='direct_supersession' and exists(select 1 from public.part_supersessions z where z.id=r.direct_supersession_id and z.previous_part_id=r.part_id and z.replacement_part_id=r.matched_part_id and z.position_id=r.scope_position_id and (z.conditions='[]'::jsonb or r.kind='conditional')) and exists(select 1 from e34_private.merchant_product_identifiers z join public.parts b on b.id=r.matched_part_id and b.number_normalized=z.value where z.product_id=p.id and z.scheme='bmw_oem')))
 and char_length(canonical_part_id)<=200 and (source_position_id is null or char_length(source_position_id)<=200)
 order by m.name,o.id limit 20)x;
$$;
create function e34_private.resolve_affiliate_link(link_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('url',l.tracking_url,'allowed_host',e34_private.commercial_url_host(l.tracking_url),'merchant',m.name) from e34_private.affiliate_links l join e34_private.affiliate_merchants m on m.id=l.merchant_id join e34_private.affiliate_programs p on p.id=m.program_id
 where l.id=link_id and l.active and l.check_status='ok' and l.last_checked_at>=now()-interval '30 days' and m.active and p.status='approved' and (l.expires_at is null or l.expires_at>now()) and (p.expires_at is null or p.expires_at>now()) and coalesce(e34_private.commercial_url_host(l.tracking_url)=any(p.tracking_hosts),false) and coalesce(e34_private.commercial_url_host(l.destination_url)=any(m.allowed_hosts),false)
 and not exists(select 1 from regexp_split_to_table(split_part(l.tracking_url,'?',2),'&') q where q<>'' and not(split_part(q,'=',1)=any(p.query_parameters)))
 and (l.product_id is null or exists(select 1 from e34_private.merchant_offers o join e34_private.affiliate_match_reviews r on r.id=o.match_id cross join lateral jsonb_array_elements(e34_private.public_affiliate_offers(r.part_id,r.scope_position_id)) x where o.link_id=l.id and x->>'link_id'=l.id::text));
$$;
create function e34_private.record_affiliate_click(target_link uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if e34_private.resolve_affiliate_link(target_link) is null then return;end if;
 insert into e34_private.affiliate_clicks_daily(link_id,day,clicks) values(target_link,current_date,1) on conflict(link_id,day) do update set clicks=least(1000000000,affiliate_clicks_daily.clicks+1);
end$$;
create function e34_private.public_advertisements(page_section text,preview boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if preview and not e34_private.commercial_admin() then raise exception 'Administrator permission and MFA required';end if;
 if page_section not in ('home','parts','articles','encyclopedia','community') then return '[]';end if;
 if not preview and not exists(select 1 from e34_private.commercial_settings where id='site' and advertising_enabled) then return '[]';end if;
 return coalesce((select jsonb_agg(to_jsonb(x)) from(select distinct on(c.placement_id) c.id,c.placement_id,c.title,c.body,c.image_url,c.image_alt,c.destination_url,c.ends_at,s.name as sponsor from e34_private.advertising_campaigns c join e34_private.sponsorships s on s.id=c.sponsorship_id join e34_private.advertising_placements p on p.id=c.placement_id where s.status='approved' and ((preview and c.status in ('draft','approved','active')) or (not preview and c.status='active' and c.starts_at<=now() and c.ends_at>now())) and page_section=any(p.allowed_sections) and (preview or p.enabled) order by c.placement_id,c.priority desc,c.id limit 2)x),'[]'::jsonb);
end$$;
create function e34_private.record_advertising_event(target_campaign uuid,event_name text,page_section text) returns void language plpgsql security definer set search_path='' as $$begin
 if event_name not in ('impression','click') or not exists(select 1 from jsonb_array_elements(e34_private.public_advertisements(page_section)) x where x->>'id'=target_campaign::text) then return;end if;
 insert into e34_private.advertising_daily(campaign_id,day,impressions,clicks) values(target_campaign,current_date,case when event_name='impression' then 1 else 0 end,case when event_name='click' then 1 else 0 end) on conflict(campaign_id,day) do update set impressions=least(1000000000,advertising_daily.impressions+excluded.impressions),clicks=least(1000000000,advertising_daily.clicks+excluded.clicks);
end$$;

-- Public facades expose only safe offers/creative or require admin + MFA internally.
create function public.affiliate_workspace(section_name text default 'overview',search_text text default '') returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.affiliate_workspace(section_name,search_text)$$;
create function public.save_affiliate_record(entity text,payload jsonb,reason text,expected_updated_at timestamptz default null) returns jsonb language sql security invoker set search_path='' as $$select e34_private.save_affiliate_record(entity,payload,reason,expected_updated_at)$$;
create function public.public_affiliate_offers(canonical_part_id text,source_position_id text default null) returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.public_affiliate_offers(canonical_part_id,source_position_id)$$;
create function public.resolve_affiliate_link(link_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.resolve_affiliate_link(link_id)$$;
create function public.record_affiliate_click(link_id uuid) returns void language sql security invoker set search_path='' as $$select e34_private.record_affiliate_click(link_id)$$;
create function public.public_advertisements(page_section text,preview boolean default false) returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.public_advertisements(page_section,preview)$$;
create function public.record_advertising_event(campaign_id uuid,event_name text,page_section text) returns void language sql security invoker set search_path='' as $$select e34_private.record_advertising_event(campaign_id,event_name,page_section)$$;
do $$declare pair record;begin
 for pair in select n.nspname,p.oid::regprocedure as signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','e34_private') and p.proname in ('affiliate_workspace','save_affiliate_record','public_affiliate_offers','resolve_affiliate_link','record_affiliate_click','public_advertisements','record_advertising_event') loop
 execute format('revoke all on function %s from public,anon,authenticated',pair.signature);
 if pair.proname in ('affiliate_workspace','save_affiliate_record') then execute format('grant execute on function %s to authenticated',pair.signature);else execute format('grant execute on function %s to anon,authenticated',pair.signature);end if;
 end loop;
end$$;
grant usage on schema e34_private to anon;

insert into e34_private.commercial_settings(id) values('site');
insert into e34_private.advertising_placements(id,name) values('public_top','Public page header'),('public_bottom','Public page footer');

create function e34_private.import_affiliate_products(merchant_key text,feed_source_url text,feed_sha256 text,format_name text,products jsonb,authorization_evidence_url text,reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare job e34_private.affiliate_import_jobs;item jsonb;product e34_private.merchant_products;product_key uuid;row_hash text;seen integer=0;imported integer=0;unchanged integer=0;failures jsonb='[]';num text;canonical text;begin
 if not e34_private.commercial_admin() then raise exception 'Administrator permission and MFA required';end if;
 if e34_private.commercial_url_host(feed_source_url) is null or e34_private.commercial_url_host(authorization_evidence_url) is null or feed_sha256 !~ '^[a-f0-9]{64}$' or format_name not in ('csv','json','xml','manual') then raise exception 'Record the authorized feed source, hash and format';end if;
 if jsonb_typeof(products)<>'array' or jsonb_array_length(products) not between 1 and 5000 or octet_length(products::text)>4000000 or char_length(trim(reason)) not between 10 and 2000 then raise exception 'Import 1 to 5000 bounded product rows with a reason';end if;
 insert into e34_private.affiliate_import_jobs(merchant_id,source_url,source_sha256,format,authorized_at) values(merchant_key,feed_source_url,feed_sha256,format_name,now()) on conflict(merchant_id,source_sha256) do nothing;
 select * into job from e34_private.affiliate_import_jobs where merchant_id=merchant_key and source_sha256=feed_sha256 for update;
 if job.status='completed' then return to_jsonb(job)||jsonb_build_object('replayed',true);end if;
 for item in select value from jsonb_array_elements(products) loop
  seen=seen+1;
  begin
   if jsonb_typeof(item)<>'object' or char_length(item->>'retailer_sku') not between 1 and 160 or char_length(item->>'title') not between 2 and 300 or item->>'retailer_sku' is null or item->>'title' is null then raise exception 'A retailer SKU and product title are required';end if;
   row_hash=encode(sha256(convert_to(item::text,'UTF8')),'hex');
   select * into product from e34_private.merchant_products where merchant_id=merchant_key and retailer_sku=item->>'retailer_sku' for update;
   if product.id is not null and product.source_sha256=row_hash then unchanged=unchanged+1;continue;end if;
   insert into e34_private.merchant_products(merchant_id,retailer_sku,title,manufacturer,manufacturer_part_number,product_url,source_url,source_sha256,import_job_id,feed_observation)
    values(merchant_key,item->>'retailer_sku',item->>'title',coalesce(item->>'manufacturer',''),coalesce(item->>'manufacturer_part_number',''),item->>'product_url',feed_source_url,row_hash,job.id,item-'retailer_sku'-'title'-'product_url'-'manufacturer'-'manufacturer_part_number')
    on conflict(merchant_id,retailer_sku) do update set title=excluded.title,manufacturer=excluded.manufacturer,manufacturer_part_number=excluded.manufacturer_part_number,product_url=excluded.product_url,source_url=excluded.source_url,source_sha256=excluded.source_sha256,import_job_id=excluded.import_job_id,feed_observation=excluded.feed_observation returning id into product_key;
   for num in select value from jsonb_array_elements_text(coalesce(item->'oem_numbers','[]'::jsonb)) loop
    if num !~ '^[0-9]{11}$' then raise exception 'BMW identifiers must contain exactly eleven digits';end if;
    insert into e34_private.merchant_product_identifiers(product_id,scheme,value,source_url) values(product_key,'bmw_oem',num,feed_source_url) on conflict(product_id,scheme,value) do nothing;
    select id into canonical from public.parts where number_normalized=num;
    if canonical is not null and not exists(select 1 from e34_private.affiliate_match_reviews where product_id=product_key and part_id=canonical) then
     insert into e34_private.affiliate_match_reviews(product_id,part_id,matched_part_id,kind,basis,source_url,compatibility_notes) values(product_key,canonical,canonical,'unverified_candidate','oem_identity',feed_source_url,'Imported identifier candidate. A human must review the source, installed configuration and product before approval.');
    end if;
   end loop;
   imported=imported+1;
  exception when others then
   if jsonb_array_length(failures)<40 then failures=failures||jsonb_build_array(jsonb_build_object('row',seen,'sku',left(item->>'retailer_sku',160),'error',left(sqlerrm,300)));end if;
  end;
 end loop;
 update e34_private.affiliate_import_jobs set status=case when imported+unchanged=0 then 'failed' else 'completed' end,rows_seen=seen,rows_imported=imported,rows_unchanged=unchanged,errors=failures where id=job.id returning * into job;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata) values(auth.uid(),'commercial:feed-import','affiliate_import_jobs',job.id::text,jsonb_build_object('reason',trim(reason),'authorization_evidence_url',authorization_evidence_url,'rows_seen',seen,'rows_imported',imported,'rows_unchanged',unchanged));
 return to_jsonb(job)||jsonb_build_object('replayed',false);
end$$;
create function public.import_affiliate_products(merchant_key text,feed_source_url text,feed_sha256 text,format_name text,products jsonb,authorization_evidence_url text,reason text) returns jsonb language sql security invoker set search_path='' as $$select e34_private.import_affiliate_products(merchant_key,feed_source_url,feed_sha256,format_name,products,authorization_evidence_url,reason)$$;
revoke all on function e34_private.import_affiliate_products(text,text,text,text,jsonb,text,text),public.import_affiliate_products(text,text,text,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function e34_private.import_affiliate_products(text,text,text,text,jsonb,text,text),public.import_affiliate_products(text,text,text,text,jsonb,text,text) to authenticated;

create function e34_private.invalidate_merchant_match() returns trigger language plpgsql security definer set search_path='' as $$declare product_key uuid;begin
 if tg_table_name='merchant_products' then
  if (new.manufacturer,new.manufacturer_part_number,new.product_url,new.image_permission_url) is not distinct from (old.manufacturer,old.manufacturer_part_number,old.product_url,old.image_permission_url) then return new;end if;
  product_key=new.id;
 else product_key=case when tg_op='DELETE' then old.product_id else new.product_id end;end if;
 update e34_private.affiliate_match_reviews set review_status='pending' where product_id=product_key and review_status='approved';
 update e34_private.merchant_offers set published=false where match_id in(select id from e34_private.affiliate_match_reviews where product_id=product_key) and published;
 return case when tg_op='DELETE' then old else new end;
end$$;
revoke all on function e34_private.invalidate_merchant_match() from public,anon,authenticated;
create trigger merchant_identity_changed after update on e34_private.merchant_products for each row execute function e34_private.invalidate_merchant_match();
create trigger merchant_identifier_changed after insert or update or delete on e34_private.merchant_product_identifiers for each row execute function e34_private.invalidate_merchant_match();

create function e34_private.affiliate_link_for_check(target_link uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not e34_private.commercial_admin() then raise exception 'Administrator permission and MFA required';end if;
 return(select jsonb_build_object('id',l.id,'url',l.tracking_url,'allowed_hosts',m.allowed_hosts||p.tracking_hosts,'updated_at',l.updated_at) from e34_private.affiliate_links l join e34_private.affiliate_merchants m on m.id=l.merchant_id join e34_private.affiliate_programs p on p.id=m.program_id where l.id=target_link);
end$$;
create function e34_private.record_affiliate_link_check(target_link uuid,result_status text,expected_updated_at timestamptz) returns void language plpgsql security definer set search_path='' as $$begin
 if not e34_private.commercial_admin() then raise exception 'Administrator permission and MFA required';end if;
 if result_status not in ('ok','broken','blocked') then raise exception 'Unknown link-check outcome';end if;
 update e34_private.affiliate_links set check_status=result_status,last_checked_at=clock_timestamp(),active=case when result_status='ok' then active else false end where id=target_link and updated_at=expected_updated_at;
 if not found then raise exception 'The link changed during its check. Reload it';end if;
 insert into e34_private.audit_events(actor_id,action,table_name,record_id,metadata) values(auth.uid(),'commercial:link-check','affiliate_links',target_link::text,jsonb_build_object('reason','Owner-requested bounded link check','status',result_status));
end$$;
create function public.affiliate_link_for_check(target_link uuid) returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.affiliate_link_for_check(target_link)$$;
create function public.record_affiliate_link_check(target_link uuid,result_status text,expected_updated_at timestamptz) returns void language sql security invoker set search_path='' as $$select e34_private.record_affiliate_link_check(target_link,result_status,expected_updated_at)$$;
revoke all on function e34_private.affiliate_link_for_check(uuid),public.affiliate_link_for_check(uuid),e34_private.record_affiliate_link_check(uuid,text,timestamptz),public.record_affiliate_link_check(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function e34_private.affiliate_link_for_check(uuid),public.affiliate_link_for_check(uuid),e34_private.record_affiliate_link_check(uuid,text,timestamptz),public.record_affiliate_link_check(uuid,text,timestamptz) to authenticated;

-- These aggregate records contain no account IDs, IPs, searches or referrers.
-- Retain the existing 90-day analytics window without purging financial evidence.
select cron.schedule('e34-commercial-aggregate-retention','20 3 * * *',$job$delete from e34_private.affiliate_clicks_daily where day<current_date-89;delete from e34_private.advertising_daily where day<current_date-89;$job$);
