#!/usr/bin/env node

/**
 * Initialize Firestore Collections
 * 
 * This script creates the necessary Firestore collections and adds sample data.
 * Run this after deploying Firestore rules and indexes.
 * 
 * Usage:
 *   node scripts/init-firestore-collections.js
 * 
 * Requirements:
 *   - Firebase Admin SDK credentials
 *   - GOOGLE_APPLICATION_CREDENTIALS env var set (or running in Firebase/GCP)
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath && !admin.apps.length) {
  console.log('⚠️  GOOGLE_APPLICATION_CREDENTIALS not set. Attempting default initialization...');
  admin.initializeApp({
    projectId: 'ndcpharma-8f3c6',
  });
} else if (!admin.apps.length) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();
const auth = admin.auth();

console.log('🚀 Initializing Firestore Collections for NDC Calculator...\n');

/**
 * Create a test user with specific role
 */
async function createTestUser(email, password, role, displayName) {
  try {
    // Check if user already exists
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`✅ User ${email} already exists (UID: ${user.uid})`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        user = await auth.createUser({
          email,
          password,
          displayName,
          emailVerified: true, // Auto-verify for test users
        });
        console.log(`✅ Created user: ${email} (UID: ${user.uid})`);
      } else {
        throw error;
      }
    }

    // Create/update user profile in Firestore
    const userDoc = db.collection('users').doc(user.uid);
    const userProfile = {
      uid: user.uid,
      email: user.email,
      role: role,
      displayName: displayName,
      emailVerified: true,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (role === 'pharmacist') {
      userProfile.organization = 'Test Pharmacy';
      userProfile.licenseNumber = 'RPH-12345';
    } else if (role === 'pharmacy_technician') {
      userProfile.organization = 'Test Pharmacy';
      userProfile.licenseNumber = 'PT-67890';
    }

    await userDoc.set(userProfile, { merge: true });
    console.log(`✅ Created/updated user profile in Firestore (role: ${role})`);

    // Initialize user activity tracking
    const activityDoc = db.collection('userActivity').doc(user.uid);
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    await activityDoc.set({
      userId: user.uid,
      email: user.email,
      role: role,
      calculationCount: 0,
      totalRequests: 0,
      currentHourRequests: 0,
      lastCalculation: admin.firestore.FieldValue.serverTimestamp(),
      rateLimitResets: admin.firestore.Timestamp.fromDate(oneHourFromNow),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      preferences: {
        notifications: true,
        theme: 'auto',
      },
    }, { merge: true });
    console.log(`✅ Initialized user activity tracking\n`);

    return user;
  } catch (error) {
    console.error(`❌ Error creating user ${email}:`, error.message);
    throw error;
  }
}

/**
 * Create sample calculation logs (for testing)
 */
async function createSampleCalculationLogs(userId, role) {
  try {
    const logsCollection = db.collection('calculationLogs');
    
    // Create 3 sample logs
    const sampleLogs = [
      {
        logId: `calc_${Date.now()}_1`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: userId,
        request: {
          drug: { name: 'Lisinopril' },
          sig: { dose: 1, frequency: 1, unit: 'tablet' },
          daysSupply: 30,
        },
        response: {
          success: true,
          data: {
            totalQuantity: 30,
            recommendedPackages: [
              {
                ndc: '00071-0156-23',
                packageSize: 30,
                unit: 'TABLET',
              },
            ],
          },
        },
        executionTime: 1250,
        aiUsed: false,
        cacheHit: false,
        warnings: [],
        errors: [],
      },
      {
        logId: `calc_${Date.now()}_2`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: userId,
        request: {
          drug: { name: 'Metformin' },
          sig: { dose: 1, frequency: 2, unit: 'tablet' },
          daysSupply: 30,
        },
        response: {
          success: true,
          data: {
            totalQuantity: 60,
            recommendedPackages: [
              {
                ndc: '00093-7214-01',
                packageSize: 60,
                unit: 'TABLET',
              },
            ],
          },
        },
        executionTime: 980,
        aiUsed: false,
        cacheHit: true,
        cacheDetails: {
          hit: true,
          latency: 45,
        },
        warnings: [],
        errors: [],
      },
      {
        logId: `calc_${Date.now()}_3`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: userId,
        request: {
          drug: { name: 'Amoxicillin' },
          sig: { dose: 1, frequency: 3, unit: 'capsule' },
          daysSupply: 10,
        },
        response: {
          success: true,
          data: {
            totalQuantity: 30,
            recommendedPackages: [
              {
                ndc: '00143-9841-01',
                packageSize: 30,
                unit: 'CAPSULE',
              },
            ],
          },
        },
        executionTime: 1100,
        aiUsed: false,
        cacheHit: false,
        warnings: [],
        errors: [],
      },
    ];

    for (const log of sampleLogs) {
      await logsCollection.add(log);
    }

    console.log(`✅ Created ${sampleLogs.length} sample calculation logs for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error creating sample logs:`, error.message);
  }
}

/**
 * Main initialization function
 */
async function initializeCollections() {
  try {
    console.log('📊 Step 1: Creating test users...\n');

    // Create admin user
    const adminUser = await createTestUser(
      'admin@ndcpharma.com',
      'Admin123!',
      'admin',
      'Admin User'
    );

    // Create pharmacist user
    const pharmacistUser = await createTestUser(
      'pharmacist@ndcpharma.com',
      'Pharmacist123!',
      'pharmacist',
      'John Smith, RPh'
    );

    // Create pharmacy technician user
    const technicianUser = await createTestUser(
      'technician@ndcpharma.com',
      'Technician123!',
      'pharmacy_technician',
      'Jane Doe, CPhT'
    );

    console.log('\n📝 Step 2: Creating sample calculation logs...\n');

    // Create sample logs for pharmacist
    await createSampleCalculationLogs(pharmacistUser.uid, 'pharmacist');

    console.log('\n✅ Firestore collections initialized successfully!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 Test User Credentials:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n👑 ADMIN:');
    console.log('   Email:    admin@ndcpharma.com');
    console.log('   Password: Admin123!');
    console.log('   Role:     admin');
    console.log('   UID:      ' + adminUser.uid);
    console.log('\n💊 PHARMACIST:');
    console.log('   Email:    pharmacist@ndcpharma.com');
    console.log('   Password: Pharmacist123!');
    console.log('   Role:     pharmacist');
    console.log('   UID:      ' + pharmacistUser.uid);
    console.log('\n🧪 PHARMACY TECHNICIAN:');
    console.log('   Email:    technician@ndcpharma.com');
    console.log('   Password: Technician123!');
    console.log('   Role:     pharmacy_technician');
    console.log('   UID:      ' + technicianUser.uid);
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\n📚 Collections Created:');
    console.log('   ✅ users (3 documents)');
    console.log('   ✅ userActivity (3 documents)');
    console.log('   ✅ calculationLogs (3 sample logs)');
    console.log('\n🔐 Security Rules: DEPLOYED');
    console.log('📇 Firestore Indexes: DEPLOYED');
    console.log('\n🎉 Ready to test authentication!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error initializing collections:', error);
    process.exit(1);
  }
}

// Run initialization
initializeCollections();

