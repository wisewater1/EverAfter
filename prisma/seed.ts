import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const user = await prisma.user.upsert({
    where: { email: 'demo@everafter.com' },
    update: {},
    create: {
      id: 'demo-user-001',
      email: 'demo@everafter.com',
      name: 'Demo User',
    },
  });

  console.log('✅ Created user:', user.email);

  const consent = await prisma.consent.upsert({
    where: { id: 'demo-consent-train' },
    update: {},
    create: {
      id: 'demo-consent-train',
      userId: user.id,
      role: 'raphael',
      purpose: 'train',
      interactionCap: 1000,
    },
  });

  console.log('✅ Created consent for training');

  await prisma.emergencyContact.upsert({
    where: { id: 'demo-emergency-001' },
    update: {},
    create: {
      id: 'demo-emergency-001',
      userId: user.id,
      name: 'Dr. Sarah Johnson',
      email: 'dr.johnson@example.com',
      phone: '+1-555-0100',
      relation: 'Primary Care Physician',
    },
  });

  console.log('✅ Created emergency contact');

  if (process.env.MOCK_PROVIDERS === '1') {
    console.log('🎭 Mock mode enabled - seeding demo data...');

    const source = await prisma.source.create({
      data: {
        id: 'demo-source-terra',
        userId: user.id,
        provider: 'TERRA',
        externalUserId: 'mock-terra-user-123',
        scopes: ['health', 'activity', 'sleep'],
        connectedAt: new Date(),
        lastSyncAt: new Date(),
      },
    });

    const device = await prisma.device.create({
      data: {
        id: 'demo-device-001',
        sourceId: source.id,
        providerDeviceId: 'fitbit-versa-3',
        name: 'Fitbit Versa 3',
        model: 'Versa 3',
        manufacturer: 'Fitbit',
      },
    });

    const now = new Date();
    const metrics = [];

    for (let day = 7; day >= 0; day--) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(12, 0, 0, 0);

      metrics.push({
        sourceId: source.id,
        deviceId: device.id,
        type: 'HEART_RATE',
        ts: date,
        value: 65 + Math.random() * 15,
        unit: 'bpm',
        payload: {},
      });

      metrics.push({
        sourceId: source.id,
        deviceId: device.id,
        type: 'HRV',
        ts: date,
        value: 45 + Math.random() * 25,
        unit: 'ms',
        payload: {},
      });

      metrics.push({
        sourceId: source.id,
        deviceId: device.id,
        type: 'STEPS',
        ts: date,
        value: 6000 + Math.random() * 6000,
        unit: 'steps',
        payload: {},
      });

      metrics.push({
        sourceId: source.id,
        deviceId: device.id,
        type: 'SLEEP_DURATION',
        ts: date,
        value: 6.5 + Math.random() * 2,
        unit: 'hours',
        payload: {},
      });
    }

    await prisma.metric.createMany({
      data: metrics,
    });

    console.log(`✅ Created ${metrics.length} mock metrics`);

    await prisma.engramEntry.create({
      data: {
        userId: user.id,
        kind: 'raphael-insight',
        text: 'Your heart rate variability has been gradually improving over the past week, indicating better stress management. The correlation with your consistent sleep schedule suggests these lifestyle adjustments are working well.',
        tags: ['hrv', 'sleep', 'trend-positive'],
        metadata: {
          avgHRV: 58.3,
          avgSleep: 7.4,
          confidence: 0.87,
        },
      },
    });

    console.log('✅ Created sample insight engram');

    await prisma.agentRun.create({
      data: {
        userId: user.id,
        agentId: 'raphael.healer.v1',
        status: 'completed',
        tokensUsed: 1245,
        costCents: 0,
        steps: {
          fetchedMetrics: 28,
          generatedInsights: 3,
          wroteEngrams: 1,
        },
        startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 8500),
      },
    });

    console.log('✅ Created sample agent run');
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
