import { Job } from 'bullmq';
import { Provider } from '@prisma/client';
import { prisma } from '../utils/db.js';
import { getProvider } from '../providers/index.js';
import { decryptToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { SyncJobData } from '../types/index.js';

export async function processSyncJob(job: Job<SyncJobData>): Promise<void> {
  const { userId, provider, accountId, since, fullBackfill } = job.data;

  try {
    // Get provider account with tokens
    const account = await prisma.providerAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== userId) {
      throw new Error(`Account not found or access denied: ${accountId}`);
    }

    if (account.status !== 'ACTIVE') {
      logger.warn(`Skipping sync for inactive account`, { accountId, status: account.status });
      return;
    }

    // Decrypt access token
    const accessToken = account.accessToken ? decryptToken(account.accessToken) : '';

    // Get provider driver
    const driver = getProvider(provider as Provider);

    // Fetch metrics from provider
    const sinceDate = since || account.lastSyncAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const metrics = await driver.fetchLatestMetrics({
      accessToken,
      since: sinceDate,
    });

    logger.info(`Fetched ${metrics.length} metrics from ${provider}`, {
      userId,
      accountId,
      since: sinceDate,
    });

    // Insert metrics into database
    let insertedCount = 0;
    for (const metric of metrics) {
      try {
        await prisma.healthMetric.create({
          data: {
            userId,
            accountId,
            source: provider,
            metric: metric.metric,
            value: metric.value,
            unit: metric.unit,
            ts: metric.timestamp,
            raw: metric.raw || {},
          },
        });
        insertedCount++;
      } catch (error) {
        // Ignore duplicate errors, log others
        if (!(error as any)?.code?.includes('unique')) {
          logger.error('Failed to insert metric', { error, metric });
        }
      }
    }

    // Update last sync timestamp
    await prisma.providerAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() },
    });

    logger.info(`Sync completed: inserted ${insertedCount}/${metrics.length} metrics`, {
      userId,
      provider,
      accountId,
    });
  } catch (error) {
    logger.error(`Sync job failed for ${provider}`, { userId, accountId, error });
    throw error;
  }
}
