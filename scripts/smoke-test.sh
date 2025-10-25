#!/usr/bin/env bash
#
# EverAfter Edge Functions Smoke Test
# Tests critical endpoints with real JWT to ensure production readiness
#
# Usage:
#   USER_JWT="<your-jwt>" ./scripts/smoke-test.sh
#
# Requirements:
#   - curl
#   - jq
#   - USER_JWT environment variable (get from browser DevTools → Application → Local Storage → supabase.auth.token)
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="${SUPABASE_URL:-}"
USER_JWT="${USER_JWT:-}"

# Auto-detect Supabase URL from .env if not set
if [ -z "$SUPABASE_URL" ] && [ -f ".env" ]; then
  SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
fi

if [ -z "$SUPABASE_URL" ]; then
  echo -e "${RED}❌ SUPABASE_URL not set${NC}"
  echo "Set it in .env as VITE_SUPABASE_URL or export SUPABASE_URL"
  exit 1
fi

if [ -z "$USER_JWT" ]; then
  echo -e "${RED}❌ USER_JWT not set${NC}"
  echo ""
  echo "To get your JWT:"
  echo "  1. Open your app in the browser and log in"
  echo "  2. Open DevTools (F12)"
  echo "  3. Go to Application → Local Storage"
  echo "  4. Find 'sb-<project>-auth-token'"
  echo "  5. Copy the 'access_token' value"
  echo ""
  echo "Then run: USER_JWT='<your-token>' ./scripts/smoke-test.sh"
  exit 1
fi

# Remove trailing slashes
SUPABASE_URL="${SUPABASE_URL%/}"
FUNCTIONS_URL="${SUPABASE_URL}/functions/v1"

echo ""
echo "🔍 EverAfter Edge Functions Smoke Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Functions URL: $FUNCTIONS_URL"
echo ""

# Track results
PASSED=0
FAILED=0

# Helper function to test an endpoint
test_endpoint() {
  local name="$1"
  local endpoint="$2"
  local payload="$3"
  local expected_field="$4"

  echo -n "Testing $name... "

  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $USER_JWT" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$FUNCTIONS_URL/$endpoint")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    # Check if expected field exists
    if echo "$body" | jq -e ".$expected_field" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
      echo "   Response: $(echo "$body" | jq -c .)"
      PASSED=$((PASSED + 1))
    else
      echo -e "${YELLOW}⚠ WARNING${NC} (HTTP $http_code but missing field '$expected_field')"
      echo "   Response: $(echo "$body" | jq -c .)"
      FAILED=$((FAILED + 1))
    fi
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
    echo "   Response: $(echo "$body" | jq -c . 2>/dev/null || echo "$body")"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# Test 1: Daily Progress
test_endpoint \
  "daily-progress" \
  "daily-progress" \
  '{}' \
  "progress_id"

# Test 2: Raphael Chat
test_endpoint \
  "raphael-chat" \
  "raphael-chat" \
  '{"input": "Hello, how are you?"}' \
  "reply"

# Test 3: Raphael Chat with Safety Check
test_endpoint \
  "raphael-chat (safety check)" \
  "raphael-chat" \
  '{"input": "I have a headache, what medication should I take?"}' \
  "reply"

# Note: task-create requires an existing engram_id, so we skip it in basic smoke test
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  echo ""
  echo "Common issues:"
  echo "  - Expired JWT: Get a fresh token from the browser"
  echo "  - Missing OPENAI_API_KEY: Set in Supabase Dashboard → Functions → Secrets"
  echo "  - RLS policies: Check database policies allow authenticated access"
  exit 1
fi
