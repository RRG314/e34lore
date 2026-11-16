import { describe, expect, it } from "vitest";
import { emptyVehicle } from "../src/data/catalog";
import { fitmentEvidenceScope, fitmentEvidenceQuestions, summarizeFitmentEvidence, type FitmentEvidence } from "../src/domain/fitment";

const car = { ...emptyVehicle, model: "525i", engine: "M50", market: "USA", body: "Sedan", year: "1992", month: "05" };
const record: FitmentEvidence = {
  id: "application", model_id: "525i", engine: "M50", market: "USA", body: "Sedan",
  production_from: "1992-05-01", production_to: "1992-05-31",
  status: "conditional", conditions: "Check the installed housing.",
};

describe("fitment evidence", () => {
  it("keeps conditions and treats missing configuration and other markets as unknown", () => {
    expect(summarizeFitmentEvidence([record], car).status).toBe("conditional");
    expect(summarizeFitmentEvidence([record], { ...car, market: "" }).status).toBe("unknown");
    expect(summarizeFitmentEvidence([record], { ...car, market: "EUR" }).status).toBe("unknown");
    expect(summarizeFitmentEvidence([record], { ...car, engine: "M50TU" }).status).toBe("unknown");
    expect(summarizeFitmentEvidence([], car).status).toBe("unknown");
  });
  it("does not resolve a conflict in matching sources or use negative evidence outside the scope", () => {
    const negative = { ...record, id: "negative", status: "incompatible" } as const;
    expect(summarizeFitmentEvidence([record, negative], car).status).toBe("conflicting");
    expect(summarizeFitmentEvidence([negative], car).status).toBe("incompatible");
    expect(summarizeFitmentEvidence([record, { ...negative, body: "Touring" }], car).status).toBe("conditional");
    expect(summarizeFitmentEvidence([{ ...negative, engine: null }], emptyVehicle).status).toBe("unknown");
  });
  it("handles day-level date boundaries without inventing a production day", () => {
    expect(fitmentEvidenceScope(record, { ...car, month: "04" })).toBe("outside");
    expect(fitmentEvidenceScope({ ...record, production_to: "1992-05-15" }, car)).toBe("incomplete");
    expect(fitmentEvidenceScope({ ...record, production_from: "1992-05-15" }, car)).toBe("incomplete");
    expect(fitmentEvidenceScope(record, { ...car, month: "13" })).toBe("incomplete");
  });
  it("explains unresolved source scope without claiming unspecified fields match", () => {
    expect(fitmentEvidenceQuestions({ ...record, engine: null, production_from: null, production_to: null, status: "unverified" }, car)).toEqual([
      "This record does not specify the engine.", "No production-date limits are recorded.", "This application has not been verified.",
    ]);
    expect(fitmentEvidenceQuestions(record, { ...car, body: "Touring", month: "" })).toContain("Your body style differs from this source.");
    expect(fitmentEvidenceQuestions(record, { ...car, month: "" })).toContain("Check the production month.");
  });
});
