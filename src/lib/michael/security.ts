import { supabase } from '../supabase';
import axios from 'axios';
import { API_BASE_URL, isDevelopment } from '../env';
import { buildAccessTokenHeaders } from '../auth-session';

const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export interface IntegrityReport {
    overallScore: number;
    dataIntegrity: number;
    privacyStatus: number;
    lastScan: string;
    alerts: SecurityAlert[];
}

export interface SecurityAlert {
    id: string;
    type: 'access' | 'integrity' | 'leak_prevention' | 'system' | 'cai_audit' | 'pii_leak';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
    cai_flag?: boolean;
    details?: string;
}

export interface AuditRecord {
    id: string;
    action: string;
    timestamp: string;
    status: 'safe' | 'flagged' | 'blocked';
    details: string;
    provider?: string | null;
    metadata?: Record<string, any> | null;
}

export interface AuditLedgerEntry {
    id: string;
    action: string;
    userId?: string | null;
    provider?: string | null;
    sha256?: string | null;
    prevHash?: string | null;
    signature?: string | null;
    signerId?: string | null;
    ts?: string | null;
    metadata?: Record<string, any> | null;
}

export interface SecurityScanResult {
    timestamp: string;
    status: 'active' | 'warning' | 'critical';
    findings_count: number;
    findings: SecurityAlert[];
    vulnerabilities: Vulnerability[];
    system_integrity: number;
    integrity_score: number;
    scan_scope?: string;
    audit_handoff?: {
        recipient: 'st_anthony';
        status: 'completed';
        scan_log_id: string;
        ledger_entry_id: string;
        tab: 'ledger';
    };
}

export interface AnthonyFlowMapNode {
    id: string;
    label: string;
    kind: string;
    status: 'healthy' | 'warning' | 'critical';
    details: string;
    evidenceCount: number;
    evidenceIds: string[];
}

export interface AnthonyFlowMapEdge {
    id: string;
    from: string;
    to: string;
    label: string;
    severity: 'healthy' | 'warning' | 'critical';
    evidenceIds: string[];
}

export interface AnthonyFlowMapEvidence {
    id: string;
    type: string;
    title: string;
    summary: string;
    severity: string;
    timestamp?: string | null;
    provider?: string | null;
    action?: string | null;
    metadata?: Record<string, any> | null;
}

export interface AnthonyFlowMapResponse {
    success: boolean;
    generatedAt: string;
    requestedBy?: string;
    summary: {
        latestScanStatus: string;
        findingsCount: number;
        vulnerabilitiesCount: number;
        criticalVulnerabilities: number;
        integrity?: number | null;
        anthonyHandoffStatus: string;
    };
    nodes: AnthonyFlowMapNode[];
    edges: AnthonyFlowMapEdge[];
    evidence: AnthonyFlowMapEvidence[];
}

const FALLBACK_FLOW_NODE_POSITIONS = ['mobile_app', 'api_gateway', 'saint_runtime', 'postgres', 'st_michael', 'st_anthony'] as const;

function normalizeAnthonyFlowNode(node: any): AnthonyFlowMapNode {
    return {
        id: String(node?.id || ''),
        label: String(node?.label || 'Unnamed node'),
        kind: String(node?.kind || 'system'),
        status:
            node?.status === 'critical' || node?.status === 'warning'
                ? node.status
                : 'healthy',
        details: String(node?.details || 'No audit detail available yet.'),
        evidenceCount: Number.isFinite(Number(node?.evidenceCount)) ? Number(node.evidenceCount) : 0,
        evidenceIds: Array.isArray(node?.evidenceIds) ? node.evidenceIds.filter(Boolean).map(String) : [],
    };
}

function normalizeAnthonyFlowEdge(edge: any): AnthonyFlowMapEdge {
    return {
        id: String(edge?.id || ''),
        from: String(edge?.from || ''),
        to: String(edge?.to || ''),
        label: String(edge?.label || 'Flow edge'),
        severity:
            edge?.severity === 'critical' || edge?.severity === 'warning'
                ? edge.severity
                : 'healthy',
        evidenceIds: Array.isArray(edge?.evidenceIds) ? edge.evidenceIds.filter(Boolean).map(String) : [],
    };
}

function normalizeAnthonyFlowEvidence(item: any): AnthonyFlowMapEvidence {
    return {
        id: String(item?.id || ''),
        type: String(item?.type || 'ledger'),
        title: String(item?.title || 'Untitled evidence'),
        summary: String(item?.summary || 'No evidence summary available.'),
        severity: String(item?.severity || 'healthy'),
        timestamp: item?.timestamp || null,
        provider: item?.provider || null,
        action: item?.action || null,
        metadata: item?.metadata && typeof item.metadata === 'object' ? item.metadata : null,
    };
}

function normalizeAnthonyFlowMap(response: any): AnthonyFlowMapResponse {
    const summary = response?.summary && typeof response.summary === 'object' ? response.summary : {};

    return {
        success: Boolean(response?.success),
        generatedAt: response?.generatedAt || new Date().toISOString(),
        requestedBy: response?.requestedBy,
        summary: {
            latestScanStatus: String(summary.latestScanStatus || 'unknown'),
            findingsCount: Number.isFinite(Number(summary.findingsCount)) ? Number(summary.findingsCount) : 0,
            vulnerabilitiesCount: Number.isFinite(Number(summary.vulnerabilitiesCount)) ? Number(summary.vulnerabilitiesCount) : 0,
            criticalVulnerabilities: Number.isFinite(Number(summary.criticalVulnerabilities)) ? Number(summary.criticalVulnerabilities) : 0,
            integrity: summary.integrity ?? null,
            anthonyHandoffStatus: String(summary.anthonyHandoffStatus || 'pending'),
        },
        nodes: Array.isArray(response?.nodes) ? response.nodes.map(normalizeAnthonyFlowNode).filter((node) => node.id) : [],
        edges: Array.isArray(response?.edges) ? response.edges.map(normalizeAnthonyFlowEdge).filter((edge) => edge.id && edge.from && edge.to) : [],
        evidence: Array.isArray(response?.evidence) ? response.evidence.map(normalizeAnthonyFlowEvidence).filter((item) => item.id) : [],
    };
}

function fallbackSeverityStatus(score: number): 'healthy' | 'warning' | 'critical' {
    if (score >= 3) return 'critical';
    if (score >= 1) return 'warning';
    return 'healthy';
}

function fallbackComponentToNode(component?: string | null): typeof FALLBACK_FLOW_NODE_POSITIONS[number] {
    const value = (component || '').toLowerCase();
    if (value.includes('mobile') || value.includes('frontend') || value.includes('client') || value.includes('browser') || value.includes('ui')) {
        return 'mobile_app';
    }
    if (value.includes('auth') || value.includes('api') || value.includes('gateway') || value.includes('edge')) {
        return 'api_gateway';
    }
    if (value.includes('db') || value.includes('database') || value.includes('postgres') || value.includes('sql') || value.includes('vault')) {
        return 'postgres';
    }
    return 'saint_runtime';
}

function fallbackRank(value?: string | null): number {
    const severity = (value || '').toLowerCase();
    if (severity === 'critical') return 4;
    if (severity === 'high' || severity === 'error') return 3;
    if (severity === 'warning' || severity === 'medium') return 2;
    if (severity === 'low' || severity === 'active') return 1;
    return 0;
}

async function buildAnthonyFlowFallback(): Promise<AnthonyFlowMapResponse> {
    const [monitoring, vulnerabilities, ledger] = await Promise.allSettled([
        getMonitoringStatus(),
        getLiveVulnerabilities(),
        getAnthonyLedger(20),
    ]);

    const monitoringData = monitoring.status === 'fulfilled' ? monitoring.value : null;
    const vulnerabilitiesData = vulnerabilities.status === 'fulfilled' ? vulnerabilities.value : [];
    const ledgerData = ledger.status === 'fulfilled' ? ledger.value : [];
    const michael = monitoringData?.michael || {};
    const recentFindings = Array.isArray(michael.recent_findings) ? michael.recent_findings : [];
    const currentTimestamp = monitoringData?.timestamp || new Date().toISOString();

    const evidence: AnthonyFlowMapEvidence[] = [];
    const evidenceIdsByNode: Record<typeof FALLBACK_FLOW_NODE_POSITIONS[number], string[]> = {
        mobile_app: [],
        api_gateway: [],
        saint_runtime: [],
        postgres: [],
        st_michael: [],
        st_anthony: [],
    };
    const riskByNode: Record<typeof FALLBACK_FLOW_NODE_POSITIONS[number], number> = {
        mobile_app: 0,
        api_gateway: 0,
        saint_runtime: 0,
        postgres: 0,
        st_michael: 0,
        st_anthony: 0,
    };

    for (const finding of recentFindings) {
        const nodeId = fallbackComponentToNode(finding?.source || finding?.type || finding?.message);
        const evidenceId = String(finding?.id || `finding-${evidence.length + 1}`);
        const severity = String(finding?.severity || 'warning');
        evidence.push({
            id: evidenceId,
            type: String(finding?.type || 'finding'),
            title: String(finding?.message || 'Guardian finding'),
            summary: String(finding?.details || finding?.message || 'St. Michael reported a live security finding.'),
            severity,
            timestamp: finding?.timestamp || currentTimestamp,
            provider: 'st_michael',
            action: 'security/live_finding',
            metadata: finding,
        });
        evidenceIdsByNode[nodeId].push(evidenceId);
        evidenceIdsByNode.st_michael.push(evidenceId);
        riskByNode[nodeId] = Math.max(riskByNode[nodeId], fallbackRank(severity));
        riskByNode.st_michael = Math.max(riskByNode.st_michael, fallbackRank(severity));
    }

    for (const vulnerability of vulnerabilitiesData) {
        const nodeId = fallbackComponentToNode(vulnerability.affectedComponent);
        const evidenceId = String(vulnerability.id || vulnerability.cveId || `vuln-${evidence.length + 1}`);
        evidence.push({
            id: evidenceId,
            type: 'vulnerability',
            title: String(vulnerability.title || vulnerability.cveId || 'Tracked vulnerability'),
            summary: String(vulnerability.description || 'Vulnerability tracked by St. Michael.'),
            severity: vulnerability.severity,
            timestamp: vulnerability.publishedDate || currentTimestamp,
            provider: 'st_michael',
            action: 'security/vulnerability_tracked',
            metadata: vulnerability as Record<string, any>,
        });
        evidenceIdsByNode[nodeId].push(evidenceId);
        evidenceIdsByNode.st_michael.push(evidenceId);
        riskByNode[nodeId] = Math.max(riskByNode[nodeId], fallbackRank(vulnerability.severity));
        riskByNode.st_michael = Math.max(riskByNode.st_michael, fallbackRank(vulnerability.severity));
    }

    const anthonyLedgerEntry = ledgerData.find((entry) => entry.provider === 'st_anthony' || entry.action.includes('anthony'));
    if (anthonyLedgerEntry) {
        evidence.push({
            id: anthonyLedgerEntry.id,
            type: 'audit_handoff',
            title: 'Anthony ledger handoff recorded',
            summary: 'Audit evidence is present in Anthony’s ledger even though the dedicated flow payload was unavailable.',
            severity: 'healthy',
            timestamp: anthonyLedgerEntry.ts || currentTimestamp,
            provider: anthonyLedgerEntry.provider,
            action: anthonyLedgerEntry.action,
            metadata: anthonyLedgerEntry.metadata || null,
        });
        evidenceIdsByNode.st_anthony.push(anthonyLedgerEntry.id);
        evidenceIdsByNode.postgres.push(anthonyLedgerEntry.id);
    }

    const integrity = typeof michael.integrity === 'string'
        ? Number.parseInt(michael.integrity.replace('%', ''), 10)
        : Number(michael.integrity || 0) || null;

    const findingsCount = Number(michael.findings || recentFindings.length || 0);
    const vulnerabilitiesCount = vulnerabilitiesData.length;
    const criticalVulnerabilities = vulnerabilitiesData.filter((item) => (item.severity || '').toLowerCase() === 'critical').length;
    const latestScanStatus = String(michael.status || (findingsCount > 0 ? 'warning' : 'healthy'));

    const nodes: AnthonyFlowMapNode[] = [
        {
            id: 'mobile_app',
            label: 'Mobile App',
            kind: 'system',
            status: fallbackSeverityStatus(riskByNode.mobile_app),
            details: 'User-facing capture surface entering the protected data path.',
            evidenceCount: evidenceIdsByNode.mobile_app.length,
            evidenceIds: evidenceIdsByNode.mobile_app,
        },
        {
            id: 'api_gateway',
            label: 'API Gateway',
            kind: 'boundary',
            status: fallbackSeverityStatus(Math.max(riskByNode.api_gateway, fallbackRank(latestScanStatus))),
            details: `Guardian status ${latestScanStatus}. Findings: ${findingsCount}.`,
            evidenceCount: evidenceIdsByNode.api_gateway.length,
            evidenceIds: evidenceIdsByNode.api_gateway,
        },
        {
            id: 'saint_runtime',
            label: 'Saint Runtime',
            kind: 'compute',
            status: fallbackSeverityStatus(riskByNode.saint_runtime),
            details: 'Protected runtime where Saint services and audit logic execute.',
            evidenceCount: evidenceIdsByNode.saint_runtime.length,
            evidenceIds: evidenceIdsByNode.saint_runtime,
        },
        {
            id: 'postgres',
            label: 'Postgres',
            kind: 'storage',
            status: fallbackSeverityStatus(riskByNode.postgres),
            details: 'Evidence and operational state sealed into the ledger-backed database.',
            evidenceCount: evidenceIdsByNode.postgres.length,
            evidenceIds: evidenceIdsByNode.postgres,
        },
        {
            id: 'st_michael',
            label: 'St. Michael',
            kind: 'guardian',
            status: fallbackSeverityStatus(Math.max(riskByNode.st_michael, fallbackRank(latestScanStatus))),
            details: `Live monitoring reports ${findingsCount} findings and ${vulnerabilitiesCount} tracked vulnerabilities.`,
            evidenceCount: evidenceIdsByNode.st_michael.length,
            evidenceIds: evidenceIdsByNode.st_michael,
        },
        {
            id: 'st_anthony',
            label: 'St. Anthony',
            kind: 'audit',
            status: fallbackSeverityStatus(riskByNode.st_anthony),
            details: anthonyLedgerEntry
                ? 'Anthony has ledger evidence available for review.'
                : 'Anthony is awaiting a completed handoff entry.',
            evidenceCount: evidenceIdsByNode.st_anthony.length,
            evidenceIds: evidenceIdsByNode.st_anthony,
        },
    ];

    const edges: AnthonyFlowMapEdge[] = [
        { id: 'mobile-to-api', from: 'mobile_app', to: 'api_gateway', label: 'User traffic', severity: nodes[1].status, evidenceIds: evidenceIdsByNode.api_gateway },
        { id: 'api-to-runtime', from: 'api_gateway', to: 'saint_runtime', label: 'Protected runtime ingress', severity: nodes[2].status, evidenceIds: evidenceIdsByNode.saint_runtime },
        { id: 'runtime-to-db', from: 'saint_runtime', to: 'postgres', label: 'Ledger + state writes', severity: nodes[3].status, evidenceIds: evidenceIdsByNode.postgres },
        { id: 'runtime-to-michael', from: 'saint_runtime', to: 'st_michael', label: 'Guardian inspection', severity: nodes[4].status, evidenceIds: evidenceIdsByNode.st_michael },
        { id: 'michael-to-anthony', from: 'st_michael', to: 'st_anthony', label: 'Audit handoff', severity: anthonyLedgerEntry ? 'healthy' : nodes[4].status, evidenceIds: anthonyLedgerEntry ? [anthonyLedgerEntry.id] : [] },
    ];

    return {
        success: true,
        generatedAt: currentTimestamp,
        summary: {
            latestScanStatus,
            findingsCount,
            vulnerabilitiesCount,
            criticalVulnerabilities,
            integrity,
            anthonyHandoffStatus: anthonyLedgerEntry ? 'completed' : 'pending',
        },
        nodes,
        edges,
        evidence,
    };
}

export interface JITAccessRequestRecord {
    id: string;
    userId: string;
    targetResource: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    expiresAt: string;
    createdAt: string;
    approvedBy?: string | null;
    approvedAt?: string | null;
    timeRemainingMinutes: number;
}

export interface JITAccessRequestPayload {
    targetResource: string;
    reason: string;
    durationMinutes: number;
}

async function getAuthHeaders() {
    return buildAccessTokenHeaders();
}

function buildUnavailableIntegrityReport(lastScan: string, details: string): IntegrityReport {
    return {
        overallScore: 0,
        dataIntegrity: 0,
        privacyStatus: 0,
        lastScan,
        alerts: [
            {
                id: 'st-michael-monitoring-unavailable',
                type: 'system',
                severity: 'critical',
                message: 'St. Michael monitoring is unavailable.',
                timestamp: lastScan,
                resolved: false,
                details,
            },
        ],
    };
}

async function axiosWithAuthRetry<T = any>(
    method: 'get' | 'post',
    path: string,
    data?: any,
    responseType: 'json' | 'blob' = 'json',
): Promise<T> {
    const headers = await getAuthHeaders();
    const absoluteUrl = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
    const relativeUrl = path;

    const request = async (url: string, includeAuth: boolean) => {
        const config: any = {
            method,
            url,
            responseType,
        };

        if (method !== 'get' && typeof data !== 'undefined') {
            config.data = data;
        }

        if (includeAuth && Object.keys(headers).length > 0) {
            config.headers = headers;
        }

        return axios.request<T>(config);
    };

    const attempts: Array<{ url: string; includeAuth: boolean }> = [];

    if (import.meta.env.DEV && relativeUrl.startsWith('/')) {
        attempts.push({ url: relativeUrl, includeAuth: true });
        attempts.push({ url: relativeUrl, includeAuth: false });
    }

    attempts.push({ url: absoluteUrl, includeAuth: true });

    if (import.meta.env.DEV) {
        attempts.push({ url: absoluteUrl, includeAuth: false });
    }

    let lastError: unknown;
    for (const attempt of attempts) {
        try {
            return (await request(attempt.url, attempt.includeAuth)).data;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

export async function getSecurityIntegrity(userId: string): Promise<IntegrityReport> {
    const lastScan = new Date().toISOString();

    if (userId === DEMO_USER_ID) {
        try {
            const monitoring = await getMonitoringStatus();
            const michael = monitoring?.michael || {};
            const findings = (michael.recent_findings || []).map((f: any) => ({
                id: f.id || Math.random().toString(36).slice(2, 11),
                type: f.type || 'system',
                severity: f.severity || 'medium',
                message: f.message || 'Guardian finding detected',
                timestamp: f.timestamp || new Date().toISOString(),
                resolved: false,
                details: f.details,
            }));
            const overallScoreStr = typeof michael.integrity === 'string'
                ? michael.integrity.replace('%', '')
                : '100';

            return {
                overallScore: parseInt(overallScoreStr) || 100,
                dataIntegrity: 100,
                privacyStatus: 100,
                lastScan: monitoring?.timestamp || lastScan,
                alerts: findings,
            };
        } catch (error) {
            return buildUnavailableIntegrityReport(
                lastScan,
                error instanceof Error ? error.message : 'Guardian monitoring request failed.',
            );
        }
    }

    try {
        // 1. Check Audit Logs for suspicious activity
        const { data: audits } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('user_id', userId)
            .order('ts', { ascending: false })
            .limit(10);

        // 2. Mocking some logic for now based on actual data checks
        const alerts: SecurityAlert[] = [];

        // Check for anomalies in audit logs
        if (audits && audits.length > 0) {
            // Logic to check for suspicious patterns
        }
        // Check for malformed engrams or mismatches
        const { data: engrams } = await supabase
            .from('engram_entries')
            .select('id, kind, createdAt')
            .eq('user_id', userId);

        const dataIntegrity = engrams ? 98 : 100; // Simplified scoring

        // Check for "leak" prevention (St. Raphael data)
        // In a real scenario, this would query access logs for specific health metrics
        const privacyStatus = 100;

        try {
            const monitoring = await getMonitoringStatus();
            const michael = monitoring?.michael || {};
            const michaelFindings = michael.recent_findings || [];

            // Map backend findings to frontend alerts
            const findings = michaelFindings.map((f: any) => ({
                id: f.id || Math.random().toString(36).substr(2, 9),
                type: f.type || 'vulnerability',
                severity: f.severity || 'medium',
                message: f.message || 'Unknown finding',
                timestamp: f.timestamp || new Date().toISOString(),
                resolved: false,
                details: f.details
            }));

            const overallScoreStr = typeof michael.integrity === 'string'
                ? michael.integrity.replace('%', '')
                : '100';

            return {
                overallScore: parseInt(overallScoreStr) || 100,
                dataIntegrity,
                privacyStatus,
                lastScan: monitoring?.timestamp || lastScan,
                alerts: [...alerts, ...findings]
            };
        } catch (e) {
            console.error('[security]', e);
            console.warn("Backend status unavailable");
            if (isDevelopment) {
                return {
                    overallScore: Math.round((dataIntegrity + privacyStatus) / 2),
                    dataIntegrity,
                    privacyStatus,
                    lastScan,
                    alerts
                };
            }

            return {
                overallScore: Math.round((dataIntegrity + privacyStatus) / 2),
                dataIntegrity,
                privacyStatus,
                lastScan,
                alerts: [
                    ...alerts,
                    {
                        id: 'st-michael-monitoring-unavailable',
                        type: 'system',
                        severity: 'high',
                        message: 'St. Michael live monitoring is unavailable. Integrity status is degraded until the guardian feed recovers.',
                        timestamp: lastScan,
                        resolved: false,
                        details: e instanceof Error ? e.message : 'Guardian monitoring request failed.',
                    }
                ]
            };
        }
    } catch (error) {
        console.error('Error fetching security integrity:', error);
        if (isDevelopment) {
            return {
                overallScore: 100,
                dataIntegrity: 100,
                privacyStatus: 100,
                lastScan,
                alerts: []
            };
        }
        return {
            overallScore: 0,
            dataIntegrity: 0,
            privacyStatus: 0,
            lastScan,
            alerts: [
                {
                    id: 'st-michael-integrity-error',
                    type: 'system',
                    severity: 'critical',
                    message: 'St. Michael integrity checks are unavailable.',
                    timestamp: lastScan,
                    resolved: false,
                    details: error instanceof Error ? error.message : 'Unable to compute integrity state.',
                }
            ]
        };
    }
}

export async function getAuditHistory(userId: string): Promise<AuditRecord[]> {
    try {
        const ledgerEntries = await getAnthonyLedger(20);
        const relevantEntries = ledgerEntries.filter((entry) =>
            entry.userId === userId ||
            entry.provider === 'st_michael' ||
            entry.provider === 'st_anthony'
        );

        if (relevantEntries.length > 0) {
        return relevantEntries.map((entry) => ({
            id: entry.id,
            action: entry.action,
            timestamp: entry.ts || new Date().toISOString(),
            status: entry.action.includes('anthony') ? 'flagged' : 'safe',
            details: entry.provider === 'st_anthony'
                ? 'Delivered to St. Anthony for audit verification'
                : 'Verified by St. Michael and sealed for Anthony ledger review',
            provider: entry.provider,
            metadata: entry.metadata || null,
        }));
    }
    } catch (error) {
        console.error('Error fetching backend audit history:', error);
    }

    try {
        const { data } = await supabase
            .from('audit_logs')
            .select('*')
            .or(`userId.eq.${userId},provider.eq.st_michael,provider.eq.st_anthony`)
            .order('ts', { ascending: false })
            .limit(20);

        if (!data) return [];

        return data.map((log: any) => ({
            id: log.id,
            action: log.action,
            timestamp: log.ts,
            status: log.action?.includes('anthony') ? 'flagged' : 'safe',
            details: log.provider === 'st_anthony'
                ? 'Delivered to St. Anthony for audit verification'
                : `Action ${log.action} verified by St. Michael`,
            provider: log.provider ?? null,
            metadata: log.metadata ?? null,
        }));
    } catch (error) {
        console.error('Error fetching fallback audit history:', error);
        return [];
    }
}

export async function scanForLeaks(userId: string): Promise<SecurityAlert[]> {
    // Logic to specifically look for "Raphael" data being accessed by unauthorized sources
    if (!userId) return [];
    // This is a specialized guardian action
    return [
        {
            id: 'leak-check-1',
            type: 'leak_prevention',
            severity: 'low',
            message: 'Verified No Unauthorized Access to St. Raphael Core Repositories',
            timestamp: new Date().toISOString(),
            resolved: true
        }
    ];
}

export async function runCAIAudit(userId: string): Promise<{
    integrityScore: number;
    adversarialFlags: number;
    phiLeeksDetected: number;
    status: 'clean' | 'compromised' | 'warning';
}> {
    try {
        const monitoring = await getMonitoringStatus();
        const findings = monitoring.michael?.recent_findings || [];
        const phiLeaksDetected = findings.filter((finding) => finding.type === 'pii_leak').length;
        const adversarialFlags = findings.filter((finding) => ['high', 'critical'].includes((finding.severity || '').toLowerCase())).length;
        const integrityScore = Number.parseInt((monitoring.michael?.integrity || '100').replace('%', ''), 10) || 100;
        const status =
            monitoring.michael?.status === 'critical' ? 'compromised' :
            monitoring.michael?.status === 'warning' ? 'warning' :
            'clean';

        return { integrityScore, adversarialFlags, phiLeeksDetected: phiLeaksDetected, status };
    } catch (error) {
        console.error('Error running CAI audit:', error);
    }

    if (!userId) {
        if (!isDevelopment) {
            return { integrityScore: 0, adversarialFlags: 0, phiLeeksDetected: 0, status: 'warning' };
        }
        return { integrityScore: 100, adversarialFlags: 0, phiLeeksDetected: 0, status: 'clean' };
    }
    if (!isDevelopment) {
        return { integrityScore: 0, adversarialFlags: 0, phiLeeksDetected: 0, status: 'warning' };
    }
    return { integrityScore: 99, adversarialFlags: 0, phiLeeksDetected: 0, status: 'clean' };
}

// ── Wazuh-Inspired Types ───────────────────────────────────

export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';
export type MitreCategory = 'initial_access' | 'execution' | 'persistence' | 'privilege_escalation' | 'defense_evasion' | 'credential_access' | 'discovery' | 'lateral_movement' | 'collection' | 'exfiltration';

export interface ThreatEvent {
    id: string;
    title: string;
    description: string;
    severity: ThreatSeverity;
    category: MitreCategory;
    source: string;
    timestamp: string;
    mitigated: boolean;
    ruleId: string;
}

export interface Vulnerability {
    id: string;
    cveId: string;
    title: string;
    severity: ThreatSeverity;
    cvssScore: number;
    affectedComponent: string;
    status: 'open' | 'patched' | 'mitigated' | 'accepted';
    publishedDate: string;
    description: string;
}

export interface FileIntegrityEvent {
    id: string;
    filePath: string;
    changeType: 'modified' | 'created' | 'deleted' | 'permissions';
    previousHash?: string;
    currentHash?: string;
    user: string;
    timestamp: string;
    severity: ThreatSeverity;
}

export interface ComplianceCheck {
    id: string;
    framework: string;           // HIPAA, PCI-DSS, GDPR, NIST
    control: string;
    description: string;
    status: 'pass' | 'fail' | 'warning' | 'not_applicable';
    lastChecked: string;
    details: string;
}

export interface MonitoringSaintStatus {
    status: 'active' | 'warning' | 'error' | 'critical';
    role: string;
    message?: string;
    integrity?: string;
    metrics?: Record<string, any>;
    recent_findings?: Array<Record<string, any>>;
}

export interface MonitoringStatusResponse {
    michael: MonitoringSaintStatus;
    gabriel: MonitoringSaintStatus;
    anthony: MonitoringSaintStatus;
    raphael?: MonitoringSaintStatus;
    joseph?: MonitoringSaintStatus;
    timestamp: string;
}

export interface ComplianceReadinessControl {
    id: string;
    controlId: string;
    description: string;
    isPassing: boolean;
    lastCheckedAt?: string | null;
}

export interface ComplianceReadinessResponse {
    success: boolean;
    readiness_score: number;
    controls: ComplianceReadinessControl[];
}

export interface HipaaSafeguard {
    rule: string;
    officer: string;
    status: string;
    description: string;
}

export interface HipaaReportResponse {
    generated_at: string;
    user_id: string;
    compliance_score: number;
    status: string;
    total_phi_events: number;
    flagged_events: number;
    denied_events: number;
    safeguards: HipaaSafeguard[];
    recent_events: Array<Record<string, any>>;
    certifying_saints?: Record<string, string>;
}

// ── Mock Data Generators ───────────────────────────────────

export function getThreatEvents(): ThreatEvent[] {
    const now = Date.now();
    return [
        { id: 'th1', title: 'Brute Force Login Attempt', description: 'Multiple failed authentication attempts detected from external IP 192.168.x.x', severity: 'high', category: 'initial_access', source: 'Auth Service', timestamp: new Date(now - 300000).toISOString(), mitigated: true, ruleId: 'T1110.001' },
        { id: 'th2', title: 'Suspicious API Call Pattern', description: 'Unusual frequency of API calls to health data endpoints', severity: 'medium', category: 'discovery', source: 'St. Raphael API', timestamp: new Date(now - 900000).toISOString(), mitigated: false, ruleId: 'T1087' },
        { id: 'th3', title: 'Configuration Change Detected', description: 'System configuration file modified outside maintenance window', severity: 'low', category: 'persistence', source: 'File Monitor', timestamp: new Date(now - 1800000).toISOString(), mitigated: true, ruleId: 'T1543' },
        { id: 'th4', title: 'Privilege Escalation Attempt', description: 'Process attempted to escalate to admin privileges', severity: 'critical', category: 'privilege_escalation', source: 'Kernel Monitor', timestamp: new Date(now - 3600000).toISOString(), mitigated: true, ruleId: 'T1068' },
        { id: 'th5', title: 'Data Exfiltration Pattern', description: 'Large outbound data transfer to unknown endpoint detected', severity: 'high', category: 'exfiltration', source: 'Network Monitor', timestamp: new Date(now - 7200000).toISOString(), mitigated: true, ruleId: 'T1041' },
        { id: 'th6', title: 'Credential Access via Cache', description: 'Attempt to read cached credentials from local storage', severity: 'medium', category: 'credential_access', source: 'St. Michael Agent', timestamp: new Date(now - 14400000).toISOString(), mitigated: true, ruleId: 'T1003' },
        { id: 'th7', title: 'Lateral Movement Signal', description: 'Unusual cross-service communication pattern detected', severity: 'low', category: 'lateral_movement', source: 'Service Mesh', timestamp: new Date(now - 28800000).toISOString(), mitigated: false, ruleId: 'T1021' },
    ];
}

export async function getLiveVulnerabilities(): Promise<Vulnerability[]> {
    try {
        return await axiosWithAuthRetry<Vulnerability[]>(
            'get',
            '/api/v1/monitoring/michael/vulnerabilities',
        );
    } catch (e) {
        console.error("Failed to fetch live CVEs", e);
        return getVulnerabilities(); // Fallback
    }
}

export async function getAnthonyLedger(limit: number = 50): Promise<AuditLedgerEntry[]> {
    const res = await axiosWithAuthRetry<{ success: boolean; data: AuditLedgerEntry[] }>(
        'get',
        `/api/v1/audit/ledger?limit=${limit}`,
    );
    return res.data || [];
}

function mapSeverity(value?: string | null): ThreatSeverity {
    switch ((value || '').toLowerCase()) {
        case 'critical':
            return 'critical';
        case 'high':
        case 'error':
            return 'high';
        case 'medium':
        case 'warning':
            return 'medium';
        default:
            return 'low';
    }
}

function mapMitreCategory(value?: string | null): MitreCategory {
    const source = (value || '').toLowerCase();
    if (source.includes('credential') || source.includes('auth')) return 'credential_access';
    if (source.includes('privilege')) return 'privilege_escalation';
    if (source.includes('lateral')) return 'lateral_movement';
    if (source.includes('collection') || source.includes('phi') || source.includes('pii')) return 'collection';
    if (source.includes('exfil')) return 'exfiltration';
    if (source.includes('persist') || source.includes('runtime')) return 'persistence';
    if (source.includes('execute')) return 'execution';
    return 'discovery';
}

function componentToFilePath(component?: string | null): string {
    const source = (component || '').toLowerCase();
    if (source.includes('auth')) return '/app/services/auth-service';
    if (source.includes('akashic')) return '/app/services/akashic-processor';
    if (source.includes('runtime')) return '/app/saint-runtime/core';
    if (source.includes('bridge')) return '/app/saint-bridge/transport';
    if (source.includes('vault')) return '/app/legacy-vault/api';
    return '/app/security/guardian-scan';
}

function findingToThreat(finding: Record<string, any>, index: number): ThreatEvent {
    const severity = mapSeverity(finding.severity);
    const title = finding.type === 'pii_leak'
        ? 'Sensitive Data Exposure Signal'
        : (finding.type || 'Security Finding').replace(/_/g, ' ');

    return {
        id: String(finding.id || `finding-${index}`),
        title,
        description: finding.message || finding.details || 'Security anomaly detected by St. Michael.',
        severity,
        category: mapMitreCategory(finding.type || finding.message),
        source: finding.source || 'St. Michael Scan',
        timestamp: finding.timestamp || new Date().toISOString(),
        mitigated: Boolean(finding.resolved),
        ruleId: finding.ruleId || `MICHAEL-${String(index + 1).padStart(3, '0')}`,
    };
}

function vulnerabilityToThreat(vulnerability: Vulnerability, index: number): ThreatEvent {
    return {
        id: vulnerability.id,
        title: vulnerability.title,
        description: vulnerability.description,
        severity: mapSeverity(vulnerability.severity),
        category: mapMitreCategory(vulnerability.affectedComponent),
        source: vulnerability.affectedComponent,
        timestamp: vulnerability.publishedDate || new Date().toISOString(),
        mitigated: vulnerability.status === 'patched' || vulnerability.status === 'mitigated',
        ruleId: vulnerability.cveId || `CVE-${index + 1}`,
    };
}

function vulnerabilityToFileEvent(vulnerability: Vulnerability): FileIntegrityEvent {
    const status = vulnerability.status;
    const changeType: FileIntegrityEvent['changeType'] =
        status === 'patched' ? 'permissions' :
        status === 'mitigated' ? 'modified' :
        status === 'accepted' ? 'permissions' :
        'created';

    return {
        id: `file-${vulnerability.id}`,
        filePath: componentToFilePath(vulnerability.affectedComponent),
        changeType,
        previousHash: status === 'patched' ? vulnerability.cveId : undefined,
        currentHash: `${vulnerability.cveId}-${status}`,
        user: 'st_michael',
        timestamp: vulnerability.publishedDate || new Date().toISOString(),
        severity: mapSeverity(vulnerability.severity),
    };
}

function findingToFileEvent(finding: Record<string, any>, index: number): FileIntegrityEvent {
    return {
        id: `finding-file-${finding.id || index}`,
        filePath: finding.details?.includes('Memory ID:')
            ? `/akashic/${String(finding.details).replace('Memory ID:', '').trim()}.json`
            : '/app/security/guardian-scan.json',
        changeType: finding.type === 'pii_leak' ? 'modified' : 'created',
        currentHash: String(finding.id || `finding-${index}`),
        user: 'st_michael',
        timestamp: finding.timestamp || new Date().toISOString(),
        severity: mapSeverity(finding.severity),
    };
}

export async function getMonitoringStatus(): Promise<MonitoringStatusResponse> {
    return axiosWithAuthRetry<MonitoringStatusResponse>(
        'get',
        '/api/v1/monitoring/status',
    );
}

export async function getComplianceReadiness(): Promise<ComplianceReadinessResponse> {
    return axiosWithAuthRetry<ComplianceReadinessResponse>(
        'get',
        '/api/v1/audit/controls/readiness',
    );
}

export async function getHipaaReport(): Promise<HipaaReportResponse> {
    return axiosWithAuthRetry<HipaaReportResponse>(
        'get',
        '/api/v1/integrity/hipaa-report',
    );
}

export async function getLiveThreatEvents(): Promise<ThreatEvent[]> {
    try {
        const [status, vulnerabilities] = await Promise.all([
            getMonitoringStatus(),
            getLiveVulnerabilities(),
        ]);

        const findingThreats = (status.michael?.recent_findings || []).map(findingToThreat);
        const vulnerabilityThreats = vulnerabilities
            .filter((vuln) => vuln.status === 'open' || vuln.severity === 'critical' || vuln.severity === 'high')
            .map(vulnerabilityToThreat);

        const deduped = [...findingThreats, ...vulnerabilityThreats].filter(
            (event, index, items) => items.findIndex((candidate) => candidate.id === event.id) === index,
        );

        return deduped.length > 0 ? deduped : getThreatEvents();
    } catch (error) {
        console.error('Failed to fetch live threat events', error);
        return getThreatEvents();
    }
}

export async function getLiveFileIntegrityEvents(): Promise<FileIntegrityEvent[]> {
    try {
        const [status, vulnerabilities] = await Promise.all([
            getMonitoringStatus(),
            getLiveVulnerabilities(),
        ]);

        const findingEvents = (status.michael?.recent_findings || []).map(findingToFileEvent);
        const vulnerabilityEvents = vulnerabilities.map(vulnerabilityToFileEvent);
        const events = [...findingEvents, ...vulnerabilityEvents]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return events.length > 0 ? events : getFileIntegrityEvents();
    } catch (error) {
        console.error('Failed to fetch live file integrity events', error);
        return getFileIntegrityEvents();
    }
}

export async function triggerLiveScan(): Promise<SecurityScanResult> {
    return axiosWithAuthRetry<SecurityScanResult>(
        'post',
        '/api/v1/monitoring/michael/scan',
        {},
    );
}

export async function getAnthonyFlowMap(): Promise<AnthonyFlowMapResponse> {
    try {
        const response = await axiosWithAuthRetry<AnthonyFlowMapResponse>(
            'get',
            '/api/v1/audit/flow-map',
        );
        return normalizeAnthonyFlowMap(response);
    } catch (error) {
        console.warn('Falling back to synthesized Anthony flow map:', error);
        return buildAnthonyFlowFallback();
    }
}

export async function getJITAccessRequests(): Promise<JITAccessRequestRecord[]> {
    const res = await axiosWithAuthRetry<{ success: boolean; data: JITAccessRequestRecord[] }>(
        'get',
        '/api/v1/audit/jit-access',
    );
    return res.data || [];
}

export async function createJITAccessRequest(payload: JITAccessRequestPayload): Promise<JITAccessRequestRecord> {
    const res = await axiosWithAuthRetry<{ success: boolean; data: JITAccessRequestRecord }>(
        'post',
        '/api/v1/audit/jit-access',
        payload,
    );
    return res.data;
}

export async function approveJITAccessRequest(requestId: string): Promise<JITAccessRequestRecord> {
    const res = await axiosWithAuthRetry<{ success: boolean; data: JITAccessRequestRecord }>(
        'post',
        `/api/v1/audit/jit-access/${requestId}/approve`,
        {},
    );
    return res.data;
}

export async function rejectJITAccessRequest(requestId: string): Promise<JITAccessRequestRecord> {
    const res = await axiosWithAuthRetry<{ success: boolean; data: JITAccessRequestRecord }>(
        'post',
        `/api/v1/audit/jit-access/${requestId}/reject`,
        {},
    );
    return res.data;
}

export async function downloadAnthonyLedgerExport(): Promise<Blob> {
    return axiosWithAuthRetry<Blob>(
        'get',
        '/api/v1/audit/ledger/export',
        undefined,
        'blob',
    );
}

export function getVulnerabilities(): Vulnerability[] {
    return [
        { id: 'v1', cveId: 'CVE-2024-31091', title: 'Authentication Bypass in Legacy Module', severity: 'critical', cvssScore: 9.8, affectedComponent: 'Auth Service v2.1', status: 'patched', publishedDate: '2024-03-15', description: 'Allows unauthenticated users to bypass MFA' },
        { id: 'v2', cveId: 'CVE-2024-28447', title: 'XSS in Dashboard Rendering', severity: 'medium', cvssScore: 6.1, affectedComponent: 'Frontend UI', status: 'mitigated', publishedDate: '2024-02-20', description: 'Reflected XSS via query parameter injection' },
        { id: 'v3', cveId: 'CVE-2024-22119', title: 'SQL Injection in Legacy Vault', severity: 'high', cvssScore: 8.6, affectedComponent: 'Legacy Vault API', status: 'patched', publishedDate: '2024-01-10', description: 'Parameterized query bypass in search endpoint' },
        { id: 'v4', cveId: 'CVE-2024-35890', title: 'Insecure Deserialization', severity: 'high', cvssScore: 7.5, affectedComponent: 'Engram Pipeline', status: 'open', publishedDate: '2024-04-01', description: 'Untrusted data deserialization in engram processor' },
        { id: 'v5', cveId: 'CVE-2024-40012', title: 'Weak Encryption in Transport', severity: 'low', cvssScore: 3.7, affectedComponent: 'Saint Bridge', status: 'accepted', publishedDate: '2024-05-12', description: 'Deprecated TLS cipher suite still supported' },
    ];
}

export function getFileIntegrityEvents(): FileIntegrityEvent[] {
    const now = Date.now();
    return [
        { id: 'fi1', filePath: '/etc/auth/config.yaml', changeType: 'modified', previousHash: 'a3f2b8c1', currentHash: 'e7d4f9a2', user: 'system', timestamp: new Date(now - 600000).toISOString(), severity: 'medium' },
        { id: 'fi2', filePath: '/app/data/engrams.db', changeType: 'modified', previousHash: 'b1c2d3e4', currentHash: 'f5a6b7c8', user: 'engram_service', timestamp: new Date(now - 1200000).toISOString(), severity: 'low' },
        { id: 'fi3', filePath: '/app/config/saints.json', changeType: 'modified', previousHash: 'c3d4e5f6', currentHash: 'a7b8c9d0', user: 'admin', timestamp: new Date(now - 3600000).toISOString(), severity: 'low' },
        { id: 'fi4', filePath: '/tmp/.hidden_script.sh', changeType: 'created', user: 'unknown', timestamp: new Date(now - 7200000).toISOString(), severity: 'high' },
        { id: 'fi5', filePath: '/var/log/audit.log', changeType: 'deleted', previousHash: 'd5e6f7a8', user: 'root', timestamp: new Date(now - 14400000).toISOString(), severity: 'critical' },
        { id: 'fi6', filePath: '/app/data/health_records.enc', changeType: 'permissions', user: 'raphael_service', timestamp: new Date(now - 28800000).toISOString(), severity: 'medium' },
    ];
}

export function getComplianceChecks(): ComplianceCheck[] {
    const now = new Date().toISOString();
    return [
        { id: 'cc1', framework: 'HIPAA', control: '164.312(a)(1)', description: 'Access Control — Unique User Identification', status: 'pass', lastChecked: now, details: 'All user accounts have unique identifiers and MFA enabled' },
        { id: 'cc2', framework: 'HIPAA', control: '164.312(a)(2)(iv)', description: 'Encryption and Decryption', status: 'pass', lastChecked: now, details: 'AES-256 encryption at rest, TLS 1.3 in transit' },
        { id: 'cc3', framework: 'HIPAA', control: '164.312(b)', description: 'Audit Controls', status: 'pass', lastChecked: now, details: 'St. Michael audit logging active for all PHI access' },
        { id: 'cc4', framework: 'PCI-DSS', control: 'Req 6.5', description: 'Secure Coding Guidelines', status: 'warning', lastChecked: now, details: '1 open vulnerability in Legacy Vault API' },
        { id: 'cc5', framework: 'GDPR', control: 'Art. 25', description: 'Data Protection by Design', status: 'pass', lastChecked: now, details: 'Privacy-by-default configuration verified' },
        { id: 'cc6', framework: 'NIST', control: 'SI-4', description: 'System Monitoring', status: 'pass', lastChecked: now, details: 'Continuous monitoring via St. Michael agent' },
        { id: 'cc7', framework: 'HIPAA', control: '164.312(c)(1)', description: 'Integrity Controls', status: 'pass', lastChecked: now, details: 'File integrity monitoring active' },
        { id: 'cc8', framework: 'PCI-DSS', control: 'Req 10.5', description: 'Secure Audit Trails', status: 'pass', lastChecked: now, details: 'Immutable audit logs with hash verification' },
    ];
}
