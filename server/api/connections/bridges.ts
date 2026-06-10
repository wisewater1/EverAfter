import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import { createAuditLog } from '../../lib/audit';

const router = express.Router();
const prisma = new PrismaClient();

const bridgeSchema = z.object({
  userId: z.string(),
  signature: z.string(),
  timestamp: z.number(),
  metrics: z.array(
    z.object({
      type: z.string(),
      value: z.number(),
      unit: z.string(),
      timestamp: z.string(),
      metadata: z.record(z.any()).optional(),
    })
  ),
});

function verifySignature(payload: any, signature: string): boolean {
  const secret = process.env.BRIDGE_SHARED_SECRET;
  if (!secret) {
    throw new Error('BRIDGE_SHARED_SECRET not configured');
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expected = hmac.digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

router.post('/bridge/apple-health', async (req, res) => {
  try {
    const { signature, ...payload } = bridgeSchema.parse(req.body);

    const timestampAge = Date.now() - payload.timestamp;
    if (timestampAge > 5 * 60 * 1000) {
      return res.status(400).json({ error: 'Request expired' });
    }

    if (!verifySignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    let source = await prisma.source.findUnique({
      where: {
        userId_provider: {
          userId: payload.userId,
          provider: 'APPLE_HEALTH',
        },
      },
    });

    if (!source) {
      source = await prisma.source.create({
        data: {
          userId: payload.userId,
          provider: 'APPLE_HEALTH',
          externalUserId: `apple-${payload.userId}`,
          scopes: ['health'],
        },
      });
    }

    const metrics = payload.metrics.map((m) => ({
      sourceId: source.id,
      type: mapMetricType(m.type),
      ts: new Date(m.timestamp),
      value: m.value,
      unit: m.unit,
      payload: m.metadata || {},
    }));

    await prisma.metric.createMany({
      data: metrics,
      skipDuplicates: true,
    });

    await prisma.source.update({
      where: { id: source.id },
      data: { lastSyncAt: new Date() },
    });

    await createAuditLog({
      userId: payload.userId,
      action: 'bridge.apple_health.sync',
      provider: 'APPLE_HEALTH',
      metadata: { metricsCount: metrics.length },
    });

    res.json({ success: true, received: metrics.length });
  } catch (error) {
    console.error('Apple Health bridge error:', error);
    res.status(500).json({
      error: 'Failed to process Apple Health data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/bridge/health-connect', async (req, res) => {
  try {
    const { signature, ...payload } = bridgeSchema.parse(req.body);

    const timestampAge = Date.now() - payload.timestamp;
    if (timestampAge > 5 * 60 * 1000) {
      return res.status(400).json({ error: 'Request expired' });
    }

    if (!verifySignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    let source = await prisma.source.findUnique({
      where: {
        userId_provider: {
          userId: payload.userId,
          provider: 'SAMSUNG_HEALTH',
        },
      },
    });

    if (!source) {
      source = await prisma.source.create({
        data: {
          userId: payload.userId,
          provider: 'SAMSUNG_HEALTH',
          externalUserId: `samsung-${payload.userId}`,
          scopes: ['health'],
        },
      });
    }

    const metrics = payload.metrics.map((m) => ({
      sourceId: source.id,
      type: mapMetricType(m.type),
      ts: new Date(m.timestamp),
      value: m.value,
      unit: m.unit,
      payload: m.metadata || {},
    }));

    await prisma.metric.createMany({
      data: metrics,
      skipDuplicates: true,
    });

    await prisma.source.update({
      where: { id: source.id },
      data: { lastSyncAt: new Date() },
    });

    await createAuditLog({
      userId: payload.userId,
      action: 'bridge.health_connect.sync',
      provider: 'SAMSUNG_HEALTH',
      metadata: { metricsCount: metrics.length },
    });

    res.json({ success: true, received: metrics.length });
  } catch (error) {
    console.error('Health Connect bridge error:', error);
    res.status(500).json({
      error: 'Failed to process Health Connect data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

function mapMetricType(type: string): string {
  const mapping: Record<string, string> = {
    'heart_rate': 'HEART_RATE',
    'steps': 'STEPS',
    'hrv': 'HRV',
    'sleep': 'SLEEP_DURATION',
    'calories': 'CALORIES',
    'oxygen': 'OXYGEN_SAT',
    'glucose': 'GLUCOSE',
    'weight': 'WEIGHT',
    'blood_pressure': 'BLOOD_PRESSURE',
  };

  return mapping[type.toLowerCase()] || type.toUpperCase();
}

export default router;
