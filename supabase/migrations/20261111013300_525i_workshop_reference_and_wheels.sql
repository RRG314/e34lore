-- Register the reviewed 525i reference and wheel previews. Existing pins are retained.
begin;
insert into e34_private.build_references(id, revision, sha256)
 values ('e34-525i-sedan-automatic',24,'c26f8aecf883dd9788fa086d78c4850773e233c4c287de457539c1774fa49646') on conflict(id,revision) do nothing;
do $$
begin
 if not exists (select 1 from e34_private.build_references where id='e34-525i-sedan-automatic' and revision=24 and sha256='c26f8aecf883dd9788fa086d78c4850773e233c4c287de457539c1774fa49646')
 then raise exception 'Existing 525i reference revision uses different assets'; end if;
end $$;
update e34_private.build_contract set contract=jsonb_set(contract,'{properties,appearance,properties,wheels,properties,packageId,enum}',(
 select jsonb_agg(value order by first_index)
 from (select value,min(ordinality) first_index
 from jsonb_array_elements((contract#>'{properties,appearance,properties,wheels,properties,packageId,enum}')||'["e34-factory-1-v1","e34-factory-2-v1","e34-factory-3-v1","e34-factory-4-v1","e34-factory-5-v1","e34-factory-5-composite-v1","e34-factory-5-trx-v1","e34-factory-6-v1","e34-factory-7-v1","e34-factory-7-td-v1","e34-factory-10-v1","e34-factory-10-ii-v1","e34-factory-12-v1","e34-factory-14-v1","e34-factory-16-v1","e34-factory-18-v1","e34-factory-19-v1","e34-factory-20-v1","e34-factory-21-v1","e34-factory-26-v1","e34-factory-29-v1","e34-factory-32-v1","e34-factory-37-v1","e34-factory-trx-1-v1","e34-factory-trx-2-v1"]'::jsonb)
 with ordinality group by value) wheel_ids
),false) where version=1;
commit;
