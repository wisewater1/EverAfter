import { Router } from 'express';
// import { Provider, MetricType } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { z } from 'zod';
import { prisma } from '../utils/db.js';

const router = Router();

const ingestionSchema = z.object({
    userId: z.string(),
    metrics: z.array(z.object({
        metric: z.string(),
        value: z.number(),
        unit: z.string(),
        timestamp: z.string(),
        payload: z.any().optional(),
    }))
});

// Apple Health Direct Ingestion
router.post('/apple-health', async (req, res) => {
    try {
        const { userId, metrics } = ingestionSchema.parse(req.body);

        logger.info(`Received Apple Health ingestion for user ${userId} with ${metrics.length} metrics.`);

        const source = await (prisma as any).source.findFirst({
            where: {
                userId,
                provider: 'APPLE_HEALTH',
            }
        });

        if (!source) {
            logger.warn(`Apple Health connection not found for user ${userId}`);
            return res.status(404).json({ success: false, error: 'Connection not active' });
        }

        const dataToInsert = metrics.map(m => ({
            sourceId: source.id,
            type: m.metric,
            value: m.value,
            unit: m.unit,
            ts: new Date(m.timestamp as string),
            payload: m.payload || {},
        }));

        await (prisma as any).metric.createMany({
            data: dataToInsert,
            skipDuplicates: true,
        });

        res.json({ success: true, count: metrics.length });
    } catch (error) {
        logger.error('Error processing Apple Health ingestion', error);
        res.status(500).json({ success: false, error: 'Failed to process metrics' });
    }
});

// Samsung Health Connect Direct Ingestion
router.post('/health-connect', async (req, res) => {
    try {
        const { userId, metrics } = ingestionSchema.parse(req.body);

        logger.info(`Received Health Connect ingestion for user ${userId} with ${metrics.length} metrics.`);

        const source = await (prisma as any).source.findFirst({
            where: {
                userId,
                provider: 'SAMSUNG_HEALTH',
            }
        });

        if (!source) {
            logger.warn(`Health Connect connection not found for user ${userId}`);
            return res.status(404).json({ success: false, error: 'Connection not active' });
        }

        const dataToInsert = metrics.map(m => ({
            sourceId: source.id,
            type: m.metric,
            value: m.value,
            unit: m.unit,
            ts: new Date(m.timestamp as string),
            payload: m.payload || {},
        }));

        await (prisma as any).metric.createMany({
            data: dataToInsert,
            skipDuplicates: true,
        });

        res.json({ success: true, count: metrics.length });
    } catch (error) {
        logger.error('Error processing Health Connect ingestion', error);
        res.status(500).json({ success: false, error: 'Failed to process metrics' });
    }
});

export default router;
