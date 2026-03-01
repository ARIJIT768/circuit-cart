import * as admin from 'firebase-admin';

const initializeAdmin = () => {
  if (admin.apps.length > 0) return admin.app();

  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  // Force clean the key only if it exists
  const formattedKey = rawKey.replace(/\\n/g, '\n');

  if (!formattedKey || !process.env.FIREBASE_PROJECT_ID) {
    // During build, environment variables might be missing. 
    // We return null instead of throwing an error to let the build finish.
    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
    });
  } catch (error) {
    console.error("Firebase Admin Init Error:", error);
    return null;
  }
};

// 🔥 The "Universal Getter": Safe for both Build and Runtime
export const getAdminDb = () => {
  const app = initializeAdmin();
  if (!app) return null as any; 
  return admin.firestore();
};

export const getAdminAuth = () => {
  const app = initializeAdmin();
  if (!app) return null as any;
  return admin.auth();
};