import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Brain,
  HeartPulse,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { getFamilyMembers, type FamilyMember } from '../../lib/joseph/genealogy';
import { readStoredPersonalityProfile, toLongTraitScores } from '../../lib/joseph/personalityProfiles';
import { fetchHealthMetrics, type HealthDataPoint } from '../../lib/raphael/healthDataService';
import { requestBackendJson } from '../../lib/backend-request';

interface RiskFactor {
  factor: string;
  weight: number;
  source: string;
}

interface PredictionBundle {
  predicted_value: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  trend: string;
  risk_factors: RiskFactor[];
  uncertainty?: {
    confidence_score?: number;
    confidence_level?: string;
  };
}

interface EarlyWarning {
  warning_id: string;
  metric: string;
  severity: string;
  message: string;
  recommended_action: string;
  confidence: number;
}

interface FamilyPredictionResult {
  aggregate_risk?: 'low' | 'moderate' | 'high' | 'critical';
  aggregate_score?: number;
  shared_risk_factors?: RiskFactor[];
  uncertainty?: {
    confidence_score?: number;
    confidence_level?: string;
  };
  member_predictions?: Array<{
    member_id: string;
    member_name: string;
    consent_granted: boolean;
    prediction?: PredictionBundle | null;
    early_warnings?: EarlyWarning[];
  }>;
}

interface OceanAverages {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

interface Props {
  userId: string;
}

type EstimateTone = 'good' | 'watch' | 'risk';

const TONE_STYLES: Record<EstimateTone, string> = {
  good: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  watch: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  risk: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
};

const RISK_STYLES: Record<string, string> = {
  low: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  moderate: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  high: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
  critical: 'text-red-300 bg-red-500/10 border-red-500/20',
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getBirthYear(member: FamilyMember) {
  if (!member.birthDate) return undefined;
  const parsed = new Date(member.birthDate);
  const year = parsed.getFullYear();
  return Number.isFinite(year) ? year : undefined;
}

function getAge(member: FamilyMember) {
  const year = getBirthYear(member);
  return year ? new Date().getFullYear() - year : null;
}

function getOceanScores(member: FamilyMember) {
  const stored = readStoredPersonalityProfile(member.id);
  const scores = stored?.scores || member.aiPersonality?.scores;
  return scores ? toLongTraitScores(scores) : null;
}

function averageScores(members: FamilyMember[]): OceanAverages | null {
  const scored = members
    .map(getOceanScores)
    .filter((scores): scores is OceanAverages => Boolean(scores));

  if (!scored.length) return null;

  return {
    openness: scored.reduce((sum, entry) => sum + entry.openness, 0) / scored.length,
    conscientiousness: scored.reduce((sum, entry) => sum + entry.conscientiousness, 0) / scored.length,
    extraversion: scored.reduce((sum, entry) => sum + entry.extraversion, 0) / scored.length,
    agreeableness: scored.reduce((sum, entry) => sum + entry.agreeableness, 0) / scored.length,
    neuroticism: scored.reduce((sum, entry) => sum + entry.neuroticism, 0) / scored.length,
  };
}

function describeSupportStyle(ocean: OceanAverages | null) {
  if (!ocean) return 'insufficient OCEAN data';
  if (ocean.conscientiousness >= 60) return 'structured follow-through';
  if (ocean.agreeableness >= 65) return 'gentle support and accountability';
  if (ocean.openness >= 65) return 'experimentation and reframing';
  return 'mixed support styles';
}

function describeFamilyPressure(
  careLoadScore: number,
  seniorCount: number,
  highRiskCount: number,
) {
  if (careLoadScore >= 65) {
    return `${seniorCount} older relatives and ${highRiskCount} active watchlist cases suggest meaningful household care pressure.`;
  }
  if (careLoadScore >= 40) {
    return `There is moderate care coordination demand across generations, but it looks manageable with regular check-ins.`;
  }
  return `Current household care load appears relatively contained.`;
}

function describeTrend(trend?: string) {
  if (trend === 'declining') return 'Raphael sees a deteriorating personal trend.';
  if (trend === 'improving') return 'Raphael sees improving momentum.';
  if (trend === 'stable') return 'Raphael sees a stable near-term pattern.';
  return 'Raphael does not yet have a stable trend direction.';
}

export default function FamilyPredictionIntelligencePanel({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthDataPoint[]>([]);
  const [userPrediction, setUserPrediction] = useState<PredictionBundle | null>(null);
  const [warnings, setWarnings] = useState<EarlyWarning[]>([]);
  const [familyPrediction, setFamilyPrediction] = useState<FamilyPredictionResult | null>(null);

  const livingMembers = useMemo(() => getFamilyMembers().filter((member) => !member.deathDate), []);
  const adultCount = useMemo(
    () => livingMembers.filter((member) => {
      const age = getAge(member);
      return age !== null && age >= 18;
    }).length,
    [livingMembers],
  );
  const childCount = useMemo(
    () => livingMembers.filter((member) => {
      const age = getAge(member);
      return age !== null && age < 18;
    }).length,
    [livingMembers],
  );
  const seniorCount = useMemo(
    () => livingMembers.filter((member) => {
      const age = getAge(member);
      return age !== null && age >= 65;
    }).length,
    [livingMembers],
  );

  const oceanAverage = useMemo(() => averageScores(livingMembers), [livingMembers]);
  const profiledCount = useMemo(
    () => livingMembers.filter((member) => Boolean(getOceanScores(member))).length,
    [livingMembers],
  );

  const loadForecast = useCallback(async () => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const metrics = await fetchHealthMetrics(userId, 45);
        if (cancelled) return;
        setHealthMetrics(metrics);

        const headers = await apiClient.getAuthHeaders({
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
        });
        const authHeaders = await apiClient.getAuthHeaders({
          'Bypass-Tunnel-Reminder': 'true',
        });

        const familyPayload = livingMembers.map((member) => ({
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          occupation: member.occupation,
          generation: member.generation,
          birthYear: getBirthYear(member),
          birth_year: getBirthYear(member),
          traits: member.aiPersonality?.traits || readStoredPersonalityProfile(member.id)?.traits || [],
        }));

        const consentMap = Object.fromEntries(familyPayload.map((member) => [member.id, true]));
        const metricPayload = metrics.map((metric) => ({
          metric_type: metric.metric_type,
          value: metric.value,
          date: metric.recorded_at,
          timestamp: metric.recorded_at,
          source: metric.source,
        }));

        const [userPredictionRes, warningsRes, familyPredictionRes] = await Promise.allSettled([
          requestBackendJson<PredictionBundle>(
            '/api/v1/health-predictions/predict',
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ metrics_history: metricPayload, profile: {} }),
            },
            'Unable to load Raphael prediction input',
          ),
          requestBackendJson<{ warnings?: EarlyWarning[] }>(
            '/api/v1/health-predictions/early-warnings',
            { headers: authHeaders },
            'Unable to load Raphael warning inputs',
          ),
          requestBackendJson<FamilyPredictionResult>(
            '/api/v1/health-predictions/predict-family',
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ members: familyPayload, consent_map: consentMap }),
            },
            'Unable to load Joseph family forecast',
          ),
        ]);

        if (cancelled) return;

        if (userPredictionRes.status === 'fulfilled') {
          setUserPrediction(userPredictionRes.value);
        } else {
          setUserPrediction(null);
        }

        if (warningsRes.status === 'fulfilled') {
          setWarnings(warningsRes.value.warnings || []);
        } else {
          setWarnings([]);
        }

        if (familyPredictionRes.status === 'fulfilled') {
          setFamilyPrediction(familyPredictionRes.value);
        } else {
          setFamilyPrediction(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error('FamilyPredictionIntelligencePanel failed:', loadError);
          setError('Joseph could not refresh the family forecast from Raphael data right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    await load();

    return () => {
      cancelled = true;
    };
  }, [livingMembers, userId]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    loadForecast().then((dispose) => {
      cleanup = dispose;
    });

    return () => {
      cleanup?.();
    };
  }, [loadForecast]);

  const memberWatchlist = useMemo(() => {
    return (familyPrediction?.member_predictions || [])
      .filter((entry) => entry.consent_granted && entry.prediction)
      .sort((left, right) => (right.prediction?.predicted_value || 0) - (left.prediction?.predicted_value || 0))
      .slice(0, 3);
  }, [familyPrediction]);

  const recurringRiskDrivers = useMemo(() => {
    const memberDrivers = new Map<string, { factor: string; count: number; source: string; weight: number }>();

    for (const entry of familyPrediction?.member_predictions || []) {
      for (const factor of entry.prediction?.risk_factors || []) {
        const existing = memberDrivers.get(factor.factor);
        memberDrivers.set(factor.factor, {
          factor: factor.factor,
          count: (existing?.count || 0) + 1,
          source: factor.source,
          weight: Math.max(existing?.weight || 0, factor.weight || 0),
        });
      }
    }

    for (const factor of familyPrediction?.shared_risk_factors || []) {
      const existing = memberDrivers.get(factor.factor);
      memberDrivers.set(factor.factor, {
        factor: factor.factor,
        count: Math.max(existing?.count || 0, 1),
        source: factor.source,
        weight: Math.max(existing?.weight || 0, factor.weight || 0),
      });
    }

    return [...memberDrivers.values()]
      .sort((left, right) => right.count - left.count || right.weight - left.weight)
      .slice(0, 4);
  }, [familyPrediction]);

  const metricTypesTracked = useMemo(
    () => new Set(healthMetrics.map((metric) => metric.metric_type)).size,
    [healthMetrics],
  );

  const highRiskCount = useMemo(
    () => (familyPrediction?.member_predictions || []).filter((entry) => {
      const level = entry.prediction?.risk_level;
      return level === 'high' || level === 'critical';
    }).length,
    [familyPrediction],
  );

  const moderateRiskCount = useMemo(
    () => (familyPrediction?.member_predictions || []).filter((entry) => entry.prediction?.risk_level === 'moderate').length,
    [familyPrediction],
  );

  const supportReadiness = useMemo(() => {
    const avgAgreeableness = oceanAverage?.agreeableness ?? 52;
    const avgConscientiousness = oceanAverage?.conscientiousness ?? 50;
    const avgExtraversion = oceanAverage?.extraversion ?? 48;
    return clamp(
      avgAgreeableness * 0.35 +
      avgConscientiousness * 0.25 +
      avgExtraversion * 0.15 +
      adultCount * 6 -
      seniorCount * 4 -
      childCount * 2,
    );
  }, [adultCount, childCount, oceanAverage, seniorCount]);

  const adherenceFriction = useMemo(() => {
    const neuroticism = oceanAverage?.neuroticism ?? 50;
    const conscientiousness = oceanAverage?.conscientiousness ?? 50;
    return clamp(
      neuroticism * 0.4 +
      (100 - conscientiousness) * 0.35 +
      warnings.length * 7 +
      highRiskCount * 9 +
      moderateRiskCount * 4,
    );
  }, [highRiskCount, moderateRiskCount, oceanAverage, warnings.length]);

  const careLoad = useMemo(() => {
    return clamp(
      seniorCount * 18 +
      highRiskCount * 15 +
      moderateRiskCount * 7 +
      childCount * 5,
    );
  }, [childCount, highRiskCount, moderateRiskCount, seniorCount]);

  const recoveryBuffer = useMemo(() => {
    const base = 100 - (familyPrediction?.aggregate_score ?? 45);
    return clamp(
      base * 0.45 +
      supportReadiness * 0.35 +
      ((oceanAverage?.conscientiousness ?? 50) * 0.1) +
      ((oceanAverage?.agreeableness ?? 50) * 0.1),
    );
  }, [familyPrediction?.aggregate_score, oceanAverage, supportReadiness]);

  const educatedGuesses = useMemo(() => {
    const guesses: Array<{
      title: string;
      tone: EstimateTone;
      score: number;
      summary: string;
      details: string[];
    }> = [];

    guesses.push({
      title: 'Care-plan adherence estimate',
      tone: adherenceFriction >= 65 ? 'risk' : adherenceFriction >= 40 ? 'watch' : 'good',
      score: 100 - adherenceFriction,
      summary:
        adherenceFriction >= 65
          ? 'Joseph should assume follow-through will improve with simpler routines, direct reminders, and more family accountability.'
          : adherenceFriction >= 40
            ? 'The family likely benefits from structured follow-ups instead of one-off recommendations.'
            : 'Current personality and household signals suggest recommendations are more likely to stick.',
      details: [
        describeTrend(userPrediction?.trend),
        `${Math.round(oceanAverage?.conscientiousness ?? 50)} avg conscientiousness and ${Math.round(oceanAverage?.neuroticism ?? 50)} avg neuroticism are shaping this estimate.`,
        `${warnings.length} active Raphael warnings are adding execution friction.`,
      ],
    });

    guesses.push({
      title: 'Household support readiness',
      tone: supportReadiness >= 65 ? 'good' : supportReadiness >= 45 ? 'watch' : 'risk',
      score: supportReadiness,
      summary:
        supportReadiness >= 65
          ? 'Joseph has enough adult support capacity to distribute care tasks without overloading one person.'
          : supportReadiness >= 45
            ? 'Support exists, but it likely needs clearer role assignment and cadence.'
            : 'The family looks underpowered for sustained care coordination without explicit task ownership.',
      details: [
        `${adultCount} adults, ${seniorCount} seniors, and ${childCount} younger dependents were included.`,
        `Support style is trending toward ${describeSupportStyle(oceanAverage)}.`,
        `${profiledCount} family members have usable OCEAN data.`,
      ],
    });

    guesses.push({
      title: 'Intergenerational care-load estimate',
      tone: careLoad >= 65 ? 'risk' : careLoad >= 40 ? 'watch' : 'good',
      score: 100 - careLoad,
      summary: describeFamilyPressure(careLoad, seniorCount, highRiskCount),
      details: [
        `${highRiskCount} high-risk and ${moderateRiskCount} moderate-risk family predictions are currently active.`,
        `${recurringRiskDrivers[0]?.factor || 'No repeated family driver yet'} is the strongest recurring family watchpoint.`,
        `This is a Joseph-style household planning estimate, not a diagnosis.`,
      ],
    });

    guesses.push({
      title: 'Recovery buffer guess',
      tone: recoveryBuffer >= 65 ? 'good' : recoveryBuffer >= 45 ? 'watch' : 'risk',
      score: recoveryBuffer,
      summary:
        recoveryBuffer >= 65
          ? 'The household has a credible recovery buffer if Raphael’s current signal worsens.'
          : recoveryBuffer >= 45
            ? 'The family can probably absorb a short disruption, but longer strain would expose coordination gaps.'
            : 'The current family + health picture suggests low resilience if a new health event lands this week.',
      details: [
        `${metricTypesTracked} live Raphael metric types and ${healthMetrics.length} recent metric readings informed this guess.`,
        `${Math.round(familyPrediction?.aggregate_score ?? 45)} aggregate family score is the current household baseline.`,
        `${Math.round(recoveryBuffer)} / 100 is the blended Joseph × Raphael resilience estimate.`,
      ],
    });

    return guesses;
  }, [
    adherenceFriction,
    adultCount,
    careLoad,
    childCount,
    familyPrediction?.aggregate_score,
    healthMetrics.length,
    highRiskCount,
    metricTypesTracked,
    moderateRiskCount,
    oceanAverage,
    profiledCount,
    recurringRiskDrivers,
    recoveryBuffer,
    seniorCount,
    supportReadiness,
    userPrediction?.trend,
    warnings.length,
  ]);

  const provenanceSummary = useMemo(() => {
    return [
      `${healthMetrics.length} Raphael metric readings`,
      `${metricTypesTracked} metric types`,
      `${livingMembers.length} living family members`,
      `${profiledCount} OCEAN profiles`,
      `${warnings.length} active warnings`,
    ];
  }, [healthMetrics.length, livingMembers.length, metricTypesTracked, profiledCount, warnings.length]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#13131a] p-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Joseph is correlating Raphael health data with household and OCEAN context...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/10 via-slate-900/80 to-emerald-500/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]">Raphael × Joseph forecast</span>
            </div>
            <h3 className="mt-2 text-xl font-medium text-white">Household predictions grounded in health data and family behavior</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
              This view blends Raphael&apos;s current health signal with Joseph&apos;s family structure, OCEAN personality scores,
              and household support context. Where the model goes beyond direct measurements, it is labeled as an educated estimate.
            </p>
          </div>
          <button
            onClick={loadForecast}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh forecast
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <HeartPulse className="h-3.5 w-3.5 text-cyan-300" />
              Raphael signal
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold text-white">{Math.round(userPrediction?.predicted_value ?? 0)}</div>
                <p className="text-xs text-slate-400">{describeTrend(userPrediction?.trend)}</p>
              </div>
              <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${RISK_STYLES[userPrediction?.risk_level || 'moderate']}`}>
                {userPrediction?.risk_level || 'unknown'}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <Users className="h-3.5 w-3.5 text-amber-300" />
              Household load
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">{Math.round(careLoad)}</div>
            <p className="text-xs text-slate-400">{seniorCount} seniors · {highRiskCount} high-risk watchlist cases</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Support readiness
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">{Math.round(supportReadiness)}</div>
            <p className="text-xs text-slate-400">{describeSupportStyle(oceanAverage)} · {adultCount} adult supports</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <Brain className="h-3.5 w-3.5 text-violet-300" />
              Forecast confidence
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">
              {Math.round(
                ((familyPrediction?.uncertainty?.confidence_score ?? 35) + (userPrediction?.uncertainty?.confidence_score ?? 35)) / 2,
              )}%
            </div>
            <p className="text-xs text-slate-400">{provenanceSummary.join(' · ')}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#171720] to-[#11131a] p-5">
          <div className="flex items-center gap-2 text-white">
            <Brain className="h-4 w-4 text-violet-300" />
            <h4 className="text-sm font-semibold">Educated family forecasts</h4>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            These are Joseph-style planning guesses built from Raphael&apos;s health signals, OCEAN profiles, and household structure.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {educatedGuesses.map((guess) => (
              <div key={guess.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{guess.title}</div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{guess.summary}</p>
                  </div>
                  <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${TONE_STYLES[guess.tone]}`}>
                    {Math.round(guess.score)} / 100
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {guess.details.map((detail) => (
                    <div key={detail} className="flex items-start gap-2 text-xs text-slate-400">
                      <Activity className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-500" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#171720] to-[#11131a] p-5">
            <div className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              <h4 className="text-sm font-semibold">Recurring family watchpoints</h4>
            </div>
            <div className="mt-4 space-y-3">
              {recurringRiskDrivers.length > 0 ? recurringRiskDrivers.map((driver) => (
                <div key={driver.factor} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{driver.factor}</p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                      seen {driver.count}x
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Source: {driver.source.replaceAll('_', ' ')} · weight {driver.weight.toFixed(2)}
                  </p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">
                  No recurring family driver is strong enough to elevate yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#171720] to-[#11131a] p-5">
            <div className="flex items-center gap-2 text-white">
              <Users className="h-4 w-4 text-cyan-300" />
              <h4 className="text-sm font-semibold">Household watchlist</h4>
            </div>
            <div className="mt-4 space-y-3">
              {memberWatchlist.length > 0 ? memberWatchlist.map((entry) => {
                const member = livingMembers.find((candidate) => candidate.id === entry.member_id);
                const ocean = member ? getOceanScores(member) : null;
                return (
                  <div key={entry.member_id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{entry.member_name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {entry.prediction?.risk_factors?.[0]?.factor || 'General household watch'}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${RISK_STYLES[entry.prediction?.risk_level || 'moderate']}`}>
                        {entry.prediction?.risk_level || 'watch'}
                      </span>
                    </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-400">
                      <div>Joseph guess: {ocean ? describeSupportStyle(ocean) : 'limited OCEAN profile available'} will matter for follow-through.</div>
                      <div>Raphael score: {Math.round(entry.prediction?.predicted_value || 0)} · warnings: {entry.early_warnings?.length || 0}</div>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">
                  Joseph does not have a family watchlist yet. Add more members or health data to sharpen the household model.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
