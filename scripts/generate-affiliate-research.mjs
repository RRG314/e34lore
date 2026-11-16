import fs from 'node:fs';

const leads = JSON.parse(fs.readFileSync(new URL('../src/data/affiliate-research.json', import.meta.url), 'utf8'));
const sql = value => value == null ? 'null' : "'" + String(value).replaceAll("'", "''") + "'";
const lines = ['-- Optional retailer research directory. Applications and approvals are configured by the operator.'];
const networks = [
  ['impact', 'Impact', 'https://impact.com/'],
  ['cj', 'CJ Affiliate', 'https://www.cj.com/'],
  ['awin', 'Awin', 'https://www.awin.com/'],
  ['refersion', 'Refersion', 'https://www.refersion.com/'],
  ['direct', 'Direct partnership', null],
  ['google', 'Google AdSense', 'https://adsense.google.com/'],
];

for (const network of networks) {
  lines.push('insert into e34_private.affiliate_networks(id,name,website_url) values(' +
    network.map(sql).join(',') + ') on conflict(id) do nothing;');
}

const programs = [...new Map(leads.map(lead => [lead.program_id, lead])).values()];
for (const lead of programs) {
  const name = lead.program_id === 'eah' ? 'Enthusiast Auto Holdings — ECS / Turner' : lead.name;
  const rules = [lead.availability, lead.eligibility, lead.commission, lead.attribution].join('\n');
  lines.push('insert into e34_private.affiliate_programs(id,network_id,name,application_url,official_source_url,status,rules) values(' +
    [lead.program_id, lead.network_id, name, lead.application, lead.source, 'researching', rules].map(sql).join(',') +
    ') on conflict(id) do nothing;');
}

for (const lead of leads) {
  const host = new URL(lead.website).hostname;
  const hosts = [...new Set([host, host.startsWith('www.') ? host.slice(4) : 'www.' + host])];
  lines.push('insert into e34_private.affiliate_merchants(id,program_id,name,website_url,allowed_hosts,notes) values(' +
    [lead.id, lead.program_id, lead.name, lead.website].map(sql).join(',') +
    ',array[' + hosts.map(sql).join(',') + '],' + sql(lead.availability) +
    ') on conflict(id) do nothing;');
}

fs.writeFileSync(new URL('../database/affiliate-research-seed.sql', import.meta.url), lines.join('\n') + '\n');
console.log('Prepared ' + programs.length + ' research programs and ' + leads.length + ' retailer records.');
