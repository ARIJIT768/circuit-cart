'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { signInWithCustomToken, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 🛡️ STEP 1: TRANSMIT OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || username.trim().length < 3) return setErrorMsg("Valid Name and Email required.");
    
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg("Security code transmitted to your inbox.");
      setStep('otp');
    } catch (err: any) {
      setErrorMsg(err.message || "Logistics Failure.");
    } finally {
      setLoading(false);
    }
  };

  // 🛡️ STEP 2: VERIFY OTP & LOGIN
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return setErrorMsg("Requires 6-digit code.");
    
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // 1. Check code with Backend
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 2. Log into Firebase using the generated token
      const userCredential = await signInWithCustomToken(auth, data.customToken);
      const user = userCredential.user;

      // 3. Profile Setup 
      const cleanUsername = username.trim();
      if (!user.displayName) await updateProfile(user, { displayName: cleanUsername });

      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          id: user.uid, email: email.trim(), display_name: cleanUsername,
          checkout_info: {}, created_at: new Date().toISOString()
        });
        await setDoc(doc(db, 'user_carts', user.uid), {
          user_id: user.uid, cart_data: [], updated_at: new Date().toISOString()
        });
      }

      setSuccessMsg("Authentication complete! Connecting to Mainframe...");
      setTimeout(() => router.push('/'), 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Verification Failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] px-4 font-sans selection:bg-amber-500/30">
      <div className="mb-8 flex items-center cursor-pointer animate-pop-in hover:scale-105 transition-transform" onClick={() => router.push('/')}>
        <span className="text-4xl md:text-3xl font-black text-white tracking-tight uppercase">Circuit<span className="text-amber-500">Cart</span></span>
      </div>

      <div className="max-w-md w-full bg-[#131921] p-8 md:p-10 rounded-2xl border border-slate-800 shadow-2xl animate-pop-in relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>

        <h2 className="text-2xl font-black text-white mb-8 tracking-wide uppercase text-center">
          {step === 'email' ? 'Operator Identity' : 'Verify Signal'}
        </h2>

        {errorMsg && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold uppercase tracking-wide flex items-start gap-3 shadow-inner"><i className="fas fa-exclamation-circle mt-0.5 text-base"></i><p className="leading-relaxed">{errorMsg}</p></div>}
        {successMsg && <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold uppercase tracking-wide flex items-start gap-3 shadow-inner"><i className="fas fa-check-circle mt-0.5 text-base"></i><p className="leading-relaxed">{successMsg}</p></div>}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-6 animate-pop-in">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Callsign / Name</label>
              <input type="text" required className="w-full p-4 rounded-xl bg-[#020617] text-white border border-slate-700 focus:border-amber-500 outline-none transition-colors font-bold text-sm shadow-inner placeholder:text-slate-600" placeholder="e.g. John Doe" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Vector</label>
              <input type="email" required className="w-full p-4 rounded-xl bg-[#020617] text-white border border-slate-700 focus:border-amber-500 outline-none transition-colors font-bold text-sm shadow-inner placeholder:text-slate-600" placeholder="operator@circuitcart.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-3">
              {loading ? <><i className="fas fa-circle-notch fa-spin"></i> Transmitting...</> : 'Request Access Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-pop-in">
            <div className="space-y-2 text-center mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check inbox for: <span className="text-amber-500">{email}</span></p>
              <p onClick={() => { setStep('email'); setSuccessMsg(''); setErrorMsg(''); }} className="text-[9px] text-slate-500 hover:text-white uppercase tracking-widest cursor-pointer mt-2 underline">Change Email Address</p>
            </div>
            <div className="space-y-2">
              <input type="text" required maxLength={6} className="w-full p-4 rounded-xl bg-[#020617] text-white border border-slate-700 focus:border-amber-500 outline-none transition-colors font-bold text-3xl tracking-[0.5em] text-center shadow-inner placeholder:text-slate-800" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} />
            </div>
            <button type="submit" disabled={loading || otp.length < 6} className="w-full bg-green-500 hover:bg-green-400 text-slate-900 font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(34,197,94,0.2)] text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-3">
              {loading ? <><i className="fas fa-circle-notch fa-spin"></i> Verifying...</> : 'Authenticate & Enter'}
            </button>
          </form>
        )}
      </div>

      <style jsx global>{`
        .animate-pop-in { animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}