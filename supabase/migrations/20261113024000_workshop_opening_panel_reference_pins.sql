-- Add the approved Workshop assets to Build Studio's immutable reference registry.
insert into e34_private.build_references(id, revision, sha256) values
  ('e34-525i-sedan-automatic',1042,'d67c5887ad944c5ad6d982ce2ab5743566ff92b5addb23a2958103b97d47cda0'),
  ('e30-325i-coupe-manual',1159,'d590485b20326659caf6ff70572d68795063f94ccf8951b79421581791a3b182')
on conflict (id,revision) do nothing;

do $$
begin
  if (select count(*) from e34_private.build_references where (id='e34-525i-sedan-automatic' and revision=1042 and sha256='d67c5887ad944c5ad6d982ce2ab5743566ff92b5addb23a2958103b97d47cda0') or
    (id='e30-325i-coupe-manual' and revision=1159 and sha256='d590485b20326659caf6ff70572d68795063f94ccf8951b79421581791a3b182')) <> 2 then
    raise exception 'Workshop opening-panel reference pin conflict';
  end if;
end;
$$;
