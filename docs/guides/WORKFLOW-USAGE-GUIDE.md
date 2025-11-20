# Workflow System Usage Guide

**Last Updated:** November 19, 2025  
**Version:** 1.0 (PR-01)

---

## Quick Start

### For Users

1. Navigate to `/dashboard`
2. Choose your workflow mode:
   - **Guided Workflow** - Step-by-step process (recommended)
   - **Quick Calculator** - Legacy single-step mode
3. Follow the on-screen instructions

### For Developers

Add the workflow to any page:

```typescript
import { PharmacistWorkflow } from '@/components/calculator/pharmacist-workflow';

export default function MyPage() {
  return <PharmacistWorkflow />;
}
```

Guided workflow steps:

1. Drug Search
2. Choose Package (browse + select in one view)
3. Enter SIG
4. Review Quantity
5. Confirmation

---

## Architecture Overview

```
PharmacistWorkflow
├── WorkflowProvider (Context + State)
│   ├── State Management (useReducer)
│   ├── Session Persistence
│   └── Validation Rules
├── WorkflowContent (UI Container)
│   ├── WorkflowStepper (Progress Indicator)
│   ├── Step Components (5 steps)
│   └── WorkflowNavigation (Back/Next buttons)
```

---

## Using the Workflow Context

### Basic Usage

```typescript
import { useWorkflow } from '@/lib/workflow-context';

function MyComponent() {
  const {
    state,           // Current workflow state
    canGoNext,       // Boolean: can proceed
    canGoPrevious,   // Boolean: can go back
    goNext,         // Function: advance
    goPrevious,     // Function: go back
    dispatch,       // Action dispatcher
  } = useWorkflow();
  
  return (
    <div>
      <p>Current step: {state.currentStep}</p>
      <button onClick={goNext} disabled={!canGoNext}>
        Next
      </button>
    </div>
  );
}
```

### Accessing Workflow Data

```typescript
const { state } = useWorkflow();

// Drug search data
const drugName = state.drugSearch?.drugName;
const rxcui = state.drugSearch?.rxcui;

// Available packages
const packages = state.availablePackages;

// Selected package
const selected = state.selectedPackage?.package;

// SIG data
const sig = state.sig;
const daysSupply = state.sig?.daysSupply;

// Quantity data
const totalQuantity = state.quantity?.totalQuantity;
const overfill = state.quantity?.overfillPercentage;
```

### Dispatching Actions

```typescript
const { dispatch } = useWorkflow();

// Set drug search results
dispatch({
  type: 'SET_DRUG_SEARCH',
  payload: {
    searchTerm: 'Lisinopril',
    rxcui: '314076',
    drugName: 'Lisinopril 10 MG Oral Tablet',
    timestamp: Date.now(),
  },
});

// Set available packages
dispatch({
  type: 'SET_AVAILABLE_PACKAGES',
  payload: packages, // NDCPackage[]
});

// Select a package
dispatch({
  type: 'SELECT_PACKAGE',
  payload: selectedPackage, // NDCPackage
});

// Set SIG
dispatch({
  type: 'SET_SIG',
  payload: {
    mode: 'structured',
    structured: {
      dose: 1,
      frequency: 2,
      unit: 'tablet',
    },
    daysSupply: 30,
  },
});

// Set quantity
dispatch({
  type: 'SET_QUANTITY',
  payload: {
    totalQuantity: 60,
    packagesNeeded: 2,
    overfillPercentage: 0,
    underfillPercentage: 0,
  },
});
```

---

## Creating a New Step Component

### Template

```typescript
"use client"

import React from 'react';
import { useWorkflow } from '@/lib/workflow-context';

export function MyNewStep() {
  const { state, dispatch, goNext } = useWorkflow();
  
  const handleSubmit = () => {
    // Update state
    dispatch({
      type: 'SET_SOMETHING',
      payload: data,
    });
    
    // Optionally auto-advance
    goNext();
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Step Title
        </h2>
        <p className="text-gray-600 mt-1">
          Step description
        </p>
      </div>
      
      {/* Your step content */}
      
    </div>
  );
}
```

### Integrate into Workflow

1. Create step component file
2. Import in `pharmacist-workflow.tsx`
3. Add case to `renderStep()`:

```typescript
case WorkflowStep.MY_NEW_STEP:
  return <MyNewStep />;
```

---

## Step Validation

### Adding Validation Rules

Edit `/frontend/lib/workflow-context.tsx`:

```typescript
const validationRules: StepValidationRules = {
  [WorkflowStep.MY_STEP]: (state) => {
    // Return true if step is valid
    return !!(state.myData && state.myData.isValid);
  },
};
```

### Validation Flow

1. User fills out step
2. Dispatch action updates state
3. Reducer checks validation rule
4. Sets `step.isValid` and `step.isComplete`
5. `canGoNext` returns validation result
6. Next button enables/disables

---

## Session Persistence

### Automatic Persistence

Session storage is automatic. State saves on every change and restores on mount.

### Manual Control

```typescript
const { saveToSession, loadFromSession } = useWorkflow();

// Force save
saveToSession();

// Force load
loadFromSession();
```

### Session Expiration

- **Timeout:** 1 hour
- **Key:** `ndc_workflow_state`
- **Storage:** sessionStorage (not localStorage)
- **On Expire:** Starts fresh workflow

---

## Navigation

### Programmatic Navigation

```typescript
const { goNext, goPrevious, goToStep } = useWorkflow();

// Advance one step
goNext();

// Go back one step
goPrevious();

// Jump to specific step
goToStep(WorkflowStep.CHOOSE_PACKAGE);
```

### Navigation Guards

- Cannot go next if current step is invalid
- Cannot go previous from step 1
- Can only jump to completed steps or next step

---

## Styling & Theming

### Step Content Container

```typescript
<div className="space-y-6">
  {/* Your content */}
</div>
```

### Common Patterns

**Section header:**
```typescript
<div>
  <h2 className="text-2xl font-bold text-gray-900">Title</h2>
  <p className="text-gray-600 mt-1">Description</p>
</div>
```

**Success message:**
```typescript
<div className="bg-green-50 border border-green-200 rounded-lg p-4">
  <p className="text-sm text-green-900">
    <span className="font-semibold">Success:</span> Message
  </p>
</div>
```

**Info box:**
```typescript
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <p className="text-sm text-blue-900">
    <span className="font-semibold">Tip:</span> Message
  </p>
</div>
```

**Warning:**
```typescript
<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
  <p className="text-sm text-yellow-900">
    <span className="font-semibold">Warning:</span> Message
  </p>
</div>
```

---

## Responsive Design

### Breakpoints

- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (sm to lg)
- **Desktop:** > 1024px (lg)

### Stepper Display

- **Desktop:** Full horizontal stepper
- **Mobile:** Compact progress bar

### Navigation Display

- **Desktop:** Inline navigation below content
- **Mobile:** Sticky footer navigation

---

## Testing

### Manual Testing

```typescript
// Check step validation
const { state, canGoNext } = useWorkflow();
console.log('Current step valid?', canGoNext);

// Check state
console.log('Workflow state:', state);

// Check session storage
const stored = sessionStorage.getItem('ndc_workflow_state');
console.log('Session data:', JSON.parse(stored));
```

### Unit Testing (Future)

```typescript
import { renderHook, act } from '@testing-library/react';
import { useWorkflow } from '@/lib/workflow-context';

test('advances to next step when valid', () => {
  const { result } = renderHook(() => useWorkflow());
  
  // Set valid data
  act(() => {
    result.current.dispatch({
      type: 'SET_DRUG_SEARCH',
      payload: validData,
    });
  });
  
  // Should be able to advance
  expect(result.current.canGoNext).toBe(true);
  
  // Advance
  act(() => {
    result.current.goNext();
  });
  
  // Check new step
  expect(result.current.state.currentStep).toBe(2);
});
```

---

## Troubleshooting

### State not persisting

**Problem:** State doesn't save to session  
**Solution:** Check browser allows sessionStorage

```typescript
if (typeof window !== 'undefined' && window.sessionStorage) {
  // Safe to use sessionStorage
}
```

### Can't advance to next step

**Problem:** Next button disabled  
**Solution:** Check step validation

```typescript
const { state } = useWorkflow();
const rules = validationRules[state.currentStep];
console.log('Step valid?', rules(state));
```

### State resets unexpectedly

**Problem:** State clears on page refresh  
**Solution:** Check session expiration (1 hour)

```typescript
const { state } = useWorkflow();
const age = Date.now() - state.lastUpdatedAt;
console.log('Session age (minutes):', age / 1000 / 60);
```

---

## Best Practices

### 1. Always Validate

Never allow progression without validation:

```typescript
<Button onClick={goNext} disabled={!canGoNext}>
  Next
</Button>
```

### 2. Provide Feedback

Show user what's happening:

```typescript
{state.drugSearch && (
  <div className="bg-green-50 ...">
    Found: {state.drugSearch.drugName}
  </div>
)}
```

### 3. Auto-Advance When Appropriate

For simple steps, auto-advance on completion:

```typescript
const handleSubmit = () => {
  dispatch({ type: 'SET_DATA', payload: data });
  goNext(); // Auto-advance
};
```

### 4. Clear Related State on Back Navigation

If user goes back, clear dependent state:

```typescript
// When going back from step 3 to step 2
// Clear selected package
dispatch({ type: 'DESELECT_PACKAGE' });
```

### 5. Use Loading States

Show spinners during async operations:

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSearch = async () => {
  setIsLoading(true);
  await searchAPI();
  setIsLoading(false);
};

<Button disabled={isLoading}>
  {isLoading ? 'Searching...' : 'Search'}
</Button>
```

---

## API Reference

### WorkflowContextValue

```typescript
interface WorkflowContextValue {
  // State
  state: WorkflowState;
  dispatch: React.Dispatch<WorkflowAction>;
  
  // Navigation
  canGoNext: boolean;
  canGoPrevious: boolean;
  goNext: () => void;
  goPrevious: () => void;
  goToStep: (step: WorkflowStep) => void;
  
  // Helpers
  completeCurrentStep: () => void;
  resetWorkflow: () => void;
  saveToSession: () => void;
  loadFromSession: () => void;
}
```

### WorkflowAction Types

- `NEXT_STEP` - Advance to next step
- `PREVIOUS_STEP` - Go back one step
- `GO_TO_STEP` - Jump to specific step
- `SET_DRUG_SEARCH` - Set drug search data
- `SET_AVAILABLE_PACKAGES` - Set package list
- `SELECT_PACKAGE` - Select a package
- `DESELECT_PACKAGE` - Clear selection
- `SET_SIG` - Set SIG data
- `SET_QUANTITY` - Set quantity data
- `COMPLETE_STEP` - Mark step complete
- `INVALIDATE_STEP` - Mark step invalid
- `RESET_WORKFLOW` - Clear all state
- `RESTORE_WORKFLOW` - Restore saved state

---

## Examples

### Example 1: Simple Step with Auto-Advance

```typescript
export function SimpleStep() {
  const { dispatch, goNext } = useWorkflow();
  const [value, setValue] = useState('');
  
  const handleSubmit = () => {
    dispatch({
      type: 'SET_MY_DATA',
      payload: { value },
    });
    goNext(); // Auto-advance
  };
  
  return (
    <div className="space-y-6">
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
      <Button onClick={handleSubmit} disabled={!value}>
        Continue
      </Button>
    </div>
  );
}
```

### Example 2: Step with Async Loading

```typescript
export function AsyncStep() {
  const { state, dispatch } = useWorkflow();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFetch = async () => {
    setIsLoading(true);
    try {
      const data = await fetchData(state.drugSearch?.rxcui);
      dispatch({
        type: 'SET_AVAILABLE_PACKAGES',
        payload: data,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    handleFetch();
  }, []);
  
  if (isLoading) return <LoadingSpinner />;
  
  return <div>Content</div>;
}
```

### Example 3: Conditional Rendering

```typescript
export function ConditionalStep() {
  const { state } = useWorkflow();
  
  if (!state.selectedPackage) {
    return (
      <div className="bg-yellow-50 ...">
        Please select a package first
      </div>
    );
  }
  
  return (
    <div>
      Selected: {state.selectedPackage.package.ndc}
    </div>
  );
}
```

---

## Next Steps

1. Implement PR-02: Drug Search & Package Retrieval
2. Implement PR-03: Package Table Display
3. Continue through PR-04 to PR-12

---

**Questions?** Refer to:
- `/docs/summaries/PR-01-MULTI-STEP-WORKFLOW-FOUNDATION.md`
- `/WORKFLOW_GAP_ANALYSIS.md`
- Inline code comments in workflow files

