import * as admin from 'firebase-admin';

// 1. Prepare the key first to ensure it's valid PEM format
const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
const formattedKey = rawKey.replace(/\\n/g, '\n');

// 2. Initialize only if no apps exist
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
    });
    console.log("✅ Firebase Admin Initialized");
  } catch (error) {
    console.error("❌ Firebase Admin Init Error:", error);
  }
}

// 3. Export the services safely
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();