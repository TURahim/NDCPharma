import { fdaClient, type NDCPackage } from '@clients-openfda';
import { createLogger } from '@core-guardrails';
import type { PackageRetrievalResult } from './types';
import { createSearchError } from './errors';

const logger = createLogger({ service: 'DrugSearch.FDAService' });
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // safety guard (2000 packages)

function splitByMarketingStatus(packages: NDCPackage[]): {
  active: NDCPackage[];
  inactive: NDCPackage[];
} {
  const active: NDCPackage[] = [];
  const inactive: NDCPackage[] = [];

  packages.forEach((pkg) => {
    if (pkg.marketingStatus?.isActive) {
      active.push(pkg);
    } else {
      inactive.push(pkg);
    }
  });

  return { active, inactive };
}

function collectMetadata(packages: NDCPackage[]): {
  strengths: string[];
  forms: string[];
} {
  const strengths = new Set<string>();
  const forms = new Set<string>();

  packages.forEach((pkg) => {
    pkg.activeIngredients?.forEach((ingredient) => {
      if (ingredient.strength) {
        strengths.add(ingredient.strength);
      }
    });

    if (pkg.dosageForm) {
      forms.add(pkg.dosageForm);
    }
  });

  return {
    strengths: Array.from(strengths).sort(),
    forms: Array.from(forms).sort(),
  };
}

export async function fetchFdaPackagesForRxcui(
  rxcui: string,
  genericName?: string
): Promise<PackageRetrievalResult> {
  logger.info('Fetching FDA packages', { rxcui, genericName });

  let allPackages: NDCPackage[] = [];
  let usedFallback = false;

  try {
    // Try RxCUI search first
    let page = 0;

    while (page < MAX_PAGES) {
      const skip = page * PAGE_SIZE;
      const chunk = await fdaClient.getNDCsByRxCUI(rxcui, {
        limit: PAGE_SIZE,
        skip,
        activeOnly: false,
      });

      if (!chunk.length) {
        break;
      }

      allPackages.push(...chunk);
      page += 1;

      if (chunk.length < PAGE_SIZE) {
        break;
      }
    }

    logger.info('FDA packages retrieved via RxCUI', {
      rxcui,
      totalPackages: allPackages.length,
      pagesFetched: page,
    });
  } catch (error: any) {
    // If FDA RxCUI search fails with 404, try generic name fallback
    if (error?.status === 404 && genericName) {
      logger.warn('RxCUI search failed, attempting generic name fallback', {
        rxcui,
        genericName,
        error: error.message,
      });

      try {
        let page = 0;

        while (page < MAX_PAGES) {
          const skip = page * PAGE_SIZE;
          const chunk = await fdaClient.searchByGenericName(genericName, {
            limit: PAGE_SIZE,
            skip,
            activeOnly: false,
          });

          if (!chunk.length) {
            break;
          }

          allPackages.push(...chunk);
          page += 1;

          if (chunk.length < PAGE_SIZE) {
            break;
          }
        }

        usedFallback = true;

        logger.info('FDA packages retrieved via generic name fallback', {
          genericName,
          totalPackages: allPackages.length,
          pagesFetched: page,
        });
      } catch (fallbackError: any) {
        logger.error('Generic name fallback also failed', fallbackError as Error, {
          genericName,
          rxcui,
        });

        throw createSearchError(
          'FDA_LOOKUP_FAILED',
          `FDA did not return any packages for "${genericName}". The drug may not be available in the FDA database.`,
          { rxcui, genericName, originalError: error.message }
        );
      }
    } else {
      // FDA error without fallback option
      logger.error('FDA lookup failed without fallback', error as Error, { rxcui });

      throw createSearchError(
        'FDA_LOOKUP_FAILED',
        'Unable to retrieve packages from FDA NDC Directory.',
        { rxcui, error: error.message }
      );
    }
  }

  if (!allPackages.length) {
    throw createSearchError(
      'NO_PACKAGES_FOUND',
      'No packages found in FDA NDC Directory for this drug.',
      { rxcui, genericName, usedFallback }
    );
  }

  const { active, inactive } = splitByMarketingStatus(allPackages);
  const metadata = collectMetadata(allPackages);

  return {
    packages: allPackages,
    activePackages: active,
    inactivePackages: inactive,
    totalActive: active.length,
    totalInactive: inactive.length,
    uniqueStrengths: metadata.strengths,
    uniqueForms: metadata.forms,
  };
}

