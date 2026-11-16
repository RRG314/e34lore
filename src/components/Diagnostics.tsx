"use client";
import { track } from "../analytics/client";
import { useState } from "react";
import { ArrowRight, ArrowLeft, RotateCcw, ClipboardList, ArrowUpRight } from "lucide-react";
import { DocumentLink } from "./DocumentLink";
import { e30DiagnosticFlows } from "../series/e30-diagnostics";
import { diagnosticFlows } from "../domain/diagnostics";
import { manualChapters } from "../data/manual";
import { quickSymptoms } from "../data/catalog";
import { useApp } from "./context";
import { PageIntro, Tag, Notice, Icon } from "./common";
import { RelatedDiscussions } from "./RelatedDiscussions";
export function DiagnosticPage({
  initialSymptom,
}: {
  initialSymptom?: string;
}) {
  const { vehicle, series } = useApp();
  const flows = series === "e30" ? e30DiagnosticFlows : diagnosticFlows;
  const [symptom, setSymptom] = useState(
      initialSymptom && flows[initialSymptom]
        ? initialSymptom
        : "overheating",
    ),
    [history, setHistory] = useState<{ id: string; answer: string }[]>([]),
    [note, setNote] = useState("");
  const flow = flows[symptom],
    current = history.length
      ? flow.find((n) => n.id === history[history.length - 1].id)!
      : flow[0];
  const sourceChapter = /\bBentley (\d{3})\b/.exec(current.source)?.[1];
  const path = history.map((h, i) => ({
    question:
      i === 0
        ? flow[0].question
        : flow.find((n) => n.id === history[i - 1].id)!.question,
    answer: h.answer,
  }));
  const summary =
    "Symptom: " +
    quickSymptoms.find((s) => s.id === symptom)?.title +
    "\n" +
    path.map((x) => x.question + "\nObservation: " + x.answer).join("\n\n") +
    "\n\nMy observations: " +
    note +
    "\n\nNext assessment: " +
    (current.outcome || "Investigation in progress.");
  return (
    <div className="page">
      <PageIntro
        eyebrow="THE DIAGNOSTIC WORKBENCH"
        title="Symptom diagnosis."
        description="Select a symptom, record test observations and attach the results to a technical discussion."
      />
      <div className="diagnostic-layout">
        <aside className="filter-sidebar">
          <span className="eyebrow">CHOOSE A SYMPTOM</span>
          {quickSymptoms.map((s) => (
            <button
              key={s.id}
              className={s.id === symptom ? "selected" : ""}
              onClick={() => {
                setSymptom(s.id);
                setHistory([]);
                setNote("");
              }}
            >
              <Icon
                name={
                  s.system === "cooling"
                    ? "thermometer"
                    : s.system === "brakes"
                      ? "disc"
                      : "wrench"
                }
                size={19}
              />
              {s.title}
            </button>
          ))}
          <p className="small muted">
            {series === "e30" ? "Record the symptoms and check the manual for your configuration." : "Cooling is a sourced triage flow. Other branches help record observations for further assessment."}
          </p>
        </aside>
        <section className="diagnostic-main">
          <div className="diagnostic-heading">
            <Tag>
              {vehicle.model
                ? [vehicle.model, vehicle.engine].filter(Boolean).join(" / ")
                : "VEHICLE NOT YET SELECTED"}
            </Tag>
            <span>
              OBSERVATION {String(history.length + 1).padStart(2, "0")}
            </span>
            <button className="text-link" onClick={() => setHistory([])}>
              <RotateCcw size={14} />
              Restart
            </button>
          </div>
          <h2>{current.question}</h2>
          <Notice tone={current.id === "stop" ? "warning" : "info"}>
            {current.note}
          </Notice>
          {current.choices.length ? (
            <div className="diagnostic-choices">
              {current.choices.map((c, i) => (
                <button
                  key={c.label}
                  onClick={() => {track('diagnostic_step','diagnostic:'+symptom,{value:history.length+1});if(!flow.find(n=>n.id===c.next)?.choices.length)track('diagnostic_complete','diagnostic:'+symptom);setHistory(h=>[...h,{id:c.next,answer:c.label}]);}}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  {c.label}
                  <ArrowRight size={19} />
                </button>
              ))}
            </div>
          ) : (
            <div className="diagnostic-outcome">
              <span className="eyebrow">YOUR NEXT STEP</span>
              <p>{current.outcome}</p>
              {current.assembly && (
                <DocumentLink
                  className="button outline"
                  href={"/parts?assembly=" + current.assembly}
                >
                  Understand the assembly
                  <ArrowUpRight size={17} />
                </DocumentLink>
              )}
            </div>
          )}
          <div className="source-line">
            Source ·{" "}
            {current.sourceHref ? <DocumentLink href={current.sourceHref}>{current.source} ↗</DocumentLink> : manualChapters.some((chapter) => chapter.id === sourceChapter) ? (
              <a href={"/manual/" + sourceChapter}>{current.source} ↗</a>
            ) : series === "e30" ? <DocumentLink href="/manual">{current.source} ↗</DocumentLink> : current.source}
          </div>
          {history.length > 0 && (
            <button
              className="back-link"
              onClick={() => setHistory((h) => h.slice(0, -1))}
            >
              <ArrowLeft size={16} />
              Previous observation
            </button>
          )}
          <label className="observation-notes">
            Add what you’ve observed
            <textarea
              rows={4}
              value={note}
              maxLength={5000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="When it happens, recent work, visible findings, warning lamps…"
            />
          </label>
          <div className="form-actions">
            <a
              className="button primary"
              href={
                "/community/new?symptom=" +
                symptom +
                "&component=" +
                quickSymptoms.find((s) => s.id === symptom)!.system + "&series=" + series
              }
              onClick={() =>
                sessionStorage.setItem(
                  "e34.diagnostic.handoff.v1",
                  JSON.stringify({ symptom, summary, observations: path }),
                )
              }
            >
              Ask with this evidence
              <ArrowUpRight size={17} />
            </a>
            <button
              className="button quiet"
              onClick={() => {
                const blob = new Blob([summary], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "e34-" + symptom + "-observations.txt";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download notes
            </button>
          </div>
        </section>
        <aside className="investigation-record">
          <ClipboardList size={23} />
          <h3>Your investigation</h3>
          <p>
            {path.length
              ? "The observations you’ve recorded so far."
              : "Your choices will build an observation record here."}
          </p>
          <ol>
            {path.map((p, i) => (
              <li key={i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <small>{p.question}</small>
                  <strong>{p.answer}</strong>
                </div>
              </li>
            ))}
          </ol>
          <div className="small muted">
            A suggested next test is not a confirmed failed component. No
            diagnosis or fitment is certified by this flow.
          </div>
        </aside>
      </div>
      <RelatedDiscussions kind="diagnostic" id={symptom} />
    </div>
  );
}
