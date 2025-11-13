# PR-07: Cache Integration Guide

**⚠️ IMPORTANT: Server Integration Required**

The caching layer has been implemented but **requires integration into the actual server application** to be functional. This guide provides step-by-step instructions for integrating the cache.

---

## 📋 What's Been Completed

✅ **Part 1: Foundation**
- Firestore-based cache service (`@data-cache`)
- Cache schemas and indexes
- Security rules
- Firebase configuration

✅ **Part 2: Client Integration**
- RxNorm cached facade
- FDA cached client
- 30 comprehensive tests (100% passing)

❌ **Part 3: Server Integration** (PENDING - See instructions below)
- Initialize Firestore in server
- Wire up cached clients in calculator endpoint
- Add cache statistics endpoint
- Monitor performance improvements

---

## 🚀 Integration Steps

### Step 1: Initialize Firestore in Server

In `apps/functions/src/index.ts`, add Firestore initialization:

```typescript
import * as admin from 'firebase-admin';
import { FirestoreCacheService } from '@data-cache';
import { initRxNormCache } from '@clients-rxnorm';
import { initFDACache } from '@clients-openfda';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Firestore instance
const db = admin.firestore();

// Create cache service instance
const cacheService = new FirestoreCacheService(db, 'calculationCache', {
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 10000, // 10,000 entries
  cleanupInterval: 60 * 60 * 1000, // Cleanup every hour
});

// Initialize caches for RxNorm and FDA clients
initRxNormCache(cacheService);
initFDACache(cacheService);

// Log cache initialization
logger.info('Cache service initialized', {
  collection: 'calculationCache',
  defaultTTL: '24h',
  cleanupInterval: '1h',
});
```

---

### Step 2: Use Cached Clients in Calculator Endpoint

In `apps/functions/src/api/v1/calculate.ts`, replace non-cached clients:

**Before:**
```typescript
import { nameToRxCui } from '@clients-rxnorm';
import { fdaClient } from '@clients-openfda';
```

**After:**
```typescript
import { nameToRxCuiCached } from '@clients-rxnorm';
import { cachedFdaClient } from '@clients-openfda';
```

**Update function calls:**
```typescript
// Drug normalization (cached)
const normalizationResult = await nameToRxCuiCached(request.drug.name);

// NDC lookup (cached)
const allPackages = await cachedFdaClient.getNDCsByRxCUI(rxcui, {
  limit: 100,
  activeOnly: true,
});

// NDC validation (cached)
const validation = await cachedFdaClient.validateNDC(ndc);
```

---

### Step 3: Add Cache Statistics Endpoint

Create `apps/functions/src/api/v1/cacheStats.ts`:

```typescript
import { Request, Response } from 'express';
import { createLogger } from '@core-guardrails';

// Import the cache service instance (export it from index.ts)
import { cacheService } from '../../index';

const logger = createLogger({ service: 'CacheStats' });

export async function getCacheStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await cacheService.getStats();
    
    res.status(200).json({
      success: true,
      data: {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: `${stats.hitRate.toFixed(2)}%`,
        size: stats.size,
        avgLatency: `${stats.avgLatency.toFixed(2)}ms`,
      },
    });
  } catch (error) {
    logger.error('Failed to get cache stats', error as Error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_STATS_ERROR',
        message: 'Failed to retrieve cache statistics',
      },
    });
  }
}
```

**Add route in `index.ts`:**
```typescript
import { getCacheStats } from './api/v1/cacheStats';

// Add after health check
app.get('/v1/cache/stats', asyncHandler(getCacheStats));
```

---

### Step 4: Deploy Firestore Indexes and Rules

```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy Firestore security rules
firebase deploy --only firestore:rules
```

---

### Step 5: Monitor Cache Performance

Add logging to track cache effectiveness in `calculate.ts`:

```typescript
// At the start of calculateHandler
const cacheHit = {
  drugNormalization: false,
  ndcLookup: false,
};

// After drug normalization
if (normalizationResult.cacheUsed) {
  cacheHit.drugNormalization = true;
}

// After NDC lookup
if (ndcLookupResult.cacheUsed) {
  cacheHit.ndcLookup = true;
}

// Log at the end
logger.info('Calculation completed', {
  executionTime,
  cacheHit,
  totalQuantity,
});
```

---

## 🔧 Configuration Options

### Cache TTLs

Adjust TTLs based on your needs:

```typescript
// Drug normalization (rarely changes)
const DRUG_NORMALIZATION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// NDC lookup (changes more frequently)
const NDC_LOOKUP_TTL = 60 * 60 * 1000; // 1 hour

// NDC validation (for critical safety checks)
const NDC_VALIDATION_TTL = 30 * 60 * 1000; // 30 minutes
```

### Cache Size Limits

```typescript
const cacheService = new FirestoreCacheService(db, 'calculationCache', {
  maxSize: 10000, // Adjust based on expected usage
  // Firestore has a 20,000 writes/day limit on free tier
  // Consider upgrading for production use
});
```

### Cleanup Interval

```typescript
const cacheService = new FirestoreCacheService(db, 'calculationCache', {
  cleanupInterval: 60 * 60 * 1000, // Every hour
  // Set to `undefined` to disable automatic cleanup
  // Manual cleanup: await cacheService.cleanupExpired()
});
```

---

## 📊 Expected Performance Improvements

### Before Caching:
- Avg response time: ~1000ms
- P95 response time: ~2000ms
- External API calls: 2-3 per request
- API rate limit impact: High

### After Caching (80% hit rate):
- Avg response time: ~150ms (**85% faster**)
- P95 response time: ~500ms (**75% faster**)
- External API calls: 0.4-0.6 per request (**80% reduction**)
- API rate limit impact: Low

### Cache Hit Rate Targets:
- Drug normalization: **>90%** (common drugs cached)
- NDC lookup: **>80%** (popular RxCUIs cached)
- Overall: **>85%** hit rate

---

## 🧪 Testing Cache Integration

### 1. Verify Cache Initialization

```bash
# Check Firebase Function logs
firebase functions:log

# Look for:
# "Cache service initialized"
# "RxNorm cache initialized"
# "FDA cache initialized"
```

### 2. Test Cache Hit/Miss

```bash
# First request (cache miss)
curl -X POST http://localhost:5001/v1/calculate \
  -H "Content-Type: application/json" \
  -d '{"drug":{"name":"Lisinopril"},"sig":{"dose":1,"frequency":1,"unit":"tablet"},"daysSupply":30}'

# Second identical request (cache hit)
curl -X POST http://localhost:5001/v1/calculate \
  -H "Content-Type: application/json" \
  -d '{"drug":{"name":"Lisinopril"},"sig":{"dose":1,"frequency":1,"unit":"tablet"},"daysSupply":30}'

# Check logs for "Cache hit" messages
```

### 3. Check Cache Statistics

```bash
curl http://localhost:5001/v1/cache/stats
```

Expected response:
```json
{
  "success": true,
  "data": {
    "hits": 150,
    "misses": 50,
    "hitRate": "75.00%",
    "size": 42,
    "avgLatency": "2.35ms"
  }
}
```

---

## 🔍 Troubleshooting

### Issue: "Cache not available" warnings

**Cause:** Cache service not initialized before client usage

**Solution:** Ensure `initRxNormCache()` and `initFDACache()` are called after creating `cacheService` and before any API requests

---

### Issue: Cache always misses

**Cause:** Firestore not properly initialized or connection issues

**Solution:**
1. Check Firestore connection: `await db.collection('calculationCache').limit(1).get()`
2. Verify Firebase Admin SDK is initialized: `admin.apps.length > 0`
3. Check Firestore security rules allow Cloud Functions access

---

### Issue: High cache miss rate

**Cause:** TTL too short or cache cleared frequently

**Solution:**
1. Increase TTLs for stable data (drug names, RxCUIs)
2. Disable automatic cleanup if causing issues
3. Warm cache with common drugs on startup

---

### Issue: Firestore quota exceeded

**Cause:** Too many write operations (cache sets)

**Solution:**
1. Increase TTLs to reduce cache churn
2. Implement write-through caching (update less frequently)
3. Upgrade Firebase plan for production

---

## 🎯 Success Criteria

- ✅ Cache service initialized without errors
- ✅ Cache hit rate >80% for common drugs
- ✅ Response time reduced by >70%
- ✅ External API calls reduced by >75%
- ✅ No cache-related errors in logs
- ✅ Cache statistics endpoint functional

---

## 📝 Next Steps

1. **Integrate cache into server** (follow steps above)
2. **Deploy Firestore configuration**
3. **Monitor cache performance** for 1 week
4. **Tune TTLs** based on observed patterns
5. **Implement cache warming** for top 100 drugs
6. **Set up alerts** for low cache hit rates (<70%)

---

## ⚠️ Production Checklist

Before deploying to production:

- [ ] Firestore indexes deployed
- [ ] Security rules deployed and tested
- [ ] Cache service initialized in server
- [ ] Cached clients wired up in endpoints
- [ ] Cache statistics endpoint added
- [ ] Monitoring and alerting configured
- [ ] Performance testing completed (cache hit rate >80%)
- [ ] Load testing with concurrent requests
- [ ] Firestore quota sufficient for expected traffic
- [ ] Backup/recovery plan for cache data (optional, cache is ephemeral)

---

**Last Updated:** PR-07 Completion  
**Integration Status:** ⚠️ PENDING SERVER IMPLEMENTATION  
**Estimated Integration Time:** 1-2 hours

