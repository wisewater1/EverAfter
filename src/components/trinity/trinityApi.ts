/**
 * Trinity API helper - shared fetch wrapper for all Trinity Synapse actions.
 * Falls back to a local, wire-compatible data model when the backend path is unavailable.
 */
import { requestBackendJson } from '../../lib/backend-request';
import {
    describeRelationship,
    findRelationshipPath,
    getFamilyEvents,
    getFamilyMembers,
    getRelationships,
} from '../../lib/joseph/genealogy';

const TRINITY_GOALS_KEY = 'everafter_trinity_goals';
const TRINITY_WHATIF_HISTORY_KEY = 'everafter_trinity_whatif_history';

type AnyRecord = Record<string, unknown>;

export interface TrinityGoal {
    id?: string;
    goal_name: string;
    goal_type: string;
    status: 'on_track' | 'needs_attention' | 'blocked';
    composite_progress: number;
    axes: {
        raphael: { label: string; progress: number };
        gabriel: { label: string; progress: number };
        joseph: { label: string; progress: number };
    };
    created_at: string;
    health_target?: { metric: string; target_value: number };
    budget_allocation?: { category: string; monthly_amount: number };
    family_tracking?: string[];
    summary?: string;
    recommendations?: string[];
    blockers?: string[];
    next_review_at?: string;
    last_reviewed_at?: string | null;
}

interface TrinityWhatIfHistoryEntry {
    scenario: string;
    scenario_type: string;
    duration_months: number;
    overall_recommendation: string;
    generated_at: string;
    result: AnyRecord;
}

function readLocalJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) as T : fallback;
    } catch {
        return fallback;
    }
}

function writeLocalJson<T>(key: string, value: T) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage quota and privacy-mode failures.
    }
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function parseValidDate(value: unknown): Date | null {
    if (!value) return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoOrFallback(value: unknown, fallback: () => string): string {
    const parsed = parseValidDate(value);
    return parsed ? parsed.toISOString() : fallback();
}

function addDaysIso(base: unknown, days: number, fallback: () => string): string {
    const parsed = parseValidDate(base);
    if (!parsed) return fallback();

    const shifted = new Date(parsed.getTime() + days * 86400000);
    return Number.isNaN(shifted.getTime()) ? fallback() : shifted.toISOString();
}

function formatMemberName(member: AnyRecord) {
    const firstName = member.firstName || member.first_name || '';
    const lastName = member.lastName || member.last_name || '';
    return `${firstName} ${lastName}`.trim() || member.name || 'Family Member';
}

function calculateAge(member: AnyRecord) {
    const birthDate = member.birthDate || member.birth_date;
    if (!birthDate) return member.generation < 0 ? 68 + Math.abs(member.generation) * 9 : 34 + member.generation * 7;

    const birth = new Date(`${String(birthDate).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return 42;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDelta = today.getMonth() - birth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function inferOccupation(member: AnyRecord) {
    if (member.occupation) return String(member.occupation);
    const bio = String(member.bio || '').toLowerCase();
    if (bio.includes('engineer')) return 'Engineer';
    if (bio.includes('teacher')) return 'Teacher';
    if (bio.includes('nurse')) return 'Nurse';
    if (bio.includes('architect')) return 'Architect';
    if (bio.includes('designer')) return 'Designer';
    if (bio.includes('coach')) return 'Coach';
    if (bio.includes('deacon')) return 'Community Leader';
    if (bio.includes('chef')) return 'Data Engineer';
    return member.generation <= -1 ? 'Family Steward' : member.generation >= 1 ? 'Emerging Student' : 'Knowledge Worker';
}

function inferConditions(member: AnyRecord) {
    const infoStack = Array.isArray(member.infoStack) ? member.infoStack : [];
    const explicit = infoStack
        .filter((entry: AnyRecord) => entry.category === 'health')
        .map((entry: AnyRecord) => entry.label || entry.value)
        .filter(Boolean)
        .slice(0, 3);
    if (explicit.length > 0) return explicit;

    const age = calculateAge(member);
    if (age >= 82) return ['Mobility support', 'Blood pressure monitoring'];
    if (age >= 72) return ['Cardiometabolic risk', 'Medication adherence'];
    if (age >= 58) return ['Stress resilience', 'Sleep recovery'];
    if (age >= 40) return ['Preventive screening'];
    return [];
}

function getRiskLevel(score: number) {
    if (score >= 76) return 'critical';
    if (score >= 61) return 'high';
    if (score >= 41) return 'moderate';
    return 'low';
}

function getHealthProfile(member: AnyRecord) {
    const age = calculateAge(member);
    const conditions = inferConditions(member);
    const stress = clamp(30 + age * 0.35 + conditions.length * 9 + (member.generation < 0 ? 6 : 0), 28, 88);
    const hrv = clamp(76 - age * 0.42 - conditions.length * 6, 18, 72);
    const sleep = clamp(8.1 - age * 0.015 - conditions.length * 0.2, 5.7, 8.4);
    const riskScore = clamp(22 + age * 0.52 + conditions.length * 8, 18, 86);

    return {
        age,
        conditions,
        stress,
        hrv,
        sleep,
        riskScore,
        riskLevel: getRiskLevel(riskScore),
        wellnessScore: clamp(100 - riskScore, 14, 92),
        trajectory: riskScore >= 65 ? 'declining' : riskScore >= 45 ? 'stable' : 'improving',
    };
}

function getLocalBudgetContext(body: AnyRecord) {
    const envelopes = Array.isArray(body.budget_envelopes) ? body.budget_envelopes : [];
    if (envelopes.length > 0) {
        const totalAssigned = envelopes.reduce((sum: number, env: AnyRecord) => sum + Number(env.assigned || 0), 0);
        const overspentEnvelopes = envelopes.filter((env: AnyRecord) => Number(env.available || 0) < 0).length;
        const healthBudget = envelopes
            .filter((env: AnyRecord) => /health|medical|wellness|pharmacy|therapy/i.test(String(env.category_name || '')))
            .reduce((sum: number, env: AnyRecord) => sum + Number(env.assigned || 0), 0);
        const elderBudget = envelopes
            .filter((env: AnyRecord) => /elder|senior|care|parent/i.test(String(env.category_name || '')))
            .reduce((sum: number, env: AnyRecord) => sum + Number(env.assigned || 0), 0);

        return {
            envelopes,
            totalAssigned,
            overspentEnvelopes,
            healthBudget,
            elderBudget,
            netWorth: Number(body.net_worth || Math.max(totalAssigned * 26, 285000)),
            monthlyIncome: Number(body.monthly_income || Math.max(totalAssigned * 1.55, 7800)),
        };
    }

    return {
        envelopes: [
            { category_name: 'Health', assigned: 640, available: 112 },
            { category_name: 'Emergency Fund', assigned: 1450, available: 910 },
            { category_name: 'Family Care', assigned: 980, available: 205 },
            { category_name: 'Elder Care', assigned: 2300, available: 480 },
        ],
        totalAssigned: 5370,
        overspentEnvelopes: 1,
        healthBudget: 640,
        elderBudget: 2300,
        netWorth: Number(body.net_worth || 412750),
        monthlyIncome: Number(body.monthly_income || 9600),
    };
}

function getLocalTrinityContext(body: AnyRecord = {}) {
    const members = getFamilyMembers();
    const events = getFamilyEvents();
    const relationships = getRelationships();
    const livingMembers = members.filter(member => !member.deathDate);
    const primaryMember = body.member_id
        ? livingMembers.find(member => member.id === body.member_id) || members.find(member => member.id === body.member_id) || livingMembers[0] || members[0]
        : livingMembers.find(member => member.generation === 0) || livingMembers[0] || members[0];
    const elders = livingMembers.filter(member => calculateAge(member) >= 65);
    const healthProfiles = members.map(member => ({ member, ...getHealthProfile(member) }));
    const finances = getLocalBudgetContext(body);

    return {
        members,
        events,
        relationships,
        livingMembers,
        elders,
        primaryMember,
        primaryHealth: getHealthProfile(primaryMember || {}),
        healthProfiles,
        finances,
    };
}

function buildSeedGoals(): TrinityGoal[] {
    const context = getLocalTrinityContext();
    const vitality = buildFamilyVitalityFallback(context);
    const elderGap = buildElderCareFallback(context).family_coverage_gap;
    const livingCount = context.livingMembers.length || 1;

    return [
        {
            id: 'seed-vitality',
            goal_name: 'Lift family vitality above 80',
            goal_type: 'health',
            status: vitality.vitality_score >= 80 ? 'on_track' : vitality.vitality_score >= 65 ? 'needs_attention' : 'blocked',
            composite_progress: clamp(vitality.vitality_score, 38, 92),
            axes: {
                raphael: { label: 'Recovery score', progress: clamp(vitality.breakdown.raphael.score, 36, 92) },
                gabriel: { label: 'Health runway', progress: clamp(vitality.breakdown.gabriel.score, 34, 90) },
                joseph: { label: 'Family support', progress: clamp(vitality.breakdown.joseph.score, 40, 90) },
            },
            created_at: new Date().toISOString(),
            health_target: { metric: 'wellness_composite', target_value: 80 },
            budget_allocation: { category: 'health', monthly_amount: 250 },
            family_tracking: context.livingMembers.slice(0, 3).map(member => member.id),
            summary: 'Raise the household vitality floor by combining recovery discipline, care funding, and family support coverage.',
            recommendations: [
                'Rebalance Gabriel categories toward health and elder-care coverage before discretionary spend.',
                'Use Raphael to review recovery scores every 7 days.',
                'Assign at least 3 living members to the vitality check-in loop.',
            ],
            blockers: vitality.vitality_score >= 80 ? [] : ['Recovery score is below the target threshold.'],
            next_review_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            last_reviewed_at: null,
        },
        {
            id: 'seed-elder-runway',
            goal_name: 'Fully fund elder care runway',
            goal_type: 'family',
            status: elderGap <= 0 ? 'on_track' : elderGap < 1200 ? 'needs_attention' : 'blocked',
            composite_progress: clamp(100 - elderGap / 40, 28, 86),
            axes: {
                raphael: { label: 'Care stability', progress: clamp(74 - elderGap / 120, 30, 88) },
                gabriel: { label: 'Budget coverage', progress: clamp(100 - elderGap / 35, 22, 88) },
                joseph: { label: 'Kin support', progress: clamp(62 + livingCount * 4, 44, 90) },
            },
            created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
            health_target: { metric: 'care_stability', target_value: 90 },
            budget_allocation: { category: 'elder care', monthly_amount: 1800 },
            family_tracking: context.elders.slice(0, 2).map(member => member.id),
            summary: 'Protect elder care continuity by covering projected cost gaps before the next health or housing event arrives.',
            recommendations: [
                'Increase the elder-care envelope until the family coverage gap is near zero.',
                'Name a kin owner for each elder care task lane.',
                'Review support coverage against Raphael risk trajectories monthly.',
            ],
            blockers: elderGap > 0 ? [`Current family coverage gap is $${Math.round(elderGap).toLocaleString()}.`] : [],
            next_review_at: new Date(Date.now() + 10 * 86400000).toISOString(),
            last_reviewed_at: null,
        },
    ];
}

function hydrateTrinityGoal(goal: TrinityGoal): TrinityGoal {
    const goalName = String(goal.goal_name || 'Untitled goal');
    const fallbackHash = Array.from(goalName || 'goal').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const fallbackRaphael = clamp(44 + fallbackHash % 31, 18, 94);
    const fallbackGabriel = clamp(40 + (fallbackHash * 3) % 34, 18, 93);
    const fallbackJoseph = clamp(46 + (fallbackHash * 5) % 29, 18, 95);
    const hasMeaningfulAxes =
        Number(goal.axes?.raphael?.progress || 0) > 0
        || Number(goal.axes?.gabriel?.progress || 0) > 0
        || Number(goal.axes?.joseph?.progress || 0) > 0;
    const axes = hasMeaningfulAxes
        ? goal.axes
        : {
            raphael: { label: goal.axes?.raphael?.label || 'Recovery and risk', progress: Math.round(fallbackRaphael) },
            gabriel: { label: goal.axes?.gabriel?.label || 'Budget support', progress: Math.round(fallbackGabriel) },
            joseph: { label: goal.axes?.joseph?.label || 'Family follow-through', progress: Math.round(fallbackJoseph) },
        };
    const raphaelProgress = Number(axes?.raphael?.progress || 0);
    const gabrielProgress = Number(axes?.gabriel?.progress || 0);
    const josephProgress = Number(axes?.joseph?.progress || 0);
    const weakestSaint = [
        { saint: 'Raphael', progress: raphaelProgress },
        { saint: 'Gabriel', progress: gabrielProgress },
        { saint: 'Joseph', progress: josephProgress },
    ].sort((left, right) => left.progress - right.progress)[0];

    const blockers = goal.blockers && goal.blockers.length > 0
        ? goal.blockers
        : [
            ...(raphaelProgress < 55 ? ['Raphael recovery progress is below target.'] : []),
            ...(gabrielProgress < 55 ? ['Gabriel budget support is underfunded.'] : []),
            ...(josephProgress < 55 ? ['Joseph family participation is too thin for the goal.'] : []),
        ];

    const recommendations = goal.recommendations && goal.recommendations.length > 0
        ? goal.recommendations
        : [
            ...(raphaelProgress < 70 ? ['Increase recovery rituals and health follow-through before the next review.'] : []),
            ...(gabrielProgress < 70 ? ['Move more budget into the goal category and reduce overspent leakage.'] : []),
            ...(josephProgress < 70 ? ['Assign named family members to the goal so participation is explicit.'] : []),
        ];

    const createdAt = toIsoOrFallback(goal.created_at, () => new Date().toISOString());
    const nextReviewAt = toIsoOrFallback(
        goal.next_review_at,
        () => addDaysIso(createdAt, 7, () => new Date(Date.now() + 7 * 86400000).toISOString()),
    );
    const lastReviewedAt = goal.last_reviewed_at
        ? toIsoOrFallback(goal.last_reviewed_at, () => createdAt)
        : null;

    return {
        ...goal,
        goal_name: goalName,
        id: goal.id || `goal-${goalName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        axes,
        created_at: createdAt,
        composite_progress: goal.composite_progress > 0
            ? goal.composite_progress
            : Math.round((raphaelProgress + gabrielProgress + josephProgress) / 3),
        summary: goal.summary || `${goalName} is currently led by ${weakestSaint.saint}; that axis is the limiting factor on cross-Saint progress.`,
        blockers,
        recommendations,
        next_review_at: nextReviewAt,
        last_reviewed_at: lastReviewedAt,
        family_tracking: goal.family_tracking || [],
    };
}

export function getStoredTrinityGoals(): TrinityGoal[] {
    const stored = readLocalJson<TrinityGoal[]>(TRINITY_GOALS_KEY, []);
    if (stored.length > 0) {
        const hydrated = stored.map(hydrateTrinityGoal);
        writeLocalJson(TRINITY_GOALS_KEY, hydrated);
        return hydrated;
    }
    const seeded = buildSeedGoals();
    writeLocalJson(TRINITY_GOALS_KEY, seeded.map(hydrateTrinityGoal));
    return seeded;
}

export function persistTrinityGoal(goal: TrinityGoal): TrinityGoal[] {
    const existing = getStoredTrinityGoals();
    const hydratedGoal = hydrateTrinityGoal(goal);
    const deduped = [hydratedGoal, ...existing.filter(item => item.goal_name !== hydratedGoal.goal_name)].slice(0, 8);
    writeLocalJson(TRINITY_GOALS_KEY, deduped);
    return deduped;
}

export function updateStoredTrinityGoal(goalId: string, updates: Partial<TrinityGoal>): TrinityGoal[] {
    const updated = getStoredTrinityGoals().map(goal =>
        goal.id === goalId ? hydrateTrinityGoal({ ...goal, ...updates }) : hydrateTrinityGoal(goal)
    );
    writeLocalJson(TRINITY_GOALS_KEY, updated);
    return updated;
}

export function removeStoredTrinityGoal(goalId: string): TrinityGoal[] {
    const next = getStoredTrinityGoals().filter(goal => goal.id !== goalId);
    writeLocalJson(TRINITY_GOALS_KEY, next);
    return next;
}

export function getStoredTrinityWhatIfHistory(): TrinityWhatIfHistoryEntry[] {
    return readLocalJson<TrinityWhatIfHistoryEntry[]>(TRINITY_WHATIF_HISTORY_KEY, []);
}

function recordTrinityWhatIf(result: AnyRecord) {
    const entry: TrinityWhatIfHistoryEntry = {
        scenario: result.scenario,
        scenario_type: result.scenario_type,
        duration_months: result.duration_months,
        overall_recommendation: result.overall_recommendation,
        generated_at: result.generated_at || new Date().toISOString(),
        result,
    };
    const next = [entry, ...getStoredTrinityWhatIfHistory().filter(item =>
        !(item.scenario === entry.scenario && item.scenario_type === entry.scenario_type && item.duration_months === entry.duration_months)
    )].slice(0, 6);
    writeLocalJson(TRINITY_WHATIF_HISTORY_KEY, next);
}

export function getTrinitySummarySnapshot() {
    const context = getLocalTrinityContext();
    const vitality = buildFamilyVitalityFallback(context);
    const elder = buildElderCareFallback(context);
    return {
        livingMembers: context.livingMembers.length,
        elderMembers: context.elders.length,
        familyEvents: context.events.length,
        vitalityScore: vitality.vitality_score,
        emergencyFundMonths: Number((context.finances.netWorth / Math.max(context.finances.monthlyIncome, 1)).toFixed(1)),
        projectedNetWorth: context.finances.netWorth,
        elderGap: elder.family_coverage_gap,
    };
}

function buildCouncilFallback(body: AnyRecord, context = getLocalTrinityContext()) {
    const userMessage = String(body.user_message || 'Help me coordinate health, wealth, and family stewardship.');
    const livingCount = context.livingMembers.length;
    const elderCount = context.elders.length;
    const { stress, sleep } = context.primaryHealth;
    const emergencyMonths = context.finances.netWorth / Math.max(context.finances.monthlyIncome, 1);
    const topic = /move|relocat|city|state/i.test(userMessage)
        ? 'relocation'
        : /career|job|work|startup|promotion/i.test(userMessage)
            ? 'career'
            : /retire|retirement/i.test(userMessage)
                ? 'retirement'
                : /health|sleep|stress|medical/i.test(userMessage)
                    ? 'health'
                    : 'stewardship';

    const topicSummary: Record<string, string> = {
        relocation: `the move will touch ${livingCount} connected family records and ${elderCount} elder support obligations`,
        career: `the decision changes both time pressure and care coverage across ${livingCount} living relatives`,
        retirement: `the family can trade income for a healthier care cadence if the runway stays above ${emergencyMonths.toFixed(1)} months`,
        health: `current household recovery indicators point to ${sleep.toFixed(1)}h sleep and a stress load of ${stress.toFixed(0)}/100`,
        stewardship: 'Trinity sees family continuity, household health, and cash discipline as one linked system',
    };

    return {
        responses: [
            {
                saint: 'joseph',
                icon: 'git-branch',
                color: '#f59e0b',
                response: `St. Joseph sees ${topicSummary[topic]}. Preserve kin continuity first: name who is affected, who can help, and what precedent already exists in the family line before you commit.`,
            },
            {
                saint: 'raphael',
                icon: 'heart',
                color: '#14b8a6',
                response: `St. Raphael reads this as a recovery question, not only a planning question. With baseline stress near ${stress.toFixed(0)}/100, you should only proceed if the new plan protects sleep, walking time, and at least one low-friction health ritual each week.`,
            },
            {
                saint: 'gabriel',
                icon: 'wallet',
                color: '#10b981',
                response: `St. Gabriel treats the next move as a runway problem. Keep emergency reserves above ${emergencyMonths.toFixed(1)} months, isolate the true monthly downside, and fund care-heavy categories before lifestyle upgrades.`,
            },
        ],
    };
}

function buildCrossSaintGoalFallback(body: AnyRecord, context = getLocalTrinityContext()) {
    const name = String(body.goal_name || 'Untitled Trinity Goal').trim();
    const goalType = String(body.goal_type || 'health');
    const profile = context.primaryHealth;
    const goalHash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const raphaelProgress = clamp(48 + (100 - profile.riskScore) * 0.4 + goalHash % 8, 18, 94);
    const gabrielProgress = clamp(42 + context.finances.healthBudget / 20 + goalHash % 11, 22, 93);
    const josephProgress = clamp(50 + context.livingMembers.length * 4 + goalHash % 9, 26, 95);
    const composite = Math.round((raphaelProgress + gabrielProgress + josephProgress) / 3);
    const goal: TrinityGoal = {
        id: `goal-${Date.now()}`,
        goal_name: name,
        goal_type: goalType,
        status: composite >= 74 ? 'on_track' : composite >= 52 ? 'needs_attention' : 'blocked',
        composite_progress: composite,
        axes: {
            raphael: { label: 'Recovery and risk', progress: Math.round(raphaelProgress) },
            gabriel: { label: 'Budget support', progress: Math.round(gabrielProgress) },
            joseph: { label: 'Family follow-through', progress: Math.round(josephProgress) },
        },
        created_at: new Date().toISOString(),
        health_target: body.health_target,
        budget_allocation: body.budget_allocation,
        family_tracking: body.family_tracking || [],
        summary: `${name} coordinates ${goalType} work across health, family, and finance so no single saint is carrying the entire objective alone.`,
        recommendations: [
            raphaelProgress < 70
                ? 'Use Raphael to tighten the health-side metric and review the underlying risk signal.'
                : 'Keep Raphael on maintenance cadence and avoid losing recovery momentum.',
            gabrielProgress < 70
                ? 'Move Gabriel budget into the target category until the monthly commitment is reliably funded.'
                : 'Gabriel should preserve the current budget support and protect the runway.',
            josephProgress < 70
                ? 'Add named family members so Joseph can convert the goal into accountable participation.'
                : 'Joseph family support is solid; keep assignments explicit.',
        ],
        blockers: [
            ...(raphaelProgress < 55 ? ['The health axis is materially below target.'] : []),
            ...(gabrielProgress < 55 ? ['The financial axis is materially below target.'] : []),
            ...(josephProgress < 55 ? ['The family participation axis is materially below target.'] : []),
        ],
        next_review_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        last_reviewed_at: null,
    };
    persistTrinityGoal(goal);
    return hydrateTrinityGoal(goal);
}

function buildFamilyVitalityFallback(context = getLocalTrinityContext()) {
    const averageWellness = context.healthProfiles.reduce((sum, member) => sum + member.wellnessScore, 0) / Math.max(context.healthProfiles.length, 1);
    const josephScore = clamp(56 + context.livingMembers.length * 3 + context.events.length * 0.4, 40, 92);
    const raphaelScore = clamp(averageWellness, 32, 90);
    const gabrielScore = clamp(46 + context.finances.healthBudget / 18 + context.finances.elderBudget / 60 - context.finances.overspentEnvelopes * 8, 28, 90);
    const vitalityScore = Math.round(josephScore * 0.32 + raphaelScore * 0.38 + gabrielScore * 0.30);

    return {
        vitality_score: vitalityScore,
        breakdown: {
            joseph: { label: 'Family continuity', score: josephScore, weight: 32 },
            raphael: { label: 'Recovery and resilience', score: raphaelScore, weight: 38 },
            gabriel: { label: 'Financial readiness', score: gabrielScore, weight: 30 },
        },
        insights: {
            condition_density: Number((context.healthProfiles.reduce((sum, member) => sum + member.conditions.length, 0) / Math.max(context.members.length, 1)).toFixed(1)),
            savings_rate: clamp(18 + context.finances.netWorth / Math.max(context.finances.monthlyIncome * 125, 1) * 10, 12, 44),
            emergency_months: Number((context.finances.netWorth / Math.max(context.finances.monthlyIncome, 1)).toFixed(1)),
            overspent_envelopes: context.finances.overspentEnvelopes,
        },
        generated_at: new Date().toISOString(),
    };
}

function buildEmergencyAlertFallback(context = getLocalTrinityContext()) {
    const primary = context.primaryMember;
    const health = context.primaryHealth;
    const nextOfKin = context.livingMembers
        .filter(member => member.id !== primary?.id)
        .slice(0, 3)
        .map(member => {
            const path = primary ? findRelationshipPath(primary.id, member.id) : null;
            return {
                name: formatMemberName(member),
                relationship: path ? describeRelationship(path) : (member.generation > (primary?.generation ?? 0) ? 'Child' : 'Sibling'),
            };
        });

    const alertLevel = health.riskScore >= 70 ? 'critical' : health.riskScore >= 55 ? 'high' : 'moderate';
    return {
        alert_level: alertLevel,
        cascade: {
            raphael: {
                step: 1,
                message: `${formatMemberName(primary || {})} is showing elevated strain markers: stress ${health.stress.toFixed(0)}/100 and sleep ${health.sleep.toFixed(1)}h.`,
            },
            gabriel: {
                step: 2,
                message: `Emergency coverage can fund ${(context.finances.netWorth / Math.max(context.finances.monthlyIncome, 1)).toFixed(1)} months of household burn with ${context.finances.overspentEnvelopes} overspent category currently pressuring response speed.`,
            },
            joseph: {
                step: 3,
                message: `Immediate kin routing is ready for ${nextOfKin.length} family contacts.`,
                next_of_kin: nextOfKin,
            },
        },
        recommended_action: alertLevel === 'critical'
            ? 'Escalate to the household care plan now, protect recovery time, and shift discretionary spend into emergency coverage.'
            : 'Review recovery routines, confirm next-of-kin contacts, and top up the emergency envelope before the next stress spike.',
        generated_at: new Date().toISOString(),
    };
}

function buildSeasonalMonthEvents(monthIndex: number, context = getLocalTrinityContext(), combinedRisk = 0, gabrielPressure: 'high' | 'moderate' | 'low' | 'normal' | 'no_data' = 'low') {
    return context.events
        .filter(event => {
            const eventDate = new Date(`${event.date}T12:00:00`);
            return !Number.isNaN(eventDate.getTime()) && eventDate.getMonth() === monthIndex;
        })
        .map(event => {
            const member = context.members.find(candidate => candidate.id === event.memberId);
            const location = member?.birthPlace
                || (event.description?.toLowerCase().startsWith('born in ') ? event.description.replace(/^Born in /i, '') : undefined)
                || 'Family Record';
            const startTime = new Date(`${event.date}T09:00:00`);
            const endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + 1);
            const category = event.type === 'birth'
                ? 'Birthdays'
                : event.type === 'marriage'
                    ? 'Anniversaries'
                    : event.type === 'death'
                        ? 'Remembrance'
                        : 'Family Timeline';
            const riskSummary = combinedRisk >= 2
                ? 'This month needs extra Trinity coordination across health, family, and treasury.'
                : gabrielPressure === 'high'
                    ? 'Household spend pressure is elevated around this event.'
                    : event.type === 'milestone'
                        ? 'Coordinate logistics and family support early.'
                        : undefined;

            return {
                id: event.id,
                title: event.title,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                location,
                attendees: [event.memberName, 'Household'],
                notes: event.description || `${event.memberName} is represented in the Joseph family record for this month.`,
                description: event.description,
                url: event.mediaUrl,
                allDay: true,
                availability: combinedRisk >= 2 ? 'busy' : 'tentative',
                calendarTitle: category,
                recurrenceRule: event.type === 'birth' || event.type === 'marriage' || event.type === 'death' ? 'FREQ=YEARLY' : undefined,
                alarms: [
                    { relativeOffsetMinutes: -10080, label: '1 week before' },
                    { relativeOffsetMinutes: -1440, label: '1 day before' },
                ],
                source: 'St. Joseph chronology',
                memberName: event.memberName,
                type: event.type,
                riskSummary,
            };
        });
}

function buildSeasonalMonthDetails(
    monthName: string,
    eventCount: number,
    combinedRisk: number,
    raphaelRisk: number,
    gabrielPressure: 'high' | 'moderate' | 'low' | 'normal' | 'no_data',
    riskFlags: string[]
) {
    const summary = eventCount > 0
        ? `${monthName} carries ${eventCount} recorded family ${eventCount > 1 ? 'events' : 'event'} with ${riskFlags.length || 'no'} active Trinity watch ${riskFlags.length === 1 ? 'flag' : 'flags'}.`
        : `${monthName} has no recorded family anniversaries or milestones, so Trinity treats it as a preventive-care window.`;

    const recommendation = combinedRisk >= 2
        ? 'Front-load recovery time, verify care coverage, and pre-fund high-pressure categories before the month opens.'
        : gabrielPressure === 'high'
            ? 'Review category limits and cash buffers before discretionary commitments land this month.'
            : raphaelRisk >= 60
                ? 'Protect sleep, walking cadence, and appointment reminders even if the calendar load looks light.'
                : eventCount > 0
                    ? 'Confirm attendees, reminders, and family logistics early so the month stays low-friction.'
                    : 'Use the quieter month to schedule preventive screenings and household planning reviews.';

    const alarms = [
        ...(eventCount > 0 ? [`${eventCount} family ${eventCount > 1 ? 'events' : 'event'} to prepare`] : ['No hard family events recorded']),
        ...(combinedRisk >= 2 ? ['Extra Trinity review recommended'] : []),
        ...(gabrielPressure === 'high' ? ['Budget pressure checkpoint needed'] : []),
    ];

    return { summary, recommendation, alarms };
}

function normalizeSeasonalCalendarPayload(payload: AnyRecord, context = getLocalTrinityContext()) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const inputCalendar = Array.isArray(payload.calendar) ? payload.calendar : [];

    const calendar = inputCalendar.map((entry: AnyRecord, index: number) => {
        const rawMonth = typeof entry.month === 'number' ? entry.month : index;
        const monthIndex = rawMonth >= 1 && rawMonth <= 12 ? rawMonth - 1 : rawMonth;
        const monthName = entry.month_name || monthNames[monthIndex] || monthNames[index];
        const raphaelRisk = Number(entry.raphael?.avg_risk_score ?? clamp(context.primaryHealth.riskScore - 6 + monthIndex, 24, 86));
        const gabrielPressure = String(entry.gabriel?.pressure || 'low') as 'high' | 'moderate' | 'low' | 'normal' | 'no_data';
        const combinedRisk = Number.isFinite(entry.combined_risk) ? Number(entry.combined_risk) : 0;
        const events = buildSeasonalMonthEvents(monthIndex, context, combinedRisk, gabrielPressure);
        const eventCount = Number(entry.joseph?.event_count ?? events.length);
        const riskFlags = Array.isArray(entry.risk_flags) ? entry.risk_flags : [];
        const details = buildSeasonalMonthDetails(monthName, eventCount, combinedRisk, raphaelRisk, gabrielPressure, riskFlags);

        return {
            ...entry,
            month: monthIndex,
            month_name: monthName,
            combined_risk: combinedRisk,
            risk_flags: riskFlags,
            joseph: {
                ...(entry.joseph || {}),
                event_count: eventCount,
            },
            raphael: {
                ...(entry.raphael || {}),
                avg_risk_score: raphaelRisk,
            },
            gabriel: {
                ...(entry.gabriel || {}),
                pressure: gabrielPressure,
            },
            events,
            details,
        };
    });

    return {
        ...payload,
        calendar,
        high_risk_months: Array.isArray(payload.high_risk_months) && payload.high_risk_months.length > 0
            ? payload.high_risk_months
            : calendar.filter(month => month.combined_risk >= 2).map(month => month.month_name),
    };
}

function buildSeasonalCalendarFallback(context = getLocalTrinityContext()) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const eventCounts = new Map<number, number>();
    for (const event of context.events) {
        const month = new Date(`${event.date}T00:00:00`).getMonth();
        eventCounts.set(month, (eventCounts.get(month) || 0) + 1);
    }

    const calendar = monthNames.map((monthName, monthIndex) => {
        const eventCount = eventCounts.get(monthIndex) || 0;
        const seasonalRisk = [2, 1, 1, 0, 0, 1, 2, 1, 0, 1, 2, 2][monthIndex];
        const spendingPressure = [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 2][monthIndex];
        const combinedRisk = clamp(seasonalRisk + (eventCount >= 2 ? 1 : 0), 0, 3);
        const riskFlags = [
            ...(eventCount >= 2 ? ['family_load'] : []),
            ...(combinedRisk >= 2 ? ['health_watch'] : []),
            ...(spendingPressure >= 1 ? ['budget_pressure'] : []),
        ];
        const pressureLabel = spendingPressure >= 2 ? 'high' : spendingPressure === 1 ? 'moderate' : 'low';
        const raphaelRisk = clamp(context.primaryHealth.riskScore + seasonalRisk * 4 - 3, 24, 86);
        return {
            month: monthIndex,
            month_name: monthName,
            combined_risk: combinedRisk,
            risk_flags: riskFlags,
            joseph: { event_count: eventCount },
            raphael: { avg_risk_score: raphaelRisk },
            gabriel: { pressure: pressureLabel },
            events: buildSeasonalMonthEvents(monthIndex, context, combinedRisk, pressureLabel),
            details: buildSeasonalMonthDetails(monthName, eventCount, combinedRisk, raphaelRisk, pressureLabel, riskFlags),
        };
    });

    return {
        calendar,
        high_risk_months: calendar.filter(month => month.combined_risk >= 2).map(month => month.month_name),
        generated_at: new Date().toISOString(),
    };
}

function buildFamilyChronicleFallback(context = getLocalTrinityContext()) {
    const josephEntries = context.events.slice(-12).map(event => ({
        saint: 'joseph',
        title: event.title,
        description: event.description || `${event.memberName} recorded in the family chronicle.`,
        year: new Date(`${event.date}T00:00:00`).getFullYear(),
    }));
    const raphaelEntries = context.healthProfiles
        .slice(0, 4)
        .map(member => ({
            saint: 'raphael',
            title: `${formatMemberName(member.member)} health watch`,
            description: member.conditions.length > 0
                ? `Monitoring ${member.conditions.join(', ')} with ${member.trajectory} recovery trajectory.`
                : `Recovery markers remain ${member.trajectory} with wellness score ${member.wellnessScore.toFixed(0)}.`,
            year: new Date().getFullYear(),
        }));
    const gabrielEntries = [
        {
            saint: 'gabriel',
            title: 'Family runway updated',
            description: `Net worth is tracking near $${Math.round(context.finances.netWorth).toLocaleString()} with ${context.finances.overspentEnvelopes} overspent envelope requiring review.`,
            year: new Date().getFullYear(),
        },
        {
            saint: 'gabriel',
            title: 'Care budget protected',
            description: `Elder and health categories currently carry $${Math.round(context.finances.healthBudget + context.finances.elderBudget).toLocaleString()} in assigned support capital.`,
            year: new Date().getFullYear(),
        },
    ];

    const entries = [...josephEntries, ...raphaelEntries, ...gabrielEntries]
        .sort((a, b) => b.year - a.year)
        .slice(0, 18);

    return {
        entries,
        total_entries: entries.length,
        generated_at: new Date().toISOString(),
    };
}

function buildElderCareFallback(context = getLocalTrinityContext()) {
    const elderBudget = context.finances.elderBudget || 2300;
    const elderMembers = context.elders.map(member => {
        const profile = getHealthProfile(member);
        const estimatedMonthlyCost = Math.round(1800 + profile.age * 22 + profile.conditions.length * 320);
        const currentBudget = Math.round(elderBudget / Math.max(context.elders.length, 1));
        const coverageRatio = Number((currentBudget / Math.max(estimatedMonthlyCost, 1)).toFixed(2));
        return {
            member_id: member.id,
            name: formatMemberName(member),
            age: profile.age,
            conditions: profile.conditions,
            health_trajectory: profile.trajectory,
            coverage_status: coverageRatio >= 0.8 ? 'funded' : coverageRatio >= 0.45 ? 'underfunded' : 'critical',
            care_type: profile.riskScore >= 70 ? 'nursing' : profile.riskScore >= 52 ? 'assisted' : 'independent',
            estimated_monthly_cost: estimatedMonthlyCost,
            current_budget: currentBudget,
            coverage_ratio: coverageRatio,
        };
    });
    const totalMonthlyCost = elderMembers.reduce((sum, member) => sum + member.estimated_monthly_cost, 0);
    const totalBudget = elderMembers.reduce((sum, member) => sum + member.current_budget, 0);

    return {
        elder_members: elderMembers,
        total_elders: elderMembers.length,
        family_coverage_gap: Math.max(0, totalMonthlyCost - totalBudget),
        total_monthly_cost: totalMonthlyCost,
        total_budget_allocated: totalBudget,
        generated_at: new Date().toISOString(),
    };
}

function buildBehavioralNudgeFallback(context = getLocalTrinityContext()) {
    const profile = context.primaryHealth;
    const budgetPressure = clamp(context.finances.overspentEnvelopes * 26 + (context.finances.healthBudget < 500 ? 18 : 0), 8, 88);
    const nudges = [];

    if (profile.stress >= 55) {
        nudges.push({
            priority: 'immediate',
            title: 'Protect recovery window tonight',
            message: `Stress is sitting near ${profile.stress.toFixed(0)}/100. Shorten late-evening stimulation and protect a 30-minute cooldown block.`,
            sources: ['raphael', 'joseph'],
            action: 'Block recovery time',
        });
    }
    if (budgetPressure >= 35) {
        nudges.push({
            priority: 'today',
            title: 'Move idle cash into care categories',
            message: `${context.finances.overspentEnvelopes} envelope is overspent while elder and health obligations remain active. Rebalance before the next billing cycle.`,
            sources: ['gabriel'],
            action: 'Review envelopes',
        });
    }
    nudges.push({
        priority: 'weekly',
        title: 'Family accountability check-in',
        message: `Use Trinity to confirm one shared goal with ${context.livingMembers.length} living family members this week.`,
        sources: ['joseph', 'gabriel', 'raphael'],
        action: 'Run weekly review',
    });

    return {
        nudges,
        nudge_count: nudges.length,
        generated_at: new Date().toISOString(),
    };
}

function buildInheritanceHeirs(context: ReturnType<typeof getLocalTrinityContext>, target: AnyRecord) {
    return context.livingMembers
        .filter(member => member.id !== target?.id)
        .slice(0, 4)
        .map((member, index, list) => {
            const path = target ? findRelationshipPath(target.id, member.id) : null;
            return {
                name: formatMemberName(member),
                relationship: path ? describeRelationship(path) : 'Family',
                member_id: member.id,
                share_percent: Math.round(100 / Math.max(list.length, 1)),
                generation: member.generation,
                relationship_path: path?.map(step => step.relationship) || [],
            };
        });
}

function normalizeInheritedCondition(condition: string) {
    const value = String(condition || '').toLowerCase();
    if (/blood pressure|cardio|heart|vascular/.test(value)) return 'Cardiometabolic strain';
    if (/diabetes|glucose|metabolic/.test(value)) return 'Metabolic regulation';
    if (/stress|anxiety|resilience/.test(value)) return 'Stress resilience';
    if (/sleep|insomnia|recovery/.test(value)) return 'Sleep recovery';
    if (/mobility|arthritis|balance/.test(value)) return 'Mobility and aging';
    if (/medication/.test(value)) return 'Medication adherence';
    if (/preventive|screening/.test(value)) return 'Preventive vigilance';
    return condition;
}

function buildPedigreeContinuity(context: ReturnType<typeof getLocalTrinityContext>, target: AnyRecord, heirs: AnyRecord[]) {
    const totalMembers = Math.max(context.members.length, 1);
    const membersWithSources = context.members.filter(member => Array.isArray(member.sources) && member.sources.length > 0).length;
    const generationsCovered = new Set(context.members.map(member => member.generation)).size;
    const livingLine = heirs.filter(heir => heir.relationship !== 'Family');
    const nextOfKinConfidence = clamp(38 + livingLine.length * 13 + membersWithSources * 7 + generationsCovered * 8, 24, 97);
    const continuityGaps = [
        ...(heirs.length === 0 ? ['No heirs are mapped to the current family graph.'] : []),
        ...(membersWithSources === 0 ? ['No source citations are attached to family records yet.'] : []),
        ...(context.events.length < 6 ? ['Family chronology is thin; add milestone and document events.'] : []),
        ...(context.livingMembers.length < 3 ? ['Very few living family members are available for continuity routing.'] : []),
    ];

    return {
        summary: heirs.length > 0
            ? `${heirs.length} likely heir${heirs.length === 1 ? '' : 's'} are connected to ${formatMemberName(target)} through the documented family graph.`
            : `No heir path is documented yet for ${formatMemberName(target)}.`,
        generations_covered: generationsCovered,
        family_records: context.events.length,
        documented_heirs: heirs.length,
        source_backed_members: membersWithSources,
        source_coverage_percent: Math.round((membersWithSources / totalMembers) * 100),
        next_of_kin_confidence: nextOfKinConfidence,
        continuity_gaps: continuityGaps,
        highlighted_paths: heirs.map((heir) => ({
            ...heir,
            path_summary: heir.relationship_path?.length > 0 ? heir.relationship_path.join(' -> ') : 'Direct family mapping unavailable',
        })),
    };
}

function buildHereditarySignals(context: ReturnType<typeof getLocalTrinityContext>, target: AnyRecord) {
    const signals = new Map<string, {
        condition: string;
        members: Array<{ id: string; name: string; generation: number; gender: string; relationship: string }>;
        generations: Set<number>;
    }>();

    for (const member of context.members) {
        const conditions = inferConditions(member).map(normalizeInheritedCondition);
        if (conditions.length === 0) continue;
        for (const condition of conditions) {
            const path = target ? findRelationshipPath(target.id, member.id) : null;
            const record = signals.get(condition) || {
                condition,
                members: [],
                generations: new Set<number>(),
            };
            record.members.push({
                id: member.id,
                name: formatMemberName(member),
                generation: member.generation,
                gender: member.gender || 'other',
                relationship: member.id === target?.id ? 'Self' : path ? describeRelationship(path) : 'Family',
            });
            record.generations.add(member.generation);
            signals.set(condition, record);
        }
    }

    const results = Array.from(signals.values())
        .filter((signal) => signal.members.length >= 2)
        .sort((left, right) => right.members.length - left.members.length)
        .slice(0, 4)
        .map((signal) => {
            const generationsCovered = signal.generations.size;
            const femaleMembers = signal.members.filter(member => member.gender === 'female').length;
            const sameGenerationCluster = generationsCovered === 1 && signal.members.length >= 2;
            const maternalCluster = generationsCovered >= 2 && femaleMembers >= Math.ceil(signal.members.length * 0.66);
            const pattern = generationsCovered >= 3
                ? 'Vertical multigenerational pattern'
                : maternalCluster
                    ? 'Maternal-line cluster'
                    : sameGenerationCluster
                        ? 'Sibling / cohort cluster'
                        : 'Shared family risk pattern';
            const confidence = clamp(34 + signal.members.length * 16 + generationsCovered * 12, 28, 92);
            return {
                condition: signal.condition,
                pattern,
                confidence_score: confidence,
                confidence_label: confidence >= 80 ? 'High' : confidence >= 60 ? 'Moderate' : 'Watch',
                generations_covered: generationsCovered,
                affected_members: signal.members,
                explanation: `${signal.condition} appears in ${signal.members.length} family record${signal.members.length === 1 ? '' : 's'} across ${generationsCovered} generation${generationsCovered === 1 ? '' : 's'}. This is a family-pattern inference only, not a genetic diagnosis.`,
                recommended_actions: [
                    'Compare this pattern against Raphael health metrics before escalating risk.',
                    'Attach source records or physician notes to the family members involved.',
                    'Use Joseph to confirm whether the signal reflects ancestry, lifestyle, or caregiving environment.',
                ],
            };
        });

    return {
        disclaimer: 'These signals are inferred from family conditions and genealogy patterns. They are not a diagnosis or legal-medical determination.',
        signals: results,
    };
}

function buildContinuityAutomation(context: ReturnType<typeof getLocalTrinityContext>, target: AnyRecord, heirs: AnyRecord[], estateReady: boolean) {
    const primaryHealth = getHealthProfile(target || {});
    const releaseMode = heirs.length > 0 ? 'Executor approval + heartbeat timeout' : 'Manual family intervention';
    const automationReadiness = estateReady
        ? primaryHealth.riskScore >= 65 ? 'elevated' : 'armed'
        : 'manual_only';
    const triggers = [
        {
            label: 'Heartbeat timeout',
            status: estateReady ? 'available' : 'not_configured',
            detail: estateReady ? 'WiseGold living-will release can be tied to a missed heartbeat window.' : 'Set up a living-will workflow before heartbeat automation can run.',
        },
        {
            label: 'Executor / heir approval',
            status: heirs.length > 0 ? 'available' : 'missing',
            detail: heirs.length > 0 ? `${heirs.length} family executor candidate${heirs.length === 1 ? '' : 's'} detected from Joseph.` : 'No executor path is documented in the family tree.',
        },
        {
            label: 'Digital legacy dispatch',
            status: estateReady ? 'ready_for_setup' : 'needs_setup',
            detail: estateReady ? 'Use Digital Legacy or Legacy Vault to schedule vault release and memorial handoff.' : 'Create the estate and directive artifacts before any automated dispatch.',
        },
    ];

    return {
        summary: estateReady
            ? 'Continuity automation can be configured around executors, release rules, and digital legacy delivery.'
            : 'Continuity is still manual. Family graph coverage exists, but release rules and directives are not complete.',
        automation_readiness: automationReadiness,
        release_mode: releaseMode,
        notification_contacts: heirs.length,
        executor_count: Math.min(heirs.length, 2),
        directive_status: estateReady ? 'Ready for automation wiring' : 'Directive incomplete',
        heartbeat_status: primaryHealth.riskScore >= 65 ? 'Recommended' : 'Optional',
        triggers,
        next_actions: [
            ...(estateReady ? ['Open Legacy Vault and attach executors to the release flow.'] : ['Complete the heir plan and estate summary before enabling release automation.']),
            'Pair the health directive with emergency contacts and kin review.',
            'Define who receives memorial, will, and financial handoff artifacts.',
        ],
    };
}

function buildEstateAssets(context: ReturnType<typeof getLocalTrinityContext>, estateValue: number) {
    const emergencyReserve = Math.round(context.finances.monthlyIncome * 3.5);
    const careReserve = Math.round((context.finances.healthBudget + context.finances.elderBudget) * 6);
    const digitalReserve = Math.max(Math.round(estateValue - emergencyReserve - careReserve), 0);
    return [
        {
            label: 'Emergency reserve runway',
            category: 'liquidity',
            value: emergencyReserve,
            status: emergencyReserve >= context.finances.monthlyIncome * 3 ? 'mapped' : 'thin',
            notes: 'Near-term liquid runway derived from Gabriel household income and reserve posture.',
        },
        {
            label: 'Care and support reserve',
            category: 'family_care',
            value: careReserve,
            status: careReserve > 0 ? 'mapped' : 'missing',
            notes: 'Health and elder-care budget capacity available for continuity support.',
        },
        {
            label: 'Broader estate / treasury pool',
            category: 'estate',
            value: digitalReserve,
            status: digitalReserve > 0 ? 'mapped' : 'unfunded',
            notes: 'Residual estate value after liquidity and care buffers.',
        },
    ];
}

function buildInheritanceChecklist(
    context: ReturnType<typeof getLocalTrinityContext>,
    heirs: AnyRecord[],
    estateReady: boolean,
    pedigree: AnyRecord,
    hereditarySignals: AnyRecord,
    continuityAutomation: AnyRecord,
) {
    return [
        {
            label: 'Heirs and executors documented',
            status: heirs.length > 0 ? 'ready' : 'missing',
            detail: heirs.length > 0 ? `${heirs.length} mapped heir${heirs.length === 1 ? '' : 's'} found in the family graph.` : 'No heir designation is tied to the family tree yet.',
        },
        {
            label: 'Family graph and records coverage',
            status: pedigree.source_coverage_percent >= 25 || pedigree.family_records >= 8 ? 'ready' : 'needs_attention',
            detail: `${pedigree.family_records} family events and ${pedigree.source_backed_members} source-backed member${pedigree.source_backed_members === 1 ? '' : 's'} are currently attached.`,
        },
        {
            label: 'Health directive clarity',
            status: hereditarySignals.signals.length > 0 ? 'needs_attention' : 'ready',
            detail: hereditarySignals.signals.length > 0
                ? `${hereditarySignals.signals.length} family-pattern signal${hereditarySignals.signals.length === 1 ? '' : 's'} should be reflected in the care directive.`
                : 'No repeated hereditary risk clusters are currently inferred from the family record.',
        },
        {
            label: 'Continuity automation',
            status: estateReady ? 'needs_attention' : 'missing',
            detail: continuityAutomation.summary,
        },
        {
            label: 'Living support network',
            status: context.livingMembers.length >= 3 ? 'ready' : 'needs_attention',
            detail: `${context.livingMembers.length} living family member${context.livingMembers.length === 1 ? '' : 's'} are available for next-of-kin routing.`,
        },
    ];
}

function normalizeInheritanceDirectivePayload(payload: AnyRecord, context = getLocalTrinityContext()) {
    const target = context.members.find(member => member.id === payload.member_id)
        || context.elders[0]
        || context.primaryMember;
    const profile = getHealthProfile(target || {});
    const heirs = Array.isArray(payload.heir_plan?.heirs) && payload.heir_plan.heirs.length > 0
        ? payload.heir_plan.heirs
        : buildInheritanceHeirs(context, target);
    const estateValue = Math.round(Number(payload.estate?.total_value || context.finances.netWorth || 0));
    const estateReady = Boolean(payload.estate?.distribution_ready ?? heirs.length > 0);
    const pedigreeContinuity = buildPedigreeContinuity(context, target, heirs);
    const hereditarySignals = buildHereditarySignals(context, target);
    const continuityAutomation = buildContinuityAutomation(context, target, heirs, estateReady);
    const estateAssets = buildEstateAssets(context, estateValue);
    const readinessChecklist = buildInheritanceChecklist(
        context,
        heirs,
        estateReady,
        pedigreeContinuity,
        hereditarySignals,
        continuityAutomation,
    );

    return {
        member_id: target?.id || payload.member_id || 'family',
        member_name: formatMemberName(target || {}),
        urgency: payload.urgency || (profile.riskScore >= 65 ? 'high' : profile.riskScore >= 48 ? 'moderate' : 'low'),
        prognosis: {
            risk_level: payload.prognosis?.risk_level || profile.riskLevel,
            trajectory: payload.prognosis?.trajectory || profile.trajectory,
            active_conditions: payload.prognosis?.active_conditions || profile.conditions,
        },
        estate: {
            total_value: estateValue,
            distribution_ready: estateReady,
            asset_count: estateAssets.length,
            ready_label: estateReady ? 'Structured' : 'Needs executor plan',
        },
        heir_plan: {
            heirs,
            no_heirs_designated: heirs.length === 0,
        },
        pedigree_continuity: pedigreeContinuity,
        hereditary_signals: hereditarySignals,
        continuity_automation: continuityAutomation,
        estate_assets: estateAssets,
        readiness_checklist: readinessChecklist,
        action_items: Array.isArray(payload.action_items) && payload.action_items.length > 0
            ? payload.action_items
            : [
                'Confirm beneficiary designations against current family records.',
                'Publish a care directive alongside the estate summary.',
                ...(profile.conditions.length > 0 ? [`Document support instructions for ${profile.conditions.join(', ')}.`] : []),
                ...(pedigreeContinuity.continuity_gaps || []),
            ].slice(0, 5),
        source_notes: [
            'Pedigree continuity is derived from Joseph family graph coverage and record density.',
            'Hereditary signals use family-pattern inference inspired by variant inheritance workflows, but do not diagnose disease.',
            'Continuity automation models dead-man-switch style release readiness for legacy and executor handoff.',
        ],
        generated_at: payload.generated_at || new Date().toISOString(),
    };
}

function buildInheritanceFallback(context = getLocalTrinityContext()) {
    return normalizeInheritanceDirectivePayload({}, context);
}

const WHATIF_IMPACTS: Record<string, AnyRecord> = {
    career: {
        stress_multiplier: 1.35,
        hrv_multiplier: 0.88,
        sleep_multiplier: 0.92,
        income_multiplier: 1.40,
        risk_label: '+15% elevated',
        raphael_narrative: 'A high-intensity career move likely raises stress faster than recovery unless sleep and exercise are explicitly protected.',
        gabriel_narrative: 'Income improves quickly, but health drag and transition costs reduce the net advantage if reserves are thin.',
        occupation_keywords: ['architect', 'designer', 'engineer', 'coach', 'leader'],
    },
    relocation: {
        stress_multiplier: 1.20,
        hrv_multiplier: 0.95,
        sleep_multiplier: 0.90,
        income_multiplier: 1.10,
        risk_label: '+8% temporary',
        raphael_narrative: 'Relocation creates a temporary strain spike while routines, sleep timing, and care access normalize.',
        gabriel_narrative: 'Relocation usually improves optional upside modestly but introduces front-loaded moving and setup costs.',
        occupation_keywords: ['teacher', 'nurse', 'engineer'],
    },
    retirement: {
        stress_multiplier: 0.65,
        hrv_multiplier: 1.15,
        sleep_multiplier: 1.10,
        income_multiplier: 0.40,
        risk_label: '-20% improved',
        raphael_narrative: 'Retirement reduces chronic load and usually improves HRV, sleep regularity, and general resilience.',
        gabriel_narrative: 'Cash inflow drops, but health volatility and work-related spend often fall with it.',
        occupation_keywords: ['retired', 'teacher', 'nurse'],
    },
    default: {
        stress_multiplier: 1.08,
        hrv_multiplier: 0.96,
        sleep_multiplier: 0.97,
        income_multiplier: 1.04,
        risk_label: '+5% watch',
        raphael_narrative: 'The change appears manageable, but the family system still needs a recovery buffer.',
        gabriel_narrative: 'Financial impact is modest and depends more on discipline than on raw income swing.',
        occupation_keywords: [],
    },
};

function buildWhatIfFallback(body: AnyRecord, context = getLocalTrinityContext(body)) {
    const scenario = String(body.scenario || 'Unspecified scenario').trim();
    const scenarioType = String(body.scenario_type || 'default');
    const durationMonths = Number(body.duration_months || 12);
    const impact = WHATIF_IMPACTS[scenarioType] || WHATIF_IMPACTS.default;
    const currentMetrics = body.current_metrics || {
        stress: context.primaryHealth.stress,
        hrv: context.primaryHealth.hrv,
        sleep: context.primaryHealth.sleep,
    };
    const monthlyIncome = Number(body.monthly_income || context.finances.monthlyIncome);
    const currentNetWorth = Number(body.net_worth || context.finances.netWorth);
    const projectedStress = clamp(currentMetrics.stress * impact.stress_multiplier, 18, 98);
    const projectedHrv = clamp(currentMetrics.hrv * impact.hrv_multiplier, 12, 90);
    const projectedSleep = clamp(currentMetrics.sleep * impact.sleep_multiplier, 4.8, 8.8);
    const healthcareCostMonthly = Math.round(Math.abs(projectedStress - currentMetrics.stress) * 16 + context.elders.length * 45);
    const incomeDelta = monthlyIncome * impact.income_multiplier - monthlyIncome;
    const projectedNetWorth = Math.round(currentNetWorth + incomeDelta * durationMonths - healthcareCostMonthly * durationMonths);
    const similarAncestors = context.members
        .map(member => ({
            name: formatMemberName(member),
            occupation: inferOccupation(member),
            lifespan: member.deathDate && member.birthDate
                ? Number(String(member.deathDate).slice(0, 4)) - Number(String(member.birthDate).slice(0, 4))
                : null,
        }))
        .filter(member => impact.occupation_keywords.length === 0 || impact.occupation_keywords.some((keyword: string) => member.occupation.toLowerCase().includes(keyword)))
        .slice(0, 4);

    const result = {
        scenario,
        scenario_type: scenarioType,
        duration_months: durationMonths,
        projections: {
            raphael: {
                stress_12mo: Number(projectedStress.toFixed(1)),
                hrv_12mo: Number(projectedHrv.toFixed(1)),
                sleep_12mo: Number(projectedSleep.toFixed(1)),
                health_risk_change: impact.risk_label,
                narrative: `${impact.raphael_narrative} Over ${durationMonths} months, stress projects to ${projectedStress.toFixed(0)}/100.`,
            },
            gabriel: {
                monthly_income_change: Math.round(incomeDelta),
                projected_net_worth: projectedNetWorth,
                healthcare_cost_monthly: healthcareCostMonthly,
                narrative: `${impact.gabriel_narrative} Net worth tracks toward $${projectedNetWorth.toLocaleString()} if discipline holds.`,
            },
            joseph: {
                similar_ancestors: similarAncestors,
                precedent_found: similarAncestors.length > 0,
                narrative: similarAncestors.length > 0
                    ? `Joseph found ${similarAncestors.length} family precedent signals that can anchor the move in lived family history.`
                    : 'Joseph does not see a direct family precedent, so the decision should be documented and reviewed more deliberately.',
            },
        },
        overall_recommendation: projectedStress >= 70 && projectedNetWorth < currentNetWorth
            ? 'Caution: health strain rises while financial upside stays weak. Reduce scope or stage the change.'
            : projectedStress >= 70
                ? 'Proceed only with explicit recovery protection and a funded mitigation budget.'
                : projectedNetWorth >= currentNetWorth
                    ? 'Favorable enough to proceed if you keep the family care plan and weekly health rituals intact.'
                    : 'Health impact looks manageable, but the financial case is thin. Tighten assumptions before moving.',
        generated_at: new Date().toISOString(),
    };

    recordTrinityWhatIf(result);
    return result;
}

function buildFallbackPayload(action: string, body: AnyRecord) {
    const context = getLocalTrinityContext(body);
    switch (action) {
        case 'trinity_council':
            return buildCouncilFallback(body, context);
        case 'cross_saint_goal':
            return buildCrossSaintGoalFallback(body, context);
        case 'family_vitality':
            return buildFamilyVitalityFallback(context);
        case 'emergency_alert':
            return buildEmergencyAlertFallback(context);
        case 'seasonal_calendar':
            return buildSeasonalCalendarFallback(context);
        case 'family_chronicle':
            return buildFamilyChronicleFallback(context);
        case 'elder_care':
            return buildElderCareFallback(context);
        case 'behavioral_nudge':
            return buildBehavioralNudgeFallback(context);
        case 'inheritance_directive':
            return buildInheritanceFallback(context);
        case 'cross_saint_whatif':
            return buildWhatIfFallback(body, context);
        default:
            return null;
    }
}

export async function trinitySynapse<T = unknown>(action: string, body: AnyRecord = {}): Promise<T | null> {
    const payload = { action, ...body };

    try {
        const data = await requestBackendJson<unknown>(
            '/api/v1/trinity/synapse',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            },
            `Trinity synapse failed for ${action}`,
        );
        if (action === 'cross_saint_whatif' && data) recordTrinityWhatIf(data);
        if (action === 'cross_saint_goal' && data?.goal_name) persistTrinityGoal(data);
        if (action === 'seasonal_calendar' && data) {
            return normalizeSeasonalCalendarPayload(data) as T;
        }
        if (action === 'inheritance_directive' && data) {
            return normalizeInheritanceDirectivePayload(data) as T;
        }
        return data;
    } catch {
        // Fall through to local fallback below.
    }

    return buildFallbackPayload(action, body) as T | null;
}
