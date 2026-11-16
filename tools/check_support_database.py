"""Exercise real PostgreSQL RLS/thread/outbox rules in a named disposable local DB.
Provider-extension fixtures perform no network calls or real email delivery.
"""
import argparse,subprocess,tempfile,json,os
from local_fixture import support_fixture_connection
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--dsn',required=True);a=p.parse_args()
try:base,fixture_env=support_fixture_connection(a.dsn,os.environ)
except ValueError as error:raise SystemExit(str(error))
subprocess.run(['dropdb',*base,'--if-exists','e34_support_test'],check=True,env=fixture_env)
subprocess.run(['createdb',*base,'e34_support_test'],check=True,env=fixture_env)
worker=Path('supabase/migrations/20261108021532_support_delivery_worker.sql').read_text().replace('create extension if not exists pg_net;','-- pg_net is replaced by the isolated network fixture.')
with tempfile.NamedTemporaryFile('w',suffix='.sql') as f:
 f.write(worker);f.flush()
 subprocess.run(['psql','-X',*base,'-d','e34_support_test','-v','ON_ERROR_STOP=1','-f','tests/support-bootstrap.sql','-f','tests/support-provider-fixtures.sql','-f','supabase/migrations/20261108021527_support_inbox_and_roadmap.sql','-f',f.name,'-f','tests/support-transaction.sql'],check=True,env=fixture_env)
# Use independent real connections to exercise advisory locks and SKIP LOCKED.
def sql(command):
 return subprocess.run(['psql',*base,'-d','e34_support_test','-X','-qAt','-v','ON_ERROR_STOP=1'],input=command,text=True,capture_output=True,check=True,env=fixture_env).stdout.strip()
def literal(value):
 return "'"+json.dumps(value).replace("'","''")+"'::jsonb"
payload=dict(name='Concurrent fixture',email='concurrent@example.test',subject='Concurrent fixture only',message='This local fixture never sends email.',category='website',reference='',requestId='80000000-0000-4000-8000-000000000001')
command="begin;set local role service_role;select public.support_service_submit("+literal(payload)+",'concurrency-ip','concurrency-email','same-content',null);select pg_sleep(0.15);commit;"
with ThreadPoolExecutor(max_workers=2) as pool:
 list(pool.map(sql,[command,command]))
assert sql("select count(*)||':'||(select count(*) from support_messages) from support_tickets")=='1:2', 'Concurrent contact retry duplicated content'
claim="begin;set local role service_role;select jsonb_array_length(public.support_service_claim());select pg_sleep(0.15);commit;"
with ThreadPoolExecutor(max_workers=2) as pool:
 claimed=list(pool.map(sql,[claim,claim]))
assert sorted(int(value.splitlines()[0]) for value in claimed)==[0,1], 'Concurrent workers claimed the same email'
incoming=dict(providerId='80000000-0000-4000-8000-000000000002',email='incoming@example.test',name='Incoming fixture',subject='Concurrent inbound fixture',body='A fixture incoming message.',messageId='<concurrent@example.test>',replyIds=[],replyToken='',automated=False,spam=False,senderVerification='aligned',attachments=[])
commands=["begin;set local role service_role;select public.support_service_ingest("+literal(incoming)+",'concurrent-event-"+str(i)+"','content');select pg_sleep(0.15);commit;" for i in range(2)]
with ThreadPoolExecutor(max_workers=2) as pool:
 list(pool.map(sql,commands))
assert sql("select count(*) from support_messages where provider_id='80000000-0000-4000-8000-000000000002'")=='1', 'Concurrent provider retries duplicated the incoming email'
sql('truncate public.support_tickets cascade;truncate e34_private.support_events,e34_private.support_rate_buckets,e34_private.support_deleted_objects;')
print('Support PostgreSQL access, threading, outbox, activation, deletion and concurrent producer/worker checks passed. No external messages sent.')
