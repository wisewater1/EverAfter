import express from 'express';
import { PrismaClient } from '@prisma/client';
import { runRaphael } from '../../agents/raphael/runner';
import { writeEngram } from '../../agents/raphael/tools';
import { checkConsent } from '../lib/consent';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/me/raphael/summary', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const metrics = await prisma.metric.findMany({
      where: {
        source: { userId },
        ts: { gte: dayAgo },
      },
      orderBy: { ts: 'desc' },
      take: 100,
    });

    const latestRun = await prisma.agentRun.findFirst({
      where: {
        userId,
        agentId: 'raphael.healer.v1',
        status: 'completed',
      },
      orderBy: { completedAt: 'desc' },
    });

    const latestEngrams = await prisma.engramEntry.findMany({
      where: {
        userId,
        kind: 'raphael-insight',
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const vitals = calculateVitals(metrics);

    const insights = latestEngrams.map((e) => ({
      text: e.text,
      severity: e.tags.includes('severity-warning') ? 'warning' : 'info',
      category: e.tags[0] || 'general',
    }));

    res.json({
      metrics: metrics.length,
      vitals,
      insights,
      suggestion: 'Keep up your consistent wellness routine.',
      lastRun: latestRun?.completedAt,
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

router.post('/me/raphael/run', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const recentRun = await prisma.agentRun.findFirst({
      where: {
        userId,
        agentId: 'raphael.healer.v1',
        startedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000),
        },
      },
    });

    if (recentRun) {
      return res.status(429).json({
        error: 'Rate limited',
        message: 'Please wait 5 minutes between manual runs',
      });
    }

    const result = await runRaphael({
      userId,
      manual: true,
    });

    res.json(result);
  } catch (error) {
    console.error('Manual run error:', error);
    res.status(500).json({
      error: 'Run failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const logSchema = z.object({
  text: z.string(),
  tags: z.array(z.string()).optional(),
});

router.post('/me/raphael/log', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { text, tags } = logSchema.parse(req.body);

    const hasConsent = await checkConsent(userId, 'train');
    if (!hasConsent) {
      return res.status(403).json({
        error: 'Consent required',
        message: 'You must grant consent for vault writing',
      });
    }

    const result = await writeEngram({
      userId,
      kind: 'raphael-insight',
      text,
      tags: tags || [],
      metadata: { manual: true },
    });

    res.json({ success: true, engramId: result.id });
  } catch (error) {
    console.error('Log error:', error);
    res.status(500).json({ error: 'Failed to log insight' });
  }
});

router.get('/me/metrics', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { types, since } = req.query;

    const metrics = await prisma.metric.findMany({
      where: {
        source: { userId },
        ...(types && { type: { in: (types as string).split(',') } }),
        ...(since && { ts: { gte: new Date(since as string) } }),
      },
      orderBy: { ts: 'desc' },
      take: 1000,
    });

    res.json({ metrics });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

router.get('/me/engrams', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { kind } = req.query;

    const engrams = await prisma.engramEntry.findMany({
      where: {
        userId,
        ...(kind && { kind: kind as string }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ engrams });
  } catch (error) {
    console.error('Engrams error:', error);
    res.status(500).json({ error: 'Failed to fetch engrams' });
  }
});

function calculateVitals(metrics: any[]) {
  const hrMetrics = metrics.filter((m) => m.type === 'HEART_RATE' && m.value);
  const hrvMetrics = metrics.filter((m) => m.type === 'HRV' && m.value);
  const stepMetrics = metrics.filter((m) => m.type === 'STEPS' && m.value);
  const sleepMetrics = metrics.filter((m) => m.type === 'SLEEP_DURATION' && m.value);
  const glucoseMetrics = metrics.filter((m) => m.type === 'GLUCOSE' && m.value);

  return {
    heartRate: {
      avg: hrMetrics.length > 0 ? hrMetrics.reduce((a, b) => a + b.value!, 0) / hrMetrics.length : 0,
      max: hrMetrics.length > 0 ? Math.max(...hrMetrics.map((m) => m.value!)) : 0,
    },
    hrv: {
      avg: hrvMetrics.length > 0 ? hrvMetrics.reduce((a, b) => a + b.value!, 0) / hrvMetrics.length : 0,
    },
    steps: {
      total: stepMetrics.length > 0 ? stepMetrics.reduce((a, b) => a + b.value!, 0) : 0,
    },
    sleep: {
      hours: sleepMetrics.length > 0 ? sleepMetrics.reduce((a, b) => a + b.value!, 0) / sleepMetrics.length : 0,
    },
    ...(glucoseMetrics.length > 0 && {
      glucose: {
        avg: glucoseMetrics.reduce((a, b) => a + b.value!, 0) / glucoseMetrics.length,
      },
    }),
  };
}

export default router;
