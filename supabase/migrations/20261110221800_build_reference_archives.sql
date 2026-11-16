-- Retain every accepted reference pin so earlier projects remain editable.
-- This changes no project state and admits no new model bytes by itself.
begin;
alter table e34_private.build_references drop constraint build_references_pkey;
alter table e34_private.build_references add primary key(id,revision);
commit;
