insert into e34_private.analytics_resources(id,path,title,kind) values
  ('/quick-reference/model','/quick-reference/model','3D exploded view','quick')
on conflict (id) do nothing;
