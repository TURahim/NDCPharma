# @ndc/domain-ndc

Pure business logic for NDC (National Drug Code) calculations, package matching, and medication quantity computations.

## Features

- **Quantity Calculations**: Compute total medication quantities with unit conversions
- **Package Selection**: Choose optimal NDC packages with minimal overfill/underfill
- **Unit Conversion**: Convert between medication units (tablets, capsules, mL, mg, etc.)
- **Dosage Form Matching**: Normalize and match dosage forms (solid, liquid, other)
- **NDC Validation**: Validate and normalize NDC codes to standard formats
- **Concentration Parsing**: Parse and compute concentration ratios for liquid medications
- **Smart Drug Ranking** (NEW): Intelligent search result ranking by relevance (active, generic, common strengths)
- **Dosage Form Grouping** (NEW): Group search results by dosage form for simplified UX
- **Search Filtering** (NEW): Filter drugs by active status, strength, form, badges, and more
- **Availability Detection** (NEW): Detect and communicate drug availability states with user-friendly messages

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

### Drug Search & Ranking (NEW - PR-12A)

Intelligent drug search with smart ranking, grouping, and filtering for optimal user experience:

#### Smart Ranking

Rank search results by relevance using multiple factors:

```typescript
import { 
  calculateRankingScore, 
  rankSearchResults,
  assignDrugBadges,
  getTopResults
} from '@ndc/domain-ndc';

// Calculate ranking score for a drug (0-100)
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

const score = calculateRankingScore(drug);  // ~95 (active + generic + common strength)

// Rank multiple results (highest score first)
const results: DrugSearchResult[] = [...];
const ranked = rankSearchResults(results);

// Get top N results
const top10 = getTopResults(results, 10);

// Assign badges to results
const badges = assignDrugBadges(drug);
// Returns: [
//   { type: 'ACTIVE', label: 'Active', variant: 'success' },
//   { type: 'COMMON', label: 'Common', variant: 'info' },
//   { type: 'GENERIC', label: 'Generic', variant: 'info' }
// ]
```

**Ranking Factors** (total 100 points):
- **Active NDCs** (50 points): Drugs with active FDA packages
- **Generic** (20 points): Generic (SCD) prioritized over brand (SBD)
- **Common Strength** (15 points): Standard strengths (10mg, 50mg, 500mg, etc.)
- **Common Form** (10 points): Tablets/capsules prioritized over patches/creams
- **Recency** (5 points): Recently updated FDA data

#### Dosage Form Grouping

Group search results by dosage form for simple search UX:

```typescript
import {
  groupByDosageForm,
  sortDosageFormGroups,
  limitResultsPerGroup,
  filterGroupsWithActiveResults,
} from '@ndc/domain-ndc';

// Group results by dosage form
const grouped = groupByDosageForm(results);
// Returns:
// {
//   dosageFormGroups: [
//     { dosageForm: 'Tablet', dosageFormFamily: 'SOLID', results: [...], expanded: true },
//     { dosageForm: 'Capsule', dosageFormFamily: 'SOLID', results: [...], expanded: true },
//     { dosageForm: 'Oral Suspension', dosageFormFamily: 'LIQUID', results: [...], expanded: true }
//   ],
//   totalResults: 15,
//   hasInactiveResults: false
// }

// Sort groups by commonality (SOLID → LIQUID → INJECTABLE → SPECIAL)
const sorted = sortDosageFormGroups(grouped.dosageFormGroups);

// Limit to top 3 results per group (for simple search view)
const limited = limitResultsPerGroup(grouped, 3);

// Filter to only show groups with active results
const activeOnly = filterGroupsWithActiveResults(grouped);
```

#### Search Filtering

Filter search results by various criteria:

```typescript
import {
  filterActiveOnly,
  separateActiveInactive,
  detectAvailabilityState,
  applyMultipleFilters,
  filterByStrength,
  filterByDosageForm,
  filterByBadgeType,
} from '@ndc/domain-ndc';

// Filter to only active drugs
const activeResults = filterActiveOnly(results);

// Separate active and inactive
const { active, inactive } = separateActiveInactive(results);

// Detect availability state for error messaging
const state = detectAvailabilityState(results, hasRxNormMatch);
// Returns: 'ACTIVE_FOUND' | 'ONLY_INACTIVE' | 'NO_FDA_NDCS' | 'NOT_FOUND'

// Apply multiple filters
const filtered = applyMultipleFilters(results, {
  activeOnly: true,
  strength: '500',
  dosageForm: 'TABLET',
  minNDCCount: 10,
  minUsageScore: 80,
  badgeType: 'COMMON',
});

// Individual filters
const tablets = filterByDosageForm(results, 'TABLET');
const highStrength = filterByStrength(results, '500');
const commonDrugs = filterByBadgeType(results, 'COMMON');
```

#### Availability States & Error Messaging

Get user-friendly messages for search states:

```typescript
import {
  getAvailabilityMessage,
  getSuggestedActions,
  checkWarningConditions,
} from '@ndc/domain-ndc';

// Get message for availability state
const message = getAvailabilityMessage('ONLY_INACTIVE');
// "This medication exists but has no active NDCs. It may be discontinued."

// Get suggested actions
const actions = getSuggestedActions('ONLY_INACTIVE');
// [
//   "View discontinued packages by toggling the 'Active Only' filter",
//   "Find active alternatives to this medication",
//   ...
// ]

// Check for warning conditions
const warnings = checkWarningConditions(results);
// Returns:
// {
//   allInactive: boolean,    // All results are inactive
//   lowAvailability: boolean, // <20% active
//   highInactive: boolean,    // >50% inactive
//   noResults: boolean        // No results found
// }
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
- **`DrugSearchResult`** (NEW): Drug search result with ranking, badges, and metadata
- **`DrugBadge`** (NEW): Badge for drug status (ACTIVE, COMMON, PEDIATRIC, GENERIC, BRAND)
- **`GroupedSearchResults`** (NEW): Search results grouped by dosage form
- **`DosageFormGroup`** (NEW): Group of drugs with the same dosage form
- **`SearchRankingFactors`** (NEW): Factors contributing to drug ranking score
- **`AvailabilityState`** (NEW): Drug availability states for error messaging

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

#### Drug Search & Ranking (NEW - PR-12A)
- `calculateRankingScore(drug): number` - Calculate 0-100 ranking score
- `rankSearchResults(results): DrugSearchResult[]` - Sort by score
- `assignDrugBadges(drug): DrugBadge[]` - Assign status badges
- `applyBadgesToResults(results): DrugSearchResult[]` - Apply badges to all
- `getTopResults(results, limit): DrugSearchResult[]` - Get top N results
- `groupByDosageForm(results): GroupedSearchResults` - Group by form
- `sortDosageFormGroups(groups): DosageFormGroup[]` - Sort groups
- `limitResultsPerGroup(grouped, maxPerGroup): GroupedSearchResults` - Limit per group
- `expandDosageFormGroup(grouped, dosageForm): GroupedSearchResults` - Expand group
- `collapseDosageFormGroup(grouped, dosageForm): GroupedSearchResults` - Collapse group
- `filterGroupsWithActiveResults(grouped): GroupedSearchResults` - Filter active groups
- `filterActiveOnly(results): DrugSearchResult[]` - Filter active drugs
- `separateActiveInactive(results): { active, inactive }` - Separate by status
- `detectAvailabilityState(results, hasRxNormMatch): AvailabilityState` - Detect state
- `getAvailabilityMessage(state): string` - Get user-friendly message
- `getSuggestedActions(state): string[]` - Get action suggestions
- `filterByStrength(results, strengthQuery): DrugSearchResult[]` - Filter by strength
- `filterByDosageForm(results, dosageFormQuery): DrugSearchResult[]` - Filter by form
- `filterByMinNDCCount(results, minCount): DrugSearchResult[]` - Filter by NDC count
- `filterByMinUsageScore(results, minScore): DrugSearchResult[]` - Filter by score
- `filterByBadgeType(results, badgeType): DrugSearchResult[]` - Filter by badge
- `applyMultipleFilters(results, filters): DrugSearchResult[]` - Apply multiple filters
- `countByAvailability(results): { active, inactive, total }` - Count by status
- `checkWarningConditions(results): WarningFlags` - Check warning conditions

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

