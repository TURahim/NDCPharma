import { createLogger } from '@core-guardrails';
import { nameToRxCui, type RxCuiResult } from '@clients-rxnorm';
import { fdaClient } from '@clients-openfda';
import type { DrugConcept, ParsedDrugQuery } from './types';
import { createSearchError } from './errors';

const logger = createLogger({ service: 'DrugSearch.RxNormResolver' });

interface ResolveOptions {
  rxcui?: string;
}

async function fallbackToFdaGeneric(baseName: string): Promise<DrugConcept | null> {
  try {
    const packages = await fdaClient.searchByGenericName(baseName, { limit: 1 });
    if (!packages.length) {
      return null;
    }

    const pkg = packages[0];
    return {
      rxcui: pkg.rxcui || 'fda-generic',
      name: pkg.genericName,
      ingredientName: pkg.genericName,
      clinicalName: pkg.genericName,
      confidence: 0.4,
      resolvedStrengths: Array.from(
        new Set(
          pkg.activeIngredients
            ?.map((ingredient) => ingredient.strength)
            .filter(Boolean) as string[]
        )
      ),
      resolvedDosageForms: pkg.dosageForm ? [pkg.dosageForm] : [],
      source: 'fda_generic',
      warnings: ['Resolved via FDA generic lookup'],
    };
  } catch (error) {
    logger.warn('FDA generic fallback failed', error as Error, { baseName });
    return null;
  }
}

function mapRxNormResult(result: RxCuiResult): DrugConcept {
  return {
    rxcui: result.rxcui,
    name: result.name,
    ingredientName: result.name,
    clinicalName: result.name,
    confidence: result.confidence ?? 0.8,
    resolvedStrengths: result.strength ? [result.strength] : [],
    resolvedDosageForms: result.dosageForm ? [result.dosageForm] : [],
    source: 'rxnorm',
    warnings: [],
  };
}

export async function resolveDrugConcept(
  parsedQuery: ParsedDrugQuery,
  options: ResolveOptions = {}
): Promise<DrugConcept> {
  const { baseName, originalQuery } = parsedQuery;

  if (!baseName && !options.rxcui) {
    throw createSearchError('DRUG_NOT_FOUND', 'No drug name or RxCUI provided for search.');
  }

  // Step 1: If RxCUI provided, attempt to resolve via nameToRxCui using original query for metadata.
  if (options.rxcui) {
    try {
      const resolved = await nameToRxCui(originalQuery || baseName);
      logger.info('Resolved drug via direct RxCUI path', { rxcui: resolved.rxcui });
      return mapRxNormResult(resolved);
    } catch (error) {
      logger.warn('Direct RxCUI resolution failed, falling back to name search', {
        rxcui: options.rxcui,
        error,
      });
    }
  }

  // Step 2: Attempt name-based normalization via RxNorm.
  try {
    const normalized = await nameToRxCui(baseName);
    logger.info('RxNorm normalization succeeded', { rxcui: normalized.rxcui });
    return mapRxNormResult(normalized);
  } catch (error) {
    logger.warn('RxNorm normalization failed', error as Error, { baseName });
  }

  // Step 3: FDA fallback.
  const fdaFallback = await fallbackToFdaGeneric(baseName);
  if (fdaFallback) {
    return fdaFallback;
  }

  throw createSearchError(
    'RXNORM_LOOKUP_FAILED',
    'Unable to resolve drug concept from RxNorm or FDA generic search.',
    { baseName }
  );
}

