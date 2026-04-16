import { Queue, Worker, Job } from 'bullmq';
import { Provider } from '../generated/prisma/client.js';
import { SyncJobData, TokenRefreshJobData } from '../types/index.js';
import { logger } from '../utils/logger.js';

let warnedQueueDisabled = false;
let syncQueue: Queue<SyncJobData, unknown, string> | null = null;
let tokenRefreshQueue: Queue<TokenRefreshJobData, unknown, string> | null = null;
let webhookQueue: Queue<unknown, unknown, string> | null = null;

export function isQueueingEnabled(): boolean {
  return Boolean(process.env.REDIS_URL);
}

function logQueueDisabled(context: string): void {
  if (warnedQueueDisabled) {
    return;
  }

  warnedQueueDisabled = true;
  logger.warn(`${context}: Redis-backed jobs are disabled because REDIS_URL is not configured`);
}

function getConnectionOptions(): { url: string } | null {
  if (!isQueueingEnabled()) {
    return null;
  }

  return { url: process.env.REDIS_URL! };
}

function getSyncQueue(): Queue<SyncJobData, unknown, string> | null {
  if (syncQueue) {
    return syncQueue as Queue<SyncJobData, unknown, string>;
  }

  const connection = getConnectionOptions();
  if (!connection) {
    return null;
  }

  syncQueue = new Queue('health-sync', { connection });
  return syncQueue as Queue<SyncJobData, unknown, string>;
}

function getTokenRefreshQueue(): Queue<TokenRefreshJobData, unknown, string> | null {
  if (tokenRefreshQueue) {
    return tokenRefreshQueue as Queue<TokenRefreshJobData, unknown, string>;
  }

  const connection = getConnectionOptions();
  if (!connection) {
    return null;
  }

  tokenRefreshQueue = new Queue('token-refresh', { connection });
  return tokenRefreshQueue as Queue<TokenRefreshJobData, unknown, string>;
}

function getWebhookQueue(): Queue<unknown, unknown, string> | null {
  if (webhookQueue) {
    return webhookQueue;
  }

  const connection = getConnectionOptions();
  if (!connection) {
    return null;
  }

  webhookQueue = new Queue('webhook-processing', { connection });
  return webhookQueue;
}

export function createSyncWorker(processor: (job: Job<SyncJobData, unknown, string>) => Promise<void>) {
  const connection = getConnectionOptions();
  if (!connection) {
    logQueueDisabled('Skipping sync worker startup');
    return null;
  }

  return new Worker<SyncJobData, unknown, string>(
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

export function createTokenRefreshWorker(processor: (job: Job<TokenRefreshJobData, unknown, string>) => Promise<void>) {
  const connection = getConnectionOptions();
  if (!connection) {
    logQueueDisabled('Skipping token refresh worker startup');
    return null;
  }

  return new Worker<TokenRefreshJobData, unknown, string>(
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

export function createWebhookWorker(processor: (job: Job<unknown, unknown, string>) => Promise<void>) {
  const connection = getConnectionOptions();
  if (!connection) {
    logQueueDisabled('Skipping webhook worker startup');
    return null;
  }

  return new Worker<unknown, unknown, string>(
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

export async function enqueueSyncJob(data: SyncJobData) {
  const queue = getSyncQueue();
  if (!queue) {
    logQueueDisabled('Skipping sync enqueue');
    return null;
  }

  return await queue.add('sync', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}

export async function enqueueTokenRefresh(data: TokenRefreshJobData, delayMs?: number) {
  const queue = getTokenRefreshQueue();
  if (!queue) {
    logQueueDisabled('Skipping token refresh enqueue');
    return null;
  }

  return await queue.add('refresh', data, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    delay: delayMs,
  });
}

export async function enqueueWebhookJob(data: unknown) {
  const queue = getWebhookQueue();
  if (!queue) {
    logQueueDisabled('Skipping webhook enqueue');
    return null;
  }

  return await queue.add('process', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  });
}

export async function scheduleTokenRefreshChecks() {
  const queue = getTokenRefreshQueue();
  if (!queue) {
    logQueueDisabled('Skipping recurring token refresh schedule');
    return;
  }

  await queue.add(
    'check-expiring-tokens',
    { accountId: 'system', provider: Provider.TERRA } as unknown as TokenRefreshJobData,
    {
      repeat: {
        pattern: '0 * * * *',
      },
    }
  );
  logger.info('Scheduled recurring token refresh checks');
}
