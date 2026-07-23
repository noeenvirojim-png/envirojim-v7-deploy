# EnviroJim — simple self-hosted deployment

## Target architecture

The production application runs on one Linux server with Docker Compose:

- `app`: the standalone Next.js application
- `caddy`: HTTPS certificate management and reverse proxy
- Supabase Cloud: database, authentication and document storage
- Gemini API: PDF extraction and technical intelligence

Vercel is not used.

Keeping Supabase managed during stabilization avoids operating a large multi-container database/auth/storage platform. The application can be migrated to fully self-hosted Supabase later if control becomes more important than simplicity.

## One-time server preparation

Install Git and Docker Engine with the Docker Compose plugin, then clone the repository.

```bash
git clone https://github.com/noeenvirojim-png/envirojim-v7-deploy.git
cd envirojim-v7-deploy
git checkout agent/stabilize-machine-creation
cp .env.production.example .env.production
```

Configure `.env.production` with the domain, Supabase values and Gemini key. Point the domain DNS record to the server IP.

## Install

```bash
bash scripts/envirojim-server.sh install
```

Caddy obtains and renews the HTTPS certificate automatically after the domain points to the server.

## Update

```bash
bash scripts/envirojim-server.sh update
```

## Status and logs

```bash
bash scripts/envirojim-server.sh status
```

## Stop

```bash
bash scripts/envirojim-server.sh stop
```

## Deployment gate

A release is deployable only when both checks pass:

```bash
npx tsc --noEmit
npm run build
```

The Docker build and GitHub verification workflow enforce these checks.

## Secrets

Never commit `.env.production`. Rotate any secret that has previously appeared in Git history, screenshots, logs or chat messages.
