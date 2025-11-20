import type { NormalizedPackage, PackageFilterOptions } from './types';
import { createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'DrugSearch.PackageFilter' });

function normalizeStrengthValue(value: string): string {
  return value.toLowerCase().replace(/[\s-]/g, '');
}

function packageMatchesStrength(pkg: NormalizedPackage, strength?: string): boolean {
  if (!strength) return true;
  const normalizedFilter = normalizeStrengthValue(strength);
  const normalizedPackageStrength = normalizeStrengthValue(pkg.strength);
  return (
    normalizedPackageStrength.includes(normalizedFilter) ||
    normalizedFilter.includes(normalizedPackageStrength)
  );
}

function packageMatchesDosageForm(pkg: NormalizedPackage, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const dosageForm = pkg.dosageForm.toLowerCase();
  return keywords.some((keyword) => dosageForm.includes(keyword.toLowerCase()));
}

export function filterPackages(
  packages: NormalizedPackage[],
  options: PackageFilterOptions
): {
  filtered: NormalizedPackage[];
  reason?: 'NO_MATCHING_STRENGTH' | 'NO_MATCHING_DOSAGE_FORM';
} {
  let filtered = packages;

  if (options.strength) {
    filtered = filtered.filter((pkg) => packageMatchesStrength(pkg, options.strength));
    if (!filtered.length) {
      logger.warn('No packages match provided strength', { strength: options.strength });
      return { filtered, reason: 'NO_MATCHING_STRENGTH' };
    }
  }

  if (options.dosageFormKeywords && options.dosageFormKeywords.length) {
    filtered = filtered.filter((pkg) =>
      packageMatchesDosageForm(pkg, options.dosageFormKeywords || [])
    );
    if (!filtered.length) {
      logger.warn('No packages match provided dosage form keywords', {
        dosageForms: options.dosageFormKeywords,
      });
      return { filtered, reason: 'NO_MATCHING_DOSAGE_FORM' };
    }
  }

  return { filtered };
}

