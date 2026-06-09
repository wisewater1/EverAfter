
interface TraitBadgesProps {
    traits?: string[];
    limit?: number;
    className?: string;
}

export default function TraitBadges({ traits, limit = 2, className = "" }: TraitBadgesProps) {
    if (!traits || traits.length === 0) return null;

    const displayedTraits = traits.slice(0, limit);

    return (
        <div className={`flex flex-wrap gap-1 mt-1 ${className}`}>
            {displayedTraits.map((trait, i) => (
                <span
                    key={i}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-tighter"
                >
                    {trait}
                </span>
            ))}
            {traits.length > limit && (
                <span className="text-[8px] text-slate-600 font-bold">+{traits.length - limit}</span>
            )}
        </div>
    );
}
