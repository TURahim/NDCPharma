/**
 * Tests for search ranking algorithm
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRankingScore,
  rankSearchResults,
  assignDrugBadges,
  applyBadgesToResults,
  getTopResults,
} from '../src/searchRanker';
import type { DrugSearchResult } from '../src/types';
import { DosageFormType } from '../src/types';

describe('calculateRankingScore', () => {
  it('should give max score (100) to active generic drug with common strength and form', () => {
    const drug: DrugSearchResult = {
      rxcui: '197446',
      name: 'Amoxicillin 500 MG Oral Capsule',
      strength: '500 MG',
      dosageForm: 'CAPSULE',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 45,
      commonUsageScore: 0,
      badges: [],
      tty: 'SCD',
    };

    const score = calculateRankingScore(drug);
    expect(score).toBeGreaterThan(90);
  });

  it('should give zero active NDC points when drug has no active NDCs', () => {
    const drug: DrugSearchResult = {
      rxcui: '123456',
      name: 'Test Drug 10 MG Tablet',
      strength: '10 MG',
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: false,
      ndcCount: 5,
      commonUsageScore: 0,
      badges: [],
      tty: 'SCD',
    };

    const score = calculateRankingScore(drug);
    // Should get: generic(20) + strength(15) + form(10) + recency(5) = 50
    // Missing the 50 points for active NDCs
    expect(score).toBe(50);
    
    // Compare with active version
    const activeDrug = { ...drug, hasActiveNDCs: true };
    const activeScore = calculateRankingScore(activeDrug);
    expect(activeScore).toBe(100); // Should be 50 points higher
  });

  it('should give full generic score (20) for SCD term type', () => {
    const genericDrug: DrugSearchResult = {
      rxcui: '197446',
      name: 'Amoxicillin 500 MG Oral Capsule',
      strength: '500 MG',
      dosageForm: 'CAPSULE',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 45,
      commonUsageScore: 0,
      badges: [],
      tty: 'SCD',
    };

    const score = calculateRankingScore(genericDrug);

    const brandDrug: DrugSearchResult = {
      ...genericDrug,
      name: 'Amoxil 500 MG Oral Capsule',
      tty: 'SBD',
    };

    const brandScore = calculateRankingScore(brandDrug);

    expect(score).toBeGreaterThan(brandScore);
  });

  it('should give zero generic score for SBD (brand) term type', () => {
    const drug: DrugSearchResult = {
      rxcui: '197446',
      name: 'Amoxil 500 MG Oral Capsule',
      strength: '500 MG',
      dosageForm: 'CAPSULE',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 45,
      commonUsageScore: 0,
      badges: [],
      tty: 'SBD',
    };

    const score = calculateRankingScore(drug);
    expect(score).toBeLessThan(80); // Missing generic points
  });

  it('should give full strength score for common strengths', () => {
    const commonStrengths = ['10 MG', '25 MG', '50 MG', '100 MG', '500 MG'];

    commonStrengths.forEach((strength) => {
      const drug: DrugSearchResult = {
        rxcui: '123456',
        name: `Test Drug ${strength} Tablet`,
        strength,
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 10,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      };

      const score = calculateRankingScore(drug);
      expect(score).toBeGreaterThan(70); // Should have strength bonus
    });
  });

  it('should give partial strength score for near-common strengths', () => {
    const drug: DrugSearchResult = {
      rxcui: '123456',
      name: 'Test Drug 475 MG Tablet',
      strength: '475 MG', // Close to 500 MG
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
      tty: 'SCD',
    };

    const score = calculateRankingScore(drug);
    expect(score).toBeGreaterThan(60); // Should have partial bonus
  });

  it('should give zero strength score for uncommon strengths', () => {
    const drug: DrugSearchResult = {
      rxcui: '123456',
      name: 'Test Drug 137 MG Tablet',
      strength: '137 MG', // Unusual strength
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
      tty: 'SCD',
    };

    const score = calculateRankingScore(drug);

    const commonDrug: DrugSearchResult = {
      ...drug,
      strength: '100 MG',
    };

    const commonScore = calculateRankingScore(commonDrug);

    expect(commonScore).toBeGreaterThan(score);
  });

  it('should give higher form score for tablets than other forms', () => {
    const tablet: DrugSearchResult = {
      rxcui: '123456',
      name: 'Test Drug 10 MG Tablet',
      strength: '10 MG',
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
      tty: 'SCD',
    };

    const cream: DrugSearchResult = {
      ...tablet,
      dosageForm: 'CREAM',
      dosageFormFamily: DosageFormType.SPECIAL,
    };

    const tabletScore = calculateRankingScore(tablet);
    const creamScore = calculateRankingScore(cream);

    expect(tabletScore).toBeGreaterThan(creamScore);
  });

  it('should give higher form score for capsules than injections', () => {
    const capsule: DrugSearchResult = {
      rxcui: '123456',
      name: 'Test Drug 10 MG Capsule',
      strength: '10 MG',
      dosageForm: 'CAPSULE',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
      tty: 'SCD',
    };

    const injection: DrugSearchResult = {
      ...capsule,
      dosageForm: 'INJECTION',
      dosageFormFamily: DosageFormType.INJECTABLE,
    };

    const capsuleScore = calculateRankingScore(capsule);
    const injectionScore = calculateRankingScore(injection);

    expect(capsuleScore).toBeGreaterThan(injectionScore);
  });

  it('should never exceed 100 points', () => {
    const perfectDrug: DrugSearchResult = {
      rxcui: '197446',
      name: 'Amoxicillin 500 MG Oral Capsule',
      strength: '500 MG',
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 100,
      commonUsageScore: 0,
      badges: [],
      tty: 'SCD',
    };

    const score = calculateRankingScore(perfectDrug);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('rankSearchResults', () => {
  it('should sort results by score descending', () => {
    const results: DrugSearchResult[] = [
      {
        rxcui: '1',
        name: 'Low Score Drug',
        strength: '137 MG',
        dosageForm: 'PATCH',
        dosageFormFamily: DosageFormType.SPECIAL,
        hasActiveNDCs: false,
        ndcCount: 1,
        commonUsageScore: 0,
        badges: [],
        tty: 'SBD',
      },
      {
        rxcui: '2',
        name: 'High Score Drug',
        strength: '500 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 50,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      },
      {
        rxcui: '3',
        name: 'Medium Score Drug',
        strength: '100 MG',
        dosageForm: 'CAPSULE',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 20,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      },
    ];

    const ranked = rankSearchResults(results);

    expect(ranked[0].rxcui).toBe('2'); // High score first
    expect(ranked[2].rxcui).toBe('1'); // Low score last
  });

  it('should use NDC count as secondary sort', () => {
    const results: DrugSearchResult[] = [
      {
        rxcui: '1',
        name: 'Drug A',
        strength: '10 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 5,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      },
      {
        rxcui: '2',
        name: 'Drug B',
        strength: '10 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 50,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      },
    ];

    const ranked = rankSearchResults(results);

    // Same score, but B has more NDCs
    expect(ranked[0].rxcui).toBe('2');
    expect(ranked[1].rxcui).toBe('1');
  });

  it('should use alphabetical name as tertiary sort', () => {
    const results: DrugSearchResult[] = [
      {
        rxcui: '1',
        name: 'Zithromax 500 MG',
        strength: '500 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 10,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      },
      {
        rxcui: '2',
        name: 'Amoxicillin 500 MG',
        strength: '500 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 10,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      },
    ];

    const ranked = rankSearchResults(results);

    // Same score and NDC count, alphabetical order
    expect(ranked[0].name).toBe('Amoxicillin 500 MG');
    expect(ranked[1].name).toBe('Zithromax 500 MG');
  });

  it('should populate commonUsageScore for all results', () => {
    const results: DrugSearchResult[] = [
      {
        rxcui: '1',
        name: 'Test Drug',
        strength: '500 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 10,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      },
    ];

    const ranked = rankSearchResults(results);

    expect(ranked[0].commonUsageScore).toBeGreaterThan(0);
  });

  it('should not mutate original array', () => {
    const results: DrugSearchResult[] = [
      {
        rxcui: '1',
        name: 'Test Drug',
        strength: '500 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 10,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      },
    ];

    const originalLength = results.length;
    rankSearchResults(results);

    expect(results.length).toBe(originalLength);
  });
});

describe('assignDrugBadges', () => {
  it('should assign ACTIVE badge when hasActiveNDCs is true', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Test Drug',
      strength: '500 MG',
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
    };

    const badges = assignDrugBadges(drug);

    expect(badges.some((b) => b.type === 'ACTIVE')).toBe(true);
    expect(badges.find((b) => b.type === 'ACTIVE')?.label).toBe('Active');
    expect(badges.find((b) => b.type === 'ACTIVE')?.variant).toBe('success');
  });

  it('should not assign ACTIVE badge when hasActiveNDCs is false', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Test Drug',
      strength: '500 MG',
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: false,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
    };

    const badges = assignDrugBadges(drug);

    expect(badges.some((b) => b.type === 'ACTIVE')).toBe(false);
  });

  it('should assign COMMON badge when usage score >= 80', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Test Drug',
      strength: '500 MG',
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 85,
      badges: [],
    };

    const badges = assignDrugBadges(drug);

    expect(badges.some((b) => b.type === 'COMMON')).toBe(true);
  });

  it('should not assign COMMON badge when usage score < 80', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Test Drug',
      strength: '500 MG',
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 70,
      badges: [],
    };

    const badges = assignDrugBadges(drug);

    expect(badges.some((b) => b.type === 'COMMON')).toBe(false);
  });

  it('should assign PEDIATRIC badge for liquid formulations', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Amoxicillin 250 MG/5 ML Oral Suspension',
      strength: '250 MG/5 ML',
      dosageForm: 'ORAL SUSPENSION',
      dosageFormFamily: DosageFormType.LIQUID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
    };

    const badges = assignDrugBadges(drug);

    expect(badges.some((b) => b.type === 'PEDIATRIC')).toBe(true);
  });

  it('should assign PEDIATRIC badge for low-strength tablets (<10mg)', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Test Drug 5 MG Tablet',
      strength: '5 MG',
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
    };

    const badges = assignDrugBadges(drug);

    expect(badges.some((b) => b.type === 'PEDIATRIC')).toBe(true);
  });

  it('should assign PEDIATRIC badge for chewable tablets', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Test Drug 100 MG Chewable Tablet',
      strength: '100 MG',
      dosageForm: 'TABLET, CHEWABLE',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
    };

    const badges = assignDrugBadges(drug);

    expect(badges.some((b) => b.type === 'PEDIATRIC')).toBe(true);
  });

  it('should assign GENERIC badge for SCD term type', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Amoxicillin 500 MG Capsule',
      strength: '500 MG',
      dosageForm: 'CAPSULE',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
      tty: 'SCD',
    };

    const badges = assignDrugBadges(drug);

    expect(badges.some((b) => b.type === 'GENERIC')).toBe(true);
    expect(badges.find((b) => b.type === 'GENERIC')?.label).toBe('Generic');
  });

  it('should assign BRAND badge for SBD term type', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Amoxil 500 MG Capsule',
      strength: '500 MG',
      dosageForm: 'CAPSULE',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 0,
      badges: [],
      tty: 'SBD',
    };

    const badges = assignDrugBadges(drug);

    expect(badges.some((b) => b.type === 'BRAND')).toBe(true);
    expect(badges.find((b) => b.type === 'BRAND')?.label).toBe('Brand');
    expect(badges.find((b) => b.type === 'BRAND')?.variant).toBe('warning');
  });

  it('should assign multiple badges when applicable', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Amoxicillin 250 MG/5 ML Oral Suspension',
      strength: '250 MG/5 ML',
      dosageForm: 'ORAL SUSPENSION',
      dosageFormFamily: DosageFormType.LIQUID,
      hasActiveNDCs: true,
      ndcCount: 10,
      commonUsageScore: 90,
      badges: [],
      tty: 'SCD',
    };

    const badges = assignDrugBadges(drug);

    // Should have ACTIVE, COMMON, PEDIATRIC, GENERIC
    expect(badges.length).toBeGreaterThanOrEqual(4);
    expect(badges.some((b) => b.type === 'ACTIVE')).toBe(true);
    expect(badges.some((b) => b.type === 'COMMON')).toBe(true);
    expect(badges.some((b) => b.type === 'PEDIATRIC')).toBe(true);
    expect(badges.some((b) => b.type === 'GENERIC')).toBe(true);
  });

  it('should return empty array for inactive drug with no special characteristics', () => {
    const drug: DrugSearchResult = {
      rxcui: '1',
      name: 'Test Drug 137 MG Tablet',
      strength: '137 MG',
      dosageForm: 'TABLET',
      dosageFormFamily: DosageFormType.SOLID,
      hasActiveNDCs: false,
      ndcCount: 1,
      commonUsageScore: 20,
      badges: [],
    };

    const badges = assignDrugBadges(drug);

    expect(badges.length).toBe(0);
  });
});

describe('applyBadgesToResults', () => {
  it('should apply badges to all results', () => {
    const results: DrugSearchResult[] = [
      {
        rxcui: '1',
        name: 'Test Drug 1',
        strength: '500 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 10,
        commonUsageScore: 85,
        badges: [],
        tty: 'SCD',
      },
      {
        rxcui: '2',
        name: 'Test Drug 2',
        strength: '250 MG/5 ML',
        dosageForm: 'ORAL SUSPENSION',
        dosageFormFamily: DosageFormType.LIQUID,
        hasActiveNDCs: true,
        ndcCount: 5,
        commonUsageScore: 70,
        badges: [],
      },
    ];

    const withBadges = applyBadgesToResults(results);

    expect(withBadges[0].badges.length).toBeGreaterThan(0);
    expect(withBadges[1].badges.length).toBeGreaterThan(0);
  });

  it('should not mutate original results', () => {
    const results: DrugSearchResult[] = [
      {
        rxcui: '1',
        name: 'Test Drug',
        strength: '500 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 10,
        commonUsageScore: 0,
        badges: [],
      },
    ];

    const original = results[0].badges.length;
    applyBadgesToResults(results);

    expect(results[0].badges.length).toBe(original);
  });
});

describe('getTopResults', () => {
  it('should return top N results by score', () => {
    const results: DrugSearchResult[] = [
      {
        rxcui: '1',
        name: 'Low Score',
        strength: '137 MG',
        dosageForm: 'PATCH',
        dosageFormFamily: DosageFormType.SPECIAL,
        hasActiveNDCs: false,
        ndcCount: 1,
        commonUsageScore: 0,
        badges: [],
      },
      {
        rxcui: '2',
        name: 'High Score',
        strength: '500 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 50,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      },
      {
        rxcui: '3',
        name: 'Medium Score',
        strength: '100 MG',
        dosageForm: 'CAPSULE',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 20,
        commonUsageScore: 0,
        badges: [],
        tty: 'SCD',
      },
    ];

    const top2 = getTopResults(results, 2);

    expect(top2.length).toBe(2);
    expect(top2[0].rxcui).toBe('2'); // Highest score
  });

  it('should return all results if limit exceeds array length', () => {
    const results: DrugSearchResult[] = [
      {
        rxcui: '1',
        name: 'Test Drug',
        strength: '500 MG',
        dosageForm: 'TABLET',
        dosageFormFamily: DosageFormType.SOLID,
        hasActiveNDCs: true,
        ndcCount: 10,
        commonUsageScore: 0,
        badges: [],
      },
    ];

    const top10 = getTopResults(results, 10);

    expect(top10.length).toBe(1);
  });

  it('should return empty array for empty input', () => {
    const top5 = getTopResults([], 5);

    expect(top5).toEqual([]);
  });
});

