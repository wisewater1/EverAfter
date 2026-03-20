import { useState, useEffect, type ComponentType } from 'react';
import {
    Users, Home, Calendar, ShoppingCart,
    CheckSquare, Clock, MapPin, Info, MessageSquare,
    Activity, RefreshCw, ArrowLeft, Bell, Link as LinkIcon,
    GitBranch, UserCheck, History, MessageCircle, Search,
    Sparkles, Brain
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';
import type { HouseholdSummary, FamilyTask, ShoppingItem, FamilyEvent } from '../lib/joseph/family';
import SaintChat from './SaintChat';
import FamilyTreeView from './joseph/FamilyTreeView';
import SecurityIntegrityBadge from './shared/SecurityIntegrityBadge';
import FamilyMembersGrid from './joseph/FamilyMembersGrid';
import FamilyTimeline from './joseph/FamilyTimeline';
import GeneWebTools from './joseph/GeneWebTools';
import SocietyFeed from './SocietyFeed';
import CouncilAlerts from './CouncilAlerts';
import PersonalityTrainingCenter from './personality/PersonalityTrainingCenter';
import MediaIntelligencePanel from './joseph/MediaIntelligencePanel';
import PersonalityQuiz from './joseph/PersonalityQuiz';
import SharedPredictionPanel from './shared/SharedPredictionPanel';
import { getFamilyMembers } from '../lib/joseph/genealogy';
import FamilyHealthHeatmap from './joseph/FamilyHealthHeatmap';
import FamilyPredictionIntelligencePanel from './joseph/FamilyPredictionIntelligencePanel';
import CustomEngramsDashboard from './CustomEngramsDashboard';
import SaintsQuickNav from './shared/SaintsQuickNav';
import DelphiView from './dht/DelphiView';
import OceanBehavioralLayer from './dht/OceanBehavioralLayer';
import TellMyStoryPartnerCard from './joseph/TellMyStoryPartnerCard';
import { buildTellMyStoryReferralCode, buildTellMyStoryUrl } from '../lib/tellMyStory';
import { AdvancedTasksTab } from './joseph/AdvancedTasksTab';
import { AdvancedShoppingTab } from './joseph/AdvancedShoppingTab';

type TabKey = 'tree' | 'members' | 'media' | 'quiz' | 'predictions' | 'society' | 'timeline' | 'tasks' | 'shopping' | 'calendar' | 'chat' | 'genealogy' | 'training' | 'delphi' | 'engrams' | 'create-ai';

const TABS: { key: TabKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { key: 'tree', label: 'Family Tree', icon: GitBranch },
    { key: 'members', label: 'Members', icon: UserCheck },
    { key: 'quiz', label: 'Personality Quiz', icon: Brain },
    { key: 'media', label: 'Media Intel', icon: Info },
    { key: 'predictions', label: 'Predictions', icon: Activity },
    { key: 'create-ai', label: 'Create Your AI', icon: Sparkles },
    { key: 'delphi', label: '⚕ Delphi', icon: Activity },
    { key: 'society', label: 'Society', icon: Users },
    { key: 'timeline', label: 'Timeline', icon: History },
    { key: 'tasks', label: 'Tasks', icon: CheckSquare },
    { key: 'shopping', label: 'Shopping', icon: ShoppingCart },
    { key: 'calendar', label: 'Calendar', icon: Calendar },
    { key: 'genealogy', label: 'Genealogy', icon: Search },
    { key: 'training', label: 'Training Lab', icon: Sparkles },
    { key: 'engrams', label: 'Custom Engrams', icon: Brain },
    { key: 'chat', label: 'Chat', icon: MessageCircle },
];

function sanitizeDashboardCopy(value: string) {
    return value
        .replace('âš• ', '')
        .replaceAll('â€™', "'")
        .replaceAll('â€”', '-')
        .replaceAll('Â·', '-');
}

function deriveFamilyStatus() {
    return getFamilyMembers()
        .filter(member => !member.deathDate)
        .sort((left, right) => right.generation - left.generation || left.firstName.localeCompare(right.firstName))
        .slice(0, 6)
        .map(member => ({
            name: `${member.firstName} ${member.lastName}`,
            status: member.generation >= 1 ? 'home' : member.generation === 0 ? 'busy' : 'away',
        }));
}

export default function StJosephFamilyDashboard() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [summary, setSummary] = useState<HouseholdSummary | null>(null);
    const [tasks, setTasks] = useState<FamilyTask[]>([]);
    const [shopping, setShopping] = useState<ShoppingItem[]>([]);
    const [events, setEvents] = useState<FamilyEvent[]>([]);
    const [bulletin, setBulletin] = useState<{ id: string; text: string; author: string }[]>([]);
    const [newBulletin, setNewBulletin] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('tree');
    const [trainingTargetId, setTrainingTargetId] = useState<string | null>(null);
    const [quizTargetMemberId, setQuizTargetMemberId] = useState<string | null>(null);

    const handleTrainMember = (engramId: string) => {
        setTrainingTargetId(engramId);
        setActiveTab('training');
    };

    const handleStartPersonalityQuiz = (memberId: string) => {
        setQuizTargetMemberId(memberId);
        setActiveTab('quiz');
    };

    const loadData = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [t, shop, e, bull] = await Promise.all([
                apiClient.getFamilyTasks(user.id),
                apiClient.getShoppingList(user.id),
                apiClient.getFamilyCalendar(user.id),
                apiClient.getFamilyBulletin(),
            ]);
            setTasks(t as FamilyTask[]);
            setShopping(shop as ShoppingItem[]);
            setEvents(e as FamilyEvent[]);
            setBulletin(bull);
            // Build summary from loaded data
            setSummary({
                activeTasks: (t as FamilyTask[]).filter(x => x.status === 'pending').length,
                upcomingEvents: (e as FamilyEvent[]).length,
                shoppingListCount: (shop as ShoppingItem[]).filter((x: any) => x.status === 'needed').length,
                familyStatus: deriveFamilyStatus(),
            });
        } catch (error) {
            console.error('Error loading family data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTask = async (taskId: string) => {
        await apiClient.completeTask(taskId);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
        setSummary(prev => prev ? { ...prev, activeTasks: Math.max(0, prev.activeTasks - 1) } : prev);
    };

    const handleMarkBought = async (itemId: string) => {
        await apiClient.markItemBought(itemId);
        setShopping(prev => prev.map(s => s.id === itemId ? { ...s, status: 'bought' } : s));
        setSummary(prev => prev ? { ...prev, shoppingListCount: Math.max(0, prev.shoppingListCount - 1) } : prev);
    };

    const handlePostBulletin = async () => {
        const text = newBulletin.trim();
        if (!text) return;
        const author = user?.email?.split('@')[0] || 'Me';
        await apiClient.postBulletinMessage(text, author);
        setBulletin(prev => [{ id: `local_${Date.now()}`, text, author }, ...prev]);
        setNewBulletin('');
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
        if (authLoading) return;
        loadData();
        syncEngrams();
    }, [authLoading, user]);

    useEffect(() => {
        const requestedTab = searchParams.get('tab');
        const requestedMemberId = searchParams.get('memberId');
        if (!requestedTab && !requestedMemberId) return;

        if (requestedTab && TABS.some(tab => tab.key === requestedTab)) {
            setActiveTab(requestedTab as TabKey);
        } else if (requestedMemberId) {
            setActiveTab('quiz');
        }

        if (requestedMemberId) {
            setQuizTargetMemberId(requestedMemberId);
        }

        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('tab');
        nextSearchParams.delete('memberId');
        setSearchParams(nextSearchParams, { replace: true });
    }, [searchParams, setSearchParams]);

    if (authLoading || loading) {
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

                    <div className="flex items-center justify-center md:justify-end shrink-0 md:ml-auto gap-3">
                        <SecurityIntegrityBadge />
                    </div>
                </div>

                <SaintsQuickNav />

                <div className="mt-4 flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto w-full max-w-[calc(100vw-2rem)] md:max-w-none hide-scrollbar">
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
                            {sanitizeDashboardCopy(label)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Full-width genealogy tabs */}
            {(activeTab === 'tree' || activeTab === 'members' || activeTab === 'timeline' || activeTab === 'genealogy' || activeTab === 'society' || activeTab === 'training' || activeTab === 'media' || activeTab === 'quiz' || activeTab === 'predictions' || activeTab === 'delphi' || activeTab === 'engrams' || activeTab === 'create-ai') && (
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'tree' && (
                        <FamilyTreeView
                            onTrainMember={handleTrainMember}
                            onStartPersonalityQuiz={handleStartPersonalityQuiz}
                        />
                    )}
                    {activeTab === 'members' && (
                        <div className="space-y-4">
                            <FamilyHealthHeatmap />
                            <FamilyMembersGrid
                                onTrainMember={handleTrainMember}
                                onStartPersonalityQuiz={handleStartPersonalityQuiz}
                            />
                        </div>
                    )}
                    {activeTab === 'quiz' && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                            <PersonalityQuiz
                                initialMemberId={quizTargetMemberId}
                                onAutoStartConsumed={() => setQuizTargetMemberId(null)}
                            />
                            {user?.id && <OceanBehavioralLayer personId={user.id} />}
                            <TellMyStoryPartnerCard
                                title="Create Your AI from OCEAN + story data"
                                description="Use TellMyStory.ai to collect the narrative context behind each family member’s OCEAN profile, then carry that memory layer back into EverAfter."
                                compact
                            />
                        </div>
                    )}
                    {activeTab === 'media' && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8">
                            <MediaIntelligencePanel />
                        </div>
                    )}
                    {activeTab === 'predictions' && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                            <SharedPredictionPanel saint="joseph" />
                            {user?.id && <FamilyPredictionIntelligencePanel userId={user.id} />}
                            <FamilyHealthHeatmap />
                        </div>
                    )}
                    {activeTab === 'training' && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8">
                            <PersonalityTrainingCenter targetEngramId={trainingTargetId} />
                        </div>
                    )}
                    {activeTab === 'engrams' && user && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8">
                            <CustomEngramsDashboard userId={user.id} onSelectAI={handleTrainMember} />
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
                    {activeTab === 'delphi' && user?.id && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8">
                            <DelphiView personId={user.id} memberName={user.email?.split('@')[0] || 'You'} />
                        </div>
                    )}
                    {activeTab === 'create-ai' && (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-amber-300">
                                    <Sparkles className="w-5 h-5" />
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">Partner Launch</span>
                                </div>
                                <h3 className="text-2xl font-light text-white">EverAfter has partnered with TellMyStory.ai</h3>
                                <p className="max-w-3xl text-sm text-slate-300 leading-relaxed">
                                    Use this flow to send family members to TellMyStory.ai, capture memories and voice stories, and keep every referral tied back to EverAfter with a unique code that includes <span className="font-semibold text-amber-300">wise</span>.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {getFamilyMembers().map(member => (
                                    <div key={member.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                                        <div>
                                            <h4 className="text-lg text-white font-medium">{member.firstName} {member.lastName}</h4>
                                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{member.aiPersonality?.familyRole || 'Family Member'}</p>
                                        </div>
                                        <div className="space-y-2 text-sm text-slate-300">
                                            <p>Referral code: <span className="font-semibold text-amber-300">{buildTellMyStoryReferralCode(member)}</span></p>
                                            <p className="text-xs text-slate-500 break-all">{buildTellMyStoryUrl(member)}</p>
                                        </div>
                                        <a
                                            href={buildTellMyStoryUrl(member)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
                                        >
                                            Send to TellMyStory.ai
                                            <MessageSquare className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))}
                            </div>
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
                                    </div>
                                    {/* Compose */}
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            value={newBulletin}
                                            onChange={e => setNewBulletin(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handlePostBulletin()}
                                            placeholder="Post a message to the family..."
                                            className="flex-1 px-4 py-2 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                                        />
                                        <button
                                            onClick={handlePostBulletin}
                                            disabled={!newBulletin.trim()}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all"
                                        >
                                            Post
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {bulletin.map((msg, i) => (
                                            <div key={msg.id} className={`p-4 ${i === 0 ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-white/5 border border-white/5'} rounded-2xl`}>
                                                <p className="text-sm text-slate-300 leading-relaxed">"{msg.text}"</p>
                                                <div className="mt-2 text-[10px] text-slate-500 uppercase font-bold text-right">— {msg.author}</div>
                                            </div>
                                        ))}
                                        {bulletin.length === 0 && (
                                            <p className="text-center text-sm text-slate-600 py-4">No messages yet. Post the first one!</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'tasks' && (
                            <AdvancedTasksTab />
                        )}

                        {activeTab === 'shopping' && (
                            <AdvancedShoppingTab />
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
                                            <div className="flex-1 space-y-3">
                                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-medium text-white">{event.title}</div>
                                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                                                            <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                                                                {event.calendarTitle || 'Family Sync'}
                                                            </span>
                                                            <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-400 uppercase">
                                                                {event.allDay ? 'All day' : (event.availability || 'busy')}
                                                            </span>
                                                            {event.recurrenceRule && (
                                                                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                                                                    {event.recurrenceRule}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {event.riskSummary && (
                                                        <div className="max-w-md rounded-xl border border-amber-500/15 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                                                            {event.riskSummary}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3 h-3" />
                                                        {event.allDay
                                                            ? 'All day'
                                                            : `${new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-3 h-3" />
                                                        {(event.attendees || []).join(', ') || 'No attendees'}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3 h-3" />
                                                        {event.location || 'Location pending'}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Bell className="w-3 h-3" />
                                                        {event.alarms?.map((alarm: { label?: string; date?: string }) => alarm.label || alarm.date).filter(Boolean).join(', ') || 'No reminders'}
                                                    </div>
                                                </div>

                                                {(event.notes || event.description) && (
                                                    <p className="text-sm text-slate-300 leading-relaxed">
                                                        {event.notes || event.description}
                                                    </p>
                                                )}

                                                {event.url && (
                                                    <a
                                                        href={event.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 text-xs text-indigo-300 hover:text-indigo-200"
                                                    >
                                                        <LinkIcon className="w-3.5 h-3.5" />
                                                        Open linked record
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {events.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-500">
                                            No family calendar events are available yet.
                                        </div>
                                    )}
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
                                    userContext={`Family Personality Dynamics Context: ${getFamilyMembers().filter(m => m.aiPersonality?.archetype).map(m => `${m.firstName}: ${m.aiPersonality?.archetype || 'Unknown'} (${m.aiPersonality?.familyRole || 'Member'}) - ${m.aiPersonality?.communicationStyle || ''}`).join(' | ')}`}
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
