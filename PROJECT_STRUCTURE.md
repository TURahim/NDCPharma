# NDC Calculator - Project Structure Quick Reference

**Last Updated**: November 18, 2025  
**Purpose**: Quick reference for new chat instances to understand the codebase structure

---

## 📁 Repository Structure

```
NDC/
├── frontend/                    # Next.js 16 frontend (React 19)
├── apps/
│   └── functions/              # Firebase Cloud Functions (Node 20)
├── packages/                   # Shared monorepo packages
│   ├── api-contracts/          # Zod schemas & types
│   ├── domain-ndc/             # Core business logic
│   ├── clients-rxnorm/         # RxNorm API client
│   ├── clients-openfda/        # FDA API client
│   ├── clients-openai/         # OpenAI integration
│   ├── core-config/            # Environment & config
│   ├── core-guardrails/        # Logging, errors, validation
│   └── data-cache/             # Firestore caching
├── docs/                       # Documentation (organized by type)
└── pnpm-workspace.yaml         # Monorepo config
```

---

## 🎨 Frontend (`frontend/`)

**Tech Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI

### Key Files

**`app/`** - Next.js App Router
- `page.tsx` - Landing page with simplified calculator
- `dashboard/page.tsx` - Main calculator dashboard (authenticated)
- `layout.tsx` - Global layout with header/footer

**`components/`** - React components (50+)
- `header.tsx` - Global navigation, auth state, logo (links to landing page)
- `hero.tsx` - Landing page hero with simplified calculator
- `calculator/enhanced-calculator.tsx` - Main calculation form
- `calculator/alternative-drugs-modal.tsx` - AI alternatives modal (when drug not found)
- `calculator/drug-comparison-view.tsx` - Side-by-side drug comparison with AI text
- `dashboard/calculation-result.tsx` - Displays NDC results with package details
- `dashboard/status-indicators.tsx` - Warnings, excluded NDCs, overfill/underfill
- `dashboard/excluded-ndcs-modal.tsx` - Modal showing inactive/excluded NDCs

**`lib/`**
- `api-client.ts` - Frontend API client (calls backend endpoints)
- `auth.ts` - Firebase Auth integration

**`hooks/`**
- `useAuth.ts` - Authentication state management
- `useCalculation.ts` - Calculation state & API calls

**`package.json`**
- Engines: Node 22.x (for Vercel)
- Scripts: `dev`, `build`, `vercel-build`

---

## 🔧 Backend (`apps/functions/`)

**Tech Stack**: Firebase Cloud Functions, Express, TypeScript, Node 20

### Entry Point

**`src/index.ts`** - Main Cloud Functions entry
- Express app setup
- CORS configuration (allows localhost:3000, localhost:3001, *.vercel.app)
- Global middlewares (helmet, cors, logging, redaction)
- Route definitions for `/v1/calculate`, `/v1/alternatives`, `/v1/health`, `/v1/analytics`

### API Endpoints (`src/api/v1/`)

**`calculate.ts`** - Main calculation endpoint (POST /v1/calculate)
- **5-step orchestration**:
  1. Drug normalization (RxNorm)
  2. Fetch NDC packages (FDA)
  3. Filter active packages
  4. **Liquid vs Solid detection** (NEW - PR-11)
  5. Calculate quantity & select package
  6. Optional AI enhancement
- **Liquid medication path** (lines 274-402):
  - Detects concentration from FDA data
  - Calls `calculateLiquidQuantity()` for mg→mL conversion
  - Uses `selectLiquidPackages()` for mL-based selection
  - Returns liquid-specific fields (`liquidCalculation`, `medicationType`)
- **Solid medication path** (lines 403-502):
  - Uses `computeTotalQuantity()` for dose × frequency × days
  - Uses `chooseBestPackage()` for tablet/capsule selection
- Helper: `isLiquidMedication()` - Detects liquid by unit=ML, concentration presence, or dosage form

**`alternatives.ts`** - Drug alternatives endpoint (POST /v1/alternatives)
- Requires authentication
- Calls RxNorm `findRelatedDrugs()` for therapeutic alternatives
- Checks FDA availability for each alternative
- Uses OpenAI `compareAlternatives()` for AI comparison text
- Returns alternatives with similarity/substitution guidance

**`health.ts`** - Health check (GET /v1/health)

**`analytics.ts`** - Analytics endpoints (GET /v1/analytics/*)
- System analytics (admin only)
- User analytics (user-specific)
- API health metrics

### Middlewares (`src/api/v1/middlewares/`)

**`auth.ts`**
- `verifyToken()` - Requires Firebase Auth token
- `optionalAuth()` - Allows authenticated + anonymous users
- `checkRole()` - Role-based access control

**`validate.ts`** - Zod request validation

**`rateLimit.ts`**
- Token bucket algorithm
- Different limits for auth vs anonymous
- Firestore-backed + in-memory fallback

**`redact.ts`** - PHI/PII redaction for logging

**`logging.ts`** - Request/response logging with correlation IDs

**`error.ts`** - Global error handling

### Tests (`tests/contract/`)

**`calculator.test.ts`**
- 31 integration tests (7 failing due to old mock format)
- **22 liquid medication tests** (NEW - PR-11C):
  - 5 happy path (Amoxicillin, Azithromycin, Augmentin, Insulin, Cephalexin)
  - 3 error cases (concentration missing)
  - 5 validation warnings (dose alignment, large volumes, multiple bottles)
  - 5 explanations tests (concentration parsing, mg→mL conversion, formulas)
  - 4 backwards compatibility tests (solid dosage unchanged)

---

## 📦 Shared Packages (`packages/`)

### `api-contracts/` - API Schemas & Types

**`src/calculate.schema.ts`**
- Zod schemas for `/v1/calculate` request/response
- `CalculateRequestSchema`, `CalculateResponseSchema`

**`src/alternatives.schema.ts`**
- Zod schemas for `/v1/alternatives` request/response
- `AlternativesRequestSchema`, `AlternativesResponseSchema`

**`src/index.ts`** - Exports all schemas and types

---

### `domain-ndc/` - Core Business Logic (Pure Functions)

**Liquid Medication Support (PR-11):**

**`src/concentrationParser.ts`** (PR-11A)
- `parseConcentration()` - Parse "250 MG/5 ML" → {value: 250, perValue: 5, ratio: 50}
- `isConcentrationString()` - Detect concentration format
- `normalizeConcentrationUnits()` - G→MG, L→ML conversions
- `calculateConcentrationRatio()` - Calculate mg/mL ratio
- `detectConcentrationFormat()` - Classify format (mg/ml, g/ml, units/ml)
- 53 tests covering standard formats, gram notation, insulin, spacing variations

**`src/liquidCalculator.ts`** (PR-11B)
- `calculateLiquidQuantity()` - Main calculator: mg dose → mL volume
  - Formula: doseMg ÷ concentration.ratio = mLPerDose
  - Then: mLPerDose × frequency × daysSupply = totalML
- `convertMgToML()` - Convert mg to mL using concentration ratio
- `validateLiquidDose()` - Warnings for dose alignment, large/small volumes
- `generateLiquidFormula()` - Human-readable formula ("8 mL/dose × 3 doses/day × 7 days = 168 mL")
- `validateLiquidVolume()` - Check if total volume is reasonable (5-1000 mL)
- `isReasonableLiquidVolume()` - Range validation helper
- 42 tests covering standard calculations, fractional doses, high-frequency dosing, long therapy

**`src/dosageForm.ts`** (PR-11B)
- `getDosageFormType()` - Categorize: SOLID, LIQUID, INJECTABLE, SPECIAL
- `isLiquidDosageForm()` - Detect liquid forms (SUSPENSION, SOLUTION, SYRUP, etc.)
- `normalizeDosageForm()` - Standardize dosage form strings
- `getDosageFormFamily()` - Group related forms (e.g., TABLET + CAPSULE = solid)
- `filterByDosageFormFamily()` - Filter packages by form family

**`src/packageMatch.ts`**
- `chooseBestPackage()` - Smart package selection for solid dosage (exact → minimal overfill)
- `selectLiquidPackages()` - mL-based package selection (PR-11B)
  - Normalizes L→ML for bottle sizes
  - 1mL exact match tolerance (rounding)
  - Prioritizes <10% overfill for single bottles
  - Warns for multi-bottle needs or significant overfill
- `calculateFillPrecision()` - Overfill/underfill calculation

**Solid Medication (Legacy):**

**`src/quantity.ts`**
- `computeTotalQuantity()` - Calculate total quantity for solid dosage
- `parseStructuredSIG()` - Parse prescription instructions
- `convertDoseUnit()` - Unit conversion for doses

**`src/validation.ts`**
- `validateNDC()` - NDC format validation (10/11-digit)
- `isValidNDCFormat()` - Check NDC structure
- `normalizeNDC()` - Standardize NDC format to 5-4-2

**`src/unitConverter.ts`**
- `convertUnit()` - Bidirectional unit conversion (ML↔L, MG↔GM↔MCG, TABLET↔CAPSULE)
- `normalizeUnit()` - Standardize unit strings
- 99 tests covering 4 unit categories (solid, liquid, weight, special)

**`src/types.ts`**
- Core domain types: `Concentration`, `LiquidCalculationInput`, `LiquidCalculationResult`
- `DosageFormType`, `PackageCandidate`, `PackageSelection`
- `SIGInput`, `QuantityResult`

**`README.md`** - Package documentation with liquid calculation examples

---

### `clients-rxnorm/` - RxNorm API Client

**`src/facade.ts`** - Public API
- `nameToRxCui()` - Normalize drug name to RxCUI (uses 3-strategy normalization)
- `rxcuiToNdcs()` - Get NDCs for an RxCUI
- `getAlternativeDrugs()` - Find therapeutic alternatives (NEW - for alternatives feature)

**`src/internal/rxnormService.ts`** - HTTP client
- `searchByName()` - Search drugs by name
- `getApproximateMatches()` - Fuzzy matching
- `getSpellingSuggestions()` - Spelling correction
- `getRxCUIProperties()` - Get drug properties (name, TTY, etc.)
- `getRelatedConcepts()` - Find related drugs (same class, same ingredient)
- `getAllRelatedInfo()` - All related information for an RxCUI
- `getNDCs()` - Get NDC codes for an RxCUI
- Retry logic with exponential backoff

**`src/internal/normalizer.ts`** - 3-strategy drug normalization
- Strategy 1: Exact match
- Strategy 2: Approximate (fuzzy) match
- Strategy 3: Spelling correction
- Returns best match with confidence score

**`src/internal/alternativeFinder.ts`** (NEW)
- `findRelatedDrugs()` - Find alternative drugs for an RxCUI
- Uses RxNorm related concepts + ingredient search
- Filters for clinical drug forms (SCD, SBD)
- Returns top 10 alternatives with relationship type

**`src/internal/rxnormMapper.ts`** - Data transformation
- Maps RxNorm API responses to internal types
- Confidence score calculation

**`src/internal/rxnormTypes.ts`** - Type definitions

**`src/cachedFacade.ts`** - Cached wrapper (Firestore)
- `nameToRxCuiCached()` - Cached drug normalization (24h TTL)
- `rxcuiToNdcsCached()` - Cached NDC lookup (1h TTL)

**51 unit tests**

---

### `clients-openfda/` - FDA API Client

**`src/index.ts`** - Public API
- `fdaClient.getNDCsByRxCUI()` - Primary: Get NDCs by RxCUI (most reliable)
- `fdaClient.searchByNDC()` - Get package details by NDC
- `fdaClient.getPackagesByNdcList()` - Batch NDC lookup
- `fdaClient.checkDrugAvailability()` - Quick check if drug exists in FDA

**`src/internal/fdaService.ts`** - HTTP client
- `searchByRxCUI()` - Search by RxCUI (primary data source)
- `searchByNDC()` - Search by NDC code
- Retry logic with exponential backoff

**`src/internal/fdaMapper.ts`** - Data transformation
- `mapFDAResultToNDCPackage()` - Transform FDA response to NDCPackage
- **`extractConcentration()`** (NEW - PR-11B) - Parse concentration from FDA `active_ingredients[0].strength`
  - Dynamically imports concentration parser
  - Calls `parseConcentration()` from domain-ndc
  - Populates `concentration` field on NDCPackage
- `parsePackageSize()` - Extract quantity/unit from description
- `parseMarketingStatus()` - Determine active/discontinued status
- `filterByDosageForm()` - Filter packages by dosage form
- `filterActivePackages()` - Filter active packages only
- `sortByPackageSize()` - Sort packages by size

**`src/internal/fdaTypes.ts`** - Type definitions
- `NDCPackage` - Core package type
  - **`concentration?: Concentration`** (NEW - PR-11B) - Optional concentration field for liquids
- `FDANDCResult`, `FDAPackaging`, `MarketingStatus`, `PackageSize`, `ActiveIngredient`

**`src/cachedClient.ts`** - Cached wrapper (Firestore)

**Tests:**
- 14 fdaService tests
- 36 fdaMapper tests
- **24 concentration extraction tests** (NEW - PR-11B) - test extractConcentration() for various formats

---

### `clients-openai/` - OpenAI Integration

**`src/internal/openaiService.ts`** - OpenAI client
- `getRecommendation()` - Get AI-enhanced NDC recommendation
- `isAvailable()` - Check if OpenAI is enabled
- `isEnabled()` - Alias for isAvailable()
- `chat()` - Simple chat completion helper (NEW - for alternatives)
- Circuit breaker pattern (opens after 3 failures, retries after 5min)
- Cost tracking ($0.005/1K input tokens, $0.015/1K output tokens for gpt-4o)

**`src/internal/recommender.ts`** - NDC recommender
- `getEnhancedRecommendation()` - AI + algorithmic fallback
- Feature-flagged (OFF by default)

**`src/internal/alternativeComparator.ts`** (NEW)
- `compareAlternatives()` - Generate AI comparison text for drug alternatives
- System prompt optimized for clinical pharmacist guidance
- Explains similarities (therapeutic class, indication, mechanism)
- Notes differences (strength, formulation, dosing)
- Provides substitution recommendations
- Fallback to generic responses if OpenAI unavailable

**`src/internal/prompts.ts`** - AI prompts for NDC recommendation

**`src/internal/phiSanitizer.ts`** - PHI/PII redaction for AI inputs

---

### `core-config/` - Environment & Configuration

**`src/environment.ts`**
- Environment variable schema (Zod validation)
- `getCorsOrigins()` - Returns allowed CORS origins
- **CORS_ALLOWED_ORIGINS default**: `http://localhost:3000,http://localhost:3001,https://ndc-pharma-functions-kr3j.vercel.app`
- Feature flags: `ENABLE_OPENAI`, `ENABLE_CACHING`, `ENABLE_ANALYTICS`

**`src/constants.ts`**
- App constants (timeouts, rate limits, cache TTLs)

**`src/featureFlags.ts`**
- Feature flag definitions
- `USE_ENHANCED_NORMALIZATION` (ON by default)
- `ENABLE_OPENAI_ENHANCER` (OFF by default)
- `ENABLE_ADVANCED_CACHING` (OFF by default)

---

### `core-guardrails/` - Logging, Errors, Validation

**`src/logger.ts`**
- Structured logger with correlation IDs
- Methods: `info()`, `warn()`, `error()`, `debug()`
- External API call logging

**`src/errors.ts`**
- Custom error types: `APIError`, `ValidationError`, `NotFoundError`

**`src/validators.ts`**
- Common validation functions

**`src/calculationLogger.ts`**
- Audit logging for calculations
- PHI redaction before logging

**`src/rateLimit.ts`**
- Token bucket rate limiter
- Firestore-backed + in-memory fallback

---

### `data-cache/` - Firestore Caching

**`src/cacheService.ts`**
- `get()` - Get cached value
- `set()` - Store value with TTL
- `invalidate()` - Invalidate cache entry
- `cleanupExpired()` - Remove expired entries
- TTL support with automatic expiration

---

## 📚 Documentation (`docs/`)

Organized by type (no more clutter in root):

**`summaries/`** - PR summaries and completion reports

**`guides/`** - Implementation guides (cache integration, etc.)

**`investigations/`** - Investigation reports (FDA API, etc.)

**`fixes/`** - Fix documentation

**`plans/`** - Implementation plans

**`tests/`** - Test documentation

**`prd/`** - Product requirements

**`README.md`** - Documentation index with quick links

---

## 🧪 Testing

### Test Coverage (457+ tests total)

- **PR-02**: RxNorm client - 51 tests
- **PR-03**: FDA client - 14 tests, mapper - 36 tests, validation - 43 tests
- **PR-04**: Quantity - 28 tests, package matching - 43 tests, unit converter - 99 tests
- **PR-06**: Calculator endpoint - 20 integration tests
- **PR-11**: Liquid medication support - 141 tests
  - Concentration parser - 53 tests
  - Liquid calculator - 42 tests
  - FDA concentration extraction - 24 tests
  - Backend integration - 22 tests

### Run Tests

```bash
# All tests
pnpm -r test

# Specific package
cd packages/domain-ndc
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm coverage
```

---

## 🚀 Development

### Start Frontend
```bash
cd frontend
pnpm dev
# Opens on http://localhost:3001
```

### Start Backend (Firebase Emulator)
```bash
cd apps/functions
pnpm serve
# Functions available at http://localhost:5001
```

### Build All Packages
```bash
pnpm -r build
```

### Deploy Backend
```bash
cd apps/functions
firebase deploy --only functions
```

### Deploy Frontend
```bash
cd frontend
vercel deploy
```

---

## 🔑 Key Features Implemented

✅ **Drug Normalization** (3-strategy: exact/fuzzy/spelling)  
✅ **NDC Lookup** (FDA primary, RxNorm fallback)  
✅ **Active Package Filtering** (marketing status)  
✅ **Quantity Calculation** (solid + liquid)  
✅ **Package Selection** (waste minimization)  
✅ **AI Enhancement** (optional, feature-flagged)  
✅ **Liquid Medication Support** (PR-11, 141 tests)  
✅ **Drug Alternatives** (AI-powered comparison)  
✅ **Rate Limiting** (token bucket, Firestore-backed)  
✅ **Caching** (Firestore, 24h drugs / 1h NDCs)  
✅ **PHI Redaction** (logging, AI inputs)  
✅ **Authentication** (Firebase Auth, optional/required routes)  
✅ **Analytics** (system, user, API health)

---

## 📖 Example: Liquid Medication Flow

1. User enters "Amoxicillin 250 MG/5 ML Oral Suspension", "400 mg three times daily for seven days", 7 days supply
2. Frontend sends to `/v1/calculate` with `unit: "ML"` (triggers liquid detection)
3. Backend normalizes to RxCUI 723
4. FDA returns packages with concentration `250 MG/5 ML` → parsed to ratio 50 mg/mL
5. `isLiquidMedication()` returns true (unit=ML + concentration present)
6. **Liquid path**: `calculateLiquidQuantity()` converts:
   - 400 mg ÷ 50 mg/mL = 8 mL per dose
   - 8 mL × 3 doses/day = 24 mL/day
   - 24 mL × 7 days = 168 mL total
7. `selectLiquidPackages()` finds 200 mL bottle (19% overfill)
8. Response includes `liquidCalculation` fields + formula + warnings
9. Frontend displays liquid-specific result with mL amounts

---

## 🔧 Common Issues

**CORS Error**: Backend CORS config only allows `localhost:3000`, `localhost:3001`, `*.vercel.app`
- Fix: Update `CORS_ALLOWED_ORIGINS` in `packages/core-config/src/environment.ts` and redeploy

**"Drug not found"**: FDA has no packages for that RxCUI
- Fix: Use a different formulation (e.g., "Amoxicillin Oral Solution" RxCUI 723 instead of branded)

**Build Errors**: Monorepo dependency order
- Fix: `pnpm -r build` builds all packages in correct order

**Test Failures**: Old mocks use string `marketingStatus` instead of object `{isActive: boolean, status: string}`
- Fix: Update test mocks to use correct format

---

**END OF QUICK REFERENCE**

