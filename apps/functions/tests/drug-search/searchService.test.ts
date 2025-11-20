import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NDCPackage } from '@clients-openfda';
import { performDrugSearch } from '../../src/services/drug-search/searchService';
import { DrugSearchError } from '../../src/services/drug-search/errors';
import { fdaClient } from '@clients-openfda';
import { nameToRxCui } from '@clients-rxnorm';

vi.mock('@clients-rxnorm', () => ({
  nameToRxCui: vi.fn(),
}));

vi.mock('@clients-openfda', () => ({
  fdaClient: {
    getNDCsByRxCUI: vi.fn(),
    searchByGenericName: vi.fn(),
  },
}));

const mockedNameToRxCui = vi.mocked(nameToRxCui);
const mockedFdaClient = vi.mocked(fdaClient);

function createPackage(overrides: Partial<NDCPackage> = {}): NDCPackage {
  return {
    ndc: overrides.ndc || '00001-0001-01',
    productNdc: overrides.productNdc || '00001-0001',
    genericName: overrides.genericName || 'metformin',
    brandName: overrides.brandName || 'Metformin',
    dosageForm: overrides.dosageForm || 'TABLET',
    route: overrides.route || ['ORAL'],
    packageSize:
      overrides.packageSize || ({ quantity: 100, unit: 'TABLET', description: '100 TABLET' } as any),
    activeIngredients:
      overrides.activeIngredients ||
      [
        {
          name: 'Metformin',
          strength: '500 mg',
        },
      ],
    marketingStatus:
      overrides.marketingStatus ||
      ({
        isActive: true,
        status: 'active',
      } as NDCPackage['marketingStatus']),
    labeler: overrides.labeler || 'Pharma Labs',
    rxcui: overrides.rxcui || '12345',
    listingExpirationDate: overrides.listingExpirationDate,
  };
}

const context = {
  requestId: 'req-test',
  correlationId: 'corr-test',
};

describe('performDrugSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRxNormSuccess(result: Partial<Awaited<ReturnType<typeof nameToRxCui>>> = {}) {
    mockedNameToRxCui.mockResolvedValue({
      rxcui: '12345',
      name: 'metformin',
      confidence: 0.9,
      dosageForm: 'TABLET',
      strength: '500 mg',
      ...result,
    });
  }

  function mockFdaPackages(...pages: NDCPackage[][]) {
    mockedFdaClient.getNDCsByRxCUI.mockImplementation(async (_rxcui: string, options?: any) => {
      const page = Math.floor((options?.skip || 0) / 100);
      return pages[page] || [];
    });
  }

  it('returns normalized package data for a common generic', async () => {
    mockRxNormSuccess();
    mockFdaPackages([createPackage(), createPackage({ ndc: '00001-0001-02' })], []);

    const result = await performDrugSearch(
      {
        drugName: 'metformin',
      },
      context
    );

    expect(result.drug.rxcui).toBe('12345');
    expect(result.packages).toHaveLength(2);
    expect(result.metadata.totalActivePackages).toBe(2);
    expect(result.metadata.totalInactivePackages).toBe(0);
  });

  it('filters packages by strength and errors when none remain', async () => {
    mockRxNormSuccess();
    mockFdaPackages([createPackage({ activeIngredients: [{ name: 'Metformin', strength: '500 mg' }] })]);

    await expect(
      performDrugSearch(
        {
          drugName: 'metformin',
          strength: '1000 mg',
        },
        context
      )
    ).rejects.toMatchObject({
      code: 'NO_MATCHING_STRENGTH',
    } satisfies Partial<DrugSearchError>);
  });

  it('returns ONLY_INACTIVE_PACKAGES when no active packages exist', async () => {
    mockRxNormSuccess();
    mockFdaPackages([
      createPackage({
        marketingStatus: { isActive: false, status: 'inactive' },
      }),
    ]);

    await expect(
      performDrugSearch(
        {
          drugName: 'metformin',
        },
        context
      )
    ).rejects.toMatchObject({
      code: 'ONLY_INACTIVE_PACKAGES',
    } satisfies Partial<DrugSearchError>);
  });

  it('passes through provided RxCUI', async () => {
    mockRxNormSuccess({ rxcui: '777', name: 'amlodipine' });
    mockFdaPackages([createPackage({ ndc: '00002-0002-01', genericName: 'amlodipine' })]);

    const result = await performDrugSearch(
      {
        rxcui: '777',
        drugName: 'amlodipine',
      },
      context
    );

    expect(result.drug.rxcui).toBe('777');
    expect(result.packages).toHaveLength(1);
  });

  it('falls back to FDA generic search when RxNorm fails', async () => {
    mockedNameToRxCui.mockRejectedValue(new Error('rxnorm down'));
    mockedFdaClient.searchByGenericName.mockResolvedValue([createPackage()]);
    mockFdaPackages([createPackage()]);

    const result = await performDrugSearch(
      {
        drugName: 'metformin',
      },
      context
    );

    expect(result.drug.warnings).toContain('Resolved via FDA generic lookup');
    expect(mockedFdaClient.searchByGenericName).toHaveBeenCalled();
  });
});

