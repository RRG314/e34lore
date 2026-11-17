#!/usr/bin/env python3
"""Create a disposable Unix-socket-only cluster and exercise tracked SQL policies.
Never connects to a remote database. No production data or credentials are read.
Provider Auth/Storage schemas are minimal test doubles; cron is a parsing stub.
Catalog-only data guards need the production factual import and are excluded.
"""
from pathlib import Path
import subprocess, tempfile, shutil,os,hashlib,time,json,re
repo=Path(__file__).resolve().parents[1]; pg=Path(os.environ.get('E34_POSTGRES_BIN') or subprocess.check_output(['pg_config','--bindir'],text=True).strip()); work=Path(tempfile.mkdtemp(prefix='e34-security-',dir='/tmp')); sock=work/'socket';sock.mkdir(mode=0o700)
env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
def call(args,**kw):return subprocess.run([str(pg/args[0]),*args[1:]],env=env,check=True,**kw)
def sql(path, database="e34_test"):
 print('APPLY',str(path),flush=True);call(['psql','-X','-q','-v','ON_ERROR_STOP=1','-h',str(sock),'-U','postgres','-d',database,'-f',str(path)])
try:
 call(['initdb','-D',str(work/'db'),'-U','postgres','--auth=trust','--encoding=UTF8','--no-locale'],stdout=subprocess.DEVNULL)
 call(['pg_ctl','-D',str(work/'db'),'-o',f"-c listen_addresses='' -k {sock}",'-l',str(work/'db.log'),'-w','start'],stdout=subprocess.DEVNULL)
 call(['createdb','-h',str(sock),'-U','postgres','e34_test'])
 sql(repo/'tests/security-bootstrap.sql')
 sql(repo/'tests/support-provider-fixtures.sql')
 baseline='schema community-garage explicit-api-grants review-and-indexes thread-configuration-search notifications owner-export-access diagnostic-observation-bounds contribution-revisions discussion-pagination technical-drawings owned-catalog catalog-drawing-labels catalog-identity-search catalog-inventory-scaling catalog-indexed-search community community-editorials community-integration community-hardening community-api-boundary digital-twin digital-twin-guards digital-twin-accuracy-fix digital-twin-submissions digital-twin-account-storage digital-twin-integrity digital-twin-performance digital-twin-evidence-integrity digital-twin-review-anonymization community-entities community-entity-index community-visibility community-article-review garages'.split()
 for name in baseline:sql(repo/f'database/{name}.sql')
 # Reference data is local public seed, never a copy of member records.
 sql(repo/'database/seed.sql')
 for path in sorted((repo/'supabase/migrations').glob('*.sql')):
  if path.name.startswith('20261107013338'):
   text=path.read_text().split('do $$')[0];(work/'scoped-ddl.sql').write_text(text);sql(work/'scoped-ddl.sql');continue
  if path.name.startswith(('20261107013757','20261107013758','20261108011951')):continue
  if path.name.startswith('20261108021532'):
   # Replace only provider extension installation; exercise the real worker SQL.
   text=path.read_text().replace('create extension if not exists pg_net;','-- isolated net fixture')
   (work/'support-worker.sql').write_text(text);sql(work/'support-worker.sql')
  elif path.name.startswith('20261106050350'):
   # pg_cron is a provider extension, not installed into the disposable cluster.
   text=path.read_text();text=text[text.index('create or replace function'):text.index("select cron.schedule")];(work/'retention.sql').write_text(text);sql(work/'retention.sql')
  else:sql(path)

 # Optional normalized public catalog imports are exercised only in this disposable cluster.
 extra_plans=json.loads(os.environ.get('E34_TEST_CATALOG_LOAD_PLANS','[]'))
 if extra_plans:
  batches=[]
  for value in extra_plans:
   plan_path=Path(value).resolve()
   if not any(plan_path.is_relative_to((repo/folder).resolve())for folder in ['work','outputs']):raise ValueError('Catalog test plans must be generated in this checkout work/outputs')
   plan=json.loads(plan_path.read_text())
   if not re.fullmatch(r'e34-context-[a-f0-9]{24}',plan['context']['id']):raise ValueError('Invalid generated context')
   for name in plan['files']:
    if not re.fullmatch(r'\d{3}-(setup|assemblies|finalize)\.sql',name):raise ValueError('Invalid generated SQL filename')
    batches.append(plan_path.parent/name)
  def catalog_counts():
   query="select jsonb_build_array((select count(*)from public.parts),(select count(*)from public.assemblies),(select count(*)from public.part_assembly_positions),(select count(*)from public.technical_drawings))::text"
   return subprocess.check_output([str(pg/'psql'),'-X','-At','-h',str(sock),'-U','postgres','-d','e34_test','-c',query],env=env,text=True).strip()
  for path in batches:sql(path)
  first=catalog_counts()
  for path in batches:sql(path)
  if catalog_counts()!=first:raise RuntimeError('Replaying a catalog load changed identity/source record counts')
  print('PASS additional public catalog loads, foreign-key validation and idempotent replay: '+first,flush=True)
 sql(repo/'tests/scanner-pipeline.sql')
 sql(repo/'tests/scanner-reference-context.sql')
 sql(repo/'tests/member-count.sql')
 sql(repo/'tests/catalog-quarantine.sql')
 sql(repo/'tests/analytics-pipeline.sql')
 sql(repo/'tests/security-policies.sql')
 sql(repo/'tests/specialist-community.sql')
 sql(repo/'tests/moderation-submissions.sql')
 sql(repo/'tests/repair-community.sql')
 sql(repo/'tests/scanner-photo-contributions.sql')
 sql(repo/'tests/vehicle-vins.sql')
 sql(repo/'tests/vehicle-series.sql')
 sql(repo/'tests/garage-profile-photos.sql')
 sql(repo/'tests/build-studio-persistence.sql')
 sql(repo/'tests/servicing-persistence.sql')
 sql(repo/'tests/support-transaction.sql')
 sql(repo/'tests/support-security-integration.sql')
 print('PASS isolated application bootstrap and security policies',flush=True)
 # Commit a second run only inside this disposable database for the restore.
 fixture=work/'recovery-fixtures.sql'
 fixture.write_text((repo/'tests/security-policies.sql').read_text().replace('rollback;','commit;'))
 sql(fixture)
 sql(repo/'tests/security-recovery-prepare.sql')
 sql(repo/'tests/build-studio-recovery-prepare.sql')
 start=time.monotonic()
 source_objects=work/'source-objects'; source_objects.mkdir(mode=0o700)
 names=subprocess.check_output([str(pg/'psql'),'-X','-At','-h',str(sock),'-U','postgres','-d','e34_test','-c',"select bucket_id||'/'||name from storage.objects order by bucket_id,name"],env=env,text=True).splitlines()
 hashes={}
 for name in names:
  if Path(name).is_absolute() or '..' in Path(name).parts: raise RuntimeError('Unsafe fixture object path')
  path=source_objects/name;path.parent.mkdir(parents=True,exist_ok=True)
  path.write_bytes(('Synthetic recovery object: '+name).encode())
  hashes[name]=hashlib.sha256(path.read_bytes()).hexdigest()
 archive=work/'synthetic.dump'
 call(['pg_dump','-h',str(sock),'-U','postgres','-Fc','-f',str(archive),'e34_test'])
 call(['createdb','-h',str(sock),'-U','postgres','e34_restored'])
 call(['pg_restore','-h',str(sock),'-U','postgres','--exit-on-error','--single-transaction','-d','e34_restored',str(archive)])
 shutil.copytree(source_objects,work/'restored-objects')
 for name,digest in hashes.items():
  if hashlib.sha256((work/'restored-objects'/name).read_bytes()).hexdigest()!=digest:raise RuntimeError('Object hash mismatch')
 sql(repo/'tests/security-recovery-assert.sql','e34_restored')
 sql(repo/'tests/build-studio-recovery-assert.sql','e34_restored')
 sql(repo/'tests/build-studio-recovery-cleanup.sql')
 print(f'PASS full application synthetic restore: {len(hashes)} object byte hashes; {archive.stat().st_size} archive bytes; {time.monotonic()-start:.2f}s',flush=True)
 print('Provider OAuth/SMTP settings, Auth encryption keys, actual MFA secrets, real member data and remote Storage export are NOT certified by this local drill.',flush=True)
 if os.environ.get('E34_BUILD_REVIEW')=='1':
  print('Starting disposable local review transport. No hosted backend is used.',flush=True)
  subprocess.run(['node','scripts/build-studio/review-api.mjs'],cwd=repo,env={**env,'E34_REVIEW_SOCKET':str(sock),'E34_REVIEW_PG':str(pg)},check=True)
finally:
 if (work/'db/postmaster.pid').exists():call(['pg_ctl','-D',str(work/'db'),'-m','fast','-w','stop'],stdout=subprocess.DEVNULL)
 shutil.rmtree(work)
