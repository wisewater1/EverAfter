#!/bin/bash

# Weekly Health Report Generator
# Run this script weekly to generate comprehensive health reports

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              Weekly Health Report Generator                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

USER_ID="${1:-user-abc-123}"
REPORT_DIR="./weekly-reports/$(date +%Y-%m-%d)"
DAYS=7

mkdir -p $REPORT_DIR

echo "Generating weekly report for: $USER_ID"
echo "Report directory: $REPORT_DIR"
echo "Period: Last $DAYS days"
echo ""

# Sync all providers first
echo "═══════════════════════════════════════════════════════════════"
echo "Step 1: Syncing latest data from all providers"
echo "═══════════════════════════════════════════════════════════════"

providers=("terra" "dexcom" "fitbit" "oura")
for provider in "${providers[@]}"; do
    echo "  → Syncing $provider..."
    node ../dist/health-cli.js sync $provider $DAYS 2>/dev/null || echo "    (skipped - not connected)"
done
echo ""

# Generate analytics reports
echo "═══════════════════════════════════════════════════════════════"
echo "Step 2: Generating analytics reports"
echo "═══════════════════════════════════════════════════════════════"

# Glucose report (Dexcom)
echo "  → Generating glucose report..."
node ../dist/health-analytics.js report $USER_ID dexcom glucose $DAYS $REPORT_DIR/glucose-report.txt 2>/dev/null || echo "    (skipped - no data)"

# Sleep report (Oura)
echo "  → Generating sleep report..."
node ../dist/health-analytics.js report $USER_ID oura sleep $DAYS $REPORT_DIR/sleep-report.txt 2>/dev/null || echo "    (skipped - no data)"

# Heart rate report (Fitbit/Terra)
echo "  → Generating heart rate report..."
node ../dist/health-analytics.js report $USER_ID fitbit heart_rate $DAYS $REPORT_DIR/heart-rate-report.txt 2>/dev/null || echo "    (skipped - no data)"

# Steps report (Fitbit/Terra)
echo "  → Generating steps report..."
node ../dist/health-analytics.js report $USER_ID fitbit steps $DAYS $REPORT_DIR/steps-report.txt 2>/dev/null || echo "    (skipped - no data)"
echo ""

# Correlation analysis
echo "═══════════════════════════════════════════════════════════════"
echo "Step 3: Analyzing correlations"
echo "═══════════════════════════════════════════════════════════════"

echo "  → Glucose vs Steps correlation..."
node ../dist/health-analytics.js correlate $USER_ID glucose steps $DAYS 2>/dev/null > $REPORT_DIR/glucose-steps-correlation.txt || echo "    (skipped - insufficient data)"

echo "  → Sleep vs Heart Rate correlation..."
node ../dist/health-analytics.js correlate $USER_ID sleep heart_rate $DAYS 2>/dev/null > $REPORT_DIR/sleep-hr-correlation.txt || echo "    (skipped - insufficient data)"
echo ""

# Provider comparison
echo "═══════════════════════════════════════════════════════════════"
echo "Step 4: Comparing data across providers"
echo "═══════════════════════════════════════════════════════════════"

echo "  → Comparing heart rate data..."
node ../dist/health-analytics.js compare $USER_ID heart_rate $DAYS 2>/dev/null > $REPORT_DIR/provider-comparison.txt || echo "    (skipped - insufficient data)"
echo ""

# Export raw data
echo "═══════════════════════════════════════════════════════════════"
echo "Step 5: Exporting raw data"
echo "═══════════════════════════════════════════════════════════════"

START_DATE=$(date -d "$DAYS days ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

echo "  → Exporting glucose data..."
node ../dist/health-cli.js export dexcom $START_DATE $END_DATE $REPORT_DIR/glucose-raw.csv 2>/dev/null || echo "    (skipped - no data)"

echo "  → Exporting sleep data..."
node ../dist/health-cli.js export oura $START_DATE $END_DATE $REPORT_DIR/sleep-raw.json 2>/dev/null || echo "    (skipped - no data)"
echo ""

# Generate summary
echo "═══════════════════════════════════════════════════════════════"
echo "Step 6: Generating summary"
echo "═══════════════════════════════════════════════════════════════"

cat > $REPORT_DIR/SUMMARY.txt << EOF
╔═══════════════════════════════════════════════════════════════╗
║              WEEKLY HEALTH REPORT SUMMARY                     ║
╚═══════════════════════════════════════════════════════════════╝

User ID: $USER_ID
Period: $START_DATE to $END_DATE
Generated: $(date)

CONTENTS:
  • glucose-report.txt - Glucose analytics and insights
  • sleep-report.txt - Sleep quality analysis
  • heart-rate-report.txt - Cardiovascular metrics
  • steps-report.txt - Activity tracking
  • glucose-steps-correlation.txt - Correlation analysis
  • sleep-hr-correlation.txt - Sleep-HR correlation
  • provider-comparison.txt - Multi-provider comparison
  • glucose-raw.csv - Raw glucose data export
  • sleep-raw.json - Raw sleep data export

NEXT STEPS:
  1. Review each report for health insights
  2. Note any concerning trends or anomalies
  3. Share reports with healthcare provider if needed
  4. Use correlations to identify behavior patterns
  5. Export data for external analysis tools

═══════════════════════════════════════════════════════════════

For questions or issues, run: node ../dist/health-cli.js health
EOF

echo "✓ Summary generated"
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  Report Generation Complete!                  ║"
echo "║                                                               ║"
echo "║  Reports saved to: $REPORT_DIR"
echo "║                                                               ║"
echo "║  View summary: cat $REPORT_DIR/SUMMARY.txt"
echo "╚═══════════════════════════════════════════════════════════════╝"
