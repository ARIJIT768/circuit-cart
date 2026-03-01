import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Fixes the newline formatting from your .env.local file
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// 👇 THESE ARE THE TWO EXPORTS IT IS LOOKING FOR
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();