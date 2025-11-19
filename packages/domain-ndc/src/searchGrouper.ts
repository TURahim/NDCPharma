/**
 * Dosage form grouping logic for simple search view
 * Groups drug results by dosage form family and specific form
 */

import type {
  DrugSearchResult,
  DosageFormGroup,
  GroupedSearchResults,
} from './types.js';
import { DosageFormType } from './types.js';

/**
 * Dosage form family display order (most common first)
 */
const FAMILY_SORT_ORDER: DosageFormType[] = [
  DosageFormType.SOLID,
  DosageFormType.LIQUID,
  DosageFormType.INJECTABLE,
  DosageFormType.SPECIAL,
];

/**
 * Specific dosage form sort order within families
 */
const FORM_SORT_ORDER: Record<string, number> = {
  // Solid forms
  TABLET: 1,
  CAPSULE: 2,
  'CAPSULE, EXTENDED RELEASE': 3,
  'TABLET, EXTENDED RELEASE': 4,
  'TABLET, CHEWABLE': 5,

  // Liquid forms
  'ORAL SOLUTION': 10,
  'ORAL SUSPENSION': 11,
  SYRUP: 12,
  ELIXIR: 13,

  // Injectable forms
  INJECTION: 20,
  'INJECTION, SOLUTION': 21,
  'INJECTION, SUSPENSION': 22,

  // Special forms
  CREAM: 30,
  OINTMENT: 31,
  PATCH: 32,
  INHALER: 33,
};

/**
 * Group search results by dosage form
 * 
 * @param results - Array of drug search results
 * @returns Grouped results by dosage form
 */
export function groupByDosageForm(
  results: DrugSearchResult[]
): GroupedSearchResults {
  // Create a map of dosage form -> results
  const formMap = new Map<string, DrugSearchResult[]>();

  for (const result of results) {
    const key = result.dosageForm.toUpperCase();
    if (!formMap.has(key)) {
      formMap.set(key, []);
    }
    formMap.get(key)!.push(result);
  }

  // Convert map to array of groups
  const groups: DosageFormGroup[] = Array.from(formMap.entries()).map(
    ([dosageForm, groupResults]) => ({
      dosageForm: formatDosageFormLabel(dosageForm),
      dosageFormFamily: groupResults[0].dosageFormFamily,
      results: groupResults,
      expanded: true, // Default to expanded
    })
  );

  // Sort groups
  const sortedGroups = sortDosageFormGroups(groups);

  return {
    dosageFormGroups: sortedGroups,
    totalResults: results.length,
    hasInactiveResults: results.some((r) => !r.hasActiveNDCs),
  };
}

/**
 * Sort dosage form groups by family and commonality
 * 
 * @param groups - Array of dosage form groups
 * @returns Sorted array
 */
export function sortDosageFormGroups(
  groups: DosageFormGroup[]
): DosageFormGroup[] {
  return [...groups].sort((a, b) => {
    // Primary sort: by family order
    const aFamilyIndex = FAMILY_SORT_ORDER.indexOf(a.dosageFormFamily);
    const bFamilyIndex = FAMILY_SORT_ORDER.indexOf(b.dosageFormFamily);

    if (aFamilyIndex !== bFamilyIndex) {
      return aFamilyIndex - bFamilyIndex;
    }

    // Secondary sort: by specific form order
    const aFormOrder =
      FORM_SORT_ORDER[a.dosageForm.toUpperCase()] || 999;
    const bFormOrder =
      FORM_SORT_ORDER[b.dosageForm.toUpperCase()] || 999;

    if (aFormOrder !== bFormOrder) {
      return aFormOrder - bFormOrder;
    }

    // Tertiary sort: by result count (descending)
    return b.results.length - a.results.length;
  });
}

/**
 * Limit results per group to a maximum number
 * 
 * @param grouped - Grouped search results
 * @param maxPerGroup - Maximum results per group (default: 3)
 * @returns Grouped results with limited results per group
 */
export function limitResultsPerGroup(
  grouped: GroupedSearchResults,
  maxPerGroup = 3
): GroupedSearchResults {
  const limitedGroups = grouped.dosageFormGroups.map((group) => ({
    ...group,
    results: group.results.slice(0, maxPerGroup),
  }));

  return {
    ...grouped,
    dosageFormGroups: limitedGroups,
  };
}

/**
 * Expand a specific dosage form group
 * 
 * @param grouped - Grouped search results
 * @param dosageForm - Dosage form to expand
 * @returns Updated grouped results
 */
export function expandDosageFormGroup(
  grouped: GroupedSearchResults,
  dosageForm: string
): GroupedSearchResults {
  const updatedGroups = grouped.dosageFormGroups.map((group) =>
    group.dosageForm === dosageForm ? { ...group, expanded: true } : group
  );

  return {
    ...grouped,
    dosageFormGroups: updatedGroups,
  };
}

/**
 * Collapse a specific dosage form group
 * 
 * @param grouped - Grouped search results
 * @param dosageForm - Dosage form to collapse
 * @returns Updated grouped results
 */
export function collapseDosageFormGroup(
  grouped: GroupedSearchResults,
  dosageForm: string
): GroupedSearchResults {
  const updatedGroups = grouped.dosageFormGroups.map((group) =>
    group.dosageForm === dosageForm ? { ...group, expanded: false } : group
  );

  return {
    ...grouped,
    dosageFormGroups: updatedGroups,
  };
}

/**
 * Format dosage form label for display
 * 
 * @param dosageForm - Raw dosage form string
 * @returns Formatted label
 */
function formatDosageFormLabel(dosageForm: string): string {
  // Convert to title case
  return dosageForm
    .toLowerCase()
    .split(/[\s,]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get summary statistics for grouped results
 * 
 * @param grouped - Grouped search results
 * @returns Summary object
 */
export function getGroupedResultsSummary(grouped: GroupedSearchResults): {
  totalGroups: number;
  totalResults: number;
  activeResults: number;
  inactiveResults: number;
  topForm: string | null;
} {
  const activeResults = grouped.dosageFormGroups
    .flatMap((g) => g.results)
    .filter((r) => r.hasActiveNDCs).length;

  const topForm =
    grouped.dosageFormGroups.length > 0
      ? grouped.dosageFormGroups[0].dosageForm
      : null;

  return {
    totalGroups: grouped.dosageFormGroups.length,
    totalResults: grouped.totalResults,
    activeResults,
    inactiveResults: grouped.totalResults - activeResults,
    topForm,
  };
}

/**
 * Filter groups to only include those with active results
 * 
 * @param grouped - Grouped search results
 * @returns Filtered grouped results
 */
export function filterGroupsWithActiveResults(
  grouped: GroupedSearchResults
): GroupedSearchResults {
  const activeGroups = grouped.dosageFormGroups
    .map((group) => ({
      ...group,
      results: group.results.filter((r) => r.hasActiveNDCs),
    }))
    .filter((group) => group.results.length > 0);

  return {
    dosageFormGroups: activeGroups,
    totalResults: activeGroups.reduce(
      (sum, group) => sum + group.results.length,
      0
    ),
    hasInactiveResults: grouped.hasInactiveResults,
  };
}

/**
 * Group results by dosage form family (higher level grouping)
 * 
 * @param results - Array of drug search results
 * @returns Map of family -> results
 */
export function groupByDosageFormFamily(
  results: DrugSearchResult[]
): Map<DosageFormType, DrugSearchResult[]> {
  const familyMap = new Map<DosageFormType, DrugSearchResult[]>();

  for (const result of results) {
    if (!familyMap.has(result.dosageFormFamily)) {
      familyMap.set(result.dosageFormFamily, []);
    }
    familyMap.get(result.dosageFormFamily)!.push(result);
  }

  return familyMap;
}

