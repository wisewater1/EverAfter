import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

import terraRouter from './api/connections/terra';
import bridgesRouter from './api/connections/bridges';
import webhooksRouter from './api/connections/webhooks';
import raphaelRouter from './api/raphael';
import iotRouter from './api/connections/iot_webhooks';
import { isSchedulerEnabled, startScheduler } from './workers/scheduler';
import prisma from './lib/prisma';

const app = express();

app.use(cors());
// Bug #10: Capture raw body for webhook signature verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// JWT authentication middleware
app.use(async (req, res, next) => {
  // Allow DEMO_MODE for local development when explicitly enabled
  if (process.env.DEMO_MODE === 'true') {
    req.user = { id: 'demo-user-001' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server authentication not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: user.id };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
});

app.use('/api', terraRouter);
app.use('/api', bridgesRouter);
app.use('/api', webhooksRouter);
app.use('/api', raphaelRouter);
app.use('/api/iot', iotRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'raphael-production' });
});

const PORT = process.env.PORT || 3001;

let schedulerWorkers: ReturnType<typeof startScheduler> = null;

app.listen(PORT, () => {
  console.log(`Raphael Production API running on port ${PORT}`);
  console.log('Prisma connected to database');

  if (process.env.NODE_ENV !== 'development' && isSchedulerEnabled()) {
    schedulerWorkers = startScheduler();
    console.log('Scheduler started');
  } else if (process.env.NODE_ENV !== 'development') {
    console.log('Scheduler disabled: REDIS_URL is not configured');
  }
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Close BullMQ workers if they were started
  if (schedulerWorkers) {
    await schedulerWorkers.scheduleWorker.close();
    await schedulerWorkers.runWorker.close();
    console.log('BullMQ workers closed');
  }

  await prisma.$disconnect();
  process.exit(0);
});

export default app;
