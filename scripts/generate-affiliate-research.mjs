import fs from 'node:fs';
const leads = JSON.parse(fs.readFileSync(new URL('../src/data/affiliate-research.json',import.meta.url),'utf8'));
const profile = JSON.parse(fs.readFileSync(new URL('../src/data/affiliate-application.json',import.meta.url),'utf8'));
const sql = value => value == null ? 'null' : "'"+String(value).replaceAll("'","''")+"'";
const lines = ['-- Factual research leads and observed application states. No program or retailer is approved by this seed.'];
for (const [id,name,url,notes] of [
 ['impact','Impact','https://impact.com/','EAH application in review; no approved commercial links.'],
 ['cj','CJ Affiliate','https://www.cj.com/','Research directory; no retailer approval or publisher enrollment claimed.'],
 ['awin','Awin','https://www.awin.com/','ShareASale closed in October 2025. Historical listings require current Awin confirmation.'],
 ['refersion','Refersion','https://www.refersion.com/','KC Tool uses this enrollment route; E34 Lore has not enrolled.'],
 ['direct','Direct partnership','https://e34lore.com/','Retailer-specific written agreements required.'],
 ['google','Google AdSense','https://adsense.google.com/','Ownership and customer-information steps completed. Review requested; no ad script enabled.'],
]) lines.push(`insert into e34_private.affiliate_networks(id,name,website_url,notes) values(${[id,name,url,notes].map(sql).join(',')});`);
const programs = [...new Map(leads.map(x=>[x.program_id,x])).values()];
for(const lead of programs) {
 const name=lead.program_id==='eah'?'Enthusiast Auto Holdings — ECS / Turner':lead.name;
 const status=lead.program_id==='eah'?'under_review':['fcp-euro','kc-tool'].includes(lead.id)?'application_prepared':'researching';
 const rules=[lead.availability,lead.eligibility,lead.commission,lead.attribution,'Deep links, feeds, geographic and payment rules need the actual approved agreement.'].join('\n');
 lines.push(`insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values(${[lead.program_id,lead.network_id,name,lead.application,lead.source,status,rules].map(sql).join(',')});`);
 const required='Verify current eligibility and written terms. Owner supplies legal identity, address, payment and tax details directly to the provider. No credentials belong in this workspace.';
 lines.push(`insert into e34_private.affiliate_applications(program_id,status,description,audience,placements,traffic_statement,required_information,introduction,owner_notes) values(${[lead.program_id,status,profile.description,profile.audience,profile.placements,profile.traffic_statement,required,profile.introduction,lead.program_id==='eah'?'Impact website connected and profile saved. Application visibly In Review on 7 November 2026.':lead.availability].map(sql).join(',')});`);
}
for(const lead of leads) {
 const host=new URL(lead.website).hostname;
 const hosts=[...new Set([host,host.startsWith('www.')?host.slice(4):'www.'+host])];
 lines.push(`insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values(${[lead.id,lead.program_id,lead.name,lead.website].map(sql).join(',')},array[${hosts.map(sql).join(',')}],${sql(lead.availability)});`);
}
lines.push("insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values('google-adsense','google','Google AdSense','https://adsense.google.com/','https://support.google.com/adsense/answer/12169212','under_review','Review requested. Ownership verified and customer information completed by the owner. Verification tags and ads.txt are not ad-serving code. No advertising is enabled.');");
lines.push(`insert into e34_private.affiliate_applications(program_id,status,description,audience,placements,traffic_statement,required_information,introduction,owner_notes,submitted_at) values('google-adsense','under_review',${[profile.description,profile.audience,profile.placements,profile.traffic_statement,'Owner completed customer information directly in Google. Approval and any required certified consent configuration remain external.',profile.introduction,'Google displayed Review requested, Getting ready, and all setup steps completed on 7 November 2026.'].map(sql).join(',')},now());`);
lines.push("update e34_private.commercial_settings set adsense_status='under_review',adsense_notes='Ownership verified, review requested and payee setup completed by owner on 7 November 2026. No ad script or Auto ads has been deployed.' where id='site';");
fs.writeFileSync(new URL('../database/affiliate-research-seed.sql',import.meta.url),lines.join('\n')+'\n');
console.log(`Prepared ${programs.length+1} program/application records and ${leads.length} inactive retailer leads.`);
