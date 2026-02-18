// ── Inter-Saint Communication Bridge ───────────────────────
// Central event bus that allows saints to communicate seamlessly.
// St. Michael monitors all events for security. St. Joseph emits
// family changes. St. Raphael emits health data access events.

export interface SaintEvent {
    id: string;
    from: string;       // 'joseph' | 'michael' | 'raphael' | 'system'
    to: string;         // target saint or 'all'
    type: string;       // event type
    payload: Record<string, unknown>;
    timestamp: string;
}

export interface SaintStatus {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'warning';
    lastActivity: string;
    activeAgents: number;
    securityLevel: 'green' | 'yellow' | 'red';
}

type EventHandler = (event: SaintEvent) => void;

// ── In-memory event log + subscribers ──────────────────────

const EVENT_LOG_KEY = 'everafter_saint_events';
const MAX_LOG_SIZE = 100;

let _handlers: Map<string, EventHandler[]> = new Map();

function loadEventLog(): SaintEvent[] {
    try {
        const stored = localStorage.getItem(EVENT_LOG_KEY);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
}

function saveEventLog(events: SaintEvent[]): void {
    localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(events.slice(-MAX_LOG_SIZE)));
}

// ── Public API ─────────────────────────────────────────────

export function emitSaintEvent(event: Omit<SaintEvent, 'id' | 'timestamp'>): SaintEvent {
    const full: SaintEvent = {
        ...event,
        id: `se_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
    };

    // Persist to log
    const log = loadEventLog();
    log.push(full);
    saveEventLog(log);

    // Notify subscribers
    const targetHandlers = _handlers.get(event.to) || [];
    const allHandlers = _handlers.get('all') || [];
    [...targetHandlers, ...allHandlers].forEach(h => {
        try { h(full); } catch (e) { console.error('Saint bridge handler error:', e); }
    });

    // Michael always gets a copy (security monitoring)
    if (event.to !== 'michael' && event.from !== 'michael') {
        const michaelHandlers = _handlers.get('michael') || [];
        michaelHandlers.forEach(h => {
            try { h(full); } catch (e) { console.error('Michael bridge handler error:', e); }
        });
    }

    return full;
}

export function onSaintEvent(saintId: string, handler: EventHandler): () => void {
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
    return onSaintEvent('all', handler);
}

export function getEventLog(filter?: { from?: string; to?: string; type?: string }): SaintEvent[] {
    const log = loadEventLog();
    if (!filter) return log;
    return log.filter(e => {
        if (filter.from && e.from !== filter.from) return false;
        if (filter.to && e.to !== filter.to) return false;
        if (filter.type && e.type !== filter.type) return false;
        return true;
    });
}

export function getSaintStatuses(): SaintStatus[] {
    const now = new Date().toISOString();
    const log = loadEventLog();

    const lastEvent = (saint: string) => {
        const events = log.filter(e => e.from === saint);
        return events.length > 0 ? events[events.length - 1].timestamp : now;
    };

    // Count active Joseph agents
    let josephAgents = 0;
    try {
        const members = localStorage.getItem('everafter_family_members');
        if (members) {
            josephAgents = JSON.parse(members).filter((m: any) => m.aiPersonality?.isActive).length;
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
    ];
}

// ── Pre-built Event Types ──────────────────────────────────

export const SAINT_EVENT_TYPES = {
    // Joseph events
    MEMBER_ADDED: 'member_added',
    MEMBER_UPDATED: 'member_updated',
    AGENT_CREATED: 'agent_created',
    AGENT_DEACTIVATED: 'agent_deactivated',

    // Michael events
    SECURITY_ALERT: 'security_alert',
    SCAN_COMPLETE: 'scan_complete',
    THREAT_DETECTED: 'threat_detected',
    COMPLIANCE_CHECK: 'compliance_check',

    // Raphael events
    HEALTH_DATA_ACCESSED: 'health_data_accessed',
    HEALTH_PREDICTION: 'health_prediction',

    // System events
    SYSTEM_STARTUP: 'system_startup',
    SYSTEM_ERROR: 'system_error',
} as const;
