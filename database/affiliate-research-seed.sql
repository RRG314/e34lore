-- Optional retailer research directory. Applications and approvals are configured by the operator.
insert into e34_private.affiliate_networks(id,name,website_url) values('impact','Impact','https://impact.com/') on conflict(id) do nothing;
insert into e34_private.affiliate_networks(id,name,website_url) values('cj','CJ Affiliate','https://www.cj.com/') on conflict(id) do nothing;
insert into e34_private.affiliate_networks(id,name,website_url) values('awin','Awin','https://www.awin.com/') on conflict(id) do nothing;
insert into e34_private.affiliate_networks(id,name,website_url) values('refersion','Refersion','https://www.refersion.com/') on conflict(id) do nothing;
insert into e34_private.affiliate_networks(id,name,website_url) values('direct','Direct partnership',null) on conflict(id) do nothing;
insert into e34_private.affiliate_networks(id,name,website_url) values('google','Google AdSense','https://adsense.google.com/') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('eah','impact','Enthusiast Auto Holdings — ECS / Turner','https://www.turnermotorsport.com/t-partner-with-tms','https://www.turnermotorsport.com/t-partner-with-tms','researching','Official partner page. The EAH Impact route covers the ECS / Turner application workflow.
Use the affiliate/content-publisher route. Program approval is required before activation.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('fcp-partnership','direct','FCP Euro','https://info.fcpeuro.com/fcp-euro-sponsorship-request-form','https://info.fcpeuro.com/fcp-euro-sponsorship-request-form','researching','Official brand-partnership request. A public sales-commission affiliate program was not confirmed.
Brand-community and DIY education proposal; commission and product-feed access require a separate written agreement.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('pelican-research',null,'Pelican Parts',null,'https://www.pelicanparts.com/','researching','Public affiliate availability not confirmed. The retailer blocks automated page access; no bypass attempted.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('bimmerworld-research',null,'BimmerWorld',null,'https://www.bimmerworld.com/','researching','Relevant BMW specialist. A current official public affiliate application was not located.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('autohausaz-research',null,'AutohausAZ',null,'https://www.autohausaz.com/contact-us','researching','Official contact route verified. Public affiliate terms and application not confirmed.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('rockauto-research',null,'RockAuto',null,'https://www.rockauto.com/Newsletter/archives/9-21-23.html','researching','No current official commission application confirmed. Retailer cautions against marketplace/affiliate impersonation; third-party listings are not approval evidence.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('garagistic-ambassador','direct','Garagistic','https://www.garagistic.com/pages/garagistic-ambassador-program','https://www.garagistic.com/pages/garagistic-ambassador-program','researching','Official ambassador application with referral links after approval.
Existing customers using its products and meaningful creator reach; no numeric minimum verified.
Published range 5–15%, subject to the accepted agreement.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('condor-sponsorship','direct','Condor Speed Shop','https://www.condorspeedshop.com/pages/how-to-get-sponsored-by-condor','https://www.condorspeedshop.com/pages/how-to-get-sponsored-by-condor','researching','Official sponsorship information; a general commission affiliate contract was not confirmed.
Review the current sponsorship criteria. Do not promise product use, competition results or reach that the owner has not established.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('ireland-research',null,'Ireland Engineering',null,'https://www.iemotorsport.com/','researching','Classic BMW restoration/performance supplier lead. No official public affiliate application confirmed.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('redline-research',null,'Redline Auto Parts',null,'https://www.redlineautoparts.com/','researching','Used-parts/dismantler lead. No official public commission program confirmed; E34 stock must be checked per product.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('autodoc-research',null,'AUTODOC',null,'https://www.autodoc.co.uk/services/privacy-policy','researching','European retailer lead. Regional publisher enrollment, current network, feed rights and restrictions need official confirmation.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.
Not publicly confirmed. Obtain the current written program terms before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('kc-tool-refersion','refersion','KC Tool','https://kctool.refersion.com/','https://kctool.com/pages/affiliate-program','researching','Official Refersion affiliate enrollment link.
Website and content-publisher links are described. No published minimum traffic figure was verified.
Up to 10%, subject to the accepted agreement.
Published 30-day cookie.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('ecs','eah','ECS Tuning','https://www.ecstuning.com/',array['www.ecstuning.com','ecstuning.com'],'Official affiliate application via Impact; written approval is required before activation.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('turner','eah','Turner Motorsport','https://www.turnermotorsport.com/',array['www.turnermotorsport.com','turnermotorsport.com'],'Official partner page. The EAH Impact route covers the ECS / Turner application workflow.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('fcp-euro','fcp-partnership','FCP Euro','https://www.fcpeuro.com/',array['www.fcpeuro.com','fcpeuro.com'],'Official brand-partnership request. A public sales-commission affiliate program was not confirmed.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('pelican','pelican-research','Pelican Parts','https://www.pelicanparts.com/',array['www.pelicanparts.com','pelicanparts.com'],'Public affiliate availability not confirmed. The retailer blocks automated page access; no bypass attempted.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('bimmerworld','bimmerworld-research','BimmerWorld','https://www.bimmerworld.com/',array['www.bimmerworld.com','bimmerworld.com'],'Relevant BMW specialist. A current official public affiliate application was not located.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('autohausaz','autohausaz-research','AutohausAZ','https://www.autohausaz.com/',array['www.autohausaz.com','autohausaz.com'],'Official contact route verified. Public affiliate terms and application not confirmed.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('rockauto','rockauto-research','RockAuto','https://www.rockauto.com/',array['www.rockauto.com','rockauto.com'],'No current official commission application confirmed. Retailer cautions against marketplace/affiliate impersonation; third-party listings are not approval evidence.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('garagistic','garagistic-ambassador','Garagistic','https://www.garagistic.com/',array['www.garagistic.com','garagistic.com'],'Official ambassador application with referral links after approval.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('condor','condor-sponsorship','Condor Speed Shop','https://www.condorspeedshop.com/',array['www.condorspeedshop.com','condorspeedshop.com'],'Official sponsorship information; a general commission affiliate contract was not confirmed.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('ireland','ireland-research','Ireland Engineering','https://www.iemotorsport.com/',array['www.iemotorsport.com','iemotorsport.com'],'Classic BMW restoration/performance supplier lead. No official public affiliate application confirmed.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('redline','redline-research','Redline Auto Parts','https://www.redlineautoparts.com/',array['www.redlineautoparts.com','redlineautoparts.com'],'Used-parts/dismantler lead. No official public commission program confirmed; E34 stock must be checked per product.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('autodoc','autodoc-research','AUTODOC','https://www.autodoc.co.uk/',array['www.autodoc.co.uk','autodoc.co.uk'],'European retailer lead. Regional publisher enrollment, current network, feed rights and restrictions need official confirmation.') on conflict(id) do nothing;
insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values('kc-tool','kc-tool-refersion','KC Tool','https://kctool.com/',array['kctool.com','www.kctool.com'],'Official Refersion affiliate enrollment link.') on conflict(id) do nothing;
