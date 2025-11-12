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

### Drug Normalization & NDC Lookup

1. **User Input** → `/v1/calculate` (structured SIG)
2. **Drug Normalization** → `@clients-rxnorm/nameToRxCui()` → RxNorm API → RxCUI
3. **NDC Lookup** → `@clients-rxnorm/rxcuiToNdcs()` → RxNorm API → NDC list
4. **Quantity Calculation** → `@domain-ndc/calculateTotalQuantity()` → total quantity
5. **Package Matching** → `@domain-ndc/matchPackagesToQuantity()` → recommendations
6. **Enrichment** (future) → `@clients-openfda/enrichNdcs()` → marketing status
7. **Response** → Explanations + recommendations → User

**Key Correction**: RxNorm provides RxCUI → NDC mapping, NOT openFDA. openFDA is used for enrichment only (marketing status, packaging text).

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

### `/v1/calculate`
**Method:** POST  
**Description:** Calculate NDC packages for prescription

**Request Body:**
```json
{
  "drug": {
    "name": "Lisinopril"
  },
  "sig": {
    "dose": 1,
    "frequency": 2,
    "unit": "tablet"
  },
  "daysSupply": 30
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "drug": {
      "rxcui": "104377",
      "name": "Lisinopril",
      "dosageForm": "TABLET"
    },
    "totalQuantity": 60,
    "recommendedPackages": [
      {
        "ndc": "12345-678-90",
        "packageSize": 60,
        "unit": "TABLET",
        "isActive": true
      }
    ],
    "overfillPercentage": 0,
    "warnings": [],
    "explanations": [
      {
        "step": "normalization",
        "description": "Drug normalized to RxCUI 104377"
      },
      {
        "step": "calculation",
        "description": "Total quantity calculated: 60 tablets"
      }
    ]
  }
}
```

Full API documentation: [`packages/api-contracts/openapi.yaml`](packages/api-contracts/openapi.yaml)

## 🧪 Testing

### Unit Tests
```bash
pnpm -r test
```

### Test Coverage
- RxNorm client: 51 tests
- Domain logic: Coming in PR-03
- API endpoints: Coming in PR-03
- Target: >80% coverage

### Run Specific Tests
```bash
cd packages/clients-rxnorm
pnpm test
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

- [Backend Task List](docs/backend-task-list.md) - MVP 3-PR development plan
- [Product Requirements](PRD_Foundation_Health_NDC_Packaging_Quantity_Calculator.md) - Full PRD
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
