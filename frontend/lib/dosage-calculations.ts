import type { NDCPackage } from "@/types/api";
import type { SIGData } from "@/types/workflow";

type SpecialDosageForm = "liquid" | "inhaler" | "insulin" | null;

interface QuantityComputationResult {
  totalQuantity: number;
  unit: string;
  breakdown: string;
  warnings: string[];
}

const VOLUME_UNIT_MAP: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  millilitre: 1,
  millilitres: 1,
  cc: 1,
  "cubic centimeter": 1,
  teaspoon: 5,
  tsp: 5,
  tablespoon: 15,
  tbsp: 15,
  ounce: 30,
  oz: 30,
  drop: 0.05,
  drops: 0.05,
  gtt: 0.05,
};

const INHALER_UNIT_SET = new Set([
  "puff",
  "puffs",
  "actuation",
  "actuations",
  "spray",
  "sprays",
  "inhale",
  "inhalation",
]);

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function convertDoseToMl(dose: number, unit: string): number | null {
  const normalized = unit?.toLowerCase();
  if (!normalized) return null;
  if (VOLUME_UNIT_MAP[normalized] != null) {
    return dose * VOLUME_UNIT_MAP[normalized];
  }
  return null;
}

function extractUnitsPerMl(pkg?: NDCPackage | null): number | null {
  if (!pkg?.activeIngredients?.length) return null;

  for (const ingredient of pkg.activeIngredients) {
    const strength = ingredient.strength || "";
    const match = strength.match(/([\d.]+)\s*(?:UNIT|U)\s*\/\s*ML/i);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return null;
}

function detectSpecialForm(pkg?: NDCPackage | null): SpecialDosageForm {
  if (!pkg) return null;

  const dosageForm = pkg.dosageForm?.toLowerCase() || "";
  const dosageFamily = pkg.dosageFormFamily?.toLowerCase() || "";
  const generic = pkg.genericName?.toLowerCase() || "";
  const brand = pkg.brandName?.toLowerCase() || "";
  const route = (pkg.route || []).join(" ").toLowerCase();

  if (
    generic.includes("insulin") ||
    brand.includes("insulin") ||
    pkg.activeIngredients?.some(
      (ing) => ing.name?.toLowerCase().includes("insulin"),
    )
  ) {
    return "insulin";
  }

  if (
    dosageFamily === "liquid" ||
    [
      "solution",
      "suspension",
      "syrup",
      "liquid",
      "elixir",
      "tincture",
      "drops",
    ].some((kw) => dosageForm.includes(kw))
  ) {
    return "liquid";
  }

  if (
    ["inhal", "aerosol", "nebul", "respimat", "diskus", "spray"].some(
      (kw) =>
        dosageForm.includes(kw) ||
        brand.includes(kw) ||
        generic.includes(kw) ||
        route.includes(kw),
    )
  ) {
    return "inhaler";
  }

  return null;
}

function extractStructuredFields(sig?: SIGData | null) {
  if (!sig) return null;

  if (sig.mode === "structured" && sig.structured) {
    return sig.structured;
  }

  if (sig.mode === "freetext" && sig.parsed) {
    return sig.parsed;
  }

  return null;
}

export function computeQuantityFromSig(
  sig: SIGData | null | undefined,
  pkg?: NDCPackage | null,
): QuantityComputationResult | null {
  const fields = extractStructuredFields(sig);
  if (!sig || !fields) {
    return null;
  }

  const { dose, frequency, unit } = fields;
  const daysSupply = Number(sig.daysSupply);

  if (!daysSupply || Number.isNaN(daysSupply)) {
    return null;
  }

  const totalDoses = dose * frequency * daysSupply;
  const baseBreakdown = `${dose} ${unit} × ${frequency} times/day × ${daysSupply} days`;
  const warnings: string[] = [];

  const specialForm = detectSpecialForm(pkg);
  const normalizedUnit = unit?.toLowerCase() || "";

  if (specialForm === "liquid") {
    const perDoseMl = convertDoseToMl(dose, normalizedUnit);
    if (perDoseMl != null) {
      const totalMl = perDoseMl * frequency * daysSupply;
      const breakdown = `${dose} ${unit} (${roundQuantity(
        perDoseMl,
      )} mL) × ${frequency} times/day × ${daysSupply} days`;
      return {
        totalQuantity: roundQuantity(totalMl),
        unit: "mL",
        breakdown,
        warnings,
      };
    }

    warnings.push(
      `Liquid dosage form detected but unit "${unit}" could not be converted to milliliters. Verify calculation manually.`,
    );
  }

  if (specialForm === "inhaler") {
    if (!INHALER_UNIT_SET.has(normalizedUnit)) {
      warnings.push(
        `Inhaler dosage uses "${unit}". Expected puffs/actuations; treating value as actuations.`,
      );
    }

    const breakdown = `${dose} ${unit} (treated as actuations) × ${frequency} times/day × ${daysSupply} days`;
    return {
      totalQuantity: roundQuantity(totalDoses),
      unit: "actuation",
      breakdown,
      warnings,
    };
  }

  if (specialForm === "insulin") {
    if (!normalizedUnit.includes("unit")) {
      warnings.push(
        `Insulin dose entered as "${unit}". Calculations typically require units; please confirm.`,
      );
    }
    const unitsPerMl = extractUnitsPerMl(pkg);
    if (unitsPerMl) {
      const totalUnits = totalDoses;
      const totalMl = totalUnits / unitsPerMl;
      const breakdown = `${dose} ${unit} (${unitsPerMl} units/mL) × ${frequency} times/day × ${daysSupply} days`;
      warnings.push(
        `Converted ${totalUnits} units to mL using ${unitsPerMl} units/mL strength.`,
      );
      return {
        totalQuantity: roundQuantity(totalMl),
        unit: "mL",
        breakdown,
        warnings,
      };
    } else {
      warnings.push(
        "Unable to determine insulin concentration (units/mL) from FDA data. Calculation left in entered units.",
      );
    }
  }

  return {
    totalQuantity: roundQuantity(totalDoses),
    unit,
    breakdown: baseBreakdown,
    warnings,
  };
}
