begin;
insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,aud,role) values
('ea340000-0000-4000-8000-000000000001','commercial-admin@example.invalid',now(),now()-interval '2 days',now(),'authenticated','authenticated'),
('ea340000-0000-4000-8000-000000000002','commercial-member@example.invalid',now(),now()-interval '2 days',now(),'authenticated','authenticated'),
('ea340000-0000-4000-8000-000000000003','commercial-moderator@example.invalid',now(),now()-interval '2 days',now(),'authenticated','authenticated');
insert into e34_private.staff_roles values('ea340000-0000-4000-8000-000000000001','admin'),('ea340000-0000-4000-8000-000000000003','moderator');
insert into public.sources(id,title,url,rights) values('commercial-fixture-source','Disposable commercial test source','https://parts.example/evidence','Synthetic rollback-only test');
insert into public.components(id,name,system_id) values('commercial-fixture-component','Disposable test component','engine');
insert into public.assemblies(id,component_id,title,source_id,boundary) values('commercial-fixture-assembly','commercial-fixture-component','Disposable test assembly','commercial-fixture-source','Synthetic test');
insert into public.parts(id,assembly_id,name,number_normalized,source_id,review_status) values
('commercial-fixture-part','commercial-fixture-assembly','Disposable test part','00000000001','commercial-fixture-source','reference-only'),
('commercial-fixture-replacement','commercial-fixture-assembly','Disposable test replacement','00000000002','commercial-fixture-source','reference-only'),
('commercial-fixture-third','commercial-fixture-assembly','Disposable third identity','00000000003','commercial-fixture-source','reference-only');
insert into public.part_assembly_positions(id,assembly_id,part_id,context_id,reference,source_name,source_url,source_sha256,record_sha256) values
('commercial-fixture-position','commercial-fixture-assembly','commercial-fixture-part',(select id from public.vehicle_catalog_contexts order by id limit 1),'01','Synthetic exact position','https://www.bmwpartsdeal.com/parts-list/commercial-fixture',repeat('a',64),repeat('b',64)),
('commercial-fixture-position-2','commercial-fixture-assembly','commercial-fixture-replacement',(select id from public.vehicle_catalog_contexts order by id limit 1),'02','Synthetic second position','https://www.bmwpartsdeal.com/parts-list/commercial-fixture',repeat('a',64),repeat('c',64));
insert into public.part_supersessions(id,previous_part_id,replacement_part_id,position_id,source_id,conditions) values
('commercial-fixture-edge','commercial-fixture-part','commercial-fixture-replacement','commercial-fixture-position','commercial-fixture-source','[]'),
('commercial-fixture-conditional','commercial-fixture-part','commercial-fixture-replacement','commercial-fixture-position','commercial-fixture-source','["Synthetic source condition"]'),
('commercial-fixture-transitive','commercial-fixture-replacement','commercial-fixture-third','commercial-fixture-position-2','commercial-fixture-source','[]');
insert into public.parts(id,assembly_id,name,number_normalized,source_id,review_status) select 'commercial-fixture-queue-'||n,'commercial-fixture-assembly','Queue fixture item '||n,lpad((1000+n)::text,11,'0'),'commercial-fixture-source','reference-only' from generate_series(1,26)n;
select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
do $$begin
 begin perform public.affiliate_catalog_gaps();raise exception 'TEST anonymous queue leak';exception when insufficient_privilege then null;end;
 begin perform public.affiliate_launch_readiness();raise exception 'TEST anonymous readiness leak';exception when insufficient_privilege then null;end;
 begin perform public.affiliate_workspace();raise exception 'TEST anonymous workspace leak';exception when insufficient_privilege then null;end;
 if public.public_affiliate_offers('commercial-fixture-part')<>'[]'::jsonb then raise exception 'Unapproved offers exposed';end if;
 if public.public_advertisements('garage')<>'[]'::jsonb then raise exception 'Private ads exposed';end if;
 begin perform * from e34_private.revenue_records;raise exception 'TEST anonymous revenue read';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"ea340000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);set local role authenticated;
do $$begin
 begin perform public.affiliate_launch_readiness();raise exception 'TEST readiness access bypass';exception when raise_exception then if sqlerrm<>'Administrator permission and MFA required' then raise;end if;end;
 begin perform public.affiliate_workspace();raise exception 'TEST member access';exception when raise_exception then if sqlerrm<>'Administrator permission and MFA required' then raise;end if;end;
 begin perform public.save_affiliate_record('staff_roles','{}','Attempted commercial boundary bypass');raise exception 'TEST arbitrary table access';exception when raise_exception then if sqlerrm<>'Administrator permission and MFA required' then raise;end if;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"ea340000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}',true);set local role authenticated;
do $$begin begin perform public.affiliate_launch_readiness();raise exception 'TEST readiness access bypass';exception when raise_exception then if sqlerrm<>'Administrator permission and MFA required' then raise;end if;end;
 begin perform public.affiliate_workspace();raise exception 'TEST moderator financial access';exception when raise_exception then if sqlerrm<>'Administrator permission and MFA required' then raise;end if;end;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"ea340000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);set local role authenticated;
do $$begin begin perform public.affiliate_launch_readiness();raise exception 'TEST readiness access bypass';exception when raise_exception then if sqlerrm<>'Administrator permission and MFA required' then raise;end if;end;
 begin perform public.affiliate_workspace();raise exception 'TEST admin MFA bypass';exception when raise_exception then if sqlerrm<>'Administrator permission and MFA required' then raise;end if;end;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"ea340000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);set local role authenticated;
do $$declare p jsonb;m jsonb;product jsonb;identifier jsonb;review jsonb;link jsonb;offer jsonb;earning jsonb;sponsor jsonb;c jsonb;settings jsonb;placement jsonb;feed jsonb;replacement jsonb;replacement_review jsonb;replacement_link jsonb;queue jsonb;begin
 queue=public.affiliate_catalog_gaps('Queue fixture');
 if jsonb_array_length(queue->'rows')<>25 or not (queue->>'has_more')::boolean then raise exception 'Catalog queue first page failed';end if;
 queue=public.affiliate_catalog_gaps('Queue fixture',queue->>'next_number',queue->>'next_id');
 if jsonb_array_length(queue->'rows')<>1 or (queue->>'has_more')::boolean then raise exception 'Catalog queue cursor failed';end if;
 if jsonb_typeof(public.affiliate_workspace())<>'object' then raise exception 'Admin workspace unavailable';end if;
 begin perform public.save_affiliate_record('staff_roles','{}','Attempted commercial boundary bypass');raise exception 'TEST arbitrary table access';exception when raise_exception then if sqlerrm<>'Unsupported commercial record' then raise;end if;end;
 begin perform public.save_affiliate_record('affiliate_programs','{"id":"commercial-fixture-program","name":"Test program","official_source_url":"https://parts.example/program","status":"approved"}','Unproven approval must fail');raise exception 'TEST approval bypass';exception when raise_exception then if sqlerrm<>'Approved programs need dated approval and terms evidence' then raise;end if;end;
 p=public.save_affiliate_record('affiliate_programs',jsonb_build_object('id','commercial-fixture-program','name','Test program','official_source_url','https://parts.example/program','status','approved','approval_evidence_url','https://parts.example/contract','approved_at',now(),'terms_checked_at',now(),'tracking_hosts',jsonb_build_array('track.example'),'query_parameters',jsonb_build_array('u')),'Synthetic rollback approval evidence');
 m=public.save_affiliate_record('affiliate_merchants','{"id":"commercial-fixture-retailer","program_id":"commercial-fixture-program","name":"Test retailer","website_url":"https://parts.example","allowed_hosts":["parts.example"],"active":true}','Synthetic rollback retailer activation');
 product=public.save_affiliate_record('merchant_products','{"merchant_id":"commercial-fixture-retailer","retailer_sku":"TEST-1","title":"Disposable product","product_url":"https://parts.example/test-1","source_url":"https://parts.example/test-1"}','Synthetic rollback product evidence');
 begin perform public.save_affiliate_record('affiliate_match_reviews',jsonb_build_object('product_id',product->>'id','part_id','commercial-fixture-part','matched_part_id','commercial-fixture-part','kind','exact_verified','basis','oem_identity','review_status','approved','source_url','https://parts.example/test-1','compatibility_notes','A synthetic exact identifier must be present before approval.'),'Synthetic missing identifier rejection');raise exception 'TEST number matching bypass';exception when raise_exception then if sqlerrm<>'Exact matching needs the canonical BMW identifier' then raise;end if;end;
 identifier=public.save_affiliate_record('merchant_product_identifiers',jsonb_build_object('product_id',product->>'id','scheme','bmw_oem','value','00000000001','source_url','https://parts.example/test-1'),'Synthetic identifier evidence');
 review=public.save_affiliate_record('affiliate_match_reviews',jsonb_build_object('product_id',product->>'id','part_id','commercial-fixture-part','matched_part_id','commercial-fixture-part','kind','exact_verified','basis','oem_identity','review_status','approved','source_url','https://parts.example/test-1','compatibility_notes','Synthetic exact identifier evidence, restricted to this transaction.'),'Synthetic exact match approval');
 begin perform public.save_affiliate_record('affiliate_links',jsonb_build_object('merchant_id','commercial-fixture-retailer','product_id',product->>'id','destination_url','https://evil.example/steal','tracking_url','https://track.example/path','rule_source_url','https://parts.example/rules'),'Synthetic destination rejection');raise exception 'TEST malicious destination';exception when raise_exception then if sqlerrm<>'The link destination or tracking host is not authorized' then raise;end if;end;
 link=public.save_affiliate_record('affiliate_links',jsonb_build_object('merchant_id','commercial-fixture-retailer','product_id',product->>'id','destination_url','https://parts.example/test-1','tracking_url','https://track.example/path?u=test-1','rule_source_url','https://parts.example/rules','active',true,'check_status','ok','last_checked_at',now()),'Synthetic allowed link evidence');
 perform public.save_affiliate_record('affiliate_links',jsonb_build_object('merchant_id','commercial-fixture-retailer','destination_url','https://parts.example/','tracking_url','https://track.example/store?u=home','rule_source_url','https://parts.example/rules','active',true,'check_status','ok','last_checked_at',now()),'Synthetic general storefront link');
 if jsonb_array_length(public.public_affiliate_retailers())<>1 then raise exception 'Approved storefront missing';end if;
 offer=public.save_affiliate_record('merchant_offers',jsonb_build_object('match_id',review->>'id','link_id',link->>'id','published',true,'price_cents',1234,'price_authorized',true,'price_observed_at',now()-interval '3 days','price_valid_until',now()-interval '2 days'),'Synthetic expired price evidence');
 if jsonb_array_length(public.public_affiliate_offers('commercial-fixture-part'))<>1 then raise exception 'Approved offer missing';end if;
 if not exists(select 1 from jsonb_array_elements(public.affiliate_launch_readiness()->'retailers') x where x->>'id'='commercial-fixture-retailer' and (x->>'public_offers')::int=1 and (x->'samples'->0->>'part_id')='commercial-fixture-part') then raise exception 'Readiness did not reuse public projection';end if;
 if public.public_affiliate_offers('commercial-fixture-part')->0->>'price_cents' is not null then raise exception 'Stale price exposed';end if;
 if public.affiliate_catalog_gaps('00000000001')->'rows'<>'[]'::jsonb then raise exception 'Approved identity retained in unmatched queue';end if;
 if public.resolve_affiliate_link((link->>'id')::uuid)->>'url'<>'https://track.example/path?u=test-1' then raise exception 'Safe link did not resolve';end if;
 perform public.record_affiliate_click((link->>'id')::uuid);
 if (public.affiliate_workspace()->'counts'->>'referral_clicks')::bigint<1 then raise exception 'Missing aggregate click';end if;
 if public.affiliate_workspace()->'referrals_by_merchant'->0->>'clicks'<>'1' or public.affiliate_workspace()->'popular_linked_parts'->0->>'clicks'<>'1' then raise exception 'Missing retailer and part aggregate';end if;
 begin perform public.save_affiliate_record('merchant_products',jsonb_build_object('id',product->>'id','title','Stale update'),'Synthetic stale update rejection');raise exception 'TEST missing concurrency check';exception when raise_exception then if sqlerrm<>'This record changed. Reload before saving' then raise;end if;end;
 earning=public.save_affiliate_record('revenue_records','{"kind":"earning","channel":"affiliate","amount_cents":2000,"currency":"USD","occurred_on":"2026-11-07","external_reference":"commercial-fixture-earning","evidence_url":"https://parts.example/report"}','Synthetic verified revenue evidence');
 perform public.save_affiliate_record('revenue_records',jsonb_build_object('kind','reversal','channel','affiliate','amount_cents',500,'currency','USD','occurred_on','2026-11-07','external_reference','commercial-fixture-reversal','evidence_url','https://parts.example/report','reverses_id',earning->>'id'),'Synthetic partial reversal evidence');
 begin perform public.save_affiliate_record('revenue_records',jsonb_build_object('kind','reversal','channel','affiliate','amount_cents',1600,'currency','USD','occurred_on','2026-11-07','external_reference','commercial-fixture-excess','evidence_url','https://parts.example/report','reverses_id',earning->>'id'),'Synthetic excessive reversal evidence');raise exception 'TEST excessive reversal';exception when raise_exception then if sqlerrm<>'Reversal exceeds the remaining earning' then raise;end if;end;
 if not exists(select 1 from jsonb_array_elements(public.affiliate_workspace()->'monthly_revenue')x where x->>'month'='2026-11-01' and x->>'currency'='USD' and x->>'channel'='affiliate' and x->>'confirmed_net_cents'='1500') then raise exception 'Monthly net revenue failed';end if;
 sponsor=public.save_affiliate_record('sponsorships','{"name":"Synthetic advertiser","website_url":"https://sponsor.example","status":"approved","contract_evidence_url":"https://sponsor.example/contract","contract_cents":1000}','Synthetic sponsor contract evidence');
 settings=public.save_affiliate_record('commercial_settings','{"id":"site","advertising_enabled":true}','Synthetic rollback-only ad setting',(public.affiliate_workspace('advertising')->'commercial_settings'->0->>'updated_at')::timestamptz);
 for placement in select value from jsonb_array_elements(public.affiliate_workspace('advertising')->'advertising_placements') loop
  perform public.save_affiliate_record('advertising_placements',jsonb_build_object('id',placement->>'id','enabled',true),'Synthetic rollback-only placement',(placement->>'updated_at')::timestamptz);
  for i in 1..2 loop
   c=public.save_affiliate_record('advertising_campaigns',jsonb_build_object('sponsorship_id',sponsor->>'id','placement_id',placement->>'id','title','Synthetic campaign','body','Not real advertising. This transaction rolls back.','creative_permission_url','https://sponsor.example/creative','destination_url','https://sponsor.example/test','starts_at',now()-interval '1 day','ends_at',now()+interval '1 day','status','active'),'Synthetic rollback campaign evidence');
  end loop;
 end loop;
 c=public.save_affiliate_record('advertising_campaigns',jsonb_build_object('sponsorship_id',sponsor->>'id','placement_id','public_top','title','Expired synthetic campaign','body','This expired campaign must never serve.','creative_permission_url','https://sponsor.example/creative','destination_url','https://sponsor.example/test','starts_at',now()-interval '2 days','ends_at',now()-interval '1 day','status','active','priority',100),'Synthetic expired campaign rejection');
 if exists(select 1 from jsonb_array_elements(public.public_advertisements('parts')) x where x->>'id'=c->>'id') then raise exception 'Expired campaign served';end if;
 c=public.save_affiliate_record('advertising_campaigns',jsonb_build_object('sponsorship_id',sponsor->>'id','placement_id','public_bottom','title','Future synthetic campaign','body','This future campaign must never serve.','creative_permission_url','https://sponsor.example/creative','destination_url','https://sponsor.example/test','starts_at',now()+interval '1 day','ends_at',now()+interval '2 days','status','active','priority',100),'Synthetic future campaign rejection');
 if exists(select 1 from jsonb_array_elements(public.public_advertisements('parts')) x where x->>'id'=c->>'id') then raise exception 'Future campaign served';end if;
 if jsonb_array_length(public.public_advertisements('parts'))<>2 then raise exception 'Maximum two placements failed';end if;
 if public.public_advertisements('workshop')<>'[]'::jsonb or public.public_advertisements('guides')<>'[]'::jsonb or public.public_advertisements('account')<>'[]'::jsonb then raise exception 'Restricted route ads exposed';end if;

 feed=public.import_affiliate_products('commercial-fixture-retailer','https://parts.example/feed',repeat('b',64),'json','[{"retailer_sku":"IMPORTED-1","title":"Imported candidate","product_url":"https://parts.example/imported","oem_numbers":["00000000001"]}]','https://parts.example/feed-permission','Synthetic authorized feed import');
 if (feed->>'rows_imported')::integer<>1 then raise exception 'Feed import missing';end if;
 if not (public.import_affiliate_products('commercial-fixture-retailer','https://parts.example/feed',repeat('b',64),'json','[{"retailer_sku":"IMPORTED-1","title":"Imported candidate","product_url":"https://parts.example/imported","oem_numbers":["00000000001"]}]','https://parts.example/feed-permission','Synthetic duplicate import check')->>'replayed')::boolean then raise exception 'Feed replay not idempotent';end if;
 if jsonb_array_length(public.public_affiliate_offers('commercial-fixture-part'))<>1 then raise exception 'Unverified feed candidate exposed';end if;
 perform public.save_affiliate_record('merchant_product_identifiers',jsonb_build_object('id',identifier->>'id','value','00000000002'),'Synthetic changed identifier invalidation',(identifier->>'updated_at')::timestamptz);
 if public.public_affiliate_offers('commercial-fixture-part')<>'[]'::jsonb or public.resolve_affiliate_link((link->>'id')::uuid) is not null then raise exception 'Changed identity retained a published match';end if;

 replacement=public.save_affiliate_record('merchant_products','{"merchant_id":"commercial-fixture-retailer","retailer_sku":"REPLACEMENT-1","title":"Synthetic replacement product","product_url":"https://parts.example/replacement","source_url":"https://parts.example/replacement"}','Synthetic directed replacement fixture');
 begin
  perform public.save_affiliate_record('affiliate_match_reviews',jsonb_build_object('product_id',replacement->>'id','part_id','commercial-fixture-part','matched_part_id','commercial-fixture-replacement','kind','verified_replacement','basis','direct_supersession','scope_position_id','commercial-fixture-position','direct_supersession_id','commercial-fixture-edge','review_status','approved','source_url','https://parts.example/replacement','compatibility_notes','Synthetic direct replacement with no merchant target identifier.'),'Synthetic missing replacement target rejection');
  raise exception 'TEST direct target identifier bypass';
 exception when raise_exception then if sqlerrm<>'The retailer identifier must match the direct replacement target' then raise;end if;end;
 perform public.save_affiliate_record('merchant_product_identifiers',jsonb_build_object('product_id',replacement->>'id','scheme','bmw_oem','value','00000000001','source_url','https://parts.example/replacement'),'Synthetic other product number');
 perform public.save_affiliate_record('merchant_product_identifiers',jsonb_build_object('product_id',replacement->>'id','scheme','bmw_oem','value','00000000002','source_url','https://parts.example/replacement'),'Synthetic replacement target number');
 replacement_review=public.save_affiliate_record('affiliate_match_reviews',jsonb_build_object('product_id',replacement->>'id','part_id','commercial-fixture-part','matched_part_id','commercial-fixture-replacement','kind','verified_replacement','basis','direct_supersession','scope_position_id','commercial-fixture-position','direct_supersession_id','commercial-fixture-edge','review_status','approved','source_url','https://parts.example/replacement','compatibility_notes','Synthetic directly sourced replacement restricted to the selected position.'),'Synthetic direct replacement approval');
 replacement_link=public.save_affiliate_record('affiliate_links',jsonb_build_object('merchant_id','commercial-fixture-retailer','product_id',replacement->>'id','destination_url','https://parts.example/replacement','tracking_url','https://track.example/path?u=replacement','rule_source_url','https://parts.example/rules','active',true,'check_status','ok','last_checked_at',now()),'Synthetic replacement link');
 perform public.save_affiliate_record('merchant_offers',jsonb_build_object('match_id',replacement_review->>'id','link_id',replacement_link->>'id','published',true,'price_cents',500,'price_authorized',true,'price_observed_at',now()+interval '1 day','price_valid_until',now()+interval '2 days','availability','in_stock','availability_authorized',true,'availability_observed_at',now()-interval '2 days','availability_valid_until',now()-interval '1 day','shipping_information','Synthetic expired shipping','shipping_authorized',true,'shipping_observed_at',now()-interval '2 days','shipping_valid_until',now()-interval '1 day'),'Synthetic future price and stale stock');
 if public.public_affiliate_offers('commercial-fixture-part')<>'[]'::jsonb or public.public_affiliate_offers('commercial-fixture-part','commercial-fixture-position-2')<>'[]'::jsonb then raise exception 'Scoped supersession leaked across positions';end if;
 if jsonb_array_length(public.public_affiliate_offers('commercial-fixture-part','commercial-fixture-position'))<>1 then raise exception 'Directed replacement missing';end if;
 if public.public_affiliate_offers('commercial-fixture-part','commercial-fixture-position')->0->>'matched_identifier'<>'00000000002' then raise exception 'Wrong replacement identifier displayed';end if;
 if exists(select 1 from jsonb_array_elements(public.public_affiliate_offers('commercial-fixture-part','commercial-fixture-position')) x where x->>'price_cents' is not null or x->>'price_observed_at' is not null or x->>'availability' is not null or x->>'shipping_information' is not null) then raise exception 'Future or stale observation leaked';end if;
 begin perform public.save_affiliate_record('affiliate_match_reviews',jsonb_build_object('id',replacement_review->>'id','direct_supersession_id','commercial-fixture-transitive','matched_part_id','commercial-fixture-third'),'Synthetic transitive replacement rejection',(replacement_review->>'updated_at')::timestamptz);raise exception 'TEST transitive replacement';exception when raise_exception then if sqlerrm<>'Replacement matching needs a direct source-scoped supersession' then raise;end if;end;
 begin perform public.save_affiliate_record('affiliate_match_reviews',jsonb_build_object('id',replacement_review->>'id','direct_supersession_id','commercial-fixture-conditional'),'Synthetic conditional replacement rejection',(replacement_review->>'updated_at')::timestamptz);raise exception 'TEST conditional evidence flattened';exception when raise_exception then if sqlerrm<>'Source-conditional supersessions must remain conditional' then raise;end if;end;
 replacement_review=public.save_affiliate_record('affiliate_match_reviews',jsonb_build_object('id',replacement_review->>'id','kind','conditional','direct_supersession_id','commercial-fixture-conditional'),'Synthetic preserved source condition',(replacement_review->>'updated_at')::timestamptz);
 if public.public_affiliate_offers('commercial-fixture-part','commercial-fixture-position')->0->>'kind'<>'conditional' then raise exception 'Conditional classification lost';end if;
 perform public.record_affiliate_link_check((replacement_link->>'id')::uuid,'broken',(replacement_link->>'updated_at')::timestamptz);
 if public.public_affiliate_offers('commercial-fixture-part','commercial-fixture-position')<>'[]'::jsonb or public.resolve_affiliate_link((replacement_link->>'id')::uuid) is not null then raise exception 'Broken check did not withdraw offer';end if;
 perform public.record_affiliate_link_check((replacement_link->>'id')::uuid,'ok',(public.affiliate_link_for_check((replacement_link->>'id')::uuid)->>'updated_at')::timestamptz);
 if public.resolve_affiliate_link((replacement_link->>'id')::uuid) is not null then raise exception 'Successful check silently reactivated link';end if;
 replacement_link=public.save_affiliate_record('affiliate_links',jsonb_build_object('id',replacement_link->>'id','active',true),'Synthetic explicit link reactivation',(public.affiliate_link_for_check((replacement_link->>'id')::uuid)->>'updated_at')::timestamptz);
 p=public.save_affiliate_record('affiliate_programs',jsonb_build_object('id',p->>'id','status','suspended'),'Synthetic program suspension withdrawal',(p->>'updated_at')::timestamptz);
 if public.public_affiliate_offers('commercial-fixture-part','commercial-fixture-position')<>'[]'::jsonb or public.resolve_affiliate_link((replacement_link->>'id')::uuid) is not null then raise exception 'Suspended program retained offers';end if;
 if exists(select 1 from jsonb_array_elements(public.affiliate_launch_readiness()->'retailers') x where x->>'id'='commercial-fixture-retailer' and (x->>'public_offers')::int<>0) then raise exception 'Readiness retained suspended offer';end if;
 if public.public_affiliate_retailers()<>'[]'::jsonb then raise exception 'Suspended storefront exposed';end if;
 perform set_config('e34.test.link',link->>'id',true);
end$$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
do $$declare result jsonb;begin
 result=public.public_affiliate_offers('commercial-fixture-part');
 if result::text ~ '(commission|contract_cents|contact_information|secret_reference)' then raise exception 'Private business data leaked';end if;
 begin perform * from e34_private.affiliate_programs;raise exception 'TEST private program read';exception when insufficient_privilege then null;end;
 begin perform public.save_affiliate_record('affiliate_links','{}','Anonymous mutation should fail');raise exception 'TEST anonymous mutation';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if not exists(select 1 from e34_private.audit_events where action='commercial:create' and metadata->>'reason'='Synthetic exact match approval') then raise exception 'Missing audit evidence';end if;
 if not exists(select 1 from e34_private.affiliate_clicks_daily where link_id=current_setting('e34.test.link')::uuid and clicks=1) then raise exception 'Missing anonymous aggregate';end if;
end$$;
select 'PASS: commercial admin+MFA, private business records, approval gates, exact matching, safe links, expired prices, concurrency, aggregate counts, reversals, two-ad cap, route restrictions and audit' as verification;
rollback;
