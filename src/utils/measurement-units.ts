/**
 * Display-boundary conversion only. API payloads, drafts, chart data, and
 * calculation helpers always remain in canonical kilograms and centimetres.
 */
export type MeasurementSystem = "METRIC" | "IMPERIAL";

export const KILOGRAMS_PER_POUND = 0.45359237;
export const CENTIMETRES_PER_INCH = 2.54;

const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const isMeasurementSystem = (value: unknown): value is MeasurementSystem =>
  value === "METRIC" || value === "IMPERIAL";

export const kilogramsToPounds = (kilograms: number) => kilograms / KILOGRAMS_PER_POUND;
export const poundsToKilograms = (pounds: number) => pounds * KILOGRAMS_PER_POUND;
export const centimetresToInches = (centimetres: number) => centimetres / CENTIMETRES_PER_INCH;
export const inchesToCentimetres = (inches: number) => inches * CENTIMETRES_PER_INCH;

export const massUnitLabel = (system: MeasurementSystem) =>
  system === "IMPERIAL" ? "lb" : "kg";

export const lengthUnitLabel = (system: MeasurementSystem) =>
  system === "IMPERIAL" ? "ft/in" : "cm";

export const displayMass = (kilograms: number, system: MeasurementSystem, decimals = 1) =>
  roundTo(system === "IMPERIAL" ? kilogramsToPounds(kilograms) : kilograms, decimals);

export const formatMass = (kilograms: number | null | undefined, system: MeasurementSystem, decimals = 1) => {
  if (kilograms == null || !Number.isFinite(kilograms)) return "–";
  return `${displayMass(kilograms, system, decimals).toFixed(decimals)} ${massUnitLabel(system)}`;
};

export const formatMassInput = (kilograms: number | null | undefined, system: MeasurementSystem) => {
  if (kilograms == null || !Number.isFinite(kilograms)) return "";
  return String(displayMass(kilograms, system));
};

export const parseMassInput = (value: string, system: MeasurementSystem) => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return roundTo(system === "IMPERIAL" ? poundsToKilograms(parsed) : parsed, 4);
};

export type ImperialHeight = { feet: number; inches: number };

export const centimetresToFeetAndInches = (centimetres: number): ImperialHeight => {
  const totalInches = Math.round(centimetresToInches(centimetres));
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
};

export const feetAndInchesToCentimetres = (feet: number, inches: number) =>
  (feet * 12 + inches) * CENTIMETRES_PER_INCH;

export const formatHeight = (centimetres: number | null | undefined, system: MeasurementSystem) => {
  if (centimetres == null || !Number.isFinite(centimetres)) return "–";
  if (system === "METRIC") return `${roundTo(centimetres, 1)} cm`;
  const { feet, inches } = centimetresToFeetAndInches(centimetres);
  return `${feet} ft ${inches} in`;
};

export const parseHeightInput = (
  metricCentimetres: string,
  system: MeasurementSystem,
  feet?: string,
  inches?: string,
) => {
  if (system === "METRIC") {
    const normalized = metricCentimetres.trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? roundTo(parsed, 2) : null;
  }
  const normalizedFeet = feet?.trim() ?? "";
  const normalizedInches = inches?.trim() ?? "";
  if (!normalizedFeet || !normalizedInches) return null;
  const parsedFeet = Number(normalizedFeet);
  const parsedInches = Number(normalizedInches);
  if (!Number.isInteger(parsedFeet) || !Number.isInteger(parsedInches) || parsedFeet < 0 || parsedInches < 0 || parsedInches >= 12) {
    return null;
  }
  return roundTo(feetAndInchesToCentimetres(parsedFeet, parsedInches), 2);
};
