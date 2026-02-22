import { createClient } from '@supabase/supabase-js';

// Use environment variables or placeholders if not defined
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);
