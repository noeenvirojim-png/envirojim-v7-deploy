# 🔍 Protocole de Validation Production - EnviroJim V6

**Date**: 2026-02-12  
**Phase**: Audit Complet Pré-Production  
**Objectif**: Validation 100% avant Go-Live

---

## Phase 1: Audit Complet DB & Logique Métier

### 1.1 Structure & Contraintes
- [ ] Vérifier toutes PK/FK/Check constraints
- [ ] Vérifier ON DELETE CASCADE/SET NULL/RESTRICT
- [ ] Vérifier types de données (VARCHAR, DECIMAL, UUID, INTEGER)
- [ ] Vérifier indexation sur colonnes filtrées

### 1.2 ENUMs & Rôles
- [ ] Vérifier exhaustivité des ENUMs (11 types)
- [ ] Vérifier couverture complète des workflows
- [ ] Vérifier aucun rôle/statut manquant

### 1.3 RLS (Row-Level Security)
- [ ] Vérifier RLS activée sur toutes tables critiques
- [ ] Vérifier USING et WITH CHECK pour tous rôles
- [ ] Tester SUPER_ADMIN (full access)
- [ ] Tester ENVIROJIM_ADMIN (HQ only)
- [ ] Tester DEALER_ADMIN (org + hierarchy)
- [ ] Tester SERVICE_PROVIDER_ADMIN (org + hierarchy)
- [ ] Tester CLIENT_ADMIN (org + hierarchy)
- [ ] Tester TECHNICIAN (assigned machines)
- [ ] Tester OPERATOR (assigned machines)
- [ ] Tester soft-delete dans RLS

### 1.4 Triggers d'Audit
- [ ] Vérifier 15 triggers couvrent INSERT/UPDATE/DELETE
- [ ] Vérifier OLD/NEW capturés correctement
- [ ] Vérifier logs immutables (UPDATE/DELETE révoqués)
- [ ] Vérifier lisibilité admin uniquement

### 1.5 RPC / Fonctions
- [ ] Vérifier SECURITY DEFINER sur toutes fonctions
- [ ] Vérifier auth.uid() utilisé correctement
- [ ] Vérifier filtrage RLS dans SELECT
- [ ] Tester create_machine_with_document
- [ ] Tester create_part_request_with_items
- [ ] Tester update_part_request_status
- [ ] Tester update_document
- [ ] Tester delete_document

### 1.6 JWT / Auth Hook
- [ ] Vérifier claims générés (org_id, role, user_metadata)
- [ ] Vérifier soft-delete bloque accès
- [ ] Tester JWT via jwt.io
- [ ] Vérifier hook configuré dans Supabase Dashboard

### 1.7 Soft-Delete & Compliance
- [ ] Vérifier deleted_at sur 17/23 tables
- [ ] Identifier 6 tables sans soft-delete
- [ ] Vérifier vues v_active_* cohérentes
- [ ] Vérifier RLS filtre deleted_at IS NULL

### 1.8 Performance
- [ ] Vérifier index tsvector pour recherche texte
- [ ] Vérifier index sur org_id, machine_id, site_id
- [ ] Vérifier index sur created_at, updated_at
- [ ] Vérifier index partiels (WHERE deleted_at IS NULL)

---

## Phase 2: Tests Scénarios Complets

### 2.1 Multi-Org & Multi-User
- [ ] SUPER_ADMIN accède à tout
- [ ] ENVIROJIM_ADMIN accède HQ uniquement
- [ ] DEALER_ADMIN limité à org + hiérarchie
- [ ] SERVICE_PROVIDER_ADMIN limité à org + hiérarchie
- [ ] CLIENT_ADMIN limité à org + hiérarchie
- [ ] TECHNICIAN accès machines assignées
- [ ] OPERATOR accès machines assignées

### 2.2 Flux Critiques
- [ ] Création machine + document
- [ ] Part request + items
- [ ] Update part request status
- [ ] Diagnostic sessions/nodes
- [ ] Checklists / daily reports
- [ ] RFQs / supplier quotes
- [ ] Soft-delete / restauration
- [ ] Email notifications / templates

### 2.3 Scénarios Limites
- [ ] User soft-deleted tente login
- [ ] User soft-deleted tente modification
- [ ] CASCADE DELETE sur organization
- [ ] CASCADE DELETE sur machine
- [ ] Conflict FK (référence invalide)
- [ ] Conflict ENUM (valeur invalide)
- [ ] Conflict unique index (doublon)
- [ ] JWT invalide
- [ ] JWT expiré
- [ ] JWT sans claims

---

## Phase 3: Consolidation Globale

### 3.1 Corrections Identifiées
- [ ] Lister toutes corrections nécessaires
- [ ] Appliquer corrections en bloc
- [ ] Générer script final v2 si nécessaire

### 3.2 Vérification Finale
- [ ] Aucun warning ou exception
- [ ] Build TypeScript confirmé
- [ ] Test E2E complet sur dev

---

## Gaps Critiques Identifiés

### Gap #1: Tests Runtime RLS ❌
**Statut**: Non testés  
**Risque**: Fuite de données, dépendance circulaire  
**Action**: Créer VALIDATION_COMPLETE.sql

### Gap #2: Auth Hook Non Configuré ⚠️
**Statut**: Code OK, config manquante  
**Risque**: RLS échouera silencieusement  
**Action**: Documentation + vérification post-déploiement

### Gap #3: Soft-Delete Partiel ⚠️
**Statut**: 17/23 tables  
**Risque**: Suppressions accidentelles, perte historique  
**Action**: Identifier 6 tables manquantes, décider si nécessaire

### Gap #4: Tests Scénarios Limites ❌
**Statut**: Non testés  
**Risque**: Crash runtime, comportements inattendus  
**Action**: Suite de tests automatisés

### Gap #5: Tests E2E ❌
**Statut**: Non testés  
**Risque**: Intégration frontend/backend non validée  
**Action**: Tests Playwright

---

## Livrables Attendus

1. **VALIDATION_COMPLETE.sql** - Suite de tests SQL
2. **AUDIT_FINDINGS.md** - Rapport d'audit détaillé
3. **DEPLOY_V6_PRODUCTION_FINAL_V2.sql** - Script corrigé si nécessaire
4. **DEPLOYMENT_CHECKLIST.md** - Checklist déploiement

---

**Début Audit**: 2026-02-12 15:50 EST  
**Durée Estimée**: 60 minutes  
**Responsable**: Antigravity AI
