# How to Clear Rate Limit

## Current Situation
You've hit the rate limit (10 requests in the past hour). The limit resets at: **2025-11-13T12:52:52.563Z**

## Options to Continue Testing

### Option 1: Wait for Reset ⏰
The simplest option - wait until the reset time (about 48 minutes from when you hit the limit).

### Option 2: Clear Firestore Rate Limit Record (Immediate) 🔥

**Using Firebase Console:**
1. Go to: https://console.firebase.google.com/project/ndcpharma-8f3c6/firestore
2. Navigate to the `userActivity` collection
3. Find the document for your IP address (check recent documents)
4. Either:
   - Delete the entire document, OR
   - Update the `rateLimitResets` field to a past date (e.g., `2025-11-13T11:00:00.000Z`)
5. Try your request again

**Using Firebase CLI:**
```bash
# This would require a script to find and delete the rate limit record
# Not recommended for quick fixes
```

### Option 3: Use a Different Network 🌐
- Switch to a different WiFi network
- Use mobile hotspot
- Use VPN (changes your IP address)

### Option 4: Sign In (Recommended for Development) 👤
- Create an account and sign in
- Authenticated users get 100 requests/hour (Pharmacy Technician role)
- Or get Admin role for unlimited requests

## Rate Limit Details

**Current Limits (per hour):**
- Anonymous: 100 requests/hour (just increased from 10)
- Pharmacy Technician: 100 requests/hour
- Pharmacist: 200 requests/hour
- Admin: Unlimited

**Note:** The new 100 req/hour limit for anonymous users is now deployed, but your current lock will remain until the reset time because Firestore already has your rate limit record.

## Testing Script

Here's a simple script to test with delay between requests:

```bash
#!/bin/bash
# test-with-delay.sh

for i in {1..5}; do
  echo "Request $i..."
  curl -X POST "https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate" \
    -H "Content-Type: application/json" \
    -d '{
      "drug": { "name": "Lisinopril 10 MG Oral Tablet" },
      "sig": { "dose": 1, "frequency": 1, "unit": "tablet" },
      "daysSupply": 30
    }' | jq '.success'
  
  if [ $i -lt 5 ]; then
    echo "Waiting 5 seconds..."
    sleep 5
  fi
done
```

## For Future Testing

**Best Practice:**
1. Create a test admin account
2. Get an auth token
3. Include in requests: `-H "Authorization: Bearer YOUR_TOKEN"`
4. Never hit rate limits again during testing

**Get Auth Token:**
```javascript
// In browser console after signing in
firebase.auth().currentUser.getIdToken().then(token => console.log(token));
```

## Quick Fix Command

If you need to clear your rate limit **right now** and can access Firestore:

```javascript
// Run in Firebase Console > Firestore > Query
// Find document where IP matches yours and delete it
// Then you can immediately make more requests
```

