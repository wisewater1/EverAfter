import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

import terraRouter from './api/connections/terra';
import bridgesRouter from './api/connections/bridges';
import webhooksRouter from './api/connections/webhooks';
import raphaelRouter from './api/raphael';
import iotRouter from './api/connections/iot_webhooks';
import { startScheduler } from './workers/scheduler';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.user = { id: 'demo-user-001' };
  next();
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

app.listen(PORT, () => {
  console.log(`🚀 Raphael Production API running on port ${PORT}`);
  console.log(`📊 Prisma connected to database`);

  if (process.env.NODE_ENV !== 'development') {
    startScheduler();
    console.log('⏰ Scheduler started');
  }
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
