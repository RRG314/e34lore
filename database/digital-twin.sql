-- Metadata only: large geometry/source binaries are stored separately.
create table public.asset_licenses(id text primary key,name text not null,url text,redistribution text not null check(redistribution in ('allowed','restricted','unknown')),attribution text not null,conditions text not null default '',evidence jsonb not null default '[]');
create table public.asset_sources(id text primary key,source_id text references public.sources,license_id text not null references public.asset_licenses,url text check(url is null or url like 'https://%'),author text not null,identity text not null,source_sha256 text check(source_sha256 is null or source_sha256 ~ '^[a-f0-9]{64}$'),evidence jsonb not null default '{}');
create table public.three_d_assets(id text primary key,source_id text not null references public.asset_sources,name text not null,kind text not null check(kind in ('visual-reference','nominal-cad','measured-cad','scan','reconstruction')),publication_status text not null default 'draft' check(publication_status in ('draft','published','withdrawn')),notes text not null default '',created_at timestamptz not null default now());
create table public.geometry_revisions(id text primary key,asset_id text not null references public.three_d_assets,revision integer not null check(revision>0),format text not null check(format in ('glb','gltf','obj','fbx','stl','step','ply','point-cloud','procedural')),runtime_path text check(runtime_path is null or runtime_path ~ '^/models/[A-Za-z0-9_./-]+[.]glb$'),source_units text not null check(source_units in ('m','mm','unknown')),meters_per_unit numeric check(meters_per_unit>0),source_sha256 text check(source_sha256 is null or source_sha256 ~ '^[a-f0-9]{64}$'),accuracy jsonb not null,statistics jsonb not null default '{}',known_gaps jsonb not null default '[]',created_at timestamptz not null default now(),unique(asset_id,revision));
create table public.digital_twin_vehicles(id text primary key,model_id text not null references public.vehicle_models,name text not null,source_id text references public.sources);
create table public.digital_twin_configurations(id text primary key,vehicle_id text not null references public.digital_twin_vehicles,name text not null,reference_year integer check(reference_year between 1987 and 1997),engine_family text not null,engine_variant text,body text,market text,production_date date,notes jsonb not null default '[]');
create table public.digital_twin_configuration_revisions(id text primary key,configuration_id text not null references public.digital_twin_configurations,revision text not null,graph_id text not null,graph jsonb not null check(octet_length(graph::text)<=2000000),publication_status text not null default 'draft' check(publication_status in ('draft','published','withdrawn')),created_at timestamptz not null default now(),unique(configuration_id,revision),unique(id,configuration_id));
create table public.assembly_nodes(configuration_revision_id text not null references public.digital_twin_configuration_revisions,id text not null,parent_id text,name text not null,part_id text references public.parts,geometry_revision_id text references public.geometry_revisions,transform jsonb not null,accuracy jsonb not null,source_ids text[] not null default '{}',guide_ids text[] not null default '{}',missing_evidence jsonb not null default '[]',primary key(configuration_revision_id,id),foreign key(configuration_revision_id,parent_id) references public.assembly_nodes(configuration_revision_id,id) deferrable initially deferred,check(parent_id is distinct from id));
create table public.component_meshes(id text primary key,geometry_revision_id text not null references public.geometry_revisions,part_id text references public.parts,mesh_name text not null,local_transform jsonb not null,evidence jsonb not null default '[]',association_status text not null check(association_status in ('illustrative','source-checked','verified','disputed')));

create table public.assembly_relationships(id text primary key,configuration_revision_id text not null references public.digital_twin_configuration_revisions,from_node text not null,to_node text not null,kind text not null,reason text not null,evidence jsonb not null default '[]',review_state text not null default 'missing' check(review_state in ('missing','illustrative','source-checked','verified','disputed')));

alter table public.assembly_relationships add foreign key(configuration_revision_id,from_node) references public.assembly_nodes(configuration_revision_id,id);

alter table public.assembly_relationships add foreign key(configuration_revision_id,to_node) references public.assembly_nodes(configuration_revision_id,id);

create table public.mounting_points(id text primary key,configuration_revision_id text not null references public.digital_twin_configuration_revisions,node_id text not null,point jsonb,orientation jsonb,units text not null default 'unknown',evidence jsonb not null default '[]',review_state text not null default 'missing' check(review_state in ('missing','illustrative','source-checked','verified','disputed')));

alter table public.mounting_points add foreign key(configuration_revision_id,node_id) references public.assembly_nodes(configuration_revision_id,id);

create table public.fastener_connections(id text primary key,configuration_revision_id text not null references public.digital_twin_configuration_revisions,from_node text not null,to_node text not null,part_id text references public.parts,quantity integer check(quantity>0),connection_points jsonb not null default '[]',evidence jsonb not null default '[]',review_state text not null default 'missing' check(review_state in ('missing','illustrative','source-checked','verified','disputed')));

alter table public.fastener_connections add foreign key(configuration_revision_id,from_node) references public.assembly_nodes(configuration_revision_id,id);

alter table public.fastener_connections add foreign key(configuration_revision_id,to_node) references public.assembly_nodes(configuration_revision_id,id);

create table public.electrical_connections(id text primary key,configuration_revision_id text not null references public.digital_twin_configuration_revisions,from_node text not null,to_node text not null,connector_part_id text references public.parts,connection_points jsonb not null default '[]',evidence jsonb not null default '[]',review_state text not null default 'missing' check(review_state in ('missing','illustrative','source-checked','verified','disputed')));

alter table public.electrical_connections add foreign key(configuration_revision_id,from_node) references public.assembly_nodes(configuration_revision_id,id);

alter table public.electrical_connections add foreign key(configuration_revision_id,to_node) references public.assembly_nodes(configuration_revision_id,id);

create table public.fluid_connections(id text primary key,configuration_revision_id text not null references public.digital_twin_configuration_revisions,from_node text not null,to_node text not null,fluid text not null,connection_points jsonb not null default '[]',evidence jsonb not null default '[]',review_state text not null default 'missing' check(review_state in ('missing','illustrative','source-checked','verified','disputed')));

alter table public.fluid_connections add foreign key(configuration_revision_id,from_node) references public.assembly_nodes(configuration_revision_id,id);

alter table public.fluid_connections add foreign key(configuration_revision_id,to_node) references public.assembly_nodes(configuration_revision_id,id);

create table public.disassembly_dependencies(id text primary key,configuration_revision_id text not null references public.digital_twin_configuration_revisions,target_node text not null,prerequisite_node text not null,reason text not null,check(target_node<>prerequisite_node),evidence jsonb not null default '[]',review_state text not null default 'missing' check(review_state in ('missing','illustrative','source-checked','verified','disputed')));

alter table public.disassembly_dependencies add foreign key(configuration_revision_id,target_node) references public.assembly_nodes(configuration_revision_id,id);

alter table public.disassembly_dependencies add foreign key(configuration_revision_id,prerequisite_node) references public.assembly_nodes(configuration_revision_id,id);

create table public.removal_animations(id text primary key,configuration_revision_id text not null references public.digital_twin_configuration_revisions,node_id text not null,kind text not null check(kind in ('documented','illustrative')),path jsonb not null,units text not null default 'unknown',evidence jsonb not null default '[]',review_state text not null default 'missing' check(review_state in ('missing','illustrative','source-checked','verified','disputed')));

alter table public.removal_animations add foreign key(configuration_revision_id,node_id) references public.assembly_nodes(configuration_revision_id,id);

create table public.repair_scene_steps(id text primary key,configuration_revision_id text not null references public.digital_twin_configuration_revisions,guide_id text references public.guides,source_id text references public.sources,title text not null,node_ids text[] not null,required_removed text[] not null default '{}',step_index integer not null check(step_index>=0),check(guide_id is not null or source_id is not null),evidence jsonb not null default '[]',review_state text not null default 'missing' check(review_state in ('missing','illustrative','source-checked','verified','disputed')));

create table public.component_condition_examples(id text primary key,configuration_revision_id text not null references public.digital_twin_configuration_revisions,part_id text references public.parts,geometry_revision_id text references public.geometry_revisions,condition text not null,caption text not null,reference_url text,check(part_id is not null or geometry_revision_id is not null),evidence jsonb not null default '[]',review_state text not null default 'missing' check(review_state in ('missing','illustrative','source-checked','verified','disputed')));

create table public.geometry_measurements(id text primary key,geometry_revision_id text not null references public.geometry_revisions,name text not null,value numeric not null,unit text not null,tolerance numeric check(tolerance>=0),method text not null,evidence jsonb not null,independent_check boolean not null default false,review_state text not null default 'missing' check(review_state in ('missing','illustrative','source-checked','verified','disputed')));
create table public.accuracy_reviews(id uuid primary key default gen_random_uuid(),geometry_revision_id text references public.geometry_revisions,configuration_revision_id text references public.digital_twin_configuration_revisions,axis text not null check(axis in ('visual','dimensions','alignment','mechanical','removal')),decision text not null check(decision in ('illustrative','source-checked','verified','disputed')),method text not null check(char_length(method)>=10),evidence jsonb not null check(jsonb_typeof(evidence)='array' and jsonb_array_length(evidence)>0),reviewer_id uuid default auth.uid() references auth.users on delete set null,reviewed_at timestamptz not null default now(),discrepancies text not null default '',check(num_nonnulls(geometry_revision_id,configuration_revision_id)=1));
create table public.reconstruction_jobs(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,part_id text references public.parts,configuration_revision_id text references public.digital_twin_configuration_revisions,node_id text,method text not null check(method in ('licensed-cad','multiview','dimensioned-drawing','standard-parametric','manual-reconstruction')),status text not null default 'needs-evidence' check(status in ('needs-evidence','ready','processing','review','published','failed')),required_views jsonb not null default '[]',required_measurements jsonb not null default '[]',source_urls jsonb not null default '[]',notes text not null default '' check(char_length(notes)<=12000),created_at timestamptz not null default now(),unique(id,user_id),foreign key(configuration_revision_id,node_id) references public.assembly_nodes(configuration_revision_id,id),check(part_id is not null or node_id is not null));
create table public.reconstruction_evidence(id uuid primary key default gen_random_uuid(),job_id uuid not null,user_id uuid not null default auth.uid() references auth.users on delete cascade,source_url text not null check(source_url like 'https://%'),description text not null check(char_length(description) between 10 and 12000),rights_evidence text not null,created_at timestamptz not null default now(),foreign key(job_id,user_id) references public.reconstruction_jobs(id,user_id) on delete cascade);
create table public.user_workshop_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,configuration_id text not null references public.digital_twin_configurations,configuration_revision_id text not null,label text not null check(char_length(label) between 1 and 100),state jsonb not null check(octet_length(state::text)<=500000),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(configuration_revision_id,configuration_id) references public.digital_twin_configuration_revisions(id,configuration_id));

alter table public.asset_licenses enable row level security; revoke all on public.asset_licenses from public,anon,authenticated; grant select on public.asset_licenses to anon,authenticated; grant insert,update,delete on public.asset_licenses to authenticated;

create policy twin_public_read on public.asset_licenses for select to anon using(true); create policy twin_member_read on public.asset_licenses for select to authenticated using((true) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.asset_licenses for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.asset_sources enable row level security; revoke all on public.asset_sources from public,anon,authenticated; grant select on public.asset_sources to anon,authenticated; grant insert,update,delete on public.asset_sources to authenticated;

create policy twin_public_read on public.asset_sources for select to anon using(true); create policy twin_member_read on public.asset_sources for select to authenticated using((true) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.asset_sources for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.digital_twin_vehicles enable row level security; revoke all on public.digital_twin_vehicles from public,anon,authenticated; grant select on public.digital_twin_vehicles to anon,authenticated; grant insert,update,delete on public.digital_twin_vehicles to authenticated;

create policy twin_public_read on public.digital_twin_vehicles for select to anon using(true); create policy twin_member_read on public.digital_twin_vehicles for select to authenticated using((true) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.digital_twin_vehicles for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.digital_twin_configurations enable row level security; revoke all on public.digital_twin_configurations from public,anon,authenticated; grant select on public.digital_twin_configurations to anon,authenticated; grant insert,update,delete on public.digital_twin_configurations to authenticated;

create policy twin_public_read on public.digital_twin_configurations for select to anon using(true); create policy twin_member_read on public.digital_twin_configurations for select to authenticated using((true) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.digital_twin_configurations for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.three_d_assets enable row level security; revoke all on public.three_d_assets from public,anon,authenticated; grant select on public.three_d_assets to anon,authenticated; grant insert,update,delete on public.three_d_assets to authenticated;

create policy twin_public_read on public.three_d_assets for select to anon using(publication_status='published'); create policy twin_member_read on public.three_d_assets for select to authenticated using((publication_status='published') or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.three_d_assets for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.geometry_revisions enable row level security; revoke all on public.geometry_revisions from public,anon,authenticated; grant select on public.geometry_revisions to anon,authenticated; grant insert,update,delete on public.geometry_revisions to authenticated;

create policy twin_public_read on public.geometry_revisions for select to anon using(exists(select 1 from public.three_d_assets a where a.id=asset_id and a.publication_status='published')); create policy twin_member_read on public.geometry_revisions for select to authenticated using((exists(select 1 from public.three_d_assets a where a.id=asset_id and a.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.geometry_revisions for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.digital_twin_configuration_revisions enable row level security; revoke all on public.digital_twin_configuration_revisions from public,anon,authenticated; grant select on public.digital_twin_configuration_revisions to anon,authenticated; grant insert,update,delete on public.digital_twin_configuration_revisions to authenticated;

create policy twin_public_read on public.digital_twin_configuration_revisions for select to anon using(publication_status='published'); create policy twin_member_read on public.digital_twin_configuration_revisions for select to authenticated using((publication_status='published') or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.digital_twin_configuration_revisions for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.assembly_nodes enable row level security; revoke all on public.assembly_nodes from public,anon,authenticated; grant select on public.assembly_nodes to anon,authenticated; grant insert,update,delete on public.assembly_nodes to authenticated;

create policy twin_public_read on public.assembly_nodes for select to anon using(exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')); create policy twin_member_read on public.assembly_nodes for select to authenticated using((exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.assembly_nodes for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.assembly_relationships enable row level security; revoke all on public.assembly_relationships from public,anon,authenticated; grant select on public.assembly_relationships to anon,authenticated; grant insert,update,delete on public.assembly_relationships to authenticated;

create policy twin_public_read on public.assembly_relationships for select to anon using(exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')); create policy twin_member_read on public.assembly_relationships for select to authenticated using((exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.assembly_relationships for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.mounting_points enable row level security; revoke all on public.mounting_points from public,anon,authenticated; grant select on public.mounting_points to anon,authenticated; grant insert,update,delete on public.mounting_points to authenticated;

create policy twin_public_read on public.mounting_points for select to anon using(exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')); create policy twin_member_read on public.mounting_points for select to authenticated using((exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.mounting_points for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.fastener_connections enable row level security; revoke all on public.fastener_connections from public,anon,authenticated; grant select on public.fastener_connections to anon,authenticated; grant insert,update,delete on public.fastener_connections to authenticated;

create policy twin_public_read on public.fastener_connections for select to anon using(exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')); create policy twin_member_read on public.fastener_connections for select to authenticated using((exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.fastener_connections for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.electrical_connections enable row level security; revoke all on public.electrical_connections from public,anon,authenticated; grant select on public.electrical_connections to anon,authenticated; grant insert,update,delete on public.electrical_connections to authenticated;

create policy twin_public_read on public.electrical_connections for select to anon using(exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')); create policy twin_member_read on public.electrical_connections for select to authenticated using((exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.electrical_connections for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.fluid_connections enable row level security; revoke all on public.fluid_connections from public,anon,authenticated; grant select on public.fluid_connections to anon,authenticated; grant insert,update,delete on public.fluid_connections to authenticated;

create policy twin_public_read on public.fluid_connections for select to anon using(exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')); create policy twin_member_read on public.fluid_connections for select to authenticated using((exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.fluid_connections for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.disassembly_dependencies enable row level security; revoke all on public.disassembly_dependencies from public,anon,authenticated; grant select on public.disassembly_dependencies to anon,authenticated; grant insert,update,delete on public.disassembly_dependencies to authenticated;

create policy twin_public_read on public.disassembly_dependencies for select to anon using(exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')); create policy twin_member_read on public.disassembly_dependencies for select to authenticated using((exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.disassembly_dependencies for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.removal_animations enable row level security; revoke all on public.removal_animations from public,anon,authenticated; grant select on public.removal_animations to anon,authenticated; grant insert,update,delete on public.removal_animations to authenticated;

create policy twin_public_read on public.removal_animations for select to anon using(exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')); create policy twin_member_read on public.removal_animations for select to authenticated using((exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.removal_animations for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.repair_scene_steps enable row level security; revoke all on public.repair_scene_steps from public,anon,authenticated; grant select on public.repair_scene_steps to anon,authenticated; grant insert,update,delete on public.repair_scene_steps to authenticated;

create policy twin_public_read on public.repair_scene_steps for select to anon using(exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')); create policy twin_member_read on public.repair_scene_steps for select to authenticated using((exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.repair_scene_steps for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.component_condition_examples enable row level security; revoke all on public.component_condition_examples from public,anon,authenticated; grant select on public.component_condition_examples to anon,authenticated; grant insert,update,delete on public.component_condition_examples to authenticated;

create policy twin_public_read on public.component_condition_examples for select to anon using(exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')); create policy twin_member_read on public.component_condition_examples for select to authenticated using((exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.component_condition_examples for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.component_meshes enable row level security; revoke all on public.component_meshes from public,anon,authenticated; grant select on public.component_meshes to anon,authenticated; grant insert,update,delete on public.component_meshes to authenticated;

create policy twin_public_read on public.component_meshes for select to anon using(exists(select 1 from public.geometry_revisions g join public.three_d_assets a on a.id=g.asset_id where g.id=geometry_revision_id and a.publication_status='published')); create policy twin_member_read on public.component_meshes for select to authenticated using((exists(select 1 from public.geometry_revisions g join public.three_d_assets a on a.id=g.asset_id where g.id=geometry_revision_id and a.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.component_meshes for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.geometry_measurements enable row level security; revoke all on public.geometry_measurements from public,anon,authenticated; grant select on public.geometry_measurements to anon,authenticated; grant insert,update,delete on public.geometry_measurements to authenticated;

create policy twin_public_read on public.geometry_measurements for select to anon using(exists(select 1 from public.geometry_revisions g join public.three_d_assets a on a.id=g.asset_id where g.id=geometry_revision_id and a.publication_status='published')); create policy twin_member_read on public.geometry_measurements for select to authenticated using((exists(select 1 from public.geometry_revisions g join public.three_d_assets a on a.id=g.asset_id where g.id=geometry_revision_id and a.publication_status='published')) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.geometry_measurements for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.accuracy_reviews enable row level security; revoke all on public.accuracy_reviews from public,anon,authenticated; grant select on public.accuracy_reviews to anon,authenticated; grant insert,update,delete on public.accuracy_reviews to authenticated;

create policy twin_public_read on public.accuracy_reviews for select to anon using((geometry_revision_id is not null and exists(select 1 from public.geometry_revisions g join public.three_d_assets a on a.id=g.asset_id where g.id=geometry_revision_id and a.publication_status='published')) or (configuration_revision_id is not null and exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published'))); create policy twin_member_read on public.accuracy_reviews for select to authenticated using(((geometry_revision_id is not null and exists(select 1 from public.geometry_revisions g join public.three_d_assets a on a.id=g.asset_id where g.id=geometry_revision_id and a.publication_status='published')) or (configuration_revision_id is not null and exists(select 1 from public.digital_twin_configuration_revisions r where r.id=configuration_revision_id and r.publication_status='published'))) or (select e34_private.has_role('reviewer'))); create policy twin_staff_write on public.accuracy_reviews for all to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.reconstruction_jobs enable row level security; revoke all on public.reconstruction_jobs from public,anon,authenticated; grant select,insert,delete on public.reconstruction_jobs to authenticated; create policy twin_submission_read on public.reconstruction_jobs for select to authenticated using(user_id=(select auth.uid()) or (select e34_private.has_role('reviewer'))); create policy twin_submission_delete on public.reconstruction_jobs for delete to authenticated using(user_id=(select auth.uid()));

create policy twin_submission_create on public.reconstruction_jobs for insert to authenticated with check(user_id=(select auth.uid()) and status='needs-evidence');

alter table public.reconstruction_evidence enable row level security; revoke all on public.reconstruction_evidence from public,anon,authenticated; grant select,insert,delete on public.reconstruction_evidence to authenticated; create policy twin_submission_read on public.reconstruction_evidence for select to authenticated using(user_id=(select auth.uid()) or (select e34_private.has_role('reviewer'))); create policy twin_submission_delete on public.reconstruction_evidence for delete to authenticated using(user_id=(select auth.uid()));

create policy twin_submission_create on public.reconstruction_evidence for insert to authenticated with check(user_id=(select auth.uid()));

grant update on public.reconstruction_jobs to authenticated; create policy twin_job_review on public.reconstruction_jobs for update to authenticated using((select e34_private.has_role('reviewer'))) with check((select e34_private.has_role('reviewer')));

alter table public.user_workshop_sessions enable row level security; revoke all on public.user_workshop_sessions from public,anon,authenticated; grant select,insert,update,delete on public.user_workshop_sessions to authenticated;
create policy twin_session_read on public.user_workshop_sessions for select to authenticated using(user_id=(select auth.uid()));
create policy twin_session_create on public.user_workshop_sessions for insert to authenticated with check(user_id=(select auth.uid()));
create policy twin_session_update on public.user_workshop_sessions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy twin_session_delete on public.user_workshop_sessions for delete to authenticated using(user_id=(select auth.uid()));

create index twin_asset_sources_0 on public.asset_sources(source_id);

create index twin_asset_sources_1 on public.asset_sources(license_id);

create index twin_three_d_assets_0 on public.three_d_assets(source_id);

create index twin_geometry_revisions_0 on public.geometry_revisions(asset_id);

create index twin_digital_twin_vehicles_0 on public.digital_twin_vehicles(model_id);

create index twin_digital_twin_vehicles_1 on public.digital_twin_vehicles(source_id);

create index twin_digital_twin_configurations_0 on public.digital_twin_configurations(vehicle_id);

create index twin_digital_twin_configuration_revisions_0 on public.digital_twin_configuration_revisions(configuration_id);

create index twin_assembly_nodes_0 on public.assembly_nodes(configuration_revision_id);

create index twin_component_meshes_0 on public.component_meshes(geometry_revision_id);

create index twin_component_meshes_1 on public.component_meshes(part_id);

create index twin_geometry_measurements_0 on public.geometry_measurements(geometry_revision_id);

create index twin_accuracy_reviews_0 on public.accuracy_reviews(geometry_revision_id);

create index twin_accuracy_reviews_1 on public.accuracy_reviews(configuration_revision_id);

create index twin_accuracy_reviews_2 on public.accuracy_reviews(reviewer_id);

create index twin_reconstruction_jobs_0 on public.reconstruction_jobs(user_id);

create index twin_reconstruction_jobs_1 on public.reconstruction_jobs(part_id);

create index twin_reconstruction_evidence_0 on public.reconstruction_evidence(job_id,user_id);

create index twin_reconstruction_evidence_1 on public.reconstruction_evidence(user_id);

create index twin_user_workshop_sessions_0 on public.user_workshop_sessions(user_id);

create index twin_user_workshop_sessions_1 on public.user_workshop_sessions(configuration_id);

create index twin_user_workshop_sessions_2 on public.user_workshop_sessions(configuration_revision_id,configuration_id);

create index twin_assembly_relationships_0 on public.assembly_relationships(configuration_revision_id);

create index twin_assembly_relationships_1 on public.assembly_relationships(configuration_revision_id,from_node);

create index twin_assembly_relationships_2 on public.assembly_relationships(configuration_revision_id,to_node);

create index twin_mounting_points_0 on public.mounting_points(configuration_revision_id);

create index twin_mounting_points_1 on public.mounting_points(configuration_revision_id,node_id);

create index twin_fastener_connections_0 on public.fastener_connections(configuration_revision_id);

create index twin_fastener_connections_1 on public.fastener_connections(configuration_revision_id,from_node);

create index twin_fastener_connections_2 on public.fastener_connections(configuration_revision_id,to_node);

create index twin_electrical_connections_0 on public.electrical_connections(configuration_revision_id);

create index twin_electrical_connections_1 on public.electrical_connections(configuration_revision_id,from_node);

create index twin_electrical_connections_2 on public.electrical_connections(configuration_revision_id,to_node);

create index twin_fluid_connections_0 on public.fluid_connections(configuration_revision_id);

create index twin_fluid_connections_1 on public.fluid_connections(configuration_revision_id,from_node);

create index twin_fluid_connections_2 on public.fluid_connections(configuration_revision_id,to_node);

create index twin_disassembly_dependencies_0 on public.disassembly_dependencies(configuration_revision_id);

create index twin_disassembly_dependencies_1 on public.disassembly_dependencies(configuration_revision_id,target_node);

create index twin_disassembly_dependencies_2 on public.disassembly_dependencies(configuration_revision_id,prerequisite_node);

create index twin_removal_animations_0 on public.removal_animations(configuration_revision_id);

create index twin_removal_animations_1 on public.removal_animations(configuration_revision_id,node_id);

create index twin_repair_scene_steps_0 on public.repair_scene_steps(configuration_revision_id);

create index twin_component_condition_examples_0 on public.component_condition_examples(configuration_revision_id);

create function e34_private.check_twin_publication() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.publication_status='published' and not exists(select 1 from public.asset_sources s join public.asset_licenses l on l.id=s.license_id where s.id=new.source_id and l.redistribution='allowed') then raise exception 'A documented redistribution license is required before publishing an asset'; end if; return new;
end; $$;
revoke all on function e34_private.check_twin_publication() from public,anon,authenticated;
create trigger twin_asset_license_gate before insert or update on public.three_d_assets for each row execute function e34_private.check_twin_publication();
