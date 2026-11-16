-- Register immutable panel-fit references alongside prior saved builds.
insert into e34_private.build_references(id, revision, sha256) values
  ('e34-525i-sedan-automatic',1043,'71d3e09314ff0833015b2e2b1814089868df6f173f010fb8a68fc2be7dc03eaa'),
  ('e34-reconstruction-reference',39,'6ef63dee732b00e887cdd2b51fe8037993d3289b3c77eeddd3b7477ca24dc769'),
  ('e34-530i-sedan-manual',40,'c26bf237e37cc2116db4afe339b1323f7eae9459438d6587f4a1f49841ac4d6a'),
  ('e34-530i-sedan-automatic',41,'f9dbfe65925b77fee01d9937f5bd5e82ebc38789e8f389bb991a3eff963d40b7'),
  ('e34-535i-sedan-manual',42,'0bb25a9f869b810efeb6780aee0e15939b51b8337d85111b07d6f2e146a1e3b9'),
  ('e34-535i-sedan-automatic',43,'c259fe1e12021aa52bc68e10c19ace4449d4b73acd52833d0f9b3eef0047b404'),
  ('e34-540i-sedan-manual',44,'63a3e77a6589b9bf103a99144a56d189a51cfc309ad2e771945227b0301082a4'),
  ('e34-540i-sedan-automatic',45,'267cafbcb2f8eca75761c293c017c17e6b40e2207cb636f104b3b2770d90f2f5'),
  ('e34-530i-touring-manual',46,'cae467662568002d6f9cf83ea52d6d833df734c3c8b040fc8cb4be44fffbb082'),
  ('e34-530i-touring-automatic',47,'486d5ae63627523a0bd769299fdd1791b5c53e338357799095f39360a1a85c85'),
  ('e30-325i-coupe-manual',1160,'df59275751fa57260390ce64f420ac21be0f449ec08def9130ebf7f5baebee96'),
  ('e30-m3-coupe-exterior',1113,'776e3f990c4db989781ecd28dcbd80596a85240ac711c841c5f1e4b51592712a')
on conflict (id,revision) do nothing;
