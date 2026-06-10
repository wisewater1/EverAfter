import React from 'react';
import { Shield } from 'lucide-react';

interface ConfidenceBadgeProps {
    score: number;
    level: 'high' | 'moderate' | 'low';
    label?: string;
    showScore?: boolean;
}

export default function ConfidenceBadge({ score, level, label, showScore = true }: ConfidenceBadgeProps) {
    const colors = {
        high: { bg: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
        moderate: { bg: 'from-amber-500/20 to-yellow-500/20', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400' },
        low: { bg: 'from-red-500/20 to-rose-500/20', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
    };

    const c = colors[level];

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${c.bg} border ${c.border} backdrop-blur-xl`}>
            <div className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} />
            <span className={`text-xs font-semibold ${c.text} uppercase tracking-wider`}>
                {label || level}
            </span>
            {showScore && (
                <span className={`text-xs ${c.text} opacity-80`}>{Math.round(score)}%</span>
            )}
        </div>
    );
}
