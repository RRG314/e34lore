"use client";
import { buildId } from "./id";
import { DocumentLink } from "../components/DocumentLink";
import {
  pinBuildGuide,
  buildGuideIdentity,
  buildGuideHref,
} from "./guide-reference";
import { track } from "../analytics/client";
import { useState } from "react";
import { manualGuides } from "../data/manual";
import {
  buildSystems,
  newTask,
  workStages,
  buildStateSchema,
  type BuildState,
  type BuildTask,
} from "./schema";
import { canVerifyTask } from "./dependencies";
type Props = {
  state: BuildState;
  edit: (f: (s: BuildState) => BuildState) => void;
};
export function ProgressPanel({ state, edit }: Props) {
  const [title, setTitle] = useState(""),
    [error, setError] = useState("");
  function update(id: string, patch: Partial<BuildTask>) {
    edit((s) => {
      const next = {
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      };
      if (!buildStateSchema.safeParse(next).success) {
        setError(
          "That dependency creates an invalid relationship. Choose another task.",
        );
        return s;
      }
      setError("");
      if (patch.status) track("build_progress", "/workshop");
      return next;
    });
  }
  return (
    <section className="build-fields">
      <h2>Work plan</h2>
      <p className="small muted">
        Progress is your work record. “Verified” means you recorded your own
        checks, not an independent safety approval.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || state.tasks.length >= 300) return;
          edit((s) => {
            s.tasks.push(newTask(title.trim()));
            return s;
          });
          setTitle("");
        }}
      >
        <label>
          New task
          <input
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <button className="button outline">Add task</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {state.tasks.map((t) => (
        <details className="build-task" key={t.id}>
          <summary>
            <span className={"build-stage " + t.status}>{t.status}</span>
            <strong>{t.title}</strong>
            {t.transferred && <small>Transferred to garage history</small>}
          </summary>
          <label>
            Task title
            <input
              value={t.title}
              maxLength={160}
              onChange={(e) => {
                if (e.target.value) update(t.id, { title: e.target.value });
              }}
            />
          </label>
          <div className="form-grid">
            <label>
              Status
              <select
                value={t.status}
                onChange={(e) =>
                  update(t.id, {
                    status: e.target.value as BuildTask["status"],
                  })
                }
              >
                {workStages.map((v) => (
                  <option
                    key={v}
                    disabled={
                      v === "verified" && !canVerifyTask(t, state.tasks)
                    }
                  >
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              System
              <select
                value={t.system}
                onChange={(e) =>
                  update(t.id, {
                    system: e.target.value as BuildTask["system"],
                  })
                }
              >
                {buildSystems.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input
                type="date"
                value={t.dueOn || ""}
                onChange={(e) =>
                  update(t.id, { dueOn: e.target.value || null })
                }
              />
            </label>
            <label>
              Completed date
              <input
                type="date"
                value={t.completedOn || ""}
                onChange={(e) =>
                  update(t.id, { completedOn: e.target.value || null })
                }
              />
            </label>
          </div>
          {!canVerifyTask(t, state.tasks) && (
            <p className="small">
              Verify the prerequisite tasks before marking this task verified.
            </p>
          )}
          <label>
            Linked component
            <select
              value={t.componentId || ""}
              onChange={(e) =>
                update(t.id, { componentId: e.target.value || null })
              }
            >
              <option value="">General project task</option>
              {state.components.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prerequisite tasks{" "}
            <small>Use Ctrl / Command to select more than one.</small>
            <select
              multiple
              value={t.dependencies}
              onChange={(e) =>
                update(t.id, {
                  dependencies: Array.from(
                    e.target.selectedOptions,
                    (o) => o.value,
                  ),
                })
              }
            >
              {state.tasks
                .filter((d) => d.id !== t.id)
                .map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.title} · {d.status}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Walkthrough
            <select
              value={t.guideId ? buildGuideIdentity(t.guideId).id : ""}
              onChange={(e) =>
                update(t.id, {
                  guideId: e.target.value
                    ? pinBuildGuide(e.target.value)
                    : null,
                })
              }
            >
              <option value="">No linked procedure</option>
              {manualGuides.map((g) => (
                <option value={g.slug} key={g.slug}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          {t.guideId && (
            <DocumentLink href={buildGuideHref(t.guideId)}>
              Open linked walkthrough ↗
            </DocumentLink>
          )}
          <label>
            Work notes
            <textarea
              rows={3}
              maxLength={4000}
              value={t.notes}
              onChange={(e) => update(t.id, { notes: e.target.value })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={t.public}
              onChange={(e) => update(t.id, { public: e.target.checked })}
            />
            Include this task, dates and notes in the publication preview
          </label>
          <button
            className="text-link"
            onClick={() =>
              edit((s) => {
                s.tasks = s.tasks
                  .filter((x) => x.id !== t.id)
                  .map((x) => ({
                    ...x,
                    dependencies: x.dependencies.filter((d) => d !== t.id),
                  }));
                return s;
              })
            }
          >
            Remove task
          </button>
        </details>
      ))}
      <h3>Milestones</h3>
      {state.milestones.map((m) => (
        <fieldset key={m.id}>
          <legend>{m.title}</legend>
          <label>
            Title
            <input
              maxLength={160}
              value={m.title}
              onChange={(e) => {
                const value = e.target.value;
                if (value)
                  edit((s) => {
                    s.milestones = s.milestones.map((x) =>
                      x.id === m.id ? { ...x, title: value } : x,
                    );
                    return s;
                  });
              }}
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={m.date || ""}
              onChange={(e) =>
                edit((s) => {
                  s.milestones = s.milestones.map((x) =>
                    x.id === m.id ? { ...x, date: e.target.value || null } : x,
                  );
                  return s;
                })
              }
            />
          </label>
          <label>
            Notes
            <textarea
              maxLength={2000}
              rows={2}
              value={m.notes}
              onChange={(e) =>
                edit((s) => {
                  s.milestones = s.milestones.map((x) =>
                    x.id === m.id ? { ...x, notes: e.target.value } : x,
                  );
                  return s;
                })
              }
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={m.public}
              onChange={(e) =>
                edit((s) => {
                  s.milestones = s.milestones.map((x) =>
                    x.id === m.id ? { ...x, public: e.target.checked } : x,
                  );
                  return s;
                })
              }
            />
            Include milestone in publication preview
          </label>
          <button
            className="text-link"
            onClick={() =>
              edit((s) => {
                s.milestones = s.milestones.filter((x) => x.id !== m.id);
                return s;
              })
            }
          >
            Remove milestone
          </button>
        </fieldset>
      ))}
      <button
        className="button outline"
        disabled={state.milestones.length >= 50}
        onClick={() =>
          edit((s) => {
            s.milestones.push({
              id: buildId(),
              title: "New milestone",
              date: null,
              notes: "",
              public: false,
            });
            return s;
          })
        }
      >
        Add milestone
      </button>
    </section>
  );
}
export function BudgetPanel({ state, edit }: Props) {
  const format = (v: number | null) =>
    v === null
      ? "Unknown"
      : new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: state.currency,
        }).format(v / 100);
  const total = (key: "estimate" | "actual") =>
    state.components.reduce((sum, c) => sum + (c[key] ?? 0) * c.quantity, 0);
  return (
    <section className="build-fields">
      <h2>Budget & notes</h2>
      <label>
        Currency
        <select
          value={state.currency}
          onChange={(e) =>
            edit((s) => {
              s.currency = e.target.value as BuildState["currency"];
              return s;
            })
          }
        >
          {["USD", "EUR", "GBP", "CAD", "AUD"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <p>
        Known estimate: <strong>{format(total("estimate"))}</strong> (
        {state.components.filter((c) => c.estimate === null).length} unknown) ·
        Recorded actual: <strong>{format(total("actual"))}</strong> (
        {state.components.filter((c) => c.actual === null).length} unknown)
      </p>
      <p className="small muted">
        Blank amounts are unknown. Totals exclude them. Unit costs are
        multiplied by quantity; switching currency does not convert entered
        amounts.
      </p>
      {state.components.map((c) => (
        <fieldset key={c.id}>
          <legend>
            {c.name} · quantity {c.quantity}
          </legend>
          <div className="form-grid">
            {(["estimate", "actual"] as const).map((key) => (
              <label key={key}>
                {key === "estimate"
                  ? "Estimated unit cost"
                  : "Actual unit cost"}
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  value={c[key] === null ? "" : c[key]! / 100}
                  placeholder="Unknown"
                  onChange={(e) => {
                    const value =
                      e.target.value === ""
                        ? null
                        : Math.round(Number(e.target.value) * 100);
                    if (
                      value !== null &&
                      (value < 0 || !Number.isSafeInteger(value))
                    )
                      return;
                    edit((s) => {
                      s.components = s.components.map((x) =>
                        x.id === c.id ? { ...x, [key]: value } : x,
                      );
                      return s;
                    });
                  }}
                />
              </label>
            ))}
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={c.publicCost}
              onChange={(e) =>
                edit((s) => {
                  s.components = s.components.map((x) =>
                    x.id === c.id ? { ...x, publicCost: e.target.checked } : x,
                  );
                  return s;
                })
              }
            />
            Include this component’s costs in the publication preview
          </label>
        </fieldset>
      ))}
      <label>
        Private project notes
        <textarea
          maxLength={12000}
          rows={7}
          value={state.privateNotes}
          onChange={(e) =>
            edit((s) => {
              s.privateNotes = e.target.value;
              return s;
            })
          }
        />
      </label>
    </section>
  );
}
