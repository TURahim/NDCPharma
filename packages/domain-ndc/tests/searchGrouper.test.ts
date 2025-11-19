/**
 * Tests for dosage form grouping logic
 */

import { describe, it, expect } from 'vitest';
import {
  groupByDosageForm,
  sortDosageFormGroups,
  limitResultsPerGroup,
  expandDosageFormGroup,
  collapseDosageFormGroup,
  getGroupedResultsSummary,
  filterGroupsWithActiveResults,
  groupByDosageFormFamily,
} from '../src/searchGrouper';
import type { DrugSearchResult, DosageFormGroup } from '../src/types';
import { DosageFormType } from '../src/types';

// Helper to create test drug
function createTestDrug(
  overrides: Partial<DrugSearchResult> = {}
): DrugSearchResult {
  return {
    rxcui: '123',
    name: 'Test Drug',
    strength: '500 MG',
    dosageForm: 'TABLET',
    dosageFormFamily: DosageFormType.SOLID,
    hasActiveNDCs: true,
    ndcCount: 10,
    commonUsageScore: 80,
    badges: [],
    ...overrides,
  };
}

describe('groupByDosageForm', () => {
  it('should group drugs by dosage form', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '2', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '3', dosageForm: 'CAPSULE' }),
    ];

    const grouped = groupByDosageForm(results);

    expect(grouped.dosageFormGroups.length).toBe(2);
    expect(grouped.totalResults).toBe(3);
  });

  it('should handle case-insensitive dosage forms', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageForm: 'tablet' }),
      createTestDrug({ rxcui: '2', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '3', dosageForm: 'Tablet' }),
    ];

    const grouped = groupByDosageForm(results);

    expect(grouped.dosageFormGroups.length).toBe(1);
    expect(grouped.dosageFormGroups[0].results.length).toBe(3);
  });

  it('should format dosage form labels to title case', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ dosageForm: 'ORAL SUSPENSION' }),
    ];

    const grouped = groupByDosageForm(results);

    expect(grouped.dosageFormGroups[0].dosageForm).toBe('Oral Suspension');
  });

  it('should set all groups as expanded by default', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '2', dosageForm: 'CAPSULE' }),
    ];

    const grouped = groupByDosageForm(results);

    grouped.dosageFormGroups.forEach((group) => {
      expect(group.expanded).toBe(true);
    });
  });

  it('should detect inactive results', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const grouped = groupByDosageForm(results);

    expect(grouped.hasInactiveResults).toBe(true);
  });

  it('should set hasInactiveResults to false when all active', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: true }),
    ];

    const grouped = groupByDosageForm(results);

    expect(grouped.hasInactiveResults).toBe(false);
  });

  it('should handle empty results array', () => {
    const grouped = groupByDosageForm([]);

    expect(grouped.dosageFormGroups).toEqual([]);
    expect(grouped.totalResults).toBe(0);
    expect(grouped.hasInactiveResults).toBe(false);
  });

  it('should preserve dosage form family', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({
        dosageForm: 'ORAL SUSPENSION',
        dosageFormFamily: DosageFormType.LIQUID,
      }),
    ];

    const grouped = groupByDosageForm(results);

    expect(grouped.dosageFormGroups[0].dosageFormFamily).toBe(
      DosageFormType.LIQUID
    );
  });
});

describe('sortDosageFormGroups', () => {
  it('should sort by family order: SOLID, LIQUID, INJECTABLE, SPECIAL', () => {
    const groups: DosageFormGroup[] = [
      {
        dosageForm: 'Injection',
        dosageFormFamily: DosageFormType.INJECTABLE,
        results: [createTestDrug()],
        expanded: true,
      },
      {
        dosageForm: 'Tablet',
        dosageFormFamily: DosageFormType.SOLID,
        results: [createTestDrug()],
        expanded: true,
      },
      {
        dosageForm: 'Oral Suspension',
        dosageFormFamily: DosageFormType.LIQUID,
        results: [createTestDrug()],
        expanded: true,
      },
      {
        dosageForm: 'Patch',
        dosageFormFamily: DosageFormType.SPECIAL,
        results: [createTestDrug()],
        expanded: true,
      },
    ];

    const sorted = sortDosageFormGroups(groups);

    expect(sorted[0].dosageFormFamily).toBe(DosageFormType.SOLID);
    expect(sorted[1].dosageFormFamily).toBe(DosageFormType.LIQUID);
    expect(sorted[2].dosageFormFamily).toBe(DosageFormType.INJECTABLE);
    expect(sorted[3].dosageFormFamily).toBe(DosageFormType.SPECIAL);
  });

  it('should sort tablets before capsules within SOLID family', () => {
    const groups: DosageFormGroup[] = [
      {
        dosageForm: 'CAPSULE',
        dosageFormFamily: DosageFormType.SOLID,
        results: [createTestDrug()],
        expanded: true,
      },
      {
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        results: [createTestDrug()],
        expanded: true,
      },
    ];

    const sorted = sortDosageFormGroups(groups);

    expect(sorted[0].dosageForm).toBe('TABLET');
    expect(sorted[1].dosageForm).toBe('CAPSULE');
  });

  it('should sort by result count as tertiary sort', () => {
    const groups: DosageFormGroup[] = [
      {
        dosageForm: 'Unknown Form A',
        dosageFormFamily: DosageFormType.SPECIAL,
        results: [createTestDrug()],
        expanded: true,
      },
      {
        dosageForm: 'Unknown Form B',
        dosageFormFamily: DosageFormType.SPECIAL,
        results: [createTestDrug(), createTestDrug(), createTestDrug()],
        expanded: true,
      },
    ];

    const sorted = sortDosageFormGroups(groups);

    // More results should come first
    expect(sorted[0].dosageForm).toBe('Unknown Form B');
    expect(sorted[1].dosageForm).toBe('Unknown Form A');
  });

  it('should not mutate original array', () => {
    const groups: DosageFormGroup[] = [
      {
        dosageForm: 'Capsule',
        dosageFormFamily: DosageFormType.SOLID,
        results: [createTestDrug()],
        expanded: true,
      },
      {
        dosageForm: 'Tablet',
        dosageFormFamily: DosageFormType.SOLID,
        results: [createTestDrug()],
        expanded: true,
      },
    ];

    const originalFirst = groups[0].dosageForm;
    sortDosageFormGroups(groups);

    expect(groups[0].dosageForm).toBe(originalFirst);
  });
});

describe('limitResultsPerGroup', () => {
  it('should limit results to maxPerGroup (default 3)', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '2', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '3', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '4', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '5', dosageForm: 'TABLET' }),
    ];

    const grouped = groupByDosageForm(results);
    const limited = limitResultsPerGroup(grouped);

    expect(limited.dosageFormGroups[0].results.length).toBe(3);
  });

  it('should respect custom maxPerGroup parameter', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '2', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '3', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '4', dosageForm: 'TABLET' }),
    ];

    const grouped = groupByDosageForm(results);
    const limited = limitResultsPerGroup(grouped, 2);

    expect(limited.dosageFormGroups[0].results.length).toBe(2);
  });

  it('should not limit groups with fewer results than maxPerGroup', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '2', dosageForm: 'TABLET' }),
    ];

    const grouped = groupByDosageForm(results);
    const limited = limitResultsPerGroup(grouped, 5);

    expect(limited.dosageFormGroups[0].results.length).toBe(2);
  });

  it('should apply limit to all groups', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '2', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '3', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '4', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '5', dosageForm: 'CAPSULE' }),
      createTestDrug({ rxcui: '6', dosageForm: 'CAPSULE' }),
      createTestDrug({ rxcui: '7', dosageForm: 'CAPSULE' }),
      createTestDrug({ rxcui: '8', dosageForm: 'CAPSULE' }),
    ];

    const grouped = groupByDosageForm(results);
    const limited = limitResultsPerGroup(grouped, 2);

    limited.dosageFormGroups.forEach((group) => {
      expect(group.results.length).toBeLessThanOrEqual(2);
    });
  });

  it('should preserve original grouped data structure', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ dosageForm: 'TABLET' }),
    ];

    const grouped = groupByDosageForm(results);
    const limited = limitResultsPerGroup(grouped);

    expect(limited.totalResults).toBe(grouped.totalResults);
    expect(limited.hasInactiveResults).toBe(grouped.hasInactiveResults);
  });
});

describe('expandDosageFormGroup', () => {
  it('should expand specified group', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ dosageForm: 'TABLET' }),
      createTestDrug({ dosageForm: 'CAPSULE' }),
    ];

    const grouped = groupByDosageForm(results);
    const collapsed = collapseDosageFormGroup(grouped, 'Tablet');
    const expanded = expandDosageFormGroup(collapsed, 'Tablet');

    const tabletGroup = expanded.dosageFormGroups.find(
      (g) => g.dosageForm === 'Tablet'
    );
    expect(tabletGroup?.expanded).toBe(true);
  });

  it('should not affect other groups', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ dosageForm: 'TABLET' }),
      createTestDrug({ dosageForm: 'CAPSULE' }),
    ];

    const grouped = groupByDosageForm(results);
    const collapsed = collapseDosageFormGroup(grouped, 'Capsule');
    const expanded = expandDosageFormGroup(collapsed, 'Tablet');

    const capsuleGroup = expanded.dosageFormGroups.find(
      (g) => g.dosageForm === 'Capsule'
    );
    expect(capsuleGroup?.expanded).toBe(false);
  });

  it('should handle non-existent dosage form gracefully', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ dosageForm: 'TABLET' }),
    ];

    const grouped = groupByDosageForm(results);
    const expanded = expandDosageFormGroup(grouped, 'Non-Existent Form');

    expect(grouped.dosageFormGroups.length).toBe(
      expanded.dosageFormGroups.length
    );
  });
});

describe('collapseDosageFormGroup', () => {
  it('should collapse specified group', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ dosageForm: 'TABLET' }),
      createTestDrug({ dosageForm: 'CAPSULE' }),
    ];

    const grouped = groupByDosageForm(results);
    const collapsed = collapseDosageFormGroup(grouped, 'Tablet');

    const tabletGroup = collapsed.dosageFormGroups.find(
      (g) => g.dosageForm === 'Tablet'
    );
    expect(tabletGroup?.expanded).toBe(false);
  });

  it('should not affect other groups', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ dosageForm: 'TABLET' }),
      createTestDrug({ dosageForm: 'CAPSULE' }),
    ];

    const grouped = groupByDosageForm(results);
    const collapsed = collapseDosageFormGroup(grouped, 'Tablet');

    const capsuleGroup = collapsed.dosageFormGroups.find(
      (g) => g.dosageForm === 'Capsule'
    );
    expect(capsuleGroup?.expanded).toBe(true);
  });
});

describe('getGroupedResultsSummary', () => {
  it('should return correct summary statistics', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', hasActiveNDCs: true }),
      createTestDrug({ rxcui: '2', hasActiveNDCs: true }),
      createTestDrug({ rxcui: '3', hasActiveNDCs: false }),
      createTestDrug({ rxcui: '4', dosageForm: 'CAPSULE', hasActiveNDCs: true }),
    ];

    const grouped = groupByDosageForm(results);
    const summary = getGroupedResultsSummary(grouped);

    expect(summary.totalGroups).toBe(2); // TABLET and CAPSULE
    expect(summary.totalResults).toBe(4);
    expect(summary.activeResults).toBe(3);
    expect(summary.inactiveResults).toBe(1);
  });

  it('should return top form', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ dosageForm: 'CAPSULE' }),
      createTestDrug({ dosageForm: 'TABLET' }),
    ];

    const grouped = groupByDosageForm(results);
    const sorted = { ...grouped, dosageFormGroups: sortDosageFormGroups(grouped.dosageFormGroups) };
    const summary = getGroupedResultsSummary(sorted);

    // TABLET should be first after sorting
    expect(summary.topForm).toBe('Tablet');
  });

  it('should return null topForm for empty results', () => {
    const grouped = groupByDosageForm([]);
    const summary = getGroupedResultsSummary(grouped);

    expect(summary.topForm).toBeNull();
  });
});

describe('filterGroupsWithActiveResults', () => {
  it('should filter out groups with no active results', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageForm: 'TABLET', hasActiveNDCs: true }),
      createTestDrug({ rxcui: '2', dosageForm: 'TABLET', hasActiveNDCs: true }),
      createTestDrug({ rxcui: '3', dosageForm: 'CAPSULE', hasActiveNDCs: false }),
      createTestDrug({ rxcui: '4', dosageForm: 'CAPSULE', hasActiveNDCs: false }),
    ];

    const grouped = groupByDosageForm(results);
    const filtered = filterGroupsWithActiveResults(grouped);

    expect(filtered.dosageFormGroups.length).toBe(1); // Only TABLET group
    expect(filtered.dosageFormGroups[0].dosageForm).toBe('Tablet');
  });

  it('should filter inactive results within groups', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageForm: 'TABLET', hasActiveNDCs: true }),
      createTestDrug({ rxcui: '2', dosageForm: 'TABLET', hasActiveNDCs: false }),
    ];

    const grouped = groupByDosageForm(results);
    const filtered = filterGroupsWithActiveResults(grouped);

    expect(filtered.dosageFormGroups[0].results.length).toBe(1);
    expect(filtered.dosageFormGroups[0].results[0].hasActiveNDCs).toBe(true);
  });

  it('should update totalResults count', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const grouped = groupByDosageForm(results);
    const filtered = filterGroupsWithActiveResults(grouped);

    expect(filtered.totalResults).toBe(1);
  });

  it('should preserve hasInactiveResults flag', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const grouped = groupByDosageForm(results);
    const filtered = filterGroupsWithActiveResults(grouped);

    expect(filtered.hasInactiveResults).toBe(true);
  });

  it('should return empty groups for all inactive results', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const grouped = groupByDosageForm(results);
    const filtered = filterGroupsWithActiveResults(grouped);

    expect(filtered.dosageFormGroups).toEqual([]);
    expect(filtered.totalResults).toBe(0);
  });
});

describe('groupByDosageFormFamily', () => {
  it('should group by dosage form family', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
      }),
      createTestDrug({
        dosageForm: 'CAPSULE',
        dosageFormFamily: DosageFormType.SOLID,
      }),
      createTestDrug({
        dosageForm: 'ORAL SUSPENSION',
        dosageFormFamily: DosageFormType.LIQUID,
      }),
      createTestDrug({
        dosageForm: 'INJECTION',
        dosageFormFamily: DosageFormType.INJECTABLE,
      }),
    ];

    const familyMap = groupByDosageFormFamily(results);

    expect(familyMap.size).toBe(3);
    expect(familyMap.get(DosageFormType.SOLID)?.length).toBe(2);
    expect(familyMap.get(DosageFormType.LIQUID)?.length).toBe(1);
    expect(familyMap.get(DosageFormType.INJECTABLE)?.length).toBe(1);
  });

  it('should handle empty array', () => {
    const familyMap = groupByDosageFormFamily([]);

    expect(familyMap.size).toBe(0);
  });

  it('should preserve all drugs in groups', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageFormFamily: DosageFormType.SOLID }),
      createTestDrug({ rxcui: '2', dosageFormFamily: DosageFormType.SOLID }),
      createTestDrug({ rxcui: '3', dosageFormFamily: DosageFormType.LIQUID }),
    ];

    const familyMap = groupByDosageFormFamily(results);
    const totalDrugs = Array.from(familyMap.values()).reduce(
      (sum, drugs) => sum + drugs.length,
      0
    );

    expect(totalDrugs).toBe(3);
  });
});


