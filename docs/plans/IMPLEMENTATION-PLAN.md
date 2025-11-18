# 🚀 Implementation Plan: Enhanced NDC Calculator UX

**Project**: Foundation Health NDC Calculator  
**Target Framework**: Next.js 16 + React (existing stack)  
**Timeline**: 8-12 development days  
**Approach**: Incremental, PR-sized changes

---

## Overview

This plan extends the existing calculator with 10 new features while maintaining backward compatibility and following the established design system (Tailwind + Shadcn/ui).

---

## Feature Breakdown & Tasks

### **Phase 1: Foundation & Core Search (Days 1-3)**

---

#### ✅ **Task 1.1: Create RxNorm Autocomplete API Client**

**Estimate**: 0.5 day  
**Files**:
- Create: `frontend/lib/rxnorm-client.ts`
- Update: `frontend/types/api.ts` (add RxNorm types)

**Implementation**:
```typescript
// frontend/lib/rxnorm-client.ts

export interface DrugSearchResult {
  rxcui: string;
  name: string;
  synonym?: string;
  termType?: string;
}

export async function searchDrugs(
  query: string,
  maxResults: number = 15
): Promise<DrugSearchResult[]> {
  // Call RxNorm approximateMatch API
  // Parse response and sort alphabetically
  // Return structured results
}
```

**Details**:
- Endpoint: `https://rxnav.nlm.nih.gov/REST/approximateTerm.json`
- Parameters: `term={query}&maxEntries={maxResults}`
- Sort results alphabetically by name
- Debounce: 300ms (implemented in component)
- Error handling: Return empty array on failure (graceful degradation)

**Testing**:
- Unit test: Mock fetch, verify parsing
- Manual test: Query "lisin", "metf", "amox"

---

#### ✅ **Task 1.2: Build Autocomplete Dropdown Component**

**Estimate**: 1 day  
**Files**:
- Create: `frontend/components/ui/drug-autocomplete.tsx`
- Create: `frontend/hooks/use-debounce.ts`

**Implementation**:
```typescript
// frontend/components/ui/drug-autocomplete.tsx

interface DrugAutocompleteProps {
  value: string;
  onChange: (value: string, rxcui?: string) => void;
  onSelect?: (result: DrugSearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DrugAutocomplete({ ... }) {
  // State: query, results, selected index, is open, is loading
  // Effect: Debounced search on query change (min 2 chars)
  // Keyboard: Arrow up/down, Enter, Escape
  // Click: Select item and close
  // Render: Input + floating dropdown (Radix Popover or custom)
}
```

**Features**:
- ✅ Minimum 2 characters to trigger search
- ✅ Show loading spinner during API call
- ✅ Highlight matching substring (optional, can be simple bold)
- ✅ Keyboard navigation (↑ ↓ Enter Esc)
- ✅ Click to select
- ✅ Empty state: "No results found"
- ✅ Error state: Silent fallback (no dropdown)

**Styling**:
- Match existing input style from hero.tsx
- Dropdown: White bg, border, shadow (consistent with result cards)
- Hover: Light blue bg
- Selected (keyboard): Darker blue bg

**Testing**:
- Unit test: Keyboard navigation logic
- Integration test: Search → select → verify callback
- Manual test: Type "lisinopril" progressively

---

#### ✅ **Task 1.3: Integrate Autocomplete into Hero Calculator**

**Estimate**: 0.5 day  
**Files**:
- Update: `frontend/components/hero.tsx`

**Changes**:
```typescript
// Replace existing drug input with DrugAutocomplete
<DrugAutocomplete
  value={drugInput}
  onChange={(value, rxcui) => {
    setDrugInput(value);
    if (rxcui) setSelectedRxcui(rxcui); // Store for faster lookup
  }}
  onSelect={(result) => {
    setDrugInput(result.name);
    setSelectedRxcui(result.rxcui);
  }}
  placeholder="Enter drug name or NDC"
  disabled={isLoading}
/>
```

**Testing**:
- E2E: Search → select → calculate → verify result
- Edge case: Manual NDC entry (11-digit) should still work

---

### **Phase 2: Recent Calculations & Persistence (Days 4-5)**

---

#### ✅ **Task 2.1: Create Calculation History Storage**

**Estimate**: 0.5 day  
**Files**:
- Create: `frontend/lib/calculation-storage.ts`
- Create: `frontend/types/calculation.ts`

**Implementation**:
```typescript
// frontend/types/calculation.ts

export interface StoredCalculation {
  id: string; // UUID
  timestamp: number;
  drug: { name: string; rxcui?: string };
  sig: string; // Free-text original
  daysSupply: number;
  result: {
    ndc: string;
    quantity: number;
    unit: string;
    fillPrecision: string;
  };
  userId?: string; // If authenticated
}

// frontend/lib/calculation-storage.ts

export class CalculationStorage {
  private static LOCAL_STORAGE_KEY = 'ndc_recent_calculations';
  private static MAX_LOCAL_ITEMS = 20;

  // Save calculation (local storage or Firestore)
  static async save(calculation: StoredCalculation): Promise<void>

  // Get recent calculations (user-specific if authenticated)
  static async getRecent(limit: number = 10): Promise<StoredCalculation[]>

  // Clear all
  static async clear(): Promise<void>
}
```

**Strategy**:
- **Authenticated users**: TODO comment for Firestore query to `calculationLogs`
- **Anonymous users**: localStorage with max 20 items
- **Hybrid**: Try localStorage first, fall back gracefully

**Testing**:
- Unit test: Save → retrieve → verify order (most recent first)
- Test: Max items limit enforcement

---

#### ✅ **Task 2.2: Build Recent Calculations Panel**

**Estimate**: 1 day  
**Files**:
- Create: `frontend/components/dashboard/recent-calculations.tsx`

**Implementation**:
```typescript
export function RecentCalculations({
  onSelect
}: {
  onSelect: (calc: StoredCalculation) => void;
}) {
  // State: calculations, loading
  // Effect: Load from storage on mount
  // Render: Table or card list

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Calculations</h3>
      
      {calculations.length === 0 ? (
        <p className="text-gray-500 text-sm">No recent calculations</p>
      ) : (
        <div className="space-y-2">
          {calculations.map((calc) => (
            <button
              key={calc.id}
              onClick={() => onSelect(calc)}
              className="w-full text-left p-3 rounded-lg border hover:border-blue-600 hover:bg-blue-50 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">{calc.drug.name}</div>
                  <div className="text-sm text-gray-600">{calc.sig} × {calc.daysSupply} days</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">
                    {calc.result.quantity} {calc.result.unit}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimeAgo(calc.timestamp)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                NDC: {calc.result.ndc}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Features**:
- ✅ Display: Drug name, SIG, days supply, quantity, NDC, timestamp
- ✅ Clickable rows reload calculator
- ✅ Hover state
- ✅ Empty state message
- ✅ Time formatting: "2 min ago", "3 hours ago", "Yesterday"

**Testing**:
- Manual: Complete calculation → verify appears in panel
- Manual: Click row → verify form populates

---

#### ✅ **Task 2.3: Integrate into Dashboard Layout**

**Estimate**: 0.5 day  
**Files**:
- Update: `frontend/app/dashboard/page.tsx`
- Update: `frontend/components/hero.tsx` (save calculation after success)

**Layout**:
```typescript
// dashboard/page.tsx

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">
      {/* Main calculator - 2 columns */}
      <div className="lg:col-span-2">
        <Calculator onCalculationComplete={saveCalculation} />
      </div>

      {/* Sidebar - 1 column */}
      <div className="space-y-6">
        <RecentCalculations onSelect={loadCalculation} />
        {/* Future: Frequent Meds, AI Insights go here */}
      </div>
    </div>
  );
}
```

**Save Hook**:
```typescript
// In hero.tsx after successful calculation:
const handleCalculate = async (e) => {
  // ... existing logic ...
  if (result.success && result.data) {
    await CalculationStorage.save({
      id: uuid(),
      timestamp: Date.now(),
      drug: { name: drugInput, rxcui: result.data.drug.rxcui },
      sig: sig,
      daysSupply: parseInt(daysSupply),
      result: {
        ndc: result.data.recommendedPackages[0].ndc,
        quantity: result.data.recommendedPackages[0].quantityNeeded,
        unit: result.data.recommendedPackages[0].unit,
        fillPrecision: result.data.recommendedPackages[0].fillPrecision
      }
    });
  }
}
```

---

### **Phase 3: Smart Features & Shortcuts (Days 6-7)**

---

#### ✅ **Task 3.1: Frequent Medications Panel**

**Estimate**: 0.5 day  
**Files**:
- Create: `frontend/components/dashboard/frequent-medications.tsx`

**Implementation**:
```typescript
export function FrequentMedications({
  onSelect
}: {
  onSelect: (drugName: string) => void;
}) {
  // State: Load recent calculations
  // Compute: Aggregate by drug name, sort by frequency, top 6

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Frequent Medications</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {frequentDrugs.map((drug) => (
          <button
            key={drug.name}
            onClick={() => onSelect(drug.name)}
            className="p-3 rounded-lg border hover:border-blue-600 hover:bg-blue-50 transition text-left"
          >
            <div className="font-medium text-sm text-gray-900 truncate">
              {drug.name}
            </div>
            <div className="text-xs text-gray-500">
              {drug.count}× used
            </div>
          </button>
        ))}
      </div>

      {/* TODO: Add pin/unpin feature */}
    </div>
  );
}
```

**Logic**:
- Aggregate last 50 calculations by drug name
- Count occurrences, sort desc
- Show top 6 (grid 2×3)
- Click → pre-fill calculator with drug name only

**Future Enhancement (TODO comment)**:
```typescript
// TODO: Add Firestore `pinnedMedications` collection
// Allow users to manually pin/unpin medications
// Priority: pinned > frequent
```

---

#### ✅ **Task 3.2: Status & Alert Indicators**

**Estimate**: 0.5 day  
**Files**:
- Create: `frontend/components/dashboard/status-indicators.tsx`

**Implementation**:
```typescript
export function StatusIndicators({
  result
}: {
  result: CalculateResponse | null;
}) {
  if (!result?.data) return null;

  const hasInactive = result.data.excluded?.some(
    (e) => e.reason.includes('inactive')
  );
  const hasOverfill = result.data.overfillPercentage > 5;
  const hasUnderfill = result.data.underfillPercentage > 5;

  return (
    <div className="space-y-2">
      {hasInactive && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span className="text-sm text-orange-900">
            Inactive NDCs detected
          </span>
        </div>
      )}

      {hasOverfill && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-900">
            Overfill: {result.data.overfillPercentage.toFixed(1)}%
          </span>
        </div>
      )}

      {hasUnderfill && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-900">
            Underfill: {result.data.underfillPercentage.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
```

**Placement**: Show above or below result card in calculator

---

#### ✅ **Task 3.3: AI Insights Card (Stub)**

**Estimate**: 0.5 day  
**Files**:
- Create: `frontend/components/dashboard/ai-insights.tsx`

**Implementation**:
```typescript
export function AIInsights({
  drug,
  calculation
}: {
  drug: { name: string; dosageForm?: string; strength?: string };
  calculation: { totalQuantity: number; daysSupply: number };
}) {
  // Phase 1: Rule-based insights
  const insight = generateRuleBasedInsight(drug, calculation);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            AI Insight
          </h4>
          <p className="text-sm text-gray-700">{insight}</p>
        </div>
      </div>

      {/* TODO: Integrate OpenAI API for richer insights */}
    </div>
  );
}

function generateRuleBasedInsight(drug, calculation): string {
  // Simple rules:
  // - "Typical dosing: X units per day for Y days"
  // - "Consider multi-pack if quantity > 100"
  // - "Verify insurance coverage for this NDC"
  
  const dailyDose = calculation.totalQuantity / calculation.daysSupply;
  
  if (calculation.totalQuantity > 100) {
    return "High quantity detected. Consider multi-pack options for better pricing.";
  }
  
  if (dailyDose > 4) {
    return "Frequent dosing schedule. Verify patient compliance and counseling needs.";
  }
  
  return `Typical dosing: ${dailyDose.toFixed(1)} ${drug.dosageForm || 'units'} per day for ${calculation.daysSupply} days.`;
}
```

**Future**: Replace with OpenAI API call (already available in backend)

---

### **Phase 4: Helper Features & Documentation (Day 8)**

---

#### ✅ **Task 4.1: Multi-Pack Helper Card**

**Estimate**: 0.5 day  
**Files**:
- Create: `frontend/components/dashboard/multipack-helper.tsx`

**Implementation**:
```typescript
export function MultiPackHelper({
  enabled,
  onToggle
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">Multi-Pack</h4>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <p className="text-sm text-gray-600 mb-2">
        Enable multi-pack calculations for high-volume prescriptions.
      </p>

      {enabled && (
        <div className="text-xs text-blue-600 mt-2">
          ℹ️ Multi-pack logic considers bulk package sizes for cost optimization.
        </div>
      )}

      {/* TODO: Wire to backend multi-pack calculation logic */}
    </div>
  );
}
```

**Integration**: Pass `multiPackEnabled` state to `calculateNDC()` API call

---

#### ✅ **Task 4.2: Help & Documentation Tooltip**

**Estimate**: 0.25 day  
**Files**:
- Create: `frontend/components/ui/help-popover.tsx`

**Implementation**:
```typescript
export function HelpPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
          <HelpCircle className="w-4 h-4" />
          How it works
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <h4 className="font-semibold">NDC Calculator</h4>
          
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Enter drug name or NDC code</li>
            <li>Specify dosing instructions (SIG)</li>
            <li>Set days' supply duration</li>
            <li>Get optimal NDC package matches</li>
          </ol>

          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Learn more:</p>
            <div className="flex flex-col gap-1">
              <a href="https://rxnav.nlm.nih.gov/" target="_blank" className="text-xs text-blue-600 hover:underline">
                RxNorm API Documentation →
              </a>
              <a href="https://open.fda.gov/apis/drug/ndc/" target="_blank" className="text-xs text-blue-600 hover:underline">
                FDA NDC Directory →
              </a>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Placement**: Near calculator header or in footer

---

### **Phase 5: Guided Mode (Days 9-10)**

---

#### ✅ **Task 5.1: Stepper UI Component**

**Estimate**: 1 day  
**Files**:
- Create: `frontend/components/dashboard/guided-mode.tsx`
- Create: `frontend/hooks/use-guided-mode.ts`

**Implementation**:
```typescript
// frontend/hooks/use-guided-mode.ts

export function useGuidedMode() {
  const [step, setStep] = useState(1);
  const [enabled, setEnabled] = useState(false);

  const steps = [
    { id: 1, title: 'Select Medication', description: 'Choose or search for a drug' },
    { id: 2, title: 'Enter SIG', description: 'Dosing instructions' },
    { id: 3, title: 'Days Supply', description: 'Treatment duration' },
    { id: 4, title: 'Review & Calculate', description: 'Confirm and submit' }
  ];

  return {
    enabled,
    setEnabled,
    step,
    nextStep: () => setStep(Math.min(step + 1, steps.length)),
    prevStep: () => setStep(Math.max(step - 1, 1)),
    goToStep: setStep,
    steps,
    isFirstStep: step === 1,
    isLastStep: step === steps.length,
  };
}

// frontend/components/dashboard/guided-mode.tsx

export function GuidedMode({
  value,
  onChange,
  onComplete
}: GuidedModeProps) {
  const guided = useGuidedMode();

  if (!guided.enabled) {
    return (
      <button
        onClick={() => guided.setEnabled(true)}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        <Lightbulb className="w-4 h-4 inline mr-1" />
        Enable Guided Mode
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Stepper header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Guided Calculation</h3>
            <button
              onClick={() => guided.setEnabled(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-between">
            {guided.steps.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  guided.step === s.id ? "bg-blue-600 text-white" :
                  guided.step > s.id ? "bg-green-600 text-white" :
                  "bg-gray-200 text-gray-600"
                )}>
                  {guided.step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </div>
                {idx < guided.steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-1 mx-2",
                    guided.step > s.id ? "bg-green-600" : "bg-gray-200"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-8">
          {guided.step === 1 && (
            <StepSelectMedication value={value.drug} onChange={...} />
          )}
          {guided.step === 2 && (
            <StepEnterSIG value={value.sig} onChange={...} />
          )}
          {guided.step === 3 && (
            <StepDaysSupply value={value.daysSupply} onChange={...} />
          )}
          {guided.step === 4 && (
            <StepReview value={value} onCalculate={onComplete} />
          )}
        </div>

        {/* Navigation */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={guided.prevStep}
            disabled={guided.isFirstStep}
            className="px-4 py-2 text-gray-700 disabled:opacity-50"
          >
            ← Previous
          </button>
          <button
            onClick={guided.isLastStep ? onComplete : guided.nextStep}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {guided.isLastStep ? 'Calculate' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Features**:
- ✅ Modal overlay with stepper UI
- ✅ 4 steps: Drug → SIG → Days → Review
- ✅ Progress indicator with checkmarks
- ✅ Validation per step before advancing
- ✅ Back/Next navigation
- ✅ Review screen shows all inputs
- ✅ Can exit anytime (saves draft to localStorage)

---

### **Phase 6: Polish & Integration (Days 11-12)**

---

#### ✅ **Task 6.1: Dashboard Layout Refinement**

**Estimate**: 0.5 day  
**Files**:
- Update: `frontend/app/dashboard/page.tsx`

**Final Layout**:
```typescript
export default function DashboardPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with help */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              NDC Calculator
            </h1>
            <p className="text-gray-600">
              Calculate optimal NDC packages for prescription fulfillment
            </p>
          </div>
          <HelpPopover />
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calculator - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <Calculator />
            <StatusIndicators result={result} />
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            <RecentCalculations onSelect={loadIntoCalculator} />
            <FrequentMedications onSelect={loadDrugName} />
            <AIInsights drug={currentDrug} calculation={currentCalc} />
            <MultiPackHelper enabled={multiPack} onToggle={setMultiPack} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Responsive**:
- Desktop: 2/3 calculator, 1/3 sidebar
- Tablet: Stack vertically
- Mobile: Single column, collapsible panels

---

#### ✅ **Task 6.2: Testing & Bug Fixes**

**Estimate**: 1 day

**Test Matrix**:

| Feature | Test Case | Expected Result |
|---------|-----------|-----------------|
| Autocomplete | Type "lisin" | Shows Lisinopril variants |
| Autocomplete | Press ↓ → Enter | Selects highlighted item |
| Autocomplete | Type gibberish | Shows "No results" |
| Recent Calcs | Complete calc | Appears at top of list |
| Recent Calcs | Click row | Populates form |
| Frequent Meds | Use "Lisinopril" 3x | Appears in frequent list |
| Status Indicators | Inactive NDC | Shows orange alert |
| Multi-pack | Toggle on | Persists for next calc |
| Guided Mode | Complete 4 steps | Submits calculation |
| Guided Mode | Exit mid-step | Draft saved to localStorage |

**Browser Testing**:
- Chrome, Firefox, Safari (desktop)
- Mobile Safari, Mobile Chrome

---

#### ✅ **Task 6.3: Documentation & Handoff**

**Estimate**: 0.5 day  
**Files**:
- Update: `frontend/README.md`
- Create: `FEATURES-GUIDE.md`

**Content**:
```markdown
# New Features Guide

## 1. Drug Autocomplete
- **Location**: Calculator drug input
- **Trigger**: Type 2+ characters
- **API**: RxNorm approximateMatch
- **Debounce**: 300ms
- **Max results**: 15

## 2. Recent Calculations
- **Location**: Dashboard sidebar
- **Storage**: localStorage (anonymous), Firestore (authenticated)
- **Max items**: 20
- **Click**: Reloads into calculator

## 3. Frequent Medications
- **Logic**: Aggregates last 50 calculations
- **Display**: Top 6 by frequency
- **Future**: Add pin/unpin functionality

## 4. Status Indicators
- Inactive NDCs (orange)
- Overfill >5% (blue)
- Underfill >5% (yellow)

## 5. AI Insights
- **Phase 1**: Rule-based tips
- **Future**: OpenAI API integration

## 6. Multi-Pack Helper
- **Toggle**: Enables bulk calculations
- **Backend**: TODO - wire to domain logic

## 7. Guided Mode
- 4-step wizard overlay
- Draft auto-save
- Validation per step

## Configuration

### Environment Variables
No new env vars required. Uses existing:
- `NEXT_PUBLIC_API_URL` - Backend API
- `NEXT_PUBLIC_FIREBASE_*` - Auth config

### Feature Flags
All features enabled by default.
To disable, set localStorage:
```js
localStorage.setItem('ndc_disable_autocomplete', 'true');
localStorage.setItem('ndc_disable_guided_mode', 'true');
```

## Performance

### Metrics
- Autocomplete: <200ms (RxNorm API)
- Recent calc load: <50ms (localStorage)
- Dashboard render: <100ms

### Caching
- Drug search results: 5 min (browser memory)
- Recent calculations: Persistent (localStorage)

## Troubleshohooting

### Autocomplete not working
- Check network tab for RxNorm API calls
- Verify CORS (should be public API)
- Min 2 characters required

### Recent calculations not persisting
- Check localStorage quota
- Verify browser privacy settings
- Try incognito (disabled localStorage)
```

---

## Summary: File Changes

### **New Files Created** (18 total)

```
frontend/
├── lib/
│   ├── rxnorm-client.ts                      # RxNorm autocomplete API
│   └── calculation-storage.ts                # Recent calc persistence
├── components/
│   ├── ui/
│   │   ├── drug-autocomplete.tsx             # Autocomplete component
│   │   └── help-popover.tsx                  # Help tooltip
│   └── dashboard/
│       ├── recent-calculations.tsx           # Recent calcs panel
│       ├── frequent-medications.tsx          # Frequent meds shortcuts
│       ├── status-indicators.tsx             # Alert badges
│       ├── ai-insights.tsx                   # AI tips card
│       ├── multipack-helper.tsx              # Multi-pack toggle
│       └── guided-mode.tsx                   # Wizard overlay
├── hooks/
│   ├── use-debounce.ts                       # Debounce hook
│   └── use-guided-mode.ts                    # Guided mode state
└── types/
    └── calculation.ts                        # StoredCalculation types

docs/
├── CODEBASE-ANALYSIS.md                      # ✅ Created
├── IMPLEMENTATION-PLAN.md                    # ✅ This document
└── FEATURES-GUIDE.md                         # User-facing docs
```

### **Modified Files** (5 total)

```
frontend/
├── app/
│   └── dashboard/page.tsx                    # Layout updates
├── components/
│   └── hero.tsx                              # Autocomplete integration
├── lib/
│   └── api-client.ts                         # (Optional) Multi-pack param
├── types/
│   └── api.ts                                # RxNorm types
└── README.md                                 # Updated instructions
```

---

## Environment Variables

**No new env vars required!** ✅

All features use existing configuration:
- `NEXT_PUBLIC_API_URL` - Backend API endpoint
- `NEXT_PUBLIC_FIREBASE_*` - Firebase auth config

RxNorm and FDA APIs are public and require no keys.

---

## Testing Strategy

### Unit Tests
- [ ] `rxnorm-client.ts` - Search parsing
- [ ] `calculation-storage.ts` - Save/retrieve/limit
- [ ] `use-debounce.ts` - Debounce timing
- [ ] `use-guided-mode.ts` - Step navigation

### Integration Tests
- [ ] Autocomplete → select → calculate flow
- [ ] Recent calc → click → populate → calculate
- [ ] Guided mode → complete all steps → calculate

### E2E Tests (Playwright/Cypress)
- [ ] Full user journey: Search → calculate → save → reload
- [ ] Anonymous user → recent calcs in localStorage
- [ ] Authenticated user → verify Firestore integration (future)

---

## Performance Considerations

### **Autocomplete Optimization**
- ✅ Debounce: 300ms (reduces API calls)
- ✅ Min chars: 2 (prevents excessive queries)
- ✅ Max results: 15 (fast rendering)
- ✅ Cache: 5 min in-memory (React state)

### **Local Storage Limits**
- Max 20 recent calculations (~5-10 KB)
- Graceful overflow: Remove oldest when limit reached
- Fallback: If quota exceeded, disable storage (silent)

### **Render Performance**
- Recent calculations: Virtualize if >50 items (future)
- Frequent meds: Always ≤6 items (no virtualization needed)
- Guided mode: Lazy load step components

---

## Tradeoffs & Decisions

### **1. Local Storage vs. Firestore**
**Decision**: Start with localStorage, migrate to Firestore later  
**Rationale**:
- Faster implementation (no backend changes)
- Works for anonymous users
- Easy migration path (already have Firestore auth)

### **2. Rule-based vs. AI Insights**
**Decision**: Start with rules, add AI later  
**Rationale**:
- OpenAI integration exists but feature-flagged OFF
- Rules provide immediate value (no API costs)
- Easy to swap implementation

### **3. Autocomplete: Client vs. Server**
**Decision**: Direct RxNorm API calls from frontend  
**Rationale**:
- RxNorm API is public (no auth needed)
- Reduces backend load
- Faster response (one fewer hop)
- Downside: No caching benefit (acceptable for typeahead)

### **4. Guided Mode: Modal vs. Inline**
**Decision**: Full-screen modal overlay  
**Rationale**:
- Clear focus (no distractions)
- Mobile-friendly (full viewport)
- Matches UX pattern of wizards

---

## Migration Path: Local Storage → Firestore

### Phase 2 Implementation (Future)

**Backend Changes**:
```typescript
// Add endpoint: POST /v1/calculations/recent
// Query calculationLogs by userId, order by timestamp desc, limit 20

// Add endpoint: POST /v1/calculations/frequent
// Aggregate calculationLogs by drug name, count occurrences
```

**Frontend Changes**:
```typescript
// In calculation-storage.ts:

static async save(calc: StoredCalculation) {
  if (isAuthenticated()) {
    await fetch('/v1/calculations/save', {
      method: 'POST',
      body: JSON.stringify(calc),
      headers: { Authorization: `Bearer ${idToken}` }
    });
  } else {
    // Fallback to localStorage
    saveToLocalStorage(calc);
  }
}

static async getRecent(limit: number) {
  if (isAuthenticated()) {
    const response = await fetch(`/v1/calculations/recent?limit=${limit}`);
    return response.json();
  } else {
    return getFromLocalStorage(limit);
  }
}
```

**Benefits**:
- Sync across devices
- Persistent beyond browser clear
- Admin analytics (what drugs are most queried)

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| RxNorm API downtime | High | Low | Graceful degradation (autocomplete disabled) |
| localStorage quota exceeded | Medium | Low | Max 20 items, silent fallback |
| Autocomplete performance | Medium | Medium | Debounce, min chars, max results |
| Guided mode UX confusion | Medium | Low | Clear copy, skip button, help text |
| Multi-pack not wired to backend | Low | High | TODO comment, UI toggle works |

---

## Success Metrics

### **Phase 1 Goals** (2-week sprint)

- [ ] Autocomplete: 80%+ queries use dropdown
- [ ] Recent calcs: 50%+ users click to reload
- [ ] Guided mode: 20%+ new users complete wizard
- [ ] Zero critical bugs in first week
- [ ] <100ms render time for dashboard

### **User Feedback** (Pilot testing)

- [ ] Pharmacists rate UX 4/5 or higher
- [ ] <5% report autocomplete issues
- [ ] Recent calcs considered "very useful"

---

## Next Steps

1. ✅ **Review this plan** with stakeholders
2. 🚀 **Kick off Phase 1** (Tasks 1.1-1.3)
3. ⚡ **Daily standups** to track progress
4. 🧪 **End of Phase 2**: QA testing
5. 📊 **Pilot launch**: Collect user feedback
6. 🔄 **Iterate**: Phase 2 (Firestore migration)

---

**Implementation Ready** ✅  
**Estimated Completion**: 10-12 development days  
**Risk Level**: Low-Medium (incremental, well-scoped)

Let's build! 🚀

