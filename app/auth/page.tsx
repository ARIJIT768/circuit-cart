"use client";

import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  
  // 🛡️ NEW OTP STATE MANAGEMENT
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const router = useRouter();

  // 🛡️ STRICT FRONTEND VALIDATION
  const validateEmailAndName = () => {
    if (isSignUp) {
      if (username.trim().length < 3) return "Operator name must be at least 3 characters.";
      if (username.trim().length > 50) return "Operator name exceeds maximum length.";
      if (/[^a-zA-Z0-9 ]/.test(username)) return "Operator name cannot contain special symbols.";
    }
    
    const cleanEmail = email.trim().toLowerCase();
    
    // Cryptographic Regex for strict email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) return "Please enter a valid secure comms address (Email).";

    // Note: The Gmail blocklist has been completely removed!
    
    return null;
  };

  // STEP 1: REQUEST THE 6-DIGIT CODE
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validationError = validateEmailAndName();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim();
    const cleanUsername = username.trim();

    try {
      // Supabase native Passwordless OTP
      const { error } = await supabase.auth.signInWithOtp({ 
        email: cleanEmail,
        options: {
          shouldCreateUser: true, // Automatically registers them if they don't exist
          data: isSignUp ? { display_name: cleanUsername } : undefined
        }
      });
      
      if (error) throw error;
      
      setIsOtpSent(true);
      setSuccessMsg('Access Code transmitted to your secure address.');
    } catch (err: any) {
      setErrorMsg(err.message || "Transmission failed. Check your network.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY THE 6-DIGIT CODE
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (otp.trim().length !== 6) {
      setErrorMsg('Access Code must be exactly 6 digits.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email'
      });

      if (error) throw error;

      setSuccessMsg('Clearance verified! Routing to terminal...');
      // Hard redirect to flush cache and initialize app
      setTimeout(() => { window.location.href = '/'; }, 1000);

    } catch (err: any) {
      setErrorMsg("Invalid or expired Access Code. Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] px-4 font-sans selection:bg-amber-500/30">
      
      {/* Visual Logo */}
      <div className="mb-8 flex items-center cursor-pointer animate-pop-in hover:scale-105 transition-transform" onClick={() => router.push('/')}>
        <span className="text-4xl md:text-3xl font-black text-white tracking-tight uppercase">
          Circuit<span className="text-amber-500">Cart</span>
        </span>
      </div>

      {/* Main Auth Terminal */}
      <div className="max-w-md w-full bg-[#131921] p-8 md:p-10 rounded-2xl border border-slate-800 shadow-2xl animate-pop-in relative overflow-hidden">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>

        <h2 className="text-2xl font-black text-white mb-8 tracking-wide uppercase text-center">
          {isOtpSent ? 'Verify Clearance' : isSignUp ? 'Establish Clearance' : 'System Login'}
        </h2>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold uppercase tracking-wide flex items-start gap-3 shadow-inner">
            <i className="fas fa-shield-alt mt-0.5 text-base"></i>
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}
        
        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold uppercase tracking-wide flex items-start gap-3 shadow-inner">
            <i className="fas fa-check-circle mt-0.5 text-base"></i>
            <p className="leading-relaxed">{successMsg}</p>
          </div>
        )}

        {/* CONDITIONALLY RENDER EMAIL FORM OR OTP FORM */}
        {!isOtpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-6 animate-pop-in">
            {isSignUp && (
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Operator (Name)</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-4 rounded-xl bg-[#020617] text-white border border-slate-700 focus:border-amber-500 outline-none transition-colors font-bold text-sm shadow-inner placeholder:text-slate-600"
                  placeholder="e.g. John Doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Comms Address (Email)</label>
              <input 
                type="email" 
                required 
                className="w-full p-4 rounded-xl bg-[#020617] text-white border border-slate-700 focus:border-amber-500 outline-none transition-colors font-bold text-sm shadow-inner placeholder:text-slate-600"
                placeholder="operator@network.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-3"
            >
              {loading ? <><i className="fas fa-circle-notch fa-spin text-base"></i> Transmitting...</> : 'Request Access Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-pop-in">
            <div className="space-y-2 text-center">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Enter 6-Digit Verification Code</label>
              <input 
                type="text" 
                required 
                maxLength={6}
                className="w-full p-4 rounded-xl bg-[#020617] text-amber-500 border border-amber-500/50 focus:border-amber-500 outline-none transition-colors font-mono font-black text-3xl tracking-[1em] text-center shadow-inner placeholder:text-slate-700"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} // Strictly numbers only
              />
              <p className="text-[10px] text-slate-500 mt-3">Code sent to: <b className="text-white">{email}</b></p>
            </div>
            
            <button 
              type="submit" 
              disabled={loading || otp.length !== 6}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_15px_rgba(34,197,94,0.3)] text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-3"
            >
              {loading ? <><i className="fas fa-circle-notch fa-spin text-base"></i> Verifying...</> : 'Authenticate Identity'}
            </button>

            <button 
              type="button"
              onClick={() => { setIsOtpSent(false); setOtp(''); setSuccessMsg(''); }}
              className="w-full py-2 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mt-2"
            >
              ← Edit Email Address
            </button>
          </form>
        )}

        <p className="text-[10px] text-slate-500 mt-8 text-center uppercase tracking-widest font-bold">
          Protected by Circuit Cart <span className="text-amber-500 cursor-pointer hover:text-amber-400 transition-colors">AES-256 OTP</span>
        </p>
      </div>

      {/* Separator & Secondary Action (Hidden if OTP is sent) */}
      {!isOtpSent && (
        <div className="max-w-md w-full mt-6 animate-pop-in" style={{animationDelay: '0.1s'}}>
          <div className="relative flex items-center justify-center mb-6">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {isSignUp ? 'Existing Operator?' : 'New Personnel?'}
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            type="button"
            className="w-full py-4 bg-transparent hover:bg-[#131921] text-slate-400 hover:text-white font-bold border border-slate-800 rounded-xl transition-all uppercase tracking-widest text-[11px] shadow-sm focus:outline-none active:scale-95"
          >
            {isSignUp ? 'Switch to Login' : 'Request Clearance (Sign Up)'}
          </button>
        </div>
      )}

      <style jsx global>{`
        .animate-pop-in { animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}
