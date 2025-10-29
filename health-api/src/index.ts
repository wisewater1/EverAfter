import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { connectDatabase } from './utils/db.js';
import { logger } from './utils/logger.js';
import { authMiddleware } from './middleware/auth.js';
import connectionsRouter from './routes/connections.js';
import metricsRouter from './routes/metrics.js';
import {
  createSyncWorker,
  createTokenRefreshWorker,
  scheduleTokenRefreshChecks,
} from './services/queue.js';
import { processSyncJob } from './services/sync-service.js';
import { processTokenRefresh, checkExpiringTokens } from './services/token-refresh-service.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'raphael-health-connect-api',
    version: '1.0.0',
  });
});

// API info
app.get('/', (req, res) => {
  res.json({
    name: 'Raphael Health Connect API',
    version: '1.0.0',
    description: 'Unified API for 14+ health service integrations',
    providers: {
      implemented: ['TERRA', 'OURA', 'FITBIT', 'DEXCOM', 'STRAVA'],
      comingSoon: [
        'WHOOP', 'GARMIN', 'WITHINGS', 'POLAR', 'GOOGLE_FIT',
        'ABBOTT_LIBRE', 'VALIDIC', 'HUMAN_API', 'METRIPORT', 'ROOK', 'SPIKE',
      ],
      mobileBridges: ['APPLE_HEALTH', 'SAMSUNG_HEALTH'],
    },
    documentation: process.env.ENABLE_SWAGGER_UI === 'true' ? '/docs' : 'Contact admin',
    endpoints: {
      connections: '/api/connections',
      metrics: '/api/metrics',
      webhooks: '/webhooks',
    },
  });
});

// API routes (authenticated)
app.use('/api/connections', authMiddleware, connectionsRouter);
app.use('/api/metrics', authMiddleware, metricsRouter);

// Swagger documentation
if (process.env.ENABLE_SWAGGER_UI === 'true') {
  const swaggerDocument = {
    openapi: '3.0.0',
    info: {
      title: 'Raphael Health Connect API',
      version: '1.0.0',
      description: 'Unified health data integration API supporting 14+ providers',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:4000',
        description: 'API server',
      },
    ],
  };

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
async function start() {
  try {
    // Connect to database
    await connectDatabase();

    // Start background workers
    if (process.env.NODE_ENV !== 'test') {
      logger.info('Starting background workers...');

      createSyncWorker(processSyncJob);
      createTokenRefreshWorker(processTokenRefresh);

      // Schedule recurring jobs
      await scheduleTokenRefreshChecks();

      logger.info('Background workers started');
    }

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 Raphael Health Connect API started on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`📚 API docs: http://localhost:${PORT}/docs`);
      logger.info(`🔗 Providers: Terra, Oura, Fitbit, Dexcom, Strava (+ 9 more coming soon)`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

start();
