# NDC Calculator Backend - MVP Task List

## Overview

This document outlines the 3-PR MVP development track for the NDC Calculator backend, following the monorepo refactoring.

**Architecture**: Monorepo with `apps/functions` (Cloud Functions) and `packages/*` (shared libraries)

---

## PR-A: Infrastructure & Configuration ✅ COMPLETE

**Status**: ✅ Completed (ported from original PR-01)

### Scope
- Workspace setup (pnpm monorepo)
- Core configuration package
- Core guardrails package (logging, errors, validators)
- Firebase/Firestore setup
- Testing infrastructure

### What Was Done
- Created `packages/core-config/` with environment management, constants, feature flags
- Created `packages/core-guardrails/` with logger, error classes, validators, formatters
- Set up Firebase configuration and Firestore schemas/rules
- Added test setup and sample tests
- Documented backend structure
- **Key Change**: Made all API keys optional (RXNORM, FDA, OPENAI)
- **Key Change**: Added feature flags for enhanced normalization, OpenAI, advanced caching

### Files Created
- `packages/core-config/src/{environment,constants,flags}.ts`
- `packages/core-guardrails/src/{logger,errors,validators,formatters}.ts`
- `backend/firestore/{indexes.json,rules/,schemas/}`
- `backend/scripts/deploy.sh`
- Test infrastructure

---

## PR-B: RxNorm Integration ✅ COMPLETE

**Status**: ✅ Completed (ported from original PR-02, with façade)

### Scope
- RxNorm API client
- 3-strategy drug normalization (exact/fuzzy/spelling)
- Drug name parsing and confidence scoring
- Simple public façade
- Comprehensive unit tests (51 tests)

### What Was Done
- Created `packages/clients-rxnorm/` with sophisticated internal implementation
- Implemented `nameToRxCui()` and `rxcuiToNdcs()` façade functions
- Feature flag `USE_ENHANCED_NORMALIZATION` (default: true)
  - If true: uses 3-strategy pipeline
  - If false: uses basic RxNorm lookup
- Organized internal code: `internal/{rxnormService,rxnormMapper,normalizer,rxnormTypes}.ts`
- Migrated all 51 unit tests
- Full retry logic, timeout handling, confidence scoring

### Files Created
- `packages/clients-rxnorm/src/facade.ts` (public API)
- `packages/clients-rxnorm/src/internal/*.ts` (sophisticated implementation)
- `packages/clients-rxnorm/tests/*.test.ts` (51 tests)

### Data Flow Correction
**Before**: Incorrect assumption that FDA provides RxCUI → NDC mapping  
**After**: Correct flow:
1. RxNorm: `nameToRxCui()` → drug name to RxCUI
2. RxNorm: `rxcuiToNdcs()` → RxCUI to NDC list
3. openFDA: `enrichNdcs()` → add marketing status, packaging text (future PR)

---

## PR-03: MVP API Endpoint 🔄 IN PROGRESS

**Status**: 🔄 In Progress (remaining work)

### Scope
- Thin API layer in `apps/functions/`
- Domain logic for quantity calculation and package matching
- Main `/v1/calculate` endpoint
- Middlewares (validation, error handling, rate limiting, redaction)
- Contract tests

### Tasks
1. **Create apps/functions structure** ⏳
   - Move `backend/functions/` → `apps/functions/`
   - Slim down to thin API layer only
   - Wire up all package imports

2. **Implement middlewares** ⏳
   - `validate.ts` - Zod schema validation
   - `error.ts` - Error handling and formatting
   - `rateLimit.ts` - Token bucket rate limiting
   - `redact.ts` - PHI redaction for compliance

3. **Create /v1/calculate endpoint** ⏳
   - Accept structured SIG input (MVP scope)
   - Call `nameToRxCui()` from `@clients-rxnorm`
   - Call `calculateTotalQuantity()` from `@domain-ndc`
   - Call `matchPackagesToQuantity()` from `@domain-ndc`
   - Return explanations array

4. **Add /v1/health endpoint** ⏳
   - Service health check
   - Version info

5. **Wire up packages** ⏳
   - Import from `@api-contracts/*`
   - Import from `@clients-rxnorm/*`
   - Import from `@domain-ndc/*`
   - Import from `@core-guardrails/*`
   - Import from `@core-config/*`

6. **Write contract tests** ⏳
   - Validate request/response schemas
   - Test end-to-end flow
   - Verify error handling

### Success Criteria
- `/v1/calculate` accepts structured input and returns valid response
- All package imports resolve correctly
- Middlewares active (validation, rate limiting, redaction)
- Contract tests pass
- No PHI in logs/cache

### Files to Create
- `apps/functions/src/api/v1/calculate.ts`
- `apps/functions/src/api/v1/health.ts`
- `apps/functions/src/api/v1/middlewares/{validate,error,rateLimit,redact}.ts`
- `apps/functions/src/index.ts` (Express setup)
- `apps/functions/tests/contract/*.test.ts`

---

## PR-04: Cache, openFDA, Guardrails 📋 TODO

**Status**: 📋 Planned (future work)

### Scope
- Cache abstraction and Firestore adapter
- openFDA client for NDC enrichment
- Advanced guardrails (redaction, rate limiting enhancements)
- User activity logging

### Tasks
1. **Create cache package**
   - `packages/data-cache/` with Firestore adapter
   - TTL management
   - Cache key generation (with PHI redaction)

2. **Create openFDA client**
   - `packages/clients-openfda/`
   - `enrichNdcs()` function
   - Marketing status lookup
   - Package size validation

3. **Enhance guardrails**
   - Complete redaction middleware
   - Token bucket rate limiter with Firestore persistence
   - User activity tracking

4. **Integrate caching**
   - Cache normalized drugs
   - Cache NDC lookups
   - Cache calculation results

### Success Criteria
- Cache reduces API calls by >70%
- openFDA enriches NDCs with marketing status
- No PHI in any stored data
- Rate limiting works across instances

---

## PR-05: Hard Edges & SLOs 📋 TODO

**Status**: 📋 Planned (future work)

### Scope
- Performance monitoring and SLO tracking
- Comprehensive error handling
- Alerting and observability
- Load testing

### Tasks
1. **Define SLOs**
   - p50 latency < 500ms
   - p95 latency < 1000ms
   - 99.9% uptime
   - >95% normalization accuracy

2. **Add monitoring**
   - Cloud Monitoring integration
   - Custom metrics
   - Error rate tracking

3. **Load testing**
   - Simulate 100 concurrent users
   - Verify rate limiting
   - Check cache effectiveness

4. **Alerting**
   - SLO violation alerts
   - Error rate spikes
   - API downtime

### Success Criteria
- All SLOs met under load
- Alerts fire correctly
- Dashboard shows key metrics
- Runbooks documented

---

## Architecture Summary

```
NDC/
├── apps/
│   └── functions/              # Thin API layer (Firebase Cloud Functions)
│       ├── src/
│       │   ├── api/v1/
│       │   │   ├── calculate.ts
│       │   │   ├── health.ts
│       │   │   └── middlewares/
│       │   └── index.ts
│       └── tests/
├── packages/
│   ├── api-contracts/          # Zod schemas, OpenAPI spec
│   ├── domain-ndc/             # Business logic (quantity, matching)
│   ├── clients-rxnorm/         # RxNorm client (façade + internal)
│   ├── clients-openfda/        # openFDA client (future)
│   ├── data-cache/             # Cache abstraction (future)
│   ├── core-config/            # Environment, flags, constants
│   ├── core-guardrails/        # Logger, errors, validators, redaction
│   └── utils/                  # Shared helpers
└── frontend/                   # Next.js app (separate from backend)
```

## Module Boundaries

- **apps/functions**: API layer only, no business logic
- **domain-ndc**: Pure functions, no external API calls
- **clients-***: External API integrations only
- **core-***: Cross-cutting concerns (config, logging, errors)
- **api-contracts**: Schemas shared by frontend and backend

## Data Flow

1. **Request**: User → `/v1/calculate` (structured SIG)
2. **Normalization**: `@clients-rxnorm` → RxNorm API → RxCUI
3. **NDC Lookup**: `@clients-rxnorm` → RxNorm API → NDC list
4. **Calculation**: `@domain-ndc` → total quantity
5. **Matching**: `@domain-ndc` → package recommendations
6. **Enrichment** (future): `@clients-openfda` → marketing status
7. **Response**: Explanations + recommendations → User

## Feature Flags

- `USE_ENHANCED_NORMALIZATION` (default: true) - Use 3-strategy pipeline vs basic lookup
- `ENABLE_OPENAI_ENHANCER` (default: false) - AI-powered matching
- `ENABLE_ADVANCED_CACHING` (default: false) - Multi-level caching

## Compliance Requirements

- ✅ No PHI in logs (redaction middleware)
- ✅ No PHI in cache keys
- ✅ No patient identifiers stored
- ✅ HIPAA-compliant logging
- ✅ Optional API keys (no runtime failures)

## Testing Strategy

- **Unit tests**: Each package (51 for RxNorm alone)
- **Contract tests**: API request/response validation
- **Integration tests**: End-to-end flows (future)
- **Load tests**: Performance under stress (future)

---

**Last Updated**: Refactor completion  
**Next Steps**: Complete PR-03 (MVP API endpoint)

