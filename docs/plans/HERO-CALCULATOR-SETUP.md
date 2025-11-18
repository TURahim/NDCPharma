# 🎯 Hero Calculator - Setup Complete

## ✅ What's Been Wired Up

The hero calculator on the landing page is now **fully functional** and connected to the backend pharmaceutical APIs!

---

## 🔑 API Keys - NO KEYS REQUIRED! 

**Great news**: Both pharmaceutical APIs are **completely FREE** and work without API keys:

### 1. **RxNorm API** (National Library of Medicine)
- **URL**: `https://rxnav.nlm.nih.gov/REST`
- **API Key**: ❌ NOT NEEDED - Completely public and free
- **Purpose**: Drug normalization (name → RxCUI → standard drug codes)
- **Rate Limits**: Generous for normal use

### 2. **openFDA API** (FDA NDC Directory)
- **URL**: `https://api.fda.gov/drug/ndc.json`
- **API Key**: ⚠️ OPTIONAL (works fine without)
- **Purpose**: NDC package lookup, drug labeling info, status
- **Rate Limits**:
  - **Without key**: 40 requests/minute, 1,000/day (sufficient for testing)
  - **With key**: 240 requests/minute, 120,000/day
  - **Get key** (optional): https://open.fda.gov/apis/authentication/

### 3. **OpenAI API** (Optional - Currently Disabled)
- **Status**: Feature-flagged OFF by default
- **Purpose**: AI-powered SIG parsing for complex prescriptions
- **Currently**: Using simple regex-based SIG parser
- **If you want to enable**:
  - Get key at: https://platform.openai.com/api-keys
  - Add to `apps/functions/.env.local`: `OPENAI_API_KEY=sk-...`
  - Set feature flag: `ENABLE_AI_MATCHING=true`

---

## 📁 Configuration Files Created

### Backend (`apps/functions/`)
```bash
apps/functions/.env.example  # ✅ Created - Template with all config options
apps/functions/.env.local    # ✅ Created - Active config (gitignored)
```

**Current Backend Config**:
- ✅ RxNorm API: Public, no key needed
- ✅ FDA API: Public, working without key
- ❌ OpenAI API: Disabled (not needed for MVP)
- ✅ Caching: Enabled (Firestore)
- ✅ Analytics: Enabled
- ✅ CORS: Allows `http://localhost:3000`

### Frontend (`frontend/`)
```bash
frontend/.env.local   # ✅ Already exists
```

**Current Frontend Config**:
- ✅ API URL: `http://localhost:5001/ndcpharma-8f3c6/us-central1/api` (emulator)
- ✅ Firebase config: All set

---

## 🚀 How to Use

### 1. **Both Servers Are Running**:

**Frontend** (Next.js):
```
✅ Running at: http://localhost:3000
```

**Backend** (Firebase Functions Emulator):
```
✅ Running at: http://localhost:5001/ndcpharma-8f3c6/us-central1/api
```

### 2. **Open Your Browser**:
Navigate to: **http://localhost:3000**

### 3. **Test the Calculator**:

**Example 1: Lisinopril**
- Drug name: `Lisinopril`
- SIG: `1 tablet daily`
- Days supply: `30`
- **Expected**: Returns Lisinopril 10mg or 20mg packages, 30-count bottles

**Example 2: Ibuprofen**
- Drug name: `Ibuprofen`
- SIG: `2 tablets three times daily`
- Days supply: `10`
- **Expected**: Returns Ibuprofen packages, calculates 60 tablets needed

**Example 3: Amoxicillin**
- Drug name: `Amoxicillin`
- SIG: `1 capsule twice daily`
- Days supply: `7`
- **Expected**: Returns Amoxicillin packages, calculates 14 capsules needed

---

## 🎨 What Was Updated

### `frontend/components/hero.tsx`
✅ **Before**: Static mockup with no functionality
✅ **After**: Live calculator with:
- Real-time form input
- SIG parser (extracts dose, frequency, unit from text)
- API integration to backend
- Loading states with spinner
- Error handling with red error cards
- Success display with green result cards
- Real NDC data from pharmaceutical APIs

### Features Added:
1. **Smart SIG Parser**: Understands common prescription patterns:
   - "1 tablet daily" → dose: 1, frequency: 1, unit: tablet
   - "2 tablets twice daily" → dose: 2, frequency: 2, unit: tablet
   - "1 capsule every 8 hours" → dose: 1, frequency: 3, unit: capsule

2. **Real-time Validation**: Form validates inputs before submission

3. **Dynamic Results**: Shows actual NDC codes, quantities, and match precision

4. **Error Handling**: Clear error messages for:
   - Network errors
   - Invalid drug names
   - API failures
   - Rate limiting

---

## 🔍 Backend API Flow

When you submit the form, here's what happens:

1. **Frontend** (`hero.tsx`):
   - Captures: drug name, SIG text, days supply
   - Parses SIG into structured format
   - Calls `calculateNDC(apiData, null)` → no auth token for MVP

2. **API Client** (`lib/api-client.ts`):
   - POSTs to: `${API_URL}/v1/calculate`
   - Sends: `{ drug: { name }, sig: { dose, frequency, unit }, daysSupply }`
   - Handles errors, rate limits, network issues

3. **Backend** (`apps/functions/src/api/v1/calculate.ts`):
   - Validates input with Zod schema
   - Orchestrates 3 services:

4. **RxNorm Client** (`@clients-rxnorm`):
   - Normalizes drug name → RxCUI (standard drug code)
   - Example: "Lisinopril" → RxCUI `314076`

5. **FDA Client** (`@clients-openfda`):
   - Fetches NDC packages for the drug
   - Example: Returns all Lisinopril 10mg, 20mg, 30mg packages

6. **Domain Calculator** (`@domain-ndc`):
   - Calculates quantity needed: `dose × frequency × daysSupply`
   - Matches to available package sizes
   - Detects exact matches, underfills, overfills
   - Ranks by best match

7. **Response**:
   - Returns JSON with recommended packages
   - Frontend displays the top match in the result card

---

## 🎯 Production Deployment

### To deploy to production (optional):

1. **Deploy Backend**:
```bash
cd /Users/tahmeedrahim/Documents/Projects/NDC
firebase deploy --only functions
```

2. **Update Frontend API URL**:
Edit `frontend/.env.local`:
```bash
# Comment out emulator URL:
# NEXT_PUBLIC_API_URL=http://localhost:5001/ndcpharma-8f3c6/us-central1/api

# Uncomment production URL:
NEXT_PUBLIC_API_URL=https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api
```

3. **Restart Frontend**:
```bash
cd frontend
pnpm dev
```

---

## ⚡ Optional: Add FDA API Key (Higher Rate Limits)

If you want higher rate limits for production use:

1. **Get a free FDA API key**:
   - Visit: https://open.fda.gov/apis/authentication/
   - Enter your email
   - Check inbox for API key (instant, no approval needed)

2. **Add to backend config**:
Edit `apps/functions/.env.local`:
```bash
# Uncomment and add your key:
FDA_API_KEY=your_key_here
```

3. **Restart emulator**:
```bash
# Stop current emulator (Ctrl+C in terminal)
# Then restart:
firebase emulators:start --only functions
```

**Benefits**:
- Without key: 40 req/min, 1,000/day
- With key: 240 req/min, 120,000/day

---

## 📊 What You'll See

### Loading State:
- Calculate button shows: "Calculating..." with spinner
- Inputs are disabled

### Success State:
- Blue card appears below form
- Shows "OPTIMAL MATCH"
- Displays:
  - NDC code (11-digit format)
  - Quantity needed + package type
  - Match precision (Perfect match / Underfill / Overfill)
  - Green "✓ Valid" badge

### Error State:
- Red card appears below form
- Shows "ERROR"
- Displays clear error message

---

## 🎉 Summary

✅ **Hero calculator is fully wired and functional**
✅ **No API keys required** - both pharma APIs are free
✅ **Frontend + Backend running locally**
✅ **Real pharmaceutical data** from RxNorm + FDA
✅ **Smart SIG parsing** built-in
✅ **Production-ready** - just deploy when ready!

**Test it now**: Open http://localhost:3000 and try calculating some prescriptions! 🚀

