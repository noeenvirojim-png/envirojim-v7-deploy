#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║        REAL E2E BROWSER SIMULATION TEST                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="http://127.0.0.1:3009"

# Test 1: Landing page
echo "1. LANDING PAGE TEST"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
echo "  Status: $STATUS (expect 200)"
if [ "$STATUS" = "200" ]; then echo "  ✓ PASS"; else echo "  ✗ FAIL"; fi
echo ""

# Test 2: Login page
echo "2. LOGIN PAGE TEST"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/login")
echo "  Status: $STATUS (expect 200)"
if [ "$STATUS" = "200" ]; then echo "  ✓ PASS"; else echo "  ✗ FAIL"; fi
echo ""

# Test 3: Dashboard (without auth, expect redirect)
echo "3. DASHBOARD REDIRECT TEST (no auth)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard")
echo "  Status: $STATUS (expect 307 redirect)"
if [ "$STATUS" = "307" ]; then echo "  ✓ PASS (protected)"; else echo "  ✗ FAIL"; fi
echo ""

# Test 4: Canonical Query Endpoint - Titan 500
echo "4. TITAN 500 CANONICAL QUERY TEST"
RESP=$(curl -s "$BASE_URL/api/machines/f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8/canonical-query?q=pressure%20valve")
HAS_TOP=$(echo "$RESP" | grep -q "top_cluster" && echo "yes" || echo "no")
echo "  Response has top_cluster: $HAS_TOP"
if [ "$HAS_TOP" = "yes" ]; then echo "  ✓ PASS"; else echo "  ✗ FAIL"; fi
echo ""

# Test 5: Extract actual query result
echo "5. CANONICAL QUERY RESULT CONTENT"
echo "$RESP" | grep -o '"canonical_name":"[^"]*"' | head -1
echo ""

# Test 6: VB750 Canonical Query
echo "6. VB750 CANONICAL QUERY TEST"
RESP_VB=$(curl -s "$BASE_URL/api/machines/30000000-0000-0000-0000-111111111111/canonical-query?q=part")
HAS_VB=$(echo "$RESP_VB" | grep -q "top_cluster" && echo "yes" || echo "no")
echo "  Response has top_cluster: $HAS_VB"
if [ "$HAS_VB" = "yes" ]; then echo "  ✓ PASS"; else echo "  ✗ FAIL"; fi
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              ENDPOINT TESTS COMPLETE                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
