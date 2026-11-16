"use client";
import type { Series } from "../series/registry";
import { DocumentLink } from "./DocumentLink";
export const oemSections = [
  { id: "catalog", title: "Catalog & diagrams", href: "/parts/catalog" },
  { id: "interchange", title: "Interchange & replacements", href: "/parts/interchange" },
  { id: "reference", title: "Service figures", href: "/parts/reference" },
] as const;
export function OemNavigation({ section, series = "e34" }: { section?: string; series?: Series }) {
  const active = section === "interchange" ? "interchange" : section === "reference" ? "reference" : "catalog";
  return <nav className="oem-navigation page" aria-label="OEM reference sections">
    {oemSections.map(item => <DocumentLink key={item.id} href={series === "e30" && item.id === "reference" ? "/manual" : item.href} aria-current={item.id === active ? "page" : undefined}>{item.title}</DocumentLink>)}
  </nav>;
}
