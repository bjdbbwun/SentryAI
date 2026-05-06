-- Add fraud_log table to existing SentryAI database
-- This script adds only the fraud_log table and related security/policies/indexes
-- Assumes existing tables: profiles, scan_history, family_alerts, blocked_senders

-- Ensure uuid-ossp extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create fraud_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.fraud_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    threat_type TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on fraud_log if not already enabled
ALTER TABLE public.fraud_log ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'fraud_log' AND policyname = 'Users manage own fraud logs'
    ) THEN
        CREATE POLICY "Users manage own fraud logs" ON public.fraud_log FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'fraud_log' AND policyname = 'Guardians read linked seniors fraud logs'
    ) THEN
        CREATE POLICY "Guardians read linked seniors fraud logs" ON public.fraud_log FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = public.fraud_log.user_id AND guardian_id = auth.uid())
        );
    END IF;
END $$;

-- Create indexes for fraud detection performance
CREATE INDEX IF NOT EXISTS idx_fraud_log_user_id ON public.fraud_log(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_log_created_at_desc ON public.fraud_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_log_risk_level ON public.fraud_log(risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_log_threat_type ON public.fraud_log(threat_type);