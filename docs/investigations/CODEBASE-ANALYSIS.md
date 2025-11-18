# 📊 Codebase Analysis - Foundation Health NDC Calculator

**Date**: 2025-01-13  
**Purpose**: Analysis for implementing enhanced UX features

---

## 1. Current Stack

### **Frontend Framework**
- ✅ **Next.js 16.0.0** (React-based, App Router)
- ✅ **React 19.2.0** with TypeScript
- ✅ **Tailwind CSS** for styling
- ✅ **Radix UI + Shadcn/ui** for component primitives
- ✅ **pnpm** workspaces for monorepo management

### **Backend**
- ✅ **Firebase Cloud Functions** (Node.js 20)
- ✅ **Express.js** for API routing
- ✅ **TypeScript** across the board

---

## 2. Main Calculator UI

### **Primary Components**

1. **`frontend/components/hero.tsx`**
   - **Current home page calculator** (lines 85-229)
   - Embedded in landing page hero section
   - Features:
     - Drug name/NDC input
     - SIG input (free text)
     - Days supply input
     - Inline SIG parser (`parseSig()` function)
     - Result display (success/error states)
   - State: React useState for form values, loading, result, error
   - API call: `calculateNDC()` from `lib/api-client.ts`

2. **`frontend/components/calculator/calculator.tsx`**
   - Standalone calculator component (more comprehensive)
   - Orchestrates form submission and results display
   - Uses `CalculatorForm` and `CalculatorResults` sub-components
   - Includes Firebase auth integration (`useAuth()`)

3. **`frontend/components/calculator/calculator-form.tsx`**
   - Rich form with React Hook Form + Zod validation
   - Two modes: Structured SIG vs. Free-text SIG
   - Comprehensive validation and error handling

4. **`frontend/components/calculator/calculator-results.tsx`**
   - Displays calculation results with detailed breakdown
   - Shows package recommendations, warnings, inactive NDCs

### **Routes**
- `/` → Home page with hero calculator (`app/page.tsx`)
- `/dashboard` → Protected dashboard (minimal placeholder currently)
- `/auth/signin`, `/auth/signup` → Authentication pages

---

## 3. API Endpoints & Integration

### **Frontend API Client**
**File**: `frontend/lib/api-client.ts`

```typescript
export async function calculateNDC(
  request: CalculateRequest,
  idToken: string | null
): Promise<CalculateResponse>
```

- **Endpoint**: `POST ${API_URL}/v1/calculate`
- **Config**: `NEXT_PUBLIC_API_URL` env variable
- **Default**: `http://localhost:5001/ndcpharma-8f3c6/us-central1/api`
- **Auth**: Optional Bearer token (Firebase ID token)
- **Error handling**: Custom `APIError` class with status codes

### **Backend API Structure**

**Base**: `apps/functions/src/api/v1/`

1. **`calculate.ts`** - Main calculation endpoint
   - Validates input (Zod schema)
   - Orchestrates RxNorm + FDA + domain logic
   - Returns structured JSON with recommendations

2. **`health.ts`** - Health check endpoint

3. **`analytics.ts`** - Admin-only analytics (system/user/health metrics)

### **RxNorm Client Capabilities**

**Package**: `packages/clients-rxnorm/`

**Available Methods** (from `rxnormService.ts`):

```typescript
// Exact name search
async searchByName(request: RxNormSearchRequest): Promise<RxNormSearchResponse>

// Fuzzy/approximate search (PERFECT FOR AUTOCOMPLETE!)
async getApproximateMatches(
  request: RxNormApproximateMatchRequest
): Promise<RxNormApproximateMatchResponse>

// Spelling suggestions
async getSpellingSuggestions(
  request: RxNormSpellingSuggestionRequest
): Promise<RxNormSpellingSuggestionResponse>

// Get drug properties by RxCUI
async getRxCUIProperties(rxcui: RxCUI): Promise<RxNormPropertiesResponse>
```

**Key Parameters**:
- `term`: Search query (e.g., "lisin" for autocomplete)
- `maxEntries`: Limit results (default: 10-15 is reasonable)
- `option`: Search options (0=default, 1=no synonyms, 2=prescription only)

**Facade**: `packages/clients-rxnorm/src/facade.ts`
- `nameToRxCui(drugName: string)` - Main normalization function
- Cached version available: `cachedFacade.ts`

---

## 4. Medication Data Sources

### **External APIs (No Internal DB)**

1. **RxNorm API** (National Library of Medicine)
   - Drug normalization and search
   - RxCUI (standard drug code) resolution
   - Approximate match for fuzzy search
   - **FREE, no API key required**

2. **openFDA NDC Directory API**
   - NDC package lookup
   - Active/inactive status
   - Package sizes and dosage forms
   - **FREE, optional API key for higher rate limits**

3. **OpenAI API** (Optional, currently disabled)
   - AI-powered SIG parsing
   - Feature-flagged OFF by default

### **Caching Layer**

**Package**: `packages/data-cache/`

- **Firestore-based cache** with TTL
- Cache-aside pattern
- Separate TTLs for drug data (24h) and NDC data (1h)
- SHA-256 key hashing for security
- Cache statistics tracking

**Collections**:
- `calculationCache` - Cached API responses
- `calculationLogs` - Audit trail of calculations
- `userActivity` - Rate limiting and analytics

---

## 5. Persistence Layers

### **Current State**

✅ **Firebase Authentication**
- User accounts (email/password)
- Role-based access control (admin, pharmacist, technician)
- JWT verification
- Test users created in PR-08

✅ **Firestore Collections**
- `users` - User profiles and roles
- `userActivity` - Activity tracking for rate limiting
- `calculationLogs` - Audit logs of all calculations (timestamp, input, output, user)
- `calculationCache` - Cached external API responses

❌ **NO "Recent Calculations" Storage Yet**
- No dedicated collection for user's recent calculations
- `calculationLogs` has all data but needs user-specific query
- **Opportunity**: Create `recentCalculations` collection or query `calculationLogs` by userId

❌ **NO "Frequent Medications" Storage Yet**
- No pinning or frequency tracking
- **Opportunity**: Aggregate from `calculationLogs` or create `frequentMedications` collection

### **Local Storage Considerations**
- Currently unused for calculations
- Could be used for:
  - Anonymous user recent calculations (before sign-in)
  - UI preferences (guided mode state, collapsed panels)
  - Temporary draft calculations

---

## 6. Type Definitions

**File**: `frontend/types/api.ts`

```typescript
interface CalculateRequest {
  drug: { name?: string; rxcui?: string };
  sig: { dose: number; frequency: number; unit: string };
  daysSupply: number;
}

interface PackageRecommendation {
  ndc: string;
  packageSize: number;
  unit: string;
  dosageForm: string;
  marketingStatus?: string;
  isActive: boolean;
}

interface CalculateResponse {
  success: boolean;
  data?: {
    drug: { rxcui: string; name: string; dosageForm?: string; strength?: string };
    totalQuantity: number;
    recommendedPackages: PackageRecommendation[];
    overfillPercentage: number;
    underfillPercentage: number;
    warnings: string[];
    excluded?: ExcludedNDC[];
    explanations: Explanation[];
  };
  error?: { code: string; message: string; details?: unknown };
}
```

---

## 7. Key Findings for Implementation

### **✅ What We Have**

1. **Robust calculator logic** - Working end-to-end
2. **RxNorm fuzzy search** - Perfect for autocomplete (`getApproximateMatches`)
3. **Firestore audit logs** - All calculations logged with timestamps
4. **User authentication** - Ready for personalized features
5. **Clean component architecture** - Easy to extend
6. **Type safety** - Full TypeScript coverage
7. **Error handling** - Comprehensive error states and messages

### **🔧 What We Need to Build**

1. **Autocomplete dropdown** - Wire up RxNorm `getApproximateMatches` to frontend
2. **Recent calculations UI** - Query `calculationLogs` by userId or create new collection
3. **Frequent medications** - Aggregate from logs or create persistence layer
4. **Status indicators** - Extract from existing response (inactive NDCs, overfill/underfill %)
5. **AI insights card** - Stub initially, can integrate OpenAI later
6. **Multi-pack helper** - UI toggle, backend logic may need enhancement
7. **Guided mode** - Pure frontend stepper component
8. **Local storage** - For anonymous users and UI state

### **📊 Recommended Approach**

**Phase 1 (MVP)**: Use existing data
- Recent calculations: Query `calculationLogs` (already has all data)
- Frequent medications: Client-side aggregation from recent calculations
- Local storage: Fallback for unauthenticated users

**Phase 2 (Optimization)**: Add dedicated collections
- `recentCalculations` - User-specific, optimized queries
- `frequentMedications` - Pre-aggregated stats
- `userPreferences` - UI settings, pinned medications

---

## 8. File Structure Summary

```
frontend/
├── app/
│   ├── page.tsx                    # Home page (hero calculator)
│   ├── layout.tsx                  # Root layout with auth provider
│   ├── dashboard/
│   │   └── page.tsx                # Dashboard placeholder
│   └── auth/
│       ├── signin/page.tsx         # Sign-in (working)
│       └── signup/page.tsx         # Sign-up (working)
├── components/
│   ├── hero.tsx                    # ⭐ Main landing calculator
│   ├── calculator/
│   │   ├── calculator.tsx          # Orchestrator component
│   │   ├── calculator-form.tsx     # Rich form with validation
│   │   └── calculator-results.tsx  # Results display
│   ├── header.tsx
│   ├── footer.tsx
│   └── ui/                         # Shadcn components
├── lib/
│   ├── api-client.ts               # ⭐ Backend API calls
│   ├── firebase.ts                 # Firebase config
│   └── auth-context.tsx            # Auth provider
└── types/
    └── api.ts                      # ⭐ API type definitions

packages/
├── clients-rxnorm/                 # ⭐ RxNorm API client
│   ├── src/
│   │   ├── facade.ts               # Public API
│   │   ├── cachedFacade.ts         # Cached version
│   │   └── internal/
│   │       ├── rxnormService.ts    # ⭐ Search methods here!
│   │       └── rxnormTypes.ts      # Type definitions
├── clients-openfda/                # FDA NDC API client
├── domain-ndc/                     # Calculation logic
├── data-cache/                     # Firestore cache layer
└── core-guardrails/                # Logging, validation

apps/functions/
└── src/
    └── api/v1/
        ├── calculate.ts            # ⭐ Main endpoint
        ├── analytics.ts            # Admin analytics
        └── middlewares/
```

---

## 9. Next Steps

**Ready to implement**:
1. Create implementation plan (next document)
2. Start with autocomplete (lowest risk, highest impact)
3. Layer on recent calculations and frequent meds
4. Add status indicators and helper cards
5. Implement guided mode last (most complex)

**No blockers identified** - All necessary infrastructure exists!

---

**Analysis Complete** ✅

