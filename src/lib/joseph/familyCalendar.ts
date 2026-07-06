import type { FamilyMember } from './genealogy';

/**
 * Keyless family-calendar helpers for St Joseph.
 *
 * Two directions, both with NO API keys:
 *  1. EXPORT: turn the family tree's birthdays/anniversaries into "Add to
 *     calendar" links that work with ANY provider (Google, Apple, Outlook) via
 *     the standard render URL + a downloadable .ics. Always works, fully private.
 *  2. IMPORT: connect a member's calendar by its iCal/ICS feed URL (Google
 *     "secret address in iCal format", Apple/Outlook published calendar) and
 *     show their upcoming events. Best-effort (some providers block cross-origin
 *     reads); birthdays + add-to-calendar never depend on this.
 */

export interface CalEvent {
    title: string;
    start: Date;
    end?: Date;
    allDay?: boolean;
    description?: string;
    location?: string;
}

const fullName = (m: FamilyMember) => `${m.firstName} ${m.lastName}`.trim();

function nextAnnual(month: number, day: number): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let d = new Date(now.getFullYear(), month, day);
    if (d < today) d = new Date(now.getFullYear() + 1, month, day);
    return d;
}

export function daysUntil(d: Date): number {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 86400000);
}

/** Next birthday (or remembrance, if the member has passed) as a recurring all-day event. */
export function birthdayEvent(m: FamilyMember): CalEvent | null {
    if (!m.birthDate) return null;
    const bd = new Date(m.birthDate);
    if (isNaN(bd.getTime())) return null;
    const next = nextAnnual(bd.getUTCMonth(), bd.getUTCDate());
    const name = fullName(m);
    if (m.deathDate) {
        return { title: `🕊️ Remembering ${name}`, start: next, allDay: true, description: `A day to remember ${name}. From your EverAfter family tree.` };
    }
    const turning = next.getFullYear() - bd.getUTCFullYear();
    return { title: `🎂 ${name}'s Birthday (turns ${turning})`, start: next, allDay: true, description: `From your EverAfter family tree.` };
}

/** All family birthdays/remembrances, soonest first. */
export function familyDateEvents(members: FamilyMember[]): Array<{ member: FamilyMember; event: CalEvent }> {
    return members
        .map((m) => ({ member: m, event: birthdayEvent(m) }))
        .filter((x): x is { member: FamilyMember; event: CalEvent } => x.event !== null)
        .sort((a, b) => daysUntil(a.event.start) - daysUntil(b.event.start));
}

// ── "Add to any calendar" links (keyless, universal) ──────────────────────

function stamp(d: Date, allDay: boolean): string {
    if (allDay) {
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    }
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function googleCalendarUrl(e: CalEvent): string {
    const start = stamp(e.start, !!e.allDay);
    const endD = e.end || new Date(e.start.getTime() + (e.allDay ? 86400000 : 3600000));
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: e.title,
        dates: `${start}/${stamp(endD, !!e.allDay)}`,
        details: e.description || '',
        location: e.location || '',
    });
    const recur = e.allDay ? '&recur=RRULE:FREQ=YEARLY' : '';
    return `https://calendar.google.com/calendar/render?${params.toString()}${recur}`;
}

export function buildICS(events: CalEvent[]): string {
    const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EverAfter//Family Tree//EN', 'CALSCALE:GREGORIAN'];
    events.forEach((e, i) => {
        const allDay = !!e.allDay;
        const start = stamp(e.start, allDay);
        const endD = e.end || new Date(e.start.getTime() + (allDay ? 86400000 : 3600000));
        out.push('BEGIN:VEVENT', `UID:everafter-${i}-${start}@everafterai.net`, `DTSTAMP:${stamp(new Date(), false)}`);
        if (allDay) { out.push(`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${stamp(endD, true)}`, 'RRULE:FREQ=YEARLY'); }
        else { out.push(`DTSTART:${start}`, `DTEND:${stamp(endD, false)}`); }
        out.push(`SUMMARY:${(e.title || '').replace(/\n/g, ' ')}`);
        if (e.description) out.push(`DESCRIPTION:${e.description.replace(/\n/g, ' ')}`);
        if (e.location) out.push(`LOCATION:${e.location}`);
        out.push('END:VEVENT');
    });
    out.push('END:VCALENDAR');
    return out.join('\r\n');
}

/** Download one or more events as a .ics that imports into Apple/Outlook/Google. */
export function downloadICS(events: CalEvent[], filename = 'everafter-family.ics'): void {
    const blob = new Blob([buildICS(events)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Connected calendar (iCal feed): best-effort, privacy-preserving ──────

function parseICSDate(v: string): Date | null {
    const m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
    return isNaN(d.getTime()) ? null : d;
}

export function parseICS(text: string): CalEvent[] {
    const events: CalEvent[] = [];
    for (const block of text.split('BEGIN:VEVENT').slice(1)) {
        const field = (k: string) => {
            const m = block.match(new RegExp('\\n' + k + '[^:\\n]*:([^\\n\\r]+)'));
            return m ? m[1].trim() : '';
        };
        const summary = field('SUMMARY');
        const dt = field('DTSTART');
        if (!summary || !dt) continue;
        const start = parseICSDate(dt);
        if (!start) continue;
        events.push({ title: summary, start, location: field('LOCATION'), allDay: !/T\d{6}/.test(dt) });
    }
    return events;
}

/**
 * Fetch + parse a member's connected calendar. Direct request only (we never
 * route a private calendar URL through a third party). If the provider blocks
 * cross-origin reads, returns reachable:false: the UI then leans on birthdays
 * + add-to-calendar, which never need this.
 */
export async function fetchCalendarEvents(url: string, limit = 6): Promise<{ events: CalEvent[]; reachable: boolean }> {
    try {
        const res = await fetch(url, { headers: { Accept: 'text/calendar' } });
        if (!res.ok) return { events: [], reachable: false };
        const text = await res.text();
        const since = Date.now() - 86400000;
        const events = parseICS(text)
            .filter((e) => e.start.getTime() >= since)
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .slice(0, limit);
        return { events, reachable: true };
    } catch {
        return { events: [], reachable: false };
    }
}
