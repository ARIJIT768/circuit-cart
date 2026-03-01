export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../../utils/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) return NextResponse.json({ error: 'Missing payload' }, { status: 400 });

    // 1. Fetch the code from the locked database
    const docRef = adminDb.collection('email_otps').doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) return NextResponse.json({ error: 'No code found. Request a new one.' }, { status: 400 });

    const data = docSnap.data();
    if (Date.now() > data?.expiresAt) return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    if (data?.otp !== otp) return NextResponse.json({ error: 'Invalid security code' }, { status: 400 });

    // 2. Code is correct! Delete it so it can't be used again.
    await docRef.delete();

    // 3. Get or Create the Firebase User
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({ email });
      } else throw e;
    }

    // 4. Generate a master key (Custom Token) for the frontend to log in
    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    return NextResponse.json({ success: true, customToken, isNewUser: !userRecord.metadata.lastSignInTime });

  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: 'Internal system failure' }, { status: 500 });
  }
}