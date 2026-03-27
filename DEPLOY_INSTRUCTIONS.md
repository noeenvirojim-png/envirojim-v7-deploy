# Quick Deployment Guide

## Option A: Vercel CLI (Manual - Requires One-Time Login)
```bash
npm install -g vercel
vercel login
cd CURRENT_APP
vercel --prod --yes
```
**Time:** 2-3 minutes  
**Requirements:** Browser for interactive login

## Option B: GitHub Actions (Automated - Requires GitHub Setup)
1. Push code to GitHub (`main` or `master` branch)
2. Go to GitHub Repo → Settings → Secrets and variables → Actions
3. Add secret: `VERCEL_TOKEN` (create at https://vercel.com/account/tokens)
4. Add secrets for:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `POSTGRES_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_AI_KEY`
5. Workflow will auto-deploy on push to main/master

Workflow file: `.github/workflows/deploy.yml` (ready to use)

## Current Status
- ✓ Code: PROD-READY
- ✓ Build: SUCCESS
- ✓ Smoke Tests: PASS
- ✗ Deployment: Blocked on valid Vercel token

## Next Steps
Choose Option A (fastest) or Option B (automated).
