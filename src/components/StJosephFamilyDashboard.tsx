import { useState, useEffect, type ComponentType } from 'react';
import {
    Users, Home, Calendar, ShoppingCart,
    CheckSquare, Clock, MapPin, Info, MessageSquare, Plus,
    Activity, RefreshCw, ArrowLeft,
    GitBranch, UserCheck, History, MessageCircle, Search,
    Scale, Archive, Sparkles, Brain
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    getHouseholdSummary, getFamilyTasks,
    getShoppingList, getFamilyCalendar,
    HouseholdSummary, FamilyTask,
    ShoppingItem, FamilyEvent
} from '../lib/joseph/family';
import SaintChat from './SaintChat';
import FamilyTreeView from './joseph/FamilyTreeView';
import SecurityIntegrityBadge from './shared/SecurityIntegrityBadge';
import FamilyMembersGrid from './joseph/FamilyMembersGrid';
import FamilyTimeline from './joseph/FamilyTimeline';
import GeneWebTools from './joseph/GeneWebTools';
import SocietyFeed from './SocietyFeed';
import CouncilAlerts from './CouncilAlerts';
import PersonalityTrainingCenter from './personality/PersonalityTrainingCenter';
import { getFamilyMembers } from '../lib/joseph/genealogy';
import { apiClient } from '../lib/api-client';
import FamilyHealthHeatmap from './joseph/FamilyHealthHeatmap';

type TabKey = 'tree' | 'members' | 'society' | 'timeline' | 'tasks' | 'shopping' | 'calendar' | 'chat' | 'genealogy' | 'training';

const TABS: { key: TabKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { key: 'tree', label: 'Family Tree', icon: GitBranch },
    { key: 'members', label: 'Members', icon: UserCheck },
    { key: 'society', label: 'Autonomous Society', icon: Activity },
    { key: 'timeline', label: 'Timeline', icon: History },
    { key: 'tasks', label: 'Tasks', icon: CheckSquare },
    { key: 'shopping', label: 'Shopping', icon: ShoppingCart },
    { key: 'calendar', label: 'Calendar', icon: Calendar },
    { key: 'genealogy', label: 'Genealogy', icon: Search },
    { key: 'training', label: 'Training Lab', icon: Brain },
    { key: 'chat', label: 'Chat', icon: MessageCircle },
];

export default function StJosephFamilyDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<HouseholdSummary | null>(null);
    const [tasks, setTasks] = useState<FamilyTask[]>([]);
    const [shopping, setShopping] = useState<ShoppingItem[]>([]);
    const [events, setEvents] = useState<FamilyEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('tree');
    const [trainingTargetId, setTrainingTargetId] = useState<string | null>(null);

    const handleTrainMember = (engramId: string) => {
        setTrainingTargetId(engramId);
        setActiveTab('training');
    };

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [s, t, shop, e] = await Promise.all([
                getHouseholdSummary(user.id),
                getFamilyTasks(user.id),
                getShoppingList(user.id),
                getFamilyCalendar(user.id)
            ]);
            setSummary(s);
            setTasks(t);
            setShopping(shop);
            setEvents(e);
        } catch (error) {
            console.error('Error loading family data:', error);
        } finally {
            setLoading(false);
        }
    };

    const syncEngrams = async () => {
        const members = getFamilyMembers();
        try {
            console.log('St. Joseph: Synchronizing family engrams...');
            await apiClient.batchSyncEngrams(members);
            console.log('St. Joseph: Family engrams synchronized.');
        } catch (error) {
            console.error('St. Joseph: Failed to sync engrams:', error);
        }
    };

    useEffect(() => {
        loadData();
        syncEngrams();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-slate-400 font-light">Calling St. Joseph...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back to Dashboard</span>
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center p-4 shadow-lg shadow-amber-500/10 shrink-0">
                            <Users className="w-full h-full text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-3xl font-light text-white tracking-tight whitespace-nowrap">St. Joseph</h1>
                            <p className="text-amber-500/60 font-medium uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">The Family Guardian</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center md:justify-end shrink-0 md:ml-auto gap-4">
                        <div className="flex items-center gap-2">
                            <button onClick={() => navigate('/council')} className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/20 transition-all group shrink-0" title="Council of Saints">
                                <Scale className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                            <button onClick={() => navigate('/time-capsules')} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/20 transition-all group shrink-0" title="Time Capsule Vault">
                                <Archive className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                            <button onClick={() => navigate('/rituals')} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-all group shrink-0" title="Ritual Altar">
                                <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                        <SecurityIntegrityBadge />
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto w-full custom-scrollbar">
                    {TABS.map(({ key, label, icon: TabIcon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 ${activeTab === key
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <TabIcon className="w-3.5 h-3.5 shrink-0" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Full-width genealogy tabs */}
            {(activeTab === 'tree' || activeTab === 'members' || activeTab === 'timeline' || activeTab === 'genealogy' || activeTab === 'society' || activeTab === 'training') && (
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'tree' && <FamilyTreeView onTrainMember={handleTrainMember} />}
                    {activeTab === 'members' && (
                        <div className="space-y-4">
                            <FamilyHealthHeatmap />
                            <FamilyMembersGrid onTrainMember={handleTrainMember} />
                        </div>
                    )}
                    {activeTab === 'training' && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8">
                            <PersonalityTrainingCenter targetEngramId={trainingTargetId} />
                        </div>
                    )}
                    {activeTab === 'timeline' && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8">
                            <h3 className="text-xl font-light text-white mb-6 flex items-center gap-2">
                                <History className="w-5 h-5 text-amber-400" />
                                Family History
                            </h3>
                            <FamilyTimeline />
                        </div>
                    )}
                    {activeTab === 'society' && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8">
                            <h3 className="text-xl font-light text-white mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-400" />
                                Autonomous Society Feed
                            </h3>
                            <SocietyFeed />
                        </div>
                    )}
                    {activeTab === 'genealogy' && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8">
                            <h3 className="text-xl font-light text-white mb-6 flex items-center gap-2">
                                <Search className="w-5 h-5 text-violet-400" />
                                GeneWeb Genealogy Tools
                            </h3>
                            <GeneWebTools />
                        </div>
                    )}
                </div>
            )}

            {/* Household tabs with sidebar */}
            {(activeTab === 'tasks' || activeTab === 'shopping' || activeTab === 'calendar' || activeTab === 'chat') && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">

                        {activeTab === 'tasks' && (
                            <>
                                {/* Family Presence */}
                                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Home className="w-32 h-32 text-amber-500" />
                                    </div>
                                    <h3 className="text-xl font-light text-white mb-6 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-amber-400" />
                                        Family Status
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {summary?.familyStatus.map((member, i) => (
                                            <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${member.status === 'home' ? 'bg-emerald-400' :
                                                    member.status === 'away' ? 'bg-slate-500' : 'bg-amber-400'
                                                    }`} />
                                                <div>
                                                    <div className="text-sm font-medium text-white">{member.name}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{member.status}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Shared Bulletin (HomeHub Notes) */}
                                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-light text-white flex items-center gap-2">
                                            <MessageSquare className="w-5 h-5 text-amber-400" />
                                            Family Bulletin
                                        </h3>
                                        <button className="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-all">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                            <p className="text-sm text-amber-200/80 leading-relaxed">
                                                "Don't forget family dinner at Grandma's on Sunday! 6:00 PM."
                                            </p>
                                            <div className="mt-2 text-[10px] text-amber-500/40 uppercase font-bold text-right">— Alice</div>
                                        </div>
                                        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                            <p className="text-sm text-slate-300 leading-relaxed">
                                                "Pick up the package at the front door if you get home first."
                                            </p>
                                            <div className="mt-2 text-[10px] text-slate-500 uppercase font-bold text-right">— Bob</div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                                <h3 className="text-xl font-light text-white mb-6 flex items-center gap-2">
                                    <CheckSquare className="w-5 h-5 text-amber-400" />
                                    Task Master
                                </h3>
                                <div className="space-y-3">
                                    {tasks.map((task) => (
                                        <div key={task.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-amber-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                                                    }`}>
                                                    <CheckSquare className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-medium ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-white'}`}>
                                                        {task.action}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">{task.description}</div>
                                                </div>
                                            </div>
                                            <div className="px-2 py-1 bg-white/5 rounded text-[9px] text-slate-500 font-bold uppercase">
                                                {task.category}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'shopping' && (
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                                <h3 className="text-xl font-light text-white mb-6 flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5 text-amber-400" />
                                    Provisioning List
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {shopping.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${item.status === 'needed' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                                <div>
                                                    <div className="text-sm font-medium text-white">{item.name}</div>
                                                    <div className="text-[10px] text-slate-500">{item.quantity} · Added by {item.addedBy}</div>
                                                </div>
                                            </div>
                                            {item.status === 'needed' && (
                                                <button className="text-[10px] text-amber-500 font-bold uppercase hover:text-amber-400 transition-colors">
                                                    Bought
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'calendar' && (
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                                <h3 className="text-xl font-light text-white mb-6 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-amber-400" />
                                    Family Sync
                                </h3>
                                <div className="space-y-4">
                                    {events.map((event) => (
                                        <div key={event.id} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex flex-col items-center justify-center w-12 border-r border-white/5">
                                                <div className="text-lg font-light text-white">{new Date(event.startTime).getDate()}</div>
                                                <div className="text-[9px] text-slate-500 uppercase font-bold">
                                                    {new Date(event.startTime).toLocaleString('default', { month: 'short' })}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-white">{event.title}</div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    <span className="mx-1 opacity-20">|</span>
                                                    <Users className="w-3 h-3" />
                                                    {event.attendees.join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'chat' && (
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden h-[600px]">
                                <SaintChat
                                    saintId="joseph"
                                    saintName="St. Joseph"
                                    saintTitle="The Family Guardian"
                                    saintIcon={Users}
                                    primaryColor="amber"
                                />
                            </div>
                        )}

                    </div>

                    {/* Sidebar Sidebar area */}
                    <div className="space-y-8">

                        {/* Household Summary Stats */}
                        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-6">
                            <h4 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-6">Home Overview</h4>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <CheckSquare className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs text-slate-400 uppercase tracking-wide">Active Tasks</span>
                                    </div>
                                    <span className="text-lg font-light text-white">{summary?.activeTasks}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs text-slate-400 uppercase tracking-wide">Family Events</span>
                                    </div>
                                    <span className="text-lg font-light text-white">{summary?.upcomingEvents}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <ShoppingCart className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs text-slate-400 uppercase tracking-wide">Items Needed</span>
                                    </div>
                                    <span className="text-lg font-light text-white">{summary?.shoppingListCount}</span>
                                </div>
                            </div>
                        </div>

                        {/* St. Joseph Message (Flavor) */}
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <Info className="w-4 h-4 text-amber-500" />
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Guardian Word</h4>
                                </div>
                                <p className="text-sm text-slate-400 italic leading-relaxed">
                                    "Family is the heart of every journey. I am here to smooth the paths of your daily life and ensure your home remains a sanctuary of peace."
                                </p>
                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <Activity className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <div className="text-[10px] text-amber-500/60 font-medium">Harmony Level: High</div>
                                </div>
                            </div>
                        </div>

                        {/* Council Alerts & Intercessions */}
                        <CouncilAlerts />

                    </div>

                </div>
            )}
        </div>
    );
}
