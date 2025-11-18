# PR-11: Liquid Medication Support - Task List

 

**Version**: 1.0

**Last Updated**: 2025-11-18

**Status**: PR-11A Complete ✅ | PR-11B In Progress 🚧

**Total PRs**: 3 (PR-11A, PR-11B, PR-11C)

 

---

 

## 🎯 Overview

 

This task list breaks down the implementation of liquid medication support into **3 manageable PRs**. Each PR is designed to be:

- Independently testable

- Incrementally deliverable

- Non-breaking to existing functionality

 

**Problem**: NDC Calculator fails for all liquid medications (amoxicillin, azithromycin, insulin, etc.)

 

**Solution**: Add concentration parsing, mg → mL conversion, liquid-specific calculations, and mL-based package selection.

 

---

 

## 📋 PR Breakdown Strategy

 

### **PR-11A: Concentration Parser Foundation** (Days 1-3)

- Build concentration parsing engine

- Add unit tests (30+ tests)

- No changes to existing workflows

- **Goal**: Parse "250 MG/5 ML" → structured data

 

### **PR-11B: Liquid Calculator & FDA Integration** (Days 4-7)

- Build liquid calculation logic

- Enhance FDA mapper to extract concentrations

- Add unit tests (40+ tests)

- **Goal**: Calculate total mL for liquid medications

 

### **PR-11C: API Integration & End-to-End** (Days 8-10)

- Integrate liquid logic into calculate endpoint

- Add dosage form detection

- Add integration tests (20+ tests)

- Add validation & warnings

- **Goal**: Full liquid medication workflow

 

---

 

## 📦 Current Project Structure (Relevant Files)

 

```

packages/domain-ndc/

├── src/

│   ├── quantity.ts              # ✅ Exists - needs liquid routing

│   ├── packageMatch.ts          # ✅ Exists - needs mL-based selection

│   ├── unitConverter.ts         # ✅ Exists - will use for conversions

│   ├── types.ts                 # ✅ Exists - needs new types

│   ├── concentrationParser.ts   # 🆕 NEW - PR-11A

│   ├── liquidCalculator.ts      # 🆕 NEW - PR-11B

│   └── index.ts                 # ⚠️ Update exports

└── tests/

    ├── concentrationParser.test.ts   # 🆕 NEW - PR-11A

    └── liquidCalculator.test.ts      # 🆕 NEW - PR-11B

 

packages/clients-openfda/

├── src/

│   └── internal/

│       └── fdaMapper.ts         # ⚠️ Enhance - PR-11B

└── tests/

    └── fdaMapper.test.ts        # ⚠️ Add tests - PR-11B

 

apps/functions/

├── src/api/v1/

│   └── calculate.ts             # ⚠️ Enhance - PR-11C

└── tests/

    └── calculate.integration.test.ts  # ⚠️ Add tests - PR-11C

```

 

---

 

## 🔧 PR-11A: Concentration Parser Foundation

 

**Goal**: Build robust concentration parsing engine

**Estimated Effort**: 2-3 days

**Tests Required**: 30+ unit tests

**Dependencies**: None (standalone)

 

### Tasks

 

#### Task 1: Create Concentration Types

**File**: `packages/domain-ndc/src/types.ts`

 

- [ ] **1.1** Add `Concentration` interface

  ```typescript

  export interface Concentration {

    value: number;           // Numerator (e.g., 250)

    unit: string;            // Numerator unit (e.g., "MG")

    perValue: number;        // Denominator (e.g., 5)

    perUnit: string;         // Denominator unit (e.g., "ML")

    ratio: number;           // Calculated ratio (e.g., 50 mg/mL)

    rawString: string;       // Original string (e.g., "250 MG/5 ML")

  }

  ```

 

- [ ] **1.2** Add `ConcentrationFormat` type

  ```typescript

  export type ConcentrationFormat =

    | 'mg/ml'      // Standard (e.g., "250 MG/5 ML")

    | 'g/ml'       // Grams (e.g., "1 G/5 ML")

    | 'units/ml'   // Insulin (e.g., "U-100")

    | 'unknown';

  ```

 

- [ ] **1.3** Add `ConcentrationParseResult` type

  ```typescript

  export interface ConcentrationParseResult {

    success: boolean;

    concentration: Concentration | null;

    format: ConcentrationFormat;

    warnings: string[];

  }

  ```

 

---

 

#### Task 2: Build Concentration Parser

**File**: `packages/domain-ndc/src/concentrationParser.ts` (🆕 NEW)

 

- [ ] **2.1** Create `parseConcentration()` function

  - Input: `string` (e.g., "250 MG/5 ML")

  - Output: `ConcentrationParseResult`

  - Handle formats:

    - [x] `"250 MG/5 ML"` → 250 mg, 5 mL, ratio 50

    - [x] `"100 MG/1 ML"` → 100 mg, 1 mL, ratio 100

    - [x] `"1 G/5 ML"` → 1000 mg, 5 mL, ratio 200

    - [x] `"250 MG / 5 ML"` (with spaces)

    - [x] `"U-100"` → 100 units/mL (insulin)

    - [x] `"500MG/5ML"` (no spaces)

  - Return `null` for non-concentration strings (e.g., "TABLET")

 

- [ ] **2.2** Create `isConcentrationString()` helper

  - Input: `string`

  - Output: `boolean`

  - Detect if string contains concentration pattern (`/`, `MG`, `ML`, `U-`)

 

- [ ] **2.3** Create `normalizeConcentrationUnits()` helper

  - Convert grams to milligrams (1 G → 1000 MG)

  - Convert liters to milliliters (1 L → 1000 ML)

  - Uppercase all units

  - Handle abbreviations (G, GM, GRAM → MG)

 

- [ ] **2.4** Create `calculateConcentrationRatio()` helper

  - Input: `Concentration` (without ratio)

  - Output: `Concentration` (with ratio calculated)

  - Formula: `ratio = value / perValue`

  - Example: 250 mg / 5 mL → ratio = 50 mg/mL

 

- [ ] **2.5** Create `detectConcentrationFormat()` helper

  - Input: `string`

  - Output: `ConcentrationFormat`

  - Detect format type based on pattern

 

- [ ] **2.6** Add error handling for edge cases

  - Empty string → return null

  - Invalid format → return null

  - Zero denominator → throw error

  - Negative values → throw error

 

---

 

#### Task 3: Write Comprehensive Tests

**File**: `packages/domain-ndc/tests/concentrationParser.test.ts` (🆕 NEW)

 

- [ ] **3.1** Test standard formats (10 tests)

  - [x] `"250 MG/5 ML"` → 250 mg, 5 mL, ratio 50

  - [x] `"100 MG/1 ML"` → 100 mg, 1 mL, ratio 100

  - [x] `"600 MG/5 ML"` → 600 mg, 5 mL, ratio 120

  - [x] `"400 MG/5 ML"` → 400 mg, 5 mL, ratio 80

  - [x] `"200 MG/5 ML"` → 200 mg, 5 mL, ratio 40

  - [x] `"500 MG/5 ML"` → 500 mg, 5 mL, ratio 100

  - [x] `"125 MG/5 ML"` → 125 mg, 5 mL, ratio 25

  - [x] `"250 MG/10 ML"` → 250 mg, 10 mL, ratio 25

  - [x] `"500 MG/10 ML"` → 500 mg, 10 mL, ratio 50

  - [x] `"1000 MG/10 ML"` → 1000 mg, 10 mL, ratio 100

 

- [ ] **3.2** Test gram notation (5 tests)

  - [x] `"1 G/5 ML"` → 1000 mg, 5 mL, ratio 200

  - [x] `"0.5 G/5 ML"` → 500 mg, 5 mL, ratio 100

  - [x] `"0.25 G/5 ML"` → 250 mg, 5 mL, ratio 50

  - [x] `"2 G/10 ML"` → 2000 mg, 10 mL, ratio 200

  - [x] `"1.5 G/15 ML"` → 1500 mg, 15 mL, ratio 100

 

- [ ] **3.3** Test insulin formats (3 tests)

  - [x] `"U-100"` → 100 units, 1 mL, ratio 100

  - [x] `"U-500"` → 500 units, 1 mL, ratio 500

  - [x] `"U-200"` → 200 units, 1 mL, ratio 200

 

- [ ] **3.4** Test spacing variations (5 tests)

  - [x] `"250 MG / 5 ML"` (with spaces)

  - [x] `"250MG/5ML"` (no spaces)

  - [x] `"250 mg/5 ml"` (lowercase)

  - [x] `"250 Mg / 5 Ml"` (mixed case)

  - [x] `"250  MG  /  5  ML"` (multiple spaces)

 

- [ ] **3.5** Test edge cases (7 tests)

  - [x] Empty string → return null

  - [x] `"TABLET"` → return null (not concentration)

  - [x] `"CAPSULE"` → return null

  - [x] `"0 MG/5 ML"` → throw error (zero numerator)

  - [x] `"250 MG/0 ML"` → throw error (zero denominator)

  - [x] `"-250 MG/5 ML"` → throw error (negative)

  - [x] Invalid format `"ABC/XYZ"` → return null

 

- [ ] **3.6** Test `isConcentrationString()` (5 tests)

  - [x] `"250 MG/5 ML"` → true

  - [x] `"U-100"` → true

  - [x] `"TABLET"` → false

  - [x] `"CAPSULE"` → false

  - [x] Empty string → false

 

- [ ] **3.7** Verify ratio calculations (5 tests)

  - [x] 250 mg / 5 mL → 50 mg/mL

  - [x] 100 mg / 1 mL → 100 mg/mL

  - [x] 1000 mg / 5 mL → 200 mg/mL

  - [x] 600 mg / 5 mL → 120 mg/mL

  - [x] 125 mg / 5 mL → 25 mg/mL

 

**Total Tests: 35 tests**

 

---

 

#### Task 4: Update Package Exports

**File**: `packages/domain-ndc/src/index.ts`

 

- [ ] **4.1** Export concentration parser functions

  ```typescript

  export {

    parseConcentration,

    isConcentrationString,

    normalizeConcentrationUnits,

    calculateConcentrationRatio,

    detectConcentrationFormat

  } from './concentrationParser';

  ```

 

- [ ] **4.2** Export concentration types

  ```typescript

  export type {

    Concentration,

    ConcentrationFormat,

    ConcentrationParseResult

  } from './types';

  ```

 

---

 

#### Task 5: Documentation

**File**: `packages/domain-ndc/README.md`

 

- [ ] **5.1** Document concentration parser API

  - Function signatures

  - Input/output examples

  - Supported formats

  - Edge case behavior

 

- [ ] **5.2** Add usage examples

  ```typescript

  import { parseConcentration } from '@domain-ndc';

 

  const result = parseConcentration("250 MG/5 ML");

  // result.concentration.ratio = 50 mg/mL

  ```

 

---

 

### PR-11A Acceptance Criteria

 

- [ ] ✅ All 35+ tests passing (100%)

- [ ] ✅ TypeScript compiles with no errors

- [ ] ✅ ESLint passing with no warnings

- [ ] ✅ Code coverage ≥90% for `concentrationParser.ts`

- [ ] ✅ Documentation complete

- [ ] ✅ No breaking changes to existing code

- [ ] ✅ Exports added to package index

 

---

 

## 🔧 PR-11B: Liquid Calculator & FDA Integration

 

**Goal**: Build liquid calculation engine and extract concentrations from FDA data

**Estimated Effort**: 3-4 days

**Tests Required**: 55+ tests (40 liquid calc + 15 FDA)

**Dependencies**: PR-11A (concentration parser)

 

### Tasks

 

#### Task 1: Create Liquid Calculation Types

**File**: `packages/domain-ndc/src/types.ts`

 

- [ ] **1.1** Add `LiquidCalculationInput` interface

  ```typescript

  export interface LiquidCalculationInput {

    prescribedDoseMg: number;

    frequency: number;

    daysSupply: number;

    concentration: Concentration;

  }

  ```

 

- [ ] **1.2** Add `LiquidCalculationResult` interface

  ```typescript

  export interface LiquidCalculationResult {

    prescribedDoseMg: number;

    concentration: Concentration;

    mLPerDose: number;

    mLPerDay: number;

    totalML: number;

    formula: string;

    warnings: string[];

    isValid: boolean;

  }

  ```

 

- [ ] **1.3** Add `DosageFormType` enum

  ```typescript

  export enum DosageFormType {

    SOLID = 'SOLID',           // Tablets, Capsules

    LIQUID = 'LIQUID',         // Suspensions, Solutions, Syrups

    INJECTABLE = 'INJECTABLE', // Injections, Vials

    SPECIAL = 'SPECIAL'        // Patches, Inhalers

  }

  ```

 

---

 

#### Task 2: Build Liquid Calculator

**File**: `packages/domain-ndc/src/liquidCalculator.ts` (🆕 NEW)

 

- [ ] **2.1** Create `calculateLiquidQuantity()` function

  - Input: `LiquidCalculationInput`

  - Output: `LiquidCalculationResult`

  - Steps:

    1. Convert mg dose to mL dose

    2. Calculate mL per day

    3. Calculate total mL

    4. Validate dose compatibility

    5. Generate formula string

    6. Collect warnings

 

- [ ] **2.2** Create `convertMgToML()` helper

  - Input: `doseMg: number`, `concentration: Concentration`

  - Output: `number` (mL)

  - Formula: `mL = doseMg ÷ (mg/mL ratio)`

  - Example: 400 mg ÷ 50 mg/mL = 8 mL

  - Round to 2 decimal places

 

- [ ] **2.3** Create `validateLiquidDose()` function

  - Input: `doseMg: number`, `concentration: Concentration`

  - Output: `string[]` (warnings)

  - Validations:

    - Dose too small (< concentration minimum)

    - Dose doesn't align with concentration (e.g., 450 mg with 250 mg/5 mL)

    - Dose unusually large (> 10x concentration)

    - mL per dose > 50 mL (unusually large)

    - mL per dose < 0.1 mL (too small to measure)

 

- [ ] **2.4** Create `generateLiquidFormula()` helper

  - Input: `LiquidCalculationResult`

  - Output: `string`

  - Example: `"8 mL/dose × 3 doses/day × 7 days = 168 mL total"`

 

- [ ] **2.5** Create `isReasonableLiquidVolume()` helper

  - Input: `totalML: number`

  - Output: `boolean`

  - Range: 5 mL - 1000 mL

  - Add warning if outside range

 

---

 

#### Task 3: Enhance FDA Mapper

**File**: `packages/clients-openfda/src/internal/fdaMapper.ts`

 

- [ ] **3.1** Import concentration parser

  ```typescript

  import { parseConcentration, isConcentrationString } from '@domain-ndc';

  ```

 

- [ ] **3.2** Enhance `mapNDCPackage()` function

  - Extract `active_ingredients[0].strength` from FDA response

  - Parse concentration using `parseConcentration()`

  - Add `concentration` field to mapped result

  - Example FDA data:

    ```json

    {

      "active_ingredients": [

        { "name": "AMOXICILLIN", "strength": "250 MG/5 ML" }

      ]

    }

    ```

 

- [ ] **3.3** Add `extractConcentration()` helper

  - Input: FDA package object

  - Output: `Concentration | null`

  - Try multiple FDA fields:

    - `active_ingredients[0].strength`

    - `openfda.substance_name[0]` (fallback)

    - Return `null` if not found or not parseable

 

- [ ] **3.4** Handle multi-ingredient products

  - For now: Use first active ingredient only

  - Add warning: `"Multiple ingredients detected, using primary ingredient"`

  - Future: Support multi-ingredient (out of scope for PR-11)

 

- [ ] **3.5** Update `NDCPackage` type

  ```typescript

  export interface NDCPackage {

    ndc: string;

    packageSize: number;

    unit: string;

    dosageForm: string;

    concentration?: Concentration;  // NEW

    // ... existing fields

  }

  ```

 

---

 

#### Task 4: Add Dosage Form Detection

**File**: `packages/domain-ndc/src/dosageForm.ts` (already exists, enhance)

 

- [ ] **4.1** Create `getDosageFormType()` function

  - Input: `dosageForm: string`

  - Output: `DosageFormType`

  - Mappings:

    - SOLID: TABLET, CAPSULE, CAPLET

    - LIQUID: SUSPENSION, SOLUTION, SYRUP, ELIXIR, EMULSION

    - INJECTABLE: INJECTION, VIAL, AMPULE, SYRINGE

    - SPECIAL: PATCH, INHALER, SPRAY, CREAM, OINTMENT

 

- [ ] **4.2** Create `isLiquidDosageForm()` helper

  - Input: `dosageForm: string`

  - Output: `boolean`

  - Return true for LIQUID and INJECTABLE types

 

---

 

#### Task 5: Enhance Package Matcher for Liquids

**File**: `packages/domain-ndc/src/packageMatch.ts`

 

- [ ] **5.1** Create `selectLiquidPackages()` function

  - Input: `totalML: number`, `packages: NDCPackage[]`

  - Output: `PackageSelection`

  - Logic:

    1. Filter packages by unit (ML, L)

    2. Convert L to ML if needed

    3. Find exact match first

    4. Find minimum overfill (within 10%)

    5. Calculate multi-bottle if needed

    6. Return selection with overfill percentage

 

- [ ] **5.2** Update `selectOptimalPackages()` to detect liquid vs solid

  - If all packages have unit "ML" or "L" → use `selectLiquidPackages()`

  - Else → use existing solid package logic

 

---

 

#### Task 6: Write Liquid Calculator Tests

**File**: `packages/domain-ndc/tests/liquidCalculator.test.ts` (🆕 NEW)

 

- [ ] **6.1** Test standard calculations (10 tests)

  - [x] Amoxicillin: 400 mg, 3×/day, 7 days, 250 mg/5 mL → 168 mL

  - [x] Amoxicillin: 250 mg, 2×/day, 10 days, 250 mg/5 mL → 100 mL

  - [x] Azithromycin: 200 mg, 1×/day, 5 days, 100 mg/1 mL → 10 mL

  - [x] Augmentin: 600 mg, 2×/day, 10 days, 600 mg/5 mL → 100 mL

  - [x] Cefdinir: 300 mg, 2×/day, 10 days, 250 mg/5 mL → 120 mL

  - [x] Clarithromycin: 250 mg, 2×/day, 14 days, 125 mg/5 mL → 560 mL

  - [x] Penicillin: 250 mg, 4×/day, 10 days, 125 mg/5 mL → 400 mL

  - [x] Erythromycin: 400 mg, 3×/day, 7 days, 200 mg/5 mL → 210 mL

  - [x] Cephalexin: 500 mg, 2×/day, 7 days, 250 mg/5 mL → 140 mL

  - [x] Zithromax: 100 mg, 1×/day, 3 days, 100 mg/1 mL → 3 mL

 

- [ ] **6.2** Test fractional doses (5 tests)

  - [x] 7.5 mL per dose → correct total

  - [x] 2.5 mL per dose → correct total

  - [x] 12.5 mL per dose → correct total

  - [x] 0.5 mL per dose → correct total

  - [x] 15.5 mL per dose → correct total

 

- [ ] **6.3** Test high-frequency dosing (5 tests)

  - [x] QID (4×/day)

  - [x] Every 6 hours (4×/day)

  - [x] Every 8 hours (3×/day)

  - [x] Every 4 hours (6×/day)

  - [x] BID (2×/day)

 

- [ ] **6.4** Test long therapy durations (5 tests)

  - [x] 30 days supply

  - [x] 60 days supply

  - [x] 90 days supply

  - [x] 14 days supply

  - [x] 21 days supply

 

- [ ] **6.5** Test dose validation warnings (10 tests)

  - [x] Dose too small (50 mg with 250 mg/5 mL)

  - [x] Dose doesn't align (450 mg with 250 mg/5 mL)

  - [x] Dose unusually large (2000 mg with 250 mg/5 mL)

  - [x] mL per dose > 50 mL

  - [x] mL per dose < 0.1 mL

  - [x] Total volume > 1000 mL

  - [x] Total volume < 5 mL

  - [x] Zero dose → error

  - [x] Negative dose → error

  - [x] Zero frequency → error

 

- [ ] **6.6** Test formula generation (5 tests)

  - [x] Standard formula: "8 mL/dose × 3 doses/day × 7 days = 168 mL"

  - [x] BID: "5 mL/dose × 2 doses/day × 10 days = 100 mL"

  - [x] QID: "10 mL/dose × 4 doses/day × 5 days = 200 mL"

  - [x] Single dose: "5 mL/dose × 1 dose/day × 1 day = 5 mL"

  - [x] Fractional: "7.5 mL/dose × 2 doses/day × 7 days = 105 mL"

 

**Total Liquid Calculator Tests: 40 tests**

 

---

 

#### Task 7: Write FDA Mapper Tests

**File**: `packages/clients-openfda/tests/fdaMapper.test.ts`

 

- [ ] **7.1** Test concentration extraction (10 tests)

  - [x] Extract "250 MG/5 ML" from `active_ingredients[0].strength`

  - [x] Extract "100 MG/1 ML" from strength field

  - [x] Extract "1 G/5 ML" and convert to mg

  - [x] Extract "U-100" (insulin)

  - [x] Handle missing strength field → return null

  - [x] Handle empty strength field → return null

  - [x] Handle non-concentration strength (e.g., "10 MG") → return null

  - [x] Handle multi-ingredient products → use first ingredient

  - [x] Verify concentration added to NDCPackage type

  - [x] Verify backwards compatibility (packages without concentration)

 

- [ ] **7.2** Test edge cases (5 tests)

  - [x] Multiple active ingredients → warning + use first

  - [x] No active ingredients → return null

  - [x] Malformed strength field → return null

  - [x] Array of strengths → use first

  - [x] Concentration in different case → normalize

 

**Total FDA Mapper Tests: 15 tests**

 

---

 

#### Task 8: Update Package Exports

**File**: `packages/domain-ndc/src/index.ts`

 

- [ ] **8.1** Export liquid calculator functions

  ```typescript

  export {

    calculateLiquidQuantity,

    convertMgToML,

    validateLiquidDose,

    generateLiquidFormula,

    isReasonableLiquidVolume

  } from './liquidCalculator';

  ```

 

- [ ] **8.2** Export dosage form helpers

  ```typescript

  export {

    getDosageFormType,

    isLiquidDosageForm

  } from './dosageForm';

  ```

 

- [ ] **8.3** Export liquid types

  ```typescript

  export type {

    LiquidCalculationInput,

    LiquidCalculationResult,

    DosageFormType

  } from './types';

  ```

 

---

 

### PR-11B Acceptance Criteria

 

- [ ] ✅ All 55+ tests passing (100%)

- [ ] ✅ TypeScript compiles with no errors

- [ ] ✅ ESLint passing with no warnings

- [ ] ✅ Code coverage ≥90% for liquid calculator and FDA mapper enhancements

- [ ] ✅ FDA mapper correctly extracts concentrations

- [ ] ✅ Liquid calculations mathematically correct

- [ ] ✅ Backwards compatibility maintained (solid dosage forms unaffected)

- [ ] ✅ Documentation updated

 

---

 

## 🔧 PR-11C: API Integration & End-to-End

 

**Goal**: Integrate liquid logic into calculate endpoint with full workflow

**Estimated Effort**: 2-3 days

**Tests Required**: 20+ integration tests

**Dependencies**: PR-11A, PR-11B

 

### Tasks

 

#### Task 1: Enhance Calculate Endpoint

**File**: `apps/functions/src/api/v1/calculate.ts`

 

- [ ] **1.1** Import liquid calculation functions

  ```typescript

  import {

    calculateLiquidQuantity,

    isLiquidDosageForm,

    parseConcentration

  } from '@domain-ndc';

  ```

 

- [ ] **1.2** Add dosage form detection logic

  ```typescript

  // After fetching NDC packages from FDA

  const firstPackage = ndcPackages[0];

  const isLiquid = isLiquidDosageForm(firstPackage.dosageForm);

  ```

 

- [ ] **1.3** Route to liquid or solid calculation

  ```typescript

  if (isLiquid) {

    // Liquid medication path

    if (!firstPackage.concentration) {

      return {

        success: false,

        error: {

          code: 'CONCENTRATION_MISSING',

          message: 'Cannot calculate liquid medication without concentration'

        }

      };

    }

    return calculateLiquidPath(/* ... */);

  } else {

    // Solid medication path (existing)

    return calculateSolidPath(/* ... */);

  }

  ```

 

- [ ] **1.4** Implement `calculateLiquidPath()` helper

  - Extract prescribedDoseMg from request (sig.dose)

  - Call `calculateLiquidQuantity()`

  - Call `selectLiquidPackages()` with totalML

  - Build response with explanations

  - Add warnings to response

 

- [ ] **1.5** Build liquid response format

  ```typescript

  {

    success: true,

    data: {

      drug: { /* ... */ },

      concentration: { /* ... */ },

      totalQuantity: 168,    // Total mL

      unit: "ML",

      recommendedPackages: [

        { ndc: "...", packageSize: 100, unit: "ML", quantity: 2 }

      ],

      overfill: 32,

      overfillPercentage: 19,

      explanations: [

        "Parsed concentration: 250 mg / 5 mL = 50 mg/mL",

        "Converted dose: 400 mg ÷ 50 mg/mL = 8 mL per dose",

        "Daily volume: 8 mL × 3 times/day = 24 mL/day",

        "Total volume: 24 mL × 7 days = 168 mL",

        "Selected: 2 × 100 mL bottles (200 mL total)"

      ],

      warnings: []

    }

  }

  ```

 

---

 

#### Task 2: Add Request Validation for Liquids

**File**: `apps/functions/src/api/v1/middlewares/validate.ts`

 

- [ ] **2.1** Enhance SIG validation

  - For liquid medications, ensure dose is in mg (not mL)

  - Validate dose is reasonable (10 mg - 2000 mg)

  - Validate frequency is reasonable (1-6 times/day)

 

- [ ] **2.2** Add concentration validation

  - If dosage form is liquid and concentration missing → error

  - If concentration present, validate it's parseable

 

---

 

#### Task 3: Add Warnings System

**File**: `packages/domain-ndc/src/validation.ts` (enhance)

 

- [ ] **3.1** Create `generateLiquidWarnings()` function

  - Input: `LiquidCalculationResult`, `NDCPackage[]`

  - Output: `string[]`

  - Warnings:

    - Missing concentration

    - Dose doesn't align with concentration

    - Unusually large total volume (>500 mL)

    - Unusually small total volume (<10 mL)

    - Using multiple bottles (e.g., "2 × 100 mL")

    - mL per dose > 30 mL (hard to measure)

    - mL per dose has many decimals (e.g., 7.33333 mL)

 

- [ ] **3.2** Create `generateConcentrationWarning()` helper

  - Warn if concentration data is missing

  - Warn if concentration parsing failed

  - Warn if multiple ingredients detected

 

---

 

#### Task 4: Write Integration Tests

**File**: `apps/functions/tests/calculate.integration.test.ts`

 

- [ ] **4.1** Test liquid medication happy path (5 tests)

  - [x] Amoxicillin 400 mg, 3×/day, 7 days → 168 mL (2 × 100 mL bottles)

  - [x] Azithromycin 200 mg, 1×/day, 5 days → 10 mL (1 × 15 mL bottle)

  - [x] Augmentin 600 mg, 2×/day, 10 days → 100 mL (1 × 100 mL bottle)

  - [x] Insulin 10 units, 1×/day, 30 days → 3 mL (1 × 10 mL vial)

  - [x] Cephalexin 500 mg, 2×/day, 7 days → 140 mL (1 × 150 mL bottle)

 

- [ ] **4.2** Test concentration missing error (3 tests)

  - [x] Liquid dosage form with no concentration → error

  - [x] Error code: "CONCENTRATION_MISSING"

  - [x] Error message helpful and actionable

 

- [ ] **4.3** Test dose validation warnings (5 tests)

  - [x] Dose too small → warning in response

  - [x] Dose doesn't align → warning in response

  - [x] Unusually large volume → warning in response

  - [x] Multiple bottles needed → warning in response

  - [x] mL per dose > 30 mL → warning in response

 

- [ ] **4.4** Test explanations (3 tests)

  - [x] Response includes concentration parsing step

  - [x] Response includes mg → mL conversion step

  - [x] Response includes total volume calculation step

  - [x] Response includes bottle selection step

 

- [ ] **4.5** Test backwards compatibility (4 tests)

  - [x] Solid dosage (tablets) still works as before

  - [x] Existing tests continue to pass

  - [x] No breaking changes to API contract

  - [x] Response format unchanged for solid dosage

 

**Total Integration Tests: 20 tests**

 

---

 

#### Task 5: Update API Documentation

**File**: `packages/api-contracts/openapi.yaml`

 

- [ ] **5.1** Update calculate endpoint response schema

  - Add `concentration` field (optional)

  - Add `unit` field (ML, TABLET, etc.)

  - Add liquid-specific explanations

 

- [ ] **5.2** Add concentration error codes

  - `CONCENTRATION_MISSING`

  - `CONCENTRATION_PARSE_ERROR`

  - `DOSE_INCOMPATIBLE_WITH_CONCENTRATION`

 

- [ ] **5.3** Add liquid medication examples

  - Request/response for amoxicillin

  - Request/response for azithromycin

  - Error response for missing concentration

 

---

 

#### Task 6: Update README

**File**: `README.md`

 

- [ ] **6.1** Add liquid medication support section

  - Explain concentration parsing

  - Explain mg → mL conversion

  - Show example calculations

 

- [ ] **6.2** Update success metrics

  - Update "Current Status" to include PR-11 completion

  - Add liquid medication support to features list

 

- [ ] **6.3** Update known limitations

  - List out-of-scope items (manual concentration override, multi-ingredient, etc.)

 

---

 

#### Task 7: Create Completion Summary

**File**: `docs/summaries/PR-11-COMPLETION-SUMMARY.md`

 

- [ ] **7.1** Document what was delivered

  - Concentration parser (35+ tests)

  - Liquid calculator (40+ tests)

  - FDA integration (15+ tests)

  - API integration (20+ tests)

  - Total: 110+ new tests

 

- [ ] **7.2** Document test coverage

  - Overall coverage percentage

  - Coverage by module

 

- [ ] **7.3** Document clinical validation

  - Pharmacist sign-off

  - Test cases verified correct

 

- [ ] **7.4** Document known limitations

  - Out-of-scope items for future PRs

 

---

 

### PR-11C Acceptance Criteria

 

- [ ] ✅ All 20+ integration tests passing

- [ ] ✅ All existing tests continue to pass (no regressions)

- [ ] ✅ TypeScript compiles with no errors

- [ ] ✅ ESLint passing with no warnings

- [ ] ✅ End-to-end liquid workflow functional

- [ ] ✅ Solid dosage workflow unchanged (backwards compatible)

- [ ] ✅ Concentration missing → clear error message

- [ ] ✅ Warnings displayed appropriately

- [ ] ✅ Explanations clear and actionable

- [ ] ✅ API documentation updated

- [ ] ✅ README updated

- [ ] ✅ Completion summary written

- [ ] ✅ **Pharmacist validation:** All examples verified correct

- [ ] ✅ **Safety review:** No dosing risks identified

 

---

 

## 📊 Overall PR-11 Summary

 

### Total Deliverables

 

| PR | Focus | New Files | Modified Files | New Tests | Days |

|----|-------|-----------|----------------|-----------|------|

| **PR-11A** | Concentration Parser | 1 | 2 | 35+ | 2-3 |

| **PR-11B** | Liquid Calculator & FDA | 1 | 3 | 55+ | 3-4 |

| **PR-11C** | API Integration | 1 | 3 | 20+ | 2-3 |

| **TOTAL** | **Liquid Medication Support** | **3** | **8** | **110+** | **7-10** |

 

### New Files Created

 

1. `packages/domain-ndc/src/concentrationParser.ts` (150 LOC)

2. `packages/domain-ndc/src/liquidCalculator.ts` (200 LOC)

3. `packages/domain-ndc/tests/concentrationParser.test.ts` (300 LOC)

4. `packages/domain-ndc/tests/liquidCalculator.test.ts` (400 LOC)

5. `docs/summaries/PR-11-COMPLETION-SUMMARY.md` (documentation)

 

### Files Modified

 

1. `packages/domain-ndc/src/types.ts` (add liquid types)

2. `packages/domain-ndc/src/index.ts` (exports)

3. `packages/domain-ndc/src/dosageForm.ts` (liquid detection)

4. `packages/domain-ndc/src/packageMatch.ts` (mL-based selection)

5. `packages/clients-openfda/src/internal/fdaMapper.ts` (concentration extraction)

6. `packages/clients-openfda/tests/fdaMapper.test.ts` (new tests)

7. `apps/functions/src/api/v1/calculate.ts` (liquid routing)

8. `apps/functions/tests/calculate.integration.test.ts` (new tests)

 

### Test Coverage

 

- **PR-11A:** 35+ tests (concentration parser)

- **PR-11B:** 55+ tests (40 liquid calc + 15 FDA)

- **PR-11C:** 20+ tests (integration)

- **Total:** 110+ new tests

- **Target Coverage:** ≥90% for all new code

 

### Clinical Impact

 

- ✅ NDC Calculator now works for liquid medications

- ✅ Supports pediatric prescriptions (amoxicillin, azithromycin, etc.)

- ✅ Accurate mL calculations for pharmacy dispensing

- ✅ Safety warnings for edge cases

- ✅ Clear explanations for transparency

 

---

 

## 🎯 Success Criteria (Overall)

 

### Functional Success

- [ ] ✅ Concentration parsing works for all common formats

- [ ] ✅ mg → mL conversion mathematically correct

- [ ] ✅ Total volume calculation accurate

- [ ] ✅ Package selection optimal (minimize overfill)

- [ ] ✅ Warnings appropriate and actionable

- [ ] ✅ Backwards compatibility maintained

 

### Technical Success

- [ ] ✅ All 110+ tests passing (100%)

- [ ] ✅ No regressions in existing tests

- [ ] ✅ Code coverage ≥90%

- [ ] ✅ TypeScript strict mode (no errors)

- [ ] ✅ ESLint clean (no warnings)

- [ ] ✅ Performance <2s end-to-end

 

### Clinical Success

- [ ] ✅ Pharmacist validation: all examples correct

- [ ] ✅ Safety review: no dosing risks

- [ ] ✅ Amoxicillin example verified

- [ ] ✅ Azithromycin example verified

- [ ] ✅ Augmentin example verified

- [ ] ✅ Insulin example verified

 

---

 

## 📋 Next Steps After PR-11

 

### Future Enhancements (Out of Scope)

1. **Manual concentration override** (allow user to provide concentration)

2. **Multi-ingredient concentrations** (e.g., Augmentin: amoxicillin + clavulanate)

3. **Weight-based dosing** (mg/kg calculations)

4. **BSA-based dosing** (mg/m² calculations)

5. **Reconstitution calculations** (powder → liquid)

6. **Alternative concentrations** (suggest different strengths)

7. **Dosing accessories** (droppers, syringes, dosing cups)

8. **Storage warnings** (refrigeration, expiration after reconstitution)