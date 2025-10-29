import { Router } from 'express';
import { Provider } from '@prisma/client';
import { AuthenticatedRequest, ApiResponse, ConnectionStatus } from '../types/index.js';
import { prisma } from '../utils/db.js';
import { getProvider, isProviderImplemented } from '../providers/index.js';
import { getProviderConfig } from '../config/providers.js';
import { generateState, encryptToken } from '../utils/crypto.js';
import { enqueueSyncJob } from '../services/queue.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /me/sources - List all connected providers
router.get('/me/sources', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;

    const accounts = await prisma.providerAccount.findMany({
      where: { userId },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });

    const connections: ConnectionStatus[] = accounts.map((account) => ({
      provider: account.provider,
      status: account.status,
      lastSyncAt: account.lastSyncAt || undefined,
      deviceCount: account._count.devices,
    }));

    res.json({ success: true, data: connections } as ApiResponse<ConnectionStatus[]>);
  } catch (error) {
    logger.error('Failed to list sources', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve connections' });
  }
});

// POST /me/connect/:provider - Generate OAuth URL
router.post('/me/connect/:provider', async (req: AuthenticatedRequest, res) => {
  try {
    const provider = req.params.provider.toUpperCase() as Provider;
    const userId = req.userId!;

    if (!Object.values(Provider).includes(provider)) {
      res.status(400).json({ success: false, error: 'Invalid provider' });
      return;
    }

    if (!isProviderImplemented(provider)) {
      res.status(501).json({
        success: false,
        error: `${provider} integration coming soon`,
      });
      return;
    }

    // Generate OAuth state
    const state = generateState();
    const redirectUri = `${process.env.BASE_URL}/oauth/${provider.toLowerCase()}/callback`;

    // Store state in session/database (simplified here)
    await prisma.$executeRaw`
      INSERT INTO oauth_states (state, user_id, provider, created_at)
      VALUES (${state}, ${userId}, ${provider}, NOW())
      ON CONFLICT DO NOTHING
    `;

    // Get authorization URL
    const driver = getProvider(provider);
    const authUrl = driver.authorizeUrl({ state, redirectUri });

    res.json({
      success: true,
      data: {
        authUrl,
        provider,
        state,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to generate OAuth URL', error);
    res.status(500).json({ success: false, error: 'Failed to generate authorization URL' });
  }
});

// GET /oauth/:provider/callback - Handle OAuth callback
router.get('/oauth/:provider/callback', async (req: AuthenticatedRequest, res) => {
  try {
    const provider = req.params.provider.toUpperCase() as Provider;
    const { code, state } = req.query;

    if (!code || !state) {
      res.status(400).json({ success: false, error: 'Missing code or state' });
      return;
    }

    // Verify state (simplified - should fetch from database)
    const stateRecord = await prisma.$queryRaw<Array<{ user_id: string }>>`
      SELECT user_id FROM oauth_states
      WHERE state = ${state as string} AND provider = ${provider}
      LIMIT 1
    `;

    if (!stateRecord || stateRecord.length === 0) {
      res.status(400).json({ success: false, error: 'Invalid state' });
      return;
    }

    const userId = stateRecord[0].user_id;
    const redirectUri = `${process.env.BASE_URL}/oauth/${provider.toLowerCase()}/callback`;

    // Exchange code for tokens
    const driver = getProvider(provider);
    const tokens = await driver.exchangeCodeForTokens(code as string, redirectUri);
    const profile = await driver.fetchProfile(tokens.accessToken);

    // Create or update provider account
    const account = await prisma.providerAccount.upsert({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      create: {
        userId,
        provider,
        externalUserId: profile.externalUserId,
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes || [],
        status: 'ACTIVE',
        metadata: profile.metadata || {},
      },
      update: {
        externalUserId: profile.externalUserId,
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : undefined,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes || [],
        status: 'ACTIVE',
        metadata: profile.metadata || {},
        updatedAt: new Date(),
      },
    });

    // Enqueue initial sync job
    await enqueueSyncJob({
      userId,
      provider,
      accountId: account.id,
      fullBackfill: true,
    });

    // Delete used state
    await prisma.$executeRaw`
      DELETE FROM oauth_states WHERE state = ${state as string}
    `;

    res.json({
      success: true,
      data: {
        message: 'Provider connected successfully',
        provider,
        accountId: account.id,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('OAuth callback failed', error);
    res.status(500).json({ success: false, error: 'Failed to complete OAuth flow' });
  }
});

// POST /me/disconnect/:provider - Disconnect provider
router.post('/me/disconnect/:provider', async (req: AuthenticatedRequest, res) => {
  try {
    const provider = req.params.provider.toUpperCase() as Provider;
    const userId = req.userId!;

    const result = await prisma.providerAccount.updateMany({
      where: {
        userId,
        provider,
      },
      data: {
        status: 'DISCONNECTED',
        accessToken: null,
        refreshToken: null,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      res.status(404).json({ success: false, error: 'Provider connection not found' });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Provider disconnected successfully' },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to disconnect provider', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect provider' });
  }
});

export default router;
