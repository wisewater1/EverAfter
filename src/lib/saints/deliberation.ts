import { getFamilyMembers } from '../joseph/genealogy';
import { getCachedTrinitySignals, wellnessFromLiveHealth } from '../trinity/liveSignals';

export interface DeliberationResult {
    transcript: { speaker: string; role: string; content: string; timestamp: string }[];
    consensus: string;
    action_items: string[];
}

/**
 * A grounded council deliberation built from the family's real records, so the
 * feature works instantly even when the backend council service is offline.
 * Pass the user's question to weave it into the consensus; omit it for the
 * standing weekly council used by the society feed.
 */
export function buildLocalDeliberation(query?: string): DeliberationResult {
    const members = getFamilyMembers();
    const living = members.filter((m) => !m.deathDate);
    const elders = living.filter((m) => {
        if (!m.birthDate) return false;
        const age = (Date.now() - new Date(m.birthDate).getTime()) / (365.25 * 86400000);
        return age >= 65;
    });
    const signals = getCachedTrinitySignals();
    const wellness = signals ? wellnessFromLiveHealth(signals.health) : null;
    const overspent = signals?.finance.overspentEnvelopes ?? 0;
    const responses30d = signals?.engagement.responses30d ?? 0;
    const now = () => new Date().toISOString();

    const josephLine = living.length > 0
        ? `Our family stands at ${living.length} living ${living.length === 1 ? 'member' : 'members'}${elders.length ? `, ${elders.length} of whom we should keep close watch over` : ''}. Let us make sure everyone is accounted for and cared for this week.`
        : 'Our family tree is still taking shape. The first task is to record the people we love so the rest of us can support them.';

    const raphaelLine = wellness !== null
        ? `Health signals are ${wellness >= 70 ? 'strong' : wellness >= 45 ? 'steady' : 'in need of gentle attention'} this week. I suggest we protect rest and recovery before adding new commitments.`
        : 'I do not yet see recent health readings. Connecting a device or logging a check-in would let me watch over everyone properly.';

    const gabrielLine = overspent > 0
        ? `${overspent} budget ${overspent === 1 ? 'envelope is' : 'envelopes are'} overspent. I recommend we steady those before any new spending, so the family stays on firm ground.`
        : 'Our finances are in good order, with no envelopes overspent. This is a season to steward carefully rather than expand.';

    const anthonyLine = responses30d > 0
        ? `Guidance is active, with ${responses30d} reflections recorded this month. The record is being kept faithfully.`
        : 'We have few recent reflections on record. A short daily answer would deepen the guidance each Saint can offer.';

    const michaelLine = 'Access and safeguards are in place. Whatever the family decides, I will make sure the right people, and only the right people, can act on it.';

    const baseConsensus = wellness !== null && wellness < 45
        ? 'The Council agrees to prioritize health and rest this week, then tend to the family before taking on anything new.'
        : overspent > 0
            ? 'The Council agrees to steady the overspent budgets first, keeping the family secure before new commitments.'
            : 'The Council agrees the family is on stable ground. This is a week to care for one another and keep the record faithfully.';

    const trimmedQuery = query?.trim();
    const consensus = trimmedQuery
        ? `On the question of "${trimmedQuery}": weigh it against what matters most right now. ${baseConsensus}`
        : baseConsensus;

    const actions: string[] = [];
    if (wellness !== null && wellness < 60) actions.push('Protect a rest day and log a health check-in with St. Raphael');
    if (overspent > 0) actions.push('Review and rebalance the overspent budget envelopes with St. Gabriel');
    if (elders.length > 0) actions.push('Check in on the family members most in need of care');
    if (responses30d === 0) actions.push('Answer one daily question to strengthen guidance');
    if (actions.length === 0) actions.push('Share one moment of gratitude with the family this week');

    const transcript: DeliberationResult['transcript'] = [
        { speaker: 'St. Joseph', role: 'family', content: josephLine, timestamp: now() },
        { speaker: 'St. Raphael', role: 'health', content: raphaelLine, timestamp: now() },
        { speaker: 'St. Gabriel', role: 'finance', content: gabrielLine, timestamp: now() },
        { speaker: 'St. Anthony', role: 'guidance', content: anthonyLine, timestamp: now() },
    ];
    if (trimmedQuery) {
        transcript.push({ speaker: 'St. Michael', role: 'security', content: michaelLine, timestamp: now() });
    }

    return { transcript, consensus, action_items: actions };
}
