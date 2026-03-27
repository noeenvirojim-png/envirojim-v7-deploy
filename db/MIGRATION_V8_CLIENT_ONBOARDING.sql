-- 🛠️ ENVIROJIM V8: CLIENT ONBOARDING & OAUTH WORKFLOW
-- Implementation for Production (Supabase)

-- 1. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    owner_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CLIENT OAUTH TOKENS (TTL 24h)
CREATE TABLE IF NOT EXISTS public.client_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS HARDENING
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- 3.1 Clients RLS: Admins only see their own org's clients
CREATE POLICY "Admins can view their org clients" ON public.clients
    FOR SELECT
    USING ( owner_org_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()) );

CREATE POLICY "Admins can insert their org clients" ON public.clients
    FOR INSERT
    WITH CHECK ( owner_org_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()) );

CREATE POLICY "Admins can update their org clients" ON public.clients
    FOR UPDATE
    USING ( owner_org_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()) );

-- 3.2 Tokens RLS: Admins only manage their own client tokens
CREATE POLICY "Admins can manage their org client tokens" ON public.client_oauth_tokens
    FOR ALL
    USING ( 
        client_id IN (SELECT id FROM public.clients WHERE owner_org_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
    );

-- 4. AUDIT COMPLIANCE
CREATE TRIGGER tr_audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_client_tokens AFTER INSERT OR UPDATE OR DELETE ON public.client_oauth_tokens FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- 5. INDEXING FOR PERFORMANCE
CREATE INDEX idx_clients_org ON public.clients(owner_org_id);
CREATE INDEX idx_client_tokens_lookup ON public.client_oauth_tokens(token) WHERE used = false;
