import express from 'express';
import crypto from 'crypto';
import { Queue } from 'bullmq';
import { createAuditLog } from '../../lib/audit';

const router = express.Router();
let ingestQueue: Queue | null = null;

function getIngestQueue(): Queue | null {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!ingestQueue) {
    ingestQueue = new Queue('ingest-terra', {
      connection: {
        url: process.env.REDIS_URL,
      },
    });
  }

  return ingestQueue;
}

function verifyTerraWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.TERRA_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');

  // Bug #9 fix: timingSafeEqual throws if buffers differ in length
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

router.post('/webhooks/terra', async (req, res) => {
  try {
    const signature = req.headers['terra-signature'] as string;
    // Bug #10 fix: Use raw body for signature verification instead of re-serialized JSON.
    // NOTE: This requires raw body middleware in Express, e.g.:
    //   app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf.toString(); } }));
    // Without that middleware, req.rawBody will be undefined and fall back to JSON.stringify.
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (signature && !verifyTerraWebhook(rawBody, signature)) {
      console.warn('Invalid Terra webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, user, data } = req.body;

    console.log(`Terra webhook: ${type} for user ${user?.user_id}`);

    let queued = false;
    const queue = getIngestQueue();
    if (queue) {
      await queue.add(
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
      queued = true;
    } else {
      console.warn('Skipping Terra webhook enqueue: REDIS_URL is not configured');
    }

    if (user?.user_id) {
      await createAuditLog({
        action: 'terra.webhook.received',
        provider: 'TERRA',
        metadata: { type, externalUserId: user.user_id },
      });
    }

    res.json({ success: true, queued });
  } catch (error) {
    console.error('Terra webhook error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
