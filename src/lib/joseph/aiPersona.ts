/**
 * The single keyless source of truth that turns an analyzed personality
 * (the OCEAN scores / archetype / traits the quiz computes and stores on the
 * member) into an AI-agent persona: a system prompt for the model (server +
 * on-device) and a tone for keyless demo replies. This is what finally connects
 * "analyze personality" → "create AI agent" → "converse" so the agent you talk
 * to actually reflects the analysis.
 */
import type { FamilyMember } from './genealogy';
import { readStoredPersonalityProfile, toOceanScores } from './personalityProfiles';

export interface AiPersona {
    hasProfile: boolean;
    name: string;
    firstName: string;
    ocean: { O: number; C: number; E: number; A: number; N: number };
    archetype: string;
    familyRole: string;
    communicationStyle: string;
    traits: string[];
    systemPrompt: string;
}

const band = (n: number, hi: string, mid: string, lo: string) => (n >= 66 ? hi : n <= 33 ? lo : mid);

export function aiPersonaFromProfile(member: FamilyMember): AiPersona {
    let stored = null as ReturnType<typeof readStoredPersonalityProfile> | null;
    try { stored = readStoredPersonalityProfile(member.id); } catch { /* localStorage optional */ }

    const ap = member.aiPersonality;
    const rawScores = (ap?.scores && Object.keys(ap.scores).length ? ap.scores : stored?.scores) || {};
    const ocean = toOceanScores(rawScores);
    const hasProfile = Boolean((ap?.scores && Object.keys(ap.scores).length) || stored?.scores);

    const firstName = member.firstName || (stored?.member_name || '').split(' ')[0] || 'this person';
    const name = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || stored?.member_name || 'this family member';
    const archetype = ap?.archetype || stored?.archetype?.name || '';
    const familyRole = ap?.familyRole || stored?.family_role?.role || '';
    const communicationStyle = ap?.communicationStyle || stored?.communication_style || '';
    const traits = (ap?.traits?.length ? ap.traits : stored?.traits) || [];

    const oceanLines = [
        `Openness ${ocean.O}/100, ${band(ocean.O, 'imaginative and curious; loves ideas and new experiences', 'open but grounded', 'practical and traditional; prefers the familiar')}`,
        `Conscientiousness ${ocean.C}/100, ${band(ocean.C, 'organized, reliable, plans ahead', 'reasonably organized', 'spontaneous and flexible; improvises')}`,
        `Extraversion ${ocean.E}/100, ${band(ocean.E, 'outgoing and warm; energized by people', 'comfortable with people and solitude alike', 'reserved and reflective; values depth over chatter')}`,
        `Agreeableness ${ocean.A}/100, ${band(ocean.A, 'warm, cooperative, puts others first', 'fair and considerate', 'candid and direct; values honesty over smoothing things over')}`,
        `Emotional steadiness ${100 - ocean.N}/100, ${band(100 - ocean.N, 'calm and even under pressure', 'generally steady', 'feels deeply and is sensitive to stress')}`,
    ];

    const systemPrompt = [
        `You are an AI reflection of ${name}${familyRole ? `, the family's ${familyRole}` : ''}, within the EverAfter family app.`,
        archetype ? `Guiding archetype: "${archetype}".` : '',
        traits.length ? `Defining traits: ${traits.slice(0, 6).join(', ')}.` : '',
        'Let this measured Big Five personality shape how you speak, your warmth, directness, curiosity, and what you care about:',
        ...oceanLines.map((l) => `- ${l}`),
        communicationStyle ? `Communication style: ${communicationStyle}` : '',
        `Stay genuinely in character as ${firstName}, never generic, never a disclaimer-bot. Be personal and human. Keep replies conversational (2-4 short paragraphs).`,
    ].filter(Boolean).join('\n');

    return { hasProfile, name, firstName, ocean, archetype, familyRole, communicationStyle, traits, systemPrompt };
}

type Tone = 'curious' | 'calm' | 'spirited' | 'warm' | 'direct';
function toneOf(p: AiPersona): Tone {
    const a = p.archetype.toLowerCase();
    if (a.includes('explorer') || a.includes('sage') || p.ocean.O >= 70) return 'curious';
    if (a.includes('guardian') || a.includes('builder') || a.includes('caregiver') || p.ocean.C >= 72) return 'calm';
    if (p.ocean.E >= 70) return 'spirited';
    if (p.ocean.A >= 72) return 'warm';
    return 'direct';
}

/**
 * Keyless, persona-flavoured demo reply (used when neither the backend AI nor
 * the opt-in on-device model is available). Two distinct profiles produce
 * visibly distinct replies, so the demo shows the analysis genuinely shaping
 * the agent.
 */
export function personaDemoReply(p: AiPersona, userInput: string): string {
    const topic = userInput.trim().replace(/\s+/g, ' ').slice(0, 140) || 'that';
    const trait = p.traits[0]?.toLowerCase();
    const tail = trait ? ` It's the ${trait} in me.` : '';
    const openers: Record<Tone, string> = {
        curious: `Oh, "${topic}", now that's a question I want to turn over a few times.`,
        calm: `Let's take "${topic}" steadily; I've learned not to rush these things.`,
        spirited: `Ha, "${topic}"! You know I love talking about this.`,
        warm: `Come sit with me a moment, "${topic}", I'm so glad you asked.`,
        direct: `Alright, "${topic}". Let me give it to you straight.`,
    };
    const arche = p.archetype ? ` As ${p.archetype}, ` : ' ';
    return `${openers[toneOf(p)]}${arche}what matters to me is staying true to who we are while we work it out together.${tail}\n\nWhat's really behind the question for you? That's usually where the good part is.`;
}
