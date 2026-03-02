// ── Inter-Saint Communication Bridge ───────────────────────
// Central event bus that allows saints to communicate seamlessly.
// NOW UPGRADED to use the "Divine Protocol" (SEP).

import {
    SaintEventEnvelope,
    SaintID,
    createSaintEvent,
    SaintEventEnvelopeSchema
} from './saints/sep';

export type { SaintEventEnvelope, SaintID };

export interface SaintStatus {
    id: SaintID;
    name: string;
    status: 'online' | 'offline' | 'warning';
    lastActivity: string;
    activeAgents: number;
    securityLevel: 'green' | 'yellow' | 'red';
}

type EventHandler = (event: SaintEventEnvelope) => void;

// ── In-memory event log + subscribers ──────────────────────

const EVENT_LOG_KEY = 'everafter_saint_events_v2';
const MAX_LOG_SIZE = 100;
const CHANNEL_NAME = 'everafter_divine_protocol';

let _handlers: Map<string, EventHandler[]> = new Map();
let _channel: BroadcastChannel | null = null;
let _heartbeatInterval: any = null;

// Initialize BroadcastChannel for cross-tab sync
if (typeof window !== 'undefined' && window.BroadcastChannel) {
    _channel = new BroadcastChannel(CHANNEL_NAME);
    _channel.onmessage = (event) => {
        const envelope = event.data as SaintEventEnvelope;
        // Validate and trigger handlers locally (avoiding infinite loop)
        processIncomingEvent(envelope, { remote: true });
    };
}

function loadEventLog(): SaintEventEnvelope[] {
    try {
        const stored = localStorage.getItem(EVENT_LOG_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        }
    } catch { /* ignore */ }
    return [];
}

function saveEventLog(events: SaintEventEnvelope[]): void {
    // Deduplicate by ID before saving
    const unique = Array.from(new Map(events.map(e => [e.id, e])).values());
    localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(unique.slice(-MAX_LOG_SIZE)));
}

/**
 * Internal processor to handle events from both local and remote sources.
 */
function processIncomingEvent(envelope: SaintEventEnvelope, options: { remote?: boolean } = {}) {
    const log = loadEventLog();

    // Deduplication check
    if (log.some(e => e.id === envelope.id)) return;

    // Persist to log
    log.push(envelope);
    saveEventLog(log);

    // Notify subscribers
    const finalTarget = envelope.target;

    // 1. Target specific
    const targetHandlers = _handlers.get(finalTarget) || [];
    // 2. Broadcast listeners
    const broadcastHandlers = _handlers.get('broadcast') || [];
    // 3. Legacy 'all' listeners
    const allHandlers = _handlers.get('all') || [];

    [...targetHandlers, ...broadcastHandlers, ...allHandlers].forEach(h => {
        try { h(envelope); } catch (e) { console.error('Saint bridge handler error:', e); }
    });

    // Cross-Tab Propagation
    if (!options.remote && _channel) {
        _channel.postMessage(envelope);
    }
}

// ── Public API ─────────────────────────────────────────────

/**
 * Emits a standardized Saint Event.
 * @param event Partial event data. ID and Timestamp are auto-generated.
 */
export function emitSaintEvent<T extends Record<string, unknown>>(
    source: SaintID,
    target: SaintID | 'broadcast' | 'all',
    topic: string,
    payload: T,
    options?: { confidence?: number; urgency?: 'low' | 'normal' | 'high' | 'critical' }
): SaintEventEnvelope {

    // Normalize 'all' to 'broadcast' for new protocol
    const finalTarget = target === 'all' ? 'broadcast' : target;

    const fullEvent = createSaintEvent(source, finalTarget, topic, payload, options);

    // Validate schema (optional runtime check, good for debugging)
    const result = SaintEventEnvelopeSchema.safeParse(fullEvent);
    if (!result.success) {
        console.error("Divine Protocol Violation:", result.error);
    }

    processIncomingEvent(fullEvent, { remote: false });

    return fullEvent;
}

/**
 * Starts an active heartbeat system to keep Saint statuses fresh.
 */
export function startSaintHeartbeat(intervalMs: number = 30000) {
    if (_heartbeatInterval) return;

    // Initial heartbeat
    emitSaintEvent('system', 'broadcast', SAINT_EVENT_TYPES.SYSTEM_STARTUP, { status: 'healthy' });

    _heartbeatInterval = setInterval(() => {
        emitSaintEvent('michael', 'broadcast', 'system/heartbeat', {
            timestamp: new Date().toISOString(),
            load: Math.random() // Simulating load
        });
    }, intervalMs);
}

export function stopSaintHeartbeat() {
    if (_heartbeatInterval) {
        clearInterval(_heartbeatInterval);
        _heartbeatInterval = null;
    }
}

export function onSaintEvent(saintId: SaintID | 'broadcast' | 'all', handler: EventHandler): () => void {
    if (!_handlers.has(saintId)) _handlers.set(saintId, []);
    _handlers.get(saintId)!.push(handler);

    // Return unsubscribe function
    return () => {
        const handlers = _handlers.get(saintId);
        if (handlers) {
            const idx = handlers.indexOf(handler);
            if (idx !== -1) handlers.splice(idx, 1);
        }
    };
}

export function subscribeToSaintEvents(handler: EventHandler): () => void {
    return onSaintEvent('broadcast', handler);
}

export function getEventLog(filter?: { from?: string; to?: string; type?: string }): SaintEventEnvelope[] {
    const log = loadEventLog();
    if (!filter) return log;
    return log.filter(e => {
        if (filter.from && e.source !== filter.from) return false;
        if (filter.to && e.target !== filter.to) return false;
        if (filter.type && e.topic !== filter.type) return false;
        return true;
    });
}

export function getSaintStatuses(): SaintStatus[] {
    const now = new Date().toISOString();
    const log = loadEventLog();

    const lastEvent = (saint: string) => {
        const events = log.filter(e => e.source === saint);
        return events.length > 0 ? events[events.length - 1].timestamp : now;
    };

    // Count active Joseph agents
    let josephAgents = 0;
    try {
        const members = localStorage.getItem('everafter_family_members');
        if (members) {
            const parsed = JSON.parse(members);
            if (Array.isArray(parsed)) {
                josephAgents = parsed.filter((m: any) => m.aiPersonality?.isActive).length;
            }
        }
    } catch { /* */ }

    return [
        {
            id: 'joseph',
            name: 'St. Joseph',
            status: 'online',
            lastActivity: lastEvent('joseph'),
            activeAgents: josephAgents,
            securityLevel: 'green',
        },
        {
            id: 'michael',
            name: 'St. Michael',
            status: 'online',
            lastActivity: lastEvent('michael'),
            activeAgents: 1, // Michael itself
            securityLevel: 'green',
        },
        {
            id: 'raphael',
            name: 'St. Raphael',
            status: 'online',
            lastActivity: lastEvent('raphael'),
            activeAgents: 1,
            securityLevel: 'green',
        },
        {
            id: 'anthony',
            name: 'St. Anthony',
            status: 'online',
            lastActivity: lastEvent('anthony'),
            activeAgents: 1,
            securityLevel: 'green',
        },
        {
            id: 'gabriel',
            name: 'St. Gabriel',
            status: 'online',
            lastActivity: lastEvent('gabriel'),
            activeAgents: 4, // Gabriel + 3 Council Members
            securityLevel: 'green',
        },
    ];
}

// ── Pre-built Event Types (Legacy Mapped to New Topics) ────

export const SAINT_EVENT_TYPES = {
    // Joseph events
    MEMBER_ADDED: 'family/member_added',
    MEMBER_UPDATED: 'family/member_updated',
    AGENT_CREATED: 'family/agent_created',
    AGENT_DEACTIVATED: 'family/agent_deactivated',

    // Michael events
    SECURITY_ALERT: 'security/alert',
    SCAN_COMPLETE: 'security/scan_complete',
    THREAT_DETECTED: 'security/threat_detected',
    COMPLIANCE_CHECK: 'security/compliance_check',

    // Raphael events
    HEALTH_DATA_ACCESSED: 'health/data_accessed',
    HEALTH_PREDICTION: 'health/prediction',

    // Anthony events
    AUDIT_FLAG: 'audit/flag',
    INTEGRITY_CHECK: 'audit/integrity_check',
    ITEM_FOUND: 'audit/item_found',

    // Gabriel events
    BUDGET_ANOMALY: 'finance/budget_anomaly',
    COUNCIL_DECISION: 'finance/council_decision',

    // Cross-Saint
    CROSS_SAINT_ALERT: 'system/cross_saint_alert',

    // System events
    SYSTEM_STARTUP: 'system/startup',
    SYSTEM_ERROR: 'system/error',
    SYSTEM_HEARTBEAT: 'system/heartbeat',
} as const;

