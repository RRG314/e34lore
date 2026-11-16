-- Add E30 appearance packages to the shared saved-build contract.
begin;
update e34_private.build_contract
set contract=jsonb_set(
  contract,
  '{properties,appearance,properties,wheels,properties,packageId,enum}',
  (
    select jsonb_agg(value order by first_index)
    from (
      select value,min(ordinality) as first_index
      from jsonb_array_elements(
        (contract#>'{properties,appearance,properties,wheels,properties,packageId,enum}')||
        '["e30-factory-steel-14-v1","e30-factory-bottlecap-14-v1","e30-factory-cross-spoke-14-v1","e30-factory-cross-spoke-15-v1","e30-factory-star-spoke-15-v1"]'::jsonb
      ) with ordinality group by value
    ) wheel_ids
  ),
  false
)
where version=1;
commit;
