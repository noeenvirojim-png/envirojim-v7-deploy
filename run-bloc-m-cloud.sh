#!/bin/bash
# BLOC M Execution via Cloud Supabase
# This script temporarily switches to cloud Supabase, executes BLOC M, then restores local config

set -e

ROOT="$(pwd)"
ENV_LOCAL="$ROOT/.env.local"
ENV_PROD="$ROOT/.env.production"
ENV_BACKUP="$ROOT/.env.local.backup-$(date +%s)"

echo "[BLOC M] CLOUD SUPABASE EXECUTION"
echo "===================================="
echo ""

# Step 1: Verify files exist
if [ ! -f "$ENV_LOCAL" ]; then
  echo "✗ .env.local not found"
  exit 1
fi

if [ ! -f "$ENV_PROD" ]; then
  echo "✗ .env.production not found"
  exit 1
fi

# Step 2: Backup current .env.local
echo "[STEP 1] BACKING UP CURRENT ENVIRONMENT"
cp "$ENV_LOCAL" "$ENV_BACKUP"
echo "✓ Backed up to: $ENV_BACKUP"
echo ""

# Step 3: Extract cloud credentials from .env.production
echo "[STEP 2] SWITCHING TO CLOUD SUPABASE"
CLOUD_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" "$ENV_PROD" | cut -d'=' -f2- | tr -d '"')
CLOUD_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_PROD" | cut -d'=' -f2- | tr -d '"')

if [ -z "$CLOUD_URL" ] || [ -z "$CLOUD_KEY" ]; then
  echo "✗ Cloud credentials not found in .env.production"
  # Restore backup
  mv "$ENV_BACKUP" "$ENV_LOCAL"
  exit 1
fi

# Create temporary .env.local with cloud credentials
cat > "$ENV_LOCAL" << EOFENV
# ENVIROJIM - CLOUD ENVIRONMENT (TEMPORARY FOR BLOC M)
# Original: $ENV_BACKUP

NEXT_PUBLIC_SUPABASE_URL=$CLOUD_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$ENV_PROD" | cut -d'=' -f2- | tr -d '"')
SUPABASE_SERVICE_ROLE_KEY=$CLOUD_KEY

POSTGRES_URL=$(grep "^POSTGRES_URL=" "$ENV_PROD" | cut -d'=' -f2- | tr -d '"')
GEMINI_API_KEY=$(grep "^GEMINI_AI_KEY=" "$ENV_PROD" | cut -d'=' -f2- | tr -d '"')

NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://envirojim.vercel.app
EOFENV

echo "✓ Switched to cloud: $CLOUD_URL"
echo ""

# Step 4: Verify cloud connectivity
echo "[STEP 3] VERIFYING CLOUD CONNECTIVITY"
if command -v curl &> /dev/null; then
  if curl -s "$CLOUD_URL/rest/v1/" -H "Authorization: Bearer $CLOUD_KEY" > /dev/null 2>&1; then
    echo "✓ Cloud Supabase accessible"
  else
    echo "✗ Cloud Supabase not accessible"
    mv "$ENV_BACKUP" "$ENV_LOCAL"
    exit 1
  fi
fi
echo ""

# Step 5: Execute BLOC M
echo "[STEP 4] EXECUTING BLOC M"
echo "=================================================="
if node scripts/bloc-m-supabase-closure.mjs; then
  BLOC_M_SUCCESS=true
  echo ""
  echo "=================================================="
  echo "✓ BLOC M EXECUTION SUCCESSFUL"
else
  BLOC_M_SUCCESS=false
  echo ""
  echo "=================================================="
  echo "✗ BLOC M EXECUTION FAILED"
fi
echo ""

# Step 6: Restore original environment
echo "[STEP 5] RESTORING LOCAL ENVIRONMENT"
mv "$ENV_BACKUP" "$ENV_LOCAL"
echo "✓ Restored original .env.local"
echo ""

# Step 7: Final verdict
echo "[STEP 6] FINAL VERDICT"
if [ "$BLOC_M_SUCCESS" = true ]; then
  echo "✓ BLOC M COMPLETED SUCCESSFULLY"
  echo ""
  echo "Next steps:"
  echo "  1. Review artifacts/bloc-j/review-decisions.csv"
  echo "  2. Run: node scripts/bloc-j-promote-reviewed-parts.mjs"
  echo "  3. Run: node scripts/bloc-k-review-ui-smoke.mjs"
  echo "  4. Run: node scripts/bloc-l-final-parts-readiness.mjs"
  exit 0
else
  echo "✗ BLOC M FAILED"
  exit 1
fi
