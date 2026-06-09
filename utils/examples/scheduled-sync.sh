#!/bin/bash

# Scheduled Sync Example
# This script sets up and manages automated data synchronization

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          Health Data - Scheduled Sync Configuration           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

USER_ID="${1:-user-abc-123}"

# Configure user
echo "Configuring for user: $USER_ID"
node ../dist/config-manager.js set-user $USER_ID
echo ""

# Add sync schedules
echo "Adding sync schedules..."
echo "  → Terra: Every 4 hours"
node ../dist/config-manager.js add-schedule terra "4 hours"

echo "  → Dexcom: Every 2 hours"
node ../dist/config-manager.js add-schedule dexcom "2 hours"

echo "  → Fitbit: Every 6 hours"
node ../dist/config-manager.js add-schedule fitbit "6 hours"

echo "  → Oura: Every 12 hours"
node ../dist/config-manager.js add-schedule oura "12 hours"
echo ""

# List configured schedules
echo "Current sync schedules:"
node ../dist/config-manager.js list-schedules
echo ""

# Backup configuration
echo "Backing up configuration..."
node ../dist/config-manager.js export ./sync-config-backup.json
echo "✓ Configuration backed up to sync-config-backup.json"
echo ""

# Start the scheduler
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Starting Sync Scheduler (Press Ctrl+C to stop)              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

node ../dist/sync-scheduler.js
