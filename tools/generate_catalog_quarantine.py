#!/usr/bin/env python3
"""Generate a reviewed local migration; never connects to any database."""
import argparse,hashlib,json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def quoted(value):return "'"+str(value).replace("'","''")+"'"
def generate(output):
 data_path=ROOT/'data/catalog-position-quarantine.json'
 data=json.loads(data_path.read_text());rows=data['records']
 excluded=json.loads((ROOT/'data/catalog-position-exclusions.json').read_text())['excludedPositions']
 if len(rows)!=2712 or {r['id'] for r in rows}!=set(excluded):raise ValueError('Quarantine set must equal the complete reviewed exclusion set')
 for row in rows:
  if not all(re.fullmatch('[a-f0-9]{64}',row[k]) for k in ['source_sha256','record_sha256']):raise ValueError('Invalid retained hash')
  if row['id']!=row['assembly_id']+'-'+row['record_sha256'][:24]:raise ValueError('Position identity mismatch')
 digest=hashlib.sha256(data_path.read_bytes()).hexdigest()
 values=',\n'.join('('+','.join(quoted(r[k]) for k in ['id','context_id','source_url','source_sha256','record_sha256'])+')' for r in rows)
 text='''-- Generated reviewed source rules; original positions and canonical parts remain.
-- Registry hash: HASH
begin;
create table e34_private.catalog_position_quarantine (
 position_id text primary key,
 context_id text not null,
 source_url text not null check (source_url like 'https://www.bmwpartsdeal.com/%'),
 expected_source_sha256 text not null check (expected_source_sha256 ~ '^[a-f0-9]{64}$'),
 expected_record_sha256 text not null check (expected_record_sha256 ~ '^[a-f0-9]{64}$'),
 reason text not null default 'applicability-child' check (reason='applicability-child'),
 review_sha256 text not null check (review_sha256 ~ '^[a-f0-9]{64}$'),
 original_position jsonb check (original_position is null or jsonb_typeof(original_position)='object'),
 quarantined_at timestamptz,
 reviewed_at timestamptz not null default now()
);
comment on table e34_private.catalog_position_quarantine is 'Reviewed import exclusions. Rules can precede a fresh factual import, so IDs intentionally have no FK. Original position snapshots are private audit history.';
alter table e34_private.catalog_position_quarantine enable row level security;
revoke all on e34_private.catalog_position_quarantine from public,anon,authenticated;
insert into e34_private.catalog_position_quarantine(position_id,context_id,source_url,expected_source_sha256,expected_record_sha256,review_sha256)
select v.*, 'HASH' from (values
VALUES
) v(position_id,context_id,source_url,expected_source_sha256,expected_record_sha256);

create function e34_private.guard_catalog_position_quarantine()
returns trigger language plpgsql security definer set search_path='' as $$
declare rule e34_private.catalog_position_quarantine;
begin
 select * into rule from e34_private.catalog_position_quarantine where position_id=new.id;
 if found then
  if new.source_sha256<>rule.expected_source_sha256 or new.record_sha256<>rule.expected_record_sha256
   or new.context_id<>rule.context_id or new.source_url<>rule.source_url then
   raise exception 'Quarantined source changed; review the retained evidence before importing this position' using errcode='23514';
  end if;
  update e34_private.catalog_position_quarantine set original_position=coalesce(original_position,to_jsonb(new)),quarantined_at=coalesce(quarantined_at,now()) where position_id=new.id;
  new.active=false;
 end if;
 return new;
end $$;
revoke all on function e34_private.guard_catalog_position_quarantine() from public,anon,authenticated;
create trigger guard_catalog_position_quarantine before insert or update on public.part_assembly_positions for each row execute function e34_private.guard_catalog_position_quarantine();

create function e34_private.reconcile_catalog_position_quarantine(require_complete boolean default true)
returns integer language plpgsql security definer set search_path='' as $$
declare observed integer; changed integer;
begin
 -- Lock before checking hashes, so a concurrent import cannot replace evidence
 -- between validation and snapshot/deactivation. No member table is touched.
 lock table public.part_assembly_positions in share row exclusive mode;
 select count(*) into observed from e34_private.catalog_position_quarantine q join public.part_assembly_positions p on p.id=q.position_id;
 if require_complete and observed<>2712 then raise exception 'Expected all 2712 reviewed source positions, found %',observed; end if;
 if exists(select 1 from e34_private.catalog_position_quarantine q join public.part_assembly_positions p on p.id=q.position_id
  where p.source_sha256<>q.expected_source_sha256 or p.record_sha256<>q.expected_record_sha256 or p.context_id<>q.context_id or p.source_url<>q.source_url) then
  raise exception 'Retained catalog fingerprints differ; quarantine aborted' using errcode='23514';
 end if;
 update e34_private.catalog_position_quarantine q set original_position=coalesce(q.original_position,to_jsonb(p)),quarantined_at=coalesce(q.quarantined_at,now()) from public.part_assembly_positions p where p.id=q.position_id;
 update public.part_assembly_positions p set active=false from e34_private.catalog_position_quarantine q where p.id=q.position_id and p.active;
 get diagnostics changed=row_count;
 return changed;
end $$;
revoke all on function e34_private.reconcile_catalog_position_quarantine(boolean) from public,anon,authenticated;
-- Fresh empty installs register the guard before imports. Existing production
-- catalogs must contain the complete reviewed set; partial/changed sets abort.
do $$begin
 perform e34_private.reconcile_catalog_position_quarantine(exists(select 1 from e34_private.catalog_position_quarantine q join public.part_assembly_positions p on p.id=q.position_id));
end $$;
commit;
'''.replace('HASH',digest).replace('VALUES',values)
 if not output.exists() or not output.name.endswith('_catalog_position_quarantine.sql'):raise ValueError('Create the migration with supabase migration new first')
 output.write_text(text)
 return {'rules':len(rows),'sha256':digest,'migration':output.name}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True)
 print(json.dumps(generate(parser.parse_args().output)))
