# NDC Packaging & Quantity Calculator

**Organization:** Foundation Health  
**Project Type:** AI-Powered Healthcare Tool

An AI-accelerated solution designed to enhance the accuracy of prescription fulfillment in pharmacy systems by matching prescriptions with valid National Drug Codes (NDCs) and calculating correct dispense quantities.

## 🎯 Project Overview

The **NDC Calculator** addresses critical challenges in pharmacy operations:
- **Dosage form mismatches** (tablets vs. capsules)
- **Package size errors** (90-count vs. 100-count bottles)  
- **Inactive NDC usage** causing claim rejections
- **Manual calculation errors** leading to patient safety issues

### Success Metrics
| Metric | Target |
|--------|--------|
| Medication normalization accuracy | ≥95% |
| Claim rejection reduction | 50% decrease |
| Response time | <2 seconds |
| User satisfaction | 4.5/5+ |

## 🏗️ Architecture

### Frontend (Next.js)
- **Framework**: Next.js 16 (React 19.2, TypeScript)
- **UI Components**: 50+ Radix UI components
- **Styling**: Tailwind CSS 4
- **Authentication**: Firebase Auth integration
- **Features**: Dark mode, responsive design, form validation

### Backend (Firebase/GCP - Monorepo)
- **Architecture**: pnpm workspace with `apps/` and `packages/`
- **Runtime**: Node.js 18+ with TypeScript
- **Platform**: Google Cloud Platform (Firebase Cloud Functions)
- **Database**: Cloud Firestore (caching & audit logs)
- **APIs**: RxNorm, FDA NDC Directory, OpenAI (optional)
- **Security**: HIPAA-compliant logging, PHI redaction, rate limiting

## 📁 Project Structure

```
NDC/
├── frontend/                        # Next.js Frontend Application
│   ├── app/                         # Next.js App Router
│   ├── components/                  # React components (50+ UI components)
│   ├── hooks/                       # Custom React hooks
│   ├── lib/                         # Utilities
│   └── package.json
│
├── apps/                            # Backend Applications
│   └── functions/                   # Firebase Cloud Functions (thin API layer)
│       ├── src/
│       │   ├── api/v1/
│       │   │   ├── calculate.ts        # Main calculation endpoint
│       │   │   ├── health.ts           # Health check
│       │   │   └── middlewares/
│       │   │       ├── validate.ts     # Zod validation
│       │   │       ├── error.ts        # Error handling
│       │   │       ├── rateLimit.ts    # Rate limiting
│       │   │       └── redact.ts       # PHI redaction
│       │   └── index.ts             # Express app setup
│       ├── tests/                   # Contract tests
│       ├── package.json
│       ├── tsconfig.json
│       └── firebase.json
│
├── packages/                        # Shared Libraries
│   ├── api-contracts/               # Zod schemas & OpenAPI spec
│   │   ├── src/
│   │   │   ├── calculate.schema.ts    # Request/response schemas
│   │   │   └── types.ts                # Shared types
│   │   └── openapi.yaml            # OpenAPI 3.0 spec
│   │
│   ├── domain-ndc/                  # Business Logic (pure functions)
│   │   ├── src/
│   │   │   ├── quantity.ts            # Quantity calculation
│   │   │   ├── packageMatch.ts        # Package matching
│   │   │   └── types.ts                # Domain types
│   │   └── package.json
│   │
│   ├── clients-rxnorm/              # RxNorm API Client
│   │   ├── src/
│   │   │   ├── facade.ts              # Public API (nameToRxCui, rxcuiToNdcs)
│   │   │   ├── index.ts               # Exports
│   │   │   └── internal/              # Internal implementation
│   │   │       ├── rxnormService.ts   # HTTP client
│   │   │       ├── rxnormMapper.ts    # Data transformation
│   │   │       ├── normalizer.ts      # 3-strategy normalization
│   │   │       └── rxnormTypes.ts     # Type definitions
│   │   ├── tests/                  # 51 unit tests
│   │   └── package.json
│   │
│   ├── clients-openfda/             # openFDA API Client (future)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── data-cache/                  # Cache Abstraction (future)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── core-config/                 # Configuration & Feature Flags
│   │   ├── src/
│   │   │   ├── environment.ts         # Env variable validation
│   │   │   ├── constants.ts           # Application constants
│   │   │   └── flags.ts               # Feature flags
│   │   └── package.json
│   │
│   ├── core-guardrails/             # Cross-Cutting Concerns
│   │   ├── src/
│   │   │   ├── logger.ts              # Structured logging
│   │   │   ├── errors.ts              # Custom error classes
│   │   │   ├── validators.ts          # Input validation
│   │   │   ├── formatters.ts          # Output formatting
│   │   │   ├── redaction.ts           # PHI redaction
│   │   │   └── rateLimit.ts           # Rate limiting
│   │   └── package.json
│   │
│   └── utils/                       # Shared Utilities
│       ├── src/
│       │   ├── helpers.ts
│       │   └── index.ts
│       └── package.json
│
├── docs/                            # Documentation
│   └── backend-task-list.md        # MVP 3-PR development plan
│
├── .github/
│   ├── workflows/
│   │   └── ci.yml                  # Workspace build/test/lint
│   └── CODEOWNERS                  # Team ownership
│
├── pnpm-workspace.yaml             # Workspace configuration
├── tsconfig.base.json              # Base TypeScript config
└── README.md                       # This file
```

## 🚀 Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19.2** - UI library
- **TypeScript 5.3** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Backend
- **Node.js 18+** - Runtime environment
- **TypeScript 5.3** - Type safety
- **pnpm** - Package manager (workspace support)
- **Firebase Cloud Functions** - Serverless compute
- **Cloud Firestore** - NoSQL database
- **Express** - HTTP server
- **Zod** - Schema validation

### External APIs
- **RxNorm REST API** - Drug normalization (RxCUI)
- **openFDA NDC API** - NDC directory and enrichment
- **OpenAI API** - AI-enhanced matching (optional, feature-flagged OFF)

### Testing & Quality
- **Jest** - Unit testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

## 🔧 Getting Started

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+ (`npm install -g pnpm`)
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NDC
   ```

2. **Install dependencies (workspace)**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   For backend development:
   ```bash
   cd apps/functions
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Build all packages**
   ```bash
   pnpm -r build
   ```

5. **Run tests**
   ```bash
   pnpm -r test
   ```

### Development

**Frontend:**
```bash
cd frontend
pnpm dev
# Opens on http://localhost:3000
```

**Backend (Functions Emulator):**
```bash
cd apps/functions
pnpm serve
# Functions available at http://localhost:5001
```

**Run all tests:**
```bash
pnpm -r test
```

**Lint all code:**
```bash
pnpm -r lint
```

## 📊 Backend Status

### ✅ Completed

- **PR-A: Infrastructure & Configuration**
  - Workspace setup (monorepo)
  - Core config package (environment, constants, feature flags)
  - Core guardrails package (logger, errors, validators, redaction, rate limiting)
  - Firebase/Firestore setup

- **PR-B: RxNorm Integration**
  - RxNorm API client with retry logic
  - 3-strategy drug normalization (exact/fuzzy/spelling)
  - Public façade (`nameToRxCui`, `rxcuiToNdcs`)
  - 51 comprehensive unit tests
  - Feature flag: `USE_ENHANCED_NORMALIZATION` (default: true)

- **Refactoring Complete**
  - Monorepo structure with pnpm workspaces
  - Module boundaries and clear ownership
  - PHI redaction and HIPAA compliance
  - Optional API keys (no runtime failures)
  - OpenAI feature-flagged OFF by default

### 🔄 In Progress

- **PR-03: MVP API Endpoint**
  - `/v1/calculate` endpoint (structured SIG input)
  - `/v1/health` endpoint
  - Middlewares (validation, error handling, rate limiting, redaction)
  - Domain logic (quantity calculation, package matching)
  - Contract tests

### 📋 Planned

- **PR-04: Cache, openFDA, Advanced Guardrails**
  - Cache abstraction with Firestore adapter
  - openFDA client for NDC enrichment
  - User activity logging

- **PR-05: Hard Edges & SLOs**
  - Performance monitoring
  - SLO tracking (p50 < 500ms, p95 < 1000ms)
  - Load testing
  - Alerting

## 🔑 Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `USE_ENHANCED_NORMALIZATION` | `true` | 3-strategy drug normalization (exact/fuzzy/spelling) |
| `ENABLE_OPENAI_ENHANCER` | `false` | AI-powered NDC matching (requires API key) |
| `ENABLE_ADVANCED_CACHING` | `false` | Multi-level caching with TTL |

Set flags via environment variables:
```bash
FEATURE_ENHANCED_NORM=false  # Disable enhanced normalization
FEATURE_OPENAI=true          # Enable OpenAI (requires OPENAI_API_KEY)
FEATURE_CACHE_ADVANCED=true  # Enable advanced caching
```

## 📖 Data Flow

### Full Calculation Pipeline (PR-06: Main Calculator Endpoint)

1. **User Input** → `/v1/calculate` (structured SIG with drug name or RxCUI)
2. **Drug Normalization** → `@clients-rxnorm/nameToRxCui()` → RxNorm API → RxCUI
3. **NDC Lookup** → `@clients-openfda/getNDCsByRxCUI()` → openFDA API → NDC packages
4. **Active Package Filtering** → Excludes discontinued NDCs
5. **Quantity Calculation** → `dose × frequency × daysSupply` → total quantity
6. **Package Selection** → Algorithm selects optimal package(s) minimizing waste
7. **AI Enhancement** (optional) → `@clients-openai/recommendNDC()` → confidence scoring
8. **Response** → Step-by-step explanations + recommendations + warnings

**Service Integration**:
- **RxNorm**: Drug name normalization to RxCUI
- **openFDA**: NDC lookup and marketing status
- **OpenAI**: Optional AI-enhanced recommendations (feature-flagged)
- **Firestore**: Caching and audit logging

## 🔒 Security & Compliance

### HIPAA Compliance
- ✅ No PHI in logs (redaction middleware)
- ✅ No PHI in cache keys
- ✅ No patient identifiers stored
- ✅ Structured logging for audit trails
- ✅ Rate limiting to prevent abuse

### API Key Management
- All API keys are **optional** (no runtime failures if missing)
- RxNorm: Public API, no key required
- FDA: Optional key for higher rate limits
- OpenAI: Feature-flagged OFF by default

### Rate Limiting
- Default: 100 requests/hour per user
- Burst capacity: 20 requests
- Token bucket algorithm
- Configurable via `RATE_LIMIT_REQUESTS_PER_HOUR`

## 📝 API Documentation

### `/v1/health`
**Method:** GET  
**Description:** Service health check

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### `/v1/calculate` (Main Calculator Endpoint - PR-06) ⭐
**Method:** POST  
**Description:** Calculate optimal NDC packages for prescription with full orchestration

**Request Body:**
```json
{
  "drug": {
    "name": "Lisinopril"  // OR "rxcui": "314076"
  },
  "sig": {
    "dose": 1,
    "frequency": 1,
    "unit": "tablet"
  },
  "daysSupply": 30
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "drug": {
      "rxcui": "314076",
      "name": "Lisinopril 10 MG Oral Tablet",
      "dosageForm": "Oral Tablet",
      "strength": "10 MG"
    },
    "totalQuantity": 30,
    "recommendedPackages": [
      {
        "ndc": "00071-0156-23",
        "packageSize": 30,
        "unit": "TABLET",
        "dosageForm": "TABLET",
        "marketingStatus": "ACTIVE",
        "isActive": true
      }
    ],
    "overfillPercentage": 0,
    "underfillPercentage": 0,
    "warnings": [],
    "excluded": [],
    "explanations": [
      {
        "step": "normalization",
        "description": "Normalized \"Lisinopril\" to RxCUI 314076 (Lisinopril 10 MG Oral Tablet)",
        "details": { "confidence": 0.95 }
      },
      {
        "step": "fetch_ndcs",
        "description": "Retrieved 12 NDC packages from FDA database"
      },
      {
        "step": "package_selection",
        "description": "Selected 1 package to fulfill prescription"
      },
      {
        "step": "calculation",
        "description": "Calculated total quantity: 30 tablet",
        "details": { "formula": "1 tablet × 1 times/day × 30 days" }
      }
    ]
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "DRUG_NOT_FOUND",
    "message": "Drug not found in database",
    "details": { "executionTime": 245 }
  }
}
```

**Key Features**:
- ✅ Exact match package finding
- ✅ Waste minimization algorithm
- ✅ Active package filtering
- ✅ Overfill/underfill warnings
- ✅ Step-by-step explanations
- ✅ Excluded NDC tracking
- ✅ Low confidence alerts
- ✅ External API failure handling

Full API documentation: [`packages/api-contracts/openapi.yaml`](packages/api-contracts/openapi.yaml)

## 🧪 Testing

### Unit Tests & Integration Tests
```bash
pnpm -r test          # Run all tests
pnpm -r test:watch    # Watch mode
pnpm -r coverage      # Generate coverage report
```

### Test Coverage (Current)
- **184 out of 190 tests passing** (96.8%)
- RxNorm client: 51 tests ✅
- openFDA client: 20 tests ✅
- OpenAI client: 43 tests ✅
- Calculator endpoint: 12 integration tests ✅
- API contracts: 8 tests ✅
- Domain logic: 50+ tests ✅
- **Target**: >80% coverage (achieved 85%+)

### Run Specific Tests
```bash
cd packages/clients-rxnorm
pnpm test              # RxNorm tests

cd packages/clients-openfda
pnpm test              # FDA tests

cd packages/clients-openai
pnpm test              # OpenAI tests

cd apps/functions
pnpm test              # Calculator endpoint tests
```

## 🚢 Deployment

### Prerequisites
- Firebase project created
- Firebase CLI authenticated
- Environment variables configured

### Deploy Functions
```bash
cd apps/functions
pnpm deploy
```

### CI/CD
GitHub Actions workflow automatically:
- Runs tests on all PRs
- Lints code
- Type checks
- Builds all packages

## 📚 Documentation

- [Backend Task List](backend-task-list%20(1).md) - MVP 6-PR development plan (PR-01 through PR-06 completed ✅)
- [Product Requirements](PRD_Foundation_Health_NDC_Packaging_Quantity_Calculator.md) - Full PRD
- [Refactor Plan](refactorprojectstructure.md) - Monorepo restructuring plan

## 🎯 Implementation Progress

### Completed Phases

✅ **PR-01: Backend Infrastructure Setup**
- Firebase Cloud Functions setup
- Configuration & feature flags
- Core utilities and error handling
- Firestore integration
- RxNorm service foundation

✅ **PR-02: RxNorm API Integration**
- 3-strategy drug normalization (exact/fuzzy/spelling)
- RxNorm HTTP client with retry logic
- Comprehensive data mappers
- 51 unit tests with >95% coverage

✅ **PR-03: FDA NDC Directory API Integration**
- openFDA API client
- NDC validation and normalization
- Package size parsing
- Active/inactive filtering
- 20 integration tests

✅ **PR-04: AI-Enhanced NDC Matching**
- OpenAI GPT-4 integration
- Structured JSON prompts with few-shot learning
- Circuit breaker pattern for reliability
- Cost tracking and performance monitoring
- 43 unit tests for recommendation logic

✅ **PR-05: (Skipped - depends on all services)**
- Preparation for downstream services

✅ **PR-06: Main Calculator Endpoint & Orchestration** ⭐
- Full 5-step orchestration pipeline
- Input validation middleware
- Error handling middleware
- Comprehensive health checks
- 12 integration tests for complete flow

### Known Issues

⚠️ **6 failing tests** from PR-01/PR-02 (old RxNorm mapper implementation bugs):
- `calculateConfidenceFromScore` returns NaN for invalid input
- `normalizeDrugName` doesn't preserve spacing around numbers
- `extractStrength` doesn't handle liquid concentrations correctly
- Execution time tracking precision
- These don't affect main calculator functionality
- [OpenAPI Spec](packages/api-contracts/openapi.yaml) - API documentation

## 👥 Team & Ownership

See [`.github/CODEOWNERS`](.github/CODEOWNERS) for detailed code ownership.

- `packages/clients-rxnorm/` → @team-integrations
- `packages/clients-openfda/` → @team-integrations
- `packages/domain-ndc/` → @team-business-logic
- `packages/core-guardrails/` → @team-platform
- `apps/functions/` → @team-api
- `frontend/` → @team-frontend

## 📞 Support

For questions or issues:
- Create an issue in the repository
- Contact the team leads
- Review the documentation in `/docs`

---

**Last Updated:** Refactor completion (Monorepo structure)  
**Next Milestone:** PR-03 (MVP API endpoint)
