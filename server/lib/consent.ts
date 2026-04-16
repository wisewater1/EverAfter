import prisma from './prisma';

export async function checkConsent(
  userId: string,
  purpose: string
): Promise<boolean> {
  // Bug #20 fix: Use atomic SQL UPDATE with a WHERE clause that checks
  // usageCount < interactionCap in the same statement, eliminating the
  // race condition between checking and incrementing.
  const now = new Date();

  // Atomically increment usageCount only if consent is valid and under cap
  // (or has no cap). The WHERE clause makes this a single atomic operation.
  // Use a subquery with LIMIT 1 since PostgreSQL doesn't support LIMIT in UPDATE directly.
  const updatedCount: number = await prisma.$executeRaw`
    UPDATE "Consent"
    SET "usageCount" = "usageCount" + 1
    WHERE "id" = (
      SELECT "id" FROM "Consent"
      WHERE "userId" = ${userId}
        AND "purpose" = ${purpose}
        AND "revokedAt" IS NULL
        AND ("expiresAt" IS NULL OR "expiresAt" > ${now})
        AND ("interactionCap" IS NULL OR "usageCount" < "interactionCap")
      LIMIT 1
    )
  `;

  return updatedCount > 0;
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
