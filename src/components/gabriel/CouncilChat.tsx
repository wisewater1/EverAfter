import { useState } from 'react';
import { Send, User as UserIcon, Shield, TrendingUp, Search, Crown } from 'lucide-react';
import SaintChat from '../SaintChat';

export default function CouncilChat() {
    // We reuse SaintChat logic but styled as a 'Council Room'
    // For now, we'll wrap SaintChat but with specific props to enable 'Council Mode'
    // If SaintChat doesn't support Council Mode yet, we rely on the text content to simulate it.

    // Ideally, we'd have a UI that shows the agents "typing" or "debating".
    // For MVP, we stick to the standard chat but with a custom system prompt on the backend.

    return (
        <div className="h-full flex flex-col bg-slate-900">
            <div className="flex-1 overflow-hidden">
                <SaintChat
                    saintId="gabriel"
                    saintName="St. Gabriel"
                    saintTitle="The Financial Steward"
                    saintIcon={Crown} // Gabriel presides
                    primaryColor="emerald"
                    initialMessage="The Financial Council is in session. The Auditor, Strategist, And Guardian are present. How may we advise your treasury today?"
                />
            </div>

            {/* Council Status Indicators (Visual Fluff) */}
            <div className="h-12 border-t border-slate-800 bg-slate-950 flex items-center justify-around px-4">
                <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-help" title="The Auditor (Active)">
                    <Search className="w-3 h-3 text-rose-400" />
                    <span className="text-[10px] text-slate-500 font-medium">AUDITOR</span>
                </div>
                <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-help" title="The Guardian (Active)">
                    <Shield className="w-3 h-3 text-sky-400" />
                    <span className="text-[10px] text-slate-500 font-medium">GUARDIAN</span>
                </div>
                <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-help" title="The Strategist (Active)">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-slate-500 font-medium">STRATEGIST</span>
                </div>
            </div>
        </div>
    );
}
