# Health Data Management Utilities

A comprehensive suite of command-line tools and utilities for managing health device connections, synchronizing data, performing analytics, and exporting health metrics from your health tracking platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Utilities](#utilities)
  - [Health CLI](#health-cli)
  - [Sync Scheduler](#sync-scheduler)
  - [Data Transformer](#data-transformer)
  - [Health Analytics](#health-analytics)
  - [Config Manager](#config-manager)
- [Examples](#examples)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## 🎯 Overview

This utility suite provides powerful tools for:

- **Connection Management**: View and manage health device connections (Terra, Dexcom, Fitbit, Oura, etc.)
- **Data Synchronization**: Automated and manual sync of health metrics from connected devices
- **Data Transformation**: Convert and standardize health data from various formats
- **Analytics & Reporting**: Generate insights, statistics, and correlations from health data
- **Configuration Management**: Centralized configuration for all utilities

### Key Features

✅ Support for multiple health data providers (Terra, Dexcom, Fitbit, Oura, and more)
✅ Command-line interface for automation and scripting
✅ Scheduled background synchronization
✅ Advanced analytics and correlation analysis
✅ Multiple export formats (JSON, CSV)
✅ Production-ready error handling and logging

---

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- TypeScript 5+
- Access to Supabase backend
- Valid API credentials

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. **Build the utilities:**
```bash
npx tsc utils/*.ts --outDir dist/utils
```

4. **Make CLI tools executable (Unix/Mac):**
```bash
chmod +x dist/utils/health-cli.js
chmod +x dist/utils/config-manager.js
```

---

## 🚀 Quick Start

### 1. Configure Your User

```bash
node dist/utils/config-manager.js set-user YOUR_USER_ID
```

### 2. List Your Connections

```bash
node dist/utils/health-cli.js connections
```

### 3. Sync Data from a Provider

```bash
node dist/utils/health-cli.js sync terra 30
```

### 4. Generate Analytics Report

```bash
node dist/utils/health-analytics.js report YOUR_USER_ID dexcom glucose 30 report.json
```

---

## 🛠️ Utilities

### Health CLI

**Purpose:** Primary command-line interface for managing health connections and data.

**Usage:**
```bash
node dist/utils/health-cli.js <command> [options]
```

**Commands:**

| Command | Description | Example |
|---------|-------------|---------|
| `configure <user-id> [token]` | Configure CLI with user credentials | `configure abc-123` |
| `connections` | List all health device connections | `connections` |
| `sync <provider> [days]` | Sync data from specific provider | `sync terra 30` |
| `export <provider> <start> <end> <file>` | Export data to JSON/CSV | `export dexcom 2025-01-01 2025-01-31 glucose.csv` |
| `stats [provider]` | Show health metrics statistics | `stats dexcom` |
| `health` | Run system health checks | `health` |

**Examples:**

```bash
# Configure for user
node dist/utils/health-cli.js configure user-abc-123

# View all connections
node dist/utils/health-cli.js connections

# Sync Terra data for last 7 days
node dist/utils/health-cli.js sync terra 7

# Export Dexcom glucose data
node dist/utils/health-cli.js export dexcom 2025-01-01 2025-01-31 glucose.json

# Get statistics
node dist/utils/health-cli.js stats

# Check system health
node dist/utils/health-cli.js health
```

---

### Sync Scheduler

**Purpose:** Automated background service for scheduled data synchronization.

**Usage:**
```bash
node dist/utils/sync-scheduler.js
```

**Features:**
- Runs continuously in the background
- Loads sync schedules from database
- Tracks sync history and statistics
- Automatic retry on failures
- Graceful shutdown on SIGINT/SIGTERM

**Setup Sync Schedule:**
```bash
# Add a sync schedule via config manager
node dist/utils/config-manager.js add-schedule terra "4 hours"
node dist/utils/config-manager.js add-schedule dexcom "2 hours"

# Start the scheduler
node dist/utils/sync-scheduler.js
```

**Running as a Service (Linux/systemd):**

Create `/etc/systemd/system/health-sync.service`:
```ini
[Unit]
Description=Health Data Sync Scheduler
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/project
ExecStart=/usr/bin/node /path/to/project/dist/utils/sync-scheduler.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable health-sync
sudo systemctl start health-sync
sudo systemctl status health-sync
```

---

### Data Transformer

**Purpose:** Transform and standardize health data from various formats.

**Usage:**
```bash
node dist/utils/data-transformer.js <command> [options]
```

**Commands:**

| Command | Description | Example |
|---------|-------------|---------|
| `transform <provider> <input> <output>` | Transform single file | `transform dexcom glucose.csv glucose.json` |
| `batch <provider> <input-dir> <output-dir>` | Transform all files in directory | `batch fitbit ./raw ./processed` |
| `merge <output> <input1> <input2> ...` | Merge multiple files | `merge all.json file1.json file2.json` |

**Supported Providers:**
- Dexcom (CSV → JSON)
- Fitbit (JSON → JSON)
- Oura (JSON → JSON)
- Terra (JSON → JSON)

**Examples:**

```bash
# Transform Dexcom CSV to JSON
node dist/utils/data-transformer.js transform dexcom glucose-raw.csv glucose.json

# Batch process Fitbit files
node dist/utils/data-transformer.js batch fitbit ./fitbit-exports ./processed

# Merge multiple JSON files
node dist/utils/data-transformer.js merge combined.json day1.json day2.json day3.json
```

**Custom Configuration:**

For non-standard formats, create a custom config:
```typescript
const customConfig = {
  inputFormat: 'csv',
  outputFormat: 'json',
  provider: 'custom',
  metricType: 'glucose',
  mappings: {
    timestamp: 'Date_Time',
    value: 'Glucose_mg_dL',
    unit: 'Unit'
  }
};
```

---

### Health Analytics

**Purpose:** Generate insights, statistics, and correlations from health data.

**Usage:**
```bash
node dist/utils/health-analytics.js <command> [options]
```

**Commands:**

| Command | Description | Example |
|---------|-------------|---------|
| `report <user-id> <provider> <metric> [days] [output]` | Generate analytics report | `report user123 dexcom glucose 30 report.json` |
| `correlate <user-id> <metric1> <metric2> [days]` | Find correlations between metrics | `correlate user123 glucose steps 30` |
| `compare <user-id> <metric> [days]` | Compare data across providers | `compare user123 heart_rate 30` |

**Report Contents:**
- **Statistics**: Count, mean, median, std dev, min, max, percentiles
- **Trends**: Direction, change percentage, slope analysis
- **Insights**: AI-generated health insights and recommendations
- **Visualizations**: Data exported for visualization tools

**Examples:**

```bash
# Generate glucose report (30 days)
node dist/utils/health-analytics.js report user-abc-123 dexcom glucose 30 glucose-report.json

# Find correlation between glucose and steps
node dist/utils/health-analytics.js correlate user-abc-123 glucose steps 30

# Compare heart rate across all providers
node dist/utils/health-analytics.js compare user-abc-123 heart_rate 30

# Generate text report
node dist/utils/health-analytics.js report user-abc-123 oura sleep 30 sleep-report.txt
```

**Sample Report Output:**
```
═══════════════════════════════════════════════════════════
                  HEALTH ANALYTICS REPORT
═══════════════════════════════════════════════════════════

User ID: user-abc-123
Provider: dexcom
Metric: glucose
Period: 30 days
Generated: 1/31/2025, 10:30:00 AM

───────────────────────────────────────────────────────────
  STATISTICS
───────────────────────────────────────────────────────────
  Data Points: 8640
  Mean:        135.2
  Median:      132.0
  Std Dev:     28.5
  Min:         65.0
  Max:         245.0
  25th %ile:   110.0
  75th %ile:   158.0

───────────────────────────────────────────────────────────
  TRENDS
───────────────────────────────────────────────────────────
  Direction:   DOWN
  Change:      -5.3%
  Slope:       -0.12

───────────────────────────────────────────────────────────
  INSIGHTS
───────────────────────────────────────────────────────────
  • Median glucose is within target range (70-180 mg/dL)
  • glucose trending downward by 5.3%
  • ⚠️ Low glucose events detected (min: 65.0 mg/dL)

═══════════════════════════════════════════════════════════
```

---

### Config Manager

**Purpose:** Centralized configuration management for all utilities.

**Usage:**
```bash
node dist/utils/config-manager.js <command> [options]
```

**Commands:**

| Command | Description | Example |
|---------|-------------|---------|
| `show` | Display current configuration | `show` |
| `set-user <user-id> [token]` | Set user credentials | `set-user abc-123` |
| `set-format <format>` | Set output format | `set-format json` |
| `add-schedule <provider> <interval>` | Add sync schedule | `add-schedule terra "4 hours"` |
| `remove-schedule <provider>` | Remove sync schedule | `remove-schedule terra` |
| `list-schedules` | List all schedules | `list-schedules` |
| `export <file>` | Export configuration | `export backup.json` |
| `import <file>` | Import configuration | `import backup.json` |
| `reset` | Reset to defaults | `reset` |
| `validate` | Validate configuration | `validate` |

**Configuration File Location:**
- **Unix/Mac:** `~/.health-cli/config.json`
- **Windows:** `%USERPROFILE%\.health-cli\config.json`

**Examples:**

```bash
# View current configuration
node dist/utils/config-manager.js show

# Set user credentials
node dist/utils/config-manager.js set-user user-abc-123 your-api-token

# Change output format
node dist/utils/config-manager.js set-format csv

# Add sync schedules
node dist/utils/config-manager.js add-schedule terra "6 hours"
node dist/utils/config-manager.js add-schedule dexcom "2 hours"

# List schedules
node dist/utils/config-manager.js list-schedules

# Backup configuration
node dist/utils/config-manager.js export config-backup.json

# Restore configuration
node dist/utils/config-manager.js import config-backup.json

# Validate configuration
node dist/utils/config-manager.js validate
```

---

## 💡 Examples

### Complete Workflow Example

```bash
# 1. Initial setup
node dist/utils/config-manager.js set-user user-abc-123
node dist/utils/config-manager.js add-schedule terra "4 hours"
node dist/utils/config-manager.js add-schedule dexcom "2 hours"

# 2. View connections
node dist/utils/health-cli.js connections

# 3. Manual sync
node dist/utils/health-cli.js sync terra 7
node dist/utils/health-cli.js sync dexcom 7

# 4. Generate analytics
node dist/utils/health-analytics.js report user-abc-123 dexcom glucose 30 glucose.json
node dist/utils/health-analytics.js correlate user-abc-123 glucose steps 30

# 5. Export data
node dist/utils/health-cli.js export dexcom 2025-01-01 2025-01-31 january-glucose.csv

# 6. Transform legacy data
node dist/utils/data-transformer.js transform dexcom old-data.csv new-data.json

# 7. Start automated sync
node dist/utils/sync-scheduler.js
```

### Batch Processing Example

```bash
# Process multiple CSV files from Dexcom
mkdir -p ./raw-data ./processed-data

# Place your CSV files in ./raw-data
# Then transform them all
node dist/utils/data-transformer.js batch dexcom ./raw-data ./processed-data

# Merge all processed files
node dist/utils/data-transformer.js merge combined.json ./processed-data/*.json

# Generate comprehensive report
node dist/utils/health-analytics.js report user-abc-123 dexcom glucose 90 quarterly-report.txt
```

### Automation Script Example

Create `sync-and-report.sh`:
```bash
#!/bin/bash

USER_ID="user-abc-123"
DATE=$(date +%Y-%m-%d)

# Sync all providers
echo "Syncing data..."
node dist/utils/health-cli.js sync terra 7
node dist/utils/health-cli.js sync dexcom 7
node dist/utils/health-cli.js sync fitbit 7

# Generate reports
echo "Generating reports..."
node dist/utils/health-analytics.js report $USER_ID dexcom glucose 7 glucose-${DATE}.json
node dist/utils/health-analytics.js report $USER_ID fitbit steps 7 steps-${DATE}.json

# Check for correlations
node dist/utils/health-analytics.js correlate $USER_ID glucose steps 7

echo "✓ Sync and reporting complete!"
```

Make executable and run:
```bash
chmod +x sync-and-report.sh
./sync-and-report.sh
```

---

## ⚙️ Configuration

### Environment Variables

Required environment variables in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Config File Structure

```json
{
  "version": "1.0.0",
  "userId": "user-abc-123",
  "apiToken": "your-api-token",
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "your-anon-key",
  "outputFormat": "table",
  "syncSchedules": [
    {
      "provider": "terra",
      "enabled": true,
      "interval": "4 hours"
    }
  ],
  "exportSettings": {
    "defaultFormat": "json",
    "compressionEnabled": false,
    "includeMetadata": true,
    "outputDirectory": "./exports"
  },
  "analyticsSettings": {
    "defaultPeriodDays": 30,
    "correlationThreshold": 0.3,
    "enableInsights": true
  },
  "logging": {
    "level": "info",
    "logToFile": false
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

**Issue: "User not configured"**
```bash
# Solution: Configure your user ID
node dist/utils/config-manager.js set-user YOUR_USER_ID
```

**Issue: "No data found"**
```bash
# Solution: Sync data first
node dist/utils/health-cli.js sync terra 30
```

**Issue: "Connection failed"**
```bash
# Solution: Check system health
node dist/utils/health-cli.js health

# Verify configuration
node dist/utils/config-manager.js validate
```

**Issue: "Permission denied"**
```bash
# Solution: Make scripts executable (Unix/Mac)
chmod +x dist/utils/*.js
```

**Issue: "Sync scheduler not starting"**
```bash
# Solution: Check if schedules exist
node dist/utils/config-manager.js list-schedules

# Add at least one schedule
node dist/utils/config-manager.js add-schedule terra "4 hours"
```

### Debug Mode

Enable detailed logging:
```bash
# Set logging level
node dist/utils/config-manager.js set-logging level debug logToFile true
```

### Getting Help

```bash
# Show help for any utility
node dist/utils/health-cli.js help
node dist/utils/data-transformer.js
node dist/utils/health-analytics.js
node dist/utils/config-manager.js
```

---

## 🎯 Best Practices

### Data Synchronization

1. **Regular Syncing**: Set up automated schedules for frequent data updates
2. **Incremental Syncs**: Use reasonable day ranges (7-30 days) to avoid overload
3. **Provider Limits**: Respect API rate limits for each provider
4. **Error Handling**: Monitor sync logs and set up alerts

### Data Export

1. **Backup Regularly**: Export data periodically for backup purposes
2. **Use Appropriate Formats**: JSON for analysis, CSV for spreadsheets
3. **Date Ranges**: Export in manageable chunks (monthly or quarterly)
4. **Metadata**: Include metadata for context and traceability

### Analytics

1. **Sufficient Data**: Use at least 7-14 days for meaningful statistics
2. **Multiple Metrics**: Correlate different metrics for deeper insights
3. **Regular Reports**: Generate weekly/monthly reports for trend tracking
4. **Action on Insights**: Review and act on generated health insights

### Configuration

1. **Backup Config**: Export configuration before making major changes
2. **Security**: Never commit API tokens to version control
3. **Validation**: Validate configuration after changes
4. **Documentation**: Document custom configurations and schedules

---

## 📊 Performance Tips

- **Batch Operations**: Use batch transformer for multiple files
- **Scheduled Syncs**: Avoid manual syncs by using the scheduler
- **Cache Results**: Analytics reports can be cached for repeated queries
- **Parallel Processing**: Run sync operations for different providers in parallel

---

## 🔒 Security Considerations

- **API Keys**: Store in environment variables, never in code
- **User Data**: All data operations respect user authentication
- **Encryption**: Data encrypted in transit and at rest
- **Access Control**: Utilities use appropriate access levels (anon key vs service key)

---

## 📝 License

This utility suite is part of the health tracking platform. See main project license.

---

## 🤝 Contributing

To add new utilities or improve existing ones:

1. Follow the established patterns in existing utilities
2. Include comprehensive error handling
3. Add help documentation
4. Update this README with new features
5. Test thoroughly with real data

---

## 📧 Support

For issues or questions:
- Check the troubleshooting section
- Run health checks: `node dist/utils/health-cli.js health`
- Review configuration: `node dist/utils/config-manager.js show`

---

**Version:** 1.0.0
**Last Updated:** January 2025
**Maintainer:** Health Platform Team
