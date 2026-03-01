import * as admin from 'firebase-admin';

// 1. Initialize only once
if (!admin.apps.length) {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const formattedKey = rawKey.replace(/\\n/g, '\n');

  if (formattedKey) {
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
}

// 2. 🔥 THE FIX: Use "Getters" to prevent early access errors
export const getAdminDb = () => {
  if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
  return admin.firestore();
};

export const getAdminAuth = () => {
  if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
  return admin.auth();
};