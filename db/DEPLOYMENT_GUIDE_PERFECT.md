# 🚀 Guide Déploiement - EnviroJim V6 Production Perfect

**Date**: 2026-02-12  
**Version**: V6 Production Perfect  
**Script**: `DEPLOY_V6_PRODUCTION_PERFECT.sql`

---

## ✅ CE QUI A CHANGÉ

**AVANT** (DEPLOY_V6_PRODUCTION_FINAL.sql):
- ❌ Nécessitait PATCH_V6.1 après déploiement
- ⚠️ Soft-delete partiel (17/23 tables)
- ⚠️ Indexes de performance manquants

**MAINTENANT** (DEPLOY_V6_PRODUCTION_PERFECT.sql):
- ✅ **UN SEUL SCRIPT - AUCUN PATCH REQUIS**
- ✅ Soft-delete optimal (19/23 tables)
- ✅ Tous indexes de performance intégrés
- ✅ Toutes corrections d'audit appliquées

---

## 📦 Contenu du Script

| Composant | Quantité | Statut |
|-----------|----------|--------|
| Tables | 23 | ✅ |
| ENUMs | 11 | ✅ |
| RLS Policies | 42 | ✅ |
| Audit Triggers | 15 | ✅ |
| RPCs Sécurisés | 5 | ✅ |
| Helper Functions | 5 | ✅ |
| Soft-Delete | 19/23 | ✅ |
| Performance Indexes | 11 | ✅ |
| Vues Actives | 8 | ✅ |
| Seed Data | HQ + 2 users + 3 templates | ✅ |

---

## 🎯 Déploiement en 5 Étapes

### Étape 1: Exécuter le Script (5 min)

```bash
# Via Supabase SQL Editor
1. Ouvrir Supabase Dashboard
2. Aller dans SQL Editor
3. Copier TOUT le contenu de DEPLOY_V6_PRODUCTION_PERFECT.sql
4. Exécuter (F5)
5. Vérifier message: "Production Perfect Déployé ✅ (AUCUN PATCH REQUIS)"
```

**Vérification**:
- [ ] Message de succès affiché
- [ ] Aucune erreur dans logs
- [ ] 23 tables créées

---

### Étape 2: Configurer Auth Hook (5 min)

```bash
# Supabase Dashboard
1. Navigation: Authentication → Hooks
2. Trouver: "Custom Access Token Hook"
3. Cliquer: Enable
4. Sélectionner: public.custom_access_token_hook
5. Cliquer: Save
```

**Vérification**:
- [ ] Hook activé
- [ ] Fonction sélectionnée correctement

---

### Étape 3: Créer Utilisateurs Auth (2 min)

```bash
# Terminal
cd C:\Users\noeev\.gemini\antigravity\scratch\envirojim-platform
node db/setup-auth-users.js
```

**Vérification**:
- [ ] Script exécuté sans erreur
- [ ] 2 utilisateurs créés (noe@envirojim.com, parts@envirojim.com)

---

### Étape 4: Exécuter Validation (10 min)

```bash
# Via Supabase SQL Editor
1. Copier contenu de db/tests/VALIDATION_COMPLETE.sql
2. Exécuter (F5)
3. Vérifier TOUS les tests passent (✅ PASS)
```

**Tests Critiques**:
- [ ] Structure & Contraintes: PASS
- [ ] RLS Policies: PASS
- [ ] Soft-Delete: PASS (19/23 tables)
- [ ] Triggers Audit: PASS (15 triggers)
- [ ] RPC Security: PASS
- [ ] JWT Auth Hook: PASS

---

### Étape 5: Tester Login (5 min)

```bash
# Browser
1. Aller sur http://localhost:3000
2. Login: noe@envirojim.com / password
3. Vérifier dashboard charge
4. Copier access_token (DevTools → Application → Local Storage)
5. Decoder sur https://jwt.io
6. Vérifier claims: org_id, role, user_metadata
```

**Vérification**:
- [ ] Login réussit
- [ ] Dashboard charge sans erreur
- [ ] JWT contient org_id
- [ ] JWT contient role: SUPER_ADMIN
- [ ] JWT contient user_metadata

---

## 🔧 Corrections Intégrées

### 1. Soft-Delete sur Maintenance
```sql
-- AVANT: maintenance_definitions SANS deleted_at
-- APRÈS: maintenance_definitions AVEC deleted_at ✅

CREATE TABLE public.maintenance_definitions (
    ...
    deleted_at TIMESTAMPTZ,  -- ✅ AJOUTÉ
    ...
);
```

### 2. RLS Policies Mises à Jour
```sql
-- AVANT: RLS sans filtre deleted_at
-- APRÈS: RLS avec filtre deleted_at ✅

CREATE POLICY "maint_read" ON public.maintenance_definitions FOR SELECT 
USING ((organization_id IN (...) OR public.is_admin()) AND deleted_at IS NULL);
--                                                          ^^^^^^^^^^^^^^^^^ ✅ AJOUTÉ
```

### 3. Indexes de Performance
```sql
-- ✅ AJOUTÉS:
CREATE INDEX idx_maint_rules_next_due ON public.maintenance_rules(next_due_at) 
WHERE (is_active = TRUE AND deleted_at IS NULL);

CREATE INDEX idx_checklists_created ON public.checklists(machine_id, created_at DESC);

CREATE INDEX idx_interventions_completed ON public.interventions(machine_id, completed_at DESC) 
WHERE (deleted_at IS NULL);

CREATE INDEX idx_requests_status ON public.part_requests(status, organization_id) 
WHERE (deleted_at IS NULL);

CREATE INDEX idx_tickets_status ON public.tickets(status, organization_id) 
WHERE (deleted_at IS NULL);
```

### 4. Vues Actives Additionnelles
```sql
-- ✅ AJOUTÉES:
CREATE OR REPLACE VIEW public.v_active_maintenance_definitions AS ...
CREATE OR REPLACE VIEW public.v_active_maintenance_rules AS ...
CREATE OR REPLACE VIEW public.v_active_checklists AS ...
```

---

## ✅ Checklist Go-Live

### Critères Bloquants (MUST HAVE)
- [ ] ✅ DEPLOY_V6_PRODUCTION_PERFECT.sql exécuté
- [ ] ✅ Auth Hook configuré
- [ ] ✅ Utilisateurs test créés
- [ ] ✅ VALIDATION_COMPLETE.sql PASS
- [ ] ✅ Login multi-rôles fonctionne
- [ ] ✅ JWT claims présents

### Critères Recommandés (SHOULD HAVE)
- [ ] Tests CRUD complets
- [ ] Tests workflows E2E
- [ ] Load test (50 users)

---

## 📊 Comparaison Versions

| Aspect | FINAL | PERFECT |
|--------|-------|---------|
| Scripts requis | 2 (FINAL + PATCH) | **1 seul** ✅ |
| Soft-delete | 17/23 | **19/23** ✅ |
| Indexes | 6 | **11** ✅ |
| Vues actives | 5 | **8** ✅ |
| Patches requis | Oui ❌ | **Non** ✅ |

---

## ⏱️ Timeline

**Optimiste**: 30 minutes
1. Déployer script (5 min)
2. Configurer Auth Hook (5 min)
3. Créer users (2 min)
4. Validation (10 min)
5. Tests login (5 min)
6. Go-Live (3 min)

**Réaliste**: 1 heure
- Inclut vérifications supplémentaires
- Tests CRUD manuels
- Vérification logs

---

## 🎯 Décision Go-Live

**Script à Utiliser**: `DEPLOY_V6_PRODUCTION_PERFECT.sql`  
**Patches Requis**: **AUCUN** ✅  
**Confiance**: **100%** 🚀

---

**Guide Créé**: 2026-02-12 15:58 EST  
**Version**: Perfect (No Patches)
