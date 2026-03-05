/**
 * DelphiView — St. Raphael's Delphi Health Trajectory page.
 * Route: /raphael-dashboard (added as a tab)
 * Full-screen view: trajectory, risk cards, leading indicators, next-best, OCEAN layer.
 */
import { useState } from 'react';
import { Activity, Shield, TrendingUp, Crosshair, Brain } from 'lucide-react';
import DHTPanel from './DHTPanel';
import RiskCards from './RiskCards';
import LeadingIndicators from './LeadingIndicators';
import NextBestMeasurement from './NextBestMeasurement';
import OceanBehavioralLayer from './OceanBehavioralLayer';

const DELPHI_TABS = [
    { id: 'trajectory', label: 'Trajectory', icon: Activity },
    { id: 'risk', label: 'Risk Cards', icon: Shield },
    { id: 'indicators', label: 'Leading Signals', icon: TrendingUp },
    { id: 'next-best', label: 'Next Measurement', icon: Crosshair },
    { id: 'ocean', label: 'Behavioral Layer', icon: Brain },
];

interface DelphiViewProps {
    personId: string;
    memberName?: string;
}

export default function DelphiView({ personId, memberName = 'You' }: DelphiViewProps) {
    const [activeTab, setActiveTab] = useState('trajectory');

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h2 className="text-base font-bold text-white">Delphi Health Trajectory</h2>
                <p className="text-xs text-slate-500 mt-0.5">{memberName} · Real-time longitudinal health intelligence</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-0.5 overflow-x-auto pb-1 scrollbar-hide border-b border-white/5">
                {DELPHI_TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-t-lg whitespace-nowrap transition-colors ${active
                                ? 'text-white bg-white/5 border-b-2 border-teal-400'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}>
                            <Icon className="w-3 h-3" />{tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            {activeTab === 'trajectory' && (
                <div className="space-y-4">
                    <DHTPanel personId={personId} />
                    <NextBestMeasurement personId={personId} />
                </div>
            )}
            {activeTab === 'risk' && (
                <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
                    <h3 className="text-xs font-semibold text-white mb-3">Health Domain Risk Cards</h3>
                    <RiskCards personId={personId} />
                </div>
            )}
            {activeTab === 'indicators' && (
                <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
                    <h3 className="text-xs font-semibold text-white mb-3">Leading Health Signals</h3>
                    <LeadingIndicators personId={personId} />
                </div>
            )}
            {activeTab === 'next-best' && (
                <div className="space-y-3">
                    <p className="text-xs text-slate-500">The measurement below would reduce your trajectory uncertainty the most:</p>
                    <NextBestMeasurement personId={personId} />
                </div>
            )}
            {activeTab === 'ocean' && (
                <OceanBehavioralLayer personId={personId} />
            )}
        </div>
    );
}
