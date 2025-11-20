/**
 * Regex Fallback Parser
 * Simple regex-based SIG parsing for when AI is unavailable
 */

import type { ParsedSig } from "./types";

/**
 * Parse SIG using regex patterns (fallback when AI unavailable)
 */
export function parseWithRegex(sigText: string): Partial<ParsedSig> | null {
  const lower = sigText.toLowerCase();
  const warnings: string[] = [];

  // Extract dose (first number found)
  const doseMatch = lower.match(/(\d+\.?\d*)/);
  const dose = doseMatch ? parseFloat(doseMatch[1]) : null;

  // Extract frequency (keyword matching)
  let frequency: number | null = 1;

  if (
    lower.includes("twice") ||
    lower.includes("two times") ||
    lower.includes("2 times") ||
    lower.includes("bid")
  ) {
    frequency = 2;
  } else if (
    lower.includes("three times") ||
    lower.includes("3 times") ||
    lower.includes("tid")
  ) {
    frequency = 3;
  } else if (
    lower.includes("four times") ||
    lower.includes("4 times") ||
    lower.includes("qid")
  ) {
    frequency = 4;
  } else if (lower.includes("every 12 hours") || lower.includes("q12h")) {
    frequency = 2;
  } else if (lower.includes("every 8 hours") || lower.includes("q8h")) {
    frequency = 3;
  } else if (lower.includes("every 6 hours") || lower.includes("q6h")) {
    frequency = 4;
  } else if (lower.includes("every 4 hours") || lower.includes("q4h")) {
    frequency = 6;
  } else if (
    lower.includes("once") ||
    lower.includes("1 time") ||
    lower.includes("qd") ||
    lower.includes("daily")
  ) {
    frequency = 1;
  }

  // Extract unit (keyword matching)
  let unit: string | null = "tablet"; // default assumption

  if (lower.includes("capsule")) {
    unit = "capsule";
  } else if (lower.includes("ml") || lower.includes("milliliter")) {
    unit = "mL";
  } else if (lower.includes("tablet") || lower.includes("tab")) {
    unit = "tablet";
  } else if (lower.includes("spray")) {
    unit = "spray";
  } else if (lower.includes("patch")) {
    unit = "patch";
  } else if (lower.includes("drop")) {
    unit = "drop";
  } else if (lower.includes("puff") || lower.includes("inhal")) {
    unit = "puff";
  } else if (lower.includes("unit")) {
    unit = "unit";
  } else if (lower.includes("gram") || lower.includes("gm")) {
    unit = "gram";
  } else if (lower.includes("application") || lower.includes("apply")) {
    unit = "application";
  }

  // Extract route
  let route: string | undefined;
  if (
    lower.includes("by mouth") ||
    lower.includes("oral") ||
    lower.includes("po")
  ) {
    route = "oral";
  } else if (
    lower.includes("subcutaneous") ||
    lower.includes("subq") ||
    lower.includes("sq")
  ) {
    route = "subcutaneous";
  } else if (lower.includes("intramuscular") || lower.includes("im")) {
    route = "intramuscular";
  } else if (lower.includes("intravenous") || lower.includes("iv")) {
    route = "intravenous";
  } else if (lower.includes("topical") || lower.includes("apply to")) {
    route = "topical";
  } else if (lower.includes("inhal") || lower.includes("breath")) {
    route = "inhalation";
  }

  // Extract PRN
  let prn: string | undefined;
  if (lower.includes("as needed") || lower.includes("prn")) {
    const prnMatch = sigText.match(
      /(?:as needed|prn)\s+(?:for\s+)?(.+?)(?:\.|$)/i,
    );
    prn = prnMatch ? prnMatch[1].trim() : "as needed";
  }

  // Extract duration in days
  let duration: number | undefined;
  const durationMatch = lower.match(/for\s+(\d+)\s+days?/);
  if (durationMatch) {
    duration = parseInt(durationMatch[1]);
  }

  // Extract additional instructions
  let additionalInstructions: string | undefined;
  if (lower.includes("with food") || lower.includes("with meals")) {
    additionalInstructions = "Take with food";
  } else if (
    lower.includes("without food") ||
    lower.includes("on empty stomach")
  ) {
    additionalInstructions = "Take on empty stomach";
  } else if (lower.includes("at bedtime") || lower.includes("qhs")) {
    additionalInstructions = "Take at bedtime";
  } else if (lower.includes("in the morning") || lower.includes("qam")) {
    additionalInstructions = "Take in the morning";
  }

  // Check for range doses (e.g., "1-2 tablets")
  if (sigText.match(/\d+-\d+/)) {
    warnings.push("Dose range detected. Using lower value for calculation.");
    if (!additionalInstructions) {
      additionalInstructions = `Use range as directed: ${sigText.match(
        /\d+-\d+\s+\w+/,
      )?.[0]}`;
    }
  }

  // Validate we found essential fields
  if (!dose || !frequency || !unit) {
    return null;
  }

  return {
    dose,
    frequency,
    unit,
    route,
    duration,
    prn,
    additionalInstructions,
  };
}
