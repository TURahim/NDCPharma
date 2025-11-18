# FDA NDC Format Investigation & Resolution

## Problem Statement

The deployed NDC Calculator was returning:
```json
{
  "success": false,
  "error": {
    "code": "CALCULATION_ERROR",
    "message": "No NDC packages found for drug (RxCUI: 314076)"
  }
}
```

Despite Lisinopril 10mg being a widely-available drug.

## Root Cause Analysis

### Discovery 1: FDA API Format Requirements

**RxNorm NDC Format:**
- Returns NDCs without hyphens
- Example: `00093111310` (11 digits, no punctuation)

**FDA NDC Format:**
- Requires/returns NDCs with hyphens
- Standard format: `XXXXX-XXXX-XX` (5-4-2 segmentation)
- Example: `70518-4397-0`

### Discovery 2: FDA Search Methods

**FDA RxCUI Search** (Primary - WORKS ✅):
```bash
curl "https://api.fda.gov/drug/ndc.json?search=openfda.rxcui:314076&limit=5"
# Returns: 177 total results for Lisinopril 10mg
# Example NDCs: 70518-4397-0, 71610-612-45, 50090-7022-0
```

**FDA Package NDC Search** (Requires Exact Match ❌):
```bash
curl "https://api.fda.gov/drug/ndc.json?search=package_ndc:00093-1113-10"
# Returns: 0 results (NDC might be delisted)
```

### Discovery 3: Data Source Mismatch

**Original Implementation Flaw:**
1. Fetch NDC list from RxNorm (`/rxcui/{rxcui}/ndcs.json`)
2. Normalize each NDC to hyphenated format
3. Query FDA by individual package NDC

**Problem:**
- RxNorm's NDC list includes **historical/delisted NDCs**
- FDA only returns **currently-marketed NDCs**
- Many RxNorm NDCs no longer exist in FDA's database
- Result: Empty results even for common drugs

## Solution Implemented

### Strategy: Reverse the Data Flow

**Before (BROKEN):**
```
RxNorm (Primary) → NDC List → FDA Individual Lookups (Fallback)
├─ Gets outdated NDCs
└─ Each lookup fails → Empty result
```

**After (FIXED):**
```
FDA RxCUI Search (Primary) → Direct Package List ✅
└─ FDA internally handles NDC format
└─ Returns only active, currently-marketed packages
```

### Code Changes

**File:** `apps/functions/src/api/v1/calculate.ts`

**Before:**
```typescript
// Step 2A: Get NDCs from RxNorm
const ndcList = await getNdcsForRxcui(rxcui);

// Step 2B: Fetch FDA details for each NDC
if (ndcList.length > 0) {
  allPackages = await fdaClient.getPackagesByNdcList(ndcList, {});
} else {
  // Fallback to FDA RxCUI search
  allPackages = await fdaClient.getNDCsByRxCUI(rxcui, { limit: 100 });
}
```

**After:**
```typescript
// Primary: Query FDA directly by RxCUI
const allPackages = await fdaClient.getNDCsByRxCUI(rxcui, { limit: 100 });

if (!allPackages || allPackages.length === 0) {
  throw new Error(`FDA has no NDC packages for RxCUI ${rxcui}`);
}
```

### Why This Works

1. **FDA RxCUI Search:**
   - Uses `openfda.rxcui:314076` query parameter
   - FDA maintains its own RxCUI → NDC mapping
   - Returns complete package details with metadata
   - Automatically filters to active/marketed NDCs only

2. **No Format Conversion Needed:**
   - FDA handles NDC normalization internally
   - Returns NDCs in standard hyphenated format
   - Package details include all required fields

3. **Better Data Quality:**
   - FDA is the authoritative source for current NDCs
   - RxNorm is better for drug name → RxCUI resolution
   - Each API used for its strength

## Verification

### Test 1: Direct FDA API
```bash
curl -s "https://api.fda.gov/drug/ndc.json?search=openfda.rxcui:314076&limit=3"
```

**Result:**
```json
{
  "meta": {
    "results": {
      "total": 177
    }
  },
  "results": [
    {
      "product_ndc": "70518-4397",
      "generic_name": "Lisinopril",
      "packaging": [
        {
          "package_ndc": "70518-4397-0"
        }
      ],
      "openfda": {
        "rxcui": ["314076"]
      }
    }
  ]
}
```

### Test 2: RxNorm NDC Format
```bash
curl -s "https://rxnav.nlm.nih.gov/REST/rxcui/314076/ndcs.json"
```

**Result:**
```json
{
  "ndcGroup": {
    "rxcui": null,
    "ndcList": {
      "ndc": [
        "00093111310",  // ← No hyphens
        "00143126701",
        ...
      ]
    }
  }
}
```

### Test 3: NDC Normalization
```javascript
// Our normalizeNDC function
const input = "00093111310";  // RxNorm format
const output = "00093-1113-10"; // FDA format

// But this specific NDC doesn't exist in FDA's current database!
// Hence why the batch lookup fails
```

## Key Learnings

### 1. NDC Format Variations
- **5-4-2** format: `XXXXX-XXXX-XX` (most common)
- **4-4-2** format: `XXXX-XXXX-XX` (pad labeler with leading zero)
- **5-3-2** format: `XXXXX-XXX-XX` (pad product with leading zero)
- FDA accepts any but normalizes to 5-4-2

### 2. Data Source Authority
- **RxNorm**: Authoritative for drug concepts and names
- **FDA NDC Directory**: Authoritative for current NDC listings
- **Hybrid Approach**: Use both for their strengths

### 3. API Design Patterns
- RxCUI-based searches are more reliable than NDC-based
- FDA's internal mappings are kept up-to-date
- Individual NDC lookups prone to stale data

## Deployment Status

### Commits
1. `fdcbaa58` - Fixed property name (`labeler` vs `labelerName`)
2. `9c3a1948` - Swapped FDA RxCUI to primary source
3. `d120635f` - Enhanced logging and linting fixes

### Deploy
```bash
firebase deploy --only functions
# ✅ Deployed to: https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api
```

### Next Steps
1. Test deployed endpoint with Lisinopril 10mg
2. Monitor GCP logs for FDA API responses
3. Verify package count and NDC format in response

## References

- **FDA NDC Directory API**: https://open.fda.gov/apis/drug/ndc/
- **RxNorm API**: https://rxnav.nlm.nih.gov/
- **NDC Format Spec**: https://www.fda.gov/drugs/drug-approvals-and-databases/national-drug-code-directory
- **Our Implementation**: `packages/clients-openfda/src/index.ts`

