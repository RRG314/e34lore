"use client";
import { useEffect, useState, useRef } from "react";
import { Plus, Check, ShieldQuestion } from "lucide-react";
import { db, useApp } from "../components/context";
import { DocumentLink } from "../components/DocumentLink";
import { PageIntro } from "../components/common";
import { useOwnedCars } from "./use-owned-cars";
import {
  attributes,
  resolveConfiguration,
  validateVin,
  decodeEvidence,
  vinCandidates,
  type Attribute,
  type EvidenceKind,
  type ConfigurationEvidence,
  type Resolution,
} from "./configuration";
import { ImageCapture } from "../scanner/ImageCapture";
import { readMarkings } from "../scanner/inference";
import { sanitizeVehicle } from "../data/catalog";
import { maskedVinPattern } from "./vin-registry";
export function VehicleConfiguration() {
  const { user, setVehicle, toast } = useApp(),
    owned = useOwnedCars();
  const car = owned.activeId, setCar = owned.selectCar;
  const [evidence, setEvidence] = useState<ConfigurationEvidence[]>([]),
    [selection, setSelection] = useState<Resolution>({}),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [attribute, setAttribute] = useState<Attribute>("engine"),
    [kind, setKind] = useState<EvidenceKind>("observed"),
    [value, setValue] = useState(""),
    [source, setSource] = useState(""),
    [supersedes, setSupersedes] = useState(""),
    [vin, setVin] = useState(""),
    [consent, setConsent] = useState(false),
    [decoded, setDecoded] = useState<ReturnType<typeof decodeEvidence>>([]),
    [decodeNotice, setDecodeNotice] = useState(""),
    [ocr, setOcr] = useState("");
  const abort = useRef<AbortController | null>(null);
  const userId = user?.id,
    guest = user?.is_anonymous;
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the private snapshot at the external account/car/reload boundary.
    setEvidence([]);
    setSelection({});
    setRevision(0);
    setError("");
    if (!car || !userId) return;
    setLoading(true);
    Promise.all([
      db
        .from("vehicle_configuration_evidence")
        .select("*")
        .eq("vehicle_id", car)
        .eq("user_id", userId!)
        .order("created_at")
        .limit(1000)
        .abortSignal(controller.signal),
      db
        .from("vehicle_configuration_revisions")
        .select("revision,selection")
        .eq("vehicle_id", car)
        .eq("user_id", userId!)
        .order("revision", { ascending: false })
        .limit(1)
        .abortSignal(controller.signal)
        .maybeSingle(),
    ])
      .then(([e, r]) => {
        if (!live) return;
        if (e.error || r.error)
          setError(
            "Configuration history could not load. Retry before changing it.",
          );
        else {
          setEvidence(e.data || []);
          setSelection(r.data?.selection || {});
          setRevision(r.data?.revision || 0);
        }
      })
      .catch(() => {
        if (live) setError("Configuration history could not load.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [car, userId, guest, refresh]);
  const current = owned.cars.find((c) => c.id === car),
    resolved = current
      ? resolveConfiguration(
          evidence,
          selection,
          sanitizeVehicle(current.configuration),
        )
      : null;
  async function add(rows: Omit<ConfigurationEvidence, "id">[]) {
    if (!car || !user) return;
    setBusy(true);
    setError("");
    try {
      const r = await db
        .from("vehicle_configuration_evidence")
        .insert(rows.map((r) => ({ ...r, vehicle_id: car, user_id: user.id })))
        .abortSignal(AbortSignal.timeout(15000));
      if (r.error)
        throw Error(
          "Evidence could not save. Reload to check before trying again.",
        );
      setValue("");
      setSource("");
      setDecoded([]);
      setRefresh((n) => n + 1);
      toast("Private evidence saved. Choose what is installed below.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evidence could not save.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!current || !resolved) return;
    setBusy(true);
    setError("");
    try {
      if (resolved.conflicts.length)
        throw Error(
          "Choose evidence for each conflicting attribute before saving.",
        );
      const picked = { ...selection };
      for (const [k, v] of Object.entries(resolved.chosen))
        picked[k as Attribute] = v!.id;
      const r = await db
        .rpc("save_vehicle_configuration", {
          car,
          expected_revision: revision,
          selected: picked,
        })
        .abortSignal(AbortSignal.timeout(15000));
      if (r.error)
        throw Error(
          "Configuration could not be confirmed. Reload before trying again; another device may have saved a revision.",
        );
      setVehicle(sanitizeVehicle(r.data.configuration));
      owned.retry();
      setRefresh((n) => n + 1);
      toast(
        "Configuration saved and selected for catalog, scanner and repair checks.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Configuration could not save.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function decode() {
    const pattern = maskedVinPattern(vin);
    if (!pattern || !consent) return;
    abort.current?.abort();
    abort.current = new AbortController();
    setBusy(true);
    setDecoded([]);
    setError("");
    try {
      const r = await fetch(
        "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/" +
          encodeURIComponent(pattern) +
          "?format=json",
        {
          signal: AbortSignal.any([
            abort.current.signal,
            AbortSignal.timeout(15000),
          ]),
          referrerPolicy: "no-referrer",
          credentials: "omit",
          cache: "no-store",
        },
      );
      if (!r.ok)
        throw Error(
          "The NHTSA decoder is unavailable. Manual setup still works.",
        );
      const data = (await r.json()) as { Results?: Record<string, unknown>[] },
        row = data.Results?.[0];
      if (!row) throw Error("No decoded record was returned.");
      if (typeof row.Make === "string" && row.Make.toUpperCase() !== "BMW")
        throw Error(
          "The returned record is not a BMW. Check the VIN; nothing has been saved.",
        );
      setDecoded(decodeEvidence(row));
      setDecodeNotice(
        String(row.ErrorText || "Review the returned attributes."),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "VIN decode could not finish.");
    } finally {
      setVin("");
      setBusy(false);
    }
  }
  return (
    <div className="page vehicle-configuration">
      <PageIntro
        eyebrow="MY GARAGE / VEHICLE CONFIGURATION"
        title="Vehicle configuration"
        description="Keep factory evidence, installed equipment and modifications distinct. Choose the evidence that should guide your parts and repair checks."
      />
      {!user || user.is_anonymous ? (
        <p>
          <DocumentLink
            className="button"
            href="/account?next=/garage/configuration"
          >
            Sign in to your private garage
          </DocumentLink>
        </p>
      ) : (
        <>
          <label>
            Owned vehicle
            <select
              value={car}
              disabled={busy || owned.loading}
              onChange={(e) => {
                setCar(e.target.value);
                setVin("");
                setDecoded([]);
                abort.current?.abort();
              }}
            >
              <option value="">Choose a car</option>
              {owned.cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nickname}
                </option>
              ))}
            </select>
          </label>
          {!owned.loading && !owned.cars.length && (
            <p>
              <DocumentLink href="/garage">
                Add your car in My garage first
              </DocumentLink>
              . A VIN is not required.
            </p>
          )}
          {owned.error && (
            <p role="alert">
              {owned.error}
              <button onClick={owned.retry}>Retry cars</button>
            </p>
          )}
          {current && (
            <>
              <div className="configuration-summary">
                <span>Saved revision {revision || "none"}</span>
                <DocumentLink href="/garage">Back to garage</DocumentLink>
                <DocumentLink href={"/scanner?vehicle=" + car}>
                  Identify a component
                </DocumentLink>
                <DocumentLink href={"/workshop/repair?vehicle=" + car}>
                  Open interactive repair
                </DocumentLink>
              </div>
              <section>
                <h2>1. Add what you know</h2>
                <p>
                  Factory means supported original equipment. Observed and
                  modified describe the installed car. Inferred entries remain
                  suggestions until you explicitly choose them.
                </p>
                <form
                  className="configuration-evidence-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void add([
                      {
                        attribute,
                        value,
                        kind,
                        source,
                        ...(supersedes ? { supersedes } : {}),
                      },
                    ]);
                  }}
                >
                  <label>
                    Attribute
                    <select
                      value={attribute}
                      onChange={(e) => {
                        setAttribute(e.target.value as Attribute);
                        setSupersedes("");
                      }}
                    >
                      {attributes.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Evidence type
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value as EvidenceKind)}
                    >
                      {[
                        "factory",
                        "observed",
                        "modified",
                        "inferred",
                        "unknown",
                      ].map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Value
                    <input
                      required={kind !== "unknown"}
                      maxLength={200}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={
                        attribute === "engine"
                          ? "M50TU, M60…"
                          : "Record the actual value"
                      }
                    />
                  </label>
                  <label>
                    Source / observation
                    <input
                      required
                      minLength={3}
                      maxLength={800}
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="Engine stamping checked, build sheet, installation invoice…"
                    />
                  </label>
                  <label>
                    Replaces an earlier observation
                    <select
                      value={supersedes}
                      onChange={(e) => setSupersedes(e.target.value)}
                    >
                      <option value="">New evidence</option>
                      {evidence
                        .filter((e) => e.attribute === attribute)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.kind}: {e.value || "Unknown"} · {e.source}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    className="button"
                    disabled={busy || loading || !!error}
                  >
                    <Plus size={16} />
                    Add private evidence
                  </button>
                </form>
              </section>
              <details className="vin-setup">
                <summary>Optional VIN lookup or camera capture</summary>
                <p>
                  Your VIN is private. The optional lookup sends a masked pattern
                  to NHTSA with the serial number removed. vPIC provides basic
                  manufacturer-submitted data, may be incomplete for older E34s
                  and does not provide a BMW factory build sheet or full option
                  list. An OCR reading must be checked by you; no characters are
                  silently corrected.
                </p>
                <ImageCapture
                  onImage={async (image) => {
                    abort.current?.abort();
                    abort.current = new AbortController();
                    setBusy(true);
                    try {
                      const r = await readMarkings(
                          image.blob,
                          setOcr,
                          abort.current.signal,
                        ),
                        values = vinCandidates(r.text);
                      setVin(values.length === 1 ? values[0] : "");
                      setOcr(
                        values.length === 1
                          ? "Review every character before looking up this VIN."
                          : "No single complete VIN found. Enter it manually; uncertain characters were not changed.",
                      );
                    } catch {
                      setOcr(
                        "VIN markings could not be read. Enter the VIN manually.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
                <p role="status">{ocr}</p>
                <label>
                  Full VIN
                  <input
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={17}
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                  />
                </label>
                {vin && !validateVin(vin).valid && (
                  <p>
                    Enter 17 characters without I, O or Q. A partial VIN cannot
                    establish a complete configuration here.
                  </p>
                )}
                <label className="scan-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  I checked the VIN and want to look up its masked pattern with NHTSA.
                </label>
                <button
                  className="button outline"
                  disabled={busy || !consent || !validateVin(vin).valid}
                  onClick={decode}
                >
                  Look up with NHTSA
                </button>
                {decodeNotice && <p>{decodeNotice}</p>}
                {decoded.length > 0 && (
                  <>
                    <ul>
                      {decoded.map((d) => (
                        <li key={d.attribute}>
                          {d.attribute}: {d.value}
                        </li>
                      ))}
                    </ul>
                    <button
                      className="button outline"
                      disabled={busy}
                      onClick={() => add(decoded)}
                    >
                      Save returned fields as factory-source evidence
                    </button>
                  </>
                )}
                <DocumentLink
                  href="https://vpic.nhtsa.dot.gov/api/"
                  target="_blank"
                  rel="noreferrer"
                >
                  NHTSA source and limitations
                </DocumentLink>
              </details>
              <section>
                <h2>2. Choose the installed configuration</h2>
                {loading ? (
                  <p role="status">Loading your evidence…</p>
                ) : (
                  attributes.map((a) => {
                    const rows = evidence.filter((e) => e.attribute === a);
                    return (
                      <div className="configuration-attribute" key={a}>
                        <h3>{a}</h3>
                        <p>
                          Existing garage value:{" "}
                          {String(
                            (
                              current.configuration as unknown as Record<
                                string,
                                string
                              >
                            )[a] || "Not recorded",
                          )}
                        </p>
                        {rows.length ? (
                          <>
                            <select
                              aria-label={"Evidence for installed " + a}
                              value={
                                selection[a] || resolved?.chosen[a]?.id || ""
                              }
                              onChange={(e) =>
                                setSelection((s) => ({
                                  ...s,
                                  [a]: e.target.value,
                                }))
                              }
                            >
                              <option value="">No explicit choice</option>
                              {rows.map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.kind} · {e.value || "Unknown"} · {e.source}
                                </option>
                              ))}
                            </select>
                            {rows.map((e) => (
                              <p className="small" key={e.id}>
                                <strong>
                                  {e.kind}: {e.value || "Unknown"}
                                </strong>{" "}
                                · {e.source} ·{" "}
                                {e.created_at
                                  ? new Date(e.created_at).toLocaleDateString()
                                  : ""}
                                {e.supersedes
                                  ? " · replaces earlier evidence"
                                  : ""}
                              </p>
                            ))}
                          </>
                        ) : (
                          <p className="small muted">
                            No supporting evidence recorded.
                          </p>
                        )}
                        {resolved?.conflicts.includes(a) && (
                          <p role="alert">
                            <ShieldQuestion size={16} />
                            Conflicting installed evidence. Choose the
                            applicable observation.
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
                <button
                  className="button"
                  disabled={
                    busy || loading || !!error || !!resolved?.conflicts.length
                  }
                  onClick={save}
                >
                  <Check size={17} />
                  Save configuration
                </button>
                <p className="small">
                  Evidence stays in your private account. Selecting an engine
                  does not establish dimensions, factory origin or universal
                  part compatibility. Unsupported 3D assemblies stay
                  unavailable.
                </p>
              </section>
            </>
          )}
          {error && (
            <p role="alert" className="scan-error">
              {error}
              <button
                onClick={() => {
                  setError("");
                  setRefresh((n) => n + 1);
                }}
              >
                Reload saved history
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}
