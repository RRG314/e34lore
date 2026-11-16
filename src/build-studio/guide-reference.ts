import { guideRevision } from "../domain/walkthrough";
import { serviceGuide } from "../servicing/service";
export function pinBuildGuide(id: string) {
  const r = guideRevision(id);
  if (!r) throw Error("Choose an available walkthrough");
  return id + "::" + r.revision;
}
export function buildGuideIdentity(key: string) {
  const [id, revision] = key.split("::");
  return { id, revision };
}
export function buildGuideHref(key: string) {
  const { id, revision } = buildGuideIdentity(key);
  return (
    "/guides/" +
    encodeURIComponent(id) +
    (revision ? "?revision=" + encodeURIComponent(revision) : "")
  );
}
export function buildServiceGuide(key: string) {
  const { id, revision } = buildGuideIdentity(key);
  return serviceGuide(id, revision);
}
