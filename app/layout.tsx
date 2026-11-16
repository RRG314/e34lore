import type { Metadata } from "next";
import "./globals.css";
import "./community.css";
import "./lore.css";
import "./quick-reference.css";
import "./commerce.css";
import "./home-refresh.css";
import "./support.css";
import "./scanner.css";
import './public-reference.css';
import { socialImage } from "../src/lib/site-metadata";

export const metadata: Metadata = {
  metadataBase: new URL("https://e34lore.com"),
  title: "E34 Lore — BMW E34 Technical Reference",
  description:
    "BMW E34 parts diagrams, service references, diagnostic discussions and owner maintenance records.",
  openGraph: {
    title: "E34 Lore",
    description: "BMW E34 repairs, OEM drawings and owner projects.",
    siteName: "E34 Lore",
    type: "website",
    url: "/",
    images: [socialImage],
  },
  twitter: { card: "summary_large_image" },
  manifest: "/manifest.webmanifest",
  appleWebApp: {capable:true,title:"E34 Lore",statusBarStyle:"default"},
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icons/e34-grille-192.png",
  },
};

export const viewport = {width:"device-width",initialScale:1,themeColor:"#252e29"};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Ownership verification only. These tags do not load advertising or tracking scripts. */}
        <meta name="impact-site-verification" content="7cc7aeee-0cdb-44ef-a9d8-ad4e7f91c7e5" {...{value: "7cc7aeee-0cdb-44ef-a9d8-ad4e7f91c7e5"}} />
        <meta name="google-adsense-account" content="ca-pub-8181130301726385" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
