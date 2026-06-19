import { useState, useEffect } from 'react';
import { Calendar, X, CalendarPlus, Download, Link2, CheckCircle, Clock } from 'lucide-react';
import { FamilyMember, updateFamilyMember } from '../../lib/joseph/genealogy';
import {
    birthdayEvent, daysUntil, googleCalendarUrl, downloadICS,
    fetchCalendarEvents, type CalEvent,
} from '../../lib/joseph/familyCalendar';

interface Props {
    member: FamilyMember;
    onClose: () => void;
    onSaved?: () => void;
}

export default function MemberCalendarPanel({ member, onClose, onSaved }: Props) {
    const name = `${member.firstName} ${member.lastName}`.trim();
    const bday = birthdayEvent(member);
    const [url, setUrl] = useState(member.calendarUrl || '');
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'connected' | 'unreachable'>('idle');

    const loadEvents = async (feed: string) => {
        if (!feed) return;
        setStatus('loading');
        const { events: ev, reachable } = await fetchCalendarEvents(feed);
        setEvents(ev);
        setStatus(reachable ? 'connected' : 'unreachable');
    };

    useEffect(() => { if (member.calendarUrl) loadEvents(member.calendarUrl); /* eslint-disable-next-line */ }, [member.id]);

    const saveCalendar = async () => {
        updateFamilyMember(member.id, { calendarUrl: url.trim() || undefined });
        onSaved?.();
        if (url.trim()) loadEvents(url.trim()); else { setEvents([]); setStatus('idle'); }
    };

    const dUntil = bday ? daysUntil(bday.start) : null;

    return (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
            <div className="relative my-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-slate-800/90 p-2 text-slate-300 shadow-lg transition-colors hover:bg-slate-700 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
                <div className="rounded-3xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-teal-500/20 border border-amber-500/20">
                            <Calendar className="h-5 w-5 text-amber-300" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-white truncate">{name}'s Calendar</h3>
                            <p className="text-xs text-slate-400">Add their dates to any calendar — or connect theirs.</p>
                        </div>
                    </div>

                    {/* Birthday / remembrance — keyless, works with every calendar */}
                    {bday && (
                        <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <p className="text-sm font-semibold text-white">{bday.title}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-300/90">
                                <Clock className="w-3.5 h-3.5" />
                                {bday.start.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                                {dUntil !== null && ` · ${dUntil === 0 ? 'today!' : dUntil === 1 ? 'tomorrow' : `in ${dUntil} days`}`}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <a href={googleCalendarUrl(bday)} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/15 px-3 py-1.5 text-xs font-medium text-teal-300 transition-colors hover:bg-teal-500/25 border border-teal-500/20">
                                    <CalendarPlus className="w-3.5 h-3.5" /> Add to Google
                                </a>
                                <button onClick={() => downloadICS([bday], `${name.replace(/\s+/g, '-').toLowerCase()}-birthday.ics`)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 border border-white/10">
                                    <Download className="w-3.5 h-3.5" /> Apple / Outlook (.ics)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Connect their calendar (any iCal/ICS feed) */}
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <Link2 className="w-3.5 h-3.5" /> Connect {member.firstName}'s calendar
                        </label>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Paste an iCal/ICS link — Google "secret address in iCal format", Apple or Outlook published calendar. Stays on your device.
                        </p>
                        <div className="mt-2 flex gap-2">
                            <input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-teal-500/40 focus:outline-none"
                            />
                            <button onClick={saveCalendar} className="flex-shrink-0 rounded-lg bg-teal-500/20 px-3 py-2 text-xs font-semibold text-teal-200 transition-colors hover:bg-teal-500/30 border border-teal-500/20">
                                {member.calendarUrl ? 'Update' : 'Connect'}
                            </button>
                        </div>

                        {status === 'loading' && <p className="mt-3 text-xs text-slate-500">Loading events…</p>}
                        {status === 'unreachable' && (
                            <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-300/80">
                                <CheckCircle className="w-3.5 h-3.5" /> Calendar saved — live events appear when the provider allows it.
                            </p>
                        )}
                        {status === 'connected' && events.length === 0 && (
                            <p className="mt-3 text-xs text-slate-500">Connected — no upcoming events found.</p>
                        )}
                        {events.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                                {events.map((e, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                                        <span className="truncate text-xs text-slate-200">{e.title}</span>
                                        <span className="flex-shrink-0 text-[11px] text-slate-500">
                                            {e.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
