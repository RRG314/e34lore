-- Register the reshaped front panels alongside earlier saved model revisions.
insert into e34_private.build_references(id, revision, sha256) values
  ('e30-325i-coupe-manual', 1165, 'bb3ab6ac7832a365467b616d02453d917ae3ab3fdb4b7ce008864852f295aba5')
on conflict (id, revision) do nothing;
