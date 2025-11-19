/**
 * Tests for search filtering and availability detection
 */

import { describe, it, expect } from 'vitest';
import {
  filterActiveOnly,
  separateActiveInactive,
  detectAvailabilityState,
  getAvailabilityMessage,
  getSuggestedActions,
  filterByStrength,
  filterByDosageForm,
  filterByMinNDCCount,
  filterByMinUsageScore,
  filterByBadgeType,
  applyMultipleFilters,
  countByAvailability,
  checkWarningConditions,
} from '../src/searchFilters';
import type { DrugSearchResult } from '../src/types';
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

describe('filterActiveOnly', () => {
  it('should return only drugs with active NDCs', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', hasActiveNDCs: true }),
      createTestDrug({ rxcui: '2', hasActiveNDCs: false }),
      createTestDrug({ rxcui: '3', hasActiveNDCs: true }),
    ];

    const filtered = filterActiveOnly(results);

    expect(filtered.length).toBe(2);
    expect(filtered.every((d) => d.hasActiveNDCs)).toBe(true);
  });

  it('should return empty array when no active drugs', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const filtered = filterActiveOnly(results);

    expect(filtered).toEqual([]);
  });

  it('should return all drugs when all active', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', hasActiveNDCs: true }),
      createTestDrug({ rxcui: '2', hasActiveNDCs: true }),
    ];

    const filtered = filterActiveOnly(results);

    expect(filtered.length).toBe(2);
  });

  it('should handle empty array', () => {
    const filtered = filterActiveOnly([]);

    expect(filtered).toEqual([]);
  });
});

describe('separateActiveInactive', () => {
  it('should separate results into active and inactive', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', hasActiveNDCs: true }),
      createTestDrug({ rxcui: '2', hasActiveNDCs: false }),
      createTestDrug({ rxcui: '3', hasActiveNDCs: true }),
      createTestDrug({ rxcui: '4', hasActiveNDCs: false }),
    ];

    const { active, inactive } = separateActiveInactive(results);

    expect(active.length).toBe(2);
    expect(inactive.length).toBe(2);
    expect(active.every((d) => d.hasActiveNDCs)).toBe(true);
    expect(inactive.every((d) => !d.hasActiveNDCs)).toBe(true);
  });

  it('should handle all active results', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: true }),
    ];

    const { active, inactive } = separateActiveInactive(results);

    expect(active.length).toBe(2);
    expect(inactive.length).toBe(0);
  });

  it('should handle all inactive results', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const { active, inactive } = separateActiveInactive(results);

    expect(active.length).toBe(0);
    expect(inactive.length).toBe(2);
  });

  it('should handle empty array', () => {
    const { active, inactive } = separateActiveInactive([]);

    expect(active).toEqual([]);
    expect(inactive).toEqual([]);
  });
});

describe('detectAvailabilityState', () => {
  it('should return NOT_FOUND when no RxNorm match', () => {
    const state = detectAvailabilityState([], false);

    expect(state).toBe('NOT_FOUND');
  });

  it('should return NOT_FOUND when results are empty', () => {
    const state = detectAvailabilityState([], true);

    expect(state).toBe('NOT_FOUND');
  });

  it('should return NO_FDA_NDCS when RxNorm match but no NDCs', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ ndcCount: 0, hasActiveNDCs: false }),
    ];

    const state = detectAvailabilityState(results, true);

    expect(state).toBe('NO_FDA_NDCS');
  });

  it('should return ACTIVE_FOUND when active NDCs exist', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ ndcCount: 10, hasActiveNDCs: true }),
    ];

    const state = detectAvailabilityState(results, true);

    expect(state).toBe('ACTIVE_FOUND');
  });

  it('should return ONLY_INACTIVE when NDCs exist but all inactive', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ ndcCount: 10, hasActiveNDCs: false }),
    ];

    const state = detectAvailabilityState(results, true);

    expect(state).toBe('ONLY_INACTIVE');
  });

  it('should return ACTIVE_FOUND even if some inactive exist', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ ndcCount: 10, hasActiveNDCs: true }),
      createTestDrug({ ndcCount: 5, hasActiveNDCs: false }),
    ];

    const state = detectAvailabilityState(results, true);

    expect(state).toBe('ACTIVE_FOUND');
  });
});

describe('getAvailabilityMessage', () => {
  it('should return correct message for ACTIVE_FOUND', () => {
    const message = getAvailabilityMessage('ACTIVE_FOUND');

    expect(message).toContain('Active');
    expect(message).toContain('found');
  });

  it('should return correct message for ONLY_INACTIVE', () => {
    const message = getAvailabilityMessage('ONLY_INACTIVE');

    expect(message).toContain('no active NDCs');
    expect(message).toContain('discontinued');
  });

  it('should return correct message for NO_FDA_NDCS', () => {
    const message = getAvailabilityMessage('NO_FDA_NDCS');

    expect(message).toContain('no FDA-listed NDCs');
  });

  it('should return correct message for NOT_FOUND', () => {
    const message = getAvailabilityMessage('NOT_FOUND');

    expect(message).toContain('No matching medications');
  });
});

describe('getSuggestedActions', () => {
  it('should return actions for NOT_FOUND state', () => {
    const actions = getSuggestedActions('NOT_FOUND');

    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some((a) => a.includes('spelling'))).toBe(true);
  });

  it('should return actions for NO_FDA_NDCS state', () => {
    const actions = getSuggestedActions('NO_FDA_NDCS');

    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some((a) => a.includes('United States'))).toBe(true);
  });

  it('should return actions for ONLY_INACTIVE state', () => {
    const actions = getSuggestedActions('ONLY_INACTIVE');

    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some((a) => a.includes('Active Only'))).toBe(true);
  });

  it('should return empty array for ACTIVE_FOUND state', () => {
    const actions = getSuggestedActions('ACTIVE_FOUND');

    expect(actions).toEqual([]);
  });
});

describe('filterByStrength', () => {
  it('should filter by exact strength match', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', strength: '500 MG' }),
      createTestDrug({ rxcui: '2', strength: '250 MG' }),
      createTestDrug({ rxcui: '3', strength: '1000 MG' }),
    ];

    const filtered = filterByStrength(results, '500');

    expect(filtered.length).toBe(1);
    expect(filtered[0].strength).toContain('500');
  });

  it('should filter case-insensitively', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ strength: '500 MG' }),
    ];

    const filtered = filterByStrength(results, 'mg');

    expect(filtered.length).toBe(1);
  });

  it('should return all results for empty query', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1' }),
      createTestDrug({ rxcui: '2' }),
    ];

    const filtered = filterByStrength(results, '');

    expect(filtered.length).toBe(2);
  });

  it('should handle partial matches', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ strength: '500 MG' }),
      createTestDrug({ strength: '5000 MG' }),
    ];

    const filtered = filterByStrength(results, '500');

    expect(filtered.length).toBe(2); // Both contain "500"
  });
});

describe('filterByDosageForm', () => {
  it('should filter by exact dosage form match', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', dosageForm: 'TABLET' }),
      createTestDrug({ rxcui: '2', dosageForm: 'CAPSULE' }),
      createTestDrug({ rxcui: '3', dosageForm: 'TABLET' }),
    ];

    const filtered = filterByDosageForm(results, 'TABLET');

    expect(filtered.length).toBe(2);
    expect(filtered.every((d) => d.dosageForm === 'TABLET')).toBe(true);
  });

  it('should filter case-insensitively', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ dosageForm: 'TABLET' }),
    ];

    const filtered = filterByDosageForm(results, 'tablet');

    expect(filtered.length).toBe(1);
  });

  it('should return all results for empty query', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1' }),
      createTestDrug({ rxcui: '2' }),
    ];

    const filtered = filterByDosageForm(results, '');

    expect(filtered.length).toBe(2);
  });

  it('should handle partial matches', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ dosageForm: 'TABLET' }),
      createTestDrug({ dosageForm: 'TABLET, EXTENDED RELEASE' }),
      createTestDrug({ dosageForm: 'CAPSULE' }),
    ];

    const filtered = filterByDosageForm(results, 'TABLET');

    expect(filtered.length).toBe(2);
  });
});

describe('filterByMinNDCCount', () => {
  it('should filter by minimum NDC count', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', ndcCount: 5 }),
      createTestDrug({ rxcui: '2', ndcCount: 15 }),
      createTestDrug({ rxcui: '3', ndcCount: 25 }),
    ];

    const filtered = filterByMinNDCCount(results, 10);

    expect(filtered.length).toBe(2);
    expect(filtered.every((d) => d.ndcCount >= 10)).toBe(true);
  });

  it('should include drugs with exact min count', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ ndcCount: 10 }),
    ];

    const filtered = filterByMinNDCCount(results, 10);

    expect(filtered.length).toBe(1);
  });

  it('should return empty array when no drugs meet minimum', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ ndcCount: 5 }),
    ];

    const filtered = filterByMinNDCCount(results, 10);

    expect(filtered).toEqual([]);
  });
});

describe('filterByMinUsageScore', () => {
  it('should filter by minimum usage score', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ rxcui: '1', commonUsageScore: 50 }),
      createTestDrug({ rxcui: '2', commonUsageScore: 75 }),
      createTestDrug({ rxcui: '3', commonUsageScore: 90 }),
    ];

    const filtered = filterByMinUsageScore(results, 70);

    expect(filtered.length).toBe(2);
    expect(filtered.every((d) => d.commonUsageScore >= 70)).toBe(true);
  });

  it('should include drugs with exact min score', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ commonUsageScore: 80 }),
    ];

    const filtered = filterByMinUsageScore(results, 80);

    expect(filtered.length).toBe(1);
  });
});

describe('filterByBadgeType', () => {
  it('should filter by ACTIVE badge', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({
        rxcui: '1',
        badges: [{ type: 'ACTIVE', label: 'Active', variant: 'success' }],
      }),
      createTestDrug({
        rxcui: '2',
        badges: [{ type: 'COMMON', label: 'Common', variant: 'info' }],
      }),
    ];

    const filtered = filterByBadgeType(results, 'ACTIVE');

    expect(filtered.length).toBe(1);
    expect(filtered[0].badges.some((b) => b.type === 'ACTIVE')).toBe(true);
  });

  it('should filter by COMMON badge', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({
        badges: [{ type: 'COMMON', label: 'Common', variant: 'info' }],
      }),
    ];

    const filtered = filterByBadgeType(results, 'COMMON');

    expect(filtered.length).toBe(1);
  });

  it('should handle drugs with multiple badges', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({
        badges: [
          { type: 'ACTIVE', label: 'Active', variant: 'success' },
          { type: 'COMMON', label: 'Common', variant: 'info' },
        ],
      }),
    ];

    const filtered = filterByBadgeType(results, 'ACTIVE');

    expect(filtered.length).toBe(1);
  });

  it('should return empty array when no matches', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ badges: [] }),
    ];

    const filtered = filterByBadgeType(results, 'ACTIVE');

    expect(filtered).toEqual([]);
  });
});

describe('applyMultipleFilters', () => {
  const testResults: DrugSearchResult[] = [
    createTestDrug({
      rxcui: '1',
      hasActiveNDCs: true,
      strength: '500 MG',
      dosageForm: 'TABLET',
      ndcCount: 15,
      commonUsageScore: 85,
      badges: [
        { type: 'ACTIVE', label: 'Active', variant: 'success' },
        { type: 'COMMON', label: 'Common', variant: 'info' },
      ],
    }),
    createTestDrug({
      rxcui: '2',
      hasActiveNDCs: false,
      strength: '250 MG',
      dosageForm: 'CAPSULE',
      ndcCount: 5,
      commonUsageScore: 50,
      badges: [],
    }),
    createTestDrug({
      rxcui: '3',
      hasActiveNDCs: true,
      strength: '1000 MG',
      dosageForm: 'TABLET',
      ndcCount: 20,
      commonUsageScore: 90,
      badges: [
        { type: 'ACTIVE', label: 'Active', variant: 'success' },
        { type: 'COMMON', label: 'Common', variant: 'info' },
      ],
    }),
  ];

  it('should NOT apply activeOnly filter (handled at FDA Client level)', () => {
    // activeOnly is intentionally ignored by applyMultipleFilters to prevent double-filtering
    // FDA Client is the single source of truth for active/inactive filtering
    const filtered = applyMultipleFilters(testResults, { activeOnly: true });

    // All 3 results should be returned (activeOnly is ignored)
    expect(filtered.length).toBe(3);
    
    // Result includes both active and inactive drugs
    expect(filtered.some((d) => d.hasActiveNDCs)).toBe(true);
    expect(filtered.some((d) => !d.hasActiveNDCs)).toBe(true);
  });

  it('should apply strength filter', () => {
    const filtered = applyMultipleFilters(testResults, { strength: '500' });

    expect(filtered.length).toBe(1);
    expect(filtered[0].strength).toContain('500');
  });

  it('should apply dosageForm filter', () => {
    const filtered = applyMultipleFilters(testResults, {
      dosageForm: 'TABLET',
    });

    expect(filtered.length).toBe(2);
    expect(filtered.every((d) => d.dosageForm === 'TABLET')).toBe(true);
  });

  it('should apply minNDCCount filter', () => {
    const filtered = applyMultipleFilters(testResults, { minNDCCount: 10 });

    expect(filtered.length).toBe(2);
    expect(filtered.every((d) => d.ndcCount >= 10)).toBe(true);
  });

  it('should apply minUsageScore filter', () => {
    const filtered = applyMultipleFilters(testResults, { minUsageScore: 80 });

    expect(filtered.length).toBe(2);
    expect(filtered.every((d) => d.commonUsageScore >= 80)).toBe(true);
  });

  it('should apply badgeType filter', () => {
    const filtered = applyMultipleFilters(testResults, {
      badgeType: 'COMMON',
    });

    expect(filtered.length).toBe(2);
  });

  it('should apply multiple filters together (activeOnly ignored)', () => {
    const filtered = applyMultipleFilters(testResults, {
      activeOnly: true,  // Ignored - filtered at FDA Client level
      dosageForm: 'TABLET',
      minNDCCount: 15,
    });

    // Only dosageForm and minNDCCount filters are applied
    // activeOnly is ignored (handled upstream at FDA Client)
    expect(filtered.length).toBe(2);
    
    // Both results match dosageForm and minNDCCount
    expect(filtered.every((d) => d.dosageForm === 'TABLET')).toBe(true);
    expect(filtered.every((d) => d.ndcCount >= 15)).toBe(true);
    
    // hasActiveNDCs not checked (could include inactive if FDA Client returned them)
    // In this test data, both happen to be active, but that's not due to activeOnly filter
    expect(filtered[0].hasActiveNDCs).toBe(true);
    expect(filtered[1].hasActiveNDCs).toBe(true);
  });

  it('should return all results when no filters applied', () => {
    const filtered = applyMultipleFilters(testResults, {});

    expect(filtered.length).toBe(3);
  });

  it('should return empty array when filters exclude all results', () => {
    const filtered = applyMultipleFilters(testResults, {
      strength: '9999',
    });

    expect(filtered).toEqual([]);
  });
});

describe('countByAvailability', () => {
  it('should count active and inactive results', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const counts = countByAvailability(results);

    expect(counts.active).toBe(2);
    expect(counts.inactive).toBe(1);
    expect(counts.total).toBe(3);
  });

  it('should handle all active results', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
    ];

    const counts = countByAvailability(results);

    expect(counts.active).toBe(1);
    expect(counts.inactive).toBe(0);
    expect(counts.total).toBe(1);
  });

  it('should handle all inactive results', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const counts = countByAvailability(results);

    expect(counts.active).toBe(0);
    expect(counts.inactive).toBe(1);
    expect(counts.total).toBe(1);
  });

  it('should handle empty array', () => {
    const counts = countByAvailability([]);

    expect(counts.active).toBe(0);
    expect(counts.inactive).toBe(0);
    expect(counts.total).toBe(0);
  });
});

describe('checkWarningConditions', () => {
  it('should detect allInactive condition', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const warnings = checkWarningConditions(results);

    expect(warnings.allInactive).toBe(true);
    // When all inactive, lowAvailability is also true (0% < 20%)
    expect(warnings.lowAvailability).toBe(true);
  });

  it('should detect lowAvailability condition (<20% active)', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const warnings = checkWarningConditions(results);

    expect(warnings.lowAvailability).toBe(true);
  });

  it('should detect highInactive condition (>50% inactive)', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: false }),
    ];

    const warnings = checkWarningConditions(results);

    expect(warnings.highInactive).toBe(true);
  });

  it('should detect noResults condition', () => {
    const warnings = checkWarningConditions([]);

    expect(warnings.noResults).toBe(true);
    expect(warnings.allInactive).toBe(false);
  });

  it('should return all false for healthy results', () => {
    const results: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: true }),
    ];

    const warnings = checkWarningConditions(results);

    expect(warnings.allInactive).toBe(false);
    expect(warnings.lowAvailability).toBe(false);
    expect(warnings.highInactive).toBe(false);
    expect(warnings.noResults).toBe(false);
  });
});

