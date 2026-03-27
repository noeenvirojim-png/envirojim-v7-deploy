-- ============================================================================
-- PATCH V6 → V6.1 - CORRECTIONS AUDIT
-- ============================================================================
-- Ce patch applique les corrections identifiées lors de l'audit production
-- À exécuter APRÈS DEPLOY_V6_PRODUCTION_FINAL.sql
-- 
-- CORRECTIONS:
-- 1. Ajouter soft-delete sur maintenance_definitions et maintenance_rules
-- 2. Mettre à jour RLS policies pour filtrer deleted_at
-- 3. Ajouter indexes de performance manquants
-- 4. Ajouter vues actives pour maintenance
-- 
-- ============================================================================

\set ON_ERROR_STOP on

-- ============================================================================
-- I. SOFT-DELETE SUR MAINTENANCE
-- ============================================================================

-- Ajouter deleted_at sur maintenance_definitions
ALTER TABLE public.maintenance_definitions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Ajouter deleted_at sur maintenance_rules
ALTER TABLE public.maintenance_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Mettre à jour RLS policies pour maintenance_definitions
DROP POLICY IF EXISTS "maint_read" ON public.maintenance_definitions;
CREATE POLICY "maint_read" ON public.maintenance_definitions FOR SELECT 
USING ((organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "maint_write" ON public.maintenance_definitions;
CREATE POLICY "maint_write" ON public.maintenance_definitions FOR ALL 
USING (public.is_admin());

-- Mettre à jour RLS policies pour maintenance_rules
DROP POLICY IF EXISTS "maint_rules_read" ON public.maintenance_rules;
CREATE POLICY "maint_rules_read" ON public.maintenance_rules FOR SELECT 
USING ((organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "maint_rules_write" ON public.maintenance_rules;
CREATE POLICY "maint_rules_write" ON public.maintenance_rules FOR ALL 
USING (public.is_admin());

-- ============================================================================
-- II. INDEXES DE PERFORMANCE ADDITIONNELS
-- ============================================================================

-- Index sur maintenance_rules.next_due_at pour alertes (avec soft-delete)
DROP INDEX IF EXISTS idx_maint_rules_next_due;
CREATE INDEX idx_maint_rules_next_due ON public.maintenance_rules(next_due_at) 
WHERE (is_active = TRUE AND deleted_at IS NULL);

-- Index sur checklists.created_at pour historique
CREATE INDEX IF NOT EXISTS idx_checklists_created ON public.checklists(machine_id, created_at DESC);

-- Index sur interventions.completed_at pour rapports
CREATE INDEX IF NOT EXISTS idx_interventions_completed ON public.interventions(machine_id, completed_at DESC) 
WHERE (deleted_at IS NULL);

-- Index sur part_requests.status pour filtrage workflow
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.part_requests(status, organization_id) 
WHERE (deleted_at IS NULL);

-- Index sur tickets.status pour filtrage
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status, organization_id) 
WHERE (deleted_at IS NULL);

-- ============================================================================
-- III. VUES ACTIVES ADDITIONNELLES
-- ============================================================================

-- Vue pour maintenance_definitions actives
CREATE OR REPLACE VIEW public.v_active_maintenance_definitions AS
SELECT md.* FROM public.maintenance_definitions md
WHERE md.deleted_at IS NULL;

-- Vue pour maintenance_rules actives
CREATE OR REPLACE VIEW public.v_active_maintenance_rules AS
SELECT mr.* FROM public.maintenance_rules mr
WHERE mr.deleted_at IS NULL AND mr.is_active = TRUE;

-- Vue pour checklists actifs
CREATE OR REPLACE VIEW public.v_active_checklists AS
SELECT c.* FROM public.checklists c
WHERE c.status != 'DRAFT';

-- ============================================================================
-- IV. VÉRIFICATION POST-PATCH
-- ============================================================================

DO $$
DECLARE
    v_tables_with_soft_delete INTEGER;
BEGIN
    -- Compter tables avec deleted_at après patch
    SELECT COUNT(*) INTO v_tables_with_soft_delete
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name = 'deleted_at'
    AND table_name IN (
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    );

    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'PATCH V6.1 APPLIQUÉ AVEC SUCCÈS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Tables avec soft-delete: %/23', v_tables_with_soft_delete;
    RAISE NOTICE 'Indexes de performance: +5';
    RAISE NOTICE 'Vues actives: +3';
    RAISE NOTICE '';
    RAISE NOTICE 'PROCHAINES ÉTAPES:';
    RAISE NOTICE '1. Exécuter db/tests/VALIDATION_COMPLETE.sql';
    RAISE NOTICE '2. Configurer Auth Hook (Supabase Dashboard)';
    RAISE NOTICE '3. Tester RLS runtime avec utilisateurs authentifiés';
    RAISE NOTICE '';
END $$;

SELECT 'Patch V6.1 appliqué ✅' AS status;
