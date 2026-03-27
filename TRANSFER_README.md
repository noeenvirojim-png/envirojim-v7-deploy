# 🚀 ENVIROJIM V6 - Transfer Guide

Ce dossier contient l'intégralité du projet **EnviroJim V6 Enterprise Supreme**. Voici comment le relancer sur ta nouvelle machine.

## 1. Pré-requis
- **Node.js**: v18+ recommandé.
- **Supabase**: Un projet Supabase actif (ou Docker Supabase local).

## 2. Installation
1. Copie ce dossier complet sur ton nouvel ordi.
2. Ouvre un terminal dans ce dossier.
3. Installe les dépendances :
   ```bash
   npm install
   ```

## 3. Configuration
1. Renomme `.env.local.example` en `.env.local`.
2. Remplis les informations avec tes nouvelles clés Supabase :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `POSTGRES_URL` (Direct connection pour les scripts de migration).

## 4. Base de Données
Si tu dois réinstaller la base de données :
- Le fichier le plus complet est : `db/DEPLOY_V6_PRODUCTION_ULTIMATE.sql`.
- Injecte-le via l'éditeur SQL de Supabase ou via `psql`.

## 5. Aide AI
Si tu utilises une IA (comme Gemini ou Cursor) pour continuer le développement :
👉 Dis lui de lire en priorité le fichier **`MISSION_CONTINUITY.md`**.
Ce fichier contient tout le résumé technique "supra complet" qu'elle doit connaître pour ne pas faire d'erreurs.

---
*Bonne continuation sur le projet !* 🛠️🏗️
