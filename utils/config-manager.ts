import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface UtilityConfig {
  version: string;
  userId?: string;
  apiToken?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  defaultProvider?: string;
  outputFormat: 'json' | 'csv' | 'table';
  syncSchedules: SyncScheduleConfig[];
  exportSettings: ExportSettings;
  analyticsSettings: AnalyticsSettings;
  logging: LoggingConfig;
}

interface SyncScheduleConfig {
  provider: string;
  enabled: boolean;
  interval: string;
  lastSync?: string;
}

interface ExportSettings {
  defaultFormat: 'json' | 'csv';
  compressionEnabled: boolean;
  includeMetadata: boolean;
  outputDirectory: string;
}

interface AnalyticsSettings {
  defaultPeriodDays: number;
  correlationThreshold: number;
  enableInsights: boolean;
}

interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  logToFile: boolean;
  logFilePath?: string;
}

class ConfigManager {
  private configPath: string;
  private config: UtilityConfig;
  private defaultConfig: UtilityConfig = {
    version: '1.0.0',
    supabaseUrl: process.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
    outputFormat: 'table',
    syncSchedules: [],
    exportSettings: {
      defaultFormat: 'json',
      compressionEnabled: false,
      includeMetadata: true,
      outputDirectory: './exports',
    },
    analyticsSettings: {
      defaultPeriodDays: 30,
      correlationThreshold: 0.3,
      enableInsights: true,
    },
    logging: {
      level: 'info',
      logToFile: false,
    },
  };

  constructor(configDir?: string) {
    const baseDir = configDir || path.join(os.homedir(), '.health-cli');
    this.configPath = path.join(baseDir, 'config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): UtilityConfig {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(data);
        return { ...this.defaultConfig, ...loadedConfig };
      }

      this.saveConfig(this.defaultConfig);
      return this.defaultConfig;
    } catch (error: any) {
      console.warn('Error loading config, using defaults:', error.message);
      return this.defaultConfig;
    }
  }

  private saveConfig(config: UtilityConfig): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      this.config = config;
    } catch (error: any) {
      console.error('Failed to save config:', error.message);
      throw error;
    }
  }

  getConfig(): UtilityConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<UtilityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig(this.config);
  }

  setUser(userId: string, apiToken?: string): void {
    this.updateConfig({ userId, apiToken });
    console.log('✓ User configuration updated');
  }

  addSyncSchedule(provider: string, interval: string): void {
    const existing = this.config.syncSchedules.findIndex(s => s.provider === provider);
    const schedule: SyncScheduleConfig = {
      provider,
      enabled: true,
      interval,
    };

    if (existing >= 0) {
      this.config.syncSchedules[existing] = schedule;
    } else {
      this.config.syncSchedules.push(schedule);
    }

    this.saveConfig(this.config);
    console.log(`✓ Sync schedule added for ${provider}: ${interval}`);
  }

  removeSyncSchedule(provider: string): void {
    this.config.syncSchedules = this.config.syncSchedules.filter(s => s.provider !== provider);
    this.saveConfig(this.config);
    console.log(`✓ Sync schedule removed for ${provider}`);
  }

  listSyncSchedules(): SyncScheduleConfig[] {
    return this.config.syncSchedules;
  }

  setOutputFormat(format: 'json' | 'csv' | 'table'): void {
    this.updateConfig({ outputFormat: format });
    console.log(`✓ Output format set to: ${format}`);
  }

  setExportSettings(settings: Partial<ExportSettings>): void {
    this.config.exportSettings = { ...this.config.exportSettings, ...settings };
    this.saveConfig(this.config);
    console.log('✓ Export settings updated');
  }

  setAnalyticsSettings(settings: Partial<AnalyticsSettings>): void {
    this.config.analyticsSettings = { ...this.config.analyticsSettings, ...settings };
    this.saveConfig(this.config);
    console.log('✓ Analytics settings updated');
  }

  setLogging(settings: Partial<LoggingConfig>): void {
    this.config.logging = { ...this.config.logging, ...settings };
    this.saveConfig(this.config);
    console.log('✓ Logging settings updated');
  }

  reset(): void {
    this.saveConfig(this.defaultConfig);
    console.log('✓ Configuration reset to defaults');
  }

  export(outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(this.config, null, 2));
    console.log(`✓ Configuration exported to ${outputPath}`);
  }

  import(inputPath: string): void {
    try {
      const data = fs.readFileSync(inputPath, 'utf8');
      const importedConfig = JSON.parse(data);
      this.saveConfig({ ...this.defaultConfig, ...importedConfig });
      console.log(`✓ Configuration imported from ${inputPath}`);
    } catch (error: any) {
      console.error('Failed to import config:', error.message);
      throw error;
    }
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.supabaseUrl) {
      errors.push('Supabase URL is not configured');
    }

    if (!this.config.supabaseAnonKey) {
      errors.push('Supabase Anon Key is not configured');
    }

    if (this.config.syncSchedules.some(s => !s.provider)) {
      errors.push('Some sync schedules are missing provider information');
    }

    if (this.config.exportSettings.outputDirectory && !path.isAbsolute(this.config.exportSettings.outputDirectory)) {
      errors.push('Export output directory should be an absolute path');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  printConfig(): void {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║               HEALTH CLI CONFIGURATION                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('General Settings:');
    console.log(`  Version:         ${this.config.version}`);
    console.log(`  User ID:         ${this.config.userId || 'Not configured'}`);
    console.log(`  API Token:       ${this.config.apiToken ? '***' + this.config.apiToken.slice(-4) : 'Not configured'}`);
    console.log(`  Output Format:   ${this.config.outputFormat}`);
    console.log(`  Config Path:     ${this.configPath}\n`);

    console.log('Supabase Settings:');
    console.log(`  URL:             ${this.config.supabaseUrl || 'Not configured'}`);
    console.log(`  Anon Key:        ${this.config.supabaseAnonKey ? '***' + this.config.supabaseAnonKey.slice(-4) : 'Not configured'}\n`);

    console.log('Export Settings:');
    console.log(`  Default Format:  ${this.config.exportSettings.defaultFormat}`);
    console.log(`  Compression:     ${this.config.exportSettings.compressionEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`  Include Metadata:${this.config.exportSettings.includeMetadata ? 'Yes' : 'No'}`);
    console.log(`  Output Directory:${this.config.exportSettings.outputDirectory}\n`);

    console.log('Analytics Settings:');
    console.log(`  Default Period:  ${this.config.analyticsSettings.defaultPeriodDays} days`);
    console.log(`  Correlation Threshold: ${this.config.analyticsSettings.correlationThreshold}`);
    console.log(`  Insights:        ${this.config.analyticsSettings.enableInsights ? 'Enabled' : 'Disabled'}\n`);

    console.log('Logging Settings:');
    console.log(`  Level:           ${this.config.logging.level}`);
    console.log(`  Log to File:     ${this.config.logging.logToFile ? 'Yes' : 'No'}`);
    if (this.config.logging.logFilePath) {
      console.log(`  Log File Path:   ${this.config.logging.logFilePath}`);
    }
    console.log();

    if (this.config.syncSchedules.length > 0) {
      console.log('Sync Schedules:');
      this.config.syncSchedules.forEach(schedule => {
        console.log(`  ${schedule.provider.padEnd(10)} - ${schedule.interval} ${schedule.enabled ? '(enabled)' : '(disabled)'}`);
      });
      console.log();
    }

    const validation = this.validate();
    if (!validation.valid) {
      console.log('⚠️  Configuration Issues:');
      validation.errors.forEach(error => console.log(`  • ${error}`));
      console.log();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const configManager = new ConfigManager();

  if (!command || command === 'show') {
    configManager.printConfig();
    return;
  }

  switch (command) {
    case 'set-user':
      configManager.setUser(args[1], args[2]);
      break;
    case 'set-format':
      configManager.setOutputFormat(args[1] as any);
      break;
    case 'add-schedule':
      configManager.addSyncSchedule(args[1], args[2]);
      break;
    case 'remove-schedule':
      configManager.removeSyncSchedule(args[1]);
      break;
    case 'list-schedules':
      const schedules = configManager.listSyncSchedules();
      console.log('\nSync Schedules:\n');
      schedules.forEach(s => {
        console.log(`  ${s.provider}: ${s.interval} (${s.enabled ? 'enabled' : 'disabled'})`);
      });
      console.log();
      break;
    case 'export':
      configManager.export(args[1]);
      break;
    case 'import':
      configManager.import(args[1]);
      break;
    case 'reset':
      configManager.reset();
      break;
    case 'validate':
      const validation = configManager.validate();
      if (validation.valid) {
        console.log('✓ Configuration is valid');
      } else {
        console.log('❌ Configuration has errors:');
        validation.errors.forEach(err => console.log(`  • ${err}`));
      }
      break;
    default:
      console.log(`
USAGE:
  config-manager <command> [options]

COMMANDS:
  show                          Display current configuration
  set-user <user-id> [token]    Set user credentials
  set-format <format>           Set output format (json|csv|table)
  add-schedule <provider> <interval>     Add sync schedule
  remove-schedule <provider>    Remove sync schedule
  list-schedules                List all sync schedules
  export <file>                 Export configuration to file
  import <file>                 Import configuration from file
  reset                         Reset to default configuration
  validate                      Validate current configuration

EXAMPLES:
  config-manager show
  config-manager set-user abc-123-def
  config-manager add-schedule terra "4 hours"
  config-manager export backup-config.json
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ConfigManager };
