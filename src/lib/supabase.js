import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fslcwfkjzpntfmzysfmz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QNGSbGCBto_dHeYtFASpvQ_1LII5ylZ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);