import type { SearchErrorCode } from './types';

const STATUS_MAP: Record<SearchErrorCode, number> = {
  DRUG_NOT_FOUND: 404,
  RXNORM_LOOKUP_FAILED: 502,
  FDA_LOOKUP_FAILED: 502,
  NO_ACTIVE_PACKAGES: 404,
  ONLY_INACTIVE_PACKAGES: 404,
  NO_MATCHING_STRENGTH: 404,
  NO_MATCHING_DOSAGE_FORM: 404,
  NO_PACKAGES_FOUND: 404,
};

export class DrugSearchError extends Error {
  constructor(
    public code: SearchErrorCode,
    message: string,
    public details?: Record<string, unknown>,
    public statusCode: number = STATUS_MAP[code] ?? 500
  ) {
    super(message);
    this.name = 'DrugSearchError';
  }
}

export function createSearchError(
  code: SearchErrorCode,
  message: string,
  details?: Record<string, unknown>
): DrugSearchError {
  return new DrugSearchError(code, message, details);
}

