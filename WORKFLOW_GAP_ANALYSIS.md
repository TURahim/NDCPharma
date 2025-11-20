# NDC Calculator: Workflow Gap Analysis

**Organization:** Foundation Health  
**Document Date:** November 19, 2025  
**Analysis Scope:** Complete comparison of ideal pharmacist workflow vs. current implementation  
**Purpose:** Identify all gaps for system rebuild and alignment to product intent

---

## Executive Summary

This document provides a comprehensive analysis of the **gaps** between the **ideal pharmacist workflow** (product intent) and the **current implementation** in the NDC Calculator codebase. The analysis covers 6 major workflow phases and identifies 32 specific gaps across UX, functionality, data display, and workflow ordering.

**Critical Findings:**
- Current system combines all steps into single submission (form-submit-results)
- No interactive table for pharmacist to browse and select packages
- No package selection by user - system auto-selects using algorithm
- SIG entry happens before viewing available packages (backwards)
- Missing critical data fields in results (brand name, manufacturer, route, full NDC details)
- No multi-package support despite some backend logic existing

**Severity Summary:**
- **Critical Gaps:** 8
- **High Severity:** 12  
- **Medium Severity:** 9
- **Low Severity:** 3

---

## Section 1: Summary of Ideal Workflow

### Workflow Overview

The **ideal workflow** follows standard pharmacy dispensing practices where a pharmacist:

1. **Searches** for a medication (optionally with strength)
2. **Reviews** a complete table of available active FDA packages
3. **Selects** a specific package/NDC that matches the prescription
4. **Enters/Reviews** the SIG (prescription directions)
5. **Confirms** the calculated dispensing quantity
6. **Reviews** final summary before dispensing

### Step-by-Step Ideal Flow

#### **Step 1: Drug Search**
- **Input:** Drug name (e.g., "metformin") or drug + strength (e.g., "metformin 500 mg")
- **Action:** System normalizes drug name and retrieves ALL active FDA NDC packages
- **Rules:**
  - Only **active** NDCs shown by default
  - System handles drug name normalization (fuzzy matching, RxNorm)
  - If strength specified, filters to matching strengths
- **Output:** None yet - just prepares for next step

#### **Step 2: Package Table Display**
- **Display:** Comprehensive **table** showing ALL active packages for the searched drug
- **Table Columns:**
  - Brand Name
  - Generic Name
  - Strength (with units)
  - Package Size (quantity + unit)
  - NDC (full 11-digit format)
  - Dosage Form (tablet, capsule, solution, etc.)
  - Route (oral, IV, topical, etc.)
  - Manufacturer / Labeler
  - Marketing Status (Active - verified)
- **Features:**
  - Rows are **unique** (one row per unique NDC package)
  - Rows are **selectable** (radio button or clickable)
  - Sortable by any column
  - Filterable by dosage form, manufacturer, package size
- **User Action:** Pharmacist reviews options and identifies suitable packages

#### **Step 3: Package Selection**
- **Action:** Pharmacist **clicks/selects ONE row** in the table
- **Result:** Selection locks in:
  - Specific NDC
  - Specific product (strength, form, manufacturer)
  - Specific package size
- **UI Feedback:** Selected row highlighted, selection confirmed visually
- **Constraint:** Only ONE package selected at a time (MVP scope)

#### **Step 4: SIG Entry/Review**
- **Input:** Pharmacist enters or reviews prescription directions (SIG)
- **Options:**
  - **Manual Entry:** Free-text field (e.g., "Take 1 tablet twice daily for 30 days")
  - **Templates:** Common SIG templates for quick selection
- **Parsing:** System interprets SIG to extract:
  - Dose (e.g., 1 tablet)
  - Frequency (e.g., twice daily = 2)
  - Duration (e.g., 30 days)
- **Validation:** System validates SIG is complete and parseable

#### **Step 5: Quantity Calculation**
- **Calculation:** System computes recommended dispensing quantity based on:
  - Selected NDC's package size
  - Strength from selected product
  - Dosage form from selected product
  - SIG (dose × frequency × duration)
- **Examples:**
  - 1 tablet × 2 times/day × 30 days = 60 tablets
  - 5 mL × 2 times/day × 10 days = 100 mL → choose nearest bottle size
- **Display:** Shows calculated quantity with units
- **Warnings:** Alerts for overfill/underfill if package size doesn't match perfectly

#### **Step 6: Final Summary Review**
- **Display:** Complete summary card showing:
  - **Selected Drug/NDC:** Brand name, generic name, strength, form, NDC
  - **Selected Package:** Package size, manufacturer, marketing status
  - **SIG:** Cleaned/normalized prescription directions
  - **Quantity to Dispense:** Final calculated amount with units
  - **Warnings/Notes:** Any overfill, underfill, or safety alerts
- **Actions:**
  - **Confirm:** Proceed with dispensing
  - **Edit:** Go back to modify selection or SIG
  - **Cancel:** Abandon calculation

---

## Section 2: Summary of Current Implementation

### Workflow Overview

The **current implementation** is a **single-step form submission** model:

1. User fills out **one form** with: drug name/RxCUI + SIG (structured or free-text) + days supply
2. User clicks **"Calculate NDC"** button
3. System processes request in backend (all steps happen server-side)
4. System returns **one pre-selected package** with calculation results
5. User views results (no interaction, no selection)

### Step-by-Step Current Flow

#### **Step 1: Single Form Entry** (`CalculatorForm.tsx`)
- **Input Fields:**
  - **Drug Input:** Text field (accepts drug name OR RxCUI)
  - **SIG Mode Toggle:** Structured vs. Free-text
    - **Structured:** 3 fields (dose, frequency, unit)
    - **Free-text:** Single text field (note: "AI parsing is experimental")
  - **Days Supply:** Numeric field (1-365)
- **User Action:** User fills all fields, clicks "Calculate NDC"
- **Limitation:** User must enter SIG **before** seeing any package options

#### **Step 2: Backend Processing** (`apps/functions/src/api/v1/calculate.ts`)

##### **2a. Drug Normalization**
- If drug name provided: RxNorm API normalizes to RxCUI
- If RxCUI provided: Uses directly
- **Result:** RxCUI + drug name + optional (dosage form, strength from RxNorm)

##### **2b. FDA Package Retrieval**
- Fetches NDC packages from FDA by RxCUI
- Retrieves up to 100 packages
- **Method:** `fdaClient.getNDCsByRxCUI(rxcui, { limit: 100 })`
- **Result:** Array of `NDCPackage` objects

##### **2c. Active Package Filtering**
- Filters packages where `marketingStatus.isActive === true`
- Excludes discontinued/inactive NDCs
- Tracks excluded NDCs with reasons

##### **2d. Dosage Form Filtering**
- Uses `filterByDosageFormFamily()` to match SIG unit to package dosage forms
- Groups forms into families: solid (tablet, capsule), liquid (solution, suspension), other (patch, inhaler)
- If no match: includes all active packages with warning

##### **2e. Quantity Calculation** (`packages/domain-ndc/src/quantity.ts`)
- Calculates total quantity: `dose × frequency × daysSupply`
- Handles unit conversions (mg → tablets, mL volumes)
- Parses drug strength if available
- **Output:** `totalQuantity` with warnings for unit mismatches

##### **2f. Package Selection** (`packages/domain-ndc/src/packageMatch.ts`)
- **Algorithm:** `chooseBestPackage()` - automated, no user input
- **Strategy:**
  1. Try exact match (packageSize === totalQuantity)
  2. Try smallest package ≥ totalQuantity (minimal overfill)
  3. Fallback: largest available package (underfill with warning)
- **Result:** ONE selected package (no alternatives shown)
- **Calculates:** Overfill/underfill percentages

##### **2g. AI Enhancement** (Optional, if enabled)
- Calls OpenAI API with sanitized request
- Gets AI reasoning/confidence for recommendation
- **Important:** AI only **annotates**, does NOT override algorithm selection
- AI insights added to response

#### **Step 3: Results Display** (`CalculatorResults.tsx`)
- **Displays:**
  - ✅ Success banner
  - Drug information card (name, RxCUI, form, strength)
  - Total quantity card
  - **One recommended package card:**
    - NDC, package size, unit, dosage form, marketing status, active badge
  - Overfill/underfill badges
  - Warnings (if any)
  - **Accordions:**
    - Excluded NDCs (collapsed by default)
    - Step-by-step explanations (collapsed by default)
- **Limitations:**
  - Only ONE package shown
  - No table view
  - No selection interface
  - No way to see or choose alternative packages

#### **Step 4: Alternative Drugs** (Separate Feature)
- If drug not found in FDA, suggests alternatives via OpenAI
- Separate modal (`AlternativeDrugsModal.tsx`)
- Requires authentication
- Not part of main workflow

---

## Section 3: Detailed Gap Analysis

### **Gap Category 1: Workflow Structure**

#### **GAP 1.1: No Multi-Step Workflow**
- **Ideal:** 6-step progressive workflow (search → table → select → SIG → calculate → review)
- **Current:** Single-step form submission
- **Severity:** 🔴 **CRITICAL**
- **Impact:** 
  - Violates standard pharmacy workflow patterns
  - Forces premature SIG entry before viewing options
  - No opportunity to review available packages before committing
  - Can't adjust selection based on package availability
- **User Experience:** Confusing for pharmacists who expect to see options before entering prescription details

#### **GAP 1.2: SIG Entry Happens Too Early**
- **Ideal:** SIG entered AFTER selecting package (Step 4)
- **Current:** SIG entered BEFORE viewing any packages (Step 1)
- **Severity:** 🔴 **CRITICAL**
- **Impact:**
  - Pharmacist must guess appropriate dosing without seeing available strengths/forms
  - Can't optimize SIG based on available package sizes
  - If preferred package unavailable, must restart entire process
  - Backwards from clinical decision-making process
- **Real-World Scenario:** Pharmacist wants to prescribe "metformin" but needs to see if 500mg, 850mg, or 1000mg tablets are available to write appropriate SIG

#### **GAP 1.3: No Drug Search-Only Mode**
- **Ideal:** Step 1 is pure search (no SIG required)
- **Current:** Cannot search without providing SIG + days supply
- **Severity:** 🟡 **HIGH**
- **Impact:**
  - Can't explore availability before prescribing
  - Can't check if drug exists in FDA database without full prescription details
  - Prevents exploratory workflows ("What packages of lisinopril are available?")
- **Use Case:** Pharmacist wants to check if a drug is available in FDA database before proceeding

#### **GAP 1.4: No Package Selection by User**
- **Ideal:** Pharmacist selects package from table (Step 3)
- **Current:** System auto-selects package via algorithm
- **Severity:** 🔴 **CRITICAL**
- **Impact:**
  - Removes pharmacist clinical judgment from dispensing decision
  - Pharmacist has no control over which NDC is selected
  - Cannot choose preferred manufacturer or package size
  - Algorithm may select suboptimal package (e.g., more expensive, less familiar brand)
- **Safety Concern:** Pharmacist unable to apply clinical knowledge (e.g., patient allergies to specific excipients, insurance formulary preferences)

#### **GAP 1.5: No Progressive Disclosure**
- **Ideal:** Information revealed progressively (search → options → selection → calculation)
- **Current:** All inputs required upfront, all results shown at once
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - Cognitive overload for users
  - Difficult to understand flow of calculations
  - Can't make informed decisions at each step
- **UX Principle Violation:** Progressive disclosure reduces complexity and improves decision-making

---

### **Gap Category 2: Package Display & Table**

#### **GAP 2.1: No Package Table View**
- **Ideal:** Step 2 shows comprehensive table of all active packages
- **Current:** No table - only final selected package shown in results
- **Severity:** 🔴 **CRITICAL**
- **Impact:**
  - Pharmacist cannot see full range of options
  - Cannot compare packages side-by-side
  - No visibility into excluded packages (hidden in accordion)
  - Cannot make informed selection without seeing alternatives
- **Workflow Breakage:** Eliminates core decision-making step

#### **GAP 2.2: Missing Table Columns**
- **Ideal Columns:** Brand Name, Generic Name, Strength, Package Size, NDC, Dosage Form, Route, Manufacturer/Labeler, Marketing Status
- **Current Display (Results Card):**
  - ✅ NDC
  - ✅ Package Size
  - ✅ Unit
  - ✅ Dosage Form
  - ✅ Marketing Status
  - ✅ Active Badge
  - ❌ Brand Name (NOT shown)
  - ❌ Generic Name (shown in separate drug card, not per-package)
  - ❌ Strength (shown in separate drug card, not per-package)
  - ❌ Route (NOT shown)
  - ❌ Manufacturer/Labeler (NOT shown, but available in backend)
- **Severity:** 🟡 **HIGH**
- **Impact:**
  - Missing critical information for package identification
  - Pharmacist cannot distinguish between brands (e.g., generic vs. brand-name)
  - No route information (critical for drugs with multiple routes)
  - Cannot identify manufacturer (important for recalls, patient preferences, insurance)
- **Data Availability:** Backend has this data (`NDCPackage` type includes `brandName`, `genericName`, `labeler`, `route`) but frontend doesn't display it

#### **GAP 2.3: No Table Sorting/Filtering**
- **Ideal:** Table allows sorting by any column, filtering by dosage form, manufacturer, package size
- **Current:** N/A - no table exists
- **Severity:** 🟡 **HIGH**
- **Impact:**
  - Cannot organize packages by preference (e.g., smallest to largest)
  - Cannot filter to specific manufacturers or forms
  - Difficult to find optimal package in large result sets
- **Scenario:** Drug has 40+ packages - how does pharmacist find preferred 30-count bottle?

#### **GAP 2.4: No Row Selection UI**
- **Ideal:** Each table row is selectable (radio button or clickable row)
- **Current:** N/A - no table, no selection
- **Severity:** 🔴 **CRITICAL**
- **Impact:** User cannot interact with package options
- **Required Components:**
  - Radio button column (single selection)
  - Click handler for row selection
  - Visual feedback (highlighted row)
  - Selected state management

#### **GAP 2.5: No Unique Package Rows**
- **Ideal:** One row per unique NDC package
- **Current:** Results show only ONE package
- **Severity:** 🔴 **CRITICAL**
- **Impact:**
  - No visibility into multiple packages
  - Cannot distinguish between 30-count, 60-count, 90-count bottles
  - Backend retrieves up to 100 packages but only 1 shown
- **Data Loss:** System fetches complete data but presents only final selection

---

### **Gap Category 3: Data Completeness**

#### **GAP 3.1: Brand Name Not Displayed**
- **Ideal:** Brand name shown for each package in table
- **Current:** Brand name NOT displayed in results (but available in backend: `NDCPackage.brandName`)
- **Severity:** 🟡 **HIGH**
- **Impact:**
  - Cannot distinguish between generic and brand-name products
  - Patient may request specific brand (e.g., "Glucophage" vs. generic metformin)
  - Insurance may require specific brand
- **Fix Complexity:** Low - data exists, just needs display

#### **GAP 3.2: Manufacturer/Labeler Not Displayed**
- **Ideal:** Manufacturer shown in table (e.g., "Pfizer", "Teva Pharmaceuticals")
- **Current:** Labeler NOT displayed (but available: `NDCPackage.labeler`)
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - Cannot identify manufacturer for recalls or patient preferences
  - Some patients prefer/avoid specific manufacturers
  - Important for tracking drug shortages by manufacturer
- **Fix Complexity:** Low - data exists, just needs display

#### **GAP 3.3: Route Not Displayed**
- **Ideal:** Route shown for each package (oral, IV, topical, etc.)
- **Current:** Route NOT displayed (but available: `NDCPackage.route` - array of strings)
- **Severity:** 🟡 **HIGH**
- **Impact:**
  - Critical for drugs with multiple routes (e.g., fentanyl: patch, injection, lozenge)
  - Safety issue: wrong route could harm patient
  - Pharmacist needs route to verify prescription accuracy
- **Fix Complexity:** Low - data exists, just needs display

#### **GAP 3.4: Active Ingredients Not Displayed**
- **Ideal:** Active ingredients shown with strengths
- **Current:** Active ingredients NOT displayed (but available: `NDCPackage.activeIngredients[]`)
- **Severity:** 🟢 **LOW**
- **Impact:**
  - Useful for combination drugs (e.g., "Acetaminophen 325mg / Codeine 30mg")
  - Not critical for single-ingredient drugs
- **Fix Complexity:** Low - data exists, just needs display

#### **GAP 3.5: Strength Not Shown Per-Package**
- **Ideal:** Each package row shows its specific strength
- **Current:** Strength shown in separate "Drug Information" card (applies to all packages)
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - For drugs with multiple strengths (e.g., lisinopril 5mg, 10mg, 20mg), strength is ambiguous
  - Strength from RxNorm may not match FDA package strength
  - Pharmacist needs strength per-package to verify selection
- **Fix Complexity:** Medium - need to extract strength from `activeIngredients` array for each package

---

### **Gap Category 4: Search & Filtering**

#### **GAP 4.1: No Strength-Based Search**
- **Ideal:** User can search "metformin 500 mg" and system filters to 500mg packages
- **Current:** System accepts "metformin 500 mg" as search but doesn't filter results by strength
- **Severity:** 🟡 **HIGH**
- **Impact:**
  - User sees packages of all strengths (500mg, 850mg, 1000mg, etc.)
  - Must manually identify correct strength
  - Increases cognitive load and error risk
- **Current Behavior:** RxNorm normalization may extract strength, but FDA query doesn't filter by strength
- **Backend Gap:** `fdaClient.getNDCsByRxCUI()` doesn't accept strength parameter

#### **GAP 4.2: No Active/Inactive Toggle**
- **Ideal:** User can optionally view inactive NDCs (with warning)
- **Current:** Only active NDCs shown (hardcoded), inactive NDCs hidden in accordion
- **Severity:** 🟢 **LOW**
- **Impact:**
  - Good default behavior (active-only is safest)
  - But no flexibility for edge cases (e.g., checking if old NDC is still active)
- **Recommendation:** Keep active-only as default, add optional toggle for advanced users

#### **GAP 4.3: No Dosage Form Pre-Filter**
- **Ideal:** User can filter search by dosage form before viewing table (e.g., "Show only tablets")
- **Current:** Dosage form filtering happens automatically based on SIG unit (backend logic)
- **Severity:** 🟢 **LOW**
- **Impact:**
  - Automatic filtering is convenient
  - But no manual override if auto-filter is wrong
- **Current Logic:** `filterByDosageFormFamily()` groups tablet/capsule/etc. - works well

#### **GAP 4.4: No Package Size Range Filter**
- **Ideal:** User can filter to specific package sizes (e.g., "30-90 count bottles only")
- **Current:** All package sizes shown (no filter)
- **Severity:** 🟢 **LOW**
- **Impact:**
  - Minor convenience feature
  - Most useful for drugs with 20+ package sizes
- **Recommendation:** P2 (nice-to-have)

---

### **Gap Category 5: Quantity Calculation & SIG Handling**

#### **GAP 5.1: Free-Text SIG Not Fully Supported**
- **Ideal:** Free-text SIG like "Take 1 tablet twice daily for 30 days" is parsed and used for calculation
- **Current:** Free-text SIG accepted but **not actually parsed** - falls back to dummy values (`dose: 1, frequency: 1, unit: 'tablet'`)
- **Severity:** 🔴 **CRITICAL**
- **Impact:**
  - UI shows "AI parsing is experimental" warning
  - Free-text SIG produces incorrect calculations (always uses 1×1×daysSupply)
  - Users misled into thinking free-text works
- **Code Evidence:** 
```typescript
// calculator-form.tsx line 109
if (data.sigMode === 'freetext') {
  apiData.sig = { dose: 1, frequency: 1, unit: 'tablet', freeText: data.sigText };
}
```
- **Backend:** No SIG parsing implemented in backend (`calculate.ts` expects structured SIG only)

#### **GAP 5.2: No SIG Templates**
- **Ideal:** Pre-built SIG templates (e.g., "QD", "BID", "TID with meals")
- **Current:** No templates - user must enter manually
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - Slower workflow for common prescriptions
  - Inconsistent SIG formatting
  - Higher error risk from typos
- **Recommendation:** Add template library (P1)

#### **GAP 5.3: No SIG Validation/Parsing Feedback**
- **Ideal:** As user types SIG, system shows parsed interpretation (e.g., "Detected: 1 tablet, 2 times/day, 30 days")
- **Current:** No live feedback - user doesn't know if SIG will be understood
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - User unsure if SIG is correctly formatted
  - Errors only discovered after submission
  - Poor UX for free-text mode
- **Recommendation:** Add live SIG parser preview (P1)

#### **GAP 5.4: Quantity Calculation Happens Before Package Selection**
- **Ideal:** Quantity calculated AFTER package is selected (based on selected package's details)
- **Current:** Quantity calculated BEFORE package selection (independent of package)
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - Calculation may not align with selected package
  - Backend selects package to match calculated quantity (backwards logic)
  - If user could select package, quantity might need recalculation
- **Current Logic:** `computeTotalQuantity()` → `chooseBestPackage(totalQuantity)` (correct for current flow)
- **Ideal Logic:** User selects package → system calculates quantity for THAT package

#### **GAP 5.5: No Manual Quantity Override**
- **Ideal:** Pharmacist can override calculated quantity (e.g., patient requests half-fill)
- **Current:** Calculated quantity is final - no override
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - Cannot accommodate special patient requests
  - Cannot adjust for partial fills or trial prescriptions
  - Pharmacist clinical judgment overridden
- **Recommendation:** Add "Override Quantity" field (P1)

---

### **Gap Category 6: Multi-Package Support**

#### **GAP 6.1: No Multi-Package Dispensing**
- **Ideal:** System can recommend MULTIPLE packages to fulfill prescription (e.g., "2× 30-count + 1× 10-count = 70 tablets")
- **Current:** MVP explicitly limits to **single package only**
- **Severity:** 🟡 **HIGH**
- **Impact:**
  - Suboptimal dispensing (large overfill or underfill)
  - Wasteful (patient receives extra medication)
  - Costly (larger package may be more expensive)
- **Current Logic:** `chooseBestPackage()` returns ONE package
- **Code Comment:** 
```typescript
// packageMatch.ts line 28
// MVP approach: Single package only, minimal overfill
```
- **Recommendation:** Implement multi-package algorithm (P1)

#### **GAP 6.2: No Package Combination Logic**
- **Ideal:** If exact match not available, system suggests best combination (e.g., 60-count + 30-count = 90 tablets)
- **Current:** System selects smallest overfill package (may be 100-count for 90-tablet need)
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - 10% overfill when 0% was possible with combination
  - Pharmacist must manually figure out multi-package solutions
- **Recommendation:** Add combinatorial package selection (P1)

---

### **Gap Category 7: Results Display & Summary**

#### **GAP 7.1: No Alternative Packages Shown**
- **Ideal:** Results show selected package PLUS alternatives (e.g., "2nd best", "3rd best")
- **Current:** Only ONE package shown (the selected one)
- **Severity:** 🟡 **HIGH**
- **Impact:**
  - User cannot see other options without resubmitting
  - Cannot switch to alternative if first choice is out of stock
  - No comparison between options
- **Recommendation:** Show top 3 packages with overfill/underfill comparison (P1)

#### **GAP 7.2: Excluded NDCs Hidden by Default**
- **Ideal:** Excluded NDCs visible with clear reasons
- **Current:** Excluded NDCs in collapsed accordion (easy to miss)
- **Severity:** 🟢 **LOW**
- **Impact:**
  - Pharmacist may not realize packages were excluded
  - If preferred package was excluded, no visibility
- **Current Behavior:** Accordion shows excluded NDCs with reasons (good), but collapsed
- **Recommendation:** If many exclusions (>10), add alert badge to accordion

#### **GAP 7.3: No Final Confirmation Step**
- **Ideal:** Step 6 is dedicated confirmation screen with "Confirm" / "Edit" / "Cancel" actions
- **Current:** Results page is end of flow - no explicit confirmation
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - User may not realize calculation is final
  - No clear "next step" for pharmacist
  - Integration with pharmacy system unclear
- **Recommendation:** Add "Confirm Dispensing" button at bottom of results (P1)

#### **GAP 7.4: No Print/Export Functionality**
- **Ideal:** Pharmacist can print or export calculation results (PDF, label format)
- **Current:** No export - results only viewable on screen
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - Cannot create paper trail for records
  - Cannot print label for bottle
  - Must manually transcribe to pharmacy system
- **Recommendation:** Add "Print Label" and "Export to PDF" buttons (P1)

#### **GAP 7.5: Warnings Not Prominently Displayed**
- **Ideal:** Warnings shown at top of summary in bold/highlighted section
- **Current:** Warnings shown in yellow alert box (good) but below package details
- **Severity:** 🟢 **LOW**
- **Impact:**
  - Pharmacist may miss critical warnings
  - Good current implementation, but could be more prominent
- **Recommendation:** Add warning count badge to header (P2)

---

### **Gap Category 8: Backend Data Retrieval**

#### **GAP 8.1: FDA Query Doesn't Support Strength Filter**
- **Ideal:** FDA API query filters by strength (e.g., "lisinopril 10mg")
- **Current:** FDA query retrieves ALL strengths, filtering happens client-side (not implemented)
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - Over-fetching data (retrieve 100 packages, may only need 20 for specific strength)
  - Slower response times
  - More filtering needed client-side
- **Root Cause:** `fdaClient.getNDCsByRxCUI()` doesn't accept strength parameter
- **FDA API Limitation:** OpenFDA doesn't support strength-based search directly

#### **GAP 8.2: No Pagination for Large Result Sets**
- **Ideal:** If drug has >100 packages, system paginates or loads more
- **Current:** Hard limit of 100 packages (`limit: 100`)
- **Severity:** 🟢 **LOW**
- **Impact:**
  - Rare (most drugs have <100 active packages)
  - Edge case: popular generics with many manufacturers
- **Recommendation:** Add pagination if needed (P2)

#### **GAP 8.3: Package Data Not Deduplicated**
- **Ideal:** System deduplicates identical NDCs (if FDA returns duplicates)
- **Current:** No deduplication logic
- **Severity:** 🟢 **LOW**
- **Impact:**
  - If FDA has duplicate records, user may see duplicate rows
  - FDA data quality is generally good (unlikely scenario)
- **Recommendation:** Add deduplication by NDC (P2)

---

### **Gap Category 9: UI/UX Issues**

#### **GAP 9.1: No Guided Mode Integration**
- **Ideal:** Guided mode (wizard) leads user through 6-step workflow
- **Current:** Guided mode exists (`guided-mode.tsx`) but doesn't integrate with table workflow
- **Severity:** 🟡 **MEDIUM**
- **Impact:**
  - Guided mode collects data (drug, SIG, days supply) but then submits directly to backend
  - Doesn't pause to show package table
  - Misses opportunity to teach workflow
- **Current Guided Mode Steps:**
  1. Select Medication
  2. Enter SIG
  3. Specify Days Supply
  4. Review & Calculate (no table)
- **Recommendation:** Extend guided mode to include package selection step (P1)

#### **GAP 9.2: No Loading States for Table**
- **Ideal:** While fetching packages, show loading skeleton/spinner in table area
- **Current:** Generic "Calculating..." spinner on button
- **Severity:** 🟢 **LOW**
- **Impact:**
  - User doesn't know what's happening after search
  - No feedback during FDA API call (can take 1-2 seconds)
- **Recommendation:** Add skeleton table loader (P2)

#### **GAP 9.3: No Empty State for Zero Results**
- **Ideal:** If no packages found, show helpful message (e.g., "No active packages found. Try alternative drugs.")
- **Current:** Error message: "No active NDC packages available for this drug"
- **Severity:** 🟢 **LOW**
- **Impact:**
  - Functional but not helpful
  - Doesn't suggest next steps
- **Recommendation:** Add "Show Alternatives" button in empty state (P1)

---

### **Gap Category 10: Authentication & Permissions**

#### **GAP 10.1: No Pharmacist-Only Features**
- **Ideal:** Some features restricted to licensed pharmacists (e.g., multi-package selection, manual overrides)
- **Current:** All users have same access (role-based auth exists in backend but not used in frontend features)
- **Severity:** 🟢 **LOW**
- **Impact:**
  - No differentiation between pharmacist and technician workflows
  - Safety concern: technicians shouldn't make certain decisions
- **Recommendation:** Add role-based feature gating (P2)

---

## Section 4: Required Fixes

This section outlines the **high-level conceptual changes** needed to align the current implementation with the ideal workflow. No code is provided - this is a roadmap for rebuilding the system.

### **Priority 1 (P1): Critical Path to Ideal Workflow**

#### **Fix 1.1: Implement Multi-Step Workflow Architecture**
- **Goal:** Replace single-step form with 6-step progressive flow
- **Steps:**
  1. Create workflow state machine (track current step, data collected so far)
  2. Build Step 1: Search form (drug name only)
  3. Build Step 2: Package table component (render all packages)
  4. Build Step 3: Package selection component (radio buttons, click handlers)
  5. Build Step 4: SIG entry form (separate from search)
  6. Build Step 5: Quantity calculation display
  7. Build Step 6: Final confirmation summary
- **Components Needed:**
  - `WorkflowContainer.tsx` (orchestrates steps)
  - `SearchStep.tsx`
  - `PackageTableStep.tsx`
  - `PackageSelectionStep.tsx`
  - `SIGEntryStep.tsx`
  - `QuantityReviewStep.tsx`
  - `ConfirmationStep.tsx`
- **State Management:** Context API or Zustand for workflow state

#### **Fix 1.2: Build Package Table Component**
- **Goal:** Create comprehensive table showing all active packages
- **Requirements:**
  - Display all columns: Brand Name, Generic Name, Strength, Package Size, NDC, Dosage Form, Route, Manufacturer, Marketing Status
  - Sortable by any column
  - Filterable by dosage form, manufacturer
  - Row selection (single radio button)
  - Responsive design (mobile: card view, desktop: table view)
- **Data Source:** Use existing FDA client data (`NDCPackage[]`)
- **Libraries:** TanStack Table or shadcn/ui Data Table

#### **Fix 1.3: Add Package Selection Logic**
- **Goal:** Allow user to select ONE package from table
- **Requirements:**
  - Radio button in each row
  - Click handler for row selection
  - Visual feedback (highlight selected row)
  - Store selected package in workflow state
  - Validate selection before proceeding to next step
- **Edge Cases:**
  - No selection: disable "Next" button
  - Change selection: update state and highlight

#### **Fix 1.4: Refactor Backend to Support Search-Only**
- **Goal:** Create new API endpoint for drug search without calculation
- **New Endpoint:** `POST /v1/search`
  - **Input:** `{ drug: { name?: string; rxcui?: string }, filters?: { strength?: string, dosageForm?: string } }`
  - **Output:** `{ success: true, data: { drug: {...}, packages: NDCPackage[] } }`
- **Logic:**
  - Normalize drug to RxCUI (same as current)
  - Fetch FDA packages (same as current)
  - Filter active packages (same as current)
  - Optionally filter by strength
  - Return ALL packages (don't select one)
- **No Calculation:** No SIG, no quantity calculation, no package selection

#### **Fix 1.5: Refactor Backend to Support User-Selected Package**
- **Goal:** Modify `/v1/calculate` to accept `selectedNdc` parameter
- **New Input Schema:**
```typescript
{
  drug: { rxcui: string };
  selectedNdc: string;  // NEW: User-selected package NDC
  sig: { dose: number; frequency: number; unit: string };
  daysSupply: number;
}
```
- **Logic Changes:**
  - Remove automatic package selection (`chooseBestPackage()`)
  - Use user-provided `selectedNdc` instead
  - Validate that `selectedNdc` exists and is active
  - Calculate quantity for THAT specific package
  - Return calculation result
- **Backward Compatibility:** If `selectedNdc` not provided, fall back to auto-selection (for API stability)

### **Priority 2 (P2): Data Completeness & Display**

#### **Fix 2.1: Display All Required Package Data**
- **Goal:** Show Brand Name, Manufacturer, Route, Active Ingredients, Strength in table
- **Tasks:**
  - Update `PackageTableRow` component to display all fields
  - Extract strength from `activeIngredients[]` array
  - Format route array as comma-separated string
  - Handle missing data gracefully (show "N/A" or "-")
- **Complexity:** Low (data exists, just needs rendering)

#### **Fix 2.2: Implement SIG Parser for Free-Text Mode**
- **Goal:** Parse free-text SIG into structured dose/frequency/unit
- **Approach 1 (Regex):** Pattern matching for common formats
  - "Take 1 tablet twice daily" → `{ dose: 1, unit: 'tablet', frequency: 2 }`
  - "5 mL three times daily" → `{ dose: 5, unit: 'mL', frequency: 3 }`
- **Approach 2 (AI):** Use OpenAI API for parsing (already integrated)
  - Send SIG text to GPT-4
  - Ask for JSON response: `{ dose, frequency, unit, daysSupply }`
  - Validate and use in calculation
- **Fallback:** If parsing fails, show error and ask for structured input
- **Implementation Location:** Create `packages/utils/src/sigParser.ts`

#### **Fix 2.3: Add Strength-Based Filtering**
- **Goal:** Filter packages by strength when user searches "drug + strength"
- **Tasks:**
  1. Parse strength from search query (e.g., "metformin 500 mg" → `{ name: 'metformin', strength: '500 mg' }`)
  2. Pass strength to backend as filter
  3. Backend filters packages where `activeIngredients[0].strength` matches
  4. Return filtered packages
- **Complexity:** Medium (requires parsing logic + backend filtering)

### **Priority 3 (P3): Advanced Features**

#### **Fix 3.1: Multi-Package Dispensing**
- **Goal:** Recommend optimal COMBINATION of packages to fulfill prescription
- **Algorithm:**
  1. Generate all possible package combinations (up to 3 packages)
  2. For each combination, calculate total quantity and cost
  3. Filter combinations where totalQuantity >= requiredQuantity
  4. Rank by: exact match > minimal overfill > minimal cost
  5. Return top 3 combinations
- **Example:** 
  - Need: 70 tablets
  - Option 1: 2× 30-count + 1× 10-count = 70 (exact match)
  - Option 2: 1× 90-count = 90 (22% overfill)
- **Complexity:** High (combinatorial algorithm, cost data integration)
- **Recommendation:** P1 for backend logic, P3 for frontend UI

#### **Fix 3.2: SIG Templates Library**
- **Goal:** Pre-built SIG templates for common prescriptions
- **Templates:**
  - "Once Daily (QD)" → `{ dose: 1, frequency: 1, unit: 'tablet' }`
  - "Twice Daily (BID)" → `{ dose: 1, frequency: 2, unit: 'tablet' }`
  - "Three Times Daily (TID)" → `{ dose: 1, frequency: 3, unit: 'tablet' }`
  - "Every 8 Hours" → `{ dose: 1, frequency: 3, unit: 'tablet' }`
  - "With Meals" → `{ dose: 1, frequency: 3, unit: 'tablet', notes: 'with meals' }`
- **UI:** Dropdown or quick-select buttons in SIG entry step
- **Complexity:** Low (just UI + data structure)

#### **Fix 3.3: Print/Export Functionality**
- **Goal:** Generate PDF or printable label with calculation results
- **Options:**
  - **PDF Export:** Use jsPDF or Puppeteer to generate PDF
  - **Print Label:** Format data for pharmacy label printer (4×6 format)
  - **Copy to Clipboard:** Copy NDC + quantity as text
- **Data Included:**
  - Patient info (if captured)
  - Drug name, strength, form
  - NDC, package size
  - Quantity to dispense
  - SIG
  - Date, pharmacist name
- **Complexity:** Medium (requires PDF library or print styling)

---

## Section 5: Open Questions for PM

### **Product Strategy**

**Q1:** Should the multi-step workflow be **mandatory** or should users have an option to use the current "quick calculate" mode?
- **Context:** Some users may prefer fast one-step submission for simple prescriptions
- **Recommendation:** Offer both modes (beginner/guided vs. expert/quick)

**Q2:** What is the **priority order** for multi-package support?
- **Context:** Multi-package dispensing requires complex algorithm and UI
- **Options:**
  - P1 (before launch): Essential for accurate dispensing
  - P2 (post-launch): Launch with single-package MVP, add later
- **Impact:** Affects launch timeline and scope

**Q3:** Should pharmacists be able to **manually override** the system's package selection?
- **Context:** Current system auto-selects package; ideal workflow allows manual selection
- **Safety Consideration:** Manual selection gives pharmacist control but increases error risk
- **Recommendation:** Yes, but require clinical justification for overrides (compliance)

**Q4:** What is the expected **max number of packages** to display in the table?
- **Context:** Some drugs have 100+ active packages
- **Options:**
  - Show all (could be slow, overwhelming)
  - Paginate (10-20 per page)
  - Smart filtering (only show "relevant" packages)
- **Recommendation:** Paginate with 20 per page, add "Show All" option

**Q5:** Should the system support **inactive NDC lookups** for historical records?
- **Context:** Pharmacists sometimes need to verify old NDCs for recalls or transfers
- **Recommendation:** Add "Include Inactive" checkbox (advanced users only)

### **UX & Workflow**

**Q6:** In Step 2 (package table), should **all packages be visible** or should system **pre-filter** to most relevant?
- **Context:** Ideal workflow says "ALL active packages" but that could be overwhelming
- **Options:**
  - Show all packages (true to ideal workflow)
  - Show top 10-20 "recommended" packages with "Show All" button
- **Recommendation:** Show top 20 by package size (ascending), then "Show All" expands

**Q7:** Should the SIG entry step (Step 4) **remember previous SIGs** for the same drug?
- **Context:** Pharmacist may dispense same drug+strength multiple times per day
- **Feature:** Auto-populate SIG from last calculation for this drug
- **Recommendation:** Yes, with "Use Previous SIG" quick-fill button

**Q8:** What should happen if a user selects a package in Step 3, then goes back to Step 2 and changes their search?
- **Options:**
  - Clear selection and show new packages
  - Keep selection if package still exists in new results
  - Warn user that selection will be lost
- **Recommendation:** Clear selection and show warning toast

**Q9:** Should the final confirmation step (Step 6) require an **explicit "Confirm" action** or auto-proceed to next prescription?
- **Context:** Workflow ends at confirmation - what happens next?
- **Options:**
  - "Confirm & Dispense" button → integrates with pharmacy system
  - "Confirm & New Calculation" button → starts over
  - Both buttons (let user choose)
- **Recommendation:** Both buttons, default to "New Calculation"

### **Technical & Data**

**Q10:** What is the **source of truth** for package data: FDA API (real-time) or cached Firestore?
- **Context:** FDA API can be slow (1-2 seconds); caching improves performance
- **Current Implementation:** Uses cache when available (PR-07)
- **Question:** Should table data ALWAYS be fresh from FDA or can it be 1-hour stale?
- **Recommendation:** Use cache for table display (fast), add "Refresh" button for real-time

**Q11:** How should the system handle **FDA API failures** during Step 1 (search)?
- **Options:**
  - Show error message, block progression
  - Fall back to cached data (if available)
  - Offer "Retry" button
- **Recommendation:** Try FDA first, fall back to cache, show age of cached data

**Q12:** Should the package table include **pricing information**?
- **Context:** Backend doesn't currently have pricing data
- **Integration:** Would require third-party API (e.g., GoodRx, FirstDataBank)
- **Value:** Helps pharmacist choose cost-effective option for patient
- **Recommendation:** P2 feature (requires new API integration)

**Q13:** What should happen if a user-selected package becomes **inactive between selection and dispensing**?
- **Context:** FDA data can change (rare but possible)
- **Options:**
  - Validate package status before final confirmation
  - Show warning: "Selected package is no longer active"
  - Force re-selection
- **Recommendation:** Validate on confirmation step, warn and block if inactive

### **Compliance & Safety**

**Q14:** Does the system need to **log package selection decisions** for audit trails?
- **Context:** Current implementation logs calculations (PR-09)
- **Question:** Should we log:
  - Which packages were shown to user?
  - Which package user selected?
  - Why user selected that package (optional clinical notes)?
- **Recommendation:** Yes, log selections for HIPAA compliance (7-year retention)

**Q15:** Should the system **require pharmacist verification** for high-risk scenarios?
- **High-Risk Scenarios:**
  - Large overfill (>20%)
  - Large underfill (>10%)
  - Controlled substances
  - High-alert medications
- **Feature:** "Verify" checkbox or digital signature before confirming
- **Recommendation:** Yes, for controlled substances and high overfill/underfill (P1)

**Q16:** What level of **patient identifiable information** should be captured in the workflow?
- **Context:** Current system doesn't capture patient info (only drug + SIG)
- **Question:** Should system ask for:
  - Patient name
  - MRN / Patient ID
  - Prescription number
- **Compliance:** If captured, must be encrypted and HIPAA-compliant
- **Recommendation:** Optional fields, not required (patient data usually in external pharmacy system)

---

## Section 6: Gap Summary by Severity

### Critical Gaps (8)
| Gap ID | Description | Impact |
|--------|-------------|--------|
| 1.1 | No multi-step workflow | Violates standard pharmacy workflow patterns |
| 1.2 | SIG entry happens too early | Pharmacist can't see options before prescribing |
| 1.4 | No package selection by user | Removes pharmacist clinical judgment |
| 2.1 | No package table view | Cannot see full range of options |
| 2.4 | No row selection UI | User cannot interact with packages |
| 2.5 | No unique package rows | Only 1 package shown instead of all |
| 5.1 | Free-text SIG not parsed | Produces incorrect calculations |

### High Severity Gaps (12)
| Gap ID | Description | Impact |
|--------|-------------|--------|
| 1.3 | No drug search-only mode | Can't explore availability before prescribing |
| 2.2 | Missing table columns | Missing brand name, manufacturer, route |
| 2.3 | No table sorting/filtering | Difficult to find optimal package |
| 3.1 | Brand name not displayed | Can't distinguish generic vs. brand |
| 3.3 | Route not displayed | Safety issue for multi-route drugs |
| 4.1 | No strength-based search | User sees all strengths, not just desired one |
| 6.1 | No multi-package dispensing | Suboptimal dispensing (large overfill) |
| 7.1 | No alternative packages shown | Cannot see other options |

### Medium Severity Gaps (9)
| Gap ID | Description | Impact |
|--------|-------------|--------|
| 1.5 | No progressive disclosure | Cognitive overload for users |
| 3.2 | Manufacturer not displayed | Can't identify manufacturer for recalls |
| 3.5 | Strength not shown per-package | Strength ambiguous for multi-strength drugs |
| 5.2 | No SIG templates | Slower workflow, inconsistent formatting |
| 5.3 | No SIG validation feedback | User unsure if SIG is correctly formatted |
| 5.4 | Quantity calc before package selection | Backward logic from ideal |
| 5.5 | No manual quantity override | Can't accommodate special requests |
| 6.2 | No package combination logic | Misses optimal multi-package solutions |
| 7.3 | No final confirmation step | Unclear "next step" for pharmacist |

### Low Severity Gaps (3)
| Gap ID | Description | Impact |
|--------|-------------|--------|
| 2.2 | Excluded NDCs hidden by default | May miss why packages were excluded |
| 4.2 | No active/inactive toggle | Good default, but no flexibility |
| 9.2 | No loading states for table | Poor feedback during API call |

---

## Conclusion

This gap analysis reveals **32 distinct gaps** between the ideal pharmacist workflow and the current implementation. The most critical gaps are:

1. **Lack of multi-step workflow** - current single-step form violates pharmacy workflow patterns
2. **No package table or selection** - pharmacist cannot see or choose packages
3. **SIG entry before viewing options** - backwards from clinical decision-making
4. **Missing critical data fields** - brand name, manufacturer, route not displayed
5. **Free-text SIG not functional** - produces incorrect calculations

To align with the ideal workflow, the system requires a **major architectural refactor**:
- Replace single-step form with 6-step progressive workflow
- Build package table component with all required data columns
- Add user package selection interface
- Refactor backend to support search-only and user-selected packages
- Implement SIG parser for free-text mode
- Add multi-package dispensing support

**Estimated Effort:** 4-6 weeks for P1 fixes (critical path to ideal workflow)

**Next Steps:**
1. Product review this analysis and prioritize gaps
2. Answer open questions in Section 5
3. Create detailed implementation plan for P1 fixes
4. Design UI mockups for multi-step workflow
5. Break down work into sprint-sized tasks

---

**Document Version:** 1.0  
**Last Updated:** November 19, 2025  
**Prepared By:** Foundation Health Engineering Analyst  
**Status:** Ready for Product Review

