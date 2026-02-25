import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

export default function SafetyDisclaimer({ compact = false }: { compact?: boolean }) {
    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-300/70">
                    Wellness insight — not medical advice
                </span>
            </div>
        );
    }

    return (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 backdrop-blur-xl">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                    <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                    <p className="text-sm text-amber-200 font-medium mb-1">Wellness Insight</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        This is based on your personal data patterns. It is not a medical diagnosis,
                        treatment recommendation, or substitute for professional medical advice.
                    </p>
                </div>
            </div>
        </div>
    );
}
