"use client";
import { lazy, Suspense, useState } from "react";
import { Search, ArrowUpRight, Menu, X, UserRound, ChevronRight, ScanLine } from "lucide-react";
import { previewFeatures } from "../release/features";
import { demoAssets, demoBackend } from "../lib/backend";
import { defaultSeries, seriesDefinitions, seriesHref, seriesIds, type Series } from "../series/registry";
import { vehicleSeriesEnabled } from "../series/availability";
import { OemNavigation } from "./OemNavigation";
import { AppProvider, useApp } from "./context";
import { useOwnedCars } from "../vehicle/use-owned-cars";
import { requestedComponent } from "../servicing/context";
import { VehiclePicker } from "./VehiclePicker";
import { AppRegistration, InstallApp } from "./InstallApp";
import { RepairJobPage } from '../repair/RepairLibrary';
import { ManualLibrary } from "./ManualLibrary";
import { QuickReference } from "./QuickReference";
import { ElectricalReference } from "./ElectricalReference";
import { AdvertisingSlot, PartnershipPolicy, usePublicAdvertising } from "./Commercial";
import { DocumentLink } from "./DocumentLink";
import { CommunityNavigation } from './CommunityNavigation';
import { SitePolicies } from './SitePolicies';
const PublicBuilds=lazy(()=>import('../build-studio/PublicBuilds').then(m=>({default:m.PublicBuilds})));
const SpecialistDirectory=lazy(()=>import('./SpecialistDirectory').then(m=>({default:m.SpecialistDirectory})));
const Roadmap=lazy(()=>import('./Roadmap').then(m=>({default:m.Roadmap})));
const SupportPage=lazy(()=>import('./SupportPage').then(m=>({default:m.SupportPage})));
const SupportInbox=lazy(()=>import('./SupportInbox').then(m=>({default:m.SupportInbox})));
const SecurityStatus = lazy(()=>import("./SecurityStatus").then(m=>({default:m.SecurityStatus})));
const AffiliateDashboard = lazy(()=>import("./AffiliateDashboard").then(module=>({default:module.AffiliateDashboard})));
const OwnerDashboard = lazy(() =>
  import("./OwnerDashboard").then((module) => ({
    default: module.OwnerDashboard,
  })),
);
import { FeaturedCars } from "./CarShowcase";
import { Analytics } from "../analytics/Analytics";
const AnalyticsDashboard=lazy(()=>import("../analytics/Dashboard").then(m=>({default:m.AnalyticsDashboard})));
const Scanner=lazy(()=>import('../scanner/Scanner').then(m=>({default:m.Scanner})));
const ScannerCredits=lazy(()=>import('../scanner/Review').then(m=>({default:m.ScannerCredits})));
const ScannerReview=lazy(()=>import('../scanner/Review').then(m=>({default:m.ScannerReview})));
const VehicleConfiguration=lazy(()=>import('../vehicle/VehicleConfiguration').then(m=>({default:m.VehicleConfiguration})));
const VinRegistry=lazy(()=>import('../vehicle/VinRegistry').then(m=>({default:m.VinRegistry})));
import { UsageAnalytics } from "./UsageAnalytics";
import { Home } from "./Home";
import { ReferencePage, RepairPage, GuidePage, ResourcesPage, ArticlePage, ModelPage, SearchPage } from "./Reference";
import { PartsPage } from "./Parts";
const CatalogBrowser=lazy(()=>import("./CatalogBrowser").then(m=>({default:m.CatalogBrowser})));
const Interchange=lazy(()=>import("./Interchange").then(m=>({default:m.Interchange})));
const ReferenceWorkshop=lazy(()=>import("../digital-twin/public/WorkshopExplorer").then(m=>({default:m.WorkshopExplorer})));
const PrivateWorkshop=lazy(()=>import("../digital-twin/public/PrivateWorkshop").then(m=>({default:m.PrivateWorkshop})));
import { parts } from "../data/catalog";
import { CommunityPage, ThreadPage } from "./Community";
import { GaragesPage, ShopComingSoon } from "./Garages";
import { EditorialLibrary, EditorialTopic } from "./CommunityFeatures";
import { CommunityPolicies, CommunitySettings, CommunityAdministration } from "./CommunityGovernance";
import { GaragePage, AccountPage, AdminPage } from "./Owner";
import { DiagnosticPage } from "./Diagnostics";

const links = [
  ["Workshop", "/workshop"],
  ["Quick reference", "/quick-reference"],
  ...(previewFeatures.scanner ? [["Part Scanner", "/scanner"]] : []),
  ["OEM reference", "/parts/catalog"],
  ["Wiring & Electrical", "/electrical"],
  ["Community", "/community"],
];
function Site({
  path,
  query,
}: {
  path: string[];
  query: Record<string, string | undefined>;
}) {
  const [menu, setMenu] = useState(false);
  const { user, authRevision, series } = useApp();
  const brand = seriesDefinitions[series];
  const owned = useOwnedCars();
  const accountKey = user?.id || "signed-out";
  const staffSessionKey = accountKey + ":" + authRevision;
  const section = path[0] || "";
  const publicPath=section === "garage" ? "/"+path.join("/") : seriesHref("/"+path.join("/"), series);
  const advertisements=usePublicAdvertising(publicPath);
  const sharedSection = ["community", "garages", "builds", "garage", "account"].includes(section);
  return (
    <>
      <AppRegistration />
      <DocumentLink href="#main" className="skip-link">
        Skip to content
      </DocumentLink>
      <div className="masthead">
        <span>{sharedSection && vehicleSeriesEnabled ? "BMW E30 & E34 LORE" : "BMW " + series.toUpperCase() + " TECHNICAL REFERENCE"}</span>
        <DocumentLink href="/manual">
          Service manual
          <ArrowUpRight size={12} />
        </DocumentLink>
      </div>
      <header className="site-header">
        {vehicleSeriesEnabled ? <nav className="generation-brands" aria-label="BMW series">
          {seriesIds.map(id => <a key={id} href={seriesHref("/", id)} aria-current={series === id ? "location" : undefined}>
            <img src={seriesDefinitions[id].grille} alt="" width={96} height={22}/>{seriesDefinitions[id].name}
          </a>)}
        </nav> : <DocumentLink className="brand" href="/" aria-label="E34 Lore home">
          <img className="grille-brand-mark" src="/brand/e34-grille.svg" alt="" width={96} height={28}/>
          <span className="brand-type">
            E34 LORE<small>REFERENCE · COMMUNITY</small>
          </span>
        </DocumentLink>}
        <nav
          aria-label="Main navigation"
          className={menu ? "main-nav open" : "main-nav"}
        >
          {links.map(([text, href]) => {
            const active=(href==="/parts/catalog"?section==="parts":section===href.split("/")[1]) ||
              (href==="/community"&&["garages","builds"].includes(section));
            return (
            <DocumentLink
              key={href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
              href={href}
            >
              {text}
            </DocumentLink>
            );
          })}
          <DocumentLink className="narrow-garage-link" href="/garage">
            My garage
          </DocumentLink>
        </nav>
        <div className="header-actions">
          {previewFeatures.scanner&&<DocumentLink className="icon-button mobile-scanner" aria-label="Part Scanner" title="Part Scanner" href="/scanner"><ScanLine size={21}/></DocumentLink>}
          <DocumentLink
            className="icon-button global-search"
            aria-label="Search the site"
            href="/search"
          >
            <Search size={20} />
          </DocumentLink>
          <DocumentLink className="garage-link" href="/garage">
            My garage
            <ArrowUpRight size={15} />
          </DocumentLink>
          <DocumentLink
            className="account-button"
            href="/account"
            aria-label={user ? "Your account" : "Sign in"}
          >
            <UserRound size={18} />
          </DocumentLink>
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {demoAssets && <p className="context-bar demo-notice">
        Demo · Sample models and parts. {demoBackend && "Sign-in and saving require a local database."}
      </p>}
      {!sharedSection&&<div className="context-bar">
        <VehiclePicker />
        <DocumentLink href="/resources">
          Source library
          <ArrowUpRight size={14} />
        </DocumentLink>
      </div>}
      <main id="main" tabIndex={-1}>
        {['community','garages','builds'].includes(section) && <CommunityNavigation section={section==='community'?path[1]:section}/>}
        {section === "parts" && <OemNavigation section={path[1]} series={series}/>}
        <AdvertisingSlot ads={advertisements} placement="public_top" path={publicPath}/>
        {section === "" ? (
          <Home />
        ) : section === "scanner" && previewFeatures.scanner ? (<Suspense fallback={<p className="page">Loading component identification…</p>}>{path[1]==="credits"?<ScannerCredits/>:<Scanner key={accountKey} initialComponent={requestedComponent(query)}/>}</Suspense>
        ) : section === "garage" && path[1]==="vins" ? (<Suspense fallback={<p className="page">Loading your VIN registry…</p>}><VinRegistry key={accountKey} initialCar={query.vehicle}/></Suspense>
        ) : section === "garage" && path[1]==="configuration" && previewFeatures.vehicleConfiguration ? (<Suspense fallback={<p className="page">Loading your vehicle configuration…</p>}><VehicleConfiguration key={accountKey + ":" + owned.activeId}/></Suspense>
        ) : section === "manual" ? (
          <ManualLibrary chapterId={path[1]} initialQuery={query.q} pdfPage={query.pdf}/>
        ) : section === "quick-reference" ? (
          <QuickReference section={path[1]} query={query} />
        ) : section === "electrical" ? (
          <ElectricalReference key={series} initialQuery={query.q}/>
        ) : section === "encyclopedia" ? (
          <ReferencePage initialSystem={query.system} initialTab={query.tab} />
        ) : section === "models" ? (
          path[1] ? <ModelPage id={path[1]} /> : <ReferencePage initialTab="models" />
        ) : section === "articles" ? (
          <ArticlePage slug={path[1]} />
        ) : section === "repairs" ? (
          path[1] ? <RepairJobPage key={path[1]} id={path[1]} component={requestedComponent(query)} initialScan={query.scan}/> : <RepairPage
            initialQuery={query.q}
            initialSystem={query.system}
            track={query.track}
          />
        ) : section === "guides" ? (
          <GuidePage key={accountKey} slug={path[1]} revision={query.revision} component={requestedComponent(query)} />
        ) : section === "parts" ? (
          path[1]==="reference" && series === "e30" ? <ManualLibrary/> : path[1]==="interchange" ? <Suspense fallback={<p className="page">Loading interchange records…</p>}><Interchange initialPart={query.part}/></Suspense> : path[1] === "catalog" ||
          (series === "e30" || !path[1] && !query.assembly && !query.part) ||
          (query.part && !parts.some((p) => p.id === query.part)) ? (
            <Suspense fallback={<p className="loading-state">Loading the parts catalog…</p>}><CatalogBrowser
              initialPart={query.part}
              initialPosition={query.position}
            /></Suspense>
          ) : (
            <PartsPage
              initialAssembly={query.assembly}
              initialPart={query.part}
            />
          )
        ) : section === "workshop" ? (
          <Suspense fallback={<p className="page">Loading the workshop…</p>}>
            {path[1]==="assets"||path[1]==="inspections"||!!query.configuration_revision?<PrivateWorkshop key={staffSessionKey} archive={!!query.configuration_revision&&path[1]!=="assets"&&path[1]!=="inspections"} assets={path[1]==="assets"} initialPart={query.part} initialNode={query.node} initialRevisionId={query.configuration_revision}/>:<ReferenceWorkshop buildMode={query.mode==='build'} buildProject={query.project} workshopMode={query.mode} initialService={query.service} repairComponent={query.mode==='repair'?requestedComponent(query):undefined} key={accountKey} diagrams={query.tab==="diagrams"} repairMode={series === "e34" && previewFeatures.interactiveRepairs && path[1]==="repair" && query.task!=="center-support-bearing"} repairTask={series === "e34" && path[1]==="repair"?query.task:undefined} initialVehicle={query.vehicle} initialScan={query.scan} initialPart={query.part} initialNode={query.node} initialSystem={query.system} initialCatalogPosition={query.catalog_position} initialModelRevision={query.model_revision} initialReference={query.reference}/>}
          </Suspense>
        ) : section === "diagnostics" ? (
          <DiagnosticPage initialSymptom={query.symptom} />
        ) : section === "builds" ? (<Suspense fallback={<p className="page">Loading builds…</p>}><PublicBuilds key={accountKey} id={path[1]}/></Suspense>) : section === "garages" ? (
          <GaragesPage ownerId={path[1]} entryId={path[2]} />
        ) : section === "shop" || section === "marketplace" ? (
          <ShopComingSoon exchange={section === "marketplace"} />
        ) : section === "community" ? (
          path[1] === 'specialists' ? (<Suspense fallback={<p className="page">Loading BMW specialists…</p>}><SpecialistDirectory/></Suspense>) : path[1] === "cars" ? (
            <FeaturedCars />
          ) : path[1] === "garages" ? (
            <GaragesPage />
          ) : path[1] === "topics" ? (
            path[2] ? (
              <EditorialTopic slug={path[2]} />
            ) : (
              <EditorialLibrary />
            )
          ) : path[1] === "issues" ? (
            <EditorialLibrary issues />
          ) : path[1] === "policies" ? (
            <CommunityPolicies />
          ) : path[1] === "settings" ? (
            <CommunitySettings key={accountKey} />
          ) : path[1] === "admin" ? (
            <CommunityAdministration key={staffSessionKey} />
          ) : path[1] ? (
            <ThreadPage id={path[1]} boardQuery={query} />
          ) : (
            <CommunityPage boardQuery={query}/>
          )
        ) : section === "app" ? (
          <InstallApp />
        ) : section === "garage" ? (
          <GaragePage key={accountKey} />
        ) : section === "account" ? (
          <AccountPage key={accountKey} />
        ) : section === "roadmap" ? (<Suspense fallback={<p className="page">Loading the roadmap…</p>}><Roadmap/></Suspense>
        ) : section === "support" ? (<Suspense fallback={<p className="page">Loading support…</p>}><SupportPage key={accountKey} category={query.category} reference={query.reference}/></Suspense>
        ) : section === "manage" ? (
          <Suspense fallback={<p className="page">Loading site management…</p>}>
            {path[1]==="scanner"?<ScannerReview key={staffSessionKey}/>:path[1]==="analytics"?<AnalyticsDashboard key={staffSessionKey}/>:path[1]==="security"?<SecurityStatus key={staffSessionKey}/>:path[1]==="support"?<SupportInbox key={staffSessionKey} initialTicket={query.ticket}/>:path[1]==="partners"?<AffiliateDashboard key={staffSessionKey}/>:path[1]==="models"?<PrivateWorkshop key={staffSessionKey} assets/>:<OwnerDashboard key={staffSessionKey} />}
          </Suspense>
        ) : section === "admin" ? (
          <AdminPage key={staffSessionKey} />
        ) : section === 'terms' || section === 'privacy' || section === 'copyright' ? (
          <SitePolicies page={section}/>
        ) : section === "resources" ? (
          <ResourcesPage initialChapter={query.chapter} />
        ) : section === "partnerships" ? (
          <PartnershipPolicy/>
        ) : section === "search" ? (
          <SearchPage initialQuery={query.q} />
        ) : (
          <div className="page">
            <h1>Page not found.</h1>
            <DocumentLink href="/">
              Return to home <ChevronRight size={16} />
            </DocumentLink>
          </div>
        )}
        <AdvertisingSlot ads={advertisements} placement="public_bottom" path={publicPath}/>
      </main>
      <UsageAnalytics path={publicPath}/>
      <Analytics path={publicPath} privateView={!!query.configuration_revision||path[1]==="repair"}/>
      <footer>
        <div className="footer-main">
          <DocumentLink className="footer-brand" href="/">
            <img src={brand.grille} alt="" width={104} height={30}/><span>{brand.name.toUpperCase()}</span>
          </DocumentLink>
          <p>
            Independent service reference.
            <br />
            {brand.designation} {series.toUpperCase()}.
          </p>
          <DocumentLink href={series === "e30" ? "/community/new?series=e30" : "/community/new"}>
            Add your experience
            <ArrowUpRight size={18} />
          </DocumentLink>
        </div>
        <div className="footer-bottom">
          <span>
            An independent enthusiast project. Not affiliated with BMW AG.
          </span>
          <nav className="footer-links" aria-label="Site information">
            <div><span>Reference</span><DocumentLink href="/manual">Mobile manual</DocumentLink><DocumentLink href="/quick-reference">Quick reference</DocumentLink><DocumentLink href="/resources#evidence">Evidence & coverage</DocumentLink><DocumentLink href="/resources#credits">Credits</DocumentLink></div>
            <div><span>Community & help</span><DocumentLink href="/community/specialists">BMW specialists</DocumentLink><DocumentLink href="/community/policies">Community guidelines</DocumentLink><DocumentLink href="/support">Contact & account help</DocumentLink><DocumentLink href="/app">Install E34 Lore</DocumentLink><DocumentLink href="/roadmap">Roadmap & coming soon</DocumentLink></div>
            <div><span>Site policies</span><DocumentLink href="/terms">Terms of use</DocumentLink><DocumentLink href="/privacy">Privacy & choices</DocumentLink><DocumentLink href="/copyright">Copyright & permissions</DocumentLink><DocumentLink href="/partnerships">Retailer links & ads</DocumentLink></div>
          </nav>
          <span className="footer-copyright">© 2026 E34 Lore, operating as E34 Lore. Eligible original work; contributor and third-party rights remain with their owners.</span>
        </div>
      </footer>
    </>
  );
}
export function Shell({
  path = [],
  query = {},
  series = defaultSeries,
}: {
  series?: Series;
  path?: string[];
  query?: Record<string, string | undefined>;
}) {
  return (
    <AppProvider series={series} seriesEnabled={vehicleSeriesEnabled}>
      <Site path={path} query={query} />
    </AppProvider>
  );
}
