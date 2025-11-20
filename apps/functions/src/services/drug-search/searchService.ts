import { createLogger } from '@core-guardrails';
import {
  fetchFdaPackagesForRxcui,
  parseDrugQuery,
  resolveDrugConcept,
  normalizePackages,
  filterPackages,
} from '.';
import type {
  DrugSearchContext,
  NormalizedPackage,
  PackageFilterOptions,
  ParsedDrugQuery,
} from './types';
import { createSearchError } from './errors';

const logger = createLogger({ service: 'DrugSearch.Service' });

export interface DrugSearchRequest {
  drugName?: string;
  rxcui?: string;
  strength?: string;
  dosageForm?: string;
  includeStrengths?: boolean;
}

export interface DrugSearchResult {
  drug: {
    rxcui: string;
    name: string;
    ingredientName?: string;
    clinicalDrugName?: string;
    strengthTokensParsed: string[];
    dosageFormTokensParsed: string[];
    resolvedDosageForms: string[];
    resolvedStrengths: string[];
    warnings: string[];
  };
  packages: Array<{
    ndc: string;
    productNdc: string;
    brandName: string;
    genericName: string;
    strength: string;
    dosageForm: string;
    dosageFormFamily: string;
    route: string[];
    packageSize: {
      quantity: number;
      unit: string;
      display: string;
    };
    labeler?: string;
    manufacturer: string;
    activeIngredients: Array<{ name: string; strength: string }>;
    marketingStatus: {
      isActive: boolean;
      status: string;
      label: string;
      startDate?: string;
      endDate?: string;
    };
    listingExpirationDate?: string;
  }>;
  metadata: {
    totalActivePackages: number;
    totalInactivePackages: number;
    allStrengths: string[];
    allForms: string[];
  };
}

function mapPackagesForResponse(packages: NormalizedPackage[]) {
  return packages.map((pkg) => {
    const marketingStatus = pkg.raw.marketingStatus ?? {
      isActive: pkg.marketingStatus === 'active',
      status: pkg.marketingStatus,
    };

    return {
      ndc: pkg.formattedNdc,
      productNdc: pkg.productNdc,
      brandName: pkg.brandName,
      genericName: pkg.genericName,
      strength: pkg.strength || 'Not Specified',
      dosageForm: pkg.dosageForm || 'Not Specified',
      dosageFormFamily: pkg.dosageFormFamily,
      route: pkg.route,
      packageSize: pkg.packageSize,
      labeler: pkg.manufacturer,
      manufacturer: pkg.manufacturer,
      activeIngredients: pkg.raw.activeIngredients || [],
      marketingStatus: {
        ...marketingStatus,
        label: pkg.marketingStatusLabel,
      },
      listingExpirationDate: pkg.raw.listingExpirationDate,
    };
  });
}

function buildFilterOptions(
  request: DrugSearchRequest,
  parsed?: ParsedDrugQuery | null
): PackageFilterOptions {
  const dosageKeywords = [];

  if (request.dosageForm) {
    dosageKeywords.push(request.dosageForm.toLowerCase());
  }

  if (parsed?.dosageFormTokens?.length) {
    dosageKeywords.push(...parsed.dosageFormTokens);
  }

  return {
    strength: request.strength || parsed?.strengthTokens?.[0],
    dosageFormKeywords: dosageKeywords,
  };
}

export async function performDrugSearch(
  request: DrugSearchRequest,
  context: DrugSearchContext
): Promise<DrugSearchResult> {
  const { drugName, rxcui } = request;

  if (!drugName && !rxcui) {
    throw createSearchError('DRUG_NOT_FOUND', 'Either drugName or rxcui must be provided.');
  }

  const parsedQuery = drugName ? parseDrugQuery(drugName, request.strength) : null;

  const concept = await resolveDrugConcept(parsedQuery || ({} as ParsedDrugQuery), {
    rxcui,
  });

  // Pass generic name for fallback if RxCUI search fails
  const genericNameForFallback = parsedQuery?.baseName || concept.name || drugName;
  const packagesResult = await fetchFdaPackagesForRxcui(concept.rxcui, genericNameForFallback);

  if (!packagesResult.packages.length) {
    throw createSearchError('NO_PACKAGES_FOUND', 'No packages found for the specified drug', {
      rxcui: concept.rxcui,
    });
  }

  if (!packagesResult.activePackages.length) {
    if (packagesResult.inactivePackages.length) {
      throw createSearchError(
        'ONLY_INACTIVE_PACKAGES',
        'Only inactive NDC packages exist for this drug',
        { rxcui: concept.rxcui }
      );
    }
    throw createSearchError(
      'NO_ACTIVE_PACKAGES',
      'No active NDC packages found for this drug',
      { rxcui: concept.rxcui }
    );
  }

  const normalizedPackages = normalizePackages(packagesResult.activePackages);

  const filters = buildFilterOptions(request, parsedQuery || ({} as ParsedDrugQuery));

  const { filtered, reason } = filterPackages(normalizedPackages, filters);

  if (!filtered.length) {
    if (reason) {
      throw createSearchError(reason, 'No packages matched the provided filters', filters);
    }
    throw createSearchError('NO_ACTIVE_PACKAGES', 'No packages remain after filtering', filters);
  }

  const response: DrugSearchResult = {
    drug: {
      rxcui: concept.rxcui,
      name: concept.name,
      ingredientName: concept.ingredientName,
      clinicalDrugName: concept.clinicalName,
      strengthTokensParsed: parsedQuery?.strengthTokens || [],
      dosageFormTokensParsed: parsedQuery?.dosageFormTokens || [],
      resolvedDosageForms: concept.resolvedDosageForms,
      resolvedStrengths: concept.resolvedStrengths,
      warnings: concept.warnings,
    },
    packages: mapPackagesForResponse(filtered),
    metadata: {
      totalActivePackages: packagesResult.totalActive,
      totalInactivePackages: packagesResult.totalInactive,
      allStrengths: packagesResult.uniqueStrengths,
      allForms: packagesResult.uniqueForms,
    },
  };

  logger.info('Drug search completed', {
    requestId: context.requestId,
    correlationId: context.correlationId,
    rxcui: concept.rxcui,
    returnedPackages: response.packages.length,
  });

  return response;
}

