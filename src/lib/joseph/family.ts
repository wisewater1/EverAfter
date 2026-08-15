import { getFamilyEvents as getGenealogyEvents, getMemberById } from './genealogy';

export interface FamilyTask {
    id: string;
    action: string;
    description: string;
    assignedTo?: string;
    status: 'pending' | 'completed';
    category: 'chore' | 'maintenance' | 'errand';
    dueDate?: string;
}

export interface FamilyEvent {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendees: string[];
    notes?: string;
    description?: string;
    url?: string;
    allDay?: boolean;
    availability?: 'busy' | 'free' | 'tentative';
    calendarTitle?: string;
    recurrenceRule?: string;
    alarms?: Array<{
        date?: string;
        relativeOffsetMinutes?: number;
        label?: string;
    }>;
    source?: string;
    memberName?: string;
    type?: string;
    riskSummary?: string;
}

export interface ShoppingItem {
    id: string;
    name: string;
    quantity: string;
    addedBy: string;
    status: 'needed' | 'bought';
}

export interface HouseholdSummary {
    activeTasks: number;
    upcomingEvents: number;
    shoppingListCount: number;
    // generationLabel (e.g. "Your Generation", "Parents") is real data drawn
    // from the family tree. There is no real presence/activity signal
    // anywhere in the app (no location, calendar-busy, or device data feeds
    // this), so this must never claim a live status like "home"/"away"/"busy".
    familyStatus: { name: string; generationLabel: string }[];
}

export async function getFamilyCalendar(_userId: string): Promise<FamilyEvent[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const genealogyEvents = getGenealogyEvents();

    const detailedEvents = genealogyEvents
        .map((event, index) => {
            const baseDate = new Date(`${event.date}T09:00:00`);
            if (Number.isNaN(baseDate.getTime())) return null;

            const member = getMemberById(event.memberId);
            const eventMonth = baseDate.getMonth();
            const eventDay = baseDate.getDate();
            const recurring = event.type === 'birth' || event.type === 'marriage' || event.type === 'death';
            const scheduledYear = recurring
                ? (() => {
                    const candidate = new Date(currentYear, eventMonth, eventDay, 9, 0, 0, 0);
                    return candidate < now ? currentYear + 1 : currentYear;
                })()
                : Math.max(currentYear, baseDate.getFullYear());
            const start = new Date(scheduledYear, eventMonth, eventDay, recurring ? 9 : 18, 0, 0, 0);
            const end = new Date(start);
            end.setHours(start.getHours() + (recurring ? 1 : 2));

            const memberName = event.memberName || (member ? `${member.firstName} ${member.lastName}`.trim() : 'Family Member');
            const location = member?.birthPlace
                || (event.description?.toLowerCase().startsWith('born in ') ? event.description.replace(/^Born in /i, '') : undefined)
                || 'Family Record';

            const title = event.type === 'birth'
                ? `${memberName.split(' ')[0] || memberName}'s birthday`
                : event.type === 'marriage'
                    ? `${event.memberName} anniversary`
                    : event.type === 'death'
                        ? `${memberName} remembrance day`
                        : event.title;

            return {
                id: `family-cal-${event.id}`,
                title,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                location,
                attendees: [memberName, 'Household'],
                notes: event.description || `${memberName} is scheduled in the family calendar for stewardship review.`,
                description: event.description,
                url: event.mediaUrl,
                allDay: recurring,
                availability: event.type === 'milestone' ? 'busy' : 'tentative',
                calendarTitle: event.type === 'birth'
                    ? 'Birthdays'
                    : event.type === 'marriage'
                        ? 'Anniversaries'
                        : event.type === 'death'
                            ? 'Remembrance'
                            : 'Family Timeline',
                recurrenceRule: recurring ? 'FREQ=YEARLY' : undefined,
                alarms: recurring
                    ? [
                        { relativeOffsetMinutes: -10080, label: '1 week before' },
                        { relativeOffsetMinutes: -1440, label: '1 day before' },
                    ]
                    : [{ relativeOffsetMinutes: -120, label: '2 hours before' }],
                source: 'St. Joseph chronology',
                memberName,
                type: event.type,
                riskSummary: index % 3 === 0 ? 'Review kin coverage and scheduling conflicts before the date.' : undefined,
            } satisfies FamilyEvent;
        })
        .filter((event): event is FamilyEvent => Boolean(event))
        .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())
        .slice(0, 10);

    if (detailedEvents.length > 0) {
        return detailedEvents;
    }

    return [
        {
            id: 'e1',
            title: 'Family Dinner',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            attendees: ['All'],
            location: 'Home',
            notes: 'Weekly alignment dinner with household updates and budget review.',
            calendarTitle: 'Family Sync',
            availability: 'busy',
            alarms: [{ relativeOffsetMinutes: -60, label: '1 hour before' }],
        },
        {
            id: 'e2',
            title: 'Soccer Practice',
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            attendees: ['Charlie'],
            location: 'Community Field',
            notes: 'Bring water bottle and shin guards.',
            calendarTitle: 'Activities',
            availability: 'busy',
            alarms: [{ relativeOffsetMinutes: -90, label: '90 minutes before' }],
        }
    ];
}
