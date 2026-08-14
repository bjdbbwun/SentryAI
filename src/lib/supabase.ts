/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth features will be unavailable until .env is set.'
  );
}

// Initialize the Supabase client with strongly typed schema and persistence.
// When env vars are missing, create a best-effort client so the app can still render.
const supabase = createClient<Database>(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;

// Re-export specific interfaces for application usage
export type { 
  Profile, 
  ScanHistory, 
  FamilyAlert, 
  BlockedSender,
  Database,
  SupportedLanguage,
  UserRole,
  ContentType,
  Verdict,
  ThreatType,
  RiskLevel,
  AlertType,
  ActionTaken,
  SenderType
} from './database.types';
