-- Keep the stock E30 appearance revision available for saved Workshop views.
begin;
insert into e34_private.build_references(id,revision,sha256)
values ('e30-325i-coupe-manual',1139,'76029997d4eda9d10e68428d063121c2c785dd13a84d4b5164f71e613ec97d4c')
on conflict (id,revision) do nothing;

do $$ begin
  if not exists (
    select 1 from e34_private.build_references
    where id='e30-325i-coupe-manual' and revision=1139
      and sha256='76029997d4eda9d10e68428d063121c2c785dd13a84d4b5164f71e613ec97d4c'
  ) then
    raise exception 'The E30 exterior reference does not match its release pin';
  end if;
end $$;
commit;
