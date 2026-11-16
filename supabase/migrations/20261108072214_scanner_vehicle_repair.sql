-- Additive private evidence, device-local scan metadata and extension of existing guide progress.
create table public.vehicle_configuration_evidence(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,
 vehicle_id uuid not null,attribute text not null check(attribute in ('manufacturer','platform','model','year','month','market','body','engine','transmission','drivetrain','steering','options')),
 value text not null check(length(value)<=200),kind text not null check(kind in ('factory','observed','modified','inferred','unknown')),
 source text not null check(length(btrim(source))between 3 and 800),supersedes uuid,created_at timestamptz not null default now(),
 unique(id,user_id,vehicle_id),foreign key(vehicle_id,user_id)references public.owned_vehicles(id,user_id)on delete cascade,
 foreign key(supersedes,user_id,vehicle_id)references public.vehicle_configuration_evidence(id,user_id,vehicle_id)
);
create index configuration_evidence_vehicle on public.vehicle_configuration_evidence(user_id,vehicle_id,created_at desc);
create table public.vehicle_configuration_revisions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid()references auth.users on delete cascade,vehicle_id uuid not null,
 revision integer not null check(revision>0),selection jsonb not null check(jsonb_typeof(selection)='object'),configuration jsonb not null check(jsonb_typeof(configuration)='object'),
 created_at timestamptz not null default now(),unique(vehicle_id,revision),unique(id,user_id,vehicle_id),
 foreign key(vehicle_id,user_id)references public.owned_vehicles(id,user_id)on delete cascade
);
create index configuration_revisions_owner on public.vehicle_configuration_revisions(user_id,vehicle_id,revision desc);
create table public.scanner_model_versions(
 id text primary key,revision text not null,task text not null,license text not null,source_url text not null,validation_status text not null check(validation_status in ('experimental','reviewed')),manifest jsonb not null default '{}'
);
create table public.scanner_components(id text primary key,title text not null,model_revision integer not null,geometry_status text not null check(geometry_status='illustrative'));
alter table public.scanner_components enable row level security;
revoke all on public.scanner_components from public,anon,authenticated;
grant select on public.scanner_components to anon,authenticated;
create policy public_components on public.scanner_components for select to anon,authenticated using(true);
insert into public.scanner_components values('wheel:front-left','front left · 205/65 R15',14,'illustrative');
insert into public.scanner_components values('wheel:front-right','front right · 205/65 R15',14,'illustrative');
insert into public.scanner_components values('wheel:rear-left','rear left · 205/65 R15',14,'illustrative');
insert into public.scanner_components values('wheel:rear-right','rear right · 205/65 R15',14,'illustrative');
insert into public.scanner_components values('e34body:front-license-plate','Front registration plate',14,'illustrative');
insert into public.scanner_components values('e34body:headlamp-right-inner','right high-beam headlamp',14,'illustrative');
insert into public.scanner_components values('e34body:headlamp-right-outer','right low-beam headlamp',14,'illustrative');
insert into public.scanner_components values('e34body:headlamp-left-inner','left high-beam headlamp',14,'illustrative');
insert into public.scanner_components values('e34body:headlamp-left-outer','left low-beam headlamp',14,'illustrative');
insert into public.scanner_components values('e34body:side-moulding-e34-body-14-right','right protective side moulding',14,'illustrative');
insert into public.scanner_components values('e34body:side-moulding-e34-body-14-left','left protective side moulding',14,'illustrative');
insert into public.scanner_components values('e34body:side-moulding-e34-body-15-right','right protective side moulding',14,'illustrative');
insert into public.scanner_components values('e34body:side-moulding-e34-body-15-left','left protective side moulding',14,'illustrative');
insert into public.scanner_components values('e34body:side-moulding-e34-body-16-right','right protective side moulding',14,'illustrative');
insert into public.scanner_components values('e34body:side-moulding-e34-body-16-left','left protective side moulding',14,'illustrative');
insert into public.scanner_components values('e34body:rear-quarter-right','right rear quarter',14,'illustrative');
insert into public.scanner_components values('e34body:rear-bumper','Rear bumper',14,'illustrative');
insert into public.scanner_components values('e34body:rear-quarter-left','left rear quarter',14,'illustrative');
insert into public.scanner_components values('e34body:front-bumper','Front bumper',14,'illustrative');
insert into public.scanner_components values('e34body:front-fender-right','right front fender',14,'illustrative');
insert into public.scanner_components values('e34body:front-fender-left','left front fender',14,'illustrative');
insert into public.scanner_components values('e34body:shell','Body shell and pillars',14,'illustrative');
insert into public.scanner_components values('e34body:roof','Roof panel',14,'illustrative');
insert into public.scanner_components values('e34body:rocker-right','right rocker panel',14,'illustrative');
insert into public.scanner_components values('e34body:rocker-left','left rocker panel',14,'illustrative');
insert into public.scanner_components values('e34body:rear-door-glass-right','right side glass',14,'illustrative');
insert into public.scanner_components values('e34body:front-door-glass-right','right side glass',14,'illustrative');
insert into public.scanner_components values('e34body:front-door-glass-left','left side glass',14,'illustrative');
insert into public.scanner_components values('e34body:rear-door-glass-left','left side glass',14,'illustrative');
insert into public.scanner_components values('e34body:windshield','Windshield',14,'illustrative');
insert into public.scanner_components values('e34body:rear-window','Rear window',14,'illustrative');
insert into public.scanner_components values('e34body:front-valance','Front lower valance',14,'illustrative');
insert into public.scanner_components values('e34body:hood','Hood',14,'illustrative');
insert into public.scanner_components values('e34body:tail-light-right','right rear combination lamp',14,'illustrative');
insert into public.scanner_components values('e34body:tail-light-left','left rear combination lamp',14,'illustrative');
insert into public.scanner_components values('e34body:trunk','Trunk lid',14,'illustrative');
insert into public.scanner_components values('e34body:rear-door-right','right rear door',14,'illustrative');
insert into public.scanner_components values('e34body:rear-door-left','left rear door',14,'illustrative');
insert into public.scanner_components values('e34body:front-door-right','right front door',14,'illustrative');
insert into public.scanner_components values('e34body:front-door-left','left front door',14,'illustrative');
insert into public.scanner_components values('m50:block','Cast-iron cylinder block with six integral bores',14,'illustrative');
insert into public.scanner_components values('m50:crankshaft','Six-throw counterweighted crankshaft',14,'illustrative');
insert into public.scanner_components values('m50:rod:1','Connecting rod 1',14,'illustrative');
insert into public.scanner_components values('m50:rod-cap:1','Connecting-rod big-end cap 1',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:1:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:1:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:piston:1','Three-ring piston 1',14,'illustrative');
insert into public.scanner_components values('m50:piston-pin:1','Full-floating piston pin 1',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:1:1','Compression ring 1.1',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:1:2','Compression ring 1.2',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:1:3','Oil scraper ring 1.3',14,'illustrative');
insert into public.scanner_components values('m50:rod:2','Connecting rod 2',14,'illustrative');
insert into public.scanner_components values('m50:rod-cap:2','Connecting-rod big-end cap 2',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:2:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:2:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:piston:2','Three-ring piston 2',14,'illustrative');
insert into public.scanner_components values('m50:piston-pin:2','Full-floating piston pin 2',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:2:1','Compression ring 2.1',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:2:2','Compression ring 2.2',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:2:3','Oil scraper ring 2.3',14,'illustrative');
insert into public.scanner_components values('m50:rod:3','Connecting rod 3',14,'illustrative');
insert into public.scanner_components values('m50:rod-cap:3','Connecting-rod big-end cap 3',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:3:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:3:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:piston:3','Three-ring piston 3',14,'illustrative');
insert into public.scanner_components values('m50:piston-pin:3','Full-floating piston pin 3',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:3:1','Compression ring 3.1',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:3:2','Compression ring 3.2',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:3:3','Oil scraper ring 3.3',14,'illustrative');
insert into public.scanner_components values('m50:rod:4','Connecting rod 4',14,'illustrative');
insert into public.scanner_components values('m50:rod-cap:4','Connecting-rod big-end cap 4',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:4:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:4:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:piston:4','Three-ring piston 4',14,'illustrative');
insert into public.scanner_components values('m50:piston-pin:4','Full-floating piston pin 4',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:4:1','Compression ring 4.1',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:4:2','Compression ring 4.2',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:4:3','Oil scraper ring 4.3',14,'illustrative');
insert into public.scanner_components values('m50:rod:5','Connecting rod 5',14,'illustrative');
insert into public.scanner_components values('m50:rod-cap:5','Connecting-rod big-end cap 5',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:5:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:5:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:piston:5','Three-ring piston 5',14,'illustrative');
insert into public.scanner_components values('m50:piston-pin:5','Full-floating piston pin 5',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:5:1','Compression ring 5.1',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:5:2','Compression ring 5.2',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:5:3','Oil scraper ring 5.3',14,'illustrative');
insert into public.scanner_components values('m50:rod:6','Connecting rod 6',14,'illustrative');
insert into public.scanner_components values('m50:rod-cap:6','Connecting-rod big-end cap 6',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:6:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:rod-bolt:6:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:piston:6','Three-ring piston 6',14,'illustrative');
insert into public.scanner_components values('m50:piston-pin:6','Full-floating piston pin 6',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:6:1','Compression ring 6.1',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:6:2','Compression ring 6.2',14,'illustrative');
insert into public.scanner_components values('m50:piston-ring:6:3','Oil scraper ring 6.3',14,'illustrative');
insert into public.scanner_components values('m50:main-cap:1','Main bearing cap 1',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:1:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:1:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-cap:2','Main bearing cap 2',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:2:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:2:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-cap:3','Main bearing cap 3',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:3:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:3:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-cap:4','Main bearing cap 4',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:4:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:4:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-cap:5','Main bearing cap 5',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:5:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:5:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-cap:6','Main bearing cap 6',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:6:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:6:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-cap:7','Main bearing cap 7',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:7:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:main-bolt:7:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:flywheel','Flywheel / starter ring-gear reference',14,'illustrative');
insert into public.scanner_components values('m50:oil-pan','E34 front-sump oil-pan reference',14,'illustrative');
insert into public.scanner_components values('m50:oil-drain-plug','Oil-pan drain plug',14,'illustrative');
insert into public.scanner_components values('m50:oil-pump','Chain-driven oil pump',14,'illustrative');
insert into public.scanner_components values('m50:oil-pickup','Oil pickup tube and strainer',14,'illustrative');
insert into public.scanner_components values('m50:oil-filter-housing','Oil-filter housing and cartridge cap',14,'illustrative');
insert into public.scanner_components values('m50:oil-filter-element','Pleated oil-filter cartridge — HU 926/3 x dimensional reference',14,'illustrative');
insert into public.scanner_components values('m50:cylinder-head','Aluminium crossflow cylinder head',14,'illustrative');
insert into public.scanner_components values('m50:head-gasket','Cylinder-head gasket reference',14,'illustrative');
insert into public.scanner_components values('m50:cam-carrier:exhaust','Exhaust cam carrier',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:-1:1','Exhaust cam bearing cap 1',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:-1:2','Exhaust cam bearing cap 2',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:-1:3','Exhaust cam bearing cap 3',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:-1:4','Exhaust cam bearing cap 4',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:-1:5','Exhaust cam bearing cap 5',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:-1:6','Exhaust cam bearing cap 6',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:-1:7','Exhaust cam bearing cap 7',14,'illustrative');
insert into public.scanner_components values('m50:cam-carrier:intake','Intake cam carrier',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:1:1','Intake cam bearing cap 1',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:1:2','Intake cam bearing cap 2',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:1:3','Intake cam bearing cap 3',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:1:4','Intake cam bearing cap 4',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:1:5','Intake cam bearing cap 5',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:1:6','Intake cam bearing cap 6',14,'illustrative');
insert into public.scanner_components values('m50:cam-cap:1:7','Intake cam bearing cap 7',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:1:1','Exhaust valve 1.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:1:1','Valve spring exhaust 1.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:1:1','Hydraulic lifter exhaust 1.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:1:2','Exhaust valve 1.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:1:2','Valve spring exhaust 1.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:1:2','Hydraulic lifter exhaust 1.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:1:1','Intake valve 1.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:1:1','Valve spring intake 1.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:1:1','Hydraulic lifter intake 1.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:1:2','Intake valve 1.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:1:2','Valve spring intake 1.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:1:2','Hydraulic lifter intake 1.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:2:1','Exhaust valve 2.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:2:1','Valve spring exhaust 2.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:2:1','Hydraulic lifter exhaust 2.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:2:2','Exhaust valve 2.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:2:2','Valve spring exhaust 2.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:2:2','Hydraulic lifter exhaust 2.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:2:1','Intake valve 2.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:2:1','Valve spring intake 2.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:2:1','Hydraulic lifter intake 2.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:2:2','Intake valve 2.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:2:2','Valve spring intake 2.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:2:2','Hydraulic lifter intake 2.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:3:1','Exhaust valve 3.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:3:1','Valve spring exhaust 3.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:3:1','Hydraulic lifter exhaust 3.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:3:2','Exhaust valve 3.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:3:2','Valve spring exhaust 3.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:3:2','Hydraulic lifter exhaust 3.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:3:1','Intake valve 3.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:3:1','Valve spring intake 3.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:3:1','Hydraulic lifter intake 3.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:3:2','Intake valve 3.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:3:2','Valve spring intake 3.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:3:2','Hydraulic lifter intake 3.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:4:1','Exhaust valve 4.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:4:1','Valve spring exhaust 4.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:4:1','Hydraulic lifter exhaust 4.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:4:2','Exhaust valve 4.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:4:2','Valve spring exhaust 4.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:4:2','Hydraulic lifter exhaust 4.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:4:1','Intake valve 4.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:4:1','Valve spring intake 4.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:4:1','Hydraulic lifter intake 4.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:4:2','Intake valve 4.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:4:2','Valve spring intake 4.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:4:2','Hydraulic lifter intake 4.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:5:1','Exhaust valve 5.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:5:1','Valve spring exhaust 5.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:5:1','Hydraulic lifter exhaust 5.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:5:2','Exhaust valve 5.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:5:2','Valve spring exhaust 5.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:5:2','Hydraulic lifter exhaust 5.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:5:1','Intake valve 5.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:5:1','Valve spring intake 5.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:5:1','Hydraulic lifter intake 5.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:5:2','Intake valve 5.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:5:2','Valve spring intake 5.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:5:2','Hydraulic lifter intake 5.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:6:1','Exhaust valve 6.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:6:1','Valve spring exhaust 6.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:6:1','Hydraulic lifter exhaust 6.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:exhaust:6:2','Exhaust valve 6.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:exhaust:6:2','Valve spring exhaust 6.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:exhaust:6:2','Hydraulic lifter exhaust 6.2',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:6:1','Intake valve 6.1',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:6:1','Valve spring intake 6.1',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:6:1','Hydraulic lifter intake 6.1',14,'illustrative');
insert into public.scanner_components values('m50:valve:intake:6:2','Intake valve 6.2',14,'illustrative');
insert into public.scanner_components values('m50:valve-spring:intake:6:2','Valve spring intake 6.2',14,'illustrative');
insert into public.scanner_components values('m50:lifter:intake:6:2','Hydraulic lifter intake 6.2',14,'illustrative');
insert into public.scanner_components values('m50:camshaft:exhaust','Exhaust camshaft with twelve lobes',14,'illustrative');
insert into public.scanner_components values('m50:camshaft:intake','Intake camshaft with twelve lobes',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:1:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:1:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:2:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:2:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:3:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:3:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:4:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:4:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:5:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:5:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:6:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:6:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:7:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:head-bolt:7:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:valve-cover','Ribbed cam / valve cover with six coil wells',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:0:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:0:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:1:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:1:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:2:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:2:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:3:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:3:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:4:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:4:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:5:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:5:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:6:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:6:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:7:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:cover-bolt:7:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:coil-cover','Central ignition-coil cover',14,'illustrative');
insert into public.scanner_components values('m50:oil-filler-cap','Oil-filler cap',14,'illustrative');
insert into public.scanner_components values('m50:ignition-coil:1','Direct ignition coil 1',14,'illustrative');
insert into public.scanner_components values('m50:spark-plug:1','Spark plug 1',14,'illustrative');
insert into public.scanner_components values('m50:ignition-coil:2','Direct ignition coil 2',14,'illustrative');
insert into public.scanner_components values('m50:spark-plug:2','Spark plug 2',14,'illustrative');
insert into public.scanner_components values('m50:ignition-coil:3','Direct ignition coil 3',14,'illustrative');
insert into public.scanner_components values('m50:spark-plug:3','Spark plug 3',14,'illustrative');
insert into public.scanner_components values('m50:ignition-coil:4','Direct ignition coil 4',14,'illustrative');
insert into public.scanner_components values('m50:spark-plug:4','Spark plug 4',14,'illustrative');
insert into public.scanner_components values('m50:ignition-coil:5','Direct ignition coil 5',14,'illustrative');
insert into public.scanner_components values('m50:spark-plug:5','Spark plug 5',14,'illustrative');
insert into public.scanner_components values('m50:ignition-coil:6','Direct ignition coil 6',14,'illustrative');
insert into public.scanner_components values('m50:spark-plug:6','Spark plug 6',14,'illustrative');
insert into public.scanner_components values('m50:cam-sprocket:exhaust','Exhaust cam timing sprocket',14,'illustrative');
insert into public.scanner_components values('m50:cam-sprocket:intake','Intake cam timing sprocket',14,'illustrative');
insert into public.scanner_components values('m50:crank-sprocket','Crankshaft timing sprocket',14,'illustrative');
insert into public.scanner_components values('m50:timing-chain:primary','Primary timing chain',14,'illustrative');
insert into public.scanner_components values('m50:timing-chain:secondary','Secondary camshaft timing chain',14,'illustrative');
insert into public.scanner_components values('m50:oil-pump-chain','Oil-pump drive chain',14,'illustrative');
insert into public.scanner_components values('m50:chain-guide:-1','Fixed timing-chain guide',14,'illustrative');
insert into public.scanner_components values('m50:chain-guide:1','Tensioning timing-chain guide',14,'illustrative');
insert into public.scanner_components values('m50:lower-timing-cover','Profiled lower front timing cover',14,'illustrative');
insert into public.scanner_components values('m50:front-cover-bolt:0','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:front-cover-bolt:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:front-cover-bolt:2','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:front-cover-bolt:3','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:front-cover-bolt:4','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:front-cover-bolt:5','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:vanos','Single VANOS intake-cam actuator housing',14,'illustrative');
insert into public.scanner_components values('m50:vanos-piston','VANOS piston / gear-cup reference',14,'illustrative');
insert into public.scanner_components values('m50:vanos-solenoid','VANOS oil-control solenoid',14,'illustrative');
insert into public.scanner_components values('m50:intake-plenum','M50 long-runner intake plenum',14,'illustrative');
insert into public.scanner_components values('m50:intake-runner:1','Curved intake runner 1',14,'illustrative');
insert into public.scanner_components values('m50:injector:1','Fuel injector 1',14,'illustrative');
insert into public.scanner_components values('m50:intake-runner:2','Curved intake runner 2',14,'illustrative');
insert into public.scanner_components values('m50:injector:2','Fuel injector 2',14,'illustrative');
insert into public.scanner_components values('m50:intake-runner:3','Curved intake runner 3',14,'illustrative');
insert into public.scanner_components values('m50:injector:3','Fuel injector 3',14,'illustrative');
insert into public.scanner_components values('m50:intake-runner:4','Curved intake runner 4',14,'illustrative');
insert into public.scanner_components values('m50:injector:4','Fuel injector 4',14,'illustrative');
insert into public.scanner_components values('m50:intake-runner:5','Curved intake runner 5',14,'illustrative');
insert into public.scanner_components values('m50:injector:5','Fuel injector 5',14,'illustrative');
insert into public.scanner_components values('m50:intake-runner:6','Curved intake runner 6',14,'illustrative');
insert into public.scanner_components values('m50:injector:6','Fuel injector 6',14,'illustrative');
insert into public.scanner_components values('m50:fuel-rail','Six-injector fuel rail',14,'illustrative');
insert into public.scanner_components values('m50:throttle-body','Throttle body and cable quadrant',14,'illustrative');
insert into public.scanner_components values('m50:intake-boot','Intake elbow / bellows reference',14,'illustrative');
insert into public.scanner_components values('m50:idle-control-valve','Idle-air control valve and bypass hoses',14,'illustrative');
insert into public.scanner_components values('m50:exhaust-manifold:1','Three-cylinder exhaust manifold 1',14,'illustrative');
insert into public.scanner_components values('m50:exhaust-manifold:2','Three-cylinder exhaust manifold 2',14,'illustrative');
insert into public.scanner_components values('m50:water-pump','Coolant pump with four retaining ears',14,'illustrative');
insert into public.scanner_components values('m50:pump-nut:-1:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:pump-nut:-1:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:pump-nut:1:-1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:pump-nut:1:1','Hex fastener — envelope only',14,'illustrative');
insert into public.scanner_components values('m50:water-pump-impeller','Coolant-pump impeller reference',14,'illustrative');
insert into public.scanner_components values('m50:thermostat-housing','Thermostat housing and hose outlets',14,'illustrative');
insert into public.scanner_components values('m50:thermostat','Thermostat valve reference',14,'illustrative');
insert into public.scanner_components values('m50:pulley:crank','Crank vibration damper / pulley',14,'illustrative');
insert into public.scanner_components values('m50:pulley:water-pump','Water-pump pulley',14,'illustrative');
insert into public.scanner_components values('m50:pulley:alternator','Alternator pulley',14,'illustrative');
insert into public.scanner_components values('m50:pulley:power-steering','Power-steering pulley',14,'illustrative');
insert into public.scanner_components values('m50:pulley:idler','Accessory idler pulley',14,'illustrative');
insert into public.scanner_components values('m50:alternator','Ventilated alternator housing',14,'illustrative');
insert into public.scanner_components values('m50:power-steering-pump','Power-steering pump',14,'illustrative');
insert into public.scanner_components values('m50:ac-compressor','Air-conditioning compressor / clutch reference',14,'illustrative');
insert into public.scanner_components values('m50:starter','Starter motor and solenoid',14,'illustrative');
insert into public.scanner_components values('m50:belt-tensioner','Accessory-belt tensioner reference',14,'illustrative');
insert into public.scanner_components values('m50:accessory-belt','Multi-rib accessory belt reference',14,'illustrative');
insert into public.scanner_components values('e34sys:floor-pan','Passenger floor pan and stamped ribs',14,'illustrative');
insert into public.scanner_components values('e34sys:firewall','Firewall and pedal bulkhead',14,'illustrative');
insert into public.scanner_components values('e34sys:transmission-tunnel','Raised transmission and propeller-shaft tunnel',14,'illustrative');
insert into public.scanner_components values('e34sys:sill--1','Right inner sill and seat crossmembers',14,'illustrative');
insert into public.scanner_components values('e34sys:chassis-rail--1','Right front chassis rail',14,'illustrative');
insert into public.scanner_components values('e34sys:sill-1','Left inner sill and seat crossmembers',14,'illustrative');
insert into public.scanner_components values('e34sys:chassis-rail-1','Left front chassis rail',14,'illustrative');
insert into public.scanner_components values('e34sys:luggage-floor','Luggage floor and spare-wheel well',14,'illustrative');
insert into public.scanner_components values('e34sys:dashboard','E34 dashboard, vents and center controls',14,'illustrative');
insert into public.scanner_components values('e34sys:instrument-cluster','E34 instrument cluster and binnacle',14,'illustrative');
insert into public.scanner_components values('e34sys:dash-vent-driver','driver dashboard air vent',14,'illustrative');
insert into public.scanner_components values('e34sys:dash-vent-center','center dashboard air vent',14,'illustrative');
insert into public.scanner_components values('e34sys:dash-vent-passenger','passenger dashboard air vent',14,'illustrative');
insert into public.scanner_components values('e34sys:gear-lever','Gear lever and gaiter',14,'illustrative');
insert into public.scanner_components values('e34sys:handbrake-lever','Parking brake lever',14,'illustrative');
insert into public.scanner_components values('e34sys:front-seat--1','Passenger E34 front seat',14,'illustrative');
insert into public.scanner_components values('e34sys:front-seat-1','Driver E34 front seat',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-seat-cushion','E34 rear bench and backrest',14,'illustrative');
insert into public.scanner_components values('e34sys:door-card-front--1','right front door trim',14,'illustrative');
insert into public.scanner_components values('e34sys:door-card-rear--1','right rear door trim',14,'illustrative');
insert into public.scanner_components values('e34sys:door-card-rear-1','left rear door trim',14,'illustrative');
insert into public.scanner_components values('e34sys:headliner','Textured cabin headliner and upper lining',14,'illustrative');
insert into public.scanner_components values('e34sys:steering-wheel','E34 steering wheel',14,'illustrative');
insert into public.scanner_components values('e34sys:steering-column','Cabin steering column shroud',14,'illustrative');
insert into public.scanner_components values('e34sys:steering-gearbox','Power-assisted steering gearbox',14,'illustrative');
insert into public.scanner_components values('e34sys:pitman-arm','Steering pitman arm',14,'illustrative');
insert into public.scanner_components values('e34sys:idler-arm','Right-side steering idler arm and support',14,'illustrative');
insert into public.scanner_components values('e34sys:center-drag-link','Center steering tie rod / drag link',14,'illustrative');
insert into public.scanner_components values('e34sys:tie-rod--1','Right adjustable outer tie rod',14,'illustrative');
insert into public.scanner_components values('e34sys:tie-rod-1','Left adjustable outer tie rod',14,'illustrative');
insert into public.scanner_components values('e34sys:front-subframe','Front engine carrier and connecting crossmember',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-subframe','Rear axle carrier with four isolation mounts',14,'illustrative');
insert into public.scanner_components values('e34sys:front-strut--1','Right front MacPherson strut housing',14,'illustrative');
insert into public.scanner_components values('e34sys:front-damper--1','Right front damper piston and dust boot',14,'illustrative');
insert into public.scanner_components values('e34sys:front-spring--1','Right front coil spring',14,'illustrative');
insert into public.scanner_components values('e34sys:front-spring-seat--1','Right front spring seats and upper mount',14,'illustrative');
insert into public.scanner_components values('e34sys:front-control-arm--1','Right front lower control arm and ball joint',14,'illustrative');
insert into public.scanner_components values('e34sys:front-thrust-arm--1','Right front thrust arm and hydraulic bushing',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-trailing-arm--1','Right rear semi-trailing arm and pivot bushings',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-damper--1','Right rear spring-strut damper and mount',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-coil-spring--1','Right rear coil spring and retaining seats',14,'illustrative');
insert into public.scanner_components values('e34sys:front-strut-1','Left front MacPherson strut housing',14,'illustrative');
insert into public.scanner_components values('e34sys:front-damper-1','Left front damper piston and dust boot',14,'illustrative');
insert into public.scanner_components values('e34sys:front-spring-1','Left front coil spring',14,'illustrative');
insert into public.scanner_components values('e34sys:front-spring-seat-1','Left front spring seats and upper mount',14,'illustrative');
insert into public.scanner_components values('e34sys:front-control-arm-1','Left front lower control arm and ball joint',14,'illustrative');
insert into public.scanner_components values('e34sys:front-thrust-arm-1','Left front thrust arm and hydraulic bushing',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-trailing-arm-1','Left rear semi-trailing arm and pivot bushings',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-damper-1','Left rear spring-strut damper and mount',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-coil-spring-1','Left rear coil spring and retaining seats',14,'illustrative');
insert into public.scanner_components values('e34sys:front-antiroll-bar','Front anti-roll bar and mounting bushes',14,'illustrative');
insert into public.scanner_components values('e34sys:front-drop-link--1','Right front anti-roll link',14,'illustrative');
insert into public.scanner_components values('e34sys:front-drop-link-1','Left front anti-roll link',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-antiroll-bar','Rear anti-roll bar and mounting bushes',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-drop-link--1','Right rear anti-roll link',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-drop-link-1','Left rear anti-roll link',14,'illustrative');
insert into public.scanner_components values('e34sys:hub-front--1','Right front hub and five-bolt flange',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-disc-front--1','Right front brake disc and central hat',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-caliper-front--1','Right front floating brake caliper and carrier',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-pad-front--1','Right front inner and outer brake pads',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-shield-front--1','Right front brake backing shield',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-hose-front--1','Right front flexible brake hose and ABS lead',14,'illustrative');
insert into public.scanner_components values('e34sys:hub-front-1','Left front hub and five-bolt flange',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-disc-front-1','Left front brake disc and central hat',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-caliper-front-1','Left front floating brake caliper and carrier',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-pad-front-1','Left front inner and outer brake pads',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-shield-front-1','Left front brake backing shield',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-hose-front-1','Left front flexible brake hose and ABS lead',14,'illustrative');
insert into public.scanner_components values('e34sys:hub-rear--1','Right rear hub and five-bolt flange',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-disc-rear--1','Right rear brake disc and central hat',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-caliper-rear--1','Right rear floating brake caliper and carrier',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-pad-rear--1','Right rear inner and outer brake pads',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-shield-rear--1','Right rear brake backing shield',14,'illustrative');
insert into public.scanner_components values('e34sys:parking-brake-shoes--1','Right rear drum-in-disc parking brake shoes and expander',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-hose-rear--1','Right rear flexible brake hose and ABS lead',14,'illustrative');
insert into public.scanner_components values('e34sys:hub-rear-1','Left rear hub and five-bolt flange',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-disc-rear-1','Left rear brake disc and central hat',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-caliper-rear-1','Left rear floating brake caliper and carrier',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-pad-rear-1','Left rear inner and outer brake pads',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-shield-rear-1','Left rear brake backing shield',14,'illustrative');
insert into public.scanner_components values('e34sys:parking-brake-shoes-1','Left rear drum-in-disc parking brake shoes and expander',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-hose-rear-1','Left rear flexible brake hose and ABS lead',14,'illustrative');
insert into public.scanner_components values('e34sys:brake-booster-master','Brake vacuum booster, master cylinder and fluid reservoir',14,'illustrative');
insert into public.scanner_components values('e34sys:abs-hydraulic-unit','ABS hydraulic block, pump and hard-line connections',14,'illustrative');
insert into public.scanner_components values('e34sys:manual-gearbox','Longitudinal manual gearbox case and ribs',14,'illustrative');
insert into public.scanner_components values('e34sys:bellhousing','Clutch bellhousing and engine mating flange',14,'illustrative');
insert into public.scanner_components values('e34sys:clutch-assembly','Clutch friction disc and diaphragm pressure cover',14,'illustrative');
insert into public.scanner_components values('e34sys:gearbox-crossmember','Transmission crossmember, rubber mounts and shift linkage',14,'illustrative');
insert into public.scanner_components values('e34sys:clutch-slave-cylinder','Clutch slave cylinder and hydraulic line',14,'illustrative');
insert into public.scanner_components values('e34sys:flexible-drive-coupling','Guibo flexible drive coupling and six fasteners',14,'illustrative');
insert into public.scanner_components values('e34sys:propeller-shaft','Two-piece propeller shaft and universal joint',14,'illustrative');
insert into public.scanner_components values('e34sys:center-bearing','Propeller-shaft center support bearing and bracket',14,'illustrative');
insert into public.scanner_components values('e34sys:differential-case','Rear differential cast housing, cover and mounting ear',14,'illustrative');
insert into public.scanner_components values('e34sys:differential-input-flange','Differential input flange and rear shaft CV coupling',14,'illustrative');
insert into public.scanner_components values('e34sys:halfshaft--1','Right rear halfshaft, CV joints and bellows',14,'illustrative');
insert into public.scanner_components values('e34sys:halfshaft-1','Left rear halfshaft, CV joints and bellows',14,'illustrative');
insert into public.scanner_components values('e34sys:radiator','Radiator core, end tanks and upper mounts',14,'illustrative');
insert into public.scanner_components values('e34sys:fan-shroud','Radiator fan shroud and circular throat',14,'illustrative');
insert into public.scanner_components values('e34sys:engine-cooling-fan','Eleven-blade engine cooling fan and viscous coupling',14,'illustrative');
insert into public.scanner_components values('e34sys:expansion-tank','Coolant expansion tank, level neck and pressure cap',14,'illustrative');
insert into public.scanner_components values('e34sys:upper-radiator-hose','Upper radiator hose, elbows and clamps',14,'illustrative');
insert into public.scanner_components values('e34sys:lower-radiator-hose','Lower radiator hose and return bend',14,'illustrative');
insert into public.scanner_components values('e34sys:heater-hoses','Heater supply and return hoses at firewall',14,'illustrative');
insert into public.scanner_components values('e34sys:airbox','Intake air cleaner housing, lid ribs and clips',14,'illustrative');
insert into public.scanner_components values('e34sys:intake-boot-maf','Air-flow meter and ribbed intake boot',14,'illustrative');
insert into public.scanner_components values('e34sys:fresh-air-snorkel','Front fresh-air intake snorkel',14,'illustrative');
insert into public.scanner_components values('e34sys:hvac-heater-box','Heater/evaporator box and heater core casing',14,'illustrative');
insert into public.scanner_components values('e34sys:blower-motor','Cowl-mounted twin squirrel-cage blower',14,'illustrative');
insert into public.scanner_components values('e34sys:hvac-ducts','Defroster distribution, dashboard and rear footwell ducts',14,'illustrative');
insert into public.scanner_components values('e34sys:fuel-tank','Rear under-luggage-compartment fuel tank and pressed seam',14,'illustrative');
insert into public.scanner_components values('e34sys:fuel-pump-sender','In-tank pump and sender access flanges',14,'illustrative');
insert into public.scanner_components values('e34sys:fuel-filler-neck','Right rear fuel filler neck and vent line',14,'illustrative');
insert into public.scanner_components values('e34sys:fuel-filter','Underfloor inline fuel filter, clamp and unions',14,'illustrative');
insert into public.scanner_components values('e34sys:fuel-supply-return-lines','Underfloor fuel supply, return and clipped vent lines',14,'illustrative');
insert into public.scanner_components values('e34sys:exhaust-downpipes','Twin exhaust downpipes from engine exhaust side',14,'illustrative');
insert into public.scanner_components values('e34sys:catalyst-center-resonator','Twin catalyst/center exhaust housings and heat shields',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-exhaust-pipes','Rear axle clearance exhaust bends',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-muffler','Left rear muffler and dual tailpipes',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-seat-battery','Rear-seat battery, hold-down and insulated terminals',14,'illustrative');
insert into public.scanner_components values('e34sys:front-fuse-relay-box','Front fuse and relay distribution box',14,'illustrative');
insert into public.scanner_components values('e34sys:electronics-box','Right cowl electronics enclosure and DME connector bank',14,'illustrative');
insert into public.scanner_components values('e34sys:body-wiring-harness','Clipped body wiring trunk and engine-bay harness branches',14,'illustrative');
insert into public.scanner_components values('e34sys:seat-belt-front--1','Passenger three-point belt, upper guide and buckle',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-belt--1','Right rear shoulder belt and latch',14,'illustrative');
insert into public.scanner_components values('e34sys:seat-belt-front-1','Driver three-point belt, upper guide and buckle',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-belt-1','Left rear shoulder belt and latch',14,'illustrative');
insert into public.scanner_components values('e34sys:rear-center-lap-belt','Rear center lap belt and paired buckles',14,'illustrative');
insert into public.scanner_components values('e34sys:cabin-carpet','Cabin floor, pillars and inner body lining',14,'illustrative');
insert into public.scanner_components values('e34sys:seatbelt-left','left front seat belt',14,'illustrative');
insert into public.scanner_components values('e34sys:seatbelt-right','right front seat belt',14,'illustrative');
insert into public.scanner_components values('e34sys:pedal-box','Driver pedal box',14,'illustrative');
insert into public.scanner_components values('e34body:roundel-front','Front BMW roundel',14,'illustrative');
insert into public.scanner_components values('e34body:roundel-rear','Rear BMW roundel',14,'illustrative');
insert into public.scanner_components values('e34body:mirror-left','left exterior mirror',14,'illustrative');
insert into public.scanner_components values('e34body:mirror-right','right exterior mirror',14,'illustrative');
insert into public.scanner_components values('e34body:trunk-lamp-left','left trunk-mounted rear lamp',14,'illustrative');
insert into public.scanner_components values('e34body:trunk-lamp-right','right trunk-mounted rear lamp',14,'illustrative');
create table public.component_observations(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid()references auth.users on delete cascade,vehicle_id uuid,
 configuration_revision uuid,mode text not null check(mode in ('installed','loose','markings')),
 part_id text references public.parts,node_id text references public.scanner_components,status text not null default 'candidate' check(status in ('candidate','owner_confirmed','unknown')),
 evidence jsonb not null default '{}' check(jsonb_typeof(evidence)='object' and octet_length(evidence::text)<=12000),
 notes text not null default '' check(length(notes)<=3000),created_at timestamptz not null default now(),unique(id,user_id,vehicle_id),unique(id,user_id),
 foreign key(vehicle_id,user_id)references public.owned_vehicles(id,user_id)on delete cascade,
 foreign key(configuration_revision,user_id,vehicle_id)references public.vehicle_configuration_revisions(id,user_id,vehicle_id),
 check(configuration_revision is null or vehicle_id is not null),check(status<>'owner_confirmed' or part_id is not null or node_id is not null)
);
create index observations_owner_cursor on public.component_observations(user_id,created_at desc,id);
create index observations_vehicle on public.component_observations(vehicle_id,user_id);
create index observations_configuration on public.component_observations(configuration_revision,user_id,vehicle_id);
create index observations_node on public.component_observations(node_id);
create index observations_part on public.component_observations(part_id);
create table public.scanner_corrections(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid()references auth.users on delete cascade,observation_id uuid not null,
 proposed_part_id text references public.parts,reason text not null check(length(btrim(reason))between 10 and 2000),created_at timestamptz not null default now(),
 foreign key(observation_id,user_id)references public.component_observations(id,user_id)on delete cascade
);
create index scanner_corrections_owner on public.scanner_corrections(user_id,created_at desc);
create index scanner_corrections_observation on public.scanner_corrections(observation_id,user_id);
create index scanner_corrections_part on public.scanner_corrections(proposed_part_id);
create table e34_private.scanner_correction_reviews(
 correction_id uuid primary key references public.scanner_corrections on delete cascade,reviewer uuid not null references auth.users,
 decision text not null check(decision in ('reviewed','needs_evidence','rejected')),reason text not null check(length(btrim(reason))between 10 and 2000),reviewed_at timestamptz not null default now()
);
alter table e34_private.scanner_correction_reviews enable row level security;
revoke all on e34_private.scanner_correction_reviews from public,anon,authenticated;
create table public.repair_operation_plans(
 id text primary key,guide_id text not null,revision text not null,content jsonb not null check(jsonb_typeof(content)='object'),
 foreign key(guide_id,revision)references public.guide_revision_archive(guide_id,revision)
);
create index repair_plan_guide on public.repair_operation_plans(guide_id,revision);
create trigger repair_plan_immutable before update or delete on public.repair_operation_plans for each row execute function e34_private.immutable_guide_snapshot();
alter table public.guide_progress add unique(id,user_id);
alter table public.guide_progress add column repair_plan_id text references public.repair_operation_plans,
 add column operation_ids text[] not null default '{}' check(cardinality(operation_ids)<=100),
 add column scan_id uuid,add column configuration_revision uuid,
 add column service_record_id uuid references public.service_records on delete set null,
 add column journal_entry_id uuid references public.owner_journal_entries on delete set null,
 add foreign key(scan_id,user_id,vehicle_id)references public.component_observations(id,user_id,vehicle_id)on delete set null(scan_id),
 add foreign key(configuration_revision,user_id,vehicle_id)references public.vehicle_configuration_revisions(id,user_id,vehicle_id),
 add check((scan_id is null and configuration_revision is null)or vehicle_id is not null);
create index progress_repair_plan on public.guide_progress(repair_plan_id);
create index progress_scan on public.guide_progress(scan_id,user_id,vehicle_id);
create index progress_configuration on public.guide_progress(configuration_revision,user_id,vehicle_id);
create index progress_service on public.guide_progress(service_record_id);
create index progress_journal on public.guide_progress(journal_entry_id);
create table public.repair_parts_used(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid()references auth.users on delete cascade,progress_id uuid not null,
 part_id text not null references public.parts,quantity integer not null check(quantity between 1 and 1000),notes text not null default ''check(length(notes)<=1000),
 foreign key(progress_id,user_id)references public.guide_progress(id,user_id)on delete cascade
);
create index repair_parts_owner on public.repair_parts_used(user_id,progress_id);
create index repair_parts_part on public.repair_parts_used(part_id);
create table public.completed_repair_runs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,vehicle_id uuid not null,
 progress_id uuid not null,plan_id text not null references public.repair_operation_plans,guide_id text not null,guide_revision text not null,
 configuration_revision uuid,scan_id uuid,service_record_id uuid references public.service_records on delete set null,journal_entry_id uuid references public.owner_journal_entries on delete set null,
 parts_used jsonb not null,completed_at timestamptz not null default now(),
 foreign key(progress_id,user_id)references public.guide_progress(id,user_id)on delete cascade,
 foreign key(vehicle_id,user_id)references public.owned_vehicles(id,user_id)on delete cascade,
 foreign key(configuration_revision,user_id,vehicle_id)references public.vehicle_configuration_revisions(id,user_id,vehicle_id),
 foreign key(scan_id,user_id,vehicle_id)references public.component_observations(id,user_id,vehicle_id)on delete set null(scan_id),
 foreign key(guide_id,guide_revision)references public.guide_revision_archive
);
create index repair_runs_owner on public.completed_repair_runs(user_id,vehicle_id,completed_at desc);
create index repair_runs_progress on public.completed_repair_runs(progress_id,user_id);
create index repair_runs_plan on public.completed_repair_runs(plan_id);
create index repair_runs_configuration on public.completed_repair_runs(configuration_revision,user_id,vehicle_id);
create index repair_runs_scan on public.completed_repair_runs(scan_id,user_id,vehicle_id);
create index repair_runs_service on public.completed_repair_runs(service_record_id);
create index repair_runs_journal on public.completed_repair_runs(journal_entry_id);
create index repair_runs_guide on public.completed_repair_runs(guide_id,guide_revision);
alter table public.completed_repair_runs enable row level security;
revoke all on public.completed_repair_runs from public,anon,authenticated;
grant select,delete on public.completed_repair_runs to authenticated;
create policy runs_read on public.completed_repair_runs for select to authenticated using(user_id=(select auth.uid()));
create policy runs_delete on public.completed_repair_runs for delete to authenticated using(user_id=(select auth.uid()));
-- Explicit owner policies. No client inserts into trusted model/plan registries or revision snapshots.
do $$declare t text;begin
 foreach t in array array['vehicle_configuration_evidence','vehicle_configuration_revisions','component_observations','scanner_corrections','repair_parts_used']loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,delete on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using(user_id=(select auth.uid()))',t);
 end loop;
 foreach t in array array['vehicle_configuration_evidence','component_observations','scanner_corrections','repair_parts_used']loop
 execute format('grant insert on public.%I to authenticated',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check(user_id=(select auth.uid()))',t);
 end loop;
 foreach t in array array['scanner_model_versions','repair_operation_plans']loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to anon,authenticated',t);
 execute format('create policy public_read on public.%I for select to anon,authenticated using(true)',t);
 end loop;
end$$;
-- Keep evidence append-only. Deleting an entire account/car still cascades.
create function e34_private.guard_scanner_record()returns trigger language plpgsql set search_path=''as $$
declare maximum integer;over_limit boolean;begin
 if new.user_id is distinct from auth.uid() then raise exception 'Owner session required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,98234));
 maximum:=case tg_table_name when 'component_observations'then 200 when 'vehicle_configuration_evidence'then 1000 when 'scanner_corrections'then 100 else 500 end;
 if tg_table_name='component_observations' then
  if exists(select 1 from jsonb_object_keys(new.evidence)k where k not in('models','markings','method','timings','candidate_nodes','geometry_status'))then raise exception 'Unsupported evidence field';end if;
  if jsonb_typeof(coalesce(new.evidence->'markings','[]'))<>'array' or jsonb_array_length(coalesce(new.evidence->'markings','[]'))>12 or exists(select 1 from jsonb_array_elements_text(coalesce(new.evidence->'markings','[]'))m where m !~ '^\d{11}$')then raise exception 'Only complete part markings may be saved';end if;
  if new.configuration_revision is not null and not exists(select 1 from public.vehicle_configuration_revisions r join public.owned_vehicles v on(v.id,v.user_id)=(r.vehicle_id,r.user_id)where r.id=new.configuration_revision and r.configuration=v.configuration)then raise exception 'Configuration changed. Save its current revision before scanning';end if;
  if length(coalesce(new.evidence->'models','[]')::text)>1500 or length(coalesce(new.evidence->'timings','{}')::text)>500 then raise exception 'Evidence too large';end if;
 end if;
 execute format('select count(*) >= $1 from public.%I where user_id=$2',tg_table_name)into strict over_limit using maximum,new.user_id;
 if over_limit then raise exception 'Private record limit reached. Delete old records first.';end if;return new;
end$$;
-- The trigger helper is private, uses invoker RLS, never bypasses ownership.
revoke all on function e34_private.guard_scanner_record()from public,anon,authenticated;
do $$declare t text;begin foreach t in array array['vehicle_configuration_evidence','component_observations','scanner_corrections','repair_parts_used']loop execute format('create trigger scanner_record_guard before insert on public.%I for each row execute function e34_private.guard_scanner_record()',t);end loop;end$$;
create function e34_private.save_vehicle_configuration(car uuid,expected_revision integer,selected jsonb)returns public.vehicle_configuration_revisions language plpgsql security definer set search_path=''as $$
declare current_config jsonb;base_model text;latest integer;r public.vehicle_configuration_revisions;item record;e public.vehicle_configuration_evidence;begin
 if auth.uid()is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,98234));
 if (select count(*)from public.vehicle_configuration_revisions where user_id=auth.uid())>=1000 then raise exception 'Configuration revision limit reached';end if;
 select configuration,model_id into current_config,base_model from public.owned_vehicles where id=car and user_id=auth.uid() for update;
 if not found then raise exception 'Vehicle unavailable';end if;
 select coalesce(max(revision),0)into latest from public.vehicle_configuration_revisions where vehicle_id=car;
 if latest<>expected_revision then raise exception 'Configuration changed. Reload before saving.';end if;
 if jsonb_typeof(selected)<>'object' or octet_length(selected::text)>4000 then raise exception 'Invalid selection';end if;
 for item in select *from jsonb_each_text(selected)loop
  if item.key not in('manufacturer','platform','model','year','month','market','body','engine','transmission','drivetrain','steering','options')then raise exception 'Unknown attribute';end if;
  select *into e from public.vehicle_configuration_evidence where id=item.value::uuid and vehicle_id=car and user_id=auth.uid();
  if not found then raise exception 'Evidence unavailable';end if;
  if e.attribute<>item.key then raise exception 'Evidence attribute mismatch';end if;
  current_config:=jsonb_set(current_config,array[item.key],to_jsonb(case when e.kind='unknown' then '' else e.value end));
 end loop;
 if not current_config ? 'model' or current_config->>'model'=''then current_config:=jsonb_set(current_config,'{model}',to_jsonb(base_model));end if;
 if not exists(select 1 from public.vehicle_models where id=current_config->>'model')then raise exception 'Choose a supported E34 model; a basic VIN model family is not a complete vehicle selection';end if;
 if coalesce(current_config->>'year','')<>''and(current_config->>'year' !~ '^\d{4}$' or (current_config->>'year')::integer not between 1987 and 1996)then raise exception 'Use an E34 production year from 1987 through 1996';end if;
 if coalesce(current_config->>'month','')<>''and(current_config->>'month' !~ '^\d{1,2}$' or (current_config->>'month')::integer not between 1 and 12)then raise exception 'Use a production month from 1 through 12';end if;
 insert into public.vehicle_configuration_revisions(user_id,vehicle_id,revision,selection,configuration)values(auth.uid(),car,latest+1,selected,current_config)returning *into r;
 update public.owned_vehicles set configuration=current_config,model_id=current_config->>'model' where id=car and user_id=auth.uid();return r;
end$$;
-- Only the narrow caller-owned function can append trusted revision snapshots.
revoke insert,delete on public.vehicle_configuration_revisions from authenticated;
revoke delete on public.vehicle_configuration_evidence from authenticated;
create function e34_private.guard_repair_progress()returns trigger language plpgsql set search_path=''as $$
declare p public.repair_operation_plans;o jsonb;begin
 if tg_op='UPDATE' and old.repair_plan_id is not null and new.repair_plan_id is distinct from old.repair_plan_id then raise exception 'Pinned repair plan is immutable';end if;
 if new.service_record_id is not null and not exists(select 1 from public.service_records where id=new.service_record_id and user_id=new.user_id and vehicle_id=new.vehicle_id)then raise exception 'Service record ownership mismatch';end if;
 if new.journal_entry_id is not null and not exists(select 1 from public.owner_journal_entries where id=new.journal_entry_id and user_id=new.user_id and vehicle_id=new.vehicle_id)then raise exception 'Journal ownership mismatch';end if;
 if new.repair_plan_id is null then if cardinality(new.operation_ids)>0 then raise exception 'Repair plan required';end if;return new;end if;
 select *into p from public.repair_operation_plans where id=new.repair_plan_id and guide_id=new.guide_id and revision=new.revision;
 if not found then raise exception 'Plan and guide revision mismatch';end if;
 if tg_op='UPDATE' and old.repair_plan_id is not null and new.repair_plan_id<>old.repair_plan_id then raise exception 'Pinned repair plan is immutable';end if;
 if cardinality(new.operation_ids)<>(select count(distinct n)from unnest(new.operation_ids)n)then raise exception 'Duplicate operation';end if;
 if exists(select 1 from unnest(new.operation_ids)n where not exists(select 1 from jsonb_array_elements(p.content->'operations')entry where entry->>'id'=n))then raise exception 'Unknown operation';end if;
 for o in select value from jsonb_array_elements(p.content->'operations')loop
 if o->>'id'=any(new.operation_ids)and exists(select 1 from jsonb_array_elements_text(o->'requires')r where not r=any(new.operation_ids))then raise exception 'Complete preceding operations first';end if;
 end loop;return new;
end$$;
revoke all on function e34_private.guard_repair_progress()from public,anon,authenticated;
create trigger repair_progress_guard before insert or update on public.guide_progress for each row execute function e34_private.guard_repair_progress();
create function e34_private.complete_interactive_repair(progress uuid,expected_version integer,observation text)returns uuid language plpgsql security definer set search_path=''as $$
declare g public.guide_progress;p public.repair_operation_plans;s uuid;j uuid;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,98234));
 select *into g from public.guide_progress where id=progress and user_id=auth.uid()for update;
 if g.id is null or g.vehicle_id is null then raise exception 'Choose your owned vehicle first';end if;
 if g.content_version<>expected_version then raise exception 'Repair changed. Reload before saving.';end if;
 if g.service_record_id is not null then return g.service_record_id;end if;
 if (select count(*)from public.completed_repair_runs where user_id=auth.uid())>=50 then raise exception 'Completed repair history limit reached';end if;
 if not exists(select 1 from public.owned_vehicles where id=g.vehicle_id and user_id=auth.uid()and model_id='525i'and configuration->>'engine' in('M50','M50TU'))then raise exception 'Confirm the installed M50/M50TU 525i configuration before saving this repair';end if;
 select *into p from public.repair_operation_plans where id=g.repair_plan_id;
 if p.id is null or cardinality(g.operation_ids)<>jsonb_array_length(p.content->'operations')then raise exception 'Complete the full repair checklist first';end if;
 if length(btrim(observation))not between 20 and 3000 then raise exception 'Describe the actual outcome in 20–3000 characters';end if;
 insert into public.service_records(user_id,vehicle_id,title,performed_on,notes)values(auth.uid(),g.vehicle_id,'M50 coolant-pump repair',current_date,observation||E'\nGuide: '||g.guide_id||' / '||g.revision||'; plan: '||p.id)returning id into s;
 insert into public.owner_journal_entries(user_id,vehicle_id,title,body,stage,guide_id,guide_revision,guide_step)values(auth.uid(),g.vehicle_id,'M50 coolant-pump repair',observation,'completed',g.guide_id,g.revision,5)returning id into j;
 insert into public.completed_repair_runs(user_id,vehicle_id,progress_id,plan_id,guide_id,guide_revision,configuration_revision,scan_id,service_record_id,journal_entry_id,parts_used)
 values(auth.uid(),g.vehicle_id,g.id,p.id,g.guide_id,g.revision,g.configuration_revision,g.scan_id,s,j,coalesce((select jsonb_agg(jsonb_build_object('part_id',part_id,'quantity',quantity,'notes',notes))from public.repair_parts_used where progress_id=g.id and user_id=auth.uid()),'[]'));
 update public.guide_progress set service_record_id=s,journal_entry_id=j where id=g.id;return s;
end$$;
create function public.scanner_runtime_config()returns jsonb language sql stable security definer set search_path=''as $$select jsonb_build_object('visual_available',e34_private.commercial_admin(),'public_visual_enabled',false,'exact_visual_verified',false);$$;
create function public.scanner_correction_queue()returns jsonb language plpgsql stable security definer set search_path=''as $$begin
 if not e34_private.commercial_admin()then raise exception 'Administrator and MFA required'using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(q))from(select c.id,c.proposed_part_id,c.reason,c.created_at,o.part_id,o.node_id,r.decision from public.scanner_corrections c join public.component_observations o on o.id=c.observation_id left join e34_private.scanner_correction_reviews r on r.correction_id=c.id order by c.created_at desc limit 100)q),'[]'::jsonb);end$$;
create function public.review_scanner_correction(correction uuid,decision text,reason text)returns void language plpgsql security definer set search_path=''as $$begin
 if not e34_private.commercial_admin()then raise exception 'Administrator and MFA required'using errcode='42501';end if;
 insert into e34_private.scanner_correction_reviews(correction_id,reviewer,decision,reason)values(correction,auth.uid(),decision,reason)on conflict(correction_id)do update set reviewer=excluded.reviewer,decision=excluded.decision,reason=excluded.reason,reviewed_at=now();
 insert into e34_private.audit_events(actor_id,action,table_name,record_id)values(auth.uid(),'scanner:review','scanner_corrections',correction::text);end$$;
create function public.save_vehicle_configuration(car uuid,expected_revision integer,selected jsonb)returns public.vehicle_configuration_revisions language sql security invoker set search_path=''as $$select e34_private.save_vehicle_configuration(car,expected_revision,selected);$$;
revoke all on function e34_private.save_vehicle_configuration(uuid,integer,jsonb)from public,anon,authenticated;
grant execute on function e34_private.save_vehicle_configuration(uuid,integer,jsonb)to authenticated;
create function public.complete_interactive_repair(progress uuid,expected_version integer,observation text)returns uuid language sql security invoker set search_path=''as $$select e34_private.complete_interactive_repair(progress,expected_version,observation);$$;
revoke all on function public.save_vehicle_configuration(uuid,integer,jsonb),public.complete_interactive_repair(uuid,integer,text),public.scanner_runtime_config(),public.scanner_correction_queue(),public.review_scanner_correction(uuid,text,text)from public,anon,authenticated;
grant execute on function public.save_vehicle_configuration(uuid,integer,jsonb),public.complete_interactive_repair(uuid,integer,text),public.scanner_correction_queue(),public.review_scanner_correction(uuid,text,text)to authenticated;
grant execute on function public.scanner_runtime_config()to anon,authenticated;

insert into public.guide_revision_archive(guide_id,revision,content)values('m50-water-pump-job-planning','5c458d5b100cc7b4c5c2b469','{"slug": "m50-water-pump-job-planning", "title": "Plan an M50 coolant-pump job", "system": "cooling", "engines": ["M50", "M50TU"], "level": "Intermediate", "duration": "10 min planning", "durationBasis": "Editorial reading or inspection estimate; not a factory labor time", "kind": "planning", "summary": "Check the parts and bleed procedure first, then follow the source-checked mechanical sequence for fan access, pump extraction, seal installation and even tightening.", "reviewStatus": "draft", "sourceChecked": true, "applicability": "U.S. 1991\u201395 E34 525i with an installed M50 or M50TU, the four-stud pump and the matching belt and cooling hardware. Check any replacement or modified hardware against its own instructions.", "source": {"id": "bentley-e34-upload", "title": "BMW 5 Series (E34) Service Manual", "section": "170-8\u2013170-9, Figs. 12\u201313; 170-12; 020-13", "pdfPages": [35, 212, 213, 216]}, "tools": ["Applicable cooling fill and bleed procedure", "Fan wrench and pulley holder", "Two matching M6 extraction bolts", "New pump and seal, low-range torque wrench and coolant containment"], "cautions": ["Do not open or drain a hot cooling system.", "The fan-clutch attachment uses a left-hand thread; consult the proper removal procedure before applying force.", "Installation loads, tightening specifications, coolant choice and bleeding must be verified for the actual vehicle and replacement parts."], "steps": [{"title": "Confirm the M50 application", "body": "Check the installed engine identity and review the M50-specific pump procedure rather than borrowing the M20, M30 or M60 steps.", "check": "The engine and any modification are recorded."}, {"title": "Plan access before draining", "body": "Confirm the fill and bleed procedure for the installed reservoir before opening the system. On a cold engine, isolate the battery and drain into a suitable container. Remove the fan and shroud with the source-specific holding method. Move the documented thermostat housing hoses, loosen the pump pulley hardware, and remove the belt and pulley using the matched tensioner procedure.", "check": "The work can proceed safely without improvising a missing holding or access tool."}, {"title": "Extract the old pump squarely", "body": "Match the replacement and seal to the actual housing. Remove the four pump retaining nuts. Thread two matching M6 bolts into the opposed extraction ears shown in Fig. 13 and advance them evenly until the pump releases. Stop for damaged threads or an uneven release. Keep tools clear of the mating bore.", "check": "The pump comes out squarely and the studs and sealing bore are undamaged."}, {"title": "Fit the new seal and tighten evenly", "body": "Clean the mating bore, fit a new seal and use only a seal-compatible assembly lubricant specified for the installed pump. Locate the pump squarely over the studs and tighten the four nuts alternately and evenly. Bentley lists 10 Nm for the factory pump-to-cover nuts and 10 Nm for the pump pulley fasteners. Confirm these values for the actual hardware.", "check": "The seal is seated without pinching, the pump is flush and the applied torques are recorded."}, {"title": "Restore the cooling system and verify", "body": "Restore the pulley, belt, hoses, fan and shroud, then check routing and clearance. Follow the verified fill and bleed procedure for the installed cooling system before running the engine. Include a leak check, controlled temperature check and a final cold-level recheck. Stop for an unknown cap or bleed sequence, leakage or abnormal temperature.", "check": "The job checklist includes completion verification rather than ending when the new part is installed."}]}'::jsonb)on conflict do nothing;
insert into public.guide_step_index(guide_id,revision,step_number,title)values('m50-water-pump-job-planning','5c458d5b100cc7b4c5c2b469',1,'Confirm the M50 application')on conflict do nothing;
insert into public.guide_step_index(guide_id,revision,step_number,title)values('m50-water-pump-job-planning','5c458d5b100cc7b4c5c2b469',2,'Plan access before draining')on conflict do nothing;
insert into public.guide_step_index(guide_id,revision,step_number,title)values('m50-water-pump-job-planning','5c458d5b100cc7b4c5c2b469',3,'Extract the old pump squarely')on conflict do nothing;
insert into public.guide_step_index(guide_id,revision,step_number,title)values('m50-water-pump-job-planning','5c458d5b100cc7b4c5c2b469',4,'Fit the new seal and tighten evenly')on conflict do nothing;
insert into public.guide_step_index(guide_id,revision,step_number,title)values('m50-water-pump-job-planning','5c458d5b100cc7b4c5c2b469',5,'Restore the cooling system and verify')on conflict do nothing;
insert into public.repair_operation_plans(id,guide_id,revision,content)values('m50-coolant-pump-r1','m50-water-pump-job-planning','5c458d5b100cc7b4c5c2b469','{"id": "m50-coolant-pump-r1", "guide": "m50-water-pump-job-planning", "revision": "5c458d5b100cc7b4c5c2b469", "geometry": "illustrative", "operations": [{"id": "identify", "title": "Confirm the installed hardware", "step": 0, "requires": [], "nodes": ["m50:water-pump"], "action": "inspect", "instruction": "Confirm the installed M50/M50TU engine, four-stud pump, tensioner and cooling hardware. Review the matching fill/bleed instructions before starting.", "source": "170-8\u2013170-9; 170-12; 020-13", "tools": ["Matching source procedure"]}, {"id": "cold-drain", "title": "Make the cooling system safe", "step": 1, "requires": ["identify"], "nodes": ["m50:water-pump"], "action": "verify", "instruction": "Engine cold, ignition off. Isolate the battery and drain into suitable containment using the matched procedure. Never open a hot cooling system.", "source": "170-8; 170-12", "tools": ["Coolant containment", "Battery isolation tools"]}, {"id": "fan-shroud", "title": "Remove fan and shroud", "step": 1, "requires": ["cold-drain"], "nodes": ["e34sys:engine-cooling-fan", "e34sys:fan-shroud"], "action": "remove", "instruction": "Use the source-specific holding method and fan/shroud procedure. The fan-clutch attachment has a left-hand thread. Do not treat this visual separation as a clearance-verified removal path.", "source": "170-8; fan access reference", "tools": ["Fan wrench", "Pulley holder"]}, {"id": "hoses", "title": "Move the documented hoses for access", "step": 1, "requires": ["fan-shroud"], "nodes": ["m50:water-pump"], "action": "inspect", "instruction": "Move only the thermostat housing hoses specified by the matched pump procedure. Record the hose route and retain the correct sealing hardware.", "source": "170-8", "tools": ["Appropriate hose tools"]}, {"id": "loosen-pulley", "title": "Loosen pump-pulley fasteners", "step": 1, "requires": ["hoses"], "nodes": ["m50:pulley:water-pump"], "action": "inspect", "instruction": "Loosen the pump pulley hardware before releasing the belt, using the matched holding and tensioner procedure.", "source": "170-8; 020-13", "tools": ["Matching sockets", "Pulley holder"]}, {"id": "belt", "title": "Remove the accessory belt", "step": 1, "requires": ["loosen-pulley"], "nodes": ["m50:accessory-belt"], "action": "remove", "instruction": "Use the procedure for the installed tensioner. Record belt routing before removing the belt.", "source": "020-13; 170-8", "tools": ["Matched tensioner tool"]}, {"id": "pulley", "title": "Remove the pump pulley", "step": 1, "requires": ["belt"], "nodes": ["m50:pulley:water-pump"], "action": "remove", "instruction": "Remove the loosened pulley hardware and pump pulley. Keep the hardware identified.", "source": "170-8", "tools": ["Matching sockets"]}, {"id": "nuts", "title": "Remove the four retaining nuts", "step": 2, "requires": ["pulley"], "nodes": ["m50:pump-nut:-1:-1", "m50:pump-nut:-1:1", "m50:pump-nut:1:-1", "m50:pump-nut:1:1"], "action": "remove", "instruction": "Check the replacement against the actual pump and housing, then remove the four pump retaining nuts.", "source": "170-8, Fig. 13", "tools": ["Matching socket"]}, {"id": "pump", "title": "Extract the pump squarely", "step": 2, "requires": ["nuts"], "nodes": ["m50:water-pump", "m50:water-pump-impeller"], "action": "remove", "instruction": "Thread matching M6 extraction bolts into the opposed ears in Fig. 13 and advance evenly. Stop for damaged threads or uneven release; protect the sealing bore.", "source": "170-8, Fig. 13", "tools": ["Two matching M6 extraction bolts"]}, {"id": "inspect", "title": "Inspect the bore and sealing surfaces", "step": 3, "requires": ["pump"], "nodes": ["m50:water-pump"], "action": "inspect", "instruction": "Inspect studs, bore and sealing surfaces for damage. Clean the mating bore without damaging it. Renew the seal; verify the installed pump instructions.", "source": "170-8\u2013170-9", "tools": ["Inspection light", "Suitable cleaning materials"]}, {"id": "new-pump", "title": "Fit the seal and seat the pump", "step": 3, "requires": ["inspect"], "nodes": ["m50:water-pump", "m50:water-pump-impeller"], "action": "install", "instruction": "Fit a new seal with only the specified seal-compatible assembly lubricant. Locate the pump squarely over the studs; do not pinch the seal.", "source": "170-8\u2013170-9", "tools": ["Correct new pump and seal"]}, {"id": "tighten-nuts", "title": "Tighten retaining nuts evenly", "step": 3, "requires": ["new-pump"], "nodes": ["m50:pump-nut:-1:-1", "m50:pump-nut:-1:1", "m50:pump-nut:1:-1", "m50:pump-nut:1:1"], "action": "install", "instruction": "Tighten alternately and evenly. Confirm the factory specification against the actual replacement hardware before applying it.", "source": "170-9, pump tightening specifications", "tools": ["Low-range torque wrench"], "torque": {"nm": 10, "scope": "Factory pump-to-cover retaining nuts; verify actual hardware"}}, {"id": "restore-pulley", "title": "Refit the pump pulley", "step": 4, "requires": ["tighten-nuts"], "nodes": ["m50:pulley:water-pump"], "action": "install", "instruction": "Restore the pulley and its fasteners using the matched holding method. Confirm the specification for the actual hardware.", "source": "170-9, pulley tightening specifications", "tools": ["Low-range torque wrench", "Pulley holder"], "torque": {"nm": 10, "scope": "Factory pump pulley fasteners; verify actual hardware"}}, {"id": "restore-belt", "title": "Restore belt routing and tension", "step": 4, "requires": ["restore-pulley"], "nodes": ["m50:accessory-belt"], "action": "install", "instruction": "Restore the documented belt route and tensioner configuration. Inspect seating and clearance before running.", "source": "020-13; 170-9", "tools": ["Matched tensioner tool"]}, {"id": "restore-access", "title": "Restore hoses, fan and shroud", "step": 4, "requires": ["restore-belt"], "nodes": ["e34sys:engine-cooling-fan", "e34sys:fan-shroud"], "action": "install", "instruction": "Restore the documented hoses, fan and shroud. Check connections, routing and clearance.", "source": "170-9", "tools": ["Matched fan holding tools", "Hose tools"]}, {"id": "fill-bleed", "title": "Fill and bleed the matched cooling system", "step": 4, "requires": ["restore-access"], "nodes": ["m50:water-pump"], "action": "verify", "instruction": "Use the verified fill and bleed procedure for the installed cooling system before running. Stop if the cap, reservoir or bleed sequence is unknown.", "source": "170-12", "tools": ["Correct coolant", "Matched fill/bleed procedure"]}, {"id": "final-check", "title": "Verify the completed repair", "step": 4, "requires": ["fill-bleed"], "nodes": ["m50:water-pump"], "action": "verify", "instruction": "Perform the controlled leak and temperature checks in the matched procedure, then a final cold-level recheck. Stop for leaks or abnormal temperature.", "source": "170-9; 170-12", "tools": ["Inspection light", "Recorded observations"]}]}'::jsonb);
insert into public.scanner_model_versions(id,revision,task,license,source_url,validation_status)values('Xenova/owlvit-base-patch32','b75f4e52949639c3bb0b96546ea4149482f6e7ef','zero-shot-object-detection','Apache-2.0','https://huggingface.co/google/owlvit-base-patch32','experimental');
insert into public.scanner_model_versions(id,revision,task,license,source_url,validation_status)values('Xenova/clip-vit-base-patch32','6b7c523703ae26e39be4b03774966f8571c7f523','image-feature-extraction','MIT','https://huggingface.co/Xenova/clip-vit-base-patch32','experimental');
insert into public.scanner_model_versions(id,revision,task,license,source_url,validation_status)values('tesseract.js','7.0.0','ocr','Apache-2.0','https://github.com/naptha/tesseract.js','experimental');

revoke all on function e34_private.complete_interactive_repair(uuid,integer,text),public.complete_interactive_repair(uuid,integer,text)from public,anon,authenticated;
grant execute on function e34_private.complete_interactive_repair(uuid,integer,text),public.complete_interactive_repair(uuid,integer,text)to authenticated;
create function public.start_next_interactive_repair(progress uuid,expected_version integer)returns void language plpgsql security invoker set search_path=''as $$
declare g public.guide_progress;begin
 select *into g from public.guide_progress where id=progress and user_id=auth.uid()for update;
 if g.id is null or g.content_version<>expected_version or g.service_record_id is null then raise exception 'Reload the completed repair before starting another';end if;
 delete from public.repair_parts_used where progress_id=g.id and user_id=auth.uid();
 update public.guide_progress set operation_ids='{}',completed_steps='{}',scan_id=null,configuration_revision=null,service_record_id=null,journal_entry_id=null where id=g.id;
end$$;
revoke all on function public.start_next_interactive_repair(uuid,integer)from public,anon,authenticated;
grant execute on function public.start_next_interactive_repair(uuid,integer)to authenticated;

-- Preserve the existing collector and protections, extending only safe scanner event names.
-- Additive response for expired browser-page sessions; preserve roles and immutable history.
create or replace function public.analytics_ingest(browser_id uuid,batch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg e34_private.analytics_config; visitor_hash text; sess uuid; e jsonb; page_row e34_private.analytics_pages; n integer:=0; t timestamptz; present integer; expired boolean:=false; day_count integer; v_count integer; today date:=(clock_timestamp() at time zone 'UTC')::date;
begin
 if jsonb_typeof(batch)<>'object' or jsonb_typeof(batch->'events')<>'array' or jsonb_array_length(batch->'events') not between 1 and 20 or (batch->>'revision')::integer<>2 or batch->'consent'->>'traffic' is distinct from 'true' then raise exception 'Invalid analytics envelope';end if;
 perform pg_advisory_xact_lock(73400234);
 select * into cfg from e34_private.analytics_config where singleton;
 if not cfg.enabled then return jsonb_build_object('accepted',0,'status','disabled');end if;
 visitor_hash:=encode(extensions.hmac(browser_id::text,cfg.hash_key,'sha256'),'hex');
 if exists(select 1 from e34_private.analytics_erased where id=visitor_hash and expires_at>clock_timestamp())then return jsonb_build_object('accepted',0,'status','erased');end if;
 select coalesce(accepted,0) into day_count from e34_private.analytics_quality where day=today;
 select count(*) into v_count from e34_private.analytics_events e join e34_private.analytics_pages p on p.id=e.page join e34_private.analytics_sessions s on s.id=p.session_id where s.visitor=visitor_hash and e.received_at>clock_timestamp()-interval '1 hour';
 if coalesce(day_count,0)+jsonb_array_length(batch->'events')>5000 or v_count+jsonb_array_length(batch->'events')>240 or (select count(*) from e34_private.analytics_erased)>=10000 or (select count(*) from e34_private.analytics_events)>=100000 or pg_database_size(current_database())>=471859200 then
  insert into e34_private.analytics_quality(day,dropped)values(today,jsonb_array_length(batch->'events'))on conflict(day)do update set dropped=least(1000000,analytics_quality.dropped+excluded.dropped);
  return jsonb_build_object('accepted',0,'status','limited');
 end if;
 insert into e34_private.analytics_visitors values(visitor_hash,clock_timestamp(),clock_timestamp())on conflict(id)do update set last_seen=excluded.last_seen;
 select id into sess from e34_private.analytics_sessions where visitor=visitor_hash and last_seen>clock_timestamp()-interval '30 minutes' and started_at>clock_timestamp()-interval '4 hours' order by last_seen desc limit 1;
 for e in select value from jsonb_array_elements(batch->'events')loop
  if (e->>'v')::integer<>1 or e->>'name' not in ('page_view','link_open','search','search_result','component_select','assembly_view','explode','isolate','guide_step','guide_save','diagnostic_step','diagnostic_complete','model_loaded','model_error','render_error','web_vital','js_error','asset_error','api_error','engagement','scanner_open','scanner_permission','scanner_capture','scanner_inference','scanner_result','scanner_confirm','scanner_reject','scanner_error','scanner_followup') or (e->>'seq')::integer not between 0 and 10000 then raise exception 'Invalid event';end if;
  if exists(select 1 from jsonb_object_keys(e)k where k not in ('v','id','page','name','resource','target','at','seq','search_id','topic','results','value','metric','model','code')) then raise exception 'Unexpected event property';end if;
  if (e->>'name' in ('search','search_result') and batch->'consent'->>'search'<>'true') or (e->>'name' in ('web_vital','js_error','asset_error','api_error','model_error','render_error','model_loaded','scanner_inference','scanner_error') and batch->'consent'->>'performance'<>'true') then raise exception 'Missing consent';end if;
  if not e34_private.analytics_resource_valid(e->>'resource') or not e34_private.analytics_resource_valid(e->>'target') then raise exception 'Unknown public reference';end if;
  if length(e->>'topic')>120 or (e->>'topic') ~ '[^a-z0-9 ]' or coalesce((e->>'results')::integer,0) not between 0 and 10000 or coalesce((e->>'value')::numeric,0) not between 0 and 300000 then raise exception 'Invalid measurement';end if;
  if e->>'name'='search_result' and not exists(select 1 from e34_private.analytics_events se join e34_private.analytics_pages sp on sp.id=se.page join e34_private.analytics_sessions ss on ss.id=sp.session_id where se.name='search' and se.search_id=(e->>'search_id')::uuid and ss.visitor=visitor_hash and ss.id=sess)then continue;end if;
  t:=to_timestamp((e->>'at')::numeric/1000);
  if t<clock_timestamp()-interval '5 minutes' or t>clock_timestamp()+interval '1 minute' then raise exception 'Stale event';end if;
  if exists(select 1 from e34_private.analytics_events where id=(e->>'id')::uuid) then continue;end if;
  select * into page_row from e34_private.analytics_pages where id=(e->>'page')::uuid;
  if found then
   if not exists(select 1 from e34_private.analytics_sessions where id=page_row.session_id and visitor=visitor_hash) then raise exception 'Page owner mismatch';end if;
   -- Expired pages cannot extend an old session indefinitely.
   if not exists(select 1 from e34_private.analytics_sessions where id=page_row.session_id and last_seen>clock_timestamp()-interval '30 minutes' and started_at>clock_timestamp()-interval '4 hours') then expired:=true;continue;end if;
   if e->>'name'='page_view' then
    update e34_private.analytics_sessions set last_seen=clock_timestamp()where id=page_row.session_id;continue;end if;
  else
   if e->>'name'<>'page_view' or not exists(select 1 from e34_private.analytics_resources where id=e->>'resource' and kind in ('page','guide','manual','model','article','quick')) then continue;end if;
   if sess is null then
    insert into e34_private.analytics_sessions(visitor,started_at,last_seen,device,browser,referrer,campaign)values(visitor_hash,t,clock_timestamp(),case when batch->>'device' in ('mobile','tablet','desktop')then batch->>'device' else 'other' end,case when batch->>'browser' in ('Chrome','Safari','Firefox','Edge')then batch->>'browser' else 'Other' end,
     case when batch->>'referrer' ~ '^([a-z0-9-]+\.)+[a-z]{2,63}$' and length(batch->>'referrer')<=253 then batch->>'referrer' end,
     (select code from e34_private.analytics_campaigns where code=batch->>'campaign' and active))returning id into sess;
   end if;
   insert into e34_private.analytics_pages values((e->>'page')::uuid,sess,e->>'resource',t,(batch->'consent'->>'search')::boolean,(batch->'consent'->>'performance')::boolean) returning * into page_row;
  end if;
  insert into e34_private.analytics_events(id,page,name,resource,target,occurred_at,seq,search_id,topic,results,value,metric,model,code)
   values((e->>'id')::uuid,page_row.id,e->>'name',e->>'resource',e->>'target',t,(e->>'seq')::integer,(e->>'search_id')::uuid,e->>'topic',(e->>'results')::integer,(e->>'value')::numeric,e->>'metric',e->>'model',e->>'code')on conflict do nothing;
  get diagnostics present = row_count;
  if present>0 then n:=n+1;update e34_private.analytics_sessions set last_seen=clock_timestamp() where id=page_row.session_id;end if;
 end loop;
 -- First observation belongs to the earliest accepted public page, not the flush time.
 update e34_private.analytics_visitors v set first_seen=(select min(p.viewed_at)from e34_private.analytics_pages p join e34_private.analytics_sessions s on s.id=p.session_id where s.visitor=v.id)
 where v.id=visitor_hash and exists(select 1 from e34_private.analytics_sessions s join e34_private.analytics_pages p on p.session_id=s.id where s.visitor=v.id);
 -- Missing/expired page events cannot allocate an unbounded orphan identity registry.
 delete from e34_private.analytics_visitors v where v.id=visitor_hash and not exists(select 1 from e34_private.analytics_sessions s join e34_private.analytics_pages p on p.session_id=s.id where s.visitor=v.id);
 insert into e34_private.analytics_quality(day,accepted)values(today,n)on conflict(day)do update set accepted=analytics_quality.accepted+excluded.accepted;
 return jsonb_build_object('accepted',n,'status',case when expired and n=0 then 'page_expired' else 'recorded' end);
end$$;
revoke all on function public.analytics_ingest(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.analytics_ingest(uuid,jsonb) to service_role;

insert into e34_private.analytics_resources(id,path,title,kind)values('/scanner','/scanner','Component identification','page')on conflict(id)do nothing;
