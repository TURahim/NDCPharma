# Free-Text SIG Functionality Explained

## Overview

The Free-Text SIG mode allows pharmacists to type prescription directions in natural language (e.g., "Take 1 tablet twice daily for 30 days") instead of filling out structured form fields. However, **the current implementation is incomplete**—it stores the text but does not automatically parse it into structured data that the calculation engine requires.

---

## How It Currently Works

### Frontend (User Interface)

1. **Mode Selection**: Users can toggle between "Structured" and "Free-Text" modes in the SIG Entry step.

2. **Text Input**: In Free-Text mode, users type prescription directions into a text area. Examples:

   - "Take 1 tablet by mouth twice daily with food for 30 days"
   - "Inject 10 units subcutaneously once daily"
   - "Inhale 2 puffs twice daily"

3. **Validation**: The system only checks that:

   - The text is at least 5 characters long
   - Days supply is provided (separate field)

4. **Storage**: The free-text is saved exactly as typed, stored in the workflow state as `sig.freetext`.

### What Happens Next

**Important Limitation**: The free-text is **NOT automatically parsed** into structured fields (dose, frequency, unit). The system stores the text, but:

- The quantity calculation functions (`computeQuantityFromSig`, `computeTotalQuantity`) **only work with structured SIG data**
- The backend `/api/v1/calculate` endpoint **expects structured SIG** (dose, frequency, unit)
- If a user enters free-text and proceeds, **quantity calculations will fail** because there's no dose/frequency/unit to compute with

---

## What It Extracts (Currently: Nothing)

The current Free-Text mode does **not extract** any fields automatically. It simply stores the raw text.

### What It Should Extract (But Doesn't Yet)

Ideally, a parser would extract:

- **Dose**: Numeric value (e.g., "1", "5", "10")
- **Unit**: Medication unit (e.g., "tablet", "mL", "puff", "unit")
- **Frequency**: Times per day (e.g., 1, 2, 3, 4)
- **Route**: Administration route (e.g., "by mouth", "subcutaneously")
- **Duration**: Days supply (if mentioned in text)
- **Special Instructions**: Food timing, PRN conditions, etc.

---

## Validation Rules

### Current Validation (Minimal)

1. **Text Length**: Must be at least 5 characters
2. **Days Supply**: Must be a positive number (entered separately)

### What's Missing

- No validation that the text contains dose information
- No validation that the text contains frequency information
- No validation that the text contains a unit
- No check for ambiguous or incomplete directions
- No warning if the text cannot be parsed

---

## How It Differs from Structured Mode

| Feature                   | Structured Mode                    | Free-Text Mode                    |
| ------------------------- | ---------------------------------- | --------------------------------- |
| **Input Method**          | Dropdowns and number fields        | Text area                         |
| **Data Format**           | Structured (dose, frequency, unit) | Raw text string                   |
| **Validation**            | Field-by-field validation          | Only length check                 |
| **Quantity Calculation**  | ✅ Works automatically             | ❌ Does not work (no parsing)     |
| **Backend Compatibility** | ✅ Fully compatible                | ❌ Not compatible (needs parsing) |
| **Templates**             | ✅ Can apply structured templates  | ✅ Can apply free-text templates  |
| **Recent SIGs**           | ✅ Saved and recalled              | ✅ Saved and recalled             |

---

## Special Cases & Edge Cases

### Currently Not Handled

1. **Liquid Medications**: Free-text like "Take 5 mL twice daily" is stored as-is but not converted to structured data for calculation.

2. **Inhalers**: Text like "Inhale 2 puffs twice daily" is not parsed to extract dose (2) and unit (puff).

3. **Insulin**: Text like "Inject 10 units once daily" is not parsed to extract dose (10) and unit (unit).

4. **Complex Directions**:

   - "Take 1-2 tablets every 4-6 hours as needed" → Not parsed
   - "Take with food" → Not parsed
   - "PRN for pain" → Not parsed

5. **Abbreviations**:

   - "BID", "TID", "QID" → Not recognized
   - "QD", "QHS" → Not recognized

6. **Range Doses**:

   - "Take 1-2 tablets" → Not parsed (would need to pick a value)

7. **Duration in Text**:
   - "for 30 days" mentioned in text → Not extracted (days supply is separate field)

---

## Current Limitations

### Critical Gaps

1. **No Parsing Logic**: The free-text is never converted to structured data, so calculations cannot run.

2. **No AI Integration**: There's no AI service (like OpenAI) called to parse free-text SIG into structured format.

3. **No Regex Parser**: While there's a simple regex-based parser in the old `enhanced-calculator.tsx` component, it's **not integrated** into the new workflow system.

4. **Backend Incompatibility**: The backend `/api/v1/calculate` endpoint expects:

   ```json
   {
     "sig": {
       "dose": 1,
       "frequency": 2,
       "unit": "tablet"
     }
   }
   ```

   But free-text mode only provides:

   ```json
   {
     "sig": {
       "freetext": "Take 1 tablet twice daily"
     }
   }
   ```

5. **No Error Handling**: If a user enters free-text and proceeds, they'll encounter errors in the Quantity Review step because there's no quantity to display.

---

## Examples

### Example 1: Simple Tablet Prescription

**User Input (Free-Text)**:

```
Take 1 tablet by mouth twice daily for 30 days
```

**What Gets Stored**:

```json
{
  "mode": "freetext",
  "freetext": "Take 1 tablet by mouth twice daily for 30 days",
  "daysSupply": 30
}
```

**What Should Be Extracted** (but isn't):

```json
{
  "dose": 1,
  "frequency": 2,
  "unit": "tablet",
  "route": "by mouth"
}
```

**Current Result**: ❌ Quantity calculation fails because no structured data exists.

---

### Example 2: Liquid Medication

**User Input (Free-Text)**:

```
Take 5 mL by mouth twice daily
```

**What Gets Stored**:

```json
{
  "mode": "freetext",
  "freetext": "Take 5 mL by mouth twice daily",
  "daysSupply": 30
}
```

**What Should Be Extracted** (but isn't):

```json
{
  "dose": 5,
  "frequency": 2,
  "unit": "mL",
  "route": "by mouth"
}
```

**Current Result**: ❌ No quantity calculation possible.

---

### Example 3: Inhaler

**User Input (Free-Text)**:

```
Inhale 2 puffs twice daily
```

**What Gets Stored**:

```json
{
  "mode": "freetext",
  "freetext": "Inhale 2 puffs twice daily",
  "daysSupply": 30
}
```

**What Should Be Extracted** (but isn't):

```json
{
  "dose": 2,
  "frequency": 2,
  "unit": "puff"
}
```

**Current Result**: ❌ No quantity calculation possible.

---

## What Exists But Isn't Used

### Old Parser (Not Integrated)

There's a simple regex-based parser in `frontend/components/calculator/enhanced-calculator.tsx`:

```typescript
const parseSig = (sigText: string) => {
  const lower = sigText.toLowerCase();

  // Extract dose (first number found)
  const doseMatch = lower.match(/(\d+\.?\d*)/);
  const dose = doseMatch ? parseFloat(doseMatch[1]) : 1;

  // Extract frequency (keyword matching)
  let frequency = 1;
  if (lower.includes("twice") || lower.includes("two times")) {
    frequency = 2;
  } else if (lower.includes("three times")) {
    frequency = 3;
  } else if (lower.includes("four times")) {
    frequency = 4;
  }
  // ... more frequency patterns

  // Extract unit (keyword matching)
  let unit = "tablet";
  if (lower.includes("capsule")) unit = "capsule";
  else if (lower.includes("ml")) unit = "mL";
  // ... more unit patterns

  return { dose, frequency, unit };
};
```

**Why It's Not Used**: This parser exists in the old "Quick Mode" calculator but is **not integrated** into the new multi-step workflow's SIG Entry step.

---

## Workflow State Type

The `SIGData` type includes a `parsed` field, suggesting parsing was planned:

```typescript
export interface SIGData {
  mode: "structured" | "freetext";
  structured?: {
    dose: number;
    frequency: number;
    unit: string;
  };
  freetext?: string;
  parsed?: {
    // ← This field exists but is never populated
    dose: number;
    frequency: number;
    unit: string;
    confidence?: number;
  };
  daysSupply: number;
}
```

**Current Status**: The `parsed` field is never set. The validation logic checks for it (`state.sig.freetext || state.sig.parsed`), but no code actually populates it.

---

## Errors Pharmacists Might Encounter

### Error 1: Quantity Review Step Shows Nothing

**Scenario**: User enters free-text SIG, proceeds to Quantity Review step.

**What Happens**: The Quantity Review step tries to calculate quantity using `computeQuantityFromSig()`, which requires structured SIG data. Since free-text isn't parsed, the function returns `null`, and the step shows no quantity information.

**User Experience**: Confusing—the step appears broken or incomplete.

---

### Error 2: Backend Calculation Fails

**Scenario**: If free-text SIG data somehow reaches the backend `/api/v1/calculate` endpoint.

**What Happens**: The backend expects `request.sig.dose`, `request.sig.frequency`, and `request.sig.unit`. These don't exist for free-text, causing a runtime error.

**User Experience**: 500 Internal Server Error.

---

### Error 3: No Warning When Switching Modes

**Scenario**: User enters free-text, then switches to Structured mode (or vice versa).

**What Happens**: The text is lost, and no warning is shown.

**User Experience**: Frustrating—work is lost without notice.

---

## Summary

### What Free-Text SIG Mode Does Today

✅ Allows users to type prescription directions in natural language
✅ **AI-powered parsing** using OpenAI GPT-4o-mini
✅ **Regex fallback parser** when AI is unavailable
✅ Extracts dose, frequency, unit, route, duration, PRN instructions
✅ **Automatic quantity calculation** based on parsed fields
✅ Confidence scoring and safety warnings
✅ Stores the text in workflow state
✅ Validates minimum length (5 characters)
✅ Saves to recent SIGs history
✅ Can use templates

### How It Works Now

1. **User enters free-text SIG** in the SIG Entry step
2. **System validates** text length and days supply
3. **AI parser activates** when user proceeds to Quantity Review
4. **OpenAI parses** the text into structured fields (dose, frequency, unit, etc.)
5. **Fallback to regex** if AI unavailable
6. **Safety checks applied** (high doses, unusual frequencies)
7. **Quantity calculated** automatically using parsed fields
8. **Warnings displayed** for pharmacist review
9. **Parsed result shown** in Quantity Review step for verification

### Current Capabilities

✅ Parse text into structured fields (dose, frequency, unit)
✅ Calculate quantity automatically
✅ Work with backend calculation endpoint
✅ Handle special cases (liquids, inhalers, insulin)
✅ Extract route, duration, and special instructions
✅ Recognize abbreviations (BID, TID, QID, QD, QHS, PRN)
✅ Handle range doses with warnings
✅ Detect PRN conditions
✅ Provide confidence scoring
✅ Apply safety guardrails

### The Bottom Line

**Free-Text SIG mode is now fully functional** with AI-powered parsing and automatic quantity calculation. The system intelligently converts natural language prescription directions into structured data, applies safety checks, and seamlessly integrates with the existing workflow.

For best results:

- **Use clear, complete directions** ("Take 1 tablet twice daily" is better than "1 tab BID")
- **Review the parsed result** in the Quantity Review step
- **Verify warnings** (especially for low confidence or unusual doses)
- **Use Structured Mode** if parsing confidence is consistently low

---

## Recommendations

1. **Short-term**: Disable Free-Text mode or show a clear warning that it's not yet functional for calculations.

2. **Medium-term**: Integrate the existing regex parser from `enhanced-calculator.tsx` into the workflow SIG Entry step.

3. **Long-term**: Implement AI-powered parsing (using OpenAI or similar) for robust free-text interpretation, with regex fallback for common patterns.
