-- Local synthetic fixtures only, prepared after security-policies committed.
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',false);
-- Each psql connection has separate request settings; resolve only fixture IDs.
select public.publish_car_photo(p.id,g.entry_id) from public.owner_car_photos p join e34_private.garage_publications g on g.vehicle_id=p.vehicle_id where p.user_id='e3400000-0000-4000-8000-000000000001';
select public.publish_journal_entry('e3400000-0000-4000-8000-000000000020',1);
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000003","session_id":"e3400000-0000-4000-9000-000000000003","role":"authenticated","aal":"aal2"}',false);
select public.review_car_photo(id,'approved','Synthetic recovery photograph approved for the isolated drill.') from public.garage_photos;
insert into public.owner_car_photos(id,user_id,vehicle_id,object_path,caption,alt_text,state,width,height,bytes,sha256) values('e3400000-0000-4000-8000-000000000070','e3400000-0000-4000-8000-000000000001','e3400000-0000-4000-8000-000000000010','e3400000-0000-4000-8000-000000000001/e3400000-0000-4000-8000-000000000070.jpg','','Synthetic private photograph','ready',4,3,631,repeat('b',64));
insert into storage.objects(bucket_id,name) values('e34-car-photos','e3400000-0000-4000-8000-000000000001/e3400000-0000-4000-8000-000000000070.jpg');
