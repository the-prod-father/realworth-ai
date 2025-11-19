import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database types (matches schema.sql)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          picture: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          picture?: string | null;
        };
        Update: {
          email?: string;
          name?: string | null;
          picture?: string | null;
        };
      };
      appraisals: {
        Row: {
          id: string;
          user_id: string;
          item_name: string;
          author: string | null;
          era: string | null;
          category: string;
          description: string | null;
          price_low: number;
          price_high: number;
          currency: string;
          reasoning: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          item_name: string;
          author?: string | null;
          era?: string | null;
          category: string;
          description?: string | null;
          price_low: number;
          price_high: number;
          currency?: string;
          reasoning?: string | null;
          image_url?: string | null;
        };
        Update: {
          item_name?: string;
          author?: string | null;
          era?: string | null;
          category?: string;
          description?: string | null;
          price_low?: number;
          price_high?: number;
          currency?: string;
          reasoning?: string | null;
          image_url?: string | null;
        };
      };
    };
  };
}
