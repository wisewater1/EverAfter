#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface CliConfig {
  userId?: string;
  apiToken?: string;
  outputFormat?: 'json' | 'csv' | 'table';
}

class HealthCli {
  private config: CliConfig = {};
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), '.health-cli-config.json');
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load config file, using defaults');
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('✓ Configuration saved');
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }

  async configure(userId: string, apiToken?: string): Promise<void> {
    this.config.userId = userId;
    if (apiToken) {
      this.config.apiToken = apiToken;
    }
    this.saveConfig();
    console.log(`✓ Configured for user: ${userId}`);
  }

  async listConnections(): Promise<void> {
    if (!this.config.userId) {
      console.error('❌ User not configured. Run: health-cli configure <user-id>');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('provider_accounts')
        .select('*')
        .eq('user_id', this.config.userId);

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No connections found');
        return;
      }

      console.log('\n📊 Health Connections\n');
      console.log('┌─────────────┬──────────┬─────────────────────┬─────────────────────┐');
      console.log('│ Provider    │ Status   │ Connected           │ Last Sync           │');
      console.log('├─────────────┼──────────┼─────────────────────┼─────────────────────┤');

      data.forEach(conn => {
        const provider = conn.provider.padEnd(11);
        const status = conn.status.padEnd(8);
        const connected = new Date(conn.created_at).toLocaleDateString().padEnd(19);
        const lastSync = conn.last_sync_at
          ? new Date(conn.last_sync_at).toLocaleString().padEnd(19)
          : 'Never'.padEnd(19);
        console.log(`│ ${provider} │ ${status} │ ${connected} │ ${lastSync} │`);
      });

      console.log('└─────────────┴──────────┴─────────────────────┴─────────────────────┘\n');
    } catch (error: any) {
      console.error('❌ Error listing connections:', error.message);
    }
  }

  async syncConnection(provider: string, days: number = 7): Promise<void> {
    if (!this.config.userId) {
      console.error('❌ User not configured. Run: health-cli configure <user-id>');
      return;
    }

    console.log(`🔄 Syncing ${provider} data for the last ${days} days...`);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-health-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiToken || SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ provider, days, user_id: this.config.userId }),
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Sync failed');
      }

      const result = await response.json() as any;
      console.log(`✓ Synced ${result.metrics_ingested || 0} metrics from ${provider}`);
    } catch (error: any) {
      console.error('❌ Sync error:', error.message);
    }
  }

  async exportData(provider: string, startDate: string, endDate: string, outputFile: string): Promise<void> {
    if (!this.config.userId) {
      console.error('❌ User not configured. Run: health-cli configure <user-id>');
      return;
    }

    console.log(`📥 Exporting ${provider} data from ${startDate} to ${endDate}...`);

    try {
      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', this.config.userId)
        .eq('provider', provider)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No data found for the specified criteria');
        return;
      }

      const outputPath = path.resolve(outputFile);
      const ext = path.extname(outputFile).toLowerCase();

      if (ext === '.json') {
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      } else if (ext === '.csv') {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        fs.writeFileSync(outputPath, [headers, ...rows].join('\n'));
      } else {
        throw new Error('Unsupported file format. Use .json or .csv');
      }

      console.log(`✓ Exported ${data.length} records to ${outputPath}`);
    } catch (error: any) {
      console.error('❌ Export error:', error.message);
    }
  }

  async getStats(provider?: string): Promise<void> {
    if (!this.config.userId) {
      console.error('❌ User not configured. Run: health-cli configure <user-id>');
      return;
    }

    try {
      let query = supabase
        .from('health_metrics')
        .select('metric_type, value, timestamp')
        .eq('user_id', this.config.userId);

      if (provider) {
        query = query.eq('provider', provider);
      }

      const { data, error } = await query
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No metrics found for the last 30 days');
        return;
      }

      const metricGroups = data.reduce((acc, metric) => {
        if (!acc[metric.metric_type]) {
          acc[metric.metric_type] = [];
        }
        acc[metric.metric_type].push(metric.value);
        return acc;
      }, {} as Record<string, number[]>);

      console.log('\n📈 Health Metrics Statistics (Last 30 Days)\n');
      console.log('┌─────────────────────┬───────┬─────────┬─────────┬─────────┐');
      console.log('│ Metric Type         │ Count │ Min     │ Max     │ Avg     │');
      console.log('├─────────────────────┼───────┼─────────┼─────────┼─────────┤');

      Object.entries(metricGroups).forEach(([metricType, values]) => {
        const count = values.length.toString().padEnd(5);
        const min = Math.min(...values).toFixed(1).padEnd(7);
        const max = Math.max(...values).toFixed(1).padEnd(7);
        const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1).padEnd(7);
        const type = metricType.padEnd(19);
        console.log(`│ ${type} │ ${count} │ ${min} │ ${max} │ ${avg} │`);
      });

      console.log('└─────────────────────┴───────┴─────────┴─────────┴─────────┘\n');
    } catch (error: any) {
      console.error('❌ Error getting stats:', error.message);
    }
  }

  async checkHealth(): Promise<void> {
    console.log('🏥 Running health checks...\n');

    try {
      const checks = [
        { name: 'Supabase Connection', test: () => supabase.from('health_metrics').select('count').limit(1) },
        { name: 'Provider Accounts', test: () => supabase.from('provider_accounts').select('count').limit(1) },
        { name: 'Edge Functions', test: () => fetch(`${SUPABASE_URL}/functions/v1/test-key`) },
      ];

      for (const check of checks) {
        try {
          await check.test();
          console.log(`✓ ${check.name}: OK`);
        } catch (error) {
          console.log(`❌ ${check.name}: FAILED`);
        }
      }

      console.log('\n✓ Health check complete');
    } catch (error: any) {
      console.error('❌ Health check error:', error.message);
    }
  }

  printHelp(): void {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    Health Data Management CLI                     ║
║                         Version 1.0.0                             ║
╚═══════════════════════════════════════════════════════════════════╝

USAGE:
  health-cli <command> [options]

COMMANDS:
  configure <user-id> [token]    Configure CLI with user credentials
  connections                    List all health device connections
  sync <provider> [days]         Sync data from a specific provider
  export <provider> <start> <end> <file>  Export data to JSON/CSV
  stats [provider]               Show health metrics statistics
  health                         Run system health checks
  help                           Show this help message

EXAMPLES:
  health-cli configure abc-123-def
  health-cli connections
  health-cli sync terra 30
  health-cli export dexcom 2025-01-01 2025-01-31 glucose.csv
  health-cli stats
  health-cli health

CONFIGURATION:
  Config file: .health-cli-config.json

For more information, visit: https://github.com/your-repo/health-cli
    `);
  }
}

async function main() {
  const cli = new HealthCli();
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    cli.printHelp();
    return;
  }

  switch (command) {
    case 'configure':
      await cli.configure(args[1], args[2]);
      break;
    case 'connections':
      await cli.listConnections();
      break;
    case 'sync':
      await cli.syncConnection(args[1], parseInt(args[2]) || 7);
      break;
    case 'export':
      await cli.exportData(args[1], args[2], args[3], args[4]);
      break;
    case 'stats':
      await cli.getStats(args[1]);
      break;
    case 'health':
      await cli.checkHealth();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      cli.printHelp();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { HealthCli };
