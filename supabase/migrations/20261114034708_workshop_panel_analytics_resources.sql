-- Register selectable workshop parts for public analytics events.
insert into e34_private.analytics_resources(id,path,title,kind) values
('node:e34body:fuel-door','/workshop','Fuel filler door','component'),
('node:e34body:sunroof','/workshop','Sliding sunroof panel','component'),
('node:e34trim:fuel-door-hinge','/workshop','Fuel door hinge','component'),
('node:e34trim:fuel-filler-pocket','/workshop','Fuel filler pocket and cap','component'),
('node:e34trim:glove-box-bin','/workshop','Glove box storage liner','component'),
('node:e34trim:glove-box-door','/workshop','Glove box door and latch','component'),
('node:e34trim:luggage-floor-carpet','/workshop','Spare-wheel cover and luggage carpet','component'),
('node:e34trim:spare-wheel','/workshop','Spare wheel and tire','component'),
('node:e34trim:spare-wheel-retainer','/workshop','Spare-wheel retaining screw','component'),
('node:e34trim:sunroof-aperture-finisher','/workshop','Headliner opening edge trim','component'),
('node:e34trim:sunroof-liner','/workshop','Sliding sunroof cloth liner','component'),
('node:e34trim:trunk-hinge-left','/workshop','Left trunk hinge','component'),
('node:e34trim:trunk-hinge-right','/workshop','Right trunk hinge','component'),
('node:e34trim:trunk-lid-inner','/workshop','Trunk lid tool tray','component')
on conflict (id) do nothing;
