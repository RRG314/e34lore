import { DocumentLink } from "../src/components/DocumentLink";
export default function NotFound() {
  return (
    <main className="page narrow">
      <DocumentLink href="/" className="brand">
        E34 LORE
      </DocumentLink>
      <div className="page-intro" style={{ marginTop: 80 }}>
        <div>
          <div className="eyebrow">404 / OUTSIDE THE WORKSHOP</div>
          <h1>That page isn’t here.</h1>
          <p>
            Head back to the workshop, search for a component, or bring your
            question to the collective.
          </p>
        </div>
      </div>
      <DocumentLink className="button primary" href="/">
        Back to the workshop
      </DocumentLink>
    </main>
  );
}
