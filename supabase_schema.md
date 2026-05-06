# Supabase Schema for SentryAI Family Shield

## Tables

### profiles
- id: uuid (primary key, references auth.users)
- full_name: text
- role: text (enum: 'guardian', 'senior')
- avatar_url: text
- created_at: timestamp

### family_links
- id: uuid (primary key)
- guardian_id: uuid (references profiles.id)
- senior_id: uuid (references profiles.id)
- status: text (enum: 'pending', 'active', 'denied')
- created_at: timestamp

### security_alerts
- id: uuid (primary key)
- senior_id: uuid (references profiles.id)
- risk_level: text (enum: 'Low', 'Medium', 'High')
- threat_type: text
- content_preview: text
- explanation: text
- created_at: timestamp
- is_resolved: boolean (default: false)

### reports
- id: uuid (primary key)
- guardian_id: uuid (references profiles.id)
- senior_id: uuid (references profiles.id)
- report_type: text ('weekly', 'monthly')
- data: jsonb
- created_at: timestamp

### fraud_log
- id: uuid (primary key)
- user_id: uuid (references profiles.id)
- url: text
- risk_level: text (enum: 'Low', 'Medium', 'High')
- threat_type: text
- explanation: text
- created_at: timestamp
