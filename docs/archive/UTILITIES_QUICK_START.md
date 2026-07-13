# Health Data Utilities - Quick Start Guide

## ✅ Setup Complete!

Your Health Data Management Utilities are installed and ready to use!

## 📍 Location

All utilities are in the `/utils` directory:
```
utils/
├── dist/                    # Compiled JavaScript files
│   ├── health-cli.js       # ✓ Main CLI tool
│   ├── sync-scheduler.js   # ✓ Automated sync service
│   ├── data-transformer.js # ✓ Data converter
│   ├── health-analytics.js # ✓ Analytics engine
│   └── config-manager.js   # ✓ Configuration manager
├── examples/               # Example scripts
├── INSTALL.md             # Installation guide
└── README.md              # Quick reference
```

## 🚀 Quick Commands

### 1. View Help
```bash
cd utils
export VITE_SUPABASE_URL=https://rfwghspbhuqdhyyipynt.supabase.co
export VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

node dist/health-cli.js help
```

### 2. Run Health Check
```bash
node dist/health-cli.js health
```
**Output:** ✓ All systems operational!

### 3. Configure User
```bash
node dist/config-manager.js set-user YOUR_USER_ID
```

### 4. View Connections
```bash
node dist/health-cli.js connections
```

### 5. Sync Provider Data
```bash
node dist/health-cli.js sync terra 7
node dist/health-cli.js sync dexcom 7
```

### 6. Generate Analytics Report
```bash
node dist/health-analytics.js report YOUR_USER_ID dexcom glucose 30 report.json
```

### 7. View Configuration
```bash
node dist/config-manager.js show
```

## 🔧 Environment Setup

**Option 1: Export variables each time**
```bash
export VITE_SUPABASE_URL=https://rfwghspbhuqdhyyipynt.supabase.co
export VITE_SUPABASE_ANON_KEY=your-key-here
```

**Option 2: Create a run script**
```bash
# Create utils/run.sh
cat > run.sh << 'EOF'
#!/bin/bash
export VITE_SUPABASE_URL=https://rfwghspbhuqdhyyipynt.supabase.co
export VITE_SUPABASE_ANON_KEY=your-key-here
node dist/$1 "${@:2}"
EOF

chmod +x run.sh

# Use it:
./run.sh health-cli.js health
./run.sh config-manager.js show
```

## 📊 Example Workflows

### Daily Sync
```bash
# Sync all providers
node dist/health-cli.js sync terra 7
node dist/health-cli.js sync dexcom 7
node dist/health-cli.js sync fitbit 7

# View stats
node dist/health-cli.js stats
```

### Weekly Report
```bash
# Run the example script
cd examples
./weekly-report.sh YOUR_USER_ID
```

### Automated Background Sync
```bash
# Configure schedules
node dist/config-manager.js add-schedule terra "4 hours"
node dist/config-manager.js add-schedule dexcom "2 hours"

# Start scheduler (runs continuously)
node dist/sync-scheduler.js
```

## 📖 Full Documentation

- **[HEALTH_UTILITIES_README.md](HEALTH_UTILITIES_README.md)** - Complete 10,000+ word guide
- **[utils/INSTALL.md](utils/INSTALL.md)** - Installation instructions
- **[utils/examples/](utils/examples/)** - Working example scripts

## 🎯 What Can You Do?

✅ **Manage Connections** - View and manage health device connections
✅ **Sync Data** - Automated or manual data synchronization
✅ **Transform Data** - Convert CSV/JSON formats
✅ **Generate Reports** - Analytics, statistics, correlations
✅ **Export Data** - Download health metrics in various formats
✅ **Schedule Syncs** - Background automation service

## 🏥 Supported Providers

- **Terra** - Health aggregator (available)
- **Dexcom** - Continuous glucose monitoring (available)
- **Fitbit** - Fitness tracker (available)
- **Oura** - Sleep and recovery tracking (available)
- **Libre** - Glucose monitoring (available)
- **Manual Upload** - CSV/JSON import (available)
- **WHOOP, Garmin, Withings, Polar** - Coming soon

## 🔍 Testing

Run the test suite:
```bash
cd utils
./test-utilities.sh
```

Expected output: **All Utilities Tests Passed! ✓**

## ⚡ Pro Tips

1. **Set up aliases** for frequently used commands
2. **Use the config manager** to save user credentials
3. **Schedule background syncs** for automated data collection
4. **Generate weekly reports** to track health trends
5. **Export data regularly** for backup purposes

## 📞 Need Help?

```bash
# Run system health check
node dist/health-cli.js health

# Validate configuration
node dist/config-manager.js validate

# View all options
node dist/health-cli.js help
node dist/config-manager.js
node dist/data-transformer.js
node dist/health-analytics.js
```

## 🎉 Next Steps

1. **Configure your user ID**
   ```bash
   node dist/config-manager.js set-user YOUR_USER_ID
   ```

2. **View your health connections**
   ```bash
   node dist/health-cli.js connections
   ```

3. **Try syncing data from a provider**
   ```bash
   node dist/health-cli.js sync terra 7
   ```

4. **Generate your first report**
   ```bash
   node dist/health-analytics.js report YOUR_USER_ID dexcom glucose 30 report.json
   ```

5. **Read the full documentation**
   - [HEALTH_UTILITIES_README.md](HEALTH_UTILITIES_README.md)

---

**Status:** ✅ Installed and Tested
**Version:** 1.0.0
**Build:** Successful
**Connection:** ✓ Verified with Supabase

Ready to manage your health data! 🚀
