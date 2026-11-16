import { join } from "node:path";
import { siteContent } from "../scripts/site-content.mjs";

const content = siteContent();
export const releasePublic = content.publicDir;
export const hasReleasePack = content.release;
export const catalogSnapshot = (filename: string) =>
  join(content.catalogResearch ?? "data", "catalog-snapshots", filename);
