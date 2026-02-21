"use client";

import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // New: Username state
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // New: Passing the username into Supabase user_metadata
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
        alert('Signup successful! Logging you in...');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl">
        <h2 className="text-3xl font-black text-white text-center mb-2">
          Circuit <span className="text-amber-500">Cart</span>
        </h2>
        <p className="text-gray-400 text-center mb-8 text-sm">
          {isSignUp ? 'Create your maker account' : 'Welcome back, Maker!'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {/* New: Conditionally render Username field only on Sign Up */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username / Full Name</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 outline-none focus:border-amber-500 transition-colors"
                placeholder="e.g. UserName"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 outline-none focus:border-amber-500 transition-colors"
              placeholder="@gmail.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 outline-none focus:border-amber-500 transition-colors"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-amber-500/20"
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            type="button"
            className="text-sm text-gray-400 hover:text-amber-500 transition-colors"
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}