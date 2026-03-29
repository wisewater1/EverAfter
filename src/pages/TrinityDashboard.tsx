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
import DHTPanel from '../components/dht/DHTPanel';
import OceanBehavioralLayer from '../components/dht/OceanBehavioralLayer';
import { useAuth } from '../contexts/AuthContext';

const TABS = [
    { id: 'overview', label: 'Overview', mobileLabel: 'Overview', icon: Shield },
    { id: 'council', label: 'Council', mobileLabel: 'Council', icon: MessageSquare },
    { id: 'goals', label: 'Goals', mobileLabel: 'Goals', icon: Target },
    { id: 'alerts', label: 'Alerts', mobileLabel: 'Alerts', icon: AlertTriangle },
    { id: 'calendar', label: 'Calendar', mobileLabel: 'Calendar', icon: Calendar },
    { id: 'chronicle', label: 'Chronicle', mobileLabel: 'Chronicle', icon: BookOpen },
    { id: 'elders', label: 'Elder Care', mobileLabel: 'Elders', icon: Users },
    { id: 'nudges', label: 'Nudges', mobileLabel: 'Nudges', icon: Zap },
    { id: 'inheritance', label: 'Inheritance', mobileLabel: 'Legacy', icon: FileText },
    { id: 'whatif', label: 'What-If', mobileLabel: 'What-If', icon: Beaker },
];

export default function TrinityDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();
    const { user } = useAuth();
    const activeTabConfig = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

    return (
        <div className="min-h-screen bg-[#0c0c12] text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0c0c12]/80 backdrop-blur-xl border-b border-white/5">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
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
                    <div className="ml-auto hidden sm:block">
                        <SaintsQuickNav />
                    </div>
                </div>

                {/* Tabs */}
                <div className="mx-auto max-w-7xl px-4 pb-3 sm:pb-0">
                    <div className="mb-3 sm:hidden">
                        <SaintsQuickNav />
                    </div>
                    <div className="sm:hidden">
                        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Trinity View
                        </label>
                        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-2">
                            <div className="mb-2 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                <activeTabConfig.icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{activeTabConfig.label}</span>
                            </div>
                            <select
                                value={activeTab}
                                onChange={(event) => setActiveTab(event.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-[#0c0c12] px-3 py-3 text-sm text-white outline-none transition-colors focus:border-amber-500/40"
                            >
                                {TABS.map((tab) => (
                                    <option key={tab.id} value={tab.id}>
                                        {tab.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="hidden gap-0.5 overflow-x-auto pb-0 scrollbar-hide sm:flex">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                        ? 'border-b-2 border-amber-400 bg-white/5 text-white'
                                        : 'text-slate-500 hover:bg-white/[0.02] hover:text-slate-300'
                                        }`}
                                >
                                    <Icon className="w-3 h-3" />
                                    <span className="md:hidden">{tab.mobileLabel}</span>
                                    <span className="hidden md:inline">{tab.label}</span>
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

                        {/* DHT + OCEAN Fusion Row */}
                        {user?.id && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-teal-500 inline-block"></span>
                                        Delphi Health Trajectory — {user.email?.split('@')[0]}
                                    </p>
                                    <DHTPanel personId={user.id} compact={false} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-purple-500 inline-block"></span>
                                        OCEAN × Behavioral Health Layer
                                    </p>
                                    <OceanBehavioralLayer personId={user.id} />
                                </div>
                            </div>
                        )}

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
