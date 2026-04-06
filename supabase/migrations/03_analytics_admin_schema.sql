-- 03_analytics_admin_schema.sql
-- Phase 1 Foundation Schema (Analytics & Admin Roles)
-- Strictly additive tables isolated from core app flows. Schema only.

-- 1. Authorization Role Mapping
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Telemetry / Event Analytics (Strictly Append-Only)
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Null if unauth/guest event
    event_type TEXT NOT NULL,
    module TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential index for filtering analytics over time by module for the dashboard
CREATE INDEX IF NOT EXISTS idx_analytics_event_search ON public.analytics_events(module, created_at DESC);

-- 3. AI Usage & Cost Log (For precise cost estimation mappings)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL, -- e.g., 'groq'
    model TEXT NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
