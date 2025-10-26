# Health Data Utilities - Installation Guide

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **TypeScript**: Version 5 or higher (dev dependency)
- **Supabase Account**: With valid API credentials

## Installation Steps

### 1. Verify Prerequisites

```bash
node --version  # Should be v18.x or higher
npm --version   # Should be 9.x or higher
```

### 2. Navigate to Utilities Directory

```bash
cd utils
```

### 3. Install Dependencies

```bash
npm install
```

This installs:
- `@supabase/supabase-js` - Supabase client library
- `@types/node` - TypeScript type definitions
- `typescript` - TypeScript compiler

### 4. Configure Environment Variables

Copy the parent project's `.env` file or create environment variables:

```bash
# Copy from parent project
cp ../.env ./.env

# Or create manually
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF
```

**Required Variables:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Anonymous public key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for scheduler only)

### 5. Build TypeScript Files

```bash
npm run build
```

This compiles TypeScript files to JavaScript in the `dist/` directory:
```
dist/
├── health-cli.js
├── sync-scheduler.js
├── data-transformer.js
├── health-analytics.js
└── config-manager.js
```

### 6. Make Scripts Executable (Unix/Mac Only)

```bash
chmod +x dist/*.js
chmod +x examples/*.sh
```

### 7. Verify Installation

```bash
# Test CLI tool
node dist/health-cli.js help

# Test configuration
node dist/config-manager.js show

# Run health check
node dist/health-cli.js health
```

## Global Installation (Optional)

To use utilities globally from anywhere on your system:

```bash
npm link
```

Then you can run:
```bash
health-cli connections
config-manager show
health-analytics report user123 dexcom glucose 30
```

## Database Setup

### Required Tables

The utilities expect these tables in your Supabase database:

- `provider_accounts` - Health provider connections
- `health_metrics` - Time-series health data
- `sync_schedules` - Automated sync configurations
- `webhook_events` - Incoming webhook logs

These should already exist from the main project migrations.

### Create Sync Schedules Table (if not exists)

```sql
CREATE TABLE IF NOT EXISTS sync_schedules (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  schedule TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sync_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own schedules"
  ON sync_schedules
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);
```

## Initial Configuration

### 1. Configure User

```bash
node dist/config-manager.js set-user YOUR_USER_ID
```

### 2. Set Output Format (optional)

```bash
node dist/config-manager.js set-format json  # or csv, table
```

### 3. Add Sync Schedules (optional)

```bash
node dist/config-manager.js add-schedule terra "4 hours"
node dist/config-manager.js add-schedule dexcom "2 hours"
```

### 4. Verify Configuration

```bash
node dist/config-manager.js show
node dist/config-manager.js validate
```

## Running as a Service (Production)

### Using systemd (Linux)

Create `/etc/systemd/system/health-sync.service`:

```ini
[Unit]
Description=Health Data Sync Scheduler
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/project/utils
EnvironmentFile=/path/to/project/utils/.env
ExecStart=/usr/bin/node /path/to/project/utils/dist/sync-scheduler.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable health-sync
sudo systemctl start health-sync
sudo systemctl status health-sync
```

View logs:
```bash
sudo journalctl -u health-sync -f
```

### Using PM2 (Node.js Process Manager)

Install PM2:
```bash
npm install -g pm2
```

Start scheduler:
```bash
cd /path/to/project/utils
pm2 start dist/sync-scheduler.js --name health-sync
pm2 save
pm2 startup
```

Monitor:
```bash
pm2 status
pm2 logs health-sync
pm2 monit
```

### Using Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist ./dist
COPY .env .env

CMD ["node", "dist/sync-scheduler.js"]
```

Build and run:
```bash
docker build -t health-sync .
docker run -d --name health-sync --restart unless-stopped health-sync
```

## Troubleshooting Installation

### Issue: TypeScript compilation errors

**Solution:**
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### Issue: Permission denied errors

**Solution:**
```bash
chmod +x dist/*.js
chmod +x examples/*.sh
```

### Issue: Cannot find module errors

**Solution:**
```bash
# Ensure you're in the utils directory
cd utils
npm install
```

### Issue: Supabase connection failed

**Solution:**
```bash
# Verify environment variables
cat .env

# Test connection
node dist/health-cli.js health
```

### Issue: Database tables not found

**Solution:**
```bash
# Run migrations from parent project
cd ..
# Check if migrations were applied
```

## Uninstallation

### Remove global link (if installed globally)
```bash
npm unlink
```

### Remove local installation
```bash
rm -rf node_modules dist
npm cache clean --force
```

### Remove configuration
```bash
rm -rf ~/.health-cli
```

## Next Steps

After successful installation:

1. Read the [main README](../HEALTH_UTILITIES_README.md) for usage instructions
2. Try the [basic usage example](./examples/basic-usage.sh)
3. Set up [scheduled syncing](./examples/scheduled-sync.sh)
4. Generate your first [weekly report](./examples/weekly-report.sh)

## Support

For installation issues:
- Check this guide thoroughly
- Verify all prerequisites are met
- Run `node dist/health-cli.js health` to diagnose
- Review Supabase connection settings

## Version Information

- **Utilities Version**: 1.0.0
- **Node.js Required**: >= 18.0.0
- **TypeScript Version**: 5.5.3
- **Supabase Client**: 2.57.4
