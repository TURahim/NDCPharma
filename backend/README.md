# NDC Calculator Backend

Backend service for the NDC Packaging & Quantity Calculator - An AI-powered tool for accurate prescription fulfillment.

## 🏗️ Architecture

- **Platform**: Google Cloud Platform (Firebase)
- **Runtime**: Node.js 18+ with TypeScript
- **Functions**: Firebase Cloud Functions (Express.js)
- **Database**: Cloud Firestore
- **Authentication**: Firebase Authentication
- **External APIs**: RxNorm, FDA NDC Directory, OpenAI

## 📁 Project Structure

```
backend/
├── functions/                     # Firebase Cloud Functions
│   ├── src/
│   │   ├── config/               # Configuration files
│   │   │   ├── environment.ts    # Environment variable management
│   │   │   ├── firebase.ts       # Firebase Admin SDK initialization
│   │   │   └── constants.ts      # Application constants
│   │   ├── api/                  # API endpoints (to be added)
│   │   ├── services/             # External API integrations (to be added)
│   │   ├── logic/                # Business logic (to be added)
│   │   ├── models/               # Data models (to be added)
│   │   ├── utils/                # Utility functions
│   │   │   ├── logger.ts         # Structured logging
│   │   │   ├── errors.ts         # Custom error classes
│   │   │   ├── validators.ts     # Input validation
│   │   │   └── formatters.ts     # Output formatting
│   │   └── types/                # TypeScript type definitions
│   ├── package.json              # Dependencies
│   ├── tsconfig.json             # TypeScript configuration
│   ├── jest.config.js            # Jest test configuration
│   └── .env.example              # Environment variables template
├── firestore/
│   ├── indexes.json              # Firestore indexes
│   ├── rules/
│   │   └── firestore.rules       # Security rules
│   └── schemas/                  # Collection schemas
├── tests/                        # Test files (to be added)
├── scripts/                      # Deployment scripts (to be added)
├── firebase.json                 # Firebase configuration
├── .firebaserc                   # Firebase project aliases
└── README.md                     # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or pnpm
- Firebase CLI: `npm install -g firebase-tools`
- GCP account with Firebase project

### Installation

1. **Clone the repository** (if not already cloned)

2. **Install dependencies:**
   ```bash
   cd backend/functions
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and fill in your API keys:
   - `OPENAI_API_KEY`: Your OpenAI API key (required)
   - `RXNORM_API_KEY`: RxNorm API key (optional, public API)
   - `FDA_API_KEY`: FDA API key (optional, for higher rate limits)

4. **Firebase login:**
   ```bash
   firebase login
   ```

5. **Select Firebase project:**
   ```bash
   firebase use dev
   # or
   firebase use staging
   # or
   firebase use prod
   ```

### Development

1. **Run locally with Firebase Emulators:**
   ```bash
   cd backend/functions
   npm run serve
   ```
   
   This will start:
   - Cloud Functions emulator on `http://localhost:5001`
   - Firestore emulator on `http://localhost:8080`
   - Emulator UI on `http://localhost:4000`

2. **Watch mode for development:**
   ```bash
   npm run dev
   ```

3. **Run linter:**
   ```bash
   npm run lint
   # or fix automatically
   npm run lint:fix
   ```

4. **Run tests:**
   ```bash
   npm test
   # or with coverage
   npm run test:coverage
   ```

### Deployment

1. **Deploy to development:**
   ```bash
   firebase use dev
   npm run deploy
   ```

2. **Deploy to staging:**
   ```bash
   firebase use staging
   npm run deploy
   ```

3. **Deploy to production:**
   ```bash
   firebase use prod
   npm run deploy
   ```

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for full list):

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment: development, staging, production | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes (auto in prod) |
| `OPENAI_API_KEY` | OpenAI API key for AI matching | Yes |
| `RXNORM_API_KEY` | RxNorm API key | No |
| `FDA_API_KEY` | FDA API key | No |
| `API_TIMEOUT_MS` | API timeout in milliseconds | No (default: 2000) |
| `ENABLE_AI_MATCHING` | Enable AI-enhanced matching | No (default: true) |
| `ENABLE_CACHING` | Enable caching layer | No (default: true) |

### Firebase Projects

The project supports multiple environments:

- **Development**: `ndc-calculator-dev`
- **Staging**: `ndc-calculator-staging`
- **Production**: `ndc-calculator-prod`

Switch environments with:
```bash
firebase use <environment>
```

## 📚 API Documentation

### Health Check

**GET** `/health` or **GET** `/api/v1/health`

Returns service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "NDC Calculator API",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### Calculator Endpoint (Coming in PR-06)

**POST** `/api/v1/calculate`

Calculate optimal NDC packages for a prescription.

## 🧪 Testing

### Unit Tests

Run unit tests with:
```bash
npm test
```

Target coverage: **>80%** for critical business logic.

### Integration Tests

Run integration tests with:
```bash
npm run test:integration
```

### E2E Tests

Run end-to-end tests with:
```bash
npm run test:e2e
```

## 📊 Monitoring & Logging

### Structured Logging

All logs are structured JSON in production for GCP Cloud Logging:

```typescript
import { logger } from '@utils/logger';

logger.info('Message', { userId: '123', action: 'calculate' });
logger.error('Error occurred', error, { context: 'additional info' });
```

### Log Levels

- `debug`: Detailed diagnostic information
- `info`: General informational messages
- `warn`: Warning messages for potentially harmful situations
- `error`: Error events that might still allow the application to continue
- `critical`: Severe errors that might cause the application to abort

### Viewing Logs

**Local development:**
```bash
firebase functions:log
```

**Production (GCP Console):**
Navigate to Cloud Functions → Logs in GCP Console

## 🔐 Security

### Authentication

Firebase Authentication is used for user authentication. Protected endpoints require a valid Firebase ID token.

**Example request:**
```bash
curl -H "Authorization: Bearer <firebase-id-token>" \
  https://us-central1-ndc-calculator.cloudfunctions.net/api/api/v1/calculate
```

### Firestore Security Rules

Security rules are defined in `firestore/rules/firestore.rules`:

- Users can only read their own calculation logs
- Cache collections are Cloud Functions only
- Admin role required for user management

### Input Validation

All inputs are validated and sanitized using Zod schemas to prevent:
- SQL injection
- XSS attacks
- Malformed data

## ⚡ Performance

### Caching Strategy

- **Drug normalization**: 24-hour TTL
- **NDC data**: 1-hour TTL
- **Calculation results**: 15-minute TTL

### Response Time Target

**< 2 seconds** for all calculation requests

### Rate Limiting

- Default: 100 requests/hour per user
- Burst: 10 requests
- Different limits for different user roles

## 🐛 Troubleshooting

### Firebase initialization fails

**Solution:** Ensure you're logged in and have selected the correct project:
```bash
firebase login
firebase use dev
```

### API keys not found

**Solution:** Create `.env.local` from `.env.example` and add your keys.

### Firestore permission denied

**Solution:** Deploy Firestore rules:
```bash
firebase deploy --only firestore:rules
```

### Cold start latency

**Solution:** Cold starts are normal for Cloud Functions. Consider:
- Keeping functions warm with scheduled pings
- Increasing minimum instances (costs more)

## 📖 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions Guide](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [RxNorm API](https://rxnav.nlm.nih.gov/APIs.html)
- [FDA NDC Directory](https://open.fda.gov/apis/drug/ndc/)

## 🤝 Contributing

1. Create a feature branch from `develop`
2. Write tests for new functionality
3. Ensure all tests pass: `npm test`
4. Run linter: `npm run lint:fix`
5. Submit a pull request

## 📝 Development Roadmap

### ✅ PR-01: Project Setup (Complete)
- Firebase Cloud Functions initialization
- Environment configuration
- TypeScript setup
- Logging and error handling utilities

### ✅ PR-02: RxNorm API Integration (Complete)
- RxNorm API client with retry logic
- 3-strategy drug normalization
- Drug name parsing utilities
- 51 unit tests, 85% coverage

### 🔄 Upcoming PRs
- PR-03: FDA NDC Directory API Integration
- PR-04: Quantity Calculation Logic
- PR-05: OpenAI Integration
- PR-06: Main Calculator Endpoint
- PR-07: Caching Layer
- PR-08: Authentication & Authorization
- PR-09: Logging & Monitoring
- PR-10: CI/CD Pipeline

## 📄 License

This project is private. All rights reserved.

---

**Last Updated:** November 2025  
**Version:** 1.0.0 (PR-02 Complete)

