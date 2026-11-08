import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const hasRealProjectUrl = Boolean(supabaseUrl && /^https?:\/\//i.test(supabaseUrl) && !/(YOUR_|placeholder|your-project)/i.test(supabaseUrl));
const hasRealPublicKey = Boolean(supabaseAnonKey && supabaseAnonKey.length > 20 && !/(YOUR_|placeholder|your-anon)/i.test(supabaseAnonKey));

export const isSupabaseConfigured = hasRealProjectUrl && hasRealPublicKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
