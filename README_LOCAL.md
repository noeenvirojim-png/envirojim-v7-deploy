# 🚜 Guide de Développement Local - ENVIROJIM (LOCKDOWN VERSION)

Ce guide est la source de vérité absolue pour faire tourner l'application Envirojim localement de façon **100% autonome et prouvée**.

## ⚙️ Prérequis
- **Node.js** : >= 20.0.0
- **Docker Desktop** : Requis pour le stack Supabase (Auth, DB, Storage).
- **Git**

## 🚀 Installation & Bootstrap (Un clic)
Tout l'environnement s'initialise avec une seule commande :
```bash
npm run local:setup
```
*Cette commande : vérifie Docker, démarre Supabase, applique les migrations, injecte les données (seed) et initialise le stockage.*

## 🧪 Vérification Mécanique
Pour prouver que l'environnement est parfait :
```bash
npm run local:check
```

## 🛠️ Maintenance & Reset
En cas de corruption de l'environnement, utilisez le reset "nucléaire" :
```bash
npm run local:reset
```

## 🔑 Identifiants Seed
- **Admin** : `noe@envirojim.com`
- **Password** : `EnviroJim2024!`

## 🌐 URLs Locales
| Service | URL |
| :--- | :--- |
| **App Frontend** | [http://localhost:3000](http://localhost:3000) |
| **Supabase Studio** | [http://localhost:54323](http://localhost:54323) |
| **API Auth** | [http://localhost:54321](http://localhost:54321) |

## 🧪 Tests Playwright
```bash
npx playwright test tests/smoke
```

## 📄 Preuve de Flow PDF
Pour tester le pipeline de documents localement :
```bash
node scripts/test-pdf-flow.js
```

## 🛑 Troubleshooting
1. **Port 3000 occupé** : Fermez les autres serveurs Next.js.
2. **Docker non lancé** : Le bootstrap échouera bruyamment.
3. **Erreur de Migration** : Lancez `npm run local:reset` pour repartir de zéro.
