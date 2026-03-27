# 📚 Guide de Déploiement - EnviroJim V6

## 🎯 Quel Script Utiliser ?

### Scénario 1: Fresh Install (Nouvelle BD) ✅ VOTRE CAS
**Fichier**: `DEPLOY_V6_PRODUCTION_ULTIMATE.sql` ou `DEPLOY_V6_FRESH_INSTALL.sql`

**Quand l'utiliser**:
- ✅ Nouvelle base de données Supabase
- ✅ Aucun user existant
- ✅ Aucune donnée à préserver
- ✅ Premier déploiement de l'application

**Contient**:
- `DROP SCHEMA CASCADE` (réinitialisation complète)
- Seed data avec IDs fixes
- Configuration complète from scratch

**Commande**:
```sql
-- Copier TOUT le contenu dans Supabase SQL Editor
-- Exécuter (F5)
```

---

### Scénario 2: Migration (BD Existante) ⚠️ FUTUR
**Fichier**: `DEPLOY_V6_MIGRATION.sql` (à créer si nécessaire)

**Quand l'utiliser**:
- ⚠️ Base de données avec users existants
- ⚠️ Données à préserver
- ⚠️ Migration V5 → V6 ou V6 → V7

**Contient**:
- `ALTER TABLE` au lieu de `CREATE TABLE`
- Préservation des IDs existants
- Migration incrémentale

**⚠️ NE PAS utiliser DEPLOY_V6_PRODUCTION_ULTIMATE.sql dans ce cas !**

---

## 🚀 Ordre d'Exécution (Fresh Install)

### 1. Déploiement BD (5 min)
```sql
-- Fichier: DEPLOY_V6_PRODUCTION_ULTIMATE.sql
-- Résultat attendu: "Production ULTIMATE Déployé ✅"
```

### 2. Vérification Seeds (1 min)
```sql
-- Fichier: db/tests/VERIFY_SEEDS.sql
-- Résultat attendu: "✅ ALL SEEDS VERIFIED"
```

### 3. Configuration Auth Hook (2 min)
```
Supabase Dashboard → Authentication → Hooks
→ Enable "Custom Access Token Hook"
→ Sélectionner: public.custom_access_token_hook
```

### 4. Création Users Auth (1 min)
```bash
node db/setup-auth-users.js
# Résultat attendu: "✅ 2 users created"
```

### 5. Validation Complète (10 min)
```sql
-- Fichier: db/tests/VALIDATION_COMPLETE.sql
-- Tous tests doivent être PASS
```

### 6. Test Login (2 min)
```
http://localhost:3000
Login: noe@envirojim.com
Vérifier: Dashboard charge
```

---

## 📋 Checklist Pré-Déploiement

**Avant d'exécuter le script**:
- [ ] Backup BD existante (si applicable)
- [ ] Variables env configurées (.env.local)
- [ ] Connexion Supabase vérifiée
- [ ] Scénario confirmé (Fresh Install vs Migration)

**Après déploiement**:
- [ ] Seeds vérifiés (VERIFY_SEEDS.sql)
- [ ] Auth Hook activé
- [ ] Users créés (setup-auth-users.js)
- [ ] Validation complète (VALIDATION_COMPLETE.sql)
- [ ] Login testé (2 rôles)

---

## ⚠️ Avertissements Critiques

### DROP SCHEMA CASCADE
```sql
DROP SCHEMA IF EXISTS public CASCADE;
```

**⚠️ DANGER**: Supprime TOUTES les données existantes !

**Utilisez UNIQUEMENT si**:
- ✅ Base de données vide
- ✅ Environnement de test
- ✅ Vous êtes CERTAIN de vouloir tout effacer

**NE JAMAIS utiliser si**:
- ❌ Données existantes à préserver
- ❌ Users déjà créés
- ❌ Production avec données réelles

---

## 🔄 Plan de Rollback

**Si problème après déploiement**:

1. **Restaurer backup**:
   - Supabase Dashboard → Settings → Database → Backups
   - Sélectionner backup pré-déploiement
   - Restore

2. **Désactiver Auth Hook** (temporaire):
   - Authentication → Hooks
   - Disable "Custom Access Token Hook"

3. **Vérifier logs**:
   - Supabase Dashboard → Logs → Postgres Logs
   - Identifier erreur exacte

---

## 📞 Support

**Logs à vérifier en cas de problème**:
- Supabase Postgres Logs
- Browser Console (F12)
- Vercel Deployment Logs

**Scripts de diagnostic**:
- `VERIFY_SEEDS.sql` - Vérifier seeds
- `VALIDATION_COMPLETE.sql` - Validation complète
- `validate-sync.sql` - Sync auth.users ↔ public.users

---

**Documentation créée**: 2026-02-12  
**Version**: V6 Production Ultimate
