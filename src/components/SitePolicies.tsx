"use client";
import {Mail, ArrowUpRight} from 'lucide-react';
import {PageIntro} from './common';
import {DocumentLink} from './DocumentLink';
import {UsageConsent} from './UsageAnalytics';
import {AnalyticsPreferences} from '../analytics/Analytics';
import {CommercialConsent} from './Commercial';
import {terms, privacy, copyright, operator, policyRevision} from '../site/policies';
import contact from '../site/contact.json';

export type PolicyPage = 'terms' | 'privacy' | 'copyright';
export function PublicContact({subject='E34 Lore enquiry'}:{subject?:string}) {
  return contact.publicEmail ? <a className="text-link" href={'mailto:'+contact.publicEmail+'?subject='+encodeURIComponent(subject)}><Mail size={16}/>{contact.publicEmail}</a> : <p>For a concern about published community material, use its Report control. Account holders can also use Community settings for a private moderation appeal.</p>;
}
export function ContributionNotice(){
  return <p className="small muted contribution-notice">Share material you created or have permission to use. By submitting new content, you allow E34 Lore to host it and display it with the visibility you choose. <DocumentLink href="/terms#contributions">Contribution terms</DocumentLink> · <DocumentLink href="/privacy">Privacy</DocumentLink>.</p>;
}
export function SitePolicies({page}:{page:PolicyPage}){
  const content={terms,privacy,copyright}[page];
  const title={terms:'Terms of use.',privacy:'Privacy & your information.',copyright:'Copyright & permissions.'}[page];
  return <div className="page policies-page site-policy"><PageIntro eyebrow="E34 LORE / SITE POLICIES" title={title} description={'Operated by '+operator+'. Updated '+policyRevision+'.'}/>
    <nav className="community-navigation" aria-label="Site policies">{(['terms','privacy','copyright'] as const).map(item=><DocumentLink key={item} href={'/'+item} aria-current={page===item?'page':undefined}>{item==='terms'?'Terms of use':item==='privacy'?'Privacy':'Copyright'}</DocumentLink>)}<DocumentLink href="/community/policies">Community guidelines</DocumentLink><DocumentLink href="/resources#credits">Credits</DocumentLink></nav>
    <nav className="policy-index" aria-label="On this page">{content.map(section=><a key={section.id} href={'#'+section.id}>{section.title}</a>)}{page==='privacy'&&<a href="#preferences">Privacy choices</a>}<a href="#contact">Contact</a></nav>
    {content.map(section=><section className="policy-section" id={section.id} key={section.id}><h2>{section.title}</h2>{section.paragraphs.map(p=><p key={p}>{p}</p>)}</section>)}
    {page==='privacy'&&<><section className="policy-section privacy-preferences" id="preferences"><h2>Privacy choices</h2><p>Optional measurement starts off. These choices apply to this browser and can be changed at any time.</p><UsageConsent/><AnalyticsPreferences/><CommercialConsent/></section><section className="policy-section"><h2>Service-provider information</h2><p><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase privacy information</a> · <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Resend privacy information</a> · <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare privacy information</a></p><p>These providers have separate obligations for information processed for their own purposes. E34 Lore remains responsible for how it uses your application records.</p></section></>}
    {page==='copyright'&&<section className="policy-section"><h2>Further information</h2><p><a href="https://www.copyright.gov/circs/circ03.pdf" target="_blank" rel="noopener noreferrer">U.S. Copyright Office: copyright notices</a> · <a href="https://www.copyright.gov/512/" target="_blank" rel="noopener noreferrer">Copyright Office: online copyright concerns</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0</a></p></section>}
    <section className="policy-section" id="contact"><h2>Contact E34 Lore</h2><PublicContact subject={page==='copyright'?'Copyright':page==='privacy'?'Privacy request':'E34 Lore enquiry'}/><p>Use the subject to identify a copyright, privacy or account request. Include the affected page or account username. Do not send passwords or authentication codes.</p><DocumentLink className="text-link" href="/support">Contact and account help <ArrowUpRight size={14}/></DocumentLink></section>
    <section className="policy-section"><h2>Related information</h2><p><DocumentLink href="/resources#credits">Image, model and source credits</DocumentLink> · <DocumentLink href="/partnerships">Retailer links and advertising</DocumentLink> · <DocumentLink href="/resources#evidence">Technical evidence and coverage</DocumentLink></p></section>
  </div>;
}
