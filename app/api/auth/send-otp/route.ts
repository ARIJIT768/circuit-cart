export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '../../../../utils/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // 1. Generate a random 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // 2. Save it securely to the locked Firestore collection
    await adminDb.collection('email_otps').doc(email).set({ otp, expiresAt });

    // 3. Connect to your Circuit Cart Gmail account
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    // 4. Send the Email
    await transporter.sendMail({
      from: `"Circuit Cart Security" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Circuit Cart Access Code',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #020617; color: white; border-radius: 10px;">
          <h2 style="color: #f59e0b; text-transform: uppercase;">Operator Authentication</h2>
          <p style="color: #cbd5e1;">Your secure access code is:</p>
          <h1 style="font-size: 40px; letter-spacing: 5px; color: white; background: #131921; padding: 10px 20px; border-radius: 8px; display: inline-block;">${otp}</h1>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">This code expires in 10 minutes. If you did not request this, please ignore this signal.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SMTP Error:", error);
    return NextResponse.json({ error: 'Failed to transmit code' }, { status: 500 });
  }
}