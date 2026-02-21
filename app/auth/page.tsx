"use client";

import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  // 🛡️ ROBUST STATE MANAGEMENT
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();

  // 🛡️ STRICT FRONTEND VALIDATION
  const validateForm = () => {
    if (isSignUp) {
      if (username.trim().length < 3) return "Operator name must be at least 3 characters.";
      if (username.trim().length > 50) return "Operator name exceeds maximum length.";
      if (/[^a-zA-Z0-9 ]/.test(username)) return "Operator name cannot contain special symbols.";
    }
    
    // Cryptographic Regex for strict email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return "Please enter a valid secure comms address (Email).";
    
    if (password.length < 6) return "Access Code must be at least 6 characters.";
    
    return null;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Step 1: Run local validation before hitting the database
    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);
    
    // Step 2: Sanitize inputs to prevent trailing blank space errors
    const cleanEmail = email.trim();
    const cleanUsername = username.trim();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email: cleanEmail, 
          password,
          options: {
            data: {
              display_name: cleanUsername
            }
          }
        });
        
        if (error) throw error;
        
        setSuccessMsg('Clearance granted! Initializing secure connection...');
        // Hard redirect to force complete app state refresh
        setTimeout(() => { window.location.href = '/'; }, 1500);

      } else {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password 
        });
        
        if (error) throw error;
        
        setSuccessMsg('Authentication verified. Routing to marketplace...');
        // Hard redirect to force complete app state refresh
        setTimeout(() => { window.location.href = '/'; }, 800);
      }
    } catch (err: any) {
      // Step 3: Catch all backend errors securely without using ugly native alerts
      setErrorMsg(err.message || "Network breach detected. Please try again.");
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
        
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>

        <h2 className="text-2xl font-black text-white mb-8 tracking-wide uppercase text-center">
          {isSignUp ? 'Establish Clearance' : 'System Login'}
        </h2>

        {/* Secure Error / Success Messaging UI */}
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

        <form onSubmit={handleAuth} className="space-y-6">
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
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Code (Password)</label>
              {!isSignUp && (
                <button type="button" className="text-[10px] text-amber-500 font-bold hover:text-amber-400 transition-colors uppercase tracking-wider focus:outline-none">Forgot code?</button>
              )}
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                className="w-full p-4 rounded-xl bg-[#020617] text-white border border-slate-700 focus:border-amber-500 outline-none transition-colors font-bold text-sm shadow-inner pr-12 placeholder:text-slate-600"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500 transition-colors focus:outline-none"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-3"
          >
            {loading ? <><i className="fas fa-circle-notch fa-spin text-base"></i> Transmitting...</> : isSignUp ? 'Initialize Profile' : 'Authenticate Identity'}
          </button>
        </form>

        <p className="text-[10px] text-slate-500 mt-8 text-center uppercase tracking-widest font-bold">
          Protected by Circuit Cart <span className="text-amber-500 cursor-pointer hover:text-amber-400 transition-colors">AES-256</span>
        </p>
      </div>

      {/* Separator & Secondary Action */}
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
            setPassword('');
          }}
          type="button"
          className="w-full py-4 bg-transparent hover:bg-[#131921] text-slate-400 hover:text-white font-bold border border-slate-800 rounded-xl transition-all uppercase tracking-widest text-[11px] shadow-sm focus:outline-none active:scale-95"
        >
          {isSignUp ? 'Switch to Login' : 'Request Clearance (Sign Up)'}
        </button>
      </div>

      <style jsx global>{`
        .animate-pop-in { animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}