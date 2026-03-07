/**
 * RiskCards — expandable grid of health domain risk cards.
 * Shows cardiovascular, metabolic, mental, respiratory risk trends.
 */
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getRiskCards, RiskCard } from '../../lib/dhtApi';

const LEVEL_COLORS: Record<string, string> = {
    low: '#10b981',
    moderate: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
};

const DOMAIN_LABELS: Record<string, string> = {
    cardiovascular: '❤️ Cardiovascular',
    metabolic: '🔬 Metabolic',
    mental: '🧠 Mental',
    respiratory: '🫁 Respiratory',
};

interface RiskCardsProps {
    personId: string;
}

export default function RiskCards({ personId }: RiskCardsProps) {
    const [cards, setCards] = useState<RiskCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const resp = await getRiskCards(personId);
            setCards(resp?.risk_cards || []);
            setLoading(false);
        })();
    }, [personId]);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" />Loading risk cards…</div>;
    if (!cards.length) return <div className="text-xs text-slate-500 text-center py-4">No risk data available yet.</div>;

    return (
        <div className="space-y-2">
            {cards.map((card, i) => {
                const color = LEVEL_COLORS[card.current_level] || '#6b7280';
                const ArrowIcon = card.direction === '↑' ? TrendingUp : card.direction === '↓' ? TrendingDown : Minus;
                const isExpanded = expanded === card.domain;

                return (
                    <div key={i} className="rounded-xl border overflow-hidden transition-all cursor-pointer"
                        style={{ borderColor: color + '25' }}
                        onClick={() => setExpanded(isExpanded ? null : card.domain)}>
                        {/* Card header */}
                        <div className="flex items-center gap-3 p-3" style={{ backgroundColor: color + '08' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: color + '15' }}>
                                <ArrowIcon className="w-4 h-4" style={{ color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white">{DOMAIN_LABELS[card.domain] || card.domain}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase" style={{ color }}>
                                        {card.current_level}
                                    </span>
                                    {card.delta_30d !== 0 && (
                                        <span className="text-[10px] text-slate-500">
                                            {card.delta_30d > 0 ? '+' : ''}{card.delta_30d?.toFixed(1)}% (30d)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">{Math.round(card.confidence * 100)}% conf.</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                            </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                            <div className="px-4 py-3 border-t border-white/5 space-y-2">
                                {card.what_moved_it?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-1">What moved it</p>
                                        {card.what_moved_it.map((m: string, j: number) => (
                                            <p key={j} className="text-[10px] text-slate-300">• {m}</p>
                                        ))}
                                    </div>
                                )}
                                {card.suggested_action && (
                                    <div className="px-3 py-2 rounded-lg border" style={{ borderColor: color + '30', backgroundColor: color + '08' }}>
                                        <p className="text-[10px] text-slate-200">💡 {card.suggested_action}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
