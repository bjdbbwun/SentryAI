-- SentryAI Backend Configuration: PostgreSQL Schema & Security
-- This script initializes the multi-tenant family protection database.
-- Target: Supabase (PostgreSQL)

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Automating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar', 'fr', 'es', 'de', 'nl')),
    role TEXT DEFAULT 'senior' CHECK (role IN ('senior', 'guardian', 'admin')),
    guardian_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. scan_history table
CREATE TABLE IF NOT EXISTS public.scan_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('url', 'email', 'phone', 'crypto_wallet', 'message')),
    content_preview TEXT,
    verdict TEXT NOT NULL CHECK (verdict IN ('safe', 'suspicious', 'dangerous')),
    threat_type TEXT CHECK (threat_type IN ('phishing', 'scam', 'social_engineering', 'malware', 'none')),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    explanation TEXT,
    language_detected TEXT CHECK (language_detected IN ('en', 'ar', 'fr', 'es', 'de', 'nl')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. family_alerts table
CREATE TABLE IF NOT EXISTS public.family_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    senior_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    guardian_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('critical_threat', 'sos_manual', 'weekly_report', 'checkin_reminder')),
    threat_id UUID REFERENCES public.scan_history(id) ON DELETE SET NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    action_taken TEXT CHECK (action_taken IN ('deleted', 'blocked', 'called', 'reported')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. blocked_senders table
CREATE TABLE IF NOT EXISTS public.blocked_senders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    senior_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_value TEXT NOT NULL,
    sender_type TEXT CHECK (sender_type IN ('phone', 'email', 'domain')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. fraud_log table
CREATE TABLE IF NOT EXISTS public.fraud_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    threat_type TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Triggers for updated_at
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_scan_history_updated_at BEFORE UPDATE ON public.scan_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_family_alerts_updated_at BEFORE UPDATE ON public.family_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_blocked_senders_updated_at BEFORE UPDATE ON public.blocked_senders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Security: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_log ENABLE ROW LEVEL SECURITY;

-- 8. Policies: profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Guardians read linked seniors profiles" ON public.profiles FOR SELECT USING (guardian_id = auth.uid());
CREATE POLICY "Public profile lookup" ON public.profiles FOR SELECT USING (true);

-- 9. Policies: scan_history
CREATE POLICY "Users manage own scans" ON public.scan_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Guardians read linked seniors scans" ON public.scan_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = public.scan_history.user_id AND guardian_id = auth.uid())
);

-- 10. Policies: family_alerts
CREATE POLICY "Guardians manage family alerts" ON public.family_alerts FOR ALL USING (auth.uid() = guardian_id);
CREATE POLICY "Seniors read own alerts" ON public.family_alerts FOR SELECT USING (auth.uid() = senior_id);

-- 11. Policies: blocked_senders
CREATE POLICY "Guardians manage blocked lists" ON public.blocked_senders FOR ALL USING (auth.uid() = blocked_by);
CREATE POLICY "Seniors read their blocked list" ON public.blocked_senders FOR SELECT USING (auth.uid() = senior_id);

-- 12. Policies: fraud_log
CREATE POLICY "Users manage own fraud logs" ON public.fraud_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Guardians read linked seniors fraud logs" ON public.fraud_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = public.fraud_log.user_id AND guardian_id = auth.uid())
);

-- 12. Indexes
CREATE INDEX idx_profiles_guardian ON public.profiles(guardian_id);
CREATE INDEX idx_scan_history_user_id ON public.scan_history(user_id);
CREATE INDEX idx_scan_history_created_at_desc ON public.scan_history(created_at DESC);
CREATE INDEX idx_scan_history_verdict ON public.scan_history(verdict);
CREATE INDEX idx_scan_history_risk ON public.scan_history(risk_level);
CREATE INDEX idx_family_alerts_guardian_unread ON public.family_alerts(guardian_id, is_read);
CREATE INDEX idx_family_alerts_senior ON public.family_alerts(senior_id);
CREATE INDEX idx_blocked_senders_senior ON public.blocked_senders(senior_id);
