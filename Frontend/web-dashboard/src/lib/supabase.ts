import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase Environment Variables');
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';
type CampaignType = 'regular' | 'automated' | 'test';
type PlanType = 'free' | 'professional' | 'enterprise';

export interface CampaignStats {
  recipients: number;
  delivered: number;
  opens: number;
  unique_opens: number;
  clicks: number;
  unique_clicks: number;
  unsubscribes: number;
  bounces: number;
  complaints: number;
  open_rate: number;
  click_rate: number;
  delivery_rate: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string | null; avatar_url: string | null; plan: PlanType; company: string | null; phone: string | null; timezone: string; created_at: string; updated_at: string; };
        Insert: { id: string; name?: string | null; avatar_url?: string | null; plan?: PlanType; company?: string | null; phone?: string | null; timezone?: string; created_at?: string; updated_at?: string; };
        Update: { id?: string; name?: string | null; avatar_url?: string | null; plan?: PlanType; company?: string | null; phone?: string | null; timezone?: string; created_at?: string; updated_at?: string; };
      };
      campaigns: {
        Row: { id: string; user_id: string; name: string; subject: string; content: string; status: CampaignStatus; type: CampaignType; template_id: string | null; list_ids: string[]; stats: CampaignStats; scheduled_for: string | null; sent_at: string | null; created_at: string; updated_at: string; metadata: Json | null; };
        Insert: { id?: string; user_id: string; name: string; subject: string; content: string; status?: CampaignStatus; type?: CampaignType; template_id?: string | null; list_ids?: string[]; stats?: Partial<CampaignStats>; scheduled_for?: string | null; sent_at?: string | null; created_at?: string; updated_at?: string; metadata?: Json | null; };
        Update: { id?: string; user_id?: string; name?: string; subject?: string; content?: string; status?: CampaignStatus; type?: CampaignType; template_id?: string | null; list_ids?: string[]; stats?: Partial<CampaignStats>; scheduled_for?: string | null; sent_at?: string | null; created_at?: string; updated_at?: string; metadata?: Json | null; };
      };
    };
    Views: { [key: string]: { Row: Record<string, unknown> } };
    Functions: { [key: string]: { Args: Record<string, unknown>; Returns: unknown } };
    Enums: { [key: string]: string };
  };
}

let supabaseInstance: SupabaseClient<Database> | null = null;

const createSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: localStorage,
    },
    global: {
      headers: {
        'x-application-name': 'email-suite',
      },
    },
  });

  return supabaseInstance;
};

export const supabase = createSupabaseClient();

export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
};

export const signOut = async (): Promise<void> => {
  localStorage.removeItem('app-preferences');
  sessionStorage.clear();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const createTypedQuery = <T extends keyof Database['public']['Tables']>(table: T) => {
  return supabase.from(table);
};

export const callEdgeFunction = async <T>(functionName: string, payload?: Record<string, unknown>): Promise<T | null> => {
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body: payload,
  });
  if (error) throw error;
  return data;
};

export default supabase;