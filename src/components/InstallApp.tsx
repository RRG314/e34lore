"use client";
import { DocumentLink } from "./DocumentLink";

import { useEffect, useState } from "react";
import { PageIntro, Notice } from "./common";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function AppRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
  }, []);
  return null;
}
export function useAppInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [installed, setInstalled] = useState(false),
    [status, setStatus] = useState("");
  useEffect(() => {
    const check = () =>
      setInstalled(matchMedia("(display-mode: standalone)").matches);
    const ready = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    check();
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  async function install(){if(!prompt)return;try{await prompt.prompt();const choice=await prompt.userChoice;setStatus(choice.outcome==='accepted'?'Installation accepted.':'You can install later from your browser menu.');}catch{setStatus('Use your browser’s Install app or Add to Home Screen option.');}finally{setPrompt(null);}}
  return{prompt,installed,status,install};
}
export function InstallApp(){
 const{prompt,installed,status,install}=useAppInstall();
  return (
    <div className="page">
      <PageIntro
        eyebrow="E34 LORE / ON YOUR PHONE"
        title="E34 Lore on your phone."
        description="Open E34 Lore and E30 Lore from your home screen. Your account, private vehicle records and community are the same across the app and website."
      />
      <div className="install-app-layout">
        <section>
          <h2>Install E34 Lore</h2>
          {installed ? (
            <Notice>E34 Lore is running as an installed app.</Notice>
          ) : prompt ? (
            <button
              className="button primary"
              onClick={install}
            >
              Install app
            </button>
          ) : (
            <>
              <p>
                On Android, open this site in Chrome, open the browser menu,
                then choose <strong>Install app</strong> or{" "}
                <strong>Add to Home screen</strong>.
              </p>
              <p>
                On iPhone or iPad, open Safari’s Share menu and choose{" "}
                <strong>Add to Home Screen</strong>.
              </p>
            </>
          )}
          {status && <p role="status">{status}</p>}
          <h3>Use it in the workshop</h3>
          <p>
            Scan parts, plan a build, keep a restoration journal and
            open discussions with the relevant step attached. A connection is
            required to load reference pages and account records.
          </p>
          <DocumentLink className="button outline" href="/garage">
            Open My Garage ↗
          </DocumentLink>
        </section>
        <aside className="source-box">
          <div>
            <h3>Privacy on shared devices</h3>
            <p>
              Private pages and account responses are not cached for offline use.
              Scan photos and unsaved build edits may be kept on this device.
            </p>
            <p>
              <DocumentLink href="/community/policies">Privacy and community policies</DocumentLink> ·{" "}
              <DocumentLink href="/account">Account settings & deletion</DocumentLink>
            </p>

          </div>
        </aside>
      </div>
    </div>
  );
}
