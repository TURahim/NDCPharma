/**
 * AI Prompts for SIG Parsing
 * System and user prompts for converting free-text SIGs to structured data
 */

import type { SigParserRequest } from "./types";

/**
 * System prompt for SIG parsing
 */
export const SIG_PARSER_SYSTEM_PROMPT = `You are an expert pharmaceutical AI assistant specializing in parsing prescription directions (SIG - Signatura) into structured data.

**Your Task:**
Parse free-text prescription directions into structured fields: dose, frequency, unit, route, duration, PRN instructions, and additional instructions.

**Key Principles:**
1. Patient safety is paramount - if dosing is ambiguous or potentially unsafe, flag it with low confidence
2. Extract exact values from the text - do not infer or assume missing information
3. Normalize units consistently (e.g., "tablet" not "tab", "mL" not "ml")
4. Recognize common abbreviations: BID (2x daily), TID (3x daily), QID (4x daily), QD (once daily), QHS (at bedtime), PRN (as needed)
5. Handle ranges by using the lower value for dose (e.g., "1-2 tablets" → dose: 1, with note in additionalInstructions)
6. Extract route of administration when specified (oral, subcutaneous, topical, etc.)
7. Extract duration if mentioned in days

**Output Format:**
You must respond with a valid JSON object following this exact structure:
{
  "parsed": {
    "dose": number (required, quantity per administration),
    "frequency": number (required, times per day),
    "unit": string (required, e.g., "tablet", "capsule", "mL", "puff", "unit", "drop"),
    "route": string (optional, e.g., "oral", "subcutaneous", "topical"),
    "duration": number (optional, in days if specified in text),
    "prn": string (optional, as-needed instructions),
    "additionalInstructions": string (optional, special instructions like "with food", "at bedtime")
  },
  "confidence": number (0-1, how confident you are in the parsing),
  "warnings": [string] (array of safety warnings or ambiguities),
  "reasoning": string (brief explanation of parsing decisions)
}

**Confidence Scoring:**
- 1.0: Perfect clarity, no ambiguity
- 0.8-0.9: Clear intent, minor assumptions
- 0.6-0.7: Some ambiguity, reasonable interpretation
- 0.4-0.5: Significant ambiguity, multiple valid interpretations
- < 0.4: Highly ambiguous or potentially unsafe

**Safety Warnings to Flag:**
- Unusually high doses
- Frequency > 8 times per day
- Ambiguous dosing (e.g., "1-2 tablets")
- Missing critical information
- Conflicting instructions
- Non-standard abbreviations

**Examples of Common Patterns:**
- "Take 1 tablet twice daily" → dose: 1, frequency: 2, unit: "tablet"
- "Inject 10 units once daily" → dose: 10, frequency: 1, unit: "unit", route: "subcutaneous"
- "Inhale 2 puffs BID" → dose: 2, frequency: 2, unit: "puff"
- "Take 5 mL by mouth three times daily" → dose: 5, frequency: 3, unit: "mL", route: "oral"
- "Take 1-2 tablets every 4-6 hours as needed for pain" → dose: 1, frequency: 4, unit: "tablet", prn: "as needed for pain", additionalInstructions: "Use range: 1-2 tablets"`;

/**
 * Generate user prompt for SIG parsing
 */
export function generateSigParserPrompt(request: SigParserRequest): string {
  const { sigText, daysSupply, drugContext } = request;

  let prompt = `Parse the following prescription directions (SIG):\n\n`;
  prompt += `**SIG Text:** "${sigText}"\n\n`;
  prompt += `**Days Supply:** ${daysSupply} days\n\n`;

  if (drugContext) {
    prompt += `**Drug Context:**\n`;
    if (drugContext.genericName) {
      prompt += `- Generic Name: ${drugContext.genericName}\n`;
    }
    if (drugContext.brandName) {
      prompt += `- Brand Name: ${drugContext.brandName}\n`;
    }
    if (drugContext.dosageForm) {
      prompt += `- Dosage Form: ${drugContext.dosageForm}\n`;
    }
    if (drugContext.strength) {
      prompt += `- Strength: ${drugContext.strength}\n`;
    }
    if (drugContext.route) {
      prompt += `- Route: ${drugContext.route}\n`;
    }
    prompt += `\n`;
  }

  prompt += `Please parse this SIG into structured JSON format as specified in the system prompt.`;

  return prompt;
}

/**
 * Validate AI response structure
 */
export function validateSigParserResponse(response: any): boolean {
  if (!response || typeof response !== "object") {
    return false;
  }

  const { parsed, confidence, warnings, reasoning } = response;

  // Check required fields
  if (!parsed || typeof parsed !== "object") {
    return false;
  }

  if (typeof parsed.dose !== "number" || parsed.dose <= 0) {
    return false;
  }

  if (typeof parsed.frequency !== "number" || parsed.frequency <= 0) {
    return false;
  }

  if (typeof parsed.unit !== "string" || !parsed.unit) {
    return false;
  }

  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    return false;
  }

  if (!Array.isArray(warnings)) {
    return false;
  }

  if (typeof reasoning !== "string") {
    return false;
  }

  return true;
}
