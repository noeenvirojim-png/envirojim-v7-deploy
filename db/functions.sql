
-- Helper: Get Auth Org ID
CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- Helper: Get Hierarchy Org IDs (Now returns a TABLE for clear column naming)
CREATE OR REPLACE FUNCTION public.get_auth_org_hierarchy()
RETURNS TABLE (org_id UUID)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
WITH RECURSIVE hierarchy AS (
    SELECT id 
    FROM public.organizations 
    WHERE id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    
    UNION ALL
    
    SELECT o.id 
    FROM public.organizations o
    INNER JOIN hierarchy h ON o.parent_id = h.id
)
SELECT id FROM hierarchy;
$$;

-- Helper: Check if Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ORG_ADMIN')
    );
$$;

-- Helper: Check if Admin by ID
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_user_id AND role IN ('SUPER_ADMIN', 'ORG_ADMIN')
    );
$$;
