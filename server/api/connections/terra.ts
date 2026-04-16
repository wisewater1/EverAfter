import express from 'express';
import { z } from 'zod';
import { createAuditLog } from '../../lib/audit';
import { TerraClient } from '../../lib/terra-client';
import prisma from '../../lib/prisma';

const router = express.Router();
const terra = new TerraClient();

const connectSchema = z.object({
  userId: z.string(),
  redirectUrl: z.string().url().optional(),
});

router.post('/connect/terra', async (req, res) => {
  try {
    const { userId, redirectUrl } = connectSchema.parse(req.body);

    if (req.headers.host?.includes('webcontainer-api.io')) {
      return res.status(400).json({
        error: 'OAuth not supported in WebContainer',
        message: 'Terra OAuth requires a public HTTPS domain. Deploy to bolt.run or use ngrok.',
      });
    }

    const baseUrl = process.env.BASE_URL;
    if (!baseUrl || !baseUrl.startsWith('https://')) {
      return res.status(400).json({
        error: 'Invalid BASE_URL',
        message: 'BASE_URL must be a public HTTPS domain for OAuth',
      });
    }

    const callbackUrl = `${baseUrl}/oauth/terra/callback`;
    const session = await terra.generateWidgetSession(userId, callbackUrl);

    await createAuditLog({
      userId,
      action: 'terra.connect.initiated',
      provider: 'TERRA',
      metadata: { sessionId: session.session_id },
    });

    res.json({
      authorizeUrl: session.url,
      sessionId: session.session_id,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    console.error('Terra connect error:', error);
    res.status(500).json({
      error: 'Failed to initiate Terra connection',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/oauth/terra/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    const stateValue = state as string;

    // Bug #8 fix: Validate state matches the authenticated user's ID
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId || stateValue !== authenticatedUserId) {
      return res.status(403).send('OAuth state mismatch: unauthorized callback');
    }

    const userId = authenticatedUserId;

    const tokens = await terra.exchangeToken(code as string);

    // Bug #31 fix: Use upsert instead of find-then-create/update race condition
    await prisma.source.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'TERRA',
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        provider: 'TERRA',
        externalUserId: tokens.user_id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scopes: tokens.scope?.split(' ') || [],
      },
    });

    await createAuditLog({
      userId,
      action: 'terra.connect.completed',
      provider: 'TERRA',
      metadata: { externalUserId: tokens.user_id },
    });

    res.redirect(`${process.env.BASE_URL}/dashboard/health?connected=terra`);
  } catch (error) {
    console.error('Terra callback error:', error);
    res.status(500).send('Connection failed. Please try again.');
  }
});

// Bug #19 fix: Helper to check token expiration and refresh if needed
async function ensureValidToken(userId: string): Promise<{ valid: boolean; source?: any }> {
  const source = await prisma.source.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'TERRA',
      },
    },
  });

  if (!source) {
    return { valid: false };
  }

  // Check if token is expired or about to expire (5-minute buffer)
  if (source.expiresAt && source.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    if (source.refreshToken) {
      try {
        const newTokens = await terra.refreshToken(source.refreshToken);
        const updated = await prisma.source.update({
          where: { id: source.id },
          data: {
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token || source.refreshToken,
            expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
          },
        });
        return { valid: true, source: updated };
      } catch (error) {
        console.error('Token refresh failed for user:', userId);
        // Mark source as needing re-authentication
        await prisma.source.update({
          where: { id: source.id },
          data: { lastSyncAt: null },
        });
        return { valid: false };
      }
    }
    // No refresh token and token is expired
    return { valid: false };
  }

  return { valid: true, source };
}

export { ensureValidToken };
export default router;
