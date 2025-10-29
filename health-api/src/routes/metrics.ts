import { Router } from 'express';
import { MetricType, Provider } from '@prisma/client';
import { AuthenticatedRequest, ApiResponse, MetricsQueryParams, DailySummary } from '../types/index.js';
import { prisma } from '../utils/db.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /me/metrics - Query health metrics with filters
router.get('/me/metrics', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const {
      types,
      since,
      until,
      provider,
      limit = 100,
      offset = 0,
    } = req.query as any;

    const where: any = { userId };

    if (types) {
      const typeArray = Array.isArray(types) ? types : types.split(',');
      where.metric = { in: typeArray.map((t: string) => t.toUpperCase()) };
    }

    if (since) {
      where.ts = { ...where.ts, gte: new Date(since) };
    }

    if (until) {
      where.ts = { ...where.ts, lte: new Date(until) };
    }

    if (provider) {
      where.source = provider.toUpperCase();
    }

    const [metrics, total] = await Promise.all([
      prisma.healthMetric.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.healthMetric.count({ where }),
    ]);

    res.json({
      success: true,
      data: metrics,
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to query metrics', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve metrics' });
  }
});

// GET /me/glucose/latest - Get latest glucose readings (CGM)
router.get('/me/glucose/latest', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const hours = parseInt(req.query.hours as string) || 24;

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const readings = await prisma.healthMetric.findMany({
      where: {
        userId,
        metric: MetricType.GLUCOSE,
        ts: { gte: since },
      },
      orderBy: { ts: 'desc' },
      take: 288, // 5-min intervals for 24 hours
    });

    const stats = readings.length > 0 ? {
      latest: readings[0],
      avg: readings.reduce((sum, r) => sum + r.value, 0) / readings.length,
      min: Math.min(...readings.map(r => r.value)),
      max: Math.max(...readings.map(r => r.value)),
      count: readings.length,
    } : null;

    res.json({
      success: true,
      data: {
        readings,
        stats,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to fetch glucose data', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve glucose data' });
  }
});

// GET /me/sleep/latest - Get recent sleep data
router.get('/me/sleep/latest', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const days = parseInt(req.query.days as string) || 7;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sleepData = await prisma.healthMetric.findMany({
      where: {
        userId,
        metric: MetricType.SLEEP_DURATION,
        ts: { gte: since },
      },
      orderBy: { ts: 'desc' },
    });

    res.json({
      success: true,
      data: sleepData,
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to fetch sleep data', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve sleep data' });
  }
});

// GET /me/workouts - Get workout/activity history
router.get('/me/workouts', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const since = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const workoutMetrics = await prisma.healthMetric.findMany({
      where: {
        userId,
        metric: {
          in: [MetricType.WORKOUT_DISTANCE, MetricType.WORKOUT_PACE, MetricType.WORKOUT_POWER],
        },
        ts: { gte: since },
      },
      orderBy: { ts: 'desc' },
    });

    // Group by workout session (same timestamp)
    const workoutMap = new Map();
    for (const metric of workoutMetrics) {
      const key = metric.ts.toISOString();
      if (!workoutMap.has(key)) {
        workoutMap.set(key, { timestamp: metric.ts, source: metric.source, metrics: [] });
      }
      workoutMap.get(key).metrics.push(metric);
    }

    const workouts = Array.from(workoutMap.values());

    res.json({
      success: true,
      data: workouts,
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to fetch workouts', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve workouts' });
  }
});

// GET /me/summary/daily - Get daily aggregated summary
router.get('/me/summary/daily', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const metrics = await prisma.healthMetric.findMany({
      where: {
        userId,
        ts: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const summary: DailySummary = {
      date: date.toISOString().split('T')[0],
    };

    // Aggregate metrics
    const stepsMetrics = metrics.filter(m => m.metric === MetricType.STEPS);
    if (stepsMetrics.length > 0) {
      summary.steps = Math.max(...stepsMetrics.map(m => m.value));
    }

    const caloriesMetrics = metrics.filter(m => m.metric === MetricType.CALORIES);
    if (caloriesMetrics.length > 0) {
      summary.calories = caloriesMetrics.reduce((sum, m) => sum + m.value, 0);
    }

    const hrMetrics = metrics.filter(m => m.metric === MetricType.HEART_RATE);
    if (hrMetrics.length > 0) {
      summary.heartRateAvg = hrMetrics.reduce((sum, m) => sum + m.value, 0) / hrMetrics.length;
    }

    const sleepMetrics = metrics.filter(m => m.metric === MetricType.SLEEP_DURATION);
    if (sleepMetrics.length > 0) {
      summary.sleepDuration = Math.max(...sleepMetrics.map(m => m.value));
    }

    const glucoseMetrics = metrics.filter(m => m.metric === MetricType.GLUCOSE);
    if (glucoseMetrics.length > 0) {
      summary.glucose = {
        avg: glucoseMetrics.reduce((sum, m) => sum + m.value, 0) / glucoseMetrics.length,
        min: Math.min(...glucoseMetrics.map(m => m.value)),
        max: Math.max(...glucoseMetrics.map(m => m.value)),
      };
    }

    res.json({
      success: true,
      data: summary,
    } as ApiResponse<DailySummary>);
  } catch (error) {
    logger.error('Failed to generate daily summary', error);
    res.status(500).json({ success: false, error: 'Failed to generate summary' });
  }
});

export default router;
