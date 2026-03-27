#!/bin/bash
# 1 modifier code (manuel)
# 2 git commit & 3 push
./scripts/git-fast-push.sh "$1"

echo "Merge into master and force deploy..."
git fetch origin
git checkout master
git merge main -m "chore: fast deploy merge"
git push origin master

echo ""
echo "En attente du build Vercel (env 60s)..."
# Just waiting a reasonable delay. Note: Better approach is to poll Vercel CLI, but this works for demo.
sleep 45

echo ""
echo "Running smoke tests sur Production..."
npm run test:smoke

echo "Cycle complet terminé."
git checkout main
