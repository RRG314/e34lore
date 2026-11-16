begin;
insert into auth.users(id,email,aud,role,created_at,updated_at,email_confirmed_at) values
('ed340000-0000-4000-8000-000000000901','car-photo-owner@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now()),
('ed340000-0000-4000-8000-000000000902','car-photo-peer@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now()),
('ed340000-0000-4000-8000-000000000903','car-photo-staff@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now());
insert into e34_private.staff_roles values('ed340000-0000-4000-8000-000000000903','moderator');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000901","role":"authenticated"}',true);set local role authenticated;
insert into public.owned_vehicles(id,nickname,model_id,configuration) values('ed340000-0000-4000-8000-000000000910','PhotoFixture','525i','{"engine":"M50","year":"1993","body":"Touring"}');
do $$begin begin insert into public.threads(title,body,category,manual_chapter_id) values('Invalid source chapter fixture','This transaction-only invalid source chapter must be rejected by the foreign key.','Technical Help & Troubleshooting','UNKNOWN');raise exception 'TEST: invalid manual chapter accepted';exception when foreign_key_violation then null;end;end$$;
select public.reserve_car_photo('ed340000-0000-4000-8000-000000000910','Private car caption','Blue E34 Touring viewed from front',true);
select public.publish_garage_vehicle('ed340000-0000-4000-8000-000000000910','PhotoFixture shared car','An explicit transaction-only shared story with enough context for this car showcase test.');
do $$begin
 begin update public.owner_car_photos set state='ready';raise exception 'TEST: untrusted completion allowed';exception when insufficient_privilege then null;end;
 begin perform public.complete_car_photo(auth.uid(),(select id from public.owner_car_photos limit 1),100,100,1000,repeat('a',64));raise exception 'TEST: service completion exposed';exception when insufficient_privilege then null;end;
end$$;
reset role;set local role service_role;
select public.complete_car_photo('ed340000-0000-4000-8000-000000000901',(select id from public.owner_car_photos where vehicle_id='ed340000-0000-4000-8000-000000000910'),100,100,1000,repeat('a',64));
reset role;
insert into storage.objects(bucket_id,name) select 'e34-car-photos',object_path from public.owner_car_photos where vehicle_id='ed340000-0000-4000-8000-000000000910';
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000902","role":"authenticated"}',true);set local role authenticated;
do $$begin
 if exists(select 1 from public.owner_car_photos) then raise exception 'Private source leaked';end if;
 if exists(select 1 from storage.objects where bucket_id='e34-car-photos' and name like 'ed340000-0000-4000-8000-000000000901/%') then raise exception 'Private bytes leaked';end if;
 begin perform public.reserve_car_photo('ed340000-0000-4000-8000-000000000910','','Another private photo',true);raise exception 'TEST: cross-owner upload allowed';exception when raise_exception then if sqlerrm<>'Choose your own car' then raise;end if;end;
 begin perform public.owner_dashboard();raise exception 'TEST: member dashboard access';exception when raise_exception then if sqlerrm<>'Moderator permission and MFA required' then raise;end if;end;
end$$;
reset role;select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000901","role":"authenticated"}',true);set local role authenticated;
select public.publish_car_photo((select id from public.owner_car_photos limit 1),(select entry_id from public.my_garage_publications() where vehicle_id='ed340000-0000-4000-8000-000000000910'));
reset role;select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
do $$begin if exists(select id from public.garage_photos where caption='Private car caption') then raise exception 'Unreviewed photo leaked';end if;if exists(select 1 from storage.objects where bucket_id='e34-car-photos' and name like 'ed340000-0000-4000-8000-000000000901/%') then raise exception 'Unreviewed bytes leaked';end if;end$$;
reset role;select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000903","role":"authenticated","aal":"aal1"}',true);set local role authenticated;
do $$begin begin perform public.owner_dashboard();raise exception 'TEST: dashboard MFA bypass';exception when raise_exception then if sqlerrm<>'Moderator permission and MFA required' then raise;end if;end;end$$;
reset role;select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000903","role":"authenticated","aal":"aal2"}',true);set local role authenticated;
select public.owner_dashboard();
select public.review_car_photo((select id from public.garage_photos where caption='Private car caption'),'approved','Transaction-only photo approval with reviewed permission.');
select public.feature_garage((select garage_id from public.garage_photos where caption='Private car caption'),true,'Transaction-only selection of a real submitted car.');
reset role;select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
do $$begin
 if not exists(select id from public.garage_photos where caption='Private car caption') then raise exception 'Approved photo unavailable';end if;
 if not exists(select 1 from storage.objects where bucket_id='e34-car-photos' and name like 'ed340000-0000-4000-8000-000000000901/%') then raise exception 'Approved bytes unavailable';end if;
 if not exists(select 1 from public.browse_car_showcase('',true) where title='PhotoFixture shared car') then raise exception 'Feature unavailable';end if;
 begin perform review_reason from public.garage_photos;raise exception 'TEST: private review reason exposed';exception when insufficient_privilege then null;end;
end$$;
reset role;select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000901","role":"authenticated"}',true);set local role authenticated;
select public.unpublish_garage((select entry_id from public.my_garage_publications() where vehicle_id='ed340000-0000-4000-8000-000000000910'));
reset role;select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
do $$begin if exists(select id from public.garage_photos where caption='Private car caption') or exists(select 1 from storage.objects where bucket_id='e34-car-photos' and name like 'ed340000-0000-4000-8000-000000000901/%') then raise exception 'Parent withdrawal leaked photo';end if;end$$;
reset role;select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000901","role":"authenticated"}',true);set local role authenticated;
delete from public.owned_vehicles where id='ed340000-0000-4000-8000-000000000910';
reset role;do $$begin if exists(select 1 from public.garage_photos where caption='Private car caption') then raise exception 'Source deletion retained snapshot';end if;if not exists(select 1 from e34_private.media_cleanup_queue where user_id='ed340000-0000-4000-8000-000000000901') then raise exception 'Missing file cleanup receipt';end if;end$$;
select 'PASS: private source and bytes, service completion, owner binding, explicit pending publication, MFA staff dashboard/review/feature, public approved photo, hidden review reason, parent withdrawal and deletion cleanup queue' as verification;
rollback;
