-- Generated from existing canonical application identities.
insert into public.reference_article_index(id,title) values
('know-your-e34','Vehicle identification and applicability'),
('cooling-system','Cooling system: circulation and temperature control'),
('fitment-evidence','Part fitment and interchange criteria'),
('first-inspection','Vehicle intake inspection')
on conflict(id) do update set title=excluded.title;
insert into public.diagnostic_flow_index(id,title) values
('overheating','Temperature rising'),
('no-start','Engine won’t start'),
('vibration','Vibration or shimmy'),
('braking','Brake concern')
on conflict(id) do update set title=excluded.title;
