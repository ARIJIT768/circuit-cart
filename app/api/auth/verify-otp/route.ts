export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/utils/firebaseAdmin';

export async function POST(req: Request) {
  try {
    // 🛡️ 1. SAFE INITIALIZATION
    // We fetch the services inside the try block to catch any init-time PEM errors.
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    // If the getter returns null (which we set up in firebaseAdmin.ts to prevent build crashes)
    // we return a 503 so the user knows the system is still warming up.
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'System initializing. Please try again in a moment.' }, { status: 503 });
    }

    const { email, otp } = await req.json();
    if (!email || !otp) return NextResponse.json({ error: 'Missing payload' }, { status: 400 });

    // 2. FETCH CODE
    const docRef = adminDb.collection('email_otps').doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'No code found. Request a new one.' }, { status: 400 });
    }

    const data = docSnap.data();
    if (Date.now() > data?.expiresAt) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }
    
    if (data?.otp !== otp) {
      return NextResponse.json({ error: 'Invalid security code' }, { status: 400 });
    }

    // 3. CLEANUP & AUTHENTICATE
    await docRef.delete();

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({ email });
      } else {
        throw e;
      }
    }

    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    return NextResponse.json({ success: true, customToken });

  } catch (error: any) {
    console.error("Verification Error Log:", error);
    return NextResponse.json({ error: 'Authentication signal lost. Try again.' }, { status: 500 });
  }
}