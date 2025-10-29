import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { SyncJobData, TokenRefreshJobData } from '../types/index.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Define job queues
export const syncQueue = new Queue<SyncJobData>('health-sync', { connection });
export const tokenRefreshQueue = new Queue<TokenRefreshJobData>('token-refresh', { connection });
export const webhookQueue = new Queue('webhook-processing', { connection });

// Sync job processor
export function createSyncWorker(processor: (job: Job<SyncJobData>) => Promise<void>) {
  return new Worker<SyncJobData>(
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
export function createTokenRefreshWorker(processor: (job: Job<TokenRefreshJobData>) => Promise<void>) {
  return new Worker<TokenRefreshJobData>(
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
export function createWebhookWorker(processor: (job: Job) => Promise<void>) {
  return new Worker(
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
  return await syncQueue.add('sync', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}

// Add a token refresh job
export async function enqueueTokenRefresh(data: TokenRefreshJobData, delayMs?: number) {
  return await tokenRefreshQueue.add('refresh', data, {
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
  return await webhookQueue.add('process', data, {
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
    'check-expiring-tokens',
    {},
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
    }
  );
  logger.info('Scheduled recurring token refresh checks');
}
