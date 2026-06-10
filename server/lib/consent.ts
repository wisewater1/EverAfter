import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function checkConsent(
  userId: string,
  purpose: string
): Promise<boolean> {
  const consent = await prisma.consent.findFirst({
    where: {
      userId,
      purpose,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!consent) {
    return false;
  }

  if (
    consent.interactionCap !== null &&
    consent.usageCount >= consent.interactionCap
  ) {
    return false;
  }

  await prisma.consent.update({
    where: { id: consent.id },
    data: { usageCount: { increment: 1 } },
  });

  return true;
}

export async function grantConsent(
  userId: string,
  purpose: string,
  options: {
    role?: string;
    expiresAt?: Date;
    interactionCap?: number;
  } = {}
): Promise<{ id: string }> {
  const consent = await prisma.consent.create({
    data: {
      userId,
      role: options.role || 'agent',
      purpose,
      expiresAt: options.expiresAt,
      interactionCap: options.interactionCap,
    },
  });

  return { id: consent.id };
}

export async function revokeConsent(consentId: string): Promise<void> {
  await prisma.consent.update({
    where: { id: consentId },
    data: { revokedAt: new Date() },
  });
}

export async function listConsents(userId: string) {
  return prisma.consent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}
