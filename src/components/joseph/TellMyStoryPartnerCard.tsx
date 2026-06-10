import { ExternalLink, Sparkles, Users } from 'lucide-react';
import type { FamilyMember } from '../../lib/joseph/genealogy';
import { buildTellMyStoryReferralCode, buildTellMyStoryUrl } from '../../lib/tellMyStory';

interface TellMyStoryPartnerCardProps {
    member?: FamilyMember | null;
    title?: string;
    description?: string;
    compact?: boolean;
}

function sanitizePartnerCopy(value: string) {
    return value
        .replaceAll('â€™', "'")
        .replaceAll('â€”', '-')
        .replaceAll('Â·', '-');
}

export default function TellMyStoryPartnerCard({
    member,
    title = 'Create Your AI with TellMyStory.ai',
    description = 'EverAfter has partnered with TellMyStory.ai so each family member can capture stories, memories, and voice-guided context for future AI experiences.',
    compact = false,
}: TellMyStoryPartnerCardProps) {
    const referralCode = buildTellMyStoryReferralCode(member);
    const partnerUrl = buildTellMyStoryUrl(member);
    const memberName = member ? `${member.firstName} ${member.lastName}` : 'your family';
    const cleanTitle = sanitizePartnerCopy(title);
    const cleanDescription = sanitizePartnerCopy(description);

    return (
        <div className={`rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent ${compact ? 'p-4' : 'p-5 md:p-6'}`}>
            <div className={`flex ${compact ? 'flex-col gap-3' : 'flex-col lg:flex-row lg:items-center lg:justify-between gap-4'}`}>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-300">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-[0.2em]">EverAfter x TellMyStory.ai</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white">{cleanTitle}</h3>
                        <p className="mt-1 text-sm text-slate-300 leading-relaxed">{cleanDescription}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                            <Users className="w-3.5 h-3.5 text-amber-300" />
                            Target: {memberName}
                        </span>
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-semibold text-amber-200">
                            Referral: {referralCode}
                        </span>
                    </div>
                </div>

                <a
                    href={partnerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
                >
                    Open TellMyStory.ai
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </div>
    );
}
