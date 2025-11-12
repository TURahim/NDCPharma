/**
 * Firebase Admin SDK Configuration
 * Initializes Firebase Admin for Firestore, Authentication, and other services
 */

import * as admin from "firebase-admin";
import { env, isProduction } from "./environment";

/**
 * Initialize Firebase Admin SDK
 */
let firebaseApp: admin.app.App;

export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // In production, credentials are automatically provided by Cloud Functions environment
    // In development, use application default credentials or service account
    if (isProduction) {
      firebaseApp = admin.initializeApp();
    } else {
      // For local development with emulators or service account
      firebaseApp = admin.initializeApp({
        projectId: env.FIREBASE_PROJECT_ID || "ndc-calculator-dev",
      });
    }

    console.log(
      `Firebase Admin initialized for project: ${firebaseApp.options.projectId || "default"}`
    );

    return firebaseApp;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw new Error("Firebase initialization failed");
  }
}

/**
 * Get Firestore instance with optimized settings
 */
export function getFirestore(): admin.firestore.Firestore {
  const app = initializeFirebase();
  const firestore = admin.firestore(app);

  // Configure Firestore settings for optimal performance
  firestore.settings({
    ignoreUndefinedProperties: true,
    // Connection pooling is handled automatically by the SDK
  });

  return firestore;
}

/**
 * Get Firebase Auth instance
 */
export function getAuth(): admin.auth.Auth {
  const app = initializeFirebase();
  return admin.auth(app);
}

/**
 * Get Firebase Storage instance (for future use)
 */
export function getStorage(): admin.storage.Storage {
  const app = initializeFirebase();
  return admin.storage(app);
}

/**
 * Firestore collection names
 */
export const COLLECTIONS = {
  CALCULATION_CACHE: "calculationCache",
  CALCULATION_LOGS: "calculationLogs",
  USER_ACTIVITY: "userActivity",
  USERS: "users",
} as const;

/**
 * Helper function to get a Firestore collection reference
 */
export function getCollection(collectionName: string): admin.firestore.CollectionReference {
  return getFirestore().collection(collectionName);
}

/**
 * Batch write helper for multiple Firestore operations
 */
export function createBatch(): admin.firestore.WriteBatch {
  return getFirestore().batch();
}

/**
 * Transaction helper for Firestore
 */
export async function runTransaction<T>(
  updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>
): Promise<T> {
  return getFirestore().runTransaction(updateFunction);
}

