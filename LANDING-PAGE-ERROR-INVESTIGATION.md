# Landing Page Calculator Error Investigation

**Date**: November 13, 2025  
**Status**: ✅ Resolved

## Problem Report
User encountered error when testing landing page calculator with "mofebutazone 200 MG Oral Capsule":
- Error displayed: "FDA API Error: No matches found! (NOT_FOUND)"
- Status code: 500
- Frontend showed raw error message instead of user-friendly message

## Investigation Process

### Step 1: Check Backend Logs
Examined Firebase Functions logs:
```
FDA API Error: Request failed with status code 404
url: "/drug/ndc.json"
rxcui: "410376"
```

### Step 2: Verify Drug Exists in FDA Database
Tested directly with FDA API:
```bash
curl "https://api.fda.gov/drug/ndc.json?search=openfda.rxcui:410376&limit=1"
# Response: "No matches found!"
```

**Finding**: Mofebutazone (RxCUI: 410376) does NOT exist in FDA NDC Directory.

### Step 3: Verify Backend is Working
Tested with a known working drug (Lisinopril):
```bash
curl -X POST .../api/v1/calculate \
  -d '{"drug": {"name": "Lisinopril 10 MG Oral Tablet", "rxcui": "314076"}, ...}'
# Response: { "success": true, ... }
```

**Finding**: Backend is functioning correctly. Issue is drug-specific.

### Step 4: Check Error Message Handling
Reviewed frontend error handling in `hero.tsx` and `enhanced-calculator.tsx`:
```typescript
if (err.message.includes('No results found')) {
  // User-friendly message
}
```

**Problem Found**: Error check was looking for "No results found" but actual error message contained "No matches found".

## Root Cause

1. **Primary Issue**: Mofebutazone is not available in the FDA NDC Directory
   - Drug may be discontinued
   - May not be FDA-approved
   - May not be marketed in the US

2. **Secondary Issue**: Frontend error handling didn't catch "No matches found" variant
   - Only checked for "No results found"
   - Resulted in raw API error being displayed to users

## Solution Implemented

### Fix 1: Enhanced Error Message Matching
Updated both `hero.tsx` and `enhanced-calculator.tsx`:

```typescript
// Before
if (err.message.includes('No results found')) {
  errorMessage = `Could not find drug information in FDA database...`;
}

// After
if (err.message.includes('No matches found') || err.message.includes('No results found')) {
  errorMessage = `Could not find drug information in FDA database. This drug may be discontinued, not FDA-approved, or not available in the US market. Please try a different medication.`;
}
```

### Fix 2: Improved User Guidance
New error message provides:
- Clear explanation of why the error occurred
- Possible reasons (discontinued, not FDA-approved, not in US market)
- Actionable next step (try a different medication)

## Files Modified

1. `/frontend/components/hero.tsx` (lines 111-112)
   - Updated error message detection
   - Added clearer user guidance

2. `/frontend/components/calculator/enhanced-calculator.tsx` (lines 122-123)
   - Updated error message detection
   - Added clearer user guidance

## Testing

### Test Case 1: Drug Not in FDA Database (Mofebutazone)
**Input**:
- Drug: "mofebutazone 200 MG Oral Capsule" (RxCUI: 410376)
- SIG: "1 tablet daily"
- Days: 30

**Expected Result**:
```
Could not find drug information in FDA database. This drug may be discontinued, 
not FDA-approved, or not available in the US market. Please try a different medication.
```

### Test Case 2: Valid Drug (Lisinopril)
**Input**:
- Drug: "Lisinopril 10 MG Oral Tablet" (RxCUI: 314076)
- SIG: "1 tablet daily"
- Days: 30

**Expected Result**:
- Success response with NDC recommendations
- No errors

### Test Case 3: Misspelled Drug
**Input**:
- Drug: "XyzDrugNotReal"
- SIG: "1 tablet daily"
- Days: 30

**Expected Result**:
- User-friendly error about drug not found
- Suggestion to verify spelling

## Why This Drug Isn't in FDA Database

**Mofebutazone** is a non-steroidal anti-inflammatory drug (NSAID) that:
1. Was never approved by the FDA for use in the United States
2. Has been used historically in other countries but is now largely discontinued
3. Has been replaced by newer, safer NSAIDs

This is a legitimate use case where:
- ✅ RxNorm contains the drug (as a concept/reference)
- ❌ FDA NDC Directory doesn't have it (no active US products)

## Related Issues

### FDA vs RxNorm Coverage
- **RxNorm**: Comprehensive drug terminology (~200K+ concepts)
  - Includes historical drugs, international drugs, drug concepts
  - Used for terminology and drug knowledge
  
- **FDA NDC Directory**: Only currently marketed US drugs (~160K+ products)
  - Only FDA-approved drugs
  - Only actively marketed products
  - Updated as drugs enter/leave market

### Autocomplete Filtering
The autocomplete in both calculators filters to only show clinical drug forms (SCD, SBD) to reduce this issue, but some valid RxNorm concepts may still not have corresponding FDA NDC entries.

## Recommendations

### Short-term (Completed ✅)
- ✅ Enhanced error message to explain why drug might not be found
- ✅ Catch both "No matches found" and "No results found" variants
- ✅ Provide actionable guidance to users

### Medium-term (Future Enhancement)
- 📋 Add FDA availability check to autocomplete
  - Show indicator if drug has FDA NDC records
  - Grey out or mark drugs without FDA coverage
  
- 📋 Provide alternative drug suggestions
  - When a drug isn't found, suggest similar alternatives
  - Use therapeutic class or ingredient-based matching

### Long-term (Future Enhancement)
- 📋 Build FDA coverage database
  - Cache which RxCUIs have FDA NDC records
  - Update periodically (weekly/monthly)
  - Use to pre-filter autocomplete results

## Deployment Status

- ✅ Backend deployed: Firebase Functions `api` (us-central1)
- ✅ Frontend changes committed: Ready for Vercel deployment
- ✅ Error handling improved for both landing page and main calculator

## Key Learnings

1. **RxNorm ≠ FDA Coverage**: Not all drugs in RxNorm have FDA NDC records
2. **Error Message Variants**: FDA API can return slightly different error messages
3. **User Experience**: Raw API errors are confusing; always provide context and guidance
4. **Data Source Awareness**: Important to understand limitations of each data source

---

**Commits**:
- `f0db5305` - "fix: update landing page calculator to use rxcui and improved error handling"
- `093ab344` - "fix: improve error messages for drugs not found in FDA database"

**Related Documents**:
- `FDA-API-INVESTIGATION-REPORT.md` - Initial FDA API investigation
- `LANDING-PAGE-CALCULATOR-FIX.md` - Landing page calculator improvements

