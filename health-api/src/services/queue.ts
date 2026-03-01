import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { Provider } from '@prisma/client';
import { SyncJobData, TokenRefreshJobData } from '../types/index.js';
import { logger } from '../utils/logger.js';

const connection: any = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Define job queues
export const syncQueue = new Queue<SyncJobData, any, string>('health-sync', { connection });
export const tokenRefreshQueue = new Queue<TokenRefreshJobData, any, string>('token-refresh', { connection });
export const webhookQueue = new Queue<any, any, string>('webhook-processing', { connection });

// Sync job processor
export function createSyncWorker(processor: (job: Job<SyncJobData, any, string>) => Promise<void>) {
  return new Worker<SyncJobData, any, string>(
    'health-sync',
    async (job) => {
      logger.info(`Processing sync job for provider ${job.data.provider}`, {
        userId: job.data.userId,
        accountId: job.data.accountId,
      });
      await processor(job);
    },
    {
      connection,
      concurrency: 5,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    }
  );
}

// Token refresh processor
export function createTokenRefreshWorker(processor: (job: Job<TokenRefreshJobData, any, string>) => Promise<void>) {
  return new Worker<TokenRefreshJobData, any, string>(
    'token-refresh',
    async (job) => {
      logger.info(`Refreshing tokens for account ${job.data.accountId}`);
      await processor(job);
    },
    {
      connection,
      concurrency: 10,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    }
  );
}

// Webhook processor
export function createWebhookWorker(processor: (job: Job<any, any, string>) => Promise<void>) {
  return new Worker<any, any, string>(
    'webhook-processing',
    async (job) => {
      logger.info(`Processing webhook from ${job.data.provider}`, {
        eventId: job.data.eventId,
      });
      await processor(job);
    },
    {
      connection,
      concurrency: 20,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    }
  );
}

// Add a sync job to the queue
export async function enqueueSyncJob(data: SyncJobData) {
  return await syncQueue.add('sync' as any, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}

// Add a token refresh job
export async function enqueueTokenRefresh(data: TokenRefreshJobData, delayMs?: number) {
  return await tokenRefreshQueue.add('refresh' as any, data, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    delay: delayMs,
  });
}

// Add a webhook processing job
export async function enqueueWebhookJob(data: any) {
  return await webhookQueue.add('process' as any, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  });
}

// Schedule recurring token refresh checks (every hour)
export async function scheduleTokenRefreshChecks() {
  await tokenRefreshQueue.add(
    'check-expiring-tokens' as any,
    // Provide a dummy initial object to fulfill the job data requirements
    { accountId: 'system', provider: Provider.TERRA } as any,
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
    }
  );
  logger.info('Scheduled recurring token refresh checks');
}
