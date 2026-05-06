/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl ='https://hiyaggqmnshuaypafucu.supabase.co' ;
const supabaseAnonKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpeWFnZ3FtbnNodWF5cGFmdWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjQzMDMsImV4cCI6MjA5MzUwMDMwM30.XeCvj9UkgEnuTH7PpS_KRMKEtH0E1hg2wIhkR6SPk9k' ;

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
