# Multi-Pack Recommendations Feature Plan

## 📋 Overview

**Feature:** Automatic multi-pack recommendations based on quantity thresholds  
**Status:** 🔵 Planned  
**Priority:** Medium  
**Estimated Effort:** 3-5 days  
**Target Release:** Q1 2026

---

## 🎯 Goals

1. **Optimize packaging efficiency** - Recommend combinations that minimize waste
2. **Reduce dispensing errors** - Suggest most accurate package combinations
3. **Improve cost-effectiveness** - Consider bulk pricing when available
4. **Smart thresholds** - Auto-detect when multi-pack is beneficial
5. **Transparent UI** - Show users why multi-pack is recommended

---

## 📐 Architecture Design

### High-Level Flow

```
User Input (Drug, SIG, Days Supply)
           ↓
    Calculate Total Quantity
           ↓
    Check Multi-Pack Threshold
           ↓
    ┌──────────┴──────────┐
    ↓                     ↓
Quantity < Threshold   Quantity ≥ Threshold
    ↓                     ↓
Standard Calculation   Multi-Pack Algorithm
    ↓                     ↓
Single Package        Package Combinations
    ↓                     ↓
    └──────────┬──────────┘
           ↓
    Return Best Options
```

### Component Architecture

```
Backend (packages/domain-ndc)
├── multiPackCalculator.ts         (NEW)
├── packageCombinationEngine.ts    (NEW)
└── types/multiPack.ts             (NEW)

Frontend (frontend/components)
├── dashboard/
│   ├── multipack-helper.tsx       (UPDATE - connect to backend)
│   └── multipack-results.tsx      (NEW - show combinations)
└── calculator/
    └── enhanced-calculator.tsx    (UPDATE - wire toggle)

Database (Firestore)
└── multiPackThresholds             (NEW - configurable thresholds)
    ├── drugClass: string
    ├── minQuantity: number
    ├── enabled: boolean
    └── costSavingsThreshold: number
```

---

## 🔧 Technical Implementation

### Phase 1: Backend Algorithm (3 days)

#### 1.1 Define Types & Interfaces

**File:** `packages/domain-ndc/src/types/multiPack.ts`

```typescript
export interface MultiPackConfig {
  enabled: boolean;
  minQuantityThreshold: number;      // Default: 90 units
  maxCombinations: number;            // Default: 5
  preferFewerPackages: boolean;       // Default: true
  allowPartialFills: boolean;         // Default: false
  costSavingsRequired: number;        // Default: 0 (always suggest)
}

export interface PackageCombination {
  packages: Array<{
    ndc: string;
    ndc11: string;
    packageSize: number;
    packageType: string;
    quantity: number;              // How many of this package
    unitsProvided: number;         // packageSize × quantity
    labelerName?: string;
    cost?: number;                 // If available
  }>;
  totalPackages: number;           // Total number of packages
  totalUnits: number;              // Total units provided
  exactMatch: boolean;             // True if totalUnits === requiredQuantity
  overfillPercentage: number;
  underfillPercentage: number;
  fillPrecision: 'exact' | 'overfill' | 'underfill';
  score: number;                   // Algorithm score (higher = better)
  estimatedCost?: number;          // Total cost if available
  costSavings?: number;            // Compared to single-package option
  explanation: string;             // Why this combination is good
}

export interface MultiPackResult {
  recommended: PackageCombination;
  alternatives: PackageCombination[];
  singlePackageOption: PackageCombination;
  shouldUseMultiPack: boolean;
  reason: string;
}
```

#### 1.2 Multi-Pack Calculator Core

**File:** `packages/domain-ndc/src/multiPackCalculator.ts`

```typescript
import { NDCPackage } from './types';
import { MultiPackConfig, PackageCombination, MultiPackResult } from './types/multiPack';

export class MultiPackCalculator {
  constructor(private config: MultiPackConfig) {}

  /**
   * Main entry point: Calculate best package combination(s)
   */
  public calculate(
    availablePackages: NDCPackage[],
    requiredQuantity: number
  ): MultiPackResult {
    // Step 1: Check if multi-pack is beneficial
    if (!this.shouldUseMultiPack(requiredQuantity, availablePackages)) {
      const singlePackage = this.calculateSinglePackage(availablePackages, requiredQuantity);
      return {
        recommended: singlePackage,
        alternatives: [],
        singlePackageOption: singlePackage,
        shouldUseMultiPack: false,
        reason: 'Quantity too low or no multi-pack benefit detected',
      };
    }

    // Step 2: Generate all valid combinations
    const combinations = this.generateCombinations(availablePackages, requiredQuantity);

    // Step 3: Score and rank combinations
    const rankedCombinations = this.rankCombinations(combinations, requiredQuantity);

    // Step 4: Get single-package baseline for comparison
    const singlePackage = this.calculateSinglePackage(availablePackages, requiredQuantity);

    // Step 5: Determine if multi-pack is truly better
    const recommended = rankedCombinations[0];
    const shouldUseMultiPack = this.isMultiPackBetter(recommended, singlePackage);

    return {
      recommended: shouldUseMultiPack ? recommended : singlePackage,
      alternatives: shouldUseMultiPack ? rankedCombinations.slice(1, 4) : [],
      singlePackageOption: singlePackage,
      shouldUseMultiPack,
      reason: this.generateReason(recommended, singlePackage, shouldUseMultiPack),
    };
  }

  /**
   * Determine if quantity warrants multi-pack consideration
   */
  private shouldUseMultiPack(
    requiredQuantity: number,
    packages: NDCPackage[]
  ): boolean {
    // Threshold check
    if (requiredQuantity < this.config.minQuantityThreshold) {
      return false;
    }

    // Must have at least 2 different package sizes
    const uniqueSizes = new Set(packages.map(p => p.packageSize));
    if (uniqueSizes.size < 2) {
      return false;
    }

    return this.config.enabled;
  }

  /**
   * Generate all valid package combinations
   * Uses dynamic programming / knapsack-style approach
   */
  private generateCombinations(
    packages: NDCPackage[],
    targetQuantity: number
  ): PackageCombination[] {
    const combinations: PackageCombination[] = [];
    
    // Sort packages by size (largest first for efficiency)
    const sortedPackages = [...packages].sort((a, b) => b.packageSize - a.packageSize);

    // Strategy 1: Exact match combinations (preferred)
    this.findExactCombinations(sortedPackages, targetQuantity, combinations);

    // Strategy 2: Minimal overfill combinations
    this.findMinimalOverfillCombinations(sortedPackages, targetQuantity, combinations);

    // Strategy 3: Fewest packages combinations
    this.findFewestPackagesCombinations(sortedPackages, targetQuantity, combinations);

    return combinations;
  }

  /**
   * Find combinations that match exactly
   */
  private findExactCombinations(
    packages: NDCPackage[],
    target: number,
    results: PackageCombination[]
  ): void {
    // Use dynamic programming to find exact matches
    // Example: target=120, packages=[100, 50, 30, 10]
    // Solutions: [100+10+10], [50+50+10+10], [30+30+30+30], etc.
    
    const dp: Map<number, Array<{pkg: NDCPackage, count: number}[]>> = new Map();
    dp.set(0, [[]]);

    for (const pkg of packages) {
      const newEntries = new Map<number, Array<{pkg: NDCPackage, count: number}[]>>();
      
      for (const [sum, paths] of dp) {
        let multiplier = 1;
        while (sum + pkg.packageSize * multiplier <= target) {
          const newSum = sum + pkg.packageSize * multiplier;
          const newPath = [...paths[0], { pkg, count: multiplier }];
          
          if (!newEntries.has(newSum)) {
            newEntries.set(newSum, []);
          }
          newEntries.get(newSum)!.push(newPath);
          
          multiplier++;
        }
      }

      for (const [sum, paths] of newEntries) {
        if (!dp.has(sum)) {
          dp.set(sum, []);
        }
        dp.get(sum)!.push(...paths);
      }
    }

    // Extract exact matches
    if (dp.has(target)) {
      for (const path of dp.get(target)!) {
        results.push(this.pathToCombination(path, target, 0));
      }
    }
  }

  /**
   * Find combinations with minimal overfill (<10%)
   */
  private findMinimalOverfillCombinations(
    packages: NDCPackage[],
    target: number,
    results: PackageCombination[]
  ): void {
    const maxOverfill = target * 0.10; // 10% overfill tolerance
    
    // Greedy approach: Start with largest packages
    for (let i = 0; i < packages.length; i++) {
      const combo = this.greedyFill(packages.slice(i), target, target + maxOverfill);
      if (combo && combo.totalUnits <= target + maxOverfill) {
        results.push(combo);
      }
    }
  }

  /**
   * Find combinations with fewest total packages
   */
  private findFewestPackagesCombinations(
    packages: NDCPackage[],
    target: number,
    results: PackageCombination[]
  ): void {
    // Use largest packages first to minimize count
    const combo = this.greedyFill(packages, target, target * 1.05);
    if (combo) {
      results.push(combo);
    }
  }

  /**
   * Greedy algorithm to fill up to maxUnits
   */
  private greedyFill(
    packages: NDCPackage[],
    minUnits: number,
    maxUnits: number
  ): PackageCombination | null {
    const selected: Map<string, number> = new Map();
    let currentUnits = 0;

    for (const pkg of packages) {
      while (currentUnits < minUnits) {
        const key = pkg.ndc;
        selected.set(key, (selected.get(key) || 0) + 1);
        currentUnits += pkg.packageSize;

        if (currentUnits > maxUnits) {
          // Overfilled too much, backtrack
          selected.set(key, selected.get(key)! - 1);
          currentUnits -= pkg.packageSize;
          break;
        }
      }

      if (currentUnits >= minUnits) {
        break;
      }
    }

    if (currentUnits < minUnits) {
      return null; // Couldn't fill minimum
    }

    return this.createCombinationFromMap(packages, selected, minUnits, currentUnits);
  }

  /**
   * Score combinations (higher = better)
   */
  private rankCombinations(
    combinations: PackageCombination[],
    targetQuantity: number
  ): PackageCombination[] {
    for (const combo of combinations) {
      let score = 1000; // Base score

      // Exact match bonus
      if (combo.exactMatch) {
        score += 500;
      } else {
        // Penalize overfill/underfill
        score -= combo.overfillPercentage * 10;
        score -= combo.underfillPercentage * 20; // Underfill is worse
      }

      // Fewer packages bonus
      score += (10 - combo.totalPackages) * 20;

      // Cost savings bonus
      if (combo.costSavings && combo.costSavings > 0) {
        score += combo.costSavings * 5;
      }

      combo.score = Math.max(0, score);
    }

    return combinations.sort((a, b) => b.score - a.score);
  }

  /**
   * Compare multi-pack vs single-package
   */
  private isMultiPackBetter(
    multiPack: PackageCombination,
    singlePack: PackageCombination
  ): boolean {
    // Exact match multi-pack always better than overfill single
    if (multiPack.exactMatch && !singlePack.exactMatch) {
      return true;
    }

    // Lower overfill is better
    if (multiPack.overfillPercentage < singlePack.overfillPercentage - 2) {
      return true;
    }

    // Cost savings threshold
    if (this.config.costSavingsRequired > 0) {
      return (multiPack.costSavings || 0) >= this.config.costSavingsRequired;
    }

    // Default: only recommend if significantly better
    return multiPack.score > singlePack.score * 1.1;
  }

  /**
   * Generate human-readable explanation
   */
  private generateReason(
    recommended: PackageCombination,
    baseline: PackageCombination,
    useMultiPack: boolean
  ): string {
    if (!useMultiPack) {
      return 'Single package option is optimal for this quantity';
    }

    if (recommended.exactMatch) {
      return `Multi-pack provides exact match (${recommended.totalUnits} units) with ${recommended.totalPackages} packages`;
    }

    if (recommended.overfillPercentage < baseline.overfillPercentage) {
      const savings = baseline.overfillPercentage - recommended.overfillPercentage;
      return `Multi-pack reduces overfill by ${savings.toFixed(1)}% (${recommended.totalPackages} packages)`;
    }

    if (recommended.costSavings && recommended.costSavings > 0) {
      return `Multi-pack saves $${recommended.costSavings.toFixed(2)} compared to single package`;
    }

    return `Multi-pack optimizes packaging efficiency with ${recommended.totalPackages} packages`;
  }

  // Helper methods (pathToCombination, createCombinationFromMap, etc.)
  // ... implementation details
}
```

#### 1.3 Integration into Main Calculator

**File:** `packages/domain-ndc/src/calculator.ts` (UPDATE)

```typescript
import { MultiPackCalculator } from './multiPackCalculator';
import { MultiPackConfig } from './types/multiPack';

export interface CalculateOptions {
  multiPackEnabled?: boolean;
  multiPackConfig?: Partial<MultiPackConfig>;
}

export async function calculateNDC(
  drug: DrugInput,
  sig: SIG,
  daysSupply: number,
  options: CalculateOptions = {}
): Promise<CalculationResult> {
  // ... existing logic ...

  // After getting available packages
  const availablePackages = await fetchAvailablePackages(drug);
  const requiredQuantity = calculateRequiredQuantity(sig, daysSupply);

  // Multi-pack calculation (if enabled)
  if (options.multiPackEnabled) {
    const multiPackConfig: MultiPackConfig = {
      enabled: true,
      minQuantityThreshold: 90,
      maxCombinations: 5,
      preferFewerPackages: true,
      allowPartialFills: false,
      costSavingsRequired: 0,
      ...options.multiPackConfig,
    };

    const multiPackCalc = new MultiPackCalculator(multiPackConfig);
    const multiPackResult = multiPackCalc.calculate(availablePackages, requiredQuantity);

    if (multiPackResult.shouldUseMultiPack) {
      return {
        success: true,
        data: {
          drug: drugInfo,
          totalQuantity: requiredQuantity,
          recommendedPackages: [multiPackResult.recommended],
          alternatives: multiPackResult.alternatives,
          singlePackageOption: multiPackResult.singlePackageOption,
          multiPackInfo: {
            enabled: true,
            reason: multiPackResult.reason,
          },
          // ... other fields
        },
      };
    }
  }

  // Standard single-package calculation
  // ... existing logic ...
}
```

#### 1.4 Unit Tests

**File:** `packages/domain-ndc/tests/multiPackCalculator.test.ts`

```typescript
import { MultiPackCalculator } from '../src/multiPackCalculator';
import { MultiPackConfig } from '../src/types/multiPack';

describe('MultiPackCalculator', () => {
  describe('Exact Match Scenarios', () => {
    it('should find exact match with 2 packages', () => {
      const config: MultiPackConfig = {
        enabled: true,
        minQuantityThreshold: 90,
        maxCombinations: 5,
        preferFewerPackages: true,
        allowPartialFills: false,
        costSavingsRequired: 0,
      };

      const calculator = new MultiPackCalculator(config);
      const packages = [
        { ndc: '001', packageSize: 100, /* ... */ },
        { ndc: '002', packageSize: 20, /* ... */ },
      ];

      const result = calculator.calculate(packages, 120);

      expect(result.shouldUseMultiPack).toBe(true);
      expect(result.recommended.exactMatch).toBe(true);
      expect(result.recommended.totalUnits).toBe(120);
      expect(result.recommended.totalPackages).toBe(2); // 1×100 + 1×20
    });

    it('should find exact match with 3 packages', () => {
      // Test case: 90 units = 50 + 30 + 10
    });
  });

  describe('Minimal Overfill Scenarios', () => {
    it('should minimize overfill percentage', () => {
      // Test case: 95 units, packages [100, 50, 30, 10]
      // Multi-pack: 50+30+10+10 = 100 (5.3% overfill)
      // Single: 100 (5.3% overfill)
      // Should prefer fewest packages (single) if overfill equal
    });
  });

  describe('Threshold Checks', () => {
    it('should not use multi-pack below threshold', () => {
      // Test: 60 units with threshold=90
    });

    it('should use multi-pack above threshold if beneficial', () => {
      // Test: 120 units with threshold=90
    });
  });

  describe('Edge Cases', () => {
    it('should handle only one package size available', () => {
      // Should return single package
    });

    it('should handle impossible exact match', () => {
      // e.g., 95 units with only [100, 50] available
    });
  });
});
```

---

### Phase 2: Frontend Integration (1-2 days)

#### 2.1 Update API Types

**File:** `frontend/types/api.ts` (UPDATE)

```typescript
export interface CalculateRequest {
  drug: {
    name?: string;
    rxcui?: string;
  };
  sig: {
    dose: number;
    frequency: number;
    unit: string;
  };
  daysSupply: number;
  multiPackEnabled?: boolean;  // NEW
}

export interface MultiPackInfo {
  enabled: boolean;
  reason: string;
  combinations: Array<{
    packages: Array<{
      ndc: string;
      packageSize: number;
      quantity: number;
      unitsProvided: number;
    }>;
    totalPackages: number;
    totalUnits: number;
    overfillPercentage: number;
    explanation: string;
  }>;
}

export interface CalculateResponse {
  success: boolean;
  data?: {
    drug: DrugInfo;
    totalQuantity: number;
    recommendedPackages: PackageRecommendation[];
    alternatives?: PackageRecommendation[];
    singlePackageOption?: PackageRecommendation;
    multiPackInfo?: MultiPackInfo;  // NEW
    // ... existing fields
  };
  error?: APIError;
}
```

#### 2.2 Update API Client

**File:** `frontend/lib/api-client.ts` (UPDATE)

```typescript
export async function calculateNDC(
  request: CalculateRequest,
  idToken: string | null
): Promise<CalculateResponse> {
  // ... existing implementation ...
  // Request body now includes multiPackEnabled flag
}
```

#### 2.3 Update Multi-Pack Helper Component

**File:** `frontend/components/dashboard/multipack-helper.tsx` (UPDATE)

```typescript
"use client"

import { Package, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiPackInfo } from '@/types/api';

interface MultiPackHelperProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  result?: MultiPackInfo;  // NEW - show results
  className?: string;
}

export function MultiPackHelper({
  enabled,
  onToggle,
  result,
  className,
}: MultiPackHelperProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 p-4", className)}>
      {/* Toggle UI (existing) */}
      <div className="flex items-start justify-between mb-3">
        {/* ... existing toggle ... */}
      </div>

      {/* Explanation (existing) */}
      <p className="text-sm text-gray-600 mb-2 leading-relaxed">
        Enable multi-pack calculations for high-volume prescriptions to optimize packaging and pricing.
      </p>

      {/* NEW: Show results when available */}
      {enabled && result && (
        <div className="mt-4 space-y-3">
          {/* Recommendation reason */}
          <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Multi-Pack Recommendation
              </p>
              <p className="text-sm text-blue-700">{result.reason}</p>
            </div>
          </div>

          {/* Alternative combinations */}
          {result.combinations && result.combinations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Alternative Combinations
              </p>
              {result.combinations.map((combo, index) => (
                <div
                  key={index}
                  className="p-2 border border-gray-200 rounded-lg text-sm"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-900">
                      Option {index + 1}: {combo.totalPackages} packages
                    </span>
                    <span className="text-xs text-gray-500">
                      {combo.overfillPercentage.toFixed(1)}% overfill
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {combo.packages.map((pkg, i) => (
                      <span key={i}>
                        {pkg.quantity}× {pkg.packageSize} units
                        {i < combo.packages.length - 1 ? ' + ' : ''}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{combo.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info card when enabled but no results yet */}
      {enabled && !result && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Multi-pack mode will consider bulk package sizes and recommend combinations for optimal fill accuracy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 2.4 Update Enhanced Calculator

**File:** `frontend/components/calculator/enhanced-calculator.tsx` (UPDATE)

```typescript
// In handleCalculate function, pass multiPackEnabled flag:

const apiData = {
  drug: { name: drugInput, rxcui: selectedRxcui },
  sig: parsedSig,
  daysSupply: parseInt(daysSupply),
  multiPackEnabled: multiPackEnabled,  // Wire the toggle
};

const response = await calculateNDC(apiData, null);
setResult(response);

// Pass result to MultiPackHelper:
<MultiPackHelper
  enabled={multiPackEnabled}
  onToggle={setMultiPackEnabled}
  result={result?.data?.multiPackInfo}  // Pass results
/>
```

---

### Phase 3: Configuration & Admin UI (1 day)

#### 3.1 Firestore Schema

**File:** `firestore/schemas/multiPackThresholds.json` (NEW)

```json
{
  "name": "multiPackThresholds",
  "description": "Configuration for multi-pack calculation thresholds",
  "fields": {
    "drugClass": {
      "type": "string",
      "description": "Drug class or category (e.g., 'antibiotics', 'chronic_meds', 'default')"
    },
    "minQuantityThreshold": {
      "type": "number",
      "description": "Minimum quantity to trigger multi-pack consideration",
      "default": 90
    },
    "enabled": {
      "type": "boolean",
      "description": "Whether multi-pack is enabled for this drug class",
      "default": true
    },
    "maxCombinations": {
      "type": "number",
      "description": "Maximum number of alternative combinations to return",
      "default": 5
    },
    "preferFewerPackages": {
      "type": "boolean",
      "description": "Prefer combinations with fewer total packages",
      "default": true
    },
    "costSavingsThreshold": {
      "type": "number",
      "description": "Minimum cost savings ($) required to recommend multi-pack",
      "default": 0
    },
    "createdAt": {
      "type": "timestamp"
    },
    "updatedAt": {
      "type": "timestamp"
    }
  },
  "indexes": [
    {
      "fields": ["drugClass"],
      "unique": true
    }
  ]
}
```

#### 3.2 Admin Configuration UI (Optional)

**File:** `frontend/app/admin/multipack-settings/page.tsx` (NEW)

```typescript
// Admin page to configure thresholds
// Table showing drug classes and their settings
// Edit modal to update thresholds
// Real-time preview of affected calculations
```

---

## 📊 Example Scenarios

### Scenario 1: High Quantity - Perfect Multi-Pack

**Input:**
- Drug: Lisinopril 10mg
- SIG: Take 1 tablet daily
- Days Supply: 120 days
- Total Quantity: 120 tablets

**Available Packages:**
- 100-count bottle
- 30-count bottle
- 10-count bottle

**Recommendation:**
```
✅ Multi-Pack Recommended
Combination: 1× 100-count + 2× 10-count
Total: 2 packages, 120 tablets (exact match)
Reason: "Multi-pack provides exact match with minimal packages"
```

### Scenario 2: Moderate Quantity - Single Better

**Input:**
- Drug: Amoxicillin 500mg
- SIG: Take 1 capsule twice daily
- Days Supply: 10 days
- Total Quantity: 20 capsules

**Available Packages:**
- 30-count bottle
- 20-count bottle
- 10-count bottle

**Recommendation:**
```
⚠️ Single Package Recommended
Combination: 1× 20-count
Total: 1 package, 20 capsules (exact match)
Reason: "Quantity below threshold (20 < 90); single package optimal"
```

### Scenario 3: Cost Savings

**Input:**
- Drug: Metformin 500mg
- SIG: Take 1 tablet twice daily
- Days Supply: 90 days
- Total Quantity: 180 tablets

**Available Packages:**
- 500-count bottle ($80.00)
- 100-count bottle ($20.00)
- 30-count bottle ($8.00)

**Recommendation:**
```
💰 Multi-Pack Recommended (Cost Savings)
Combination: 1× 100-count + 3× 30-count
Total: 4 packages, 190 tablets (5.6% overfill)
Cost: $104.00

Alternative (Single):
1× 500-count = $80.00 (177% overfill)

Reason: "Multi-pack reduces waste significantly; extra cost worth the precision"
```

---

## 🧪 Testing Strategy

### Unit Tests (Backend)

```typescript
// Test exact matches
// Test minimal overfill
// Test threshold boundaries
// Test cost optimization
// Test edge cases (no valid combo, single package better, etc.)
```

### Integration Tests

```typescript
// Test /v1/calculate endpoint with multiPackEnabled flag
// Verify response includes multiPackInfo
// Test with various drug/quantity combinations
```

### E2E Tests (Frontend)

```typescript
// Toggle multi-pack ON
// Enter high-quantity prescription
// Submit calculation
// Verify multi-pack results display
// Click alternative combination
// Verify results update
```

### Manual Testing Checklist

- [ ] Low quantity (< threshold) shows single package
- [ ] High quantity (≥ threshold) shows multi-pack
- [ ] Toggle ON/OFF works correctly
- [ ] Alternative combinations display
- [ ] Explanations are clear and helpful
- [ ] Mobile responsive
- [ ] Loading states work
- [ ] Error handling (API failure, no valid combo)

---

## 📈 Success Metrics

### Quantitative
- **Adoption Rate:** % of calculations with multi-pack enabled
- **Recommendation Accuracy:** % of multi-pack recommendations accepted by users
- **Waste Reduction:** Average overfill % decrease
- **Cost Savings:** Average $ saved per multi-pack calculation

### Qualitative
- **User Feedback:** Survey scores on feature usefulness
- **Support Tickets:** Reduction in packaging-related questions
- **Clinical Outcomes:** Improved patient adherence (less leftover meds)

---

## 🚀 Deployment Plan

### Phase 1: Backend (Week 1)
- Day 1-3: Implement multi-pack algorithm
- Day 4: Write unit tests
- Day 5: Integration testing
- Deploy to staging

### Phase 2: Frontend (Week 2)
- Day 1-2: UI components and integration
- Day 3: Manual testing
- Day 4: Bug fixes
- Day 5: Deploy to staging

### Phase 3: Beta Testing (Week 3)
- Day 1-2: Internal testing with pharmacy team
- Day 3-4: Gather feedback and iterate
- Day 5: Final adjustments

### Phase 4: Production (Week 4)
- Day 1: Deploy to production (feature flag enabled for 10% of users)
- Day 2-3: Monitor metrics and errors
- Day 4-5: Gradual rollout to 50% → 100%

---

## 🔮 Future Enhancements

### Phase 2 (Q2 2026)
1. **Machine Learning Optimization**
   - Train model on historical data
   - Predict optimal combinations based on drug class
   - Personalized recommendations per pharmacy

2. **Real-Time Pricing Integration**
   - Connect to wholesale pricing APIs
   - Show actual cost savings
   - Insurance formulary optimization

3. **Inventory Awareness**
   - Check stock levels in real-time
   - Suggest only in-stock combinations
   - Auto-order low-stock packages

4. **Multi-Drug Optimization**
   - Optimize across multiple prescriptions
   - Batch ordering for same patient
   - Family pack recommendations

---

## 📚 Documentation

### For Developers
- Algorithm explanation with pseudocode
- API reference for multi-pack endpoints
- Configuration guide for thresholds
- Performance optimization tips

### For Users
- User guide with screenshots
- Video tutorial
- FAQ section
- Best practices

### For Admins
- Configuration dashboard guide
- Threshold tuning recommendations
- Monitoring dashboard
- Troubleshooting guide

---

## ✅ Definition of Done

- [ ] Backend algorithm implemented and tested
- [ ] Frontend UI integrated and functional
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Performance benchmarks met (<500ms calculation time)
- [ ] Accessibility audit passed
- [ ] Security review completed
- [ ] Deployed to staging
- [ ] Beta testing complete
- [ ] Production deployment successful
- [ ] Monitoring dashboards set up
- [ ] User training materials published

---

## 🎯 Summary

This feature will provide **intelligent, automatic multi-pack recommendations** that:

✅ **Optimize packaging** - Minimize waste and overfill  
✅ **Save costs** - Consider bulk pricing when beneficial  
✅ **Improve accuracy** - Find exact matches when possible  
✅ **Enhance UX** - Clear explanations and alternatives  
✅ **Scale intelligently** - Configurable thresholds per drug class  

**Total Effort:** 3-5 days (1 developer)  
**Expected Impact:** 15-20% reduction in packaging waste, 10-15% cost savings on high-volume prescriptions  

---

*Plan created: November 13, 2025*  
*Status: Ready for implementation*  
*Priority: Medium*  
*Target Release: Q1 2026*

