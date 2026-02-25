import express from 'express';
import crypto from 'crypto';
import { Queue } from 'bullmq';
import { createAuditLog } from '../../lib/audit';

const router = express.Router();
const ingestQueue = new Queue('ingest-terra', {
  connection: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
});

function verifyTerraWebhook(payload: string, signature: string): boolean {
  const secret = process.env.TERRA_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

router.post('/webhooks/terra', async (req, res) => {
  try {
    const signature = req.headers['terra-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (signature && !verifyTerraWebhook(rawBody, signature)) {
      console.warn('Invalid Terra webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, user, data } = req.body;

    console.log(`Terra webhook: ${type} for user ${user?.user_id}`);

    await ingestQueue.add(
      'terra-webhook',
      {
        type,
        userId: user?.user_id,
        externalUserId: user?.user_id,
        data,
        receivedAt: new Date().toISOString(),
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    if (user?.user_id) {
      await createAuditLog({
        action: 'terra.webhook.received',
        provider: 'TERRA',
        metadata: { type, externalUserId: user.user_id },
      });
    }

    res.json({ success: true, queued: true });
  } catch (error) {
    console.error('Terra webhook error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
