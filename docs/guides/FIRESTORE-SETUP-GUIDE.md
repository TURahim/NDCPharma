# 🔥 Firestore Setup Guide

This guide walks you through setting up Firestore collections, security rules, and test users for the NDC Calculator.

## ✅ Step 1: Deploy Security Rules & Indexes (COMPLETED)

Security rules and indexes have been deployed successfully:

```bash
firebase deploy --only firestore:indexes,firestore:rules --project ndcpharma-8f3c6
```

**Status:** ✅ DEPLOYED
- **Rules:** 67 lines deployed to cloud.firestore
- **Indexes:** 6 composite indexes created
- **Collections:** users, userActivity, calculationLogs, calculationCache

---

## 📋 Step 2: Create Test Users

You have **two options** to create test users:

### Option A: Use the Initialization Script (Automated)

**Requirements:**
1. Download service account key from Firebase Console
2. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
3. Run the initialization script

**Steps:**

```bash
# 1. Download service account key
# Go to: Firebase Console → Project Settings → Service Accounts
# Click "Generate new private key" → Save as ndcpharma-service-account.json

# 2. Set environment variable (macOS/Linux)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/ndcpharma-service-account.json"

# 3. Run initialization script
cd /Users/tahmeedrahim/Documents/Projects/NDC
node scripts/init-firestore-collections.js
```

This will automatically create:
- ✅ 3 test users (admin, pharmacist, technician)
- ✅ User profiles in Firestore `users` collection
- ✅ Activity tracking in `userActivity` collection
- ✅ 3 sample calculation logs

### Option B: Manual Setup (Firebase Console)

#### 2.1 Create Users in Firebase Authentication

1. Go to Firebase Console → Authentication → Users
2. Click **"Add user"** for each user below:

**Admin User:**
- Email: `admin@ndcpharma.com`
- Password: `Admin123!`
- UID: (auto-generated, copy this)

**Pharmacist User:**
- Email: `pharmacist@ndcpharma.com`
- Password: `Pharmacist123!`
- UID: (auto-generated, copy this)

**Pharmacy Technician User:**
- Email: `technician@ndcpharma.com`
- Password: `Technician123!`
- UID: (auto-generated, copy this)

#### 2.2 Create User Profiles in Firestore

Go to Firebase Console → Firestore Database → Start Collection

**Collection:** `users`

Create 3 documents (one for each user):

**Document 1: Admin User**
- Document ID: `<admin-uid-from-step-2.1>`
- Fields:
  ```
  uid: <admin-uid>
  email: "admin@ndcpharma.com"
  role: "admin"
  displayName: "Admin User"
  emailVerified: true
  isActive: true
  createdAt: <current-timestamp>
  updatedAt: <current-timestamp>
  lastLoginAt: <current-timestamp>
  ```

**Document 2: Pharmacist User**
- Document ID: `<pharmacist-uid-from-step-2.1>`
- Fields:
  ```
  uid: <pharmacist-uid>
  email: "pharmacist@ndcpharma.com"
  role: "pharmacist"
  displayName: "John Smith, RPh"
  organization: "Test Pharmacy"
  licenseNumber: "RPH-12345"
  emailVerified: true
  isActive: true
  createdAt: <current-timestamp>
  updatedAt: <current-timestamp>
  lastLoginAt: <current-timestamp>
  ```

**Document 3: Pharmacy Technician User**
- Document ID: `<technician-uid-from-step-2.1>`
- Fields:
  ```
  uid: <technician-uid>
  email: "technician@ndcpharma.com"
  role: "pharmacy_technician"
  displayName: "Jane Doe, CPhT"
  organization: "Test Pharmacy"
  licenseNumber: "PT-67890"
  emailVerified: true
  isActive: true
  createdAt: <current-timestamp>
  updatedAt: <current-timestamp>
  lastLoginAt: <current-timestamp>
  ```

#### 2.3 Initialize User Activity Tracking

**Collection:** `userActivity`

Create 3 documents (one for each user):

**Document Template:**
- Document ID: `<user-uid>`
- Fields:
  ```
  userId: "<user-uid>"
  email: "<user-email>"
  role: "<user-role>"
  calculationCount: 0
  totalRequests: 0
  currentHourRequests: 0
  lastCalculation: <current-timestamp>
  rateLimitResets: <timestamp-1-hour-from-now>
  createdAt: <current-timestamp>
  updatedAt: <current-timestamp>
  lastActiveAt: <current-timestamp>
  isActive: true
  preferences: {
    notifications: true,
    theme: "auto"
  }
  ```

Repeat for all 3 users (admin, pharmacist, technician).

---

## 🧪 Step 3: Test Authentication

Once users are created, you can test authentication:

### Using Firebase REST API (for testing)

```bash
# Get ID token for a user
curl 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_WEB_API_KEY' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "email":"pharmacist@ndcpharma.com",
    "password":"Pharmacist123!",
    "returnSecureToken":true
  }'
```

**To get your Web API Key:**
- Firebase Console → Project Settings → General
- Copy the "Web API Key"

### Test with the Calculator API

```bash
# 1. Get ID token from above
export ID_TOKEN="<id-token-from-signin>"

# 2. Call calculator endpoint with authentication
curl -X POST https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api/v1/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -d '{
    "drug": {
      "name": "Lisinopril"
    },
    "sig": {
      "dose": 1,
      "frequency": 1,
      "unit": "tablet"
    },
    "daysSupply": 30
  }'
```

---

## 🔐 Security Rules Summary

The following security rules are now active:

### Collection: `users`
- ✅ Users can **read** their own profile
- ✅ Users can **update** their own profile (except `role` field)
- ✅ Only **admins** can create/delete users
- ❌ Anonymous access denied

### Collection: `userActivity`
- ✅ Users can **read** their own activity
- ✅ Only **Cloud Functions** can write activity
- ✅ **Admins** can read all activity
- ❌ Anonymous access denied

### Collection: `calculationLogs`
- ✅ Users can **read** their own logs
- ✅ Only **Cloud Functions** can create logs
- ✅ **Admins** can read all logs
- ❌ Updates/deletes not allowed (audit trail)
- ❌ Anonymous access denied

### Collection: `calculationCache`
- ✅ Only **Cloud Functions** can read/write
- ❌ All client access denied

---

## 📊 Firestore Indexes Summary

6 composite indexes have been deployed:

1. **calculationLogs**: `userId` (ASC) + `timestamp` (DESC)
2. **calculationLogs**: `cacheHit` (ASC) + `timestamp` (DESC)
3. **calculationLogs**: `aiUsed` (ASC) + `timestamp` (DESC)
4. **users**: `role` (ASC) + `isActive` (ASC)
5. **userActivity**: `role` (ASC) + `lastActiveAt` (DESC)
6. **userActivity**: `isActive` (ASC) + `calculationCount` (DESC)

**Status:** ✅ All indexes are being built in the background.

---

## 🎯 Rate Limits by Role

| Role | Requests/Hour | Description |
|------|---------------|-------------|
| **admin** | Unlimited | Full system access |
| **pharmacist** | 200 | Licensed pharmacist |
| **pharmacy_technician** | 100 | Pharmacy technician |
| **Anonymous** | Denied | Must authenticate |

---

## 🛠️ Troubleshooting

### Issue: "Permission Denied" when accessing Firestore

**Solution:** Ensure security rules are deployed:
```bash
firebase deploy --only firestore:rules --project ndcpharma-8f3c6
```

### Issue: "Index not ready" error

**Solution:** Wait 5-10 minutes for Firestore to build indexes. Check status in Firebase Console → Firestore → Indexes.

### Issue: User can't authenticate

**Solution:** 
1. Verify user exists in Firebase Authentication
2. Verify user profile exists in Firestore `users` collection
3. Verify `role` field is set correctly in user profile

### Issue: Rate limit not working

**Solution:**
1. Verify `userActivity` document exists for the user
2. Check `rateLimitResets` timestamp is in the future
3. Verify Cloud Functions can write to `userActivity`

---

## ✅ Verification Checklist

Before moving to the next PR, verify:

- [ ] Security rules deployed successfully
- [ ] All 6 composite indexes created
- [ ] Test users created in Firebase Authentication
- [ ] User profiles created in Firestore `users` collection
- [ ] User activity documents created in `userActivity` collection
- [ ] Can authenticate with test users
- [ ] Can call `/v1/health` endpoint (no auth required)
- [ ] Can call `/v1/calculate` endpoint with Bearer token

---

## 📚 Next Steps

After completing this setup:

1. **PR-08 Part 2**: Wire up auth middleware to endpoints
2. **PR-09**: Implement logging and monitoring
3. **PR-10**: Build frontend authentication flow

---

**Last Updated:** 2025-11-13  
**Firebase Project:** ndcpharma-8f3c6  
**Status:** 🟢 Rules & Indexes Deployed, Users Pending Setup

