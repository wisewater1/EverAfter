import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createAuditLog } from '../../lib/audit';
import { TerraClient } from '../../lib/terra-client';

const router = express.Router();
const prisma = new PrismaClient();
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

    const userId = state as string;

    const tokens = await terra.exchangeToken(code as string);

    const existingSource = await prisma.source.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'TERRA',
        },
      },
    });

    if (existingSource) {
      await prisma.source.update({
        where: { id: existingSource.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          lastSyncAt: new Date(),
        },
      });
    } else {
      await prisma.source.create({
        data: {
          userId,
          provider: 'TERRA',
          externalUserId: tokens.user_id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          scopes: tokens.scope?.split(' ') || [],
        },
      });
    }

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

export default router;
