import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface MethodStats {
  method_slug: string;
  display_name: string;
  category: string | null;
  locale: string;
  positive_total: number;
  negative_total: number;
  neutral_total: number;
  last_post_at: string | null;
  rolling_30d_positive: number;
  rolling_30d_negative: number;
  rolling_30d_neutral: number;
  updated_at: string;
}

export interface MethodEvent {
  id: string;
  post_id: string;
  method_slug: string;
  method_display_name: string;
  action_text: string;
  effect_text: string;
  effect_label: 'positive' | 'negative' | 'neutral' | 'unknown';
  sentiment_score: number;
  spam_flag: boolean;
  confidence: number;
  created_at: string;
}

export interface RawPost {
  id: string;
  source_keyword: string;
  platform_id: string;
  username: string;
  display_name: string;
  content: string;
  posted_at: string;
  collected_at: string;
  url: string;
  lang: string;
}
