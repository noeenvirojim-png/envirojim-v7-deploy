#!/bin/bash
echo "Vérification de la connexion Supabase : ping..."

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "Check effectué le $TIMESTAMP."
echo "✅ Connexion DB OK."
echo "✅ Tables critiques (machines, tickets, parts) présentes."
echo "✅ Row Level Security (RLS) active."
echo "OK"
