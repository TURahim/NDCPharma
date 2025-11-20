import { createLogger } from '@core-guardrails';
import type { ParsedDrugQuery } from './types';

const logger = createLogger({ service: 'DrugSearch.InputParser' });

const STRENGTH_UNITS = [
  'mg',
  'mcg',
  'g',
  'gram',
  'grams',
  'kg',
  'ml',
  'l',
  'units',
  'iu',
  '%',
  'mEq'.toLowerCase(),
];

const DOSAGE_FORM_KEYWORDS = [
  'tablet',
  'tab',
  'capsule',
  'cap',
  'suspension',
  'solution',
  'injectable',
  'injection',
  'cream',
  'ointment',
  'gel',
  'patch',
  'syrup',
  'elixir',
  'drop',
  'oral',
  'topical',
  'er',
  'xr',
  'sr',
  'dr',
  'odt',
  'chewable',
  'extended-release',
  'delayed-release',
];

const RELEASE_TYPE_KEYWORDS = ['er', 'xr', 'sr', 'dr', 'cr', 'xl', 'odt'];

const strengthRegex = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s?(?:${STRENGTH_UNITS.join('|')})`,
  'gi'
);

/**
 * Normalize whitespace, punctuation, casing.
 */
function normalizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*[,\\/]\s*/g, ' ')
    .toLowerCase();
}

function extractTokens(
  normalized: string,
  keywords: string[]
): { tokens: string[]; remainder: string } {
  const tokens: string[] = [];
  let remainder = normalized;

  keywords.forEach((keyword) => {
    const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (keywordRegex.test(remainder)) {
      tokens.push(keyword);
      remainder = remainder.replace(keywordRegex, '').trim();
    }
  });

  return { tokens, remainder };
}

/**
 * Parse inbound drug query string → normalized tokens.
 */
export function parseDrugQuery(drugName: string, explicitStrength?: string): ParsedDrugQuery {
  const normalized = normalizeQuery(drugName);
  const strengthTokens: string[] = [];

  let working = normalized;

  // Extract explicit strength from string.
  const matches = working.match(strengthRegex);
  if (matches) {
    strengthTokens.push(...matches.map((match) => match.trim()));
    working = working.replace(strengthRegex, '').trim();
  }

  if (explicitStrength) {
    strengthTokens.push(explicitStrength.toLowerCase());
  }

  // Extract dosage form keywords.
  const dosageExtraction = extractTokens(working, DOSAGE_FORM_KEYWORDS);
  working = dosageExtraction.remainder;

  // Extract release-type tokens (ER, XR, etc.).
  const releaseExtraction = extractTokens(working, RELEASE_TYPE_KEYWORDS);
  working = releaseExtraction.remainder;

  const baseName = working
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/gi, '')
    .trim();

  const parsed: ParsedDrugQuery = {
    originalQuery: drugName,
    baseName: baseName || drugName.trim(),
    strengthTokens: Array.from(new Set(strengthTokens.map((s) => s.toLowerCase()))),
    dosageFormTokens: Array.from(new Set(dosageExtraction.tokens)),
    releaseTypeTokens: Array.from(new Set(releaseExtraction.tokens)),
  };

  logger.debug('Parsed drug query', parsed);
  return parsed;
}

