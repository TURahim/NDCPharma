import type { NDCPackage } from '@clients-openfda';
import { createLogger } from '@core-guardrails';
import { normalizeDosageForm } from '@domain-ndc';
import type { NormalizedPackage } from './types';

const logger = createLogger({ service: 'DrugSearch.PackageNormalizer' });

function toTitleCase(value?: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatNdc(ndc: string): string {
  const digits = ndc.replace(/-/g, '');
  if (digits.length !== 11) {
    return ndc;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 9)}-${digits.slice(9)}`;
}

function buildStrength(pkg: NDCPackage): string {
  if (!pkg.activeIngredients || !pkg.activeIngredients.length) {
    return 'Not Specified';
  }

  return pkg.activeIngredients
    .map((ingredient) => {
      const strength = ingredient.strength || '';
      return strength.trim();
    })
    .filter(Boolean)
    .join(' / ');
}

function buildPackageSizeDisplay(pkg: NDCPackage): string {
  const quantity = pkg.packageSize?.quantity;
  const unit = pkg.packageSize?.unit;
  if (!quantity || !unit) {
    return pkg.packageSize?.description || 'Not Specified';
  }
  return `${quantity} ${toTitleCase(unit)}`;
}

function normalizeRoute(route?: string[]): string[] {
  if (!route || !route.length) return [];
  return route.map((entry) => toTitleCase(entry));
}

function normalizeMarketingStatus(pkg: NDCPackage): {
  status: 'active' | 'inactive';
  label: string;
} {
  if (pkg.marketingStatus?.isActive) {
    return { status: 'active', label: 'Active' };
  }
  const description = pkg.marketingStatus?.status || 'Inactive';
  return { status: 'inactive', label: toTitleCase(description) || 'Inactive' };
}

export function normalizePackages(packages: NDCPackage[]): NormalizedPackage[] {
  const normalized = packages.map((pkg) => {
    const marketing = normalizeMarketingStatus(pkg);
    const normalizedPkg: NormalizedPackage = {
      ndc: pkg.ndc,
      formattedNdc: formatNdc(pkg.ndc),
      productNdc: pkg.productNdc,
      brandName: toTitleCase(pkg.brandName) || '—',
      genericName: toTitleCase(pkg.genericName) || 'Not Specified',
      strength: buildStrength(pkg),
      dosageForm: toTitleCase(pkg.dosageForm) || 'Not Specified',
      dosageFormFamily: normalizeDosageForm(pkg.dosageForm || ''),
      route: normalizeRoute(pkg.route),
      packageSize: {
        quantity: pkg.packageSize?.quantity || 0,
        unit: pkg.packageSize?.unit || '',
        display: buildPackageSizeDisplay(pkg),
      },
      manufacturer: toTitleCase(pkg.labeler) || 'Not Specified',
      marketingStatus: marketing.status,
      marketingStatusLabel: marketing.label,
      raw: pkg,
    };

    return normalizedPkg;
  });

  logger.debug('Normalized packages', { total: normalized.length });
  return normalized;
}

