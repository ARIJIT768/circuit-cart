import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 1. Explicitly grab the browser's local storage (avoids Next.js server confusion)
const customStorage = typeof window !== 'undefined' ? window.localStorage : undefined;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: customStorage, // 2. FORCE Supabase to use this storage
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});