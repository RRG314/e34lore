export type CanonicalUnit = "mm" | "C" | "Nm" | "L";
const conversions: Record<
  CanonicalUnit,
  { unit: string; convert: (n: number) => number }
> = {
  mm: { unit: "in", convert: (n) => n / 25.4 },
  C: { unit: "°F", convert: (n) => (n * 9) / 5 + 32 },
  Nm: { unit: "lb·ft", convert: (n) => n * 0.7375621493 },
  L: { unit: "US qt", convert: (n) => n / 0.946352946 },
};
export function displayQuantity(
  value: number,
  unit: CanonicalUnit,
  alternate = false,
) {
  if (!Number.isFinite(value)) throw new Error("Quantity must be finite");
  const converted = conversions[unit];
  return {
    value: alternate ? converted.convert(value) : value,
    unit: alternate ? converted.unit : unit === "C" ? "°C" : unit,
    canonical: { value, unit },
  };
}
