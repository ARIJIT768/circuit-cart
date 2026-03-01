import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  // Use a fallback to empty string to prevent the .replace from crashing if undefined
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  
  // 🔥 This double-checks the BEGIN/END tags and forces real newlines
  const formattedKey = rawKey.includes('---') 
    ? rawKey.replace(/\\n/g, '\n') 
    : undefined;

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
    });
    console.log("✅ Firebase Admin Initialized Successfully");
  } catch (error) {
    console.error("❌ Firebase Admin Init Error:", error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();