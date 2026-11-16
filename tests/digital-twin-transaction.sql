begin;
insert into auth.users(id,email,aud,role,created_at,updated_at) values
('ed340000-0000-4000-8000-000000000061','e34-twin-a@example.invalid','authenticated','authenticated',now(),now()),
('ed340000-0000-4000-8000-000000000062','e34-twin-b@example.invalid','authenticated','authenticated',now(),now());
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000061","role":"authenticated"}',true);
insert into public.user_workshop_sessions(id,user_id,configuration_id,configuration_revision_id,label,state)
select 'ed340000-0000-4000-8000-000000000063','ed340000-0000-4000-8000-000000000061',configuration_id,id,'rollback-only inspection',jsonb_build_object('schemaVersion',1,'graphId',graph_id,'graphRevision',revision,'mode','explore','present',jsonb_build_object('removed',jsonb_build_array('pump'),'hidden','[]'::jsonb,'detached','[]'::jsonb,'selected','pump','explosion',0.5),'past','[]'::jsonb,'future','[]'::jsonb)
from public.digital_twin_configuration_revisions where id='e34-525i-m50-workshop:reference-3';
do $$begin
 if (select count(*) from public.user_workshop_sessions)<>1 then raise exception 'Owner cannot read session';end if;
 begin
  update public.user_workshop_sessions set state=jsonb_set(state,'{mode}','"constrained"') where id='ed340000-0000-4000-8000-000000000063';
  raise exception 'Invalid constrained state accepted';
 exception when raise_exception then if sqlerrm='Invalid constrained state accepted' then raise;end if;end;
 begin
  update public.user_workshop_sessions set state=jsonb_set(state,'{present,selected}','"not-a-node"') where id='ed340000-0000-4000-8000-000000000063';
  raise exception 'Unknown node accepted';
 exception when raise_exception then if sqlerrm='Unknown node accepted' then raise;end if;end;
 begin
  update public.user_workshop_sessions set state=jsonb_set(state,'{graphRevision}','"old"') where id='ed340000-0000-4000-8000-000000000063';
  raise exception 'Stale revision accepted';
 exception when raise_exception then if sqlerrm='Stale revision accepted' then raise;end if;end;
end;$$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000062","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.user_workshop_sessions) then raise exception 'Private session leaked';end if;
 if exists(select 1 from public.account_twin_file_paths('ed340000-0000-4000-8000-000000000061')) then raise exception 'Unexpected storage list';end if;
 exception when insufficient_privilege then null;
end;$$;
set local role anon;
do $$begin
 if (select count(*) from public.assembly_nodes where configuration_revision_id='e34-525i-m50-workshop:reference-3')<>106 then raise exception 'Published hierarchy unavailable';end if;
 if (select count(*) from public.geometry_revisions where id not like 'nominal-seal:%')<>7 then raise exception 'Published reference assets unavailable';end if;
end;$$;
reset role;
do $$begin
 begin update public.digital_twin_configuration_revisions set graph=jsonb_set(graph,'{revision}','"overwritten"') where id='e34-525i-m50-workshop:reference-3';raise exception 'Pinned graph was mutable';exception when raise_exception then if sqlerrm='Pinned graph was mutable' then raise;end if;end;
 begin update public.geometry_revisions set accuracy=jsonb_set(accuracy,'{dimensions}','"verified"') where id='e34-exterior-reference-r1';raise exception 'Unsubstantiated dimensions accepted';exception when raise_exception then if sqlerrm='Unsubstantiated dimensions accepted' then raise;end if;end;
end;$$;
insert into public.accuracy_reviews(id,geometry_revision_id,axis,decision,method,evidence,reviewer_id) values('ed340000-0000-4000-8000-000000000069','e34-exterior-reference-r1','visual','illustrative','Rollback-only source review','[{"sourceId":"test-only"}]','ed340000-0000-4000-8000-000000000062');
delete from auth.users where id='ed340000-0000-4000-8000-000000000062';
do $$begin if exists(select 1 from public.accuracy_reviews where id='ed340000-0000-4000-8000-000000000069' and reviewer_id is not null) then raise exception 'Reviewer account deletion failed to anonymize evidence';end if;end;$$;
rollback;
