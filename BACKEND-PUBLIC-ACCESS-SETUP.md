# Backend Public Access Setup Guide

## Issue

The production Cloud Function is returning **403 Forbidden** because it's not configured for public (unauthenticated) access.

**Error:**
```
Failed to load resource: https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate
net::ERR_CONNECTION_REFUSED (when using localhost:5001)
403 Forbidden (when using production)
```

---

## Quick Fix: Make Cloud Function Publicly Accessible

### Option 1: Using Google Cloud Console (Recommended - GUI)

1. **Go to Cloud Functions:**
   - Open: https://console.cloud.google.com/functions
   - Select project: `ndcpharma-8f3c6`

2. **Find your function:**
   - Click on the `api` function

3. **Set permissions:**
   - Click on **PERMISSIONS** tab (at the top)
   - Click **ADD PRINCIPAL**
   - In "New principals" field, enter: `allUsers`
   - In "Select a role" dropdown, choose: **Cloud Functions Invoker**
   - Click **SAVE**

4. **Confirmation:**
   - You should see a warning about making this function public
   - Click **ALLOW PUBLIC ACCESS**

5. **Test:**
   - Try accessing: https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/health
   - Should return JSON with service status

---

### Option 2: Using gcloud CLI (If you have it installed)

```bash
gcloud functions add-iam-policy-binding api \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=ndcpharma-8f3c6
```

---

## After Setup: Test Your API

### 1. Test Health Endpoint

```bash
curl "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/health"
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T...",
  "services": {
    "rxnorm": "connected",
    "fda": "connected",
    "openai": "connected",
    "firestore": "connected"
  }
}
```

### 2. Test Calculator Endpoint

```bash
curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": { "name": "Lisinopril 10mg" },
    "sig": { "dose": 1, "frequency": 1, "unit": "tablet" },
    "daysSupply": 30
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "drug": {
      "rxcui": "...",
      "name": "Lisinopril 10 MG",
      ...
    },
    "recommendedPackages": [...],
    ...
  }
}
```

---

## Security Considerations

### ⚠️ Important Notes

1. **Authentication is Optional:**
   - The calculator works WITHOUT authentication (as designed)
   - Authenticated users get higher rate limits
   - Rate limiting is still enforced for anonymous users

2. **Rate Limiting in Place:**
   - Anonymous: 20 requests/minute per IP
   - Authenticated users: 100 requests/minute
   - Admins: 1000 requests/minute

3. **CORS is Configured:**
   - Frontend domains are whitelisted
   - API is protected from unauthorized origins

4. **No Sensitive Data Exposed:**
   - Calculator doesn't require PHI (Protected Health Information)
   - No patient data stored for anonymous requests

### If You Want More Security

If you prefer to **require authentication** for all calculator requests:

1. Update `frontend/lib/api-client.ts`:
   ```typescript
   // Always require auth token
   if (!idToken) {
     throw new APIError('Authentication required', 'UNAUTHORIZED', 401);
   }
   ```

2. Update `apps/functions/src/index.ts`:
   ```typescript
   // Change from optionalAuth to verifyToken
   app.post(
     '/v1/calculate',
     asyncHandler(verifyToken),  // ← Change this
     asyncHandler(rateLimitMiddleware),
     validateRequest(CalculateRequestSchema),
     asyncHandler(calculateHandler)
   );
   ```

3. Redeploy functions:
   ```bash
   cd apps/functions
   firebase deploy --only functions
   ```

---

## Troubleshooting

### Issue: Still getting 403 after adding permissions

**Solution:**
1. Wait 1-2 minutes for IAM changes to propagate
2. Clear browser cache
3. Try in incognito/private mode
4. Check Cloud Function logs: https://console.cloud.google.com/logs

### Issue: Getting CORS errors

**Solution:**
Check `apps/functions/src/index.ts` - CORS origins should include your frontend domain:
```typescript
app.use(cors({ origin: getCorsOrigins() }));
```

### Issue: Function not found

**Solution:**
Verify function is deployed:
```bash
firebase functions:list
```

---

## Alternative: Use Firebase Emulator for Local Development

If you prefer to develop locally without using production:

### 1. Start Emulator

```bash
cd /Users/tahmeedrahim/Documents/Projects/NDC
firebase emulators:start --only functions
```

### 2. Update Frontend .env.local

```bash
# Use emulator
NEXT_PUBLIC_API_URL=http://localhost:5001/ndcpharma-8f3c6/us-central1/api
```

### 3. Restart Frontend

```bash
cd frontend
pnpm dev
```

**Pros:**
- Faster iteration
- No deployment needed
- Free (no Cloud Function costs)

**Cons:**
- Need to keep emulator running
- Slightly different behavior than production
- Can't test with real Firebase services

---

## Current Configuration

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api
```

**Once you make the Cloud Function public, your calculator should work immediately!**

---

## Next Steps

1. ✅ Make Cloud Function public (Option 1 above)
2. ✅ Test health endpoint
3. ✅ Reload your frontend (http://localhost:3000/dashboard)
4. ✅ Try calculating with a drug like "Metformin"
5. ✅ Verify results display correctly

---

## Support

If you encounter any issues:
- Check Cloud Function logs: https://console.cloud.google.com/logs
- Verify IAM permissions: https://console.cloud.google.com/functions
- Test API directly with curl commands above

---

*Last updated: November 13, 2025*

