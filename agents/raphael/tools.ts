import { PrismaClient, Metric, MetricType } from '@prisma/client';
import { checkConsent } from '../../server/lib/consent';
import { createAuditLog } from '../../server/lib/audit';

const prisma = new PrismaClient();

interface FetchMetricsParams {
  userId: string;
  types: string[];
  from: Date;
  to: Date;
}

export async function fetchMetrics(
  params: FetchMetricsParams
): Promise<Metric[]> {
  const sources = await prisma.source.findMany({
    where: { userId: params.userId },
    select: { id: true },
  });

  if (sources.length === 0) {
    return [];
  }

  const sourceIds = sources.map((s) => s.id);

  const metrics = await prisma.metric.findMany({
    where: {
      sourceId: { in: sourceIds },
      type: { in: params.types as MetricType[] },
      ts: {
        gte: params.from,
        lte: params.to,
      },
    },
    orderBy: { ts: 'asc' },
  });

  return metrics;
}

interface WriteEngramParams {
  userId: string;
  kind: string;
  text: string;
  tags: string[];
  metadata?: any;
}

export async function writeEngram(
  params: WriteEngramParams
): Promise<{ id: string }> {
  const hasConsent = await checkConsent(params.userId, 'train');

  if (!hasConsent) {
    throw new Error('User consent required for vault writing');
  }

  const engram = await prisma.engramEntry.create({
    data: {
      userId: params.userId,
      kind: params.kind,
      text: params.text,
      tags: params.tags,
      metadata: params.metadata || {},
    },
  });

  await createAuditLog({
    userId: params.userId,
    action: 'vault.engram.created',
    metadata: {
      engramId: engram.id,
      kind: params.kind,
    },
  });

  return { id: engram.id };
}

interface NotifyParams {
  userId?: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
}

export async function notify(params: NotifyParams): Promise<void> {
  console.log(`🔔 Notification [${params.severity}]: ${params.title}`);
  console.log(`   ${params.body}`);

  if (params.userId) {
    await createAuditLog({
      userId: params.userId,
      action: 'alert.sent',
      metadata: {
        title: params.title,
        severity: params.severity,
      },
    });
  }
}
