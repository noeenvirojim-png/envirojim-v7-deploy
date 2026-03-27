# 📋 Checklist Déploiement Production - EnviroJim V6.1

**Date**: 2026-02-12  
**Version**: V6.1 (avec corrections audit)  
**Responsable**: Équipe Technique

---

## ✅ Pré-Déploiement (Complété)

- [x] Audit structure database
- [x] Audit RLS policies
- [x] Audit triggers d'audit
- [x] Audit RPCs et fonctions
- [x] Audit JWT auth hook
- [x] Identification gaps critiques
- [x] Création script corrections
- [x] Création suite validation
- [x] Documentation findings

---

## 🚀 Déploiement (À Exécuter)

### Étape 1: Déployer Schema Principal (5 min)
**Script**: `db/DEPLOY_V6_PRODUCTION_FINAL.sql`

```bash
# Via Supabase SQL Editor
# 1. Ouvrir Supabase Dashboard
# 2. Aller dans SQL Editor
# 3. Copier TOUT le contenu de DEPLOY_V6_PRODUCTION_FINAL.sql
# 4. Exécuter (F5)
# 5. Vérifier message: "Déploiement Production Final Terminé ✅"
```

**Vérification**:
- [ ] 23 tables créées
- [ ] 11 ENUMs créés
- [ ] 42 policies RLS créées
- [ ] 15 triggers créés
- [ ] Seed data inséré (HQ + 2 users)

---

### Étape 2: Appliquer Patch Corrections (2 min)
**Script**: `db/PATCH_V6.1_AUDIT_CORRECTIONS.sql`

```bash
# Via Supabase SQL Editor
# 1. Copier contenu de PATCH_V6.1_AUDIT_CORRECTIONS.sql
# 2. Exécuter (F5)
# 3. Vérifier message: "Patch V6.1 appliqué ✅"
```

**Vérification**:
- [ ] deleted_at ajouté sur maintenance_definitions
- [ ] deleted_at ajouté sur maintenance_rules
- [ ] RLS policies mises à jour
- [ ] 5 indexes additionnels créés
- [ ] 3 vues actives créées

---

### Étape 3: Configurer Auth Hook (5 min)
**Emplacement**: Supabase Dashboard → Authentication → Hooks

**Actions**:
1. [ ] Aller dans Supabase Dashboard
2. [ ] Navigation: **Authentication** → **Hooks**
3. [ ] Trouver: **Custom Access Token Hook**
4. [ ] Cliquer: **Enable**
5. [ ] Sélectionner fonction: `public.custom_access_token_hook`
6. [ ] Cliquer: **Save**

**Vérification**:
- [ ] Hook activé et sauvegardé
- [ ] Fonction sélectionnée correctement

---

### Étape 4: Créer Utilisateurs Auth (2 min)
**Script**: `db/setup-auth-users.js`

```bash
# Terminal
cd C:\Users\noeev\.gemini\antigravity\scratch\envirojim-platform
node db/setup-auth-users.js
```

**Utilisateurs Créés**:
- [ ] noe@envirojim.com (SUPER_ADMIN)
- [ ] parts@envirojim.com (ENVIROJIM_ADMIN)

**Vérification**:
- [ ] Script exécuté sans erreur
- [ ] Confirmation création utilisateurs
- [ ] Vérifier dans Supabase Dashboard → Authentication → Users

---

### Étape 5: Exécuter Validation Complète (10 min)
**Script**: `db/tests/VALIDATION_COMPLETE.sql`

```bash
# Via Supabase SQL Editor (en tant qu'utilisateur authentifié)
# 1. Copier contenu de VALIDATION_COMPLETE.sql
# 2. Exécuter (F5)
# 3. Vérifier TOUS les tests passent (✅ PASS)
```

**Tests à Vérifier**:
- [ ] Structure & Contraintes: PASS
- [ ] ENUMs & Rôles: PASS
- [ ] RLS Policies: PASS
- [ ] Soft-Delete: PASS (19/23 tables)
- [ ] Triggers Audit: PASS (15 triggers)
- [ ] RPC Security: PASS (5 RPCs)
- [ ] JWT Auth Hook: PASS
- [ ] Scénarios Limites: PASS
- [ ] Performance Indexes: PASS

---

## 🧪 Tests Post-Déploiement (30 min)

### Test 1: Login Multi-Rôles
**Objectif**: Vérifier JWT claims et RLS

```bash
# Test SUPER_ADMIN
1. Aller sur http://localhost:3000
2. Login: noe@envirojim.com / password
3. Vérifier dashboard charge
4. Copier access_token (DevTools → Application → Local Storage)
5. Decoder sur https://jwt.io
6. Vérifier claims: org_id, role, user_metadata
```

**Vérifications**:
- [ ] Login réussit
- [ ] Dashboard charge sans erreur
- [ ] JWT contient org_id
- [ ] JWT contient role: SUPER_ADMIN
- [ ] JWT contient user_metadata

```bash
# Test ENVIROJIM_ADMIN
1. Logout
2. Login: parts@envirojim.com / password
3. Vérifier dashboard charge
4. Vérifier accès limité à HQ
```

**Vérifications**:
- [ ] Login réussit
- [ ] Dashboard charge
- [ ] JWT role: ENVIROJIM_ADMIN
- [ ] Accès limité à EnviroJim HQ

---

### Test 2: Workflows CRUD
**Objectif**: Vérifier RLS et soft-delete

```bash
# Test Création Machine
1. Login comme SUPER_ADMIN
2. Aller sur /dashboard/machines
3. Créer nouvelle machine
4. Vérifier machine apparaît dans liste
5. Vérifier audit_logs capture INSERT
```

**Vérifications**:
- [ ] Machine créée avec succès
- [ ] Machine visible dans liste
- [ ] Audit log créé
- [ ] RLS permet accès

```bash
# Test Soft-Delete Machine
1. Supprimer machine créée
2. Vérifier machine disparaît de liste
3. Vérifier deleted_at IS NOT NULL dans DB
4. Vérifier audit_logs capture UPDATE (soft-delete)
```

**Vérifications**:
- [ ] Machine soft-deleted
- [ ] deleted_at rempli
- [ ] Machine invisible dans liste
- [ ] Audit log UPDATE créé

---

### Test 3: Part Request Workflow
**Objectif**: Vérifier RPC et workflow complet

```bash
# Test Création Part Request
1. Login comme SUPER_ADMIN
2. Aller sur /dashboard/part-requests
3. Créer nouveau part request avec items
4. Vérifier request créé
5. Vérifier items créés
```

**Vérifications**:
- [ ] Part request créé
- [ ] Items créés
- [ ] Status: PENDING
- [ ] Audit logs créés

```bash
# Test Update Status
1. Changer status à ORDERED
2. Vérifier status mis à jour
3. Vérifier audit_logs capture UPDATE
```

**Vérifications**:
- [ ] Status mis à jour
- [ ] Audit log UPDATE créé
- [ ] RPC update_part_request_status fonctionne

---

### Test 4: Scénarios Limites
**Objectif**: Vérifier sécurité et error handling

```bash
# Test User Soft-Deleted
1. Soft-delete user dans DB (UPDATE users SET deleted_at = NOW() WHERE email = 'test@test.com')
2. Tenter login avec cet user
3. Vérifier login échoue ou JWT vide
```

**Vérifications**:
- [ ] Login échoue ou JWT sans claims
- [ ] Warning dans logs: "Deleted user attempted login"

```bash
# Test CASCADE DELETE
1. Créer organization test
2. Créer machine liée à cette org
3. Supprimer organization
4. Vérifier machine aussi supprimée (CASCADE)
```

**Vérifications**:
- [ ] Organization supprimée
- [ ] Machine aussi supprimée
- [ ] Audit logs pour les deux

---

## 📊 Monitoring Post-Go-Live (Ongoing)

### Métriques à Surveiller
- [ ] Temps réponse login (< 500ms)
- [ ] Temps chargement dashboard (< 1s)
- [ ] Temps réponse API (< 200ms p95)
- [ ] Erreurs RLS (0 expected)
- [ ] Erreurs JWT (0 expected)

### Logs à Surveiller
```bash
# Supabase Logs
# Rechercher:
# - [AUTH HOOK] warnings
# - RLS policy violations
# - Circular dependency errors
# - JWT decode errors
```

**Actions si Erreurs**:
- [ ] Documenter erreur exacte
- [ ] Vérifier AUDIT_FINDINGS.md
- [ ] Appliquer fix si disponible
- [ ] Escalader si nécessaire

---

## ✅ Critères Go-Live

### Critères Bloquants (MUST HAVE)
- [ ] ✅ DEPLOY_V6_PRODUCTION_FINAL.sql exécuté
- [ ] ✅ PATCH_V6.1_AUDIT_CORRECTIONS.sql exécuté
- [ ] ✅ Auth Hook configuré
- [ ] ✅ Utilisateurs test créés
- [ ] ✅ VALIDATION_COMPLETE.sql PASS
- [ ] ✅ Login multi-rôles fonctionne
- [ ] ✅ JWT claims présents
- [ ] ✅ RLS runtime testé

### Critères Recommandés (SHOULD HAVE)
- [ ] Tests CRUD complets
- [ ] Tests workflows E2E
- [ ] Tests scénarios limites
- [ ] Load test (50 users)
- [ ] Monitoring configuré

---

## 🎯 Décision Go-Live

**Responsable**: Noé EVE  
**Date**: _______________  
**Heure**: _______________

**Statut**:
- [ ] ✅ GO - Tous critères bloquants remplis
- [ ] ⚠️ GO WITH CAUTION - Critères bloquants OK, recommandés partiels
- [ ] ❌ NO-GO - Critères bloquants non remplis

**Signature**: _______________

---

## 📞 Support Post-Go-Live

**Contact Technique**: Noé EVE (noe@envirojim.com)  
**Contact Backup**: Alexandre Paré (parts@envirojim.com)

**Procédure Rollback**:
1. Sauvegarder DB actuelle
2. Restaurer snapshot pré-déploiement
3. Désactiver Auth Hook
4. Notifier utilisateurs

**Temps Rollback Estimé**: 15 minutes

---

**Checklist Créée**: 2026-02-12 15:50 EST  
**Version**: 1.0
