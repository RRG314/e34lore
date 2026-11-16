"use client";
import { useState } from "react";
import { displayQuantity, type CanonicalUnit } from "../domain/units";
export function Quantity({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: CanonicalUnit;
}) {
  const [alternate, setAlternate] = useState(false);
  const shown = displayQuantity(value, unit, alternate);
  return (
    <div className="quantity">
      <div>
        <span>{label}</span>
        <strong>
          {shown.value.toLocaleString("en-US", { maximumFractionDigits: 3 })}{" "}
          {shown.unit}
        </strong>
      </div>
      <button
        onClick={() => setAlternate((v) => !v)}
        aria-label={"Convert " + label + " units"}
      >
        {alternate ? "Source units" : "Convert units"}
      </button>
      {alternate && (
        <small>
          Canonical source: {value} {unit === "C" ? "°C" : unit}
        </small>
      )}
    </div>
  );
}
