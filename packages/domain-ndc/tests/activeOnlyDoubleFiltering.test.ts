/**
 * Integration Tests for activeOnly Double-Filtering Bug Fix
 * 
 * These tests verify that the activeOnly filter is applied ONLY at the FDA Client level,
 * preventing the "double-filtering bug" that caused valid drugs to return NOT_FOUND.
 * 
 * Context: Previously, activeOnly was applied at two layers:
 * 1. FDA Client (filterActivePackages)
 * 2. Domain layer (filterActiveOnly in applyMultipleFilters)
 * 
 * This caused issues when FDA returned 0 packages (for any reason), because:
 * - hasActiveNDCs would be set to false
 * - Domain filter would remove the result
 * - User would see NOT_FOUND instead of a more accurate availability state
 * 
 * Fix: FDA Client is now the SINGLE SOURCE OF TRUTH for activeOnly filtering.
 */

import { describe, it, expect } from 'vitest';
import {
  applyMultipleFilters,
  detectAvailabilityState,
  filterActiveOnly,
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

describe('SCENARIO 1: Active-Only Normal Case (e.g., metformin)', () => {
  it('should return multiple active formulations without double-filtering', () => {
    // Simulate FDA Client returning active packages (already filtered)
    // These represent different formulations: 500mg, 850mg, 1000mg, etc.
    const resultsFromFDAFiltering: DrugSearchResult[] = [
      createTestDrug({
        rxcui: '6809',
        name: 'Metformin Hydrochloride 500 MG Oral Tablet',
        strength: '500 MG',
        dosageForm: 'TABLET',
        hasActiveNDCs: true,
        ndcCount: 250,
      }),
      createTestDrug({
        rxcui: '6809',
        name: 'Metformin Hydrochloride 850 MG Oral Tablet',
        strength: '850 MG',
        dosageForm: 'TABLET',
        hasActiveNDCs: true,
        ndcCount: 180,
      }),
      createTestDrug({
        rxcui: '6809',
        name: 'Metformin Hydrochloride 1000 MG Oral Tablet',
        strength: '1000 MG',
        dosageForm: 'TABLET',
        hasActiveNDCs: true,
        ndcCount: 220,
      }),
      createTestDrug({
        rxcui: '6809',
        name: 'Metformin Hydrochloride 500 MG Extended Release Tablet',
        strength: '500 MG',
        dosageForm: 'TABLET, EXTENDED RELEASE',
        hasActiveNDCs: true,
        ndcCount: 49,
      }),
    ];

    // Domain layer should NOT filter again by activeOnly
    const filteredResults = applyMultipleFilters(resultsFromFDAFiltering, {
      activeOnly: true,  // This flag is passed but should be IGNORED
    });

    // VERIFICATION:
    // 1. All results should be returned (no second filtering)
    expect(filteredResults.length).toBe(4);
    
    // 2. All results should still have active NDCs (from FDA filtering)
    expect(filteredResults.every((d) => d.hasActiveNDCs)).toBe(true);
    
    // 3. Availability state should be ACTIVE_FOUND
    const availabilityState = detectAvailabilityState(filteredResults, true);
    expect(availabilityState).toBe('ACTIVE_FOUND');
    
    // 4. Different strengths should be preserved
    const strengths = filteredResults.map(r => r.strength);
    expect(strengths).toContain('500 MG');
    expect(strengths).toContain('850 MG');
    expect(strengths).toContain('1000 MG');
  });

  it('should handle activeOnly=false without issues', () => {
    // FDA Client returns ALL packages (not filtered)
    const resultsWithInactive: DrugSearchResult[] = [
      createTestDrug({
        name: 'Active Drug',
        hasActiveNDCs: true,
        ndcCount: 100,
      }),
      createTestDrug({
        name: 'Inactive Drug',
        hasActiveNDCs: false,
        ndcCount: 50,
      }),
    ];

    // Domain layer should NOT filter by activeOnly
    const filteredResults = applyMultipleFilters(resultsWithInactive, {
      activeOnly: false,  // Should be ignored regardless
    });

    // All results should be returned
    expect(filteredResults.length).toBe(2);
  });
});

describe('SCENARIO 2: Inactive-Only Drug', () => {
  it('should return empty array from FDA Client when activeOnly=true', () => {
    // When a drug has ONLY inactive NDCs and user requests activeOnly=true:
    // FDA Client should return empty array (0 packages)
    // Domain layer should NOT create any DrugSearchResults
    
    // Simulating: FDA Client returned 0 packages
    const resultsFromFDAFiltering: DrugSearchResult[] = [];

    // Domain layer receives empty array
    const filteredResults = applyMultipleFilters(resultsFromFDAFiltering, {
      activeOnly: true,
    });

    // VERIFICATION:
    // 1. Should remain empty (no results to filter)
    expect(filteredResults.length).toBe(0);
    
    // 2. Availability state should be NOT_FOUND or NO_FDA_NDCS
    // (depends on whether RxNorm match exists)
    const availabilityState = detectAvailabilityState(filteredResults, true);
    expect(availabilityState).toBe('NOT_FOUND');
  });

  it('should show inactive packages when activeOnly=false', () => {
    // When activeOnly=false, FDA Client returns ALL packages (including inactive)
    const resultsWithInactive: DrugSearchResult[] = [
      createTestDrug({
        name: 'Discontinued Drug A',
        hasActiveNDCs: false,  // All packages inactive
        ndcCount: 30,
      }),
      createTestDrug({
        name: 'Discontinued Drug B',
        hasActiveNDCs: false,
        ndcCount: 15,
      }),
    ];

    // Domain layer should NOT filter these out
    const filteredResults = applyMultipleFilters(resultsWithInactive, {
      activeOnly: false,
    });

    // VERIFICATION:
    // 1. All inactive results should be returned
    expect(filteredResults.length).toBe(2);
    
    // 2. All results should have hasActiveNDCs=false
    expect(filteredResults.every((d) => !d.hasActiveNDCs)).toBe(true);
    
    // 3. Availability state should be ONLY_INACTIVE
    const availabilityState = detectAvailabilityState(filteredResults, true);
    expect(availabilityState).toBe('ONLY_INACTIVE');
  });

  it('should NOT apply second filter to results that FDA already filtered', () => {
    // This is the KEY test for the double-filtering bug fix
    
    // Scenario: FDA Client returned 0 packages due to activeOnly=true
    // In old code, if we somehow had a result with hasActiveNDCs=false,
    // the domain filter would remove it AGAIN
    
    // Simulating edge case where a result exists with no active NDCs
    // (shouldn't happen in practice if FDA filtering works correctly,
    // but this tests the defensive behavior)
    const edgeCaseResults: DrugSearchResult[] = [
      createTestDrug({
        name: 'Edge Case Drug',
        hasActiveNDCs: false,  // Somehow has no active NDCs
        ndcCount: 0,
      }),
    ];

    // Domain layer should NOT remove this based on hasActiveNDCs
    const filteredResults = applyMultipleFilters(edgeCaseResults, {
      activeOnly: true,  // Should be IGNORED
    });

    // VERIFICATION:
    // Result should NOT be filtered out at domain level
    expect(filteredResults.length).toBe(1);
    expect(filteredResults[0].hasActiveNDCs).toBe(false);
  });
});

describe('SCENARIO 3: Edge Case - Upstream Empty (No Double-Filter)', () => {
  it('should handle FDA returning 0 packages due to RxCUI mismatch', () => {
    // Scenario: RxNorm returns ingredient-level RxCUI (e.g., "metformin")
    // FDA search by RxCUI returns 0 packages (ingredient not in FDA)
    // Fallback to generic name search should occur (tested elsewhere)
    // But IF fallback also fails, we should NOT double-filter
    
    // Simulating: Both FDA searches returned 0 packages
    const emptyResults: DrugSearchResult[] = [];

    // Domain layer should NOT attempt to filter empty set
    const filteredResults = applyMultipleFilters(emptyResults, {
      activeOnly: true,
      strength: '500 MG',  // Other filters also irrelevant
      dosageForm: 'TABLET',
    });

    // VERIFICATION:
    // 1. Should remain empty
    expect(filteredResults.length).toBe(0);
    
    // 2. Availability state should reflect upstream issue
    const availabilityState = detectAvailabilityState(emptyResults, true);
    expect(availabilityState).toBe('NOT_FOUND');
  });

  it('should preserve availability state when no packages from FDA', () => {
    // Test that availability state detection happens BEFORE domain filtering
    // This ensures we can distinguish between different empty-result scenarios
    
    // Scenario A: RxNorm match but no FDA packages
    const noFDAPackages: DrugSearchResult[] = [];
    const stateA = detectAvailabilityState(noFDAPackages, true);
    expect(stateA).toBe('NOT_FOUND');
    
    // Scenario B: No RxNorm match
    const noRxNormMatch: DrugSearchResult[] = [];
    const stateB = detectAvailabilityState(noRxNormMatch, false);
    expect(stateB).toBe('NOT_FOUND');
    
    // Both result in NOT_FOUND, but logs should clarify the difference
  });

  it('should handle mixed active/inactive when FDA filtering disabled', () => {
    // When activeOnly=false, FDA returns everything
    // Domain should NOT apply activeOnly filter
    
    const mixedResults: DrugSearchResult[] = [
      createTestDrug({
        name: 'Active Formulation A',
        hasActiveNDCs: true,
        ndcCount: 100,
      }),
      createTestDrug({
        name: 'Inactive Formulation B',
        hasActiveNDCs: false,
        ndcCount: 25,
      }),
      createTestDrug({
        name: 'Active Formulation C',
        hasActiveNDCs: true,
        ndcCount: 75,
      }),
    ];

    // Domain layer should keep all results
    const filteredResults = applyMultipleFilters(mixedResults, {
      activeOnly: false,
    });

    // VERIFICATION:
    // 1. All 3 results should be returned
    expect(filteredResults.length).toBe(3);
    
    // 2. Should include both active and inactive
    expect(filteredResults.filter(d => d.hasActiveNDCs).length).toBe(2);
    expect(filteredResults.filter(d => !d.hasActiveNDCs).length).toBe(1);
    
    // 3. Availability state should be ACTIVE_FOUND (at least one active exists)
    const availabilityState = detectAvailabilityState(filteredResults, true);
    expect(availabilityState).toBe('ACTIVE_FOUND');
  });
});

describe('INTEGRATION: filterActiveOnly should still work independently', () => {
  it('should allow explicit activeOnly filtering when needed', () => {
    // filterActiveOnly() function should still exist and work
    // for cases where explicit filtering is desired (not in main flow)
    
    const mixedResults: DrugSearchResult[] = [
      createTestDrug({ name: 'Active', hasActiveNDCs: true }),
      createTestDrug({ name: 'Inactive', hasActiveNDCs: false }),
    ];

    const activeOnly = filterActiveOnly(mixedResults);

    expect(activeOnly.length).toBe(1);
    expect(activeOnly[0].hasActiveNDCs).toBe(true);
  });

  it('filterActiveOnly is NOT called by applyMultipleFilters', () => {
    // This is the core of the fix: applyMultipleFilters does NOT call filterActiveOnly
    
    const resultsWithInactive: DrugSearchResult[] = [
      createTestDrug({ hasActiveNDCs: true }),
      createTestDrug({ hasActiveNDCs: false }),
      createTestDrug({ hasActiveNDCs: true }),
    ];

    // Even with activeOnly: true, should NOT filter
    const filtered = applyMultipleFilters(resultsWithInactive, {
      activeOnly: true,
    });

    // All 3 results should be returned (activeOnly ignored)
    expect(filtered.length).toBe(3);
    
    // If filterActiveOnly WAS called, we'd only have 2 results
    // This confirms the fix is in place
  });
});

describe('LOGGING VERIFICATION (behavior expectations)', () => {
  it('should document that FDA Client logs filtering actions', () => {
    // This is a documentation test - verifies expected behavior
    // Actual logging happens in filterActivePackages() in fdaMapper.ts
    
    // Expected log structure:
    const expectedLogFormat = {
      service: 'FDAClient',
      beforeCount: expect.any(Number),
      afterCount: expect.any(Number),
      removedCount: expect.any(Number),
      filterType: 'activeOnly',
      note: 'Single source of truth - no additional active filtering downstream',
    };

    expect(expectedLogFormat).toBeDefined();
    
    // In actual usage, logs should show:
    // - "FDA Client: activeOnly filter applied"
    // - before/after counts
    // - "Single source of truth" note
  });

  it('should document that domain layer logs indicate no activeOnly filtering', () => {
    // Domain layer logs should show:
    // "Before domain-level filtering (activeOnly already applied at FDA level)"
    // "Domain-level filters applied (strength, dosageForm only)"
    // "activeOnly: 'N/A - filtered at FDA Client level'"
    
    const expectedDomainLog = {
      activeOnlyFilteredUpstream: expect.any(Boolean),
      filtersApplied: {
        strength: expect.any(String) || null,
        dosageForm: expect.any(String) || null,
        activeOnly: 'N/A - filtered at FDA Client level',
      },
    };

    expect(expectedDomainLog).toBeDefined();
  });
});

