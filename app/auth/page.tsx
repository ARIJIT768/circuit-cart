"use client";

import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            display_name: username
          }
        }
      });
      if (error) alert(error.message);
      else {
        alert('Signup successful! Finalizing credentials...');
        router.push('/');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else router.push('/'); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] px-4 font-sans selection:bg-amber-500/30">
      
      {/* Text Logo */}
      <div className="mb-8 flex items-center cursor-pointer animate-pop-in" onClick={() => router.push('/')}>
        <span className="text-4xl md:text-3xl font-black text-white tracking-tight uppercase">
          Circuit<span className="text-amber-500">Cart</span>
        </span>
      </div>

      {/* Main Auth Card */}
      <div className="max-w-md w-full bg-[#131921] p-8 md:p-8 rounded-xl border border-slate-800 shadow-2xl animate-pop-in">
        <h2 className="text-2xl md:text-xl font-bold text-white mb-6">
          {isSignUp ? 'Create account' : 'Sign in'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-sm md:text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Your Name</label>
              <input 
                type="text" 
                required 
                className="w-full p-4 md:p-3 rounded-lg bg-white text-slate-900 border-2 border-transparent focus:border-amber-500 outline-none transition-colors font-semibold text-base md:text-sm shadow-inner"
                placeholder="First and last name"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm md:text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              required 
              className="w-full p-4 md:p-3 rounded-lg bg-white text-slate-900 border-2 border-transparent focus:border-amber-500 outline-none transition-colors font-semibold text-base md:text-sm shadow-inner"
              placeholder="e.g. user@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm md:text-xs font-bold text-slate-300 uppercase tracking-wider">Password</label>
              {!isSignUp && (
                <button type="button" className="text-sm md:text-xs text-amber-500 font-bold hover:underline">Forgot password?</button>
              )}
            </div>
            <input 
              type="password" 
              required 
              className="w-full p-4 md:p-3 rounded-lg bg-white text-slate-900 border-2 border-transparent focus:border-amber-500 outline-none transition-colors font-semibold text-base md:text-sm shadow-inner"
              placeholder="At least 6 characters"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-[#f3a847] text-slate-900 font-bold py-4 md:py-3 rounded-lg transition-transform active:scale-95 disabled:opacity-50 shadow-lg text-base md:text-sm uppercase tracking-wider mt-4"
          >
            {loading ? 'Authorizing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs md:text-[11px] text-slate-400 mt-6 leading-relaxed">
          By continuing, you agree to Circuit Cart's <span className="text-amber-500 font-bold cursor-pointer hover:underline">Conditions of Use</span> and Privacy Notice.
        </p>
      </div>

      {/* Separator & Secondary Action */}
      <div className="max-w-md w-full mt-6 animate-pop-in" style={{animationDelay: '0.1s'}}>
        <div className="relative flex items-center justify-center mb-5">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-xs md:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            {isSignUp ? 'Already have an account?' : 'New to Circuit Cart?'}
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          type="button"
          className="w-full py-4 md:py-3 bg-transparent hover:bg-[#131921] text-slate-300 font-bold border border-slate-700 rounded-lg transition-colors uppercase tracking-wider text-sm md:text-xs shadow-sm"
        >
          {isSignUp ? 'Sign in to existing account' : 'Create your account'}
        </button>
      </div>
    </div>
  );
}