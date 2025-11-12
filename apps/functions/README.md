# NDC Calculator - Cloud Functions

Firebase Cloud Functions for the NDC Calculator backend. This is a **thin API layer** that orchestrates calls to workspace packages.

## Architecture

This functions app follows a clean architecture pattern:

- **API Layer** (`apps/functions/`) - HTTP endpoints and middleware only
- **Business Logic** (`packages/domain-ndc/`) - Pure functions
- **External APIs** (`packages/clients-*`) - API integrations
- **Cross-Cutting** (`packages/core-*`) - Config, logging, errors

## Package Dependencies

```typescript
import { nameToRxCui } from '@clients-rxnorm';
import { calculateTotalQuantity, matchPackagesToQuantity } from '@domain-ndc';
import { CalculateRequestSchema, CalculateResponse } from '@api-contracts';
import { env, API_CONFIG } from '@core-config';
import { createLogger, AppError, validateDrugName } from '@core-guardrails';
```

## API Endpoints

### `GET /v1/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### `POST /v1/calculate`
Calculate NDC packages for a prescription.

**Request:**
```json
{
  "drug": { "name": "Lisinopril" },
  "sig": { "dose": 1, "frequency": 2, "unit": "tablet" },
  "daysSupply": 30
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "drug": { "rxcui": "104377", "name": "Lisinopril" },
    "totalQuantity": 60,
    "recommendedPackages": [...],
    "explanations": [...]
  }
}
```

## Middleware Stack

1. **Helmet** - Security headers
2. **CORS** - Cross-origin requests
3. **JSON Parser** - Parse request bodies
4. **Redaction** - PHI redaction from logs
5. **Rate Limiting** - 100 req/hour per user
6. **Validation** - Zod schema validation
7. **Error Handling** - Consistent error formatting

## Development

### Prerequisites
- Node.js 18+
- pnpm 8+
- Firebase CLI

### Setup
```bash
# Install dependencies (from repo root)
pnpm install

# Build all packages
pnpm -r build
```

### Local Development
```bash
# Run emulator
cd apps/functions
pnpm serve

# Functions available at:
# http://localhost:5001/ndc-calculator-dev/us-central1/api
```

### Testing
```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Linting
```bash
# Lint
pnpm lint

# Fix issues
pnpm lint:fix
```

## Deployment

### Environment Setup
1. Create `.env.local` file:
```bash
cp .env.example .env.local
```

2. Configure environment variables:
```env
NODE_ENV=development
FIREBASE_PROJECT_ID=ndc-calculator-dev
FIREBASE_REGION=us-central1

# API Keys (all optional)
RXNORM_API_KEY=
FDA_API_KEY=
OPENAI_API_KEY=

# Feature Flags
FEATURE_ENHANCED_NORM=true
FEATURE_OPENAI=false
FEATURE_CACHE_ADVANCED=false

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_HOUR=100
RATE_LIMIT_BURST=20

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

### Deploy to Firebase
```bash
# Deploy to dev
firebase use dev
pnpm deploy

# Deploy to staging
firebase use staging
pnpm deploy

# Deploy to production
firebase use production
pnpm deploy
```

## Project Structure

```
apps/functions/
├── src/
│   ├── api/v1/
│   │   ├── calculate.ts         # Main calculation endpoint
│   │   ├── health.ts            # Health check
│   │   └── middlewares/
│   │       ├── validate.ts      # Zod validation
│   │       ├── error.ts         # Error handling
│   │       ├── rateLimit.ts     # Rate limiting
│   │       └── redact.ts        # PHI redaction
│   └── index.ts                 # Express app setup
├── tests/
│   └── contract/                # Contract tests
├── package.json
├── tsconfig.json
├── firebase.json
└── README.md                    # This file
```

## Testing Strategy

### Unit Tests
Test individual functions and middleware in isolation.

```typescript
describe('validateBody middleware', () => {
  it('should validate valid request', () => {
    // ...
  });
  
  it('should reject invalid request', () => {
    // ...
  });
});
```

### Contract Tests
Test API request/response contracts against schemas.

```typescript
describe('POST /v1/calculate', () => {
  it('should match CalculateRequestSchema', () => {
    // ...
  });
  
  it('should return CalculateResponse format', () => {
    // ...
  });
});
```

## Monitoring & Logging

### Structured Logging
All logs use structured JSON format for GCP Cloud Logging:

```typescript
logger.info('Request completed', {
  requestId: '123',
  executionTime: 450,
  statusCode: 200,
});
```

### PHI Redaction
All logs automatically redact PHI:
- Patient names
- Phone numbers
- Email addresses
- SSNs, MRNs
- Addresses

### Metrics
- Request count
- Error rate
- Response time (p50, p95, p99)
- Rate limit hits

## Security

### HIPAA Compliance
- ✅ No PHI in logs (redacted)
- ✅ No PHI in cache keys
- ✅ No patient identifiers stored
- ✅ Audit trail via structured logs

### Rate Limiting
- 100 requests/hour per user (configurable)
- Burst capacity: 20 requests
- Returns `429 Too Many Requests` with `Retry-After` header

### API Keys
- All API keys are optional
- No runtime failures if missing
- OpenAI feature-flagged OFF by default

## Troubleshooting

### Build Errors
```bash
# Clear build cache
rm -rf dist/

# Rebuild from root
cd ../..
pnpm -r build
```

### Import Errors
Check that `tsconfig.base.json` paths match package names:
```json
{
  "paths": {
    "@api-contracts/*": ["packages/api-contracts/src/*"],
    "@clients-rxnorm/*": ["packages/clients-rxnorm/src/*"],
    // ...
  }
}
```

### Emulator Issues
```bash
# Kill existing processes
pkill -f firebase

# Clear emulator data
rm -rf ~/.cache/firebase/emulators/

# Restart emulator
pnpm serve
```

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests: `pnpm test`
4. Lint: `pnpm lint`
5. Build: `pnpm build`
6. Submit PR

## License

Proprietary - Foundation Health

---

**Package:** `@ndc/functions`  
**Version:** 1.0.0  
**Node:** 18+  
**Last Updated:** Refactor completion

