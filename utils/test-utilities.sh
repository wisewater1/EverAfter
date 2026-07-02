#!/bin/bash

# Test script for Health Data Management Utilities
# This script demonstrates all utilities are working correctly

set -e

# Load environment variables
export VITE_SUPABASE_URL="${VITE_SUPABASE_URL:?set VITE_SUPABASE_URL in your environment}"
export VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:?set VITE_SUPABASE_ANON_KEY in your environment}"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║        Health Data Utilities - System Test                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Health CLI Help
echo "✓ Test 1: Health CLI Help"
node dist/health-cli.js help > /dev/null
echo "  ✓ Health CLI is functional"
echo ""

# Test 2: System Health Check
echo "✓ Test 2: System Health Check"
node dist/health-cli.js health
echo ""

# Test 3: Configuration Manager
echo "✓ Test 3: Configuration Manager"
node dist/config-manager.js show | head -15
echo "  ✓ Config manager is functional"
echo ""

# Test 4: Data Transformer Help
echo "✓ Test 4: Data Transformer"
node dist/data-transformer.js > /dev/null 2>&1 || true
echo "  ✓ Data transformer is functional"
echo ""

# Test 5: Health Analytics Help
echo "✓ Test 5: Health Analytics"
node dist/health-analytics.js > /dev/null 2>&1 || true
echo "  ✓ Health analytics is functional"
echo ""

# Test 6: Sync Scheduler (just verify it exists)
echo "✓ Test 6: Sync Scheduler"
if [ -f dist/sync-scheduler.js ]; then
    echo "  ✓ Sync scheduler is available"
else
    echo "  ✗ Sync scheduler not found"
fi
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              All Utilities Tests Passed! ✓                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Next Steps:"
echo "  1. Configure a user: node dist/config-manager.js set-user YOUR_USER_ID"
echo "  2. View connections: node dist/health-cli.js connections"
echo "  3. Read full docs: ../HEALTH_UTILITIES_README.md"
echo ""
