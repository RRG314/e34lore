-- Preserve the exact Workshop model used by saved maintenance views.
begin;
insert into e34_private.build_references(id,revision,sha256)
values
  ('e30-325i-coupe-manual', 1135, 'e804decf2b47085e2a3827afe74f1c8c40983bb28d0fbb6f26daafa937f0a152'),
  ('e30-325i-coupe-manual', 1136, 'd668a485c08c86fa7f406afa52c7966ecb4896a9658f8d1ed0b6c0f3fef53038')
on conflict(id,revision) do nothing;

do $$ begin
  if exists (
    select 1 from (values
      (1135, 'e804decf2b47085e2a3827afe74f1c8c40983bb28d0fbb6f26daafa937f0a152'),
      (1136, 'd668a485c08c86fa7f406afa52c7966ecb4896a9658f8d1ed0b6c0f3fef53038')
    ) expected(revision,sha256)
    where not exists (
      select 1 from e34_private.build_references pinned
      where pinned.id='e30-325i-coupe-manual' and pinned.revision=expected.revision and pinned.sha256=expected.sha256
    )
  ) then
    raise exception 'Workshop maintenance model does not match the release pin';
  end if;
end $$;
commit;
