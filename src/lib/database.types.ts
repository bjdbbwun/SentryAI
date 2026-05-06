export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SupportedLanguage = 'en' | 'ar' | 'fr' | 'es' | 'de' | 'nl'
export type UserRole = 'senior' | 'guardian' | 'admin'
export type ContentType = 'url' | 'email' | 'phone' | 'crypto_wallet' | 'message'
export type Verdict = 'safe' | 'suspicious' | 'dangerous'
export type ThreatType = 'phishing' | 'scam' | 'social_engineering' | 'malware' | 'none'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type AlertType = 'critical_threat' | 'sos_manual' | 'weekly_report' | 'checkin_reminder' | 'family_link_established'
export type ActionTaken = 'deleted' | 'blocked' | 'called' | 'reported'
export type SenderType = 'phone' | 'email' | 'domain'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          language: SupportedLanguage | null
          role: UserRole | null
          guardian_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          language?: SupportedLanguage | null
          role?: UserRole | null
          guardian_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          language?: SupportedLanguage | null
          role?: UserRole | null
          guardian_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      scan_history: {
        Row: {
          id: string
          user_id: string
          content_type: ContentType
          content_preview: string | null
          verdict: Verdict
          threat_type: ThreatType | null
          risk_level: RiskLevel | null
          explanation: string | null
          language_detected: SupportedLanguage | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_type: ContentType
          content_preview?: string | null
          verdict: Verdict
          threat_type?: ThreatType | null
          risk_level?: RiskLevel | null
          explanation?: string | null
          language_detected?: SupportedLanguage | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_type?: ContentType
          content_preview?: string | null
          verdict?: Verdict
          threat_type?: ThreatType | null
          risk_level?: RiskLevel | null
          explanation?: string | null
          language_detected?: SupportedLanguage | null
          created_at?: string
          updated_at?: string
        }
      }
      family_alerts: {
        Row: {
          id: string
          senior_id: string
          guardian_id: string
          alert_type: AlertType
          threat_id: string | null
          message: string | null
          is_read: boolean
          action_taken: ActionTaken | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          senior_id: string
          guardian_id: string
          alert_type: AlertType
          threat_id?: string | null
          message?: string | null
          is_read?: boolean
          action_taken?: ActionTaken | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          senior_id?: string
          guardian_id?: string
          alert_type?: AlertType
          threat_id?: string | null
          message?: string | null
          is_read?: boolean
          action_taken?: ActionTaken | null
          created_at?: string
          updated_at?: string
        }
      }
      blocked_senders: {
        Row: {
          id: string
          senior_id: string
          blocked_by: string | null
          sender_value: string
          sender_type: SenderType | null
          reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          senior_id: string
          blocked_by?: string | null
          sender_value: string
          sender_type?: SenderType | null
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          senior_id?: string
          blocked_by?: string | null
          sender_value?: string
          sender_type?: SenderType | null
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fraud_log: {
        Row: {
          id: string
          user_id: string
          url: string
          risk_level: RiskLevel
          threat_type: string
          explanation: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          risk_level: RiskLevel
          threat_type: string
          explanation: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          risk_level?: RiskLevel
          threat_type?: string
          explanation?: string
          created_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ScanHistory = Database['public']['Tables']['scan_history']['Row']
export type FamilyAlert = Database['public']['Tables']['family_alerts']['Row']
export type BlockedSender = Database['public']['Tables']['blocked_senders']['Row']
export type FraudLog = Database['public']['Tables']['fraud_log']['Row']
