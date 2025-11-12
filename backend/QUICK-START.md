# NDC Calculator Backend - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd backend/functions
npm install
```

### Step 2: Configure Environment
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your API keys
nano .env.local
```

**Required variables:**
- `OPENAI_API_KEY` - Your OpenAI API key

**Optional variables:**
- `RXNORM_API_KEY` - RxNorm API key (public API, optional)
- `FDA_API_KEY` - FDA API key (for higher rate limits)

### Step 3: Login to Firebase
```bash
firebase login
```

### Step 4: Start Development Server
```bash
# Option A: Watch mode (recommended for development)
npm run dev

# Option B: Firebase emulators (full stack)
npm run serve
```

### Step 5: Test the Health Endpoint

**If using watch mode:**
```bash
curl http://localhost:5001/ndc-calculator-dev/us-central1/api/health
```

**If using emulators:**
```bash
curl http://localhost:5001/ndc-calculator-dev/us-central1/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

## 🧪 Run Tests
```bash
npm test
```

## 🔍 Check Code Quality
```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

## 📦 Build for Production
```bash
npm run build
```

## 🚀 Deploy
```bash
# Development
cd ..
./scripts/deploy.sh dev

# Staging
./scripts/deploy.sh staging

# Production
./scripts/deploy.sh prod
```

## 📊 View Logs
```bash
# Local emulator logs
# Check terminal where emulator is running

# Production logs
firebase functions:log
```

## 🔧 Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode with hot reload |
| `npm run serve` | Run with Firebase emulators |
| `npm run build` | Build TypeScript |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Test coverage report |
| `npm run lint` | Check code quality |
| `npm run lint:fix` | Auto-fix linting issues |

## 📚 Next Steps

1. **PR-02:** Implement RxNorm API Integration
2. **PR-03:** Implement FDA NDC Directory API
3. **PR-04:** Build quantity calculation logic
4. **PR-05:** Add OpenAI AI enhancement
5. **PR-06:** Create main calculator endpoint

## 🆘 Troubleshooting

### Firebase not initialized
```bash
firebase login
firebase use dev
```

### Environment variables not found
Create `.env.local` from `.env.example` and add your API keys.

### Port already in use
Change port in `firebase.json` or kill the process using the port.

### TypeScript compilation errors
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📖 Documentation

- [Backend README](./README.md) - Full documentation
- [PR-01 Summary](./PR-01-SUMMARY.md) - What was built
- [Root README](../README.md) - Project overview

---

**Happy Coding! 🎉**

