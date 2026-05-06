/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'MISSING SUPABASE CREDENTIALS: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined in environment variables.'
  );
}

// Initialize the Supabase client with strongly typed schema and persistence
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
