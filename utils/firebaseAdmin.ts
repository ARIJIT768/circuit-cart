import * as admin from 'firebase-admin';

// 1. Prepare the key: Handle both actual newlines and literal '\n' strings
const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
const formattedKey = rawKey.replace(/\\n/g, '\n');

if (!admin.apps.length && formattedKey) {
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

// 2. Export the services safely
// We use a getter or check length to ensure they are only accessed if init worked
export const adminDb = admin.apps.length ? admin.firestore() : null!;
export const adminAuth = admin.apps.length ? admin.auth() : null!;