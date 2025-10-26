#!/bin/bash

# Basic Usage Examples for Health Data Utilities
# This script demonstrates common workflows

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║        Health Data Utilities - Basic Usage Examples          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
USER_ID="user-abc-123"
OUTPUT_DIR="./output"
mkdir -p $OUTPUT_DIR

# Step 1: Configure the utilities
echo "Step 1: Configuring utilities..."
node ../dist/config-manager.js set-user $USER_ID
node ../dist/config-manager.js set-format json
echo "✓ Configuration complete"
echo ""

# Step 2: View current connections
echo "Step 2: Viewing health connections..."
node ../dist/health-cli.js connections
echo ""

# Step 3: Run system health check
echo "Step 3: Running system health check..."
node ../dist/health-cli.js health
echo ""

# Step 4: Sync data from providers (last 7 days)
echo "Step 4: Syncing data from providers..."
echo "  → Syncing Terra..."
node ../dist/health-cli.js sync terra 7 || echo "Terra sync skipped (not connected)"
echo "  → Syncing Dexcom..."
node ../dist/health-cli.js sync dexcom 7 || echo "Dexcom sync skipped (not connected)"
echo "  → Syncing Fitbit..."
node ../dist/health-cli.js sync fitbit 7 || echo "Fitbit sync skipped (not connected)"
echo ""

# Step 5: Get statistics
echo "Step 5: Viewing health statistics..."
node ../dist/health-cli.js stats
echo ""

# Step 6: Generate analytics report
echo "Step 6: Generating analytics report..."
node ../dist/health-analytics.js report $USER_ID dexcom glucose 30 $OUTPUT_DIR/glucose-report.json || echo "Report generation skipped (no data)"
echo ""

# Step 7: Find correlations
echo "Step 7: Finding correlations between metrics..."
node ../dist/health-analytics.js correlate $USER_ID glucose steps 30 || echo "Correlation analysis skipped (no data)"
echo ""

# Step 8: Export data
echo "Step 8: Exporting data..."
START_DATE=$(date -d "30 days ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)
node ../dist/health-cli.js export dexcom $START_DATE $END_DATE $OUTPUT_DIR/glucose-export.csv || echo "Export skipped (no data)"
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Workflow Complete!                         ║"
echo "║  Check the '$OUTPUT_DIR' directory for generated files       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
