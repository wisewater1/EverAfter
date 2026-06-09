import { PrismaClient, Provider } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface AuditLogParams {
  userId?: string;
  action: string;
  provider?: Provider;
  snapshotId?: string;
  consentId?: string;
  metadata?: any;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  let sha256: string | undefined;

  if (params.metadata) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(params.metadata));
    sha256 = hash.digest('hex');
  }

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      provider: params.provider,
      snapshotId: params.snapshotId,
      consentId: params.consentId,
      sha256,
      metadata: params.metadata || {},
    },
  });
}

export async function getAuditTrail(
  userId: string,
  options: {
    action?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  } = {}
) {
  return prisma.auditLog.findMany({
    where: {
      userId,
      ...(options.action && { action: options.action }),
      ...(options.from && { ts: { gte: options.from } }),
      ...(options.to && { ts: { lte: options.to } }),
    },
    orderBy: { ts: 'desc' },
    take: options.limit || 100,
  });
}
