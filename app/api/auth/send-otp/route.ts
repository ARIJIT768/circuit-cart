export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAdminDb } from '@/utils/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // 🛡️ 1. SAFE DATABASE INITIALIZATION
    const adminDb = getAdminDb(); 
    
    // Guard against null (build-time check)
    if (!adminDb) {
      return NextResponse.json(
        { error: 'System warming up. Please try again in a moment.' }, 
        { status: 503 }
      );
    }

    // 2. GENERATE SECURE DATA
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; 

    // 3. SECURELY LOG THE CODE IN FIRESTORE
    await adminDb.collection('email_otps').doc(email).set({ otp, expiresAt });

    // 4. PREPARE THE MAIL CARRIER
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true, 
      auth: { 
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS 
      },
    });

    // 5. SEND ENCRYPTED TRANSMISSION
    await transporter.sendMail({
      from: `"Circuit Cart Security" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Circuit Cart Access Code',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #020617; color: white; border-radius: 10px;">
          <h2 style="color: #f59e0b; text-transform: uppercase; margin-bottom: 20px;">Operator Authentication</h2>
          <p style="color: #cbd5e1; margin-bottom: 10px;">Your secure access code is:</p>
          <div style="background: #131921; padding: 20px; border-radius: 12px; border: 1px solid #334155; text-align: center; margin: 20px 0;">
            <span style="font-size: 42px; font-weight: 900; letter-spacing: 8px; color: #ffffff; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px; line-height: 1.5;">
            This security code expires in 10 minutes. If you did not initiate this request, please disregard this signal.
          </p>
          <hr style="border: 0; border-top: 1px solid #1e293b; margin: 30px 0;">
          <p style="color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Circuit Cart Encryption Engine v1.0</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SMTP Transmission Error:", error);
    return NextResponse.json({ error: 'Signal transmission failed. Try again.' }, { status: 500 });
  }
}