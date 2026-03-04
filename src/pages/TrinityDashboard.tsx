/**
 * TrinityDashboard — Central hub for all 10 cross-Saint features.
 * Route: /trinity
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageSquare, Target, Shield, AlertTriangle, Calendar, BookOpen, Users, Zap, FileText, Beaker, ArrowLeft } from 'lucide-react';
import SaintsQuickNav from '../components/shared/SaintsQuickNav';
import TrinityCouncilChat from '../components/trinity/TrinityCouncilChat';
import CrossSaintGoalEngine from '../components/trinity/CrossSaintGoalEngine';
import FamilyVitalityScore from '../components/trinity/FamilyVitalityScore';
import EmergencyAlertChain from '../components/trinity/EmergencyAlertChain';
import SeasonalHealthCalendar from '../components/trinity/SeasonalHealthCalendar';
import FamilyChronicle from '../components/trinity/FamilyChronicle';
import ElderCareCoordination from '../components/trinity/ElderCareCoordination';
import BehavioralNudgeEngine from '../components/trinity/BehavioralNudgeEngine';
import InheritanceDirective from '../components/trinity/InheritanceDirective';
import CrossSaintWhatIf from '../components/trinity/CrossSaintWhatIf';

const TABS = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'council', label: 'Council', icon: MessageSquare },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'chronicle', label: 'Chronicle', icon: BookOpen },
    { id: 'elders', label: 'Elder Care', icon: Users },
    { id: 'nudges', label: 'Nudges', icon: Zap },
    { id: 'inheritance', label: 'Inheritance', icon: FileText },
    { id: 'whatif', label: 'What-If', icon: Beaker },
];

export default function TrinityDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0c0c12] text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0c0c12]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 via-teal-500/20 to-emerald-500/20 border border-amber-500/20 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white">Trinity Dashboard</h1>
                            <p className="text-[10px] text-slate-500">Joseph · Raphael · Gabriel — Unified Intelligence</p>
                        </div>
                    </div>
                    <div className="ml-auto">
                        <SaintsQuickNav />
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-0.5 overflow-x-auto pb-0 scrollbar-hide">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-t-lg whitespace-nowrap transition-colors ${activeTab === tab.id
                                            ? 'bg-white/5 text-white border-b-2 border-amber-400'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
                                        }`}
                                >
                                    <Icon className="w-3 h-3" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {activeTab === 'overview' && (
                    <div className="space-y-5">
                        {/* Vitality Score at top */}
                        <FamilyVitalityScore />

                        {/* Quick grid: nudges + alerts + goals */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <BehavioralNudgeEngine />
                            <EmergencyAlertChain />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <CrossSaintGoalEngine />
                            <SeasonalHealthCalendar />
                        </div>
                    </div>
                )}

                {activeTab === 'council' && <TrinityCouncilChat />}
                {activeTab === 'goals' && <CrossSaintGoalEngine />}
                {activeTab === 'alerts' && <EmergencyAlertChain />}
                {activeTab === 'calendar' && <SeasonalHealthCalendar />}
                {activeTab === 'chronicle' && <FamilyChronicle />}
                {activeTab === 'elders' && <ElderCareCoordination />}
                {activeTab === 'nudges' && <BehavioralNudgeEngine />}
                {activeTab === 'inheritance' && <InheritanceDirective />}
                {activeTab === 'whatif' && <CrossSaintWhatIf />}
            </main>
        </div>
    );
}
