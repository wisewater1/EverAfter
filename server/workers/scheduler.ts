import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { runRaphael } from '../../agents/raphael/runner';
import manifest from '../../agents/raphael/manifest.json';

const prisma = new PrismaClient();

const redisConnection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
};

const agentScheduleQueue = new Queue('agent:schedule', {
  connection: redisConnection,
});

const agentRunQueue = new Queue('agent:run', {
  connection: redisConnection,
});

export function startScheduler() {
  const scheduleWorker = new Worker(
    'agent:schedule',
    async (job) => {
      console.log(`⏰ Processing scheduled job: ${job.name}`);

      const users = await prisma.user.findMany({
        select: { id: true, email: true },
      });

      for (const user of users) {
        const consents = await prisma.consent.findMany({
          where: {
            userId: user.id,
            purpose: { in: ['train', 'project'] },
            revokedAt: null,
          },
        });

        if (consents.length === 0) {
          console.log(
            `⏭️  Skipping ${user.email} - no active consent for autonomous runs`
          );
          continue;
        }

        await agentRunQueue.add(
          `raphael-${user.id}`,
          {
            userId: user.id,
            manual: false,
          },
          {
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          }
        );

        console.log(`✅ Queued Raphael run for ${user.email}`);
      }
    },
    { connection: redisConnection }
  );

  const runWorker = new Worker(
    'agent:run',
    async (job) => {
      console.log(`🤖 Running Raphael for user ${job.data.userId}`);

      try {
        const result = await runRaphael({
          userId: job.data.userId,
          lookbackDays: 3,
          manual: job.data.manual || false,
        });

        console.log(
          `✅ Raphael completed: ${result.insights.length} insights, ${result.engramsCreated} engrams`
        );

        return result;
      } catch (error) {
        console.error('❌ Raphael run failed:', error);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  agentScheduleQueue.add(
    'daily-raphael',
    {},
    {
      repeat: {
        pattern: manifest.capabilities.scheduleDefault,
      },
    }
  );

  console.log(
    `📅 Scheduler started with cron: ${manifest.capabilities.scheduleDefault}`
  );

  scheduleWorker.on('completed', (job) => {
    console.log(`✅ Schedule job ${job.id} completed`);
  });

  scheduleWorker.on('failed', (job, err) => {
    console.error(`❌ Schedule job ${job?.id} failed:`, err.message);
  });

  runWorker.on('completed', (job) => {
    console.log(`✅ Run job ${job.id} completed`);
  });

  runWorker.on('failed', (job, err) => {
    console.error(`❌ Run job ${job?.id} failed:`, err.message);
  });

  return { scheduleWorker, runWorker };
}
