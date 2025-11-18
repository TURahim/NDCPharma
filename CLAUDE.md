# CLAUDE.md - AI Assistant Guide for NDC Packaging Calculator

**Last Updated:** 2025-11-18
**Repository:** NDC Packaging & Quantity Calculator
**Organization:** Foundation Health

This document provides comprehensive guidance for AI assistants working on the NDC Packaging Calculator codebase.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Codebase Structure](#codebase-structure)
4. [Development Workflows](#development-workflows)
5. [Key Conventions & Patterns](#key-conventions--patterns)
6. [Database & Firestore](#database--firestore)
7. [Testing Strategy](#testing-strategy)
8. [Deployment](#deployment)
9. [Common Tasks](#common-tasks)
10. [Important Files & Locations](#important-files--locations)
11. [AI Assistant Best Practices](#ai-assistant-best-practices)

---

## Project Overview

### Purpose
The NDC Packaging & Quantity Calculator is an AI-powered healthcare tool that enhances prescription fulfillment accuracy in pharmacy systems by:
- Matching prescriptions with valid National Drug Codes (NDCs)
- Calculating correct dispense quantities
- Preventing dosage form mismatches and package size errors
- Reducing claim rejections

### Success Metrics
- Medication normalization accuracy: ≥95%
- Claim rejection reduction: 50%
- Response time: <2 seconds
- User satisfaction: 4.5/5+

### Project Status
- **Current Phase:** PR-01 through PR-09 Complete ✅
- **Total Tests:** 455+ tests passing (100%)
- **Lines of Code:** 750+ lines of observability code
- **Next Milestone:** PR-10 (Deployment & CI/CD Pipeline)

---

## Architecture & Tech Stack

### Monorepo Structure
- **Package Manager:** pnpm with workspaces
- **Workspace Pattern:** `apps/` (applications) + `packages/` (shared libraries) + `frontend/` (Next.js app)
- **Build Tool:** esbuild (for Firebase Functions), Next.js (for frontend)
- **TypeScript:** Strict mode with path aliases

### Frontend Stack
- **Framework:** Next.js 16 (App Router)
- **React:** 19.2
- **TypeScript:** 5.3
- **Styling:** Tailwind CSS 4
- **UI Components:** 50+ Radix UI components
- **Form Handling:** React Hook Form + Zod validation
- **Authentication:** Firebase Auth
- **Features:** Dark mode, responsive design, accessible components

### Backend Stack
- **Runtime:** Node.js 18+ with TypeScript
- **Platform:** Google Cloud Platform (Firebase Cloud Functions)
- **API Framework:** Express.js with CORS & Helmet
- **Database:** Cloud Firestore (NoSQL)
- **Validation:** Zod schemas
- **Logging:** Structured JSON with GCP Cloud Logging integration

### External APIs
- **RxNorm REST API:** Drug normalization to RxCUI
- **openFDA NDC API:** NDC directory and package information
- **OpenAI API:** AI-enhanced matching (feature-flagged OFF by default)

### Testing & Quality
- **Test Runner:** Vitest (ESM-native)
- **Coverage Target:** >80% (currently 100%+)
- **Linting:** ESLint + TypeScript
- **Formatting:** Prettier

---

## Codebase Structure

```
NDCPharma/
├── apps/                           # Backend Applications
│   └── functions/                  # Firebase Cloud Functions
│       ├── src/
│       │   ├── api/v1/
│       │   │   ├── calculate.ts       # Main calculation endpoint
│       │   │   ├── health.ts          # Health check endpoint
│       │   │   ├── analytics.ts       # Analytics dashboard endpoints
│       │   │   ├── alternatives.ts    # Drug alternatives endpoint
│       │   │   └── middlewares/
│       │   │       ├── auth.ts        # Firebase Auth + RBAC
│       │   │       ├── validate.ts    # Zod validation
│       │   │       ├── error.ts       # Error handling
│       │   │       ├── rateLimit.ts   # Rate limiting (per-user, per-role)
│       │   │       ├── redact.ts      # PHI redaction
│       │   │       └── logging.ts     # Request/response logging
│       │   └── index.ts            # Express app setup
│       ├── tests/                  # Integration tests
│       ├── package.json
│       ├── tsconfig.json
│       ├── esbuild.config.js       # esbuild bundling
│       └── firebase.json
│
├── packages/                       # Shared Libraries
│   ├── api-contracts/              # Zod schemas & OpenAPI spec
│   │   ├── src/
│   │   │   ├── calculate.schema.ts
│   │   │   └── types.ts
│   │   └── openapi.yaml
│   │
│   ├── domain-ndc/                 # Business Logic (pure functions)
│   │   ├── src/
│   │   │   ├── quantity.ts         # Quantity calculation
│   │   │   ├── packageMatch.ts     # Package matching algorithm
│   │   │   ├── unitConverter.ts    # Unit conversion system
│   │   │   └── types.ts
│   │   └── tests/
│   │
│   ├── clients-rxnorm/             # RxNorm API Client
│   │   ├── src/
│   │   │   ├── facade.ts           # Public API
│   │   │   ├── internal/
│   │   │   │   ├── rxnormService.ts
│   │   │   │   ├── rxnormMapper.ts
│   │   │   │   └── normalizer.ts   # 3-strategy normalization
│   │   │   └── types.ts
│   │   └── tests/                  # 51 unit tests
│   │
│   ├── clients-openfda/            # openFDA API Client
│   │   ├── src/
│   │   │   ├── fdaService.ts
│   │   │   ├── fdaMapper.ts
│   │   │   ├── ndcValidator.ts
│   │   │   └── types.ts
│   │   └── tests/                  # 93 tests
│   │
│   ├── clients-openai/             # OpenAI API Client (feature-flagged)
│   │   ├── src/
│   │   │   ├── openaiService.ts
│   │   │   ├── circuitBreaker.ts
│   │   │   └── types.ts
│   │   └── tests/                  # 43 tests
│   │
│   ├── data-cache/                 # Cache Abstraction
│   │   ├── src/
│   │   │   ├── cacheService.ts     # Firestore-based cache
│   │   │   └── types.ts
│   │   └── tests/                  # 30 tests
│   │
│   ├── core-config/                # Configuration & Feature Flags
│   │   ├── src/
│   │   │   ├── environment.ts      # Env variable validation
│   │   │   ├── constants.ts
│   │   │   └── flags.ts
│   │   └── package.json
│   │
│   ├── core-guardrails/            # Cross-Cutting Concerns
│   │   ├── src/
│   │   │   ├── logger.ts           # Structured logging (GCP integration)
│   │   │   ├── errors.ts           # Custom error classes
│   │   │   ├── validators.ts       # Input validation
│   │   │   ├── formatters.ts
│   │   │   ├── redaction.ts        # PHI redaction
│   │   │   ├── rateLimit.ts
│   │   │   └── auditLogger.ts      # HIPAA-compliant audit trail
│   │   └── package.json
│   │
│   └── utils/                      # Shared Utilities
│       ├── src/helpers.ts
│       └── package.json
│
├── frontend/                       # Next.js Frontend Application
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css             # Global styles
│   │   ├── auth/                   # Auth pages (sign-in, sign-up)
│   │   ├── dashboard/              # Dashboard pages
│   │   └── about/                  # About page
│   ├── components/                 # React components
│   │   ├── ui/                     # Radix UI components
│   │   ├── calculator/             # Calculator components
│   │   ├── auth/                   # Auth components
│   │   └── layout/                 # Layout components
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utilities & helpers
│   │   ├── firebase.ts             # Firebase client config
│   │   ├── api.ts                  # API client
│   │   └── utils.ts
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── firestore/                      # Firestore Configuration
│   ├── rules/
│   │   └── firestore.rules         # Security rules
│   ├── schemas/                    # JSON schemas for collections
│   │   ├── users.json              # User profiles (RBAC)
│   │   ├── userActivity.json       # User activity tracking
│   │   ├── calculationLogs.json    # Audit logs (HIPAA)
│   │   └── calculationCache.json   # Cache with TTL
│   └── indexes.json                # Composite indexes
│
├── docs/                           # Documentation
│   ├── prd/                        # Product Requirements
│   ├── plans/                      # Implementation plans
│   ├── summaries/                  # PR completion summaries
│   ├── guides/                     # Setup & deployment guides
│   ├── investigations/             # Technical investigations
│   ├── fixes/                      # Bug fix summaries
│   └── tests/                      # Test data & prescriptions
│
├── scripts/                        # Utility scripts
│   └── setup-firestore.ts          # Firestore initialization
│
├── .github/
│   ├── workflows/
│   │   └── ci.yml                  # CI pipeline (build, test, lint)
│   └── CODEOWNERS
│
├── pnpm-workspace.yaml             # Workspace configuration
├── tsconfig.base.json              # Base TypeScript config
├── vitest.config.ts                # Root Vitest config
├── firebase.json                   # Firebase config
├── .firebaserc                     # Firebase project
├── package.json                    # Root package.json
└── README.md                       # Project README
```

---

## Development Workflows

### Prerequisites
- Node.js 18+ (LTS recommended, 20+ for functions, 22 for frontend)
- pnpm 8+ (`npm install -g pnpm`)
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd NDCPharma

# Install all dependencies (workspace)
pnpm install

# Build all packages
pnpm -r build

# Run all tests
pnpm -r test
```

### Environment Variables

#### Backend (`apps/functions/.env.local`)
```bash
# Required
NODE_ENV=development
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081  # For local development

# Optional API Keys
OPENAI_API_KEY=sk-...                   # Only if FEATURE_OPENAI=true
FDA_API_KEY=...                         # Optional for higher rate limits

# Feature Flags
FEATURE_ENHANCED_NORM=true              # 3-strategy drug normalization
FEATURE_OPENAI=false                    # AI-enhanced matching (default: false)
FEATURE_CACHE_ADVANCED=false            # Multi-level caching

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_HOUR=100
```

#### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5001/api  # Local backend
# OR
NEXT_PUBLIC_API_URL=https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api  # Production

# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... (other Firebase config values)
```

### Development Commands

#### Root Level
```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# Watch mode for tests
pnpm test:watch

# Generate coverage report
pnpm coverage

# Lint all code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Clean all build artifacts
pnpm clean

# Start frontend dev server
pnpm dev:frontend

# Start backend emulator
pnpm dev:backend

# Deploy Firebase Functions
pnpm deploy:functions
```

#### Frontend (`cd frontend`)
```bash
# Start dev server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

#### Backend (`cd apps/functions`)
```bash
# Start Firebase emulator (http://localhost:5001)
pnpm serve

# Build functions
pnpm build

# Deploy to Firebase
pnpm deploy

# View logs
pnpm logs

# Run tests
pnpm test

# Watch tests
pnpm test:watch

# Lint code
pnpm lint
```

#### Specific Packages (`cd packages/<package-name>`)
```bash
# Build package
pnpm build

# Run package tests
pnpm test

# Watch tests
pnpm test:watch

# Lint package
pnpm lint
```

### Git Workflow

#### Branch Naming Convention
- Feature branches: `feature/<feature-name>`
- Bug fixes: `fix/<bug-name>`
- Documentation: `docs/<doc-name>`
- Refactoring: `refactor/<component-name>`
- Claude-generated branches: `claude/<session-id>`

#### Commit Message Format
```
<type>(<scope>): <subject>

<body>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:
```
feat(calculate): add multi-package selection algorithm
fix(auth): resolve rate limiting for admin users
docs(readme): update deployment instructions
refactor(cache): improve TTL handling
test(rxnorm): add edge case tests for drug normalization
```

---

## Key Conventions & Patterns

### TypeScript Conventions

#### Strict Mode
All packages use TypeScript strict mode:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

#### Path Aliases
Use TypeScript path aliases for imports:
```typescript
// ✅ Good
import { logger } from '@core-guardrails';
import { calculateQuantity } from '@domain-ndc';

// ❌ Bad
import { logger } from '../../packages/core-guardrails/src';
```

Available aliases (see `tsconfig.base.json`):
- `@api-contracts`
- `@domain-ndc`
- `@clients-rxnorm`
- `@clients-openfda`
- `@clients-openai`
- `@data-cache`
- `@core-config`
- `@core-guardrails`
- `@utils`

#### Type Definitions
- Always define explicit return types for public functions
- Use `interface` for object shapes, `type` for unions/intersections
- Export types from `types.ts` files
- Use discriminated unions for error handling

Example:
```typescript
// ✅ Good
export interface Drug {
  rxcui: string;
  name: string;
  dosageForm: string;
  strength?: string;
}

export function normalizeDrug(input: string): Promise<Drug | null> {
  // Implementation
}

// ❌ Bad (no return type)
export function normalizeDrug(input: string) {
  // Implementation
}
```

### Error Handling

#### Custom Error Classes
Use custom error classes from `@core-guardrails/errors`:
```typescript
import {
  ValidationError,
  NotFoundError,
  ExternalAPIError,
  RateLimitError
} from '@core-guardrails';

throw new NotFoundError('Drug not found', { drugName: 'Aspirin' });
```

#### Error Types
- `ValidationError`: Input validation failures
- `NotFoundError`: Resource not found (404)
- `ExternalAPIError`: External API failures (RxNorm, FDA, OpenAI)
- `RateLimitError`: Rate limit exceeded
- `UnauthorizedError`: Authentication failure
- `ForbiddenError`: Authorization failure

#### Error Middleware
All API endpoints use centralized error handling:
```typescript
import { errorHandler } from './middlewares/error';

app.use('/v1/calculate', calculateRouter);
app.use(errorHandler);  // Must be last
```

### Logging

#### Structured Logging
Always use the structured logger from `@core-guardrails`:
```typescript
import { logger } from '@core-guardrails';

// ✅ Good
logger.info('Drug normalized successfully', {
  correlationId: req.correlationId,
  userId: req.user?.uid,
  drugName: 'Lisinopril',
  rxcui: '314076'
});

// ❌ Bad
console.log('Drug normalized: Lisinopril');
```

#### Log Levels
- `debug()`: Detailed debugging information
- `info()`: General informational messages
- `warn()`: Warning messages (non-critical issues)
- `error()`: Error messages (with error object)

#### Correlation IDs
Always attach correlation IDs for distributed tracing:
```typescript
logger.info('Processing calculation', {
  correlationId: req.correlationId,  // UUID from middleware
  traceId: req.traceId,               // GCP trace ID
  spanId: req.spanId                  // GCP span ID
});
```

### Validation

#### Zod Schemas
Use Zod schemas from `@api-contracts` for validation:
```typescript
import { calculateRequestSchema } from '@api-contracts';

const result = calculateRequestSchema.safeParse(req.body);
if (!result.success) {
  throw new ValidationError('Invalid request', result.error);
}
```

#### Input Sanitization
Always sanitize user inputs:
```typescript
import { sanitizeDrugName, sanitizeSIG } from '@core-guardrails/validators';

const cleanDrugName = sanitizeDrugName(req.body.drug.name);
const cleanSIG = sanitizeSIG(req.body.sig);
```

### PHI/PII Redaction

#### Automatic Redaction
PHI is automatically redacted in logs and responses:
```typescript
import { redactPHI } from '@core-guardrails/redaction';

const safeData = redactPHI(userData);  // Removes PHI fields
logger.info('User action', safeData);
```

#### Manual Redaction
For sensitive data, use explicit redaction:
```typescript
logger.info('Calculation request', {
  userId: req.user?.uid,  // ✅ Safe (anonymized ID)
  drugName: '[REDACTED]', // ✅ Redacted
  // ❌ Never log: patientName, SSN, DOB, address
});
```

### Authentication & Authorization

#### Middleware Pattern
Use auth middleware for protected routes:
```typescript
import { verifyToken, checkRole, optionalAuth } from './middlewares/auth';

// Required authentication
router.post('/calculate', verifyToken, calculateHandler);

// Role-based access
router.get('/analytics/system', verifyToken, checkRole(['admin']), systemAnalytics);

// Optional authentication
router.get('/health', optionalAuth, healthCheck);
```

#### User Roles
- `admin`: Full system access (unlimited rate limit)
- `pharmacist`: Can perform calculations (200/hr)
- `pharmacy_technician`: Can perform calculations (100/hr)

### Rate Limiting

#### Per-User Rate Limiting
Rate limiting is enforced per-user (Firestore-based):
```typescript
import { rateLimitMiddleware } from './middlewares/rateLimit';

router.post('/calculate', verifyToken, rateLimitMiddleware, calculateHandler);
```

#### Rate Limits by Role
- Admin: Unlimited
- Pharmacist: 200 requests/hour
- Pharmacy Technician: 100 requests/hour
- Anonymous: 10 requests/hour (IP-based)

### Caching

#### Cache-Aside Pattern
Use cache for expensive operations:
```typescript
import { CacheService } from '@data-cache';

const cache = new CacheService();

// Try cache first
const cached = await cache.get('rxcui', drugName);
if (cached) return cached;

// Fetch from API
const result = await rxnormAPI.search(drugName);

// Store in cache
await cache.set('rxcui', drugName, result, 24 * 60 * 60);  // 24h TTL
```

#### Cache TTLs
- RxNorm (drug normalization): 24 hours
- FDA NDC packages: 1 hour
- User activity: 1 hour

### Testing Patterns

#### Unit Tests
Test pure functions in isolation:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateQuantity } from '@domain-ndc';

describe('calculateQuantity', () => {
  it('should calculate correct quantity for simple dosage', () => {
    const result = calculateQuantity({
      dose: 1,
      frequency: 2,
      daysSupply: 30
    });
    expect(result).toBe(60);
  });
});
```

#### Integration Tests
Test full API flows:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';

describe('POST /v1/calculate', () => {
  it('should return calculation result', async () => {
    const response = await request(app)
      .post('/v1/calculate')
      .send({
        drug: { name: 'Lisinopril' },
        sig: { dose: 1, frequency: 1, unit: 'tablet' },
        daysSupply: 30
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalQuantity).toBe(30);
  });
});
```

#### Test Coverage Requirements
- Minimum: 80% coverage
- Target: 90%+ coverage
- Current: 100%+ coverage ✅

---

## Database & Firestore

### Collections

#### `users`
User profiles and RBAC.

**Schema:** `firestore/schemas/users.json`

**Fields:**
- `uid` (string): Firebase Auth UID (same as document ID)
- `email` (string): User email
- `role` (string): `admin` | `pharmacist` | `pharmacy_technician`
- `displayName` (string): User display name
- `organization` (string): Pharmacy/organization name
- `licenseNumber` (string): Professional license number
- `createdAt` (timestamp): Account creation
- `updatedAt` (timestamp): Last profile update
- `emailVerified` (boolean): Email verification status
- `isActive` (boolean): Account active status
- `lastLoginAt` (timestamp): Last login

**Indexes:**
- Email lookup: `email ASC`
- Active users by role: `role ASC, isActive ASC`

**Security Rules:**
- Users can read/update own profile (except `role` field)
- Admins can read/update all profiles

#### `userActivity`
User activity tracking for rate limiting.

**Schema:** `firestore/schemas/userActivity.json`

**Fields:**
- `userId` (string): User ID
- `requestCount` (number): Request count in current hour
- `windowStart` (timestamp): Start of current rate limit window
- `lastRequest` (timestamp): Timestamp of last request
- `isBlocked` (boolean): Whether user is blocked

**Indexes:**
- User lookup: `userId ASC, windowStart DESC`

**Security Rules:**
- Cloud Functions only (no client access)

#### `calculationLogs`
HIPAA-compliant audit trail of all calculation requests/responses.

**Schema:** `firestore/schemas/calculationLogs.json`

**Fields:**
- `id` (string): Auto-generated calculation ID
- `userId` (string): User ID (optional)
- `request` (object): Request data (drug, sig, daysSupply)
- `response` (object): Response data (success, totalQuantity, executionTime, errorCode)
- `timestamp` (timestamp): Calculation timestamp
- `aiUsed` (boolean): Whether AI was used
- `cacheHit` (boolean): Whether cache was hit
- `ipAddress` (string): Client IP address

**Indexes:**
- User history: `userId ASC, timestamp DESC`
- Recent calculations: `timestamp DESC`
- Cache performance: `cacheHit ASC, timestamp DESC`
- AI usage: `aiUsed ASC, timestamp DESC`

**Security Rules:**
- Write-once (tamper-proof)
- Cloud Functions only (no client access)
- Retention: 7 years (HIPAA requirement)

#### `calculationCache`
Cache for RxNorm and FDA API responses.

**Schema:** `firestore/schemas/calculationCache.json`

**Fields:**
- `key` (string): Cache key (type:value)
- `value` (any): Cached value
- `expiresAt` (timestamp): Expiration timestamp
- `createdAt` (timestamp): Cache entry creation

**Indexes:**
- Cache lookup: `key ASC, expiresAt ASC`

**Security Rules:**
- Cloud Functions only (no client access)

### Firestore Setup

#### Initialize Collections
```bash
cd scripts
pnpm tsx setup-firestore.ts
```

This creates:
- Test users (admin, pharmacist, technician)
- Initial indexes
- Security rules

#### Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

#### Deploy Indexes
```bash
firebase deploy --only firestore:indexes
```

### Firestore Security Rules

Located in `firestore/rules/firestore.rules`.

**Key Rules:**
- Users can read/update own profile (except `role`)
- Admins can access all data
- Audit logs are write-once (tamper-proof)
- Cache is Cloud Functions only
- User activity is Cloud Functions only

---

## Testing Strategy

### Test Organization

```
packages/<package-name>/
├── src/
│   └── feature.ts
└── tests/
    └── feature.test.ts

apps/functions/
├── src/
│   └── api/v1/calculate.ts
└── tests/
    └── calculate.integration.test.ts
```

### Running Tests

```bash
# All tests (root)
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm coverage

# Specific package
cd packages/clients-rxnorm
pnpm test

# Specific test file
pnpm vitest run tests/normalizer.test.ts
```

### Test Categories

#### Unit Tests (Pure Functions)
- Location: `packages/*/tests/`
- Focus: Business logic, data transformations, utilities
- Examples:
  - Quantity calculations (`domain-ndc`)
  - Drug normalization (`clients-rxnorm`)
  - NDC validation (`clients-openfda`)
  - Unit conversions (`domain-ndc`)

#### Integration Tests (API Flows)
- Location: `apps/functions/tests/`
- Focus: Full request/response cycles, middleware chains
- Examples:
  - `/v1/calculate` endpoint
  - `/v1/health` endpoint
  - Authentication flow
  - Rate limiting

#### Contract Tests (API Validation)
- Location: `packages/api-contracts/tests/`
- Focus: Request/response schema validation
- Examples:
  - Zod schema validation
  - OpenAPI spec compliance

### Test Utilities

```typescript
// Example test setup
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should handle success case', () => {
    // Arrange
    const input = { ... };

    // Act
    const result = feature(input);

    // Assert
    expect(result).toEqual({ ... });
  });

  it('should handle error case', () => {
    expect(() => feature(null)).toThrow(ValidationError);
  });
});
```

### Mocking External APIs

```typescript
import { vi } from 'vitest';

// Mock external API
vi.mock('@clients-rxnorm', () => ({
  nameToRxCui: vi.fn().mockResolvedValue({
    rxcui: '314076',
    name: 'Lisinopril'
  })
}));
```

---

## Deployment

### Firebase Functions

#### Local Development
```bash
cd apps/functions
pnpm serve  # Starts emulator on http://localhost:5001
```

#### Deploy to Production
```bash
cd apps/functions
pnpm deploy  # Builds + deploys to Firebase
```

#### Environment Variables (Firebase)
Set via Firebase CLI:
```bash
firebase functions:config:set \
  openai.api_key="sk-..." \
  fda.api_key="..."

firebase deploy --only functions
```

### Frontend (Vercel)

#### Vercel Configuration
**Root Directory:** `frontend` (set in Vercel dashboard)

**Build Settings:**
- Framework: Next.js
- Build Command: `pnpm build`
- Output Directory: `.next`
- Install Command: `pnpm install`

**Environment Variables (Vercel):**
```bash
NEXT_PUBLIC_API_URL=https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... (other Firebase config)
```

See: `docs/guides/VERCEL-DEPLOYMENT-INSTRUCTIONS.md`

### CI/CD Pipeline

#### GitHub Actions
Located: `.github/workflows/ci.yml`

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Jobs:**
1. **build-and-test:**
   - Node.js 18.x, 20.x (matrix)
   - Install dependencies
   - Build all workspaces
   - Lint all workspaces
   - Test all workspaces
   - Upload coverage (Node 20.x only)

2. **type-check:**
   - TypeScript type checking
   - All packages

---

## Common Tasks

### Adding a New API Endpoint

1. **Create endpoint file:**
   ```typescript
   // apps/functions/src/api/v1/newFeature.ts
   import express from 'express';
   import { verifyToken } from './middlewares/auth';

   const router = express.Router();

   router.get('/', verifyToken, async (req, res) => {
     // Implementation
     res.json({ success: true, data: { ... } });
   });

   export { router as newFeatureRouter };
   ```

2. **Add to main app:**
   ```typescript
   // apps/functions/src/index.ts
   import { newFeatureRouter } from './api/v1/newFeature';

   app.use('/v1/new-feature', newFeatureRouter);
   ```

3. **Add Zod schema:**
   ```typescript
   // packages/api-contracts/src/newFeature.schema.ts
   import { z } from 'zod';

   export const newFeatureRequestSchema = z.object({
     // Schema definition
   });
   ```

4. **Write tests:**
   ```typescript
   // apps/functions/tests/newFeature.integration.test.ts
   describe('POST /v1/new-feature', () => {
     it('should handle request', async () => {
       // Test implementation
     });
   });
   ```

### Adding a New Shared Package

1. **Create package directory:**
   ```bash
   mkdir -p packages/new-package/src
   cd packages/new-package
   ```

2. **Create package.json:**
   ```json
   {
     "name": "@ndc/new-package",
     "version": "1.0.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "test": "vitest run"
     }
   }
   ```

3. **Create tsconfig.json:**
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "outDir": "dist",
       "rootDir": "src"
     },
     "include": ["src/**/*"]
   }
   ```

4. **Add path alias to root tsconfig:**
   ```json
   {
     "paths": {
       "@new-package/*": ["packages/new-package/src/*"],
       "@new-package": ["packages/new-package/src/index.ts"]
     }
   }
   ```

5. **Build and test:**
   ```bash
   pnpm build
   pnpm test
   ```

### Debugging

#### Backend (Functions)
```bash
# Start emulator with debugging
cd apps/functions
pnpm serve

# View logs in real-time
firebase emulators:logs
```

#### Frontend (Next.js)
```bash
cd frontend
pnpm dev

# Open http://localhost:3000
# Use React DevTools in browser
```

#### Firestore
```bash
# Start Firestore emulator
firebase emulators:start --only firestore

# Open Firestore UI
# http://127.0.0.1:4000/firestore
```

### Updating Dependencies

```bash
# Update all dependencies
pnpm up --latest -r

# Update specific package
pnpm up typescript --latest -r

# Check outdated packages
pnpm outdated -r
```

---

## Important Files & Locations

### Configuration Files

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Workspace configuration (apps, packages, frontend) |
| `tsconfig.base.json` | Base TypeScript configuration (path aliases, strict mode) |
| `vitest.config.ts` | Root Vitest configuration |
| `firebase.json` | Firebase configuration (functions, firestore, emulators) |
| `.firebaserc` | Firebase project ID |
| `.github/workflows/ci.yml` | CI/CD pipeline |
| `firestore/rules/firestore.rules` | Firestore security rules |
| `firestore/indexes.json` | Firestore composite indexes |

### Key Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview, setup, status |
| `CLAUDE.md` | This file (AI assistant guide) |
| `docs/prd/PRD_Foundation_Health_NDC_Packaging_Quantity_Calculator.md` | Product requirements |
| `docs/guides/VERCEL-DEPLOYMENT-INSTRUCTIONS.md` | Vercel deployment guide |
| `docs/guides/FIRESTORE-SETUP-GUIDE.md` | Firestore setup guide |
| `docs/guides/BACKEND-PUBLIC-ACCESS-SETUP.md` | Backend CORS setup |
| `docs/summaries/PR-*-COMPLETION-SUMMARY.md` | PR completion summaries |
| `packages/api-contracts/openapi.yaml` | OpenAPI specification |

### Package Entry Points

| Package | Entry Point |
|---------|-------------|
| `api-contracts` | `packages/api-contracts/src/index.ts` |
| `domain-ndc` | `packages/domain-ndc/src/index.ts` |
| `clients-rxnorm` | `packages/clients-rxnorm/src/facade.ts` |
| `clients-openfda` | `packages/clients-openfda/src/index.ts` |
| `clients-openai` | `packages/clients-openai/src/index.ts` |
| `data-cache` | `packages/data-cache/src/index.ts` |
| `core-config` | `packages/core-config/src/index.ts` |
| `core-guardrails` | `packages/core-guardrails/src/index.ts` |
| `utils` | `packages/utils/src/index.ts` |

---

## AI Assistant Best Practices

### When Making Changes

1. **Always read existing code first** before making changes
   - Understand the current implementation
   - Check for similar patterns in the codebase
   - Review related tests

2. **Follow existing patterns and conventions**
   - Use the same error handling approach
   - Follow the same logging format
   - Match the code style (TypeScript strict mode)

3. **Update tests when changing code**
   - Add tests for new features
   - Update tests for modified functionality
   - Ensure all tests pass before completing

4. **Update documentation**
   - Update README.md if architecture changes
   - Update this CLAUDE.md if conventions change
   - Add/update comments for complex logic

5. **Validate security and compliance**
   - Never log PHI/PII
   - Use redaction for sensitive data
   - Follow HIPAA compliance guidelines
   - Validate all user inputs

### When Adding Features

1. **Start with business logic (domain layer)**
   - Implement pure functions in `packages/domain-ndc`
   - Write unit tests first (TDD)
   - No external dependencies

2. **Add external API clients if needed**
   - Create new package in `packages/clients-*`
   - Implement retry logic and error handling
   - Add comprehensive tests

3. **Integrate into API endpoint**
   - Add endpoint in `apps/functions/src/api/v1/`
   - Use middleware (auth, validation, logging, rate limiting)
   - Add integration tests

4. **Update contracts and schemas**
   - Add Zod schemas in `packages/api-contracts`
   - Update OpenAPI spec

5. **Document the change**
   - Update README.md
   - Create completion summary in `docs/summaries/`

### When Debugging Issues

1. **Check logs first**
   - Use structured logging with correlation IDs
   - Check GCP Cloud Logging for production issues
   - Use Firebase emulator logs for local debugging

2. **Verify environment variables**
   - Check `.env.local` files exist
   - Verify Firebase config is correct
   - Confirm feature flags are set correctly

3. **Check Firestore data**
   - Use Firestore emulator UI (http://127.0.0.1:4000/firestore)
   - Verify security rules
   - Check indexes are deployed

4. **Review middleware chain**
   - Check auth token is valid
   - Verify rate limit not exceeded
   - Ensure validation passed

5. **Test external API availability**
   - RxNorm: https://rxnav.nlm.nih.gov/REST/
   - openFDA: https://api.fda.gov/
   - OpenAI: Check API key and quota

### Code Quality Checklist

Before completing any task, verify:

- [ ] All tests pass (`pnpm -r test`)
- [ ] No linting errors (`pnpm -r lint`)
- [ ] TypeScript type checks pass (`pnpm -r exec tsc --noEmit`)
- [ ] No PHI/PII in logs or responses
- [ ] Security best practices followed
- [ ] Error handling implemented
- [ ] Logging added with correlation IDs
- [ ] Input validation implemented (Zod schemas)
- [ ] Tests added/updated (unit + integration)
- [ ] Documentation updated (README, comments, CLAUDE.md)
- [ ] Feature flags considered (if applicable)
- [ ] Backwards compatibility maintained

### Common Pitfalls to Avoid

1. **Never log PHI/PII:**
   - ❌ `logger.info('Processing prescription for John Doe')`
   - ✅ `logger.info('Processing prescription', { userId: 'user_123' })`

2. **Never use `console.log`:**
   - ❌ `console.log('Debug info')`
   - ✅ `logger.debug('Debug info', { context })`

3. **Never skip input validation:**
   - ❌ `const drugName = req.body.drug.name;`
   - ✅ `const result = schema.safeParse(req.body); if (!result.success) throw ValidationError(...)`

4. **Never hardcode API keys:**
   - ❌ `const apiKey = 'sk-1234567890';`
   - ✅ `const apiKey = process.env.OPENAI_API_KEY;`

5. **Never skip error handling:**
   - ❌ `const result = await externalAPI.call();`
   - ✅ `try { const result = await externalAPI.call(); } catch (error) { throw new ExternalAPIError(...) }`

6. **Never modify production data directly:**
   - Use Cloud Functions or admin scripts
   - Test changes in emulator first
   - Always have a backup plan

7. **Never push `.env` files:**
   - Add to `.gitignore` (already done)
   - Use `.env.example` for documentation
   - Set production env vars via Firebase CLI or Vercel dashboard

### Feature Flags

Always check feature flags before implementing optional features:

```typescript
import { isFeatureEnabled } from '@core-config';

if (isFeatureEnabled('OPENAI')) {
  // AI enhancement logic
}
```

Available flags:
- `USE_ENHANCED_NORMALIZATION` (default: true)
- `ENABLE_OPENAI_ENHANCER` (default: false)
- `ENABLE_ADVANCED_CACHING` (default: false)

---

## Additional Resources

### External Documentation
- **RxNorm API:** https://lhncbc.nlm.nih.gov/RxNav/APIs/
- **openFDA API:** https://open.fda.gov/apis/
- **Firebase Functions:** https://firebase.google.com/docs/functions
- **Cloud Firestore:** https://firebase.google.com/docs/firestore
- **Next.js:** https://nextjs.org/docs
- **Vitest:** https://vitest.dev/

### Internal Documentation
- **Product Requirements:** `docs/prd/PRD_Foundation_Health_NDC_Packaging_Quantity_Calculator.md`
- **Implementation Plans:** `docs/plans/`
- **PR Summaries:** `docs/summaries/`
- **Setup Guides:** `docs/guides/`
- **Test Data:** `docs/tests/TEST-PRESCRIPTIONS.md`

### Team Contacts
See `.github/CODEOWNERS` for code ownership:
- `packages/clients-rxnorm/` → @team-integrations
- `packages/clients-openfda/` → @team-integrations
- `packages/domain-ndc/` → @team-business-logic
- `packages/core-guardrails/` → @team-platform
- `apps/functions/` → @team-api
- `frontend/` → @team-frontend

---

**Last Updated:** 2025-11-18
**Maintained by:** Foundation Health Development Team
**Questions?** Create an issue or contact the team leads.
