/**
 * SeasonalHealthCalendar
 * 12-month Trinity calendar with month selection and detailed event context.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Calendar, Clock, Link as LinkIcon, Loader2, MapPin, Users } from 'lucide-react';
import { trinitySynapse } from './trinityApi';

function getRiskLevel(month: any) {
    if ((month?.combined_risk || 0) >= 2) return 'high';
    if ((month?.combined_risk || 0) === 1) return 'moderate';
    return 'low';
}

function getRiskClasses(riskLevel: string) {
    if (riskLevel === 'high') {
        return {
            border: 'border-rose-500/30',
            background: 'bg-rose-500/5',
            accent: 'bg-rose-400',
            badge: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
        };
    }

    if (riskLevel === 'moderate') {
        return {
            border: 'border-amber-500/30',
            background: 'bg-amber-500/5',
            accent: 'bg-amber-400',
            badge: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
        };
    }

    return {
        border: 'border-white/5',
        background: 'bg-white/[0.02]',
        accent: 'bg-emerald-400',
        badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    };
}

function formatEventTime(event: any) {
    if (event?.allDay) return 'All day';
    const start = event?.startTime ? new Date(event.startTime) : null;
    const end = event?.endTime ? new Date(event.endTime) : null;
    if (!start || Number.isNaN(start.getTime())) return 'Time pending';

    const startLabel = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!end || Number.isNaN(end.getTime())) return startLabel;

    return `${startLabel} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function SeasonalHealthCalendar() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

    useEffect(() => {
        let mounted = true;

        (async () => {
            const result = await trinitySynapse('seasonal_calendar', {});
            if (!mounted) return;
            setData(result);
            setLoading(false);
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const calendar = data?.calendar || [];
    const highRisk = data?.high_risk_months || [];

    useEffect(() => {
        if (!calendar.length) return;
        if (selectedMonthIndex !== null && calendar[selectedMonthIndex]) return;

        const currentMonth = new Date().getMonth();
        const currentIndex = calendar.findIndex((month: any) => month.month === currentMonth);
        setSelectedMonthIndex(currentIndex >= 0 ? currentIndex : 0);
    }, [calendar, selectedMonthIndex]);

    const selectedMonth = useMemo(() => {
        if (!calendar.length) return null;
        if (selectedMonthIndex === null) return calendar[0];
        return calendar[selectedMonthIndex] || calendar[0];
    }, [calendar, selectedMonthIndex]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-xs text-slate-500 p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Building seasonal calendar...
            </div>
        );
    }

    if (!data) return null;

    const selectedRiskLevel = getRiskLevel(selectedMonth);
    const selectedRiskClasses = getRiskClasses(selectedRiskLevel);
    const selectedEvents = Array.isArray(selectedMonth?.events) ? selectedMonth.events : [];

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-white">Seasonal Health Calendar</span>
                </div>
                {highRisk.length > 0 && (
                    <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10 whitespace-nowrap">
                        <AlertTriangle className="w-2.5 h-2.5 inline mr-1" />
                        {highRisk.length} high-risk months
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {calendar.map((month: any, index: number) => {
                    const riskLevel = getRiskLevel(month);
                    const classes = getRiskClasses(riskLevel);
                    const selected = selectedMonth?.month === month.month;

                    return (
                        <button
                            key={`${month.month_name}-${month.month}`}
                            type="button"
                            onClick={() => setSelectedMonthIndex(index)}
                            className={`p-3 rounded-xl border text-left transition-all ${classes.border} ${classes.background} ${selected ? 'ring-1 ring-white/20' : 'hover:border-white/15'}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-white">{month.month_name}</span>
                                <span className={`w-2 h-2 rounded-full ${classes.accent}`} />
                            </div>
                            <div className="space-y-1 text-[10px] text-slate-300">
                                <p>{month.joseph?.event_count || 0} family event{month.joseph?.event_count === 1 ? '' : 's'}</p>
                                <p>Risk {Math.round(month.raphael?.avg_risk_score || 0)}</p>
                                <p className="capitalize">Spend {month.gabriel?.pressure || 'low'}</p>
                                {month.risk_flags?.length === 0 && <p className="text-slate-600">No flags</p>}
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedMonth && (
                <div className={`mt-4 rounded-2xl border ${selectedRiskClasses.border} ${selectedRiskClasses.background} p-4 space-y-4`}>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <h4 className="text-base font-semibold text-white">{selectedMonth.month_name} detail</h4>
                                <span className={`px-2 py-1 rounded-full border text-[10px] uppercase tracking-[0.2em] ${selectedRiskClasses.badge}`}>
                                    {selectedRiskLevel}
                                </span>
                            </div>
                            <p className="text-sm text-slate-300 max-w-3xl">
                                {selectedMonth.details?.summary || 'Trinity has not attached a detail summary for this month yet.'}
                            </p>
                            <p className="text-xs text-slate-400 max-w-3xl">
                                {selectedMonth.details?.recommendation || 'Use the month to coordinate family logistics, health recovery, and treasury planning.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-[280px]">
                            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Joseph</div>
                                <div className="mt-1 text-sm font-medium text-white">{selectedMonth.joseph?.event_count || 0} tracked</div>
                                <div className="text-[10px] text-slate-400">Family load for the month</div>
                            </div>
                            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Raphael</div>
                                <div className="mt-1 text-sm font-medium text-white">{Math.round(selectedMonth.raphael?.avg_risk_score || 0)}</div>
                                <div className="text-[10px] text-slate-400">Average risk signal</div>
                            </div>
                            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Gabriel</div>
                                <div className="mt-1 text-sm font-medium text-white capitalize">{selectedMonth.gabriel?.pressure || 'low'}</div>
                                <div className="text-[10px] text-slate-400">Spending pressure</div>
                            </div>
                        </div>
                    </div>

                    {selectedMonth.risk_flags?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selectedMonth.risk_flags.map((flag: string) => (
                                <span key={flag} className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                                    {flag.replaceAll('_', ' ')}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-3">
                            <Bell className="w-3.5 h-3.5 text-amber-400" />
                            Monthly reminders
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(selectedMonth.details?.alarms || ['No reminders attached']).map((alarm: string) => (
                                <span key={alarm} className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-slate-300">
                                    {alarm}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Event details</div>
                        {selectedEvents.length > 0 ? (
                            selectedEvents.map((event: any) => (
                                <div key={event.id} className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-3">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-white">{event.title}</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                                                <span className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                                                    {event.calendarTitle || 'Calendar'}
                                                </span>
                                                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 uppercase">
                                                    {event.availability || 'busy'}
                                                </span>
                                                {event.recurrenceRule && (
                                                    <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/5">
                                                        {event.recurrenceRule}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {event.riskSummary && (
                                            <div className="max-w-md text-xs text-amber-300 bg-amber-500/10 border border-amber-500/15 rounded-xl px-3 py-2">
                                                {event.riskSummary}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                                            <span>{formatEventTime(event)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5 text-slate-500" />
                                            <span>{event.attendees?.join(', ') || 'Household'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                            <span>{event.location || 'Location pending'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Bell className="w-3.5 h-3.5 text-slate-500" />
                                            <span>{event.alarms?.map((alarm: any) => alarm.label || alarm.date).filter(Boolean).join(', ') || 'No reminders'}</span>
                                        </div>
                                    </div>

                                    {(event.notes || event.description) && (
                                        <p className="text-sm text-slate-300 leading-relaxed">
                                            {event.notes || event.description}
                                        </p>
                                    )}

                                    {event.url && (
                                        <a
                                            href={event.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-xs text-indigo-300 hover:text-indigo-200"
                                        >
                                            <LinkIcon className="w-3.5 h-3.5" />
                                            Open linked record
                                        </a>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                                No specific family events are recorded for {selectedMonth.month_name}. Trinity is treating this as a planning and preventive-care window.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
