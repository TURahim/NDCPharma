# PR-12: Medication Search & Selection Overhaul - Implementation Plan

**Status**: Planning  
**Created**: November 18, 2025  
**PRD Reference**: `PRDTable.md`  
**Epic Size**: Large (8 PRs, ~3-4 weeks)

---

## Executive Summary

Complete overhaul of the medication search experience to provide:
- **Simple Mode (Default)**: Clean, grouped results for 90% of users
- **Advanced Table Mode**: Pharmacist-grade detailed view with full NDC visibility
- **Smart Ranking**: Prioritize active, commonly-used products
- **Clear Error States**: Differentiate between "not found" vs "no active NDCs"
- **Performance**: <300ms cached searches, <2s table loads

**Success Metrics**:
- 30%+ reduction in time-to-select
- 90% of users stay in simple mode
- Zero false "drug not found" errors for clinically valid medications

---

## Architecture Overview

### New Backend Components
1. **Drug Search Service** (`packages/domain-ndc/src/drugSearch.ts`)
   - Smart ranking algorithm
   - Dosage form grouping logic
   - Active/inactive filtering

2. **Enhanced FDA Client** (`packages/clients-openfda/`)
   - Batch manufacturer lookup
   - Enhanced package metadata

3. **New Search Endpoint** (`apps/functions/src/api/v1/search.ts`)
   - `/v1/search/drugs` - Simple mode
   - `/v1/search/drugs/advanced` - Table mode

### New Frontend Components
1. **MedicationSearchModal** - Modal-based search interface
2. **SimpleSearchResults** - Grouped, card-based results
3. **AdvancedSearchTable** - Full NDC table with sorting/filtering
4. **SearchStateManager** - Result state messaging

---

## PR Breakdown

### **PR-12A: Backend - Drug Search Service & Smart Ranking** 
**Priority**: P0 (Foundation)  
**Estimated Effort**: 3 days  
**Dependencies**: None

#### Scope
Create core domain logic for intelligent drug search, ranking, and grouping.

#### Tasks

**1. Create Drug Search Types** (`packages/domain-ndc/src/types.ts`)
```typescript
export interface DrugSearchResult {
  rxcui: string;
  name: string;
  strength: string;
  dosageForm: string;
  dosageFormFamily: 'SOLID' | 'LIQUID' | 'INJECTABLE' | 'SPECIAL';
  hasActiveNDCs: boolean;
  ndcCount: number;
  commonUsageScore: number; // 0-100
  badges: DrugBadge[];
}

export interface DrugBadge {
  type: 'ACTIVE' | 'COMMON' | 'PEDIATRIC' | 'GENERIC' | 'BRAND';
  label: string;
  variant: 'success' | 'info' | 'warning';
}

export interface GroupedSearchResults {
  dosageFormGroups: DosageFormGroup[];
  totalResults: number;
  hasInactiveResults: boolean;
}

export interface DosageFormGroup {
  dosageForm: string;
  dosageFormFamily: 'SOLID' | 'LIQUID' | 'INJECTABLE' | 'SPECIAL';
  results: DrugSearchResult[];
  expanded: boolean;
}

export interface SearchRankingFactors {
  hasActiveNDCs: number;        // Weight: 50
  isGeneric: number;             // Weight: 20
  strengthCommonality: number;   // Weight: 15
  formCommonality: number;       // Weight: 10
  recencyScore: number;          // Weight: 5
}
```

**2. Implement Smart Ranking** (`packages/domain-ndc/src/searchRanker.ts`)
- `calculateRankingScore(drug, fdaPackages): number`
  - Prioritize drugs with active NDCs (50 points)
  - Boost generic drugs (20 points)
  - Score common strengths (e.g., 500mg, 10mg) (15 points)
  - Score common forms (tablet, capsule) (10 points)
  - Consider recency of FDA updates (5 points)
- `rankSearchResults(results): DrugSearchResult[]`
- `assignDrugBadges(drug, packages): DrugBadge[]`
  - ACTIVE: Has active NDCs
  - COMMON: Top 20% by usage score
  - PEDIATRIC: Liquid or low-strength formulations
  - GENERIC: TTY = SCD
  - BRAND: TTY = SBD

**3. Implement Dosage Form Grouping** (`packages/domain-ndc/src/searchGrouper.ts`)
- `groupByDosageForm(results): GroupedSearchResults`
  - Group by dosageFormFamily first (SOLID, LIQUID, etc.)
  - Then by specific form (TABLET, CAPSULE, SUSPENSION)
- `sortDosageFormGroups(groups): DosageFormGroup[]`
  - Sort by commonality: TABLET → CAPSULE → LIQUID → INJECTABLE
- `limitResultsPerGroup(groups, maxPerGroup = 3): GroupedSearchResults`
  - Show top 3 per group by default
  - Allow expansion for more

**4. Implement Active Filtering** (`packages/domain-ndc/src/searchFilters.ts`)
- `filterActiveOnly(results): DrugSearchResult[]`
- `separateActiveInactive(results): { active, inactive }`
- `detectAvailabilityState(drug, packages): AvailabilityState`
  - States: ACTIVE_FOUND, ONLY_INACTIVE, NO_FDA_NDCS, NOT_FOUND

**5. Tests** (`packages/domain-ndc/tests/searchRanker.test.ts`)
- [ ] Ranking prioritizes active NDCs
- [ ] Generic drugs rank higher than brands
- [ ] Common strengths (500mg, 10mg) score higher
- [ ] Common forms (tablet, capsule) score higher
- [ ] Badge assignment logic (30+ tests)
- [ ] Dosage form grouping correctness (20+ tests)
- [ ] Group sorting and limiting (15+ tests)
- [ ] Active/inactive filtering (10+ tests)

**Acceptance Criteria**:
- ✅ 75+ unit tests passing
- ✅ Ranking algorithm tested with real RxNorm data
- ✅ Grouping produces intuitive categories
- ✅ Active filtering never drops valid results

---

### **PR-12B: Backend - Enhanced FDA Client for Metadata**
**Priority**: P0 (Foundation)  
**Estimated Effort**: 2 days  
**Dependencies**: PR-12A

#### Scope
Enhance FDA client to fetch manufacturer, package sizes, and marketing status for advanced table.

#### Tasks

**1. Add Manufacturer Extraction** (`packages/clients-openfda/src/internal/fdaMapper.ts`)
- Enhance `mapFDAResultToNDCPackage()` to extract:
  - `manufacturer` (labeler_name)
  - `brandName` (brand_name)
  - `genericName` (generic_name)
  - `marketingStatus.status` (marketing_status)
  - `marketingStatus.date` (marketing_start_date)

**2. Add Batch Package Lookup** (`packages/clients-openfda/src/index.ts`)
- `getDetailedPackages(rxcuis: string[]): Promise<DetailedPackage[]>`
  - Batch fetch up to 20 RxCUIs
  - Return full package metadata
  - Include manufacturer, status, package sizes

**3. Update NDCPackage Type** (`packages/clients-openfda/src/internal/fdaTypes.ts`)
```typescript
export interface NDCPackage {
  // ... existing fields
  manufacturer?: string;
  brandName?: string;
  genericName?: string;
  marketingStatus: {
    isActive: boolean;
    status: string;
    startDate?: string;
    endDate?: string;
  };
}
```

**4. Tests** (`packages/clients-openfda/tests/fdaMapper.test.ts`)
- [ ] Manufacturer extraction (10 tests)
- [ ] Brand/generic name parsing (10 tests)
- [ ] Marketing status date parsing (8 tests)
- [ ] Batch package lookup (12 tests)

**Acceptance Criteria**:
- ✅ 40+ new tests passing
- ✅ Manufacturer data extracted for 95% of FDA results
- ✅ Batch lookup handles up to 20 RxCUIs efficiently

---

### **PR-12C: Backend - Search API Endpoint**
**Priority**: P0 (Foundation)  
**Estimated Effort**: 3 days  
**Dependencies**: PR-12A, PR-12B

#### Scope
New API endpoint for drug search with simple and advanced modes.

#### Tasks

**1. Create Search Schemas** (`packages/api-contracts/src/search.schema.ts`)
```typescript
// POST /v1/search/drugs
export const DrugSearchRequestSchema = z.object({
  query: z.string().min(2).max(200),
  mode: z.enum(['simple', 'advanced']).default('simple'),
  filters: z.object({
    activeOnly: z.boolean().default(true),
    dosageForm: z.string().optional(),
    strength: z.string().optional(),
    manufacturer: z.string().optional(),
  }).optional(),
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(10).max(100).default(20),
  }).optional(),
});

export const DrugSearchResponseSchema = z.object({
  results: z.array(DrugSearchResultSchema),
  grouped: GroupedSearchResultsSchema.optional(), // For simple mode
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
  }),
  availabilityState: z.enum([
    'ACTIVE_FOUND',
    'ONLY_INACTIVE',
    'NO_FDA_NDCS',
    'NOT_FOUND'
  ]),
  message: z.string().optional(),
});
```

**2. Implement Search Endpoint** (`apps/functions/src/api/v1/search.ts`)
```typescript
export const searchDrugs = async (req, res) => {
  // 1. Validate request
  const { query, mode, filters, pagination } = validate(req.body);
  
  // 2. Search RxNorm for drug candidates
  const rxnormResults = await rxnormClient.searchByName(query);
  
  // 3. For each candidate, check FDA availability
  const fdaPackages = await Promise.all(
    rxnormResults.map(r => fdaClient.getNDCsByRxCUI(r.rxcui))
  );
  
  // 4. Build DrugSearchResult objects
  const searchResults = buildSearchResults(rxnormResults, fdaPackages);
  
  // 5. Apply smart ranking
  const rankedResults = rankSearchResults(searchResults);
  
  // 6. Apply filters
  const filteredResults = applyFilters(rankedResults, filters);
  
  // 7. Mode-specific formatting
  if (mode === 'simple') {
    const grouped = groupByDosageForm(filteredResults);
    const limited = limitResultsPerGroup(grouped, 3);
    return res.json({ grouped, availabilityState, ... });
  } else {
    const paginated = paginateResults(filteredResults, pagination);
    return res.json({ results: paginated, availabilityState, ... });
  }
};
```

**3. Add Caching** (`apps/functions/src/api/v1/search.ts`)
- Cache search results by query + filters (5 min TTL)
- Cache drug metadata by RxCUI (1 hour TTL)
- Use `data-cache` service

**4. Add Rate Limiting** (`apps/functions/src/api/v1/middlewares/rateLimit.ts`)
- 30 searches/min for authenticated users
- 10 searches/min for anonymous users

**5. Register Route** (`apps/functions/src/index.ts`)
```typescript
app.post('/v1/search/drugs', 
  optionalAuth, 
  rateLimitMiddleware, 
  validateMiddleware(DrugSearchRequestSchema),
  searchDrugs
);
```

**6. Tests** (`apps/functions/tests/contract/search.test.ts`)
- [ ] Simple mode returns grouped results (10 tests)
- [ ] Advanced mode returns flat paginated results (10 tests)
- [ ] Active filter excludes inactive drugs (8 tests)
- [ ] Smart ranking prioritizes active NDCs (12 tests)
- [ ] Error states handled correctly (15 tests)
  - NOT_FOUND: No RxNorm match
  - NO_FDA_NDCS: RxNorm found, no FDA data
  - ONLY_INACTIVE: FDA data exists, all inactive
  - ACTIVE_FOUND: Success case
- [ ] Caching works correctly (10 tests)
- [ ] Rate limiting enforced (5 tests)

**Acceptance Criteria**:
- ✅ 70+ integration tests passing
- ✅ Simple mode < 300ms for cached queries
- ✅ Advanced mode < 2s for 300 results
- ✅ Error messages are clinician-friendly

---

### **PR-12D: Frontend - Medication Search Modal & Simple Mode**
**Priority**: P0 (Core UX)  
**Estimated Effort**: 4 days  
**Dependencies**: PR-12C

#### Scope
Build the simple search mode UI with grouped, card-based results.

#### Tasks

**1. Create Search API Client** (`frontend/lib/search-client.ts`)
```typescript
export interface SearchOptions {
  mode: 'simple' | 'advanced';
  filters?: SearchFilters;
  pagination?: Pagination;
}

export const searchDrugs = async (
  query: string, 
  options: SearchOptions
): Promise<DrugSearchResponse> => {
  return apiClient.post('/v1/search/drugs', { query, ...options });
};
```

**2. Create Search Modal** (`frontend/components/calculator/medication-search-modal.tsx`)
- Triggered by clicking drug name input
- Full-screen modal on mobile, centered on desktop
- Search bar with debounced input (300ms)
- Loading states, error states
- Mode toggle button (Simple ↔ Advanced)
- Keyboard navigation (arrow keys, enter to select)

**3. Create Simple Search Results** (`frontend/components/calculator/simple-search-results.tsx`)
- Grouped by dosage form family
- Collapsible dosage form sections (default: expanded)
- 3 results per group, "Show more" to expand
- Card-based layout with badges
- Each card shows:
  - Generic name (bold)
  - Strength + dosage form
  - Badges (Active, Common, Pediatric, etc.)
  - Brief description
- Hover/focus states
- Click to select → close modal → populate calculator

**4. Create Search State Messages** (`frontend/components/calculator/search-state-messages.tsx`)
```typescript
// Component to show availability states
interface StateMessage {
  state: 'ACTIVE_FOUND' | 'ONLY_INACTIVE' | 'NO_FDA_NDCS' | 'NOT_FOUND';
  title: string;
  message: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
}

// Example messages:
// ONLY_INACTIVE: "This medication exists but has no active NDCs. It may be discontinued."
// NO_FDA_NDCS: "This medication is recognized clinically but has no FDA-listed NDCs."
// NOT_FOUND: "No matching medications found. Try a different spelling or brand name."
```

**5. Create Badge Component** (`frontend/components/ui/drug-badge.tsx`)
- Status badges with colors:
  - ACTIVE (green)
  - COMMON (blue)
  - PEDIATRIC (purple)
  - GENERIC (gray)
  - BRAND (orange)
- Consistent styling with Radix UI
- Tooltip on hover for badge meaning

**6. Update Enhanced Calculator** (`frontend/components/calculator/enhanced-calculator.tsx`)
- Replace drug name input with search trigger
- Show selected drug details
- Allow "Change drug" to reopen modal

**7. Add Search Hook** (`frontend/hooks/use-drug-search.ts`)
```typescript
export const useDrugSearch = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [results, setResults] = useState<DrugSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery, mode);
    }
  }, [debouncedQuery, mode]);

  const performSearch = async (q: string, m: 'simple' | 'advanced') => {
    // ... search logic
  };

  return { query, setQuery, mode, setMode, results, loading, error };
};
```

**8. Add Animations** (`frontend/components/calculator/`)
- Smooth modal open/close (Radix Dialog)
- Staggered card appearance (Framer Motion)
- Smooth group expand/collapse
- Loading skeleton for search results

**9. Responsive Design**
- Mobile: Full-screen modal, stacked cards
- Tablet: Centered modal, 2-column grid
- Desktop: Large centered modal, 3-column grid

**10. Tests** (Vitest + React Testing Library)
- [ ] Modal opens/closes correctly (5 tests)
- [ ] Search triggers API call (debounced) (8 tests)
- [ ] Simple mode renders grouped results (12 tests)
- [ ] Badges display correctly (10 tests)
- [ ] State messages show for each state (8 tests)
- [ ] Keyboard navigation works (10 tests)
- [ ] Drug selection populates calculator (5 tests)
- [ ] Mobile responsive layout (8 tests)

**Acceptance Criteria**:
- ✅ 66+ component tests passing
- ✅ Modal matches Figma designs (if available)
- ✅ Search feels instant (<300ms perceived latency)
- ✅ Keyboard accessible (WCAG 2.1 AA)
- ✅ Works on mobile, tablet, desktop

---

### **PR-12E: Frontend - Advanced Table Mode**
**Priority**: P1 (Power Users)  
**Estimated Effort**: 4 days  
**Dependencies**: PR-12D

#### Scope
Build the advanced pharmacist-grade table view with sorting, filtering, and full NDC visibility.

#### Tasks

**1. Create Advanced Table Component** (`frontend/components/calculator/advanced-search-table.tsx`)
- Full-width table with sortable columns:
  - Brand Name
  - Generic Name
  - Strength
  - Dosage Form
  - Package Size
  - Manufacturer
  - NDC
  - Status (Active/Inactive/Discontinued)
- Click column header to sort (asc/desc)
- Status badge in Status column
- Row hover highlights entire row
- Click row to select → populate calculator

**2. Create Table Filters** (`frontend/components/calculator/table-filters.tsx`)
- Filter bar above table:
  - **Active Only** toggle (default: ON)
  - **Strength** dropdown (multi-select)
  - **Dosage Form** dropdown (multi-select)
  - **Manufacturer** dropdown (multi-select)
  - **Clear All Filters** button
- Filters apply immediately (client-side)
- Show result count: "Showing 23 of 145 results"

**3. Add Pagination** (`frontend/components/calculator/table-pagination.tsx`)
- Show 20 results per page
- Page numbers + Previous/Next buttons
- Jump to page input
- Results summary: "1-20 of 145"

**4. Add Table State Management** (`frontend/hooks/use-table-state.ts`)
```typescript
export const useTableState = (data: DrugSearchResult[]) => {
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<TableFilters>({
    activeOnly: true,
    strength: [],
    dosageForm: [],
    manufacturer: [],
  });
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => applyFilters(data, filters), [data, filters]);
  const sortedData = useMemo(() => sortData(filteredData, sortColumn, sortDirection), [filteredData, sortColumn, sortDirection]);
  const paginatedData = useMemo(() => paginate(sortedData, page, 20), [sortedData, page]);

  return { paginatedData, sortColumn, setSortColumn, sortDirection, setSortDirection, filters, setFilters, page, setPage };
};
```

**5. Mode Toggle** (`frontend/components/calculator/search-mode-toggle.tsx`)
- Button in modal header: "View All NDCs (Advanced)" when in simple mode
- Button: "View Simple Results" when in advanced mode
- Smooth transition between modes (no modal close)
- Preserve search query when toggling

**6. Empty States**
- No results: "No medications match your filters. Try adjusting your criteria."
- All inactive: "All results are inactive. Toggle 'Active Only' to see discontinued products."

**7. Table Export** (Optional bonus)
- "Export CSV" button
- Downloads filtered/sorted table as CSV
- Useful for auditing/reporting

**8. Responsive Design**
- Desktop: Full table with all columns
- Tablet: Hide less important columns (Package Size, Manufacturer)
- Mobile: Switch to card-based view (not table)

**9. Tests**
- [ ] Table renders all columns (8 tests)
- [ ] Sorting works for each column (16 tests)
- [ ] Filters apply correctly (20 tests)
- [ ] Pagination works (12 tests)
- [ ] Mode toggle preserves search (5 tests)
- [ ] Row selection works (8 tests)
- [ ] Empty states display (6 tests)
- [ ] Responsive layout (10 tests)

**Acceptance Criteria**:
- ✅ 85+ component tests passing
- ✅ Table handles 300+ rows without lag
- ✅ Sorting/filtering < 150ms perceived latency
- ✅ Matches pharmacy software mental model
- ✅ Keyboard accessible (tab, enter, arrow keys)

---

### **PR-12F: Frontend - Enhanced Error Handling & Messaging**
**Priority**: P1 (UX Polish)  
**Estimated Effort**: 2 days  
**Dependencies**: PR-12D, PR-12E

#### Scope
Improve error messaging to eliminate false "drug not found" errors and guide users appropriately.

#### Tasks

**1. Create Error State Components** (`frontend/components/calculator/search-error-states.tsx`)
```typescript
// NOT_FOUND state
<ErrorState
  icon={<SearchX className="h-12 w-12" />}
  title="No matching medications found"
  message="We couldn't find any medications matching your search. Try:"
  suggestions={[
    'Checking your spelling',
    'Using a brand name (e.g., "Tylenol" instead of "acetaminophen")',
    'Using a generic name',
    'Searching for a specific strength (e.g., "amoxicillin 500mg")'
  ]}
/>

// NO_FDA_NDCS state
<ErrorState
  icon={<AlertCircle className="h-12 w-12" />}
  title="Medication recognized, but no NDCs available"
  message="This medication is recognized clinically but has no FDA-listed NDC codes. This may occur if:"
  suggestions={[
    'The medication is not marketed in the United States',
    'It's a compounded or custom formulation',
    'It's available only through special programs'
  ]}
  action={
    <Button onClick={suggestAlternatives}>
      Find Similar Medications
    </Button>
  }
/>

// ONLY_INACTIVE state
<ErrorState
  icon={<XCircle className="h-12 w-12" />}
  title="This medication has been discontinued"
  message="We found this medication, but all NDC packages are inactive or discontinued."
  action={
    <div className="space-x-2">
      <Button onClick={() => toggleActiveFilter(false)}>
        View Discontinued Packages
      </Button>
      <Button variant="outline" onClick={suggestAlternatives}>
        Find Active Alternatives
      </Button>
    </div>
  }
/>
```

**2. Create In-Line Warnings** (`frontend/components/calculator/search-warnings.tsx`)
- Shown within search results:
  - "Limited results: Only 2 active formulations available"
  - "Note: Some inactive results hidden. Toggle 'Active Only' to view."
  - "High NDC count: Consider using Advanced View for full details"

**3. Add Helpful Tooltips** (`frontend/components/calculator/search-tooltips.tsx`)
- Hover info icons for context:
  - "What does 'Active' mean?" → Tooltip explaining marketing status
  - "Why is this drug 'Common'?" → Tooltip about usage scoring
  - "What's the difference between Generic and Brand?" → Tooltip

**4. Update Search No-Results Flow**
- If query returns 0 results:
  1. Show "NOT_FOUND" state
  2. Offer spelling suggestions (from RxNorm)
  3. Offer alternative search terms
  4. Link to "Browse all medications" (future feature)

**5. Add Loading States**
- Skeleton loaders for cards/table rows
- Progressive loading messages:
  - "Searching RxNorm..." (0-500ms)
  - "Checking FDA availability..." (500ms-1.5s)
  - "Ranking results..." (1.5s+)

**6. Add Success Messaging**
- Toast notification on drug selection: "Selected: Amoxicillin 500mg Capsule"
- Highlight selected drug in modal before closing

**7. Tests**
- [ ] NOT_FOUND state renders correctly (8 tests)
- [ ] NO_FDA_NDCS state renders correctly (8 tests)
- [ ] ONLY_INACTIVE state renders correctly (8 tests)
- [ ] Warnings display appropriately (10 tests)
- [ ] Tooltips provide helpful context (8 tests)
- [ ] Loading states sequence correctly (10 tests)
- [ ] Success messaging appears (5 tests)

**Acceptance Criteria**:
- ✅ 57+ tests passing
- ✅ Zero false "drug not found" errors
- ✅ All error states have actionable next steps
- ✅ Messaging uses clinician-friendly language
- ✅ Loading states feel smooth and informative

---

### **PR-12G: Performance Optimization & Caching**
**Priority**: P1 (Performance)  
**Estimated Effort**: 2 days  
**Dependencies**: PR-12C, PR-12D, PR-12E

#### Scope
Optimize search performance to meet <300ms cached, <2s uncached requirements.

#### Tasks

**1. Backend Query Optimization**
- Implement parallel RxNorm + FDA queries
- Add query result pagination at FDA level
- Reduce unnecessary FDA calls (only fetch for top 20 RxNorm results)

**2. Backend Caching Strategy** (`apps/functions/src/api/v1/search.ts`)
```typescript
// 3-tier caching:
// L1: In-memory cache (5 min TTL) - for popular queries
// L2: Firestore cache (1 hour TTL) - for all queries
// L3: CDN cache (future) - for static drug lists

const CACHE_TIERS = {
  popular: 300,    // 5 min - top 100 queries
  standard: 3600,  // 1 hour - all queries
  metadata: 86400, // 24 hours - drug metadata
};
```

**3. Frontend Caching** (`frontend/lib/search-client.ts`)
- Use React Query for client-side caching
- Cache search results for 5 minutes
- Prefetch related searches (e.g., if search "amox", prefetch "amoxicillin")

**4. Add Search Analytics** (`apps/functions/src/api/v1/search.ts`)
- Log popular queries (for L1 cache optimization)
- Track query → selection conversion rate
- Monitor error states (to identify data quality issues)

**5. Implement Request Debouncing** (Frontend)
- Debounce search input (300ms)
- Cancel in-flight requests on new input
- Show "Searching..." only after 200ms delay

**6. Add Response Compression** (Backend)
- Enable gzip compression for API responses
- Reduce payload size by 70%+

**7. Optimize Table Rendering** (Frontend)
- Implement virtual scrolling for 300+ rows
- Use React.memo for table rows
- Lazy load manufacturer dropdown options

**8. Add Performance Monitoring**
- Frontend: Log search latency to analytics
- Backend: Add performance metrics to logs
- Set up alerts for slow queries (>2s)

**9. Tests**
- [ ] Cache hit rate >80% for popular queries (5 tests)
- [ ] Search latency <300ms for cached (10 tests)
- [ ] Search latency <2s for uncached (10 tests)
- [ ] Parallel queries faster than sequential (5 tests)
- [ ] Debouncing prevents excessive requests (8 tests)
- [ ] Virtual scrolling handles 500+ rows (5 tests)

**Acceptance Criteria**:
- ✅ 43+ performance tests passing
- ✅ 95th percentile latency <300ms for cached
- ✅ 95th percentile latency <2s for uncached
- ✅ Cache hit rate >80% for top 100 queries
- ✅ Table renders 300 rows without jank

---

### **PR-12H: Testing, Documentation & Launch**
**Priority**: P0 (Launch)  
**Estimated Effort**: 3 days  
**Dependencies**: All previous PRs

#### Scope
Comprehensive testing, documentation, and feature launch.

#### Tasks

**1. End-to-End Tests** (`frontend/tests/e2e/search.spec.ts`)
- [ ] User searches for "amoxicillin" → sees simple results (8 steps)
- [ ] User toggles to advanced table → sorts by manufacturer (10 steps)
- [ ] User filters by "Active Only" → sees reduced results (6 steps)
- [ ] User searches for discontinued drug → sees ONLY_INACTIVE state (8 steps)
- [ ] User searches for unknown drug → sees NOT_FOUND state (6 steps)
- [ ] User selects drug from simple mode → calculator populates (8 steps)
- [ ] User selects drug from advanced table → calculator populates (8 steps)
- [ ] Mobile user performs search → UI is responsive (10 steps)

**2. Integration Tests** (`apps/functions/tests/integration/search.test.ts`)
- [ ] Full search flow: RxNorm → FDA → ranking → grouping (15 tests)
- [ ] Error handling for API failures (12 tests)
- [ ] Rate limiting works across searches (8 tests)
- [ ] Caching works end-to-end (10 tests)

**3. Performance Testing**
- Load test: 100 concurrent searches
- Stress test: 1000 searches in 1 minute
- Measure 95th/99th percentile latencies

**4. Accessibility Audit**
- WCAG 2.1 AA compliance check
- Keyboard navigation testing
- Screen reader testing (NVDA, JAWS)
- Color contrast verification

**5. Documentation**

**Implementation Summary** (`docs/summaries/PR-12-SEARCH-OVERHAUL-SUMMARY.md`)
- Architecture diagram
- API documentation
- Component hierarchy
- Performance metrics

**User Guide** (`docs/guides/MEDICATION-SEARCH-USER-GUIDE.md`)
- How to use simple search
- How to use advanced table
- Understanding search badges
- Troubleshooting common issues

**Developer Guide** (`docs/guides/MEDICATION-SEARCH-DEV-GUIDE.md`)
- How to add new ranking factors
- How to customize grouping logic
- How to extend table columns
- How to add new filters

**6. Feature Flag**
```typescript
// packages/core-config/src/featureFlags.ts
export const ENABLE_NEW_SEARCH = process.env.ENABLE_NEW_SEARCH === 'true' || false;
```

**7. Gradual Rollout Plan**
- Week 1: 10% of users (canary)
- Week 2: 50% of users (if no issues)
- Week 3: 100% of users (full launch)
- Rollback plan if issues arise

**8. Analytics Dashboard**
- Track adoption rate (% using new search)
- Track mode usage (simple vs advanced)
- Track time-to-select (before vs after)
- Track error states encountered

**9. User Feedback Collection**
- In-app feedback button
- Net Promoter Score (NPS) survey
- User interviews with pharmacists

**Acceptance Criteria**:
- ✅ 64+ E2E tests passing
- ✅ 45+ integration tests passing
- ✅ Load test: <2s for 100 concurrent users
- ✅ WCAG 2.1 AA compliant
- ✅ Documentation complete
- ✅ Feature flag ready for gradual rollout

---

## Summary of PRs

| PR | Title | Effort | Tests | Dependencies |
|----|-------|--------|-------|--------------|
| PR-12A | Drug Search Service & Smart Ranking | 3 days | 75+ | None |
| PR-12B | Enhanced FDA Client for Metadata | 2 days | 40+ | PR-12A |
| PR-12C | Search API Endpoint | 3 days | 70+ | PR-12A, PR-12B |
| PR-12D | Medication Search Modal & Simple Mode | 4 days | 66+ | PR-12C |
| PR-12E | Advanced Table Mode | 4 days | 85+ | PR-12D |
| PR-12F | Enhanced Error Handling & Messaging | 2 days | 57+ | PR-12D, PR-12E |
| PR-12G | Performance Optimization & Caching | 2 days | 43+ | PR-12C, PR-12D, PR-12E |
| PR-12H | Testing, Documentation & Launch | 3 days | 109+ | All previous |
| **TOTAL** | **8 PRs** | **23 days** | **545+ tests** | - |

---

## Testing Strategy

### Unit Tests (packages/*)
- **domain-ndc**: 75 tests (ranking, grouping, filtering)
- **clients-openfda**: 40 tests (metadata extraction)
- **Total**: 115 unit tests

### Integration Tests (apps/functions/tests)
- **Search endpoint**: 70 tests
- **Full flow**: 45 tests
- **Total**: 115 integration tests

### Component Tests (frontend/tests)
- **Simple search**: 66 tests
- **Advanced table**: 85 tests
- **Error handling**: 57 tests
- **Total**: 208 component tests

### E2E Tests (frontend/tests/e2e)
- **User flows**: 64 tests
- **Performance**: 43 tests
- **Total**: 107 E2E tests

### Grand Total: 545+ tests

---

## Success Metrics & Monitoring

### Performance Metrics
- **Search latency (cached)**: <300ms (95th percentile)
- **Search latency (uncached)**: <2s (95th percentile)
- **Table load time**: <2s for 300 rows
- **Cache hit rate**: >80% for top 100 queries

### Usage Metrics
- **Simple mode usage**: >90% of users
- **Time-to-select**: 30%+ reduction from baseline
- **Error state rate**: <5% of searches
- **Conversion rate**: >95% (search → selection)

### Quality Metrics
- **False "not found" errors**: 0
- **WCAG 2.1 AA compliance**: 100%
- **Test coverage**: >90%
- **User satisfaction (NPS)**: >50

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| FDA API rate limits hit during high search volume | High | Medium | Implement aggressive caching, use batch queries, add fallback to RxNorm-only mode |
| Advanced table overwhelms users instead of helping | Medium | Low | Make simple mode default, require explicit toggle, add onboarding tooltip |
| Ranking algorithm doesn't match pharmacist expectations | High | Medium | User testing with 5+ pharmacists, make ranking weights configurable |
| Performance degrades with 1000+ search results | Medium | Low | Implement virtual scrolling, server-side pagination, limit results to top 300 |
| Mobile table view is unusable | Medium | Medium | Switch to card-based view on mobile, hide less important columns |

---

## Future Enhancements (Post-Launch)

1. **Fuzzy Matching** - Better handling of misspellings
2. **Favorites** - Save frequently searched medications
3. **Recent Searches** - Quick access to last 10 searches
4. **Formulary Mode** - Filter by local pharmacy inventory
5. **Medication Images** - Show pill/bottle images
6. **Barcode Scan** - Scan NDC barcode to search
7. **Offline Mode** - Cache common medications for offline use
8. **AI-Powered Suggestions** - "Users who searched for X also searched for Y"

---

## Timeline

**Week 1-2**: Backend foundation (PR-12A, PR-12B, PR-12C)  
**Week 3-4**: Frontend core (PR-12D, PR-12E)  
**Week 5**: Polish (PR-12F, PR-12G)  
**Week 6**: Testing & launch (PR-12H)

**Total Duration**: 6 weeks (with buffer)

---

## Approval Checklist

- [ ] PRD reviewed and approved
- [ ] Architecture design reviewed
- [ ] API contract finalized
- [ ] UI/UX designs approved
- [ ] Performance targets agreed upon
- [ ] Test coverage targets agreed upon
- [ ] Feature flag strategy approved
- [ ] Rollout plan approved

---

**END OF IMPLEMENTATION PLAN**


