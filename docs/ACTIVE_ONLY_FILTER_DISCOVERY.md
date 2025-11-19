# activeOnly Filter Discovery & Analysis

**Date:** November 19, 2025  
**Purpose:** Internal documentation of double-filtering bug analysis and remediation plan

---

## Executive Summary

The `activeOnly` filter is currently applied at **TWO DISTINCT LAYERS**, causing a double-filtering bug that can return `NOT_FOUND` for valid drugs when edge cases occur.

**Current State:** ⚠️ PARTIALLY MITIGATED (fallback logic helps but doesn't eliminate root cause)  
**Target State:** ✅ FULLY RESOLVED (single authoritative filter layer)

---

## Discovery Findings

### Layer 1: FDA Client Level (`packages/clients-openfda/`)

**Location:** `packages/clients-openfda/src/index.ts`

```typescript
// Line 86-112: getNDCsByRxCUI
async getNDCsByRxCUI(rxcui: string, options: {
  activeOnly?: boolean;
  ...
}): Promise<NDCPackage[]> {
  const response = await this.service.searchByRxCUI(rxcui, options);
  let packages: NDCPackage[] = response.results.flatMap(mapFDAResultToNDCPackage);

  // FIRST FILTER APPLICATION
  if (options.activeOnly) {
    packages = filterActivePackages(packages);  // Line 104
  }

  return sortByPackageSize(packages);
}

// Line 221-248: searchByGenericName (same pattern)
async searchByGenericName(genericName: string, options: {
  activeOnly?: boolean;
  ...
}): Promise<NDCPackage[]> {
  const response = await this.service.searchByGenericName(genericName, options);
  let packages: NDCPackage[] = response.results.flatMap(mapFDAResultToNDCPackage);

  // FIRST FILTER APPLICATION (duplicate logic)
  if (options.activeOnly) {
    packages = filterActivePackages(packages);  // Line 239
  }

  return sortByPackageSize(packages);
}
```

**Filter Implementation:**
```typescript
// packages/clients-openfda/src/internal/fdaMapper.ts:402-404
export function filterActivePackages(packages: NDCPackage[]): NDCPackage[] {
  return packages.filter((pkg) => pkg.marketingStatus.isActive);
}
```

---

### Layer 2: Domain/Search Aggregation Level (`apps/functions/src/api/v1/search.ts`)

**Location:** `apps/functions/src/api/v1/search.ts`

```typescript
// Lines 189, 201, 226: FDA Client calls WITH activeOnly
const packages = await fdaClient.getNDCsByRxCUI(drug.rxcui, {
  activeOnly: filters?.activeOnly ?? true,  // Already filtered at FDA level
});

// Line 310: Setting hasActiveNDCs flag based on already-filtered packages
const searchResult: DrugSearchResult = {
  // ... other fields
  hasActiveNDCs: formulationPackages.some((p) => p.marketingStatus.isActive),
  ndcCount: formulationPackages.length,
  // ...
};

// Lines 359-365: SECOND FILTER APPLICATION
if (filters) {
  filteredResults = applyMultipleFilters(resultsWithBadges, {
    activeOnly: filters.activeOnly,  // Filters AGAIN based on hasActiveNDCs
    strength: filters.strength,
    dosageForm: filters.dosageForm,
  });
}
```

**Domain Filter Implementation:**
```typescript
// packages/domain-ndc/src/searchFilters.ts:14-18
export function filterActiveOnly(
  results: DrugSearchResult[]
): DrugSearchResult[] {
  return results.filter((result) => result.hasActiveNDCs);
}

// Lines 238-276: applyMultipleFilters
export function applyMultipleFilters(results: DrugSearchResult[], filters: {...}) {
  let filtered = results;

  if (filters.activeOnly) {
    filtered = filterActiveOnly(filtered);  // Line 251-252
  }
  // ... other filters
  return filtered;
}
```

---

## The Double-Filtering Bug Explained

### Scenario A: Normal Case (Works Correctly)

```
1. User searches "metformin" with activeOnly=true
2. FDA client returns 699 packages (all active, already filtered)
3. Domain layer creates DrugSearchResult with hasActiveNDCs=true
4. Domain filter: filterActiveOnly() keeps result (hasActiveNDCs=true ✓)
5. ✅ Result: 699 packages displayed
```

### Scenario B: Edge Case (Double-Filtering Bug)

```
1. User searches unusual drug with activeOnly=true
2. FDA client returns 0 packages (RxCUI mismatch or genuinely no active packages)
3. Domain layer creates DrugSearchResult with:
   - ndcCount: 0
   - hasActiveNDCs: false (because packages.length === 0)
4. Domain filter: filterActiveOnly() REMOVES result (hasActiveNDCs=false ✗)
5. ❌ Result: NOT_FOUND (even though fallback might have worked)
```

### Scenario C: Inactive Drug (Confusing Behavior)

```
1. User searches "discontinued-drug" with activeOnly=false
2. FDA client returns 50 packages (all inactive, NOT filtered)
3. Domain layer creates DrugSearchResult with hasActiveNDCs=false
4. Domain filter sees activeOnly=false, so KEEPS result ✓
5. ✅ Result: 50 inactive packages shown

BUT if user searches same drug with activeOnly=true:
1. FDA client returns 0 packages (filtered at FDA level)
2. Domain layer: ndcCount=0, hasActiveNDCs=false
3. Domain filter: Checks hasActiveNDCs=false, removes result ✗
4. ❌ Result: NOT_FOUND (should be ONLY_INACTIVE)
```

---

## Current Data Flow for "metformin" Search

```
┌─────────────────────────────────────┐
│ 1. Request Handler                  │
│    filters.activeOnly = true        │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. RxNorm Normalization             │
│    Result: RxCUI 6809 (Ingredient)  │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. FDA Client Call                  │
│    fdaClient.getNDCsByRxCUI(6809, { │
│      activeOnly: true  ← FILTER #1  │
│    })                                │
│    ↓                                 │
│    filterActivePackages(packages)   │
│    Returns: 0 pkgs (ingredient!)    │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 4. Fallback to Generic Name         │
│    fdaClient.searchByGenericName(   │
│      "metformin", {                  │
│      activeOnly: true  ← FILTER #1  │
│    })                                │
│    ↓                                 │
│    filterActivePackages(packages)   │
│    Returns: 699 packages ✓          │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 5. Build DrugSearchResult           │
│    Group by formulation             │
│    hasActiveNDCs = packages.some(   │
│      p => p.marketingStatus.isActive│
│    ) ✓ true                          │
│    Creates: ~20 formulation results │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 6. Rank & Badge                     │
│    rankSearchResults()              │
│    applyBadgesToResults()           │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 7. Apply Filters (REDUNDANT)       │
│    applyMultipleFilters({           │
│      activeOnly: true  ← FILTER #2  │
│    })                                │
│    ↓                                 │
│    filterActiveOnly(results)        │
│    Checks: hasActiveNDCs === true ✓ │
│    Result: No change (already OK)   │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 8. Detect Availability State        │
│    detectAvailabilityState()        │
│    Result: ACTIVE_FOUND             │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 9. Return Response                  │
│    results: ~20 formulations        │
│    availabilityState: ACTIVE_FOUND  │
└─────────────────────────────────────┘
```

**Analysis:**  
- Filter #1 (FDA level) works correctly
- Filter #2 (Domain level) is **redundant** but doesn't cause harm in success case
- Filter #2 causes **double-filtering bug** when FDA returns 0 packages

---

## Root Cause Analysis

### Primary Issue
**`hasActiveNDCs` is derived AFTER packages are already filtered by activeOnly**, but then used as basis for a SECOND filter.

### Secondary Issue
**Availability state detection happens AFTER the second filter**, so it can never distinguish between:
- "FDA returned no active packages" (ONLY_INACTIVE)
- "FDA returned packages but domain filter removed them" (double-filtering bug)

### Tertiary Issue
**No logging of pre-filter vs post-filter counts at FDA level**, making it impossible to debug why 0 packages were returned.

---

## All Locations Where activeOnly is Applied

### 1. FDA Client - Package Level (LAYER 1)
- `packages/clients-openfda/src/index.ts:104` - `getNDCsByRxCUI()`
- `packages/clients-openfda/src/index.ts:239` - `searchByGenericName()`
- Uses: `filterActivePackages()` from `fdaMapper.ts`

### 2. Search Endpoint - FDA Calls (PASSES activeOnly to Layer 1)
- `apps/functions/src/api/v1/search.ts:189` - RxCUI search
- `apps/functions/src/api/v1/search.ts:201` - Generic name fallback (if 0 results)
- `apps/functions/src/api/v1/search.ts:226` - Generic name fallback (if error)

### 3. Search Endpoint - hasActiveNDCs Derivation (DEPENDS on Layer 1)
- `apps/functions/src/api/v1/search.ts:310` - Sets hasActiveNDCs flag

### 4. Domain Filter - Result Level (LAYER 2)
- `packages/domain-ndc/src/searchFilters.ts:14-18` - `filterActiveOnly()`
- `packages/domain-ndc/src/searchFilters.ts:251-252` - Called by `applyMultipleFilters()`

### 5. Search Endpoint - Result Filtering (APPLIES Layer 2)
- `apps/functions/src/api/v1/search.ts:361-365` - `applyMultipleFilters()`

---

## Logging Gaps

### Current Logging
✅ RxNorm matches found (with RxCUIs)  
✅ FDA result package counts  
✅ Before/after filtering at domain level  
✅ Fallback triggers  

### Missing Logging
❌ FDA-level activeOnly filter (before/after counts)  
❌ Explicit "already filtered upstream" indicator  
❌ Distinction between "0 packages from FDA" vs "0 packages after domain filter"  

---

## Remediation Plan

### Phase B: Design Decision
**DECISION:** Make FDA Client the single source of truth for `activeOnly` filtering.

**Rationale:**
1. FDA Client is closest to the data source
2. Already has filtering logic (`filterActivePackages`)
3. Prevents package data from being passed around if not needed
4. Clearer semantics: "get active packages" vs "filter results after the fact"

### Phase C: Refactoring
1. **Remove** `activeOnly` from `applyMultipleFilters()` at domain layer
2. **Keep** `activeOnly` filtering at FDA Client level
3. **Change** `hasActiveNDCs` to be informational, not used for filtering
4. **Move** availability state detection BEFORE domain filtering (use pre-filtered counts)

### Phase D: Logging
1. Add FDA-level logging: packages before/after activeOnly filter
2. Add domain-level logging: indicate filtering already done upstream
3. Log availability state derivation inputs

### Phase E: Testing
1. Test: Normal activeOnly=true case (metformin)
2. Test: Inactive-only drug with activeOnly=true vs false
3. Test: Edge case where FDA returns 0 packages

### Phase F: Documentation
1. Update MEDICATION_SEARCH_COMPLETE_REFERENCE.md
2. Mark Issue 2 as "FULLY RESOLVED"
3. Document single source of truth decision

---

## Expected Behavior After Fix

### Scenario A: Normal Case
```
1. FDA filters packages (activeOnly=true) → 699 active packages
2. Domain creates results with hasActiveNDCs=true (informational)
3. Domain does NOT filter again
4. Availability state: ACTIVE_FOUND
5. ✅ Return 699 packages
```

### Scenario B: No Active Packages
```
1. FDA filters packages (activeOnly=true) → 0 packages
2. Domain creates results with ndcCount=0, hasActiveNDCs=false
3. Domain does NOT filter again (already empty)
4. Availability state: ONLY_INACTIVE (detected BEFORE filtering)
5. ✅ Return appropriate message, not NOT_FOUND
```

### Scenario C: Show Inactive (activeOnly=false)
```
1. FDA does NOT filter packages (activeOnly=false) → 50 inactive packages
2. Domain creates results with hasActiveNDCs=false (informational)
3. Domain does NOT filter (activeOnly=false)
4. Availability state: ONLY_INACTIVE
5. ✅ Return 50 inactive packages
```

---

## Test Scenarios

### Test 1: Active-Only Normal Case
```typescript
Input: { query: "metformin", filters: { activeOnly: true } }
Expected:
  - FDA Client filters once
  - Domain does NOT filter
  - Returns multiple active formulations
  - availabilityState: "ACTIVE_FOUND"
  - Logs show single filter application
```

### Test 2: Inactive-Only Drug
```typescript
Input A: { query: "discontinued-drug", filters: { activeOnly: true } }
Expected:
  - FDA Client filters → 0 packages
  - Domain creates 0 results
  - availabilityState: "ONLY_INACTIVE" (not NOT_FOUND!)
  - Message: "has no active NDCs"

Input B: { query: "discontinued-drug", filters: { activeOnly: false } }
Expected:
  - FDA Client does NOT filter → N packages
  - Domain creates N results
  - availabilityState: "ONLY_INACTIVE"
  - Returns inactive packages
```

### Test 3: Edge Case - Upstream Empty
```typescript
Simulate: FDA returns empty due to RxCUI mismatch
Expected:
  - Fallback triggers
  - If fallback also returns 0: availabilityState: "NO_FDA_NDCS"
  - Domain does NOT apply second filter
  - Logs clearly show "0 packages from FDA, no domain filtering applied"
```

---

**END OF DISCOVERY DOCUMENT**

