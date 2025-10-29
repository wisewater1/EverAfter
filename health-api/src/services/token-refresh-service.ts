import { Job } from 'bullmq';
import { prisma } from '../utils/db.js';
import { getProvider } from '../providers/index.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { TokenRefreshJobData } from '../types/index.js';
import { Provider } from '@prisma/client';

export async function processTokenRefresh(job: Job<TokenRefreshJobData>): Promise<void> {
  const { accountId, provider } = job.data;

  try {
    const account = await prisma.providerAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || !account.refreshToken) {
      logger.warn(`No account or refresh token found`, { accountId });
      return;
    }

    // Decrypt refresh token
    const refreshToken = decryptToken(account.refreshToken);

    // Get provider driver and refresh tokens
    const driver = getProvider(provider as Provider);
    const newTokens = await driver.refreshTokens(refreshToken);

    // Update account with new tokens
    await prisma.providerAccount.update({
      where: { id: accountId },
      data: {
        accessToken: encryptToken(newTokens.accessToken),
        refreshToken: newTokens.refreshToken ? encryptToken(newTokens.refreshToken) : account.refreshToken,
        expiresAt: newTokens.expiresAt,
        updatedAt: new Date(),
      },
    });

    logger.info(`Tokens refreshed successfully`, { accountId, provider });
  } catch (error) {
    logger.error(`Token refresh failed`, { accountId, provider, error });

    // Mark account as error if refresh fails repeatedly
    await prisma.providerAccount.update({
      where: { id: accountId },
      data: {
        status: 'ERROR',
        metadata: {
          error: 'Token refresh failed',
          lastError: new Date().toISOString(),
        },
      },
    });

    throw error;
  }
}

export async function checkExpiringTokens(): Promise<void> {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

  try {
    const expiringAccounts = await prisma.providerAccount.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lte: oneHourFromNow,
          gte: new Date(),
        },
        refreshToken: {
          not: null,
        },
      },
    });

    logger.info(`Found ${expiringAccounts.length} accounts with expiring tokens`);

    for (const account of expiringAccounts) {
      await processTokenRefresh({
        id: 'check',
        name: 'check',
        data: {
          accountId: account.id,
          provider: account.provider,
        },
      } as Job<TokenRefreshJobData>);
    }
  } catch (error) {
    logger.error('Failed to check expiring tokens', error);
  }
}
