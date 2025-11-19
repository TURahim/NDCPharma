# Backend Integration Guide: Package-Level Data for Enhanced Advanced View

**Target:** Backend Engineers  
**Estimated Time:** 4-8 hours  
**Priority:** High  
**Dependencies:** None (non-breaking change)

---

## Quick Summary

The Enhanced Advanced View (pharmacy-grade table) needs individual NDC package data instead of formulation-level summaries. This guide shows exactly how to extend the existing search endpoint to provide this data.

**Current Behavior:**  
`/v1/search/drugs` with `mode=advanced` returns ~20 formulation-level results for "metformin"

**Required Behavior:**  
`/v1/search/drugs` with `mode=advanced` returns ~699 individual NDC packages for "metformin"

---

## Step 1: Update Schema Types

### File: `/packages/api-contracts/src/search.schema.ts`

Add package-level schema:

```typescript
/**
 * Individual NDC Package Schema (for Advanced Mode)
 */
export const NDCPackageDetailSchema = z.object({
  /** 11-digit NDC code */
  ndc: z.string(),
  /** Product-level NDC */
  productNdc: z.string(),
  /** Brand name (if applicable) */
  brandName: z.string().optional(),
  /** Package size information */
  packageSize: z.object({
    quantity: z.number().int().nonnegative(),
    unit: z.string(),
    description: z.string(),
  }),
  /** Active ingredients with strengths */
  activeIngredients: z.array(z.object({
    name: z.string(),
    strength: z.string(),
  })),
  /** Routes of administration */
  route: z.array(z.string()),
  /** Manufacturer/labeler name */
  labeler: z.string(),
  /** Labeler code */
  labelerCode: z.string().optional(),
  /** Marketing status details */
  marketingStatus: z.object({
    isActive: z.boolean(),
    status: z.enum(['active', 'discontinued', 'expired', 'unknown']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
  /** Listing expiration date */
  listingExpirationDate: z.string().optional(),
  /** Package description from FDA */
  packageDescription: z.string().optional(),
});

export type NDCPackageDetail = z.infer<typeof NDCPackageDetailSchema>;
```

Update DrugSearchResultSchema:

```typescript
export const DrugSearchResultSchema = z.object({
  rxcui: z.string(),
  name: z.string(),
  strength: z.string(),
  dosageForm: z.string(),
  dosageFormFamily: z.enum(['SOLID', 'LIQUID', 'INJECTABLE', 'SPECIAL']),
  hasActiveNDCs: z.boolean(),
  ndcCount: z.number().int().nonnegative(),
  commonUsageScore: z.number().min(0).max(100),
  badges: z.array(DrugBadgeSchema),
  tty: z.string().optional(),
  description: z.string().optional(),
  
  // NEW: Individual packages (populated in advanced mode)
  packages: z.array(NDCPackageDetailSchema).optional(),
});
```

---

## Step 2: Update Domain Types

### File: `/packages/domain-ndc/src/types.ts`

Add the same `NDCPackageDetail` type if not already imported from api-contracts, and update `DrugSearchResult`:

```typescript
export interface DrugSearchResult {
  rxcui: string;
  name: string;
  strength: string;
  dosageForm: string;
  dosageFormFamily: DosageFormType;
  hasActiveNDCs: boolean;
  ndcCount: number;
  commonUsageScore: number;
  badges: DrugBadge[];
  tty?: string;
  description?: string;
  
  // NEW: Individual packages (populated in advanced mode)
  packages?: NDCPackageDetail[];
}
```

---

## Step 3: Create Package Mapper Function

### File: `/apps/functions/src/api/v1/packageMapper.ts` (New File)

```typescript
/**
 * Package Mapper for Enhanced Advanced View
 * Maps FDA NDCPackage to NDCPackageDetail for frontend
 */

import type { NDCPackage } from '@clients-openfda';
import type { NDCPackageDetail } from '@api-contracts';

/**
 * Map FDA NDCPackage to API NDCPackageDetail
 */
export function mapNDCPackageToDetail(fdaPackage: NDCPackage): NDCPackageDetail {
  return {
    ndc: fdaPackage.ndc,
    productNdc: fdaPackage.productNdc,
    brandName: fdaPackage.brandName || undefined,
    packageSize: {
      quantity: fdaPackage.packageSize.quantity,
      unit: fdaPackage.packageSize.unit,
      description: fdaPackage.packageSize.description,
    },
    activeIngredients: fdaPackage.activeIngredients.map((ing) => ({
      name: ing.name,
      strength: ing.strength,
    })),
    route: fdaPackage.route || [],
    labeler: fdaPackage.labeler,
    labelerCode: extractLabelerCode(fdaPackage.ndc),
    marketingStatus: {
      isActive: fdaPackage.marketingStatus.isActive,
      status: fdaPackage.marketingStatus.status,
      startDate: fdaPackage.marketingStatus.startDate,
      endDate: fdaPackage.marketingStatus.endDate,
    },
    listingExpirationDate: fdaPackage.listingExpirationDate,
    packageDescription: fdaPackage.packageSize.description,
  };
}

/**
 * Extract labeler code from NDC (first 5 digits)
 */
function extractLabelerCode(ndc: string): string | undefined {
  if (!ndc || ndc.length < 5) return undefined;
  const cleaned = ndc.replace(/-/g, '');
  return cleaned.slice(0, 5);
}

/**
 * Map multiple packages
 */
export function mapNDCPackagesToDetails(fdaPackages: NDCPackage[]): NDCPackageDetail[] {
  return fdaPackages.map(mapNDCPackageToDetail);
}
```

---

## Step 4: Update Search Endpoint

### File: `/apps/functions/src/api/v1/search.ts`

Find the section where `DrugSearchResult` objects are built (around lines 256-310). Update as follows:

```typescript
import { mapNDCPackagesToDetails } from './packageMapper';

// ... existing imports and code ...

// 5. Build DrugSearchResult objects by grouping FDA packages into distinct formulations
const searchResults: DrugSearchResult[] = [];

for (const result of fdaResults) {
  if (result.status === 'fulfilled' && result.value) {
    const { drug, packages } = result.value;
    
    logger.debug('FDA result for drug', {
      correlationId,
      rxcui: drug.rxcui,
      name: drug.name,
      packageCount: packages.length,
      mode: mode, // Log which mode we're in
    });
    
    // Group packages by unique formulation (genericName + strength + dosageForm)
    const formulationsMap = new Map<string, NDCPackage[]>();
    for (const pkg of packages) {
      const strength = pkg.activeIngredients?.[0]?.strength || '';
      const key = `${pkg.genericName.toLowerCase()}::${strength.toLowerCase()}::${pkg.dosageForm.toLowerCase()}`;
      if (!formulationsMap.has(key)) {
        formulationsMap.set(key, []);
      }
      formulationsMap.get(key)!.push(pkg);
    }
    
    for (const [key, formulationPackages] of formulationsMap.entries()) {
      const firstPackage = formulationPackages[0]; // Use first package for common properties
      const strength = firstPackage.activeIngredients?.[0]?.strength || '';
      
      const searchResult: DrugSearchResult = {
        rxcui: drug.rxcui,
        name: firstPackage.genericName,
        strength: strength,
        dosageForm: firstPackage.dosageForm,
        dosageFormFamily: determineDosageFormFamily(formulationPackages),
        hasActiveNDCs: formulationPackages.some((p) => p.marketingStatus.isActive),
        ndcCount: formulationPackages.length,
        commonUsageScore: 0, // Will be calculated by rankSearchResults
        badges: [],
        description: `${firstPackage.genericName} ${strength} ${firstPackage.dosageForm}`,
        
        // NEW: Include individual packages if in advanced mode
        packages: mode === 'advanced' 
          ? mapNDCPackagesToDetails(formulationPackages)
          : undefined,
      };
      
      searchResults.push(searchResult);
      
      // Log package detail inclusion
      if (mode === 'advanced') {
        logger.debug('Included package details for advanced mode', {
          correlationId,
          formulation: key,
          packageCount: formulationPackages.length,
        });
      }
    }
  } else if (result.status === 'rejected') {
    logger.warn('FDA result rejected', {
      correlationId,
      reason: result.reason,
    });
  }
}

logger.info('Built search results', {
  correlationId,
  mode,
  resultCount: searchResults.length,
  includesPackageDetails: mode === 'advanced',
});
```

**Key Changes:**
1. Import the new mapper
2. Check `mode === 'advanced'` 
3. If advanced, populate `packages` field with mapped package details
4. Add debug logging for observability

---

## Step 5: Verify Response Size

### File: `/apps/functions/src/api/v1/search.ts`

Add response size monitoring:

```typescript
// After building response, before returning
if (mode === 'advanced' && response.results.length > 0) {
  const sampleResult = response.results[0];
  const packageCount = sampleResult.packages?.length || 0;
  const totalPackages = response.results.reduce((sum, r) => sum + (r.packages?.length || 0), 0);
  
  logger.info('Advanced mode response package details', {
    correlationId,
    formulations: response.results.length,
    totalPackages,
    avgPackagesPerFormulation: Math.round(totalPackages / response.results.length),
  });
  
  // Warning if response might be large
  if (totalPackages > 1000) {
    logger.warn('Large package response', {
      correlationId,
      totalPackages,
      suggestion: 'Consider pagination or filtering',
    });
  }
}
```

---

## Step 6: Update Tests

### File: `/apps/functions/src/api/v1/__tests__/search.test.ts`

Add test cases:

```typescript
describe('Advanced Mode Package Details', () => {
  it('should include package details when mode is advanced', async () => {
    const response = await request(app)
      .post('/v1/search/drugs')
      .send({
        query: 'metformin',
        mode: 'advanced',
        filters: { activeOnly: true },
      });
    
    expect(response.status).toBe(200);
    expect(response.body.results[0]).toHaveProperty('packages');
    expect(Array.isArray(response.body.results[0].packages)).toBe(true);
    
    const firstPackage = response.body.results[0].packages[0];
    expect(firstPackage).toHaveProperty('ndc');
    expect(firstPackage).toHaveProperty('brandName');
    expect(firstPackage).toHaveProperty('packageSize');
    expect(firstPackage).toHaveProperty('labeler');
    expect(firstPackage).toHaveProperty('marketingStatus');
  });
  
  it('should NOT include package details when mode is simple', async () => {
    const response = await request(app)
      .post('/v1/search/drugs')
      .send({
        query: 'metformin',
        mode: 'simple',
        filters: { activeOnly: true },
      });
    
    expect(response.status).toBe(200);
    expect(response.body.results[0].packages).toBeUndefined();
  });
  
  it('should include all required package fields', async () => {
    const response = await request(app)
      .post('/v1/search/drugs')
      .send({
        query: 'lisinopril',
        mode: 'advanced',
        filters: { activeOnly: true },
      });
    
    const pkg = response.body.results[0].packages[0];
    
    // Required fields
    expect(pkg.ndc).toBeTruthy();
    expect(pkg.productNdc).toBeTruthy();
    expect(pkg.packageSize.quantity).toBeGreaterThan(0);
    expect(pkg.packageSize.unit).toBeTruthy();
    expect(pkg.labeler).toBeTruthy();
    expect(pkg.marketingStatus.isActive).toBeDefined();
    expect(pkg.activeIngredients).toBeInstanceOf(Array);
    expect(pkg.activeIngredients.length).toBeGreaterThan(0);
    
    // Optional fields (may or may not exist)
    if (pkg.brandName) {
      expect(typeof pkg.brandName).toBe('string');
    }
  });
});
```

---

## Step 7: Performance Testing

### Test Script: `scripts/test-advanced-mode-performance.ts`

```typescript
/**
 * Performance test for advanced mode with package details
 */

import { searchDrugs } from '../path-to-search-client';

async function testPerformance() {
  const testCases = [
    { query: 'metformin', expectedPackages: 500 },
    { query: 'lisinopril', expectedPackages: 400 },
    { query: 'aspirin', expectedPackages: 600 },
  ];
  
  for (const test of testCases) {
    console.log(`\nTesting: ${test.query}`);
    
    const start = Date.now();
    const response = await searchDrugs(test.query, { 
      mode: 'advanced',
      filters: { activeOnly: true }
    });
    const duration = Date.now() - start;
    
    const totalPackages = response.results.reduce(
      (sum, r) => sum + (r.packages?.length || 0), 
      0
    );
    
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Formulations: ${response.results.length}`);
    console.log(`  Total Packages: ${totalPackages}`);
    console.log(`  Response Size: ~${JSON.stringify(response).length / 1024}KB`);
    
    // Assertions
    if (totalPackages < test.expectedPackages * 0.5) {
      console.warn(`  ⚠️  Expected ~${test.expectedPackages} packages, got ${totalPackages}`);
    }
    
    if (duration > 3000) {
      console.warn(`  ⚠️  Response time over 3s: ${duration}ms`);
    }
  }
}

testPerformance().catch(console.error);
```

**Run:**
```bash
cd /Users/tahmeedrahim/Documents/Projects/NDC
npx tsx scripts/test-advanced-mode-performance.ts
```

---

## Expected Results

### Example Response (Partial)

**Request:**
```json
POST /v1/search/drugs
{
  "query": "metformin",
  "mode": "advanced",
  "filters": { "activeOnly": true }
}
```

**Response:**
```json
{
  "results": [
    {
      "rxcui": "6809",
      "name": "Metformin Hydrochloride 500 MG Oral Tablet",
      "strength": "500 MG",
      "dosageForm": "TABLET",
      "dosageFormFamily": "SOLID",
      "hasActiveNDCs": true,
      "ndcCount": 250,
      "commonUsageScore": 95,
      "badges": [
        { "type": "ACTIVE", "label": "Active", "variant": "success" },
        { "type": "COMMON", "label": "Commonly Used", "variant": "info" }
      ],
      "description": "Metformin Hydrochloride 500 MG Oral Tablet",
      "packages": [  // ← NEW: Individual packages
        {
          "ndc": "02494418",
          "productNdc": "02494",
          "brandName": "AG-Metformin",
          "packageSize": {
            "quantity": 500,
            "unit": "TABLET",
            "description": "500 TABLET in 1 BOTTLE"
          },
          "activeIngredients": [
            { "name": "Metformin Hydrochloride", "strength": "500 MG" }
          ],
          "route": ["ORAL"],
          "labeler": "ANG (Angita Pharma)",
          "labelerCode": "02494",
          "marketingStatus": {
            "isActive": true,
            "status": "active",
            "startDate": "2010-01-15"
          },
          "packageDescription": "500 TABLET in 1 BOTTLE"
        },
        {
          "ndc": "02494442",
          "productNdc": "02494",
          "brandName": "AG-Metformin",
          "packageSize": {
            "quantity": 500,
            "unit": "TABLET",
            "description": "500 TABLET in 1 BOTTLE"
          },
          // ... more fields
        },
        // ... 248 more packages
      ]
    },
    // ... more formulations (850mg, 1000mg, ER)
  ],
  "pagination": { "page": 1, "limit": 20, "total": 20, "hasMore": false },
  "availabilityState": "ACTIVE_FOUND",
  "searchDuration": 245
}
```

---

## Validation Checklist

After implementation:

### Functional Tests
- [ ] `/v1/search/drugs` with `mode=advanced` includes `packages` array
- [ ] `/v1/search/drugs` with `mode=simple` does NOT include `packages` array
- [ ] All package fields are populated correctly
- [ ] NDC codes are in correct format (11 digits, may include hyphens)
- [ ] Brand names show when available, undefined when not
- [ ] Package sizes are numeric and reasonable (e.g., 30, 90, 100, 500)
- [ ] Labeler names are human-readable
- [ ] Marketing status reflects actual FDA data (active vs inactive)
- [ ] Active ingredients array is populated
- [ ] Route array contains valid values (ORAL, TOPICAL, etc.)

### Performance Tests
- [ ] Response time < 3s for common drugs (metformin, lisinopril)
- [ ] Response size < 5MB for typical searches
- [ ] No memory leaks with large result sets
- [ ] Server doesn't throttle on package-heavy responses

### Integration Tests
- [ ] Schema validation passes (Zod validates response)
- [ ] Frontend can parse and display package data
- [ ] No breaking changes to simple mode
- [ ] Cache works correctly for advanced mode
- [ ] Logs include package counts and debug info

---

## Rollback Plan

If issues arise:

1. **Quick Fix:** Return empty `packages` array in advanced mode
   ```typescript
   packages: mode === 'advanced' ? [] : undefined,
   ```
   Frontend will show placeholders (current behavior)

2. **Feature Flag:** Add environment variable
   ```typescript
   const includePackages = mode === 'advanced' && process.env.ENABLE_PACKAGE_DETAILS === 'true';
   packages: includePackages ? mapNDCPackagesToDetails(formulationPackages) : undefined,
   ```

3. **Full Rollback:** Revert schema changes
   - Remove `packages` field from schema
   - Remove mapper function
   - Redeploy

---

## Timeline Estimate

- **Schema Updates:** 1 hour
- **Mapper Implementation:** 1-2 hours
- **Search Endpoint Integration:** 2-3 hours
- **Testing:** 2-3 hours
- **Code Review & Deployment:** 1 hour

**Total:** 4-8 hours (depends on test coverage depth)

---

## Questions?

Contact frontend team for:
- Expected data format clarifications
- Edge case handling
- Performance requirements
- Testing assistance

---

**Next Step:** Start with Step 1 (Schema Updates) and work sequentially through Steps 2-7.

