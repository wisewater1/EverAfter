import { z } from 'zod';

// ── CORES: The Divine Protocol Envelope ──────────────────────────────────────

export const SaintIDSchema = z.enum([
    'michael',
    'raphael',
    'gabriel',
    'joseph',
    'anthony',
    'martin',
    'agatha',
    'system',
]);

export type SaintID = z.infer<typeof SaintIDSchema>;

export const UrgencySchema = z.enum(['low', 'normal', 'high', 'critical']);

export const SaintEventEnvelopeSchema = z.object({
    id: z.string().uuid(),
    timestamp: z.string().datetime(),
    source: SaintIDSchema,
    target: z.union([SaintIDSchema, z.literal('all'), z.literal('broadcast')]),
    topic: z.string(),
    confidence: z.number().min(0).max(1).default(1.0),
    payload: z.record(z.unknown()), // Specialized by sub-schemas
    metadata: z.object({
        correlationId: z.string().optional(),
        urgency: UrgencySchema.default('normal'),
        requiresAck: z.boolean().optional(),
    }).optional(),
});

export type SaintEventEnvelope = z.infer<typeof SaintEventEnvelopeSchema>;


// ── DOMAIN: St. Michael (Security) ───────────────────────────────────────────

export const SecurityThreatLevelSchema = z.enum(['green', 'yellow', 'red', 'black']);

export const SecurityEventPayloads = {
    ThreatDetected: z.object({
        threatType: z.string(), // e.g., 'unauthorized_access', 'data_leak'
        severity: SecurityThreatLevelSchema,
        resourceId: z.string().optional(),
        description: z.string(),
    }),
    AccessAudit: z.object({
        accessorId: z.string(),
        resource: z.string(),
        action: z.enum(['read', 'write', 'delete']),
        status: z.enum(['granted', 'denied']),
    }),
};


// ── DOMAIN: St. Raphael (Health) ─────────────────────────────────────────────

export const HealthEventPayloads = {
    HealthMetricUpdate: z.object({
        metricType: z.enum(['heart_rate', 'sleep', 'steps', 'stress_level']),
        value: z.number(),
        unit: z.string(),
        trend: z.enum(['improving', 'stable', 'declining']).optional(),
    }),
    HealthIntervention: z.object({
        reason: z.string(),
        recommendation: z.string(),
        priority: UrgencySchema,
    }),
};


// ── DOMAIN: St. Joseph (Family) ──────────────────────────────────────────────

export const FamilyEventPayloads = {
    GenealogyUpdate: z.object({
        memberId: z.string(),
        updateType: z.enum(['birth', 'death', 'marriage', 'role_change']),
        description: z.string(),
    }),
    ActivitySuggestion: z.object({
        title: z.string(),
        description: z.string(),
        participants: z.array(z.string()), // memberIds
        reason: z.string(),
    }),
};


// ── DOMAIN: St. Gabriel (Finance) ────────────────────────────────────────────

export const FinanceEventPayloads = {
    BudgetAnomaly: z.object({
        category: z.string(),
        spent: z.number(),
        limit: z.number(),
        variance: z.number(),
    }),
    InvestmentOpportunity: z.object({
        asset: z.string(),
        action: z.enum(['buy', 'sell', 'hold']),
        confidence: z.number(),
        reasoning: z.string(),
    }),
};


// ── DOMAIN: St. Anthony (Audit/Memory) ───────────────────────────────────────

export const AuditEventPayloads = {
    ItemLost: z.object({
        itemName: z.string(),
        lastSeenLocation: z.string().optional(),
        lastSeenTime: z.string().datetime().optional(),
    }),
    SystemIntegrityCheck: z.object({
        component: z.string(),
        status: z.enum(['pass', 'fail', 'warn']),
        details: z.string().optional(),
    }),
};

// ── UTILS: Factory ───────────────────────────────────────────────────────────

export function createSaintEvent<T extends Record<string, unknown>>(
    source: SaintID,
    target: SaintID | 'broadcast',
    topic: string,
    payload: T,
    options?: {
        urgency?: z.infer<typeof UrgencySchema>;
        confidence?: number;
        correlationId?: string;
    }
): SaintEventEnvelope {
    return {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        source,
        target,
        topic,
        confidence: options?.confidence ?? 1.0,
        payload,
        metadata: {
            urgency: options?.urgency || 'normal',
            correlationId: options?.correlationId,
        },
    };
}
