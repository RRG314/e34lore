-- Additive navigation provenance. Existing private observations remain unchanged.
begin;
alter table public.component_observations
 add column catalog_position_id text,
 add column reference_id text,
 add column model_revision integer,
 add column model_manifest_sha256 text,
 add constraint observations_catalog_part_required check(catalog_position_id is null or part_id is not null),
 add constraint observations_catalog_position_part_fk foreign key(catalog_position_id,part_id)
   references public.part_assembly_positions(id,part_id),
 add constraint observations_reference_snapshot check(
   (reference_id is null and model_revision is null and model_manifest_sha256 is null)
   or (reference_id is not null and reference_id ~ '^[a-z][a-z0-9-]{2,119}$'
       and model_revision is not null and model_revision between 1 and 1000000
       and model_manifest_sha256 is not null and model_manifest_sha256 ~ '^[a-f0-9]{64}$')
 );
create index observations_catalog_position on public.component_observations(catalog_position_id,part_id) where catalog_position_id is not null;
comment on column public.component_observations.catalog_position_id is 'Exact source occurrence checked by the owner; not a fitment or installation claim.';
comment on column public.component_observations.model_manifest_sha256 is 'Pinned illustrated reference receipt; not mechanically verified geometry.';
notify pgrst,'reload schema';
commit;
