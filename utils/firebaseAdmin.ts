import * as admin from 'firebase-admin';

const initializeAdmin = () => {
  // Prevent re-initialization
  if (admin.apps.length > 0) return admin.app();

  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  // 1. Basic Existence Check
  if (!rawKey || !projectId || !clientEmail) {
    console.error("❌ Firebase Init Failed: Missing Environment Variables");
    return null;
  }

  // 2. Formatting the key
  const formattedKey = rawKey.replace(/\\n/g, '\n');

  // 3. Diagnostic Header Check (Crucial for PEM errors)
  if (!formattedKey.includes("-----BEGIN PRIVATE KEY-----")) {
    console.error("❌ PEM Error: The Private Key is missing the BEGIN header. Check your Vercel Environment Variable formatting.");
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
    console.log("✅ Firebase Admin Initialized Successfully");
    return app;
  } catch (error: any) {
    // 🔥 This is the "Exact Error" catcher
    console.error("🚨 CRITICAL FIREBASE ERROR:", {
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\n')[0] // Just the first line of the stack
    });
    return null;
  }
};

// Standard Getters
export const getAdminDb = () => {
  const app = initializeAdmin();
  return app ? admin.firestore() : null;
};

export const getAdminAuth = () => {
  const app = initializeAdmin();
  return app ? admin.auth() : null;
};