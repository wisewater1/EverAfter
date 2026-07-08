/**
 * Family Delphi trajectory comparison helpers.
 *
 * The codebase has two separate Delphi trajectory shapes that need to be
 * shown on the same overlay chart:
 *
 *   1. DelphiPrediction (logged-in user): built locally from
 *      health_metrics rows via generateDelphiPrediction(userId).
 *   2. DelphiTrajectory (any family member): served by the FastAPI
 *      backend at GET /api/v1/dht/{personId}, returned through
 *      getDHT(personId).
 *
 * This module unifies them as { subjectId, subjectName, color, riskLevel,
 * confidence, points: [{ ts, value }] } so the UI can render N members on
 * a single chart and a single comparison table.
 */

import { getDHT } from '../dhtApi';
import {
    generateDelphiPrediction,
    type DelphiPrediction,
} from '../raphael/healthDataService';
import type { FamilyMember } from './genealogy';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical' | 'unknown';

export interface NormalizedTrajectory {
    subjectId: string;
    subjectName: string;
    isUser: boolean;
    color: string;
    riskLevel: RiskLevel;
    confidence: number;
    predictedValue: number | null;
    dataSource: 'live' | 'simulated' | 'unknown';
    points: Array<{ ts: string; value: number }>;
}

// Stable color palette so toggling members doesn't reshuffle colors.
// User's own line is always teal; family members rotate through warm
// colors so they read clearly against the user's accent.
export const USER_LINE_COLOR = '#00ffe0';
const FAMILY_LINE_COLORS = [
    '#f6c86b', // gold
    '#a78bfa', // violet
    '#fb7185', // rose
    '#34d399', // emerald
    '#f97316', // orange
    '#60a5fa', // sky
    '#facc15', // yellow
    '#f472b6', // pink
];

export function colorForFamilyIndex(index: number): string {
    return FAMILY_LINE_COLORS[index % FAMILY_LINE_COLORS.length];
}

function normalizeRiskLevel(value: unknown): RiskLevel {
    const v = String(value || '').toLowerCase().trim();
    if (v === 'low' || v === 'moderate' || v === 'high' || v === 'critical') {
        return v;
    }
    return 'unknown';
}

function fromUserPrediction(
    userId: string,
    userName: string,
    prediction: DelphiPrediction,
): NormalizedTrajectory {
    return {
        subjectId: userId,
        subjectName: userName,
        isUser: true,
        color: USER_LINE_COLOR,
        riskLevel: normalizeRiskLevel(prediction.risk_level),
        confidence: Number(prediction.confidence) || 0,
        predictedValue: Number(prediction.predicted_value) || null,
        dataSource: prediction.data_source || 'unknown',
        points: (prediction.trajectory || [])
            .filter((p) => p && Number.isFinite(p.value) && p.timestamp)
            .map((p) => ({ ts: p.timestamp, value: Number(p.value) })),
    };
}

function fromFamilyDHT(
    member: FamilyMember,
    color: string,
    dht: {
        predicted_value?: number;
        confidence?: number;
        risk_level?: string;
        trajectory_data?: Array<{ timestamp: string; value: number }>;
        data_source?: string;
    } | null,
): NormalizedTrajectory {
    const fullName = `${member.firstName} ${member.lastName}`.trim();
    const points = (dht?.trajectory_data || [])
        .filter((p) => p && Number.isFinite(p.value) && p.timestamp)
        .map((p) => ({ ts: p.timestamp, value: Number(p.value) }));

    return {
        subjectId: member.id,
        subjectName: fullName || member.firstName || 'Family member',
        isUser: false,
        color,
        riskLevel: normalizeRiskLevel(dht?.risk_level),
        confidence: Number(dht?.confidence) || 0,
        predictedValue:
            typeof dht?.predicted_value === 'number' ? dht.predicted_value : null,
        dataSource:
            dht?.data_source === 'live' || dht?.data_source === 'simulated'
                ? dht.data_source
                : 'unknown',
        points,
    };
}

export interface FetchOptions {
    userId: string;
    userName: string;
    members: FamilyMember[];
}

export interface CompareDataset {
    user: NormalizedTrajectory | null;
    family: NormalizedTrajectory[];
}

/**
 * Fetch the user's own trajectory and each selected family member's DHT
 * trajectory in parallel, normalize, and return them ready for the chart.
 * Members whose DHT endpoint returns null still appear in the table so the
 * user can see *which* members lack data.
 */
export async function fetchCompareDataset({
    userId,
    userName,
    members,
}: FetchOptions): Promise<CompareDataset> {
    const userPromise = userId
        ? generateDelphiPrediction(userId).catch(() => null)
        : Promise.resolve(null);

    const familyPromise = Promise.all(
        members.map((member, index) =>
            getDHT(member.id)
                .catch(() => null)
                .then((response) =>
                    fromFamilyDHT(member, colorForFamilyIndex(index), response?.dht ?? null),
                ),
        ),
    );

    const [prediction, family] = await Promise.all([userPromise, familyPromise]);

    return {
        user: prediction ? fromUserPrediction(userId, userName, prediction) : null,
        family,
    };
}

/**
 * Reshape per-subject trajectories into Recharts-friendly rows, one row
 * per timestamp with a column per subject.
 *
 *   [ { ts: '2026-06-01', alice: 72, you: 68 }, ... ]
 *
 * Missing values are left undefined so Recharts draws gaps instead of
 * implying interpolation.
 */
export interface ChartRow {
    ts: string;
    [subjectId: string]: number | string | undefined;
}

export function toChartRows(
    trajectories: NormalizedTrajectory[],
): ChartRow[] {
    const tsSet = new Set<string>();
    for (const t of trajectories) {
        for (const p of t.points) tsSet.add(p.ts);
    }
    const sortedTs = Array.from(tsSet).sort();

    return sortedTs.map((ts) => {
        const row: ChartRow = { ts };
        for (const t of trajectories) {
            const point = t.points.find((p) => p.ts === ts);
            if (point) row[t.subjectId] = point.value;
        }
        return row;
    });
}
