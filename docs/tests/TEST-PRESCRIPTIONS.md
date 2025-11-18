# NDC Calculator - Test Prescriptions

**Backend URL:** `https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api`  
**Deployed:** November 13, 2025  
**Status:** ✅ Live with calculation handler fixes

---

## Quick Start

### Option 1: Using curl

```bash
curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
  -H "Content-Type: application/json" \
  -d @test-data.json
```

### Option 2: Using Frontend

1. Navigate to: `http://localhost:3000` (or your deployed frontend)
2. Enter drug name in autocomplete
3. Fill in SIG and days supply
4. Click "Calculate"

---

## Test Case 1: Simple Tablet (Exact Match) ✅

**Prescription:**
- Drug: Lisinopril 10 MG Oral Tablet
- Directions: Take 1 tablet by mouth daily
- Days Supply: 30

**Expected Result:**
- Exact match: 30-tablet package
- 0% overfill/underfill
- Single NDC returned

**curl Command:**

```bash
curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": { "name": "Lisinopril 10 MG Oral Tablet" },
    "sig": { "dose": 1, "frequency": 1, "unit": "tablet" },
    "daysSupply": 30
  }'
```

**JSON Payload:**

```json
{
  "drug": { "name": "Lisinopril 10 MG Oral Tablet" },
  "sig": { "dose": 1, "frequency": 1, "unit": "tablet" },
  "daysSupply": 30
}
```

---

## Test Case 2: Twice Daily Dosing (Overfill Expected) ✅

**Prescription:**
- Drug: Metformin 500 MG Oral Tablet
- Directions: Take 1 tablet by mouth twice daily
- Days Supply: 30

**Expected Result:**
- Total needed: 60 tablets
- Package: 100-count bottle (most common)
- ~67% overfill (40 extra tablets)
- Warning about overfill

**curl Command:**

```bash
curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": { "name": "Metformin 500 MG Oral Tablet" },
    "sig": { "dose": 1, "frequency": 2, "unit": "tablet" },
    "daysSupply": 30
  }'
```

**JSON Payload:**

```json
{
  "drug": { "name": "Metformin 500 MG Oral Tablet" },
  "sig": { "dose": 1, "frequency": 2, "unit": "tablet" },
  "daysSupply": 30
}
```

---

## Test Case 3: 90-Day Supply (Exact Match) ✅

**Prescription:**
- Drug: Amlodipine 5 MG Oral Tablet
- Directions: Take 1 tablet by mouth daily
- Days Supply: 90

**Expected Result:**
- Total needed: 90 tablets
- Package: 90-count bottle (common for maintenance meds)
- 0% overfill
- Single NDC

**curl Command:**

```bash
curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": { "name": "Amlodipine 5 MG Oral Tablet" },
    "sig": { "dose": 1, "frequency": 1, "unit": "tablet" },
    "daysSupply": 90
  }'
```

**JSON Payload:**

```json
{
  "drug": { "name": "Amlodipine 5 MG Oral Tablet" },
  "sig": { "dose": 1, "frequency": 1, "unit": "tablet" },
  "daysSupply": 90
}
```

---

## Test Case 4: High-Dose Tablet (Fractional) ⚠️

**Prescription:**
- Drug: Levothyroxine 25 MCG Oral Tablet
- Directions: Take 1.5 tablets by mouth daily
- Days Supply: 30

**Expected Result:**
- Total needed: 45 tablets
- Package: 90-count or 100-count
- Overfill expected
- Possible warning about fractional dosing

**curl Command:**

```bash
curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": { "name": "Levothyroxine 25 MCG Oral Tablet" },
    "sig": { "dose": 1.5, "frequency": 1, "unit": "tablet" },
    "daysSupply": 30
  }'
```

**JSON Payload:**

```json
{
  "drug": { "name": "Levothyroxine 25 MCG Oral Tablet" },
  "sig": { "dose": 1.5, "frequency": 1, "unit": "tablet" },
  "daysSupply": 30
}
```

---

## Test Case 5: Liquid Formulation (Antibiotic) 🧪

**Prescription:**
- Drug: Amoxicillin 250 MG/5ML Oral Suspension
- Directions: Take 5 mL by mouth three times daily
- Days Supply: 10

**Expected Result:**
- Total needed: 150 mL
- Package: 150 mL or 200 mL bottle
- Dosage form filter: liquid family match
- Unit: mL

**curl Command:**

```bash
curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": { "name": "Amoxicillin 250 MG/5ML Oral Suspension" },
    "sig": { "dose": 5, "frequency": 3, "unit": "mL" },
    "daysSupply": 10
  }'
```

**JSON Payload:**

```json
{
  "drug": { "name": "Amoxicillin 250 MG/5ML Oral Suspension" },
  "sig": { "dose": 5, "frequency": 3, "unit": "mL" },
  "daysSupply": 10
}
```

---

## Test Case 6: Unit Conversion (mg to tablets) 🔬

**Prescription:**
- Drug: Metformin 500 MG Oral Tablet
- Directions: Take 1000 mg by mouth twice daily
- Days Supply: 30

**Expected Result:**
- Strength parsing: 500 mg per tablet
- Conversion: 1000 mg ÷ 500 mg/tablet = 2 tablets per dose
- Total needed: 2 × 2 × 30 = 120 tablets
- Package: 120-count or larger
- Explanation: Shows unit conversion in details

**curl Command:**

```bash
curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": { "name": "Metformin 500 MG Oral Tablet" },
    "sig": { "dose": 1000, "frequency": 2, "unit": "mg" },
    "daysSupply": 30
  }'
```

**JSON Payload:**

```json
{
  "drug": { "name": "Metformin 500 MG Oral Tablet" },
  "sig": { "dose": 1000, "frequency": 2, "unit": "mg" },
  "daysSupply": 30
}
```

---

## Test Case 7: Using RxCUI Directly 🎯

**Prescription:**
- RxCUI: 314076 (Lisinopril 10 MG)
- Directions: Take 1 tablet by mouth daily
- Days Supply: 30

**Expected Result:**
- Skips drug name normalization
- Uses RxCUI directly
- Same result as Test Case 1

**curl Command:**

```bash
curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": { "name": "Lisinopril", "rxcui": "314076" },
    "sig": { "dose": 1, "frequency": 1, "unit": "tablet" },
    "daysSupply": 30
  }'
```

**JSON Payload:**

```json
{
  "drug": { "name": "Lisinopril", "rxcui": "314076" },
  "sig": { "dose": 1, "frequency": 1, "unit": "tablet" },
  "daysSupply": 30
}
```

---

## Test Case 8: Complex Dosing Schedule 📋

**Prescription:**
- Drug: Prednisone 10 MG Oral Tablet
- Directions: Take 2 tablets by mouth twice daily
- Days Supply: 7

**Expected Result:**
- Total needed: 2 × 2 × 7 = 28 tablets
- Package: 30-count (common for taper packs)
- Minimal overfill (~7%)
- Single NDC

**curl Command:**

```bash
curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": { "name": "Prednisone 10 MG Oral Tablet" },
    "sig": { "dose": 2, "frequency": 2, "unit": "tablet" },
    "daysSupply": 7
  }'
```

**JSON Payload:**

```json
{
  "drug": { "name": "Prednisone 10 MG Oral Tablet" },
  "sig": { "dose": 2, "frequency": 2, "unit": "tablet" },
  "daysSupply": 7
}
```

---

## Expected Response Structure

```json
{
  "success": true,
  "data": {
    "drug": {
      "rxcui": "314076",
      "name": "Lisinopril 10 MG Oral Tablet",
      "dosageForm": "TABLET",
      "strength": "10 MG"
    },
    "totalQuantity": 30,
    "recommendedPackages": [
      {
        "ndc": "00071-0156-23",
        "packageSize": 30,
        "unit": "TABLET",
        "dosageForm": "TABLET",
        "marketingStatus": "Prescription",
        "isActive": true,
        "quantityNeeded": 30,
        "fillPrecision": "exact",
        "reasoning": "Exact match with zero waste. Single container for convenience.",
        "confidenceScore": 0.98,
        "source": "algorithm"
      }
    ],
    "overfillPercentage": 0,
    "underfillPercentage": 0,
    "warnings": [],
    "explanations": [
      {
        "step": "normalization",
        "description": "Normalized drug name to RxCUI 314076",
        "details": { "confidence": 1.0 }
      },
      {
        "step": "fetch_ndcs_rxnorm",
        "description": "Retrieved 10 NDC codes from RxNorm",
        "details": { "rxcui": "314076", "source": "RxNorm" }
      },
      {
        "step": "enrich_packages_fda",
        "description": "Enriched 10 packages with FDA data",
        "details": { "rxcui": "314076", "source": "openFDA" }
      },
      {
        "step": "quantity_calculation",
        "description": "Calculated total quantity: 30 tablets",
        "details": { "method": "direct", "result": 30 }
      },
      {
        "step": "package_selection",
        "description": "Selected 30-tablet package (exact match)",
        "details": { "ndc": "00071-0156-23", "overfill": 0 }
      }
    ],
    "metadata": {
      "usedAI": false,
      "executionTime": 1245
    }
  }
}
```

---

## What to Check

### ✅ Success Indicators

1. **RxNorm → FDA Pipeline:**
   - Look for `fetch_ndcs_rxnorm` in explanations
   - Verify NDC count > 0

2. **Single Package Selection:**
   - `recommendedPackages` array length = 1
   - Only ONE NDC returned

3. **Quantity Calculation:**
   - Check `totalQuantity` matches expected
   - Look for `method` in explanation details
   - For mg dosing: should see "strength_conversion"

4. **Dosage Form Filtering:**
   - Check `filter_dosage_form` explanation
   - Filtered count should be ≤ original count

5. **Fill Precision:**
   - Check `fillPrecision`: "exact", "overfill", or "underfill"
   - Percentages should match package vs required quantity

### ⚠️ Watch For

1. **Fallback to FDA RxCUI:**
   - If you see `fetch_ndcs_fda_fallback` → RxNorm had no NDCs
   - Log these RxCUIs for investigation

2. **Unit Mismatch Warnings:**
   - "Unit mismatch" warning → verify prescription is correct

3. **Significant Overfill:**
   - Overfill > 20% → patient will have leftover medication
   - Verify this is acceptable

4. **Underfill:**
   - Any underfill → no package large enough
   - Patient will need early refill

---

## Health Check

```bash
curl "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/health"
```

**Expected Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T11:19:07.432Z",
  "services": {
    "rxnorm": { "status": "healthy", "responseTime": 452 },
    "fda": { "status": "healthy", "responseTime": 446 },
    "firestore": { "status": "healthy" },
    "openai": { "status": "disabled" }
  }
}
```

---

## Troubleshooting

### Error: "No NDC packages found"

**Possible Causes:**
1. Drug not in RxNorm database
2. RxNorm has no NDCs for this RxCUI
3. FDA has no records for these NDCs

**Solution:**
- Check RxNorm manually: `https://rxnav.nlm.nih.gov/`
- Verify drug name spelling
- Try using RxCUI directly

### Error: "Drug not found"

**Possible Causes:**
1. Misspelled drug name
2. Drug not in RxNorm

**Solution:**
- Use autocomplete in frontend (filters to valid drugs)
- Check spelling
- Try generic name instead of brand

### Error: 500 Internal Server Error

**Check:**
1. View Firebase Functions logs
2. Look for error in explanations
3. Check if RxNorm/FDA APIs are down

---

## Quick Reference

| Test Case | Drug | Total Qty | Expected Package | Overfill % |
|-----------|------|-----------|------------------|------------|
| 1 | Lisinopril 10mg | 30 | 30-count | 0% |
| 2 | Metformin 500mg | 60 | 100-count | ~67% |
| 3 | Amlodipine 5mg | 90 | 90-count | 0% |
| 4 | Levothyroxine 25mcg | 45 | 90-count | ~100% |
| 5 | Amoxicillin 250mg/5mL | 150 mL | 150mL | 0% |
| 6 | Metformin (mg dosing) | 120 | 120-count | varies |
| 7 | Lisinopril (RxCUI) | 30 | 30-count | 0% |
| 8 | Prednisone 10mg | 28 | 30-count | ~7% |

---

**Last Updated:** November 13, 2025  
**Backend Version:** v2.0 (with calculation handler fixes)  
**Status:** ✅ Ready for Testing

