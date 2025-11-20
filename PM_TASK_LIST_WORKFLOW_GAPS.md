# NDC Calculator: Project Management Task List
## Workflow Gap Remediation

**Organization:** Foundation Health  
**Project:** NDC Packaging & Quantity Calculator  
**Document Date:** November 19, 2025  
**Total PRs:** 12  
**Estimated Timeline:** 6-8 weeks

---

## Overview

This task list addresses all 32 gaps identified in the workflow gap analysis by restructuring the application from a single-step form into a 6-step progressive workflow that aligns with standard pharmacy dispensing practices.

**Workflow Steps to Implement:**
1. Drug Search
2. Package Table Display
3. Package Selection
4. SIG Entry/Review
5. Quantity Calculation
6. Final Summary Review

---

## PR-01: Multi-Step Workflow Foundation
**Priority:** P0 (Critical)  
**Estimated Effort:** 3-4 days  
**Dependencies:** None  
**Addresses Gaps:** 1.1, 1.5

### Tasks

#### Frontend Architecture
- [ ] Create multi-step workflow container component
- [ ] Implement step navigation (stepper/wizard UI)
- [ ] Add step state management (current step, completed steps, step validation)
- [ ] Design step transition animations
- [ ] Create progress indicator component
- [ ] Implement "Back" and "Next" navigation buttons
- [ ] Add step completion validation logic
- [ ] Create workflow context provider for shared state across steps
- [ ] Design mobile-responsive stepper layout

#### State Management
- [ ] Define workflow state interface/types
- [ ] Implement state persistence (session storage or React context)
- [ ] Add state reset functionality
- [ ] Create state validation functions per step
- [ ] Implement state hydration/dehydration logic

#### Navigation & Routing
- [ ] Set up URL routing for each workflow step
- [ ] Implement deep linking support (allow direct step access via URL)
- [ ] Add browser back button handling
- [ ] Create navigation guards (prevent skipping required steps)
- [ ] Implement "unsaved changes" warning

#### Unit Tests
- [ ] Test step navigation forward/backward
- [ ] Test step validation logic
- [ ] Test state persistence and retrieval
- [ ] Test navigation guards
- [ ] Test workflow completion conditions
- [ ] Test URL routing and deep linking

#### Documentation
- [ ] Document workflow state structure
- [ ] Create component API documentation
- [ ] Add usage examples for workflow container

---

## PR-02: Drug Search & Package Retrieval
**Priority:** P0 (Critical)  
**Estimated Effort:** 4-5 days  
**Dependencies:** PR-01  
**Addresses Gaps:** 1.3, 4.1

### Tasks

#### Step 1: Drug Search UI
- [ ] Create drug search input component
- [ ] Add autocomplete/typeahead for drug names
- [ ] Implement strength selector dropdown
- [ ] Add "Search with Strength" vs "Show All Strengths" toggle
- [ ] Create search button with loading state
- [ ] Display search validation errors
- [ ] Add recent searches history
- [ ] Implement fuzzy search suggestions

#### Backend API Updates
- [ ] Create new endpoint: `POST /api/v1/search-drug`
- [ ] Accept drug name and optional strength parameters
- [ ] Return normalized drug info (RxCUI, name, available strengths)
- [ ] Add strength-based filtering logic
- [ ] Implement search caching (cache search results)
- [ ] Add rate limiting for search endpoint

#### Drug Normalization
- [ ] Enhance RxNorm integration for search-only mode
- [ ] Return all available strengths for a drug
- [ ] Add dosage form variations to search results
- [ ] Implement spelling correction suggestions
- [ ] Handle multi-ingredient drugs

#### Unit Tests
- [ ] Test drug search with valid drug names
- [ ] Test drug search with invalid inputs
- [ ] Test strength filtering
- [ ] Test fuzzy search matching
- [ ] Test RxNorm API error handling
- [ ] Test search result caching
- [ ] Test autocomplete behavior

#### Integration Tests
- [ ] Test full drug search workflow
- [ ] Test search-to-package-retrieval flow

---

## PR-03: Package Table Display
**Priority:** P0 (Critical)  
**Estimated Effort:** 5-6 days  
**Dependencies:** PR-02  
**Addresses Gaps:** 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.5

### Tasks

#### Step 2: Package Table Component
- [ ] Create comprehensive package data table
- [ ] Design table schema with all required columns
- [ ] Implement responsive table layout (desktop and mobile)
- [ ] Add table row uniqueness logic (one row per NDC)
- [ ] Create table header component
- [ ] Implement table body with row rendering
- [ ] Add empty state UI (no packages found)
- [ ] Create table loading skeleton

#### Table Columns Implementation
- [ ] Add Brand Name column
- [ ] Add Generic Name column
- [ ] Add Strength column (with units)
- [ ] Add Package Size column (quantity + unit)
- [ ] Add NDC column (11-digit format display)
- [ ] Add Dosage Form column
- [ ] Add Route column
- [ ] Add Manufacturer/Labeler column
- [ ] Add Marketing Status column
- [ ] Add Actions column (for selection)

#### Backend API Updates
- [ ] Create new endpoint: `GET /api/v1/packages-by-drug`
- [ ] Accept RxCUI and optional strength filter
- [ ] Return all active packages with full metadata
- [ ] Add brand name field to package response
- [ ] Add manufacturer/labeler field
- [ ] Add route field
- [ ] Ensure per-package strength is included
- [ ] Return packages sorted by package size (ascending)

#### FDA Data Enhancement
- [ ] Parse brand name from FDA response
- [ ] Extract manufacturer/labeler name
- [ ] Parse route information
- [ ] Validate marketing status field
- [ ] Add data transformation for frontend display

#### Unit Tests
- [ ] Test table rendering with package data
- [ ] Test empty state display
- [ ] Test table column data mapping
- [ ] Test responsive layout behavior
- [ ] Test loading state display
- [ ] Test backend endpoint with various drug inputs
- [ ] Test brand name extraction logic
- [ ] Test manufacturer parsing

#### Integration Tests
- [ ] Test drug search to package table flow
- [ ] Test FDA API data transformation
- [ ] Test table display with 50+ packages

---

## PR-04: Table Enhancements (Sort, Filter, Pagination)
**Priority:** P0 (Critical)  
**Estimated Effort:** 4-5 days  
**Dependencies:** PR-03  
**Addresses Gaps:** 2.3, 9.2

### Tasks

#### Sorting Functionality
- [ ] Implement column header click-to-sort
- [ ] Add ascending/descending sort indicators
- [ ] Create multi-column sort logic
- [ ] Default sort by package size (ascending)
- [ ] Persist sort preferences in session

#### Filtering Functionality
- [ ] Create filter panel/drawer component
- [ ] Add dosage form filter (checkboxes)
- [ ] Add manufacturer filter (searchable dropdown)
- [ ] Add package size range filter (slider)
- [ ] Add route filter (checkboxes)
- [ ] Implement "Clear All Filters" button
- [ ] Show active filter count badge
- [ ] Display filtered result count

#### Pagination
- [ ] Implement pagination component
- [ ] Set default page size to 20 packages
- [ ] Add page size selector (10, 20, 50, 100)
- [ ] Create "Show All" option
- [ ] Add pagination info text ("Showing 1-20 of 150")
- [ ] Implement keyboard navigation (arrow keys)

#### Loading & Performance
- [ ] Add loading states for sorting
- [ ] Add loading states for filtering
- [ ] Add loading spinner for table data fetch
- [ ] Implement debouncing for filter inputs
- [ ] Add loading skeleton for initial load
- [ ] Optimize table rendering for large datasets

#### Unit Tests
- [ ] Test sorting by each column
- [ ] Test multi-column sort
- [ ] Test filter application (dosage form, manufacturer, etc.)
- [ ] Test filter combinations
- [ ] Test pagination navigation
- [ ] Test page size changes
- [ ] Test "Show All" functionality
- [ ] Test filter reset
- [ ] Test loading state transitions

---

## PR-05: Package Selection UI
**Priority:** P0 (Critical)  
**Estimated Effort:** 3-4 days  
**Dependencies:** PR-04  
**Addresses Gaps:** 1.4, 2.4, 3.1

### Tasks

#### Step 3: Selection Interface
- [ ] Add radio button column to table
- [ ] Implement row click-to-select behavior
- [ ] Add visual highlighting for selected row
- [ ] Create selection confirmation UI (badge or pill)
- [ ] Display selected package details in sticky summary card
- [ ] Add "Change Selection" button
- [ ] Implement single-selection enforcement
- [ ] Add keyboard selection support (arrow keys + Enter)

#### Selection State Management
- [ ] Store selected package in workflow state
- [ ] Validate selection before allowing next step
- [ ] Clear selection when navigating back to search
- [ ] Warn user if selection will be lost on back navigation
- [ ] Persist selection across page refreshes

#### Selected Package Summary Card
- [ ] Create summary card component
- [ ] Display selected NDC (11-digit format)
- [ ] Display brand and generic names
- [ ] Display strength, form, and route
- [ ] Display package size
- [ ] Display manufacturer
- [ ] Add "Deselect" or "Choose Different Package" button
- [ ] Make card sticky on scroll

#### Unit Tests
- [ ] Test row selection behavior
- [ ] Test radio button selection
- [ ] Test row highlighting
- [ ] Test selection state persistence
- [ ] Test deselection behavior
- [ ] Test keyboard navigation
- [ ] Test selection validation
- [ ] Test summary card rendering

#### Integration Tests
- [ ] Test full selection workflow
- [ ] Test selection with back navigation

---

## PR-06: SIG Entry & Validation (Step 4)
**Priority:** P0 (Critical)  
**Estimated Effort:** 4-5 days  
**Dependencies:** PR-05  
**Addresses Gaps:** 1.2, 5.2, 5.3, 5.4

### Tasks

#### Step 4: SIG Entry UI
- [ ] Create SIG entry form component
- [ ] Move SIG entry to Step 4 (after package selection)
- [ ] Add mode toggle: Structured vs Free-text
- [ ] Design structured SIG form (dose, frequency, duration fields)
- [ ] Design free-text SIG input field
- [ ] Add SIG template selector dropdown
- [ ] Create template library (common SIGs)
- [ ] Add "Use Previous SIG" quick-fill button
- [ ] Display parsed SIG preview in real-time

#### SIG Templates
- [ ] Define 20+ common SIG templates
- [ ] Categorize templates by drug type (antibiotics, maintenance, etc.)
- [ ] Allow custom template creation
- [ ] Store templates in local storage or user preferences
- [ ] Add template search/filter

#### SIG Validation
- [ ] Implement structured SIG validation rules
- [ ] Add real-time validation feedback
- [ ] Display validation errors inline
- [ ] Validate dose format (numeric + unit)
- [ ] Validate frequency (daily, BID, TID, QID, etc.)
- [ ] Validate duration (days)
- [ ] Add unit compatibility checks (e.g., "mL" for liquids)
- [ ] Show validation success indicators

#### Backend API Updates
- [ ] Create endpoint: `POST /api/v1/validate-sig`
- [ ] Accept structured or free-text SIG
- [ ] Return parsed SIG components (dose, frequency, duration)
- [ ] Return validation errors if SIG is invalid
- [ ] Add unit normalization logic

#### Unit Tests
- [ ] Test structured SIG form validation
- [ ] Test free-text SIG input
- [ ] Test SIG template selection
- [ ] Test template application
- [ ] Test "Use Previous SIG" functionality
- [ ] Test real-time validation feedback
- [ ] Test backend SIG validation endpoint
- [ ] Test unit compatibility checks

#### Integration Tests
- [ ] Test SIG entry after package selection
- [ ] Test SIG validation with various inputs

---

## PR-07: Free-Text SIG Parser (AI Integration)
**Priority:** P0 (Critical)  
**Estimated Effort:** 5-6 days  
**Dependencies:** PR-06  
**Addresses Gaps:** 5.1

### Tasks

#### AI Parser Implementation
- [ ] Integrate OpenAI API for SIG parsing
- [ ] Design prompt template for SIG extraction
- [ ] Define parser output schema (dose, frequency, duration, unit)
- [ ] Implement parser error handling
- [ ] Add fallback to rule-based parser if AI fails
- [ ] Create confidence scoring for parsed results

#### Rule-Based Parser (Fallback)
- [ ] Create regex patterns for common SIG formats
- [ ] Implement dose extraction logic
- [ ] Implement frequency extraction (BID, TID, QID, PRN, etc.)
- [ ] Implement duration extraction (days, weeks, months)
- [ ] Implement unit extraction (tablet, capsule, mL, etc.)
- [ ] Handle special cases (PRN, as directed, etc.)

#### Parser Validation & Refinement
- [ ] Show confidence score to user
- [ ] Allow user to edit parsed results
- [ ] Add "Confirm Parsed SIG" step
- [ ] Implement parser training feedback loop
- [ ] Log parsing failures for analysis

#### Backend API Updates
- [ ] Create endpoint: `POST /api/v1/parse-sig`
- [ ] Accept free-text SIG string
- [ ] Return parsed components with confidence scores
- [ ] Add caching for common SIG patterns
- [ ] Implement rate limiting for OpenAI calls

#### Unit Tests
- [ ] Test AI parser with 50+ SIG examples
- [ ] Test rule-based parser with common patterns
- [ ] Test parser fallback logic
- [ ] Test confidence scoring
- [ ] Test error handling for unparseable SIGs
- [ ] Test special cases (PRN, as directed, etc.)
- [ ] Test unit extraction accuracy

#### Integration Tests
- [ ] Test end-to-end free-text SIG parsing
- [ ] Test OpenAI API integration
- [ ] Test fallback to rule-based parser

---

## PR-08: Quantity Calculation & Overrides
**Priority:** P0 (Critical)  
**Estimated Effort:** 3-4 days  
**Dependencies:** PR-07  
**Addresses Gaps:** 5.5

### Tasks

#### Step 5: Calculation Display
- [ ] Create quantity calculation results component
- [ ] Display calculated total quantity with units
- [ ] Show calculation breakdown (dose × frequency × duration)
- [ ] Display selected package size
- [ ] Show overfill/underfill percentage
- [ ] Add overfill/underfill warning indicators
- [ ] Display number of packages needed

#### Manual Override Functionality
- [ ] Add "Override Quantity" checkbox/toggle
- [ ] Create manual quantity input field
- [ ] Add override reason dropdown or text field
- [ ] Validate manual quantity (must be positive)
- [ ] Recalculate packages needed based on override
- [ ] Show warning if override differs significantly from calculated

#### Backend Calculation Updates
- [ ] Ensure calculation uses selected package (not auto-selected)
- [ ] Recalculate quantity based on parsed SIG
- [ ] Handle unit conversions correctly (mL, tablets, capsules, etc.)
- [ ] Calculate packages needed (ceiling of totalQuantity / packageSize)
- [ ] Calculate overfill/underfill percentage
- [ ] Add special handling for liquid dosage forms

#### Unit Tests
- [ ] Test quantity calculation with various SIGs
- [ ] Test calculation with different package sizes
- [ ] Test overfill/underfill calculation
- [ ] Test manual quantity override
- [ ] Test validation for manual quantity
- [ ] Test unit conversion logic
- [ ] Test packages needed calculation

#### Integration Tests
- [ ] Test full calculation flow from SIG to quantity
- [ ] Test calculation with override

---

## PR-09: Final Confirmation & Summary
**Priority:** P0 (Critical)  
**Estimated Effort:** 3-4 days  
**Dependencies:** PR-08  
**Addresses Gaps:** 7.3

### Tasks

#### Step 6: Final Summary Component
- [ ] Create comprehensive summary card
- [ ] Display selected drug information (brand, generic, strength, form)
- [ ] Display selected NDC (11-digit format)
- [ ] Display selected package size and manufacturer
- [ ] Display parsed SIG (cleaned and formatted)
- [ ] Display calculated quantity to dispense
- [ ] Display number of packages
- [ ] Show warnings (overfill, underfill, inactive NDC, etc.)
- [ ] Add clinical notes section (optional text area)

#### Confirmation Actions
- [ ] Create "Confirm & Dispense" button
- [ ] Create "Confirm & New Calculation" button
- [ ] Create "Edit" button (go back to modify)
- [ ] Create "Cancel" button
- [ ] Add confirmation modal for final approval
- [ ] Implement "Print Summary" functionality
- [ ] Add "Export to PDF" option

#### Backend Logging
- [ ] Log final calculation to Firestore
- [ ] Store complete workflow state (all steps)
- [ ] Store selected package details
- [ ] Store SIG and parsed components
- [ ] Store calculated quantity
- [ ] Store any manual overrides
- [ ] Add timestamp and user ID
- [ ] Create audit trail entry

#### Unit Tests
- [ ] Test summary card rendering
- [ ] Test all displayed data fields
- [ ] Test confirmation button actions
- [ ] Test edit flow (navigate back)
- [ ] Test logging to Firestore
- [ ] Test print functionality
- [ ] Test PDF export

#### Integration Tests
- [ ] Test full workflow from search to confirmation
- [ ] Test data persistence in Firestore

---

## PR-10: Multi-Package Support
**Priority:** P1 (High)  
**Estimated Effort:** 4-5 days  
**Dependencies:** PR-09  
**Addresses Gaps:** 6.1, 6.2

### Tasks

#### Multi-Package Selection UI
- [ ] Update Step 3 to allow multiple package selection
- [ ] Add checkbox column to table (in addition to radio buttons)
- [ ] Add "Select Multiple Packages" toggle
- [ ] Display selected packages list
- [ ] Show combined quantity for selected packages
- [ ] Add "Remove" button for each selected package
- [ ] Validate that total selected quantity meets requirement

#### Package Combination Algorithm
- [ ] Implement optimal package combination logic
- [ ] Minimize overfill across multiple packages
- [ ] Suggest best package combinations
- [ ] Display "System Recommendations" section
- [ ] Allow user to accept or modify recommendations
- [ ] Handle edge cases (no valid combination exists)

#### Backend Updates
- [ ] Create endpoint: `POST /api/v1/suggest-packages`
- [ ] Accept total quantity needed
- [ ] Return optimal package combinations
- [ ] Implement knapsack-style optimization algorithm
- [ ] Add constraint for maximum number of packages (e.g., 3)

#### Calculation Updates
- [ ] Recalculate total packages for multi-package selection
- [ ] Calculate total cost (if pricing available)
- [ ] Show per-package quantity dispensed
- [ ] Update summary card for multi-package display

#### Unit Tests
- [ ] Test multi-package selection UI
- [ ] Test package combination algorithm
- [ ] Test optimal package suggestions
- [ ] Test validation for multi-package selection
- [ ] Test calculation with multiple packages
- [ ] Test recommendation acceptance/rejection

#### Integration Tests
- [ ] Test full multi-package workflow
- [ ] Test algorithm with various quantity scenarios

---

## PR-11: Alternative Packages & Excluded NDCs
**Priority:** P1 (High)  
**Estimated Effort:** 3-4 days  
**Dependencies:** PR-03  
**Addresses Gaps:** 2.2 (Low), 4.2, 7.1

### Tasks

#### Alternative Packages Display
- [ ] Add "Show Alternative Packages" section
- [ ] Display similar packages with different dosage forms
- [ ] Display packages with similar strengths
- [ ] Add "Switch to Alternative" button
- [ ] Show clinical notes for alternatives (e.g., "capsule form available")

#### Excluded NDCs View
- [ ] Create expandable "Excluded NDCs" section
- [ ] Display excluded NDCs in separate table
- [ ] Show exclusion reason for each NDC (inactive, discontinued, etc.)
- [ ] Add filter to view excluded NDCs
- [ ] Add "Include Inactive NDCs" checkbox (advanced option)

#### Active/Inactive Toggle
- [ ] Add "Show Inactive NDCs" toggle in filter panel
- [ ] Update API to accept `includeInactive` parameter
- [ ] Visually distinguish inactive NDCs in table (grayed out)
- [ ] Add warning badge for inactive NDCs
- [ ] Prevent selection of inactive NDCs

#### Backend Updates
- [ ] Update package retrieval endpoint to accept `includeInactive` flag
- [ ] Return inactive NDCs separately
- [ ] Add exclusion reason to package metadata
- [ ] Create endpoint to fetch excluded NDCs: `GET /api/v1/excluded-ndcs`

#### Unit Tests
- [ ] Test alternative packages display
- [ ] Test excluded NDCs view
- [ ] Test active/inactive toggle
- [ ] Test inactive NDC visual styling
- [ ] Test prevention of inactive NDC selection
- [ ] Test backend endpoint with `includeInactive` flag

---

## PR-12: Performance, Caching & Polish
**Priority:** P1 (High)  
**Estimated Effort:** 4-5 days  
**Dependencies:** PR-11  
**Addresses Gaps:** 9.2

### Tasks

#### Caching Implementation
- [ ] Add Firestore caching for FDA package data
- [ ] Set cache expiration (1 hour)
- [ ] Implement cache invalidation logic
- [ ] Add "Refresh Data" button for manual cache bust
- [ ] Show cache age indicator ("Data last updated: 30 min ago")
- [ ] Fallback to cache if FDA API fails
- [ ] Pre-warm cache for common drugs

#### Loading States
- [ ] Add loading spinners for all async operations
- [ ] Implement skeleton loaders for table
- [ ] Add progress indicators for multi-step processes
- [ ] Create loading overlay for entire workflow
- [ ] Add "Processing..." states for calculations
- [ ] Implement optimistic UI updates

#### Error Handling
- [ ] Create centralized error handling service
- [ ] Add user-friendly error messages
- [ ] Implement retry logic for API failures
- [ ] Add error boundary components
- [ ] Show toast notifications for errors
- [ ] Log errors to monitoring service
- [ ] Add offline mode detection

#### Performance Optimization
- [ ] Implement virtual scrolling for large tables (100+ rows)
- [ ] Add memoization for expensive calculations
- [ ] Optimize re-renders with React.memo
- [ ] Lazy load components
- [ ] Code split by route
- [ ] Optimize bundle size

#### Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works throughout workflow
- [ ] Add screen reader announcements for step changes
- [ ] Test with accessibility tools (axe, WAVE)
- [ ] Add focus management for modals and dialogs
- [ ] Ensure color contrast meets WCAG AA standards

#### Unit Tests
- [ ] Test caching logic
- [ ] Test cache expiration
- [ ] Test fallback to cache on API failure
- [ ] Test loading state transitions
- [ ] Test error handling
- [ ] Test retry logic

#### Integration Tests
- [ ] Test full workflow with caching
- [ ] Test workflow with FDA API failures
- [ ] Test performance with large datasets

#### Documentation
- [ ] Update user guide with new workflow
- [ ] Create video tutorial for 6-step process
- [ ] Document caching behavior
- [ ] Add troubleshooting guide

---

## PR-13: High-Risk & Compliance Features (Optional)
**Priority:** P2 (Nice-to-have)  
**Estimated Effort:** 3-4 days  
**Dependencies:** PR-09  
**Addresses:** Questions Q14, Q15, Q16

### Tasks

#### Audit Trail & Logging
- [ ] Log all package selections with timestamps
- [ ] Log which packages were shown to user
- [ ] Log user decision-making path (which steps they edited)
- [ ] Store audit logs in Firestore with 7-year retention
- [ ] Add "Clinical Notes" field for pharmacist comments
- [ ] Implement user authentication tracking
- [ ] Create audit log viewer (admin only)

#### High-Risk Verification
- [ ] Identify high-risk scenarios (controlled substances, large overfill)
- [ ] Add "Verify" checkbox for high-risk calculations
- [ ] Require digital signature or PIN for verification
- [ ] Show high-risk warning modal before confirmation
- [ ] Add flagging system for high-alert medications
- [ ] Create override approval workflow for supervisors

#### Patient Information (Optional)
- [ ] Add optional patient name field
- [ ] Add optional patient ID/MRN field
- [ ] Add optional prescription number field
- [ ] Implement field-level encryption for patient data
- [ ] Add HIPAA compliance notice
- [ ] Make patient fields configurable (on/off per deployment)

#### Unit Tests
- [ ] Test audit logging
- [ ] Test high-risk verification flow
- [ ] Test patient data encryption
- [ ] Test audit log retrieval

---

## Open Questions to Resolve

### Before Starting Development
These questions from the gap analysis should be answered before beginning implementation:

1. **Q6:** Show all packages (could be 100+) or pre-filter to top 20 recommended?
   - **Recommendation:** Show top 20 by package size, add "Show All" button
   
2. **Q7:** Should SIG remember previous entries for same drug?
   - **Recommendation:** Yes, add "Use Previous SIG" button
   
3. **Q8:** What happens if user changes search after selecting package?
   - **Recommendation:** Clear selection with warning toast
   
4. **Q9:** Confirmation step - what happens next?
   - **Recommendation:** Both "Confirm & Dispense" and "Confirm & New Calculation" buttons
   
5. **Q10:** Source of truth: FDA API (real-time) or cache?
   - **Recommendation:** Use cache, add "Refresh" button
   
6. **Q11:** Handle FDA API failures how?
   - **Recommendation:** Try FDA first, fall back to cache, show cache age
   
7. **Q13:** Validate package is still active before dispensing?
   - **Recommendation:** Yes, validate on confirmation step

---

## Testing Strategy

### Unit Tests Coverage
- All components should have 80%+ test coverage
- Test user interactions (clicks, typing, navigation)
- Test validation logic
- Test state management
- Test API integrations (mocked)

### Integration Tests Coverage
- Test complete workflows (search → confirmation)
- Test API endpoints with real data
- Test database operations
- Test external API integrations (RxNorm, FDA)

### E2E Tests Coverage (Optional)
- Test full user journeys in browser
- Test across different browsers (Chrome, Firefox, Safari)
- Test responsive design on mobile and tablet
- Test accessibility with screen readers

---

## Success Criteria

### P0 Requirements (Must-Have)
- [ ] Complete 6-step workflow implemented
- [ ] Users can search drugs and view all active packages
- [ ] Users can select packages from table
- [ ] SIG entry happens after package selection
- [ ] Free-text SIG parsing works correctly
- [ ] Quantity calculation based on selected package
- [ ] Final confirmation step with complete summary
- [ ] All critical and high-severity gaps addressed

### P1 Requirements (Should-Have)
- [ ] Multi-package support
- [ ] Table sorting and filtering
- [ ] SIG templates
- [ ] Alternative packages view
- [ ] Excluded NDCs view
- [ ] Performance optimizations

### P2 Requirements (Nice-to-Have)
- [ ] Audit trail and logging
- [ ] High-risk verification
- [ ] Patient information fields
- [ ] Advanced analytics

### Performance Targets
- [ ] Search-to-results < 2 seconds
- [ ] Page navigation < 500ms
- [ ] Table rendering < 1 second (for 100 packages)

### Quality Targets
- [ ] 80%+ unit test coverage
- [ ] 0 critical accessibility violations
- [ ] 0 high-severity security vulnerabilities
- [ ] Lighthouse score > 90

---

## Timeline & Milestones

### Week 1-2: Foundation (PR-01 to PR-03)
- Multi-step workflow foundation
- Drug search
- Package table display

### Week 3-4: Core Features (PR-04 to PR-07)
- Table enhancements
- Package selection
- SIG entry
- SIG parser

### Week 5-6: Calculation & Confirmation (PR-08 to PR-09)
- Quantity calculation
- Final confirmation

### Week 7: Advanced Features (PR-10 to PR-11)
- Multi-package support
- Alternative packages

### Week 8: Polish & Deploy (PR-12)
- Performance optimization
- Testing
- Deployment

---

## Risk Mitigation

### Technical Risks
- **FDA API reliability:** Implement caching and fallback logic
- **OpenAI API costs:** Implement rate limiting and caching for SIG parsing
- **Large dataset performance:** Use virtual scrolling and pagination

### Product Risks
- **User adoption:** Create user guide and training materials
- **Workflow disruption:** Provide side-by-side comparison with old flow
- **Feature creep:** Stick to P0/P1 scope for initial release

### Schedule Risks
- **External API delays:** Build with mock data first
- **Design changes:** Get design approval before implementation
- **Testing bottlenecks:** Write tests alongside development

---

## Post-Launch Items

### Phase 2 Enhancements
- Pricing information integration (Q12)
- Pharmacy management system integration
- Advanced analytics dashboard
- Bulk calculations (multiple prescriptions at once)
- Prescription history and pattern analysis

### Continuous Improvement
- Monitor user behavior and feedback
- Collect SIG parsing accuracy metrics
- Optimize algorithm based on real-world usage
- Add more SIG templates based on common patterns

---

**Document Version:** 1.0  
**Last Updated:** November 19, 2025  
**Status:** Ready for Development

