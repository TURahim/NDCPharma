# @ndc/domain-ndc

Pure business logic for NDC (National Drug Code) calculations, package matching, and medication quantity computations.

## Features

- **Quantity Calculations**: Compute total medication quantities with unit conversions
- **Package Selection**: Choose optimal NDC packages with minimal overfill/underfill
- **Unit Conversion**: Convert between medication units (tablets, capsules, mL, mg, etc.)
- **Dosage Form Matching**: Normalize and match dosage forms (solid, liquid, other)
- **NDC Validation**: Validate and normalize NDC codes to standard formats
- **Concentration Parsing**: Parse and compute concentration ratios for liquid medications

## Installation

```bash
pnpm add @ndc/domain-ndc
```

## Usage

### Liquid Medication Calculator

Calculate total liquid volume needed for prescriptions:

```typescript
import { calculateLiquidQuantity } from '@ndc/domain-ndc';

// Calculate amoxicillin suspension
const result = calculateLiquidQuantity({
  prescribedDoseMg: 400,        // 400 mg per dose
  frequency: 3,                  // 3 times daily
  daysSupply: 7,                 // 7 days
  concentration: {
    value: 250,
    unit: 'MG',
    perValue: 5,
    perUnit: 'ML',
    ratio: 50,  // 50 mg/mL
    rawString: '250 MG/5 ML'
  }
});

console.log(result);
// {
//   totalML: 168,           // Total volume needed
//   mLPerDose: 8,           // 8 mL per dose
//   mLPerDay: 24,           // 24 mL per day
//   formula: "8 mL/dose × 3 doses/day × 7 days = 168 mL",
//   warnings: [],
//   isValid: true
// }

// Calculate azithromycin suspension
const azithro = calculateLiquidQuantity({
  prescribedDoseMg: 200,
  frequency: 1,
  daysSupply: 5,
  concentration: { value: 100, unit: 'MG', perValue: 1, perUnit: 'ML', ratio: 100, rawString: '100 MG/1 ML' }
});
console.log(azithro.totalML);  // 10 mL
```

#### Liquid Calculation Helpers

```typescript
import {
  convertMgToML,
  validateLiquidDose,
  generateLiquidFormula,
  isReasonableLiquidVolume,
} from '@ndc/domain-ndc';

// Convert mg to mL using concentration
convertMgToML(400, concentration);  // 8 mL (for 250 MG/5 ML concentration)

// Validate dose and get warnings
const warnings = validateLiquidDose(400, concentration, 8);
// Returns array of warning messages if dose is unusual

// Generate human-readable formula
const formula = generateLiquidFormula(8, 3, 7, 168);
// "8 mL/dose × 3 doses/day × 7 days = 168 mL"

// Check if volume is reasonable
isReasonableLiquidVolume(168);   // true (within 5-1000 mL range)
isReasonableLiquidVolume(1200);  // false (exceeds 1000 mL)
```

#### Select Liquid Packages

```typescript
import { selectLiquidPackages } from '@ndc/domain-ndc';

const liquidPackages = [
  { ndc: '...', packageSize: { quantity: 75, unit: 'ML' }, dosageForm: 'SUSPENSION', ... },
  { ndc: '...', packageSize: { quantity: 100, unit: 'ML' }, dosageForm: 'SUSPENSION', ... },
  { ndc: '...', packageSize: { quantity: 200, unit: 'ML' }, dosageForm: 'SUSPENSION', ... },
];

const selection = selectLiquidPackages(liquidPackages, 168);
console.log(selection.selected.packageSize.quantity);  // 200 mL (closest match)
console.log(selection.overfillPercentage);             // 19% overfill
```

### Concentration Parser

Parse concentration strings from liquid medication data:

```typescript
import { parseConcentration } from '@ndc/domain-ndc';

// Parse standard concentration format
const result = parseConcentration("250 MG/5 ML");
console.log(result.concentration);
// {
//   value: 250,
//   unit: "MG",
//   perValue: 5,
//   perUnit: "ML",
//   ratio: 50,  // 50 mg/mL
//   rawString: "250 MG/5 ML"
// }

// Parse insulin concentration
const insulin = parseConcentration("U-100");
console.log(insulin.concentration);
// {
//   value: 100,
//   unit: "UNITS",
//   perValue: 1,
//   perUnit: "ML",
//   ratio: 100,  // 100 units/mL
//   rawString: "U-100"
// }

// Parse gram-based concentration (auto-converts to mg)
const grams = parseConcentration("1 G/5 ML");
console.log(grams.concentration);
// {
//   value: 1000,  // Converted to mg
//   unit: "MG",
//   perValue: 5,
//   perUnit: "ML",
//   ratio: 200,  // 200 mg/mL
//   rawString: "1 G/5 ML"
// }
```

#### Supported Concentration Formats

- **Standard**: `"250 MG/5 ML"`, `"100 MG/1 ML"`
- **Gram-based**: `"1 G/5 ML"`, `"0.5 G/10 ML"` (auto-converts to mg)
- **Insulin**: `"U-100"`, `"U-500"`, `"U-200"`
- **Spacing variations**: `"250MG/5ML"`, `"250 MG / 5 ML"`, `"250  MG  /  5  ML"`
- **Case variations**: `"250 mg/5 ml"`, `"250 Mg / 5 Ml"`

#### Concentration Helper Functions

```typescript
import {
  isConcentrationString,
  normalizeConcentrationUnits,
  calculateConcentrationRatio,
  detectConcentrationFormat,
} from '@ndc/domain-ndc';

// Check if string contains concentration pattern
isConcentrationString("250 MG/5 ML");  // true
isConcentrationString("U-100");        // true
isConcentrationString("TABLET");       // false

// Normalize units (convert grams to mg, liters to mL)
const normalized = normalizeConcentrationUnits({
  value: 1,
  unit: 'G',
  perValue: 5,
  perUnit: 'ML',
  rawString: '1 G/5 ML',
});
// Result: { value: 1000, unit: 'MG', perValue: 5, perUnit: 'ML' }

// Calculate concentration ratio
const withRatio = calculateConcentrationRatio({
  value: 250,
  unit: 'MG',
  perValue: 5,
  perUnit: 'ML',
  rawString: '250 MG/5 ML',
});
// Result: { ..., ratio: 50 }

// Detect concentration format
detectConcentrationFormat("250 MG/5 ML");  // "mg/ml"
detectConcentrationFormat("1 G/5 ML");     // "g/ml"
detectConcentrationFormat("U-100");        // "units/ml"
```

### Quantity Calculations

```typescript
import { computeTotalQuantity } from '@ndc/domain-ndc';

// Calculate tablets needed
const result = computeTotalQuantity(
  { dose: 2, frequency: 3, unit: 'tablet' },
  { strength: '500 MG' },
  7  // days supply
);
console.log(result.totalQuantity);  // 42 tablets
```

### Package Selection

```typescript
import { chooseBestPackage } from '@ndc/domain-ndc';

const packages = [
  { ndc: '12345-6789-01', packageSize: { quantity: 30, unit: 'TABLET' }, /* ... */ },
  { ndc: '12345-6789-02', packageSize: { quantity: 90, unit: 'TABLET' }, /* ... */ },
];

const selection = chooseBestPackage(packages, 42);
console.log(selection.selected.packageSize.quantity);  // 90 (closest match)
console.log(selection.overfillPercentage);             // Overfill %
```

### Unit Conversion

```typescript
import { convertUnit, normalizeUnit, areUnitsCompatible } from '@ndc/domain-ndc';

// Convert between compatible units
convertUnit(1000, 'ML', 'L');    // 1
convertUnit(1, 'GM', 'MG');      // 1000
convertUnit(30, 'TABLET', 'CAPSULE');  // 30

// Normalize unit strings
normalizeUnit('tablets');  // 'TABLET'
normalizeUnit('ml');       // 'ML'

// Check unit compatibility
areUnitsCompatible('ML', 'L');     // true
areUnitsCompatible('MG', 'TABLET'); // false
```

### Dosage Form Matching

```typescript
import { 
  normalizeDosageForm, 
  filterByDosageFormFamily,
  getDosageFormType,
  isLiquidDosageForm
} from '@ndc/domain-ndc';

// Normalize dosage forms to families
normalizeDosageForm('TABLET');     // 'solid'
normalizeDosageForm('SUSPENSION'); // 'liquid'
normalizeDosageForm('INJECTION');  // 'other'

// Get dosage form type (enum)
getDosageFormType('SUSPENSION');  // DosageFormType.LIQUID
getDosageFormType('TABLET');      // DosageFormType.SOLID
getDosageFormType('INJECTION');   // DosageFormType.INJECTABLE

// Check if liquid or injectable (requires mL calculations)
isLiquidDosageForm('SUSPENSION'); // true
isLiquidDosageForm('INJECTION');  // true
isLiquidDosageForm('TABLET');     // false

// Filter packages by dosage form family
const packages = [
  { dosageForm: 'TABLET', /* ... */ },
  { dosageForm: 'CAPSULE', /* ... */ },
  { dosageForm: 'SUSPENSION', /* ... */ },
];

const solidForms = filterByDosageFormFamily(packages, 'TABLET');
// Returns only TABLET and CAPSULE (same family: 'solid')
```

### NDC Validation

```typescript
import { validateNDCFormat, normalizeNDC } from '@ndc/domain-ndc';

// Validate NDC format
const validation = validateNDCFormat('12345-6789-01');
console.log(validation.isValid);        // true
console.log(validation.normalizedNdc);  // '12345-6789-01'

// Normalize NDC to standard format
normalizeNDC('123456789101');     // '12345-6789-01'
normalizeNDC('1234567890');       // '01234-5678-90' (padded)
```

## API Reference

### Types

- `Concentration`: Structured concentration data (value, unit, perValue, perUnit, ratio, rawString)
- `ConcentrationFormat`: `'mg/ml' | 'g/ml' | 'units/ml' | 'unknown'`
- `ConcentrationParseResult`: Result object with success status, concentration, format, and warnings
- `PackageCandidate`: Package information for selection
- `PackageSelection`: Selected package with overfill/underfill data
- `QuantityResult`: Total quantity with warnings and calculation details

### Functions

#### Liquid Medication Calculator
- `calculateLiquidQuantity(input: LiquidCalculationInput): LiquidCalculationResult`
- `convertMgToML(doseMg, concentration): number`
- `validateLiquidDose(doseMg, concentration, mLPerDose): string[]`
- `generateLiquidFormula(mLPerDose, frequency, daysSupply, totalML): string`
- `validateLiquidVolume(totalML): string[]`
- `isReasonableLiquidVolume(totalML): boolean`

#### Concentration Parser
- `parseConcentration(input: string): ConcentrationParseResult`
- `isConcentrationString(input: string): boolean`
- `normalizeConcentrationUnits(concentration): Concentration`
- `calculateConcentrationRatio(concentration): Concentration`
- `detectConcentrationFormat(input: string): ConcentrationFormat`

#### Quantity Calculations
- `computeTotalQuantity(sig, drugStrength, daysSupply): QuantityResult`

#### Package Selection
- `chooseBestPackage(packages, requiredQuantity): PackageSelection`
- `selectLiquidPackages(packages, requiredML): PackageSelection`
- `calculateFillPrecision(packageQuantity, requiredQuantity)`

#### Unit Conversion
- `convertUnit(quantity, fromUnit, toUnit): number`
- `normalizeUnit(unit): MedicationUnit`
- `areUnitsCompatible(fromUnit, toUnit): boolean`
- `getUnitCategory(unit): 'solid' | 'liquid' | 'weight' | 'special' | 'unknown'`
- `isReasonableQuantity(quantity, unit): boolean`

#### Dosage Form
- `normalizeDosageForm(form): DosageFormFamily`
- `getDosageFormType(dosageForm): DosageFormType`
- `isLiquidDosageForm(dosageForm): boolean`
- `areDosageFormsCompatible(form1, form2): boolean`
- `filterByDosageFormFamily(packages, targetForm)`

#### NDC Validation
- `validateNDCFormat(ndc): NDCValidationResult`
- `normalizeNDC(ndc): string`
- `parseNDCSegments(ndc): NDCSegments`
- `areNDCsEqual(ndc1, ndc2): boolean`

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test concentrationParser.test.ts

# Watch mode
pnpm test --watch
```

## Building

```bash
pnpm build
```

## License

MIT

