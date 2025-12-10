import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables:', {
    url: supabaseUrl,
    key: supabaseAnonKey ? 'present' : 'missing',
    allEnv: import.meta.env
  });
  throw new Error(`Missing Supabase environment variables. URL: ${supabaseUrl ? 'present' : 'missing'}, Key: ${supabaseAnonKey ? 'present' : 'missing'}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
