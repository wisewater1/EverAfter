import { createClient } from '@supabase/supabase-js';
import * as cron from 'node:timers/promises';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface SyncJob {
  id: string;
  userId: string;
  provider: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface SyncResult {
  success: boolean;
  metricsIngested: number;
  error?: string;
  timestamp: string;
}

class SyncScheduler {
  private jobs: Map<string, SyncJob> = new Map();
  private running: boolean = false;
  private syncHistory: Map<string, SyncResult[]> = new Map();

  async loadJobs(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('sync_schedules')
        .select('*')
        .eq('enabled', true);

      if (error) throw error;

      if (data) {
        data.forEach(job => {
          this.jobs.set(job.id, job);
        });
        console.log(`✓ Loaded ${this.jobs.size} sync jobs`);
      }
    } catch (error: any) {
      console.error('Failed to load sync jobs:', error.message);
    }
  }

  async createJob(userId: string, provider: string, schedule: string): Promise<string> {
    const job: SyncJob = {
      id: `${userId}-${provider}-${Date.now()}`,
      userId,
      provider,
      schedule,
      enabled: true,
      nextRun: this.calculateNextRun(schedule),
    };

    try {
      const { data, error } = await supabase
        .from('sync_schedules')
        .insert(job)
        .select()
        .single();

      if (error) throw error;

      this.jobs.set(job.id, job);
      console.log(`✓ Created sync job: ${job.id}`);
      return job.id;
    } catch (error: any) {
      console.error('Failed to create sync job:', error.message);
      throw error;
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_schedules')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      this.jobs.delete(jobId);
      console.log(`✓ Deleted sync job: ${jobId}`);
    } catch (error: any) {
      console.error('Failed to delete sync job:', error.message);
      throw error;
    }
  }

  private calculateNextRun(schedule: string): string {
    const now = new Date();
    const [interval, unit] = schedule.split(' ');
    const intervalNum = parseInt(interval);

    switch (unit) {
      case 'minutes':
        now.setMinutes(now.getMinutes() + intervalNum);
        break;
      case 'hours':
        now.setHours(now.getHours() + intervalNum);
        break;
      case 'days':
        now.setDate(now.getDate() + intervalNum);
        break;
      default:
        now.setHours(now.getHours() + 24);
    }

    return now.toISOString();
  }

  private async executeSync(job: SyncJob): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(`🔄 Syncing ${job.provider} for user ${job.userId}`);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-health-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          user_id: job.userId,
          provider: job.provider,
          days: 7,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Sync failed');
      }

      const result = await response.json() as any;
      const syncResult: SyncResult = {
        success: true,
        metricsIngested: result.metrics_ingested || 0,
        timestamp: new Date().toISOString(),
      };

      console.log(`✓ Synced ${syncResult.metricsIngested} metrics in ${Date.now() - startTime}ms`);
      return syncResult;
    } catch (error: any) {
      console.error(`❌ Sync failed for ${job.provider}:`, error.message);
      return {
        success: false,
        metricsIngested: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async updateJobAfterSync(jobId: string, result: SyncResult): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.lastRun = result.timestamp;
    job.nextRun = this.calculateNextRun(job.schedule);

    try {
      await supabase
        .from('sync_schedules')
        .update({
          last_run: job.lastRun,
          next_run: job.nextRun,
        })
        .eq('id', jobId);

      if (!this.syncHistory.has(jobId)) {
        this.syncHistory.set(jobId, []);
      }
      const history = this.syncHistory.get(jobId)!;
      history.push(result);
      if (history.length > 100) {
        history.shift();
      }
    } catch (error: any) {
      console.error('Failed to update job after sync:', error.message);
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      console.warn('Scheduler is already running');
      return;
    }

    this.running = true;
    console.log('🚀 Starting sync scheduler');

    await this.loadJobs();

    while (this.running) {
      const now = new Date().toISOString();

      for (const [jobId, job] of this.jobs.entries()) {
        if (job.enabled && job.nextRun && job.nextRun <= now) {
          const result = await this.executeSync(job);
          await this.updateJobAfterSync(jobId, result);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  stop(): void {
    this.running = false;
    console.log('⏹️  Stopping sync scheduler');
  }

  getJobStats(jobId: string): { total: number; successful: number; failed: number; avgMetrics: number } {
    const history = this.syncHistory.get(jobId) || [];
    const successful = history.filter(r => r.success).length;
    const failed = history.filter(r => !r.success).length;
    const avgMetrics = history.reduce((sum, r) => sum + r.metricsIngested, 0) / (history.length || 1);

    return {
      total: history.length,
      successful,
      failed,
      avgMetrics: Math.round(avgMetrics),
    };
  }

  listJobs(): SyncJob[] {
    return Array.from(this.jobs.values());
  }
}

async function runScheduler() {
  const scheduler = new SyncScheduler();

  process.on('SIGINT', () => {
    console.log('\n⏹️  Received SIGINT, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n⏹️  Received SIGTERM, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });

  await scheduler.start();
}

if (require.main === module) {
  runScheduler().catch(console.error);
}

export { SyncScheduler };
