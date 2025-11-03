import React, { useState, useEffect } from 'react';
import { MessageCircle, Bot, Heart, Activity, Clock, Star, Search, Plus, Settings, X, CheckSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ArchetypalAIChat from './ArchetypalAIChat';
import EngramChat from './EngramChat';
import RaphaelChat from './RaphaelChat';
import EngramTaskManager from './EngramTaskManager';
import GlassCard from './GlassCard';
import ReactiveButton from './ReactiveButton';

interface ChatSession {
  id: string;
  type: 'archetypal' | 'engram' | 'raphael';
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isActive?: boolean;
  archetype?: string;
}

interface ArchetypalAI {
  id: string;
  name: string;
  is_ai_active: boolean;
}

type ViewMode = 'list' | 'chat';
type FilterType = 'all' | 'archetypal' | 'engram' | 'raphael' | 'favorites';
type TabMode = 'conversations' | 'tasks';

export default function UnifiedChatInterface() {
  const { user } = useAuth();
  const [tabMode, setTabMode] = useState<TabMode>('conversations');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [archetypalAIs, setArchetypalAIs] = useState<ArchetypalAI[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      loadChatSessions();
      loadFavorites();
    }
  }, [user?.id]);

  const loadChatSessions = async () => {
    if (!user?.id) return;

    try {
      const { data: archetypalAIsData, error: archetypalError } = await supabase
        .from('archetypal_ais')
        .select('id, name, archetype, is_ai_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (archetypalError) throw archetypalError;

      setArchetypalAIs(archetypalAIsData || []);

      const sessions: ChatSession[] = [
        {
          id: 'raphael',
          type: 'raphael',
          name: 'St. Raphael',
          lastMessage: 'Your health insights are ready',
          lastMessageTime: new Date().toISOString(),
          isActive: true,
          archetype: 'Health Guardian',
        },
        ...(archetypalAIsData || []).map(ai => ({
          id: ai.id,
          type: 'archetypal' as const,
          name: ai.name,
          isActive: ai.is_ai_active,
          archetype: ai.archetype || 'Custom AI',
        })),
      ];

      setChatSessions(sessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const loadFavorites = () => {
    const stored = localStorage.getItem(`chat-favorites-${user?.id}`);
    if (stored) {
      setFavorites(new Set(JSON.parse(stored)));
    }
  };

  const toggleFavorite = (sessionId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(sessionId)) {
      newFavorites.delete(sessionId);
    } else {
      newFavorites.add(sessionId);
    }
    setFavorites(newFavorites);
    localStorage.setItem(`chat-favorites-${user?.id}`, JSON.stringify(Array.from(newFavorites)));
  };

  const filteredSessions = chatSessions.filter(session => {
    const matchesSearch = session.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === 'all' ||
      filterType === session.type ||
      (filterType === 'favorites' && favorites.has(session.id));
    return matchesSearch && matchesFilter;
  });

  const handleSelectSession = (session: ChatSession) => {
    setSelectedSession(session);
    setViewMode('chat');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedSession(null);
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'raphael':
        return <Activity className="w-5 h-5" />;
      case 'archetypal':
        return <Bot className="w-5 h-5" />;
      case 'engram':
        return <MessageCircle className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  const getSessionColor = (type: string) => {
    switch (type) {
      case 'raphael':
        return 'from-emerald-500 to-teal-500';
      case 'archetypal':
        return 'from-violet-500 to-fuchsia-500';
      case 'engram':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const renderChatComponent = () => {
    if (!selectedSession) return null;

    switch (selectedSession.type) {
      case 'raphael':
        return <RaphaelChat />;
      case 'archetypal':
        return <ArchetypalAIChat preselectedAIId={selectedSession.id} />;
      case 'engram':
        return <EngramChat engramId={selectedSession.id} />;
      default:
        return null;
    }
  };

  if (viewMode === 'chat' && selectedSession) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-slate-950/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-4 shadow-2xl">
          <ReactiveButton
            onClick={handleBackToList}
            variant="teal"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Back to Chats
          </ReactiveButton>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${getSessionColor(selectedSession.type)} rounded-xl flex items-center justify-center shadow-xl`}>
              {getSessionIcon(selectedSession.type)}
            </div>
            <div>
              <h3 className="text-white font-semibold">{selectedSession.name}</h3>
              <p className="text-xs text-slate-400">{selectedSession.archetype}</p>
            </div>
          </div>
          <button
            onClick={() => toggleFavorite(selectedSession.id)}
            className="p-2.5 hover:bg-slate-800/50 rounded-xl transition-all backdrop-blur-sm border border-slate-700/30 hover:border-amber-500/30"
          >
            <Star
              className={`w-5 h-5 ${
                favorites.has(selectedSession.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
              }`}
            />
          </button>
        </div>

        <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
          {renderChatComponent()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-950/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 shadow-2xl">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Chat & Tasks Hub</h2>
          <p className="text-slate-400 text-sm">
            {tabMode === 'conversations'
              ? 'Conversations with your AI assistants'
              : 'Manage AI tasks and automation'}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 hover:bg-slate-800/50 rounded-xl transition-all backdrop-blur-sm border border-slate-700/30 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10"
        >
          <Settings className="w-5 h-5 text-slate-400 hover:text-emerald-400 transition-colors" />
        </button>
      </div>

      <div className="flex items-center gap-2 bg-slate-950/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-2 shadow-2xl">
        <button
          onClick={() => {
            setTabMode('conversations');
            setViewMode('list');
            setSelectedSession(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-medium ${
            tabMode === 'conversations'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
          }`}
          aria-checked={tabMode === 'conversations'}
        >
          <MessageCircle className="w-4 h-4" />
          Conversations
        </button>
        <button
          onClick={() => setTabMode('tasks')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-medium ${
            tabMode === 'tasks'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
          }`}
          aria-checked={tabMode === 'tasks'}
        >
          <CheckSquare className="w-4 h-4" />
          Tasks
        </button>
      </div>

      {tabMode === 'conversations' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950/60 backdrop-blur-xl border border-slate-800/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-xl"
              />
            </div>
          </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'all', label: 'All', icon: MessageCircle },
          { id: 'favorites', label: 'Favorites', icon: Star },
          { id: 'raphael', label: 'Health', icon: Activity },
          { id: 'archetypal', label: 'AI Assistants', icon: Bot },
        ].map((filter) => {
          const Icon = filter.icon;
          const isActive = filterType === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => setFilterType(filter.id as FilterType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap text-sm font-medium backdrop-blur-xl ${
                isActive
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950/40 border border-slate-800/30 text-slate-400 hover:bg-slate-800/40 hover:text-white hover:border-slate-700/50'
              }`}
              aria-checked={isActive}
            >
              <Icon className="w-4 h-4" />
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            onClick={() => handleSelectSession(session)}
            className="relative group p-5 cursor-pointer bg-slate-950/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectSession(session);
              }
            }}
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(session.id);
                }}
                className="p-2 hover:bg-slate-800/60 rounded-lg transition-all backdrop-blur-sm border border-slate-700/30"
              >
                <Star
                  className={`w-4 h-4 ${
                    favorites.has(session.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-start gap-4 mb-4">
              <div className={`w-14 h-14 bg-gradient-to-br ${getSessionColor(session.type)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-xl`}>
                {getSessionIcon(session.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-white font-semibold truncate">{session.name}</h3>
                  {session.isActive && (
                    <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0 shadow-lg shadow-emerald-400/50 animate-pulse"></div>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">{session.archetype}</p>
              </div>
            </div>

            {session.lastMessage && (
              <div className="space-y-2 bg-slate-900/40 rounded-xl p-3 border border-slate-800/30">
                <p className="text-sm text-slate-300 line-clamp-2">{session.lastMessage}</p>
                {session.lastMessageTime && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(session.lastMessageTime).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {session.unreadCount && session.unreadCount > 0 && (
              <div className="absolute top-4 right-4 w-7 h-7 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                {session.unreadCount}
              </div>
            )}
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="col-span-full text-center py-16 bg-slate-950/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl">
            <div className="w-20 h-20 bg-slate-900/60 border border-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium text-lg">No conversations found</p>
            <p className="text-sm text-slate-500 mt-2">
              {searchQuery ? 'Try a different search' : 'Create an AI assistant to get started'}
            </p>
          </div>
        )}
      </div>

          {showSettings && (
            <div className="p-6 space-y-4 bg-slate-950/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-2xl animate-spring-in">
              <h3 className="text-white font-semibold text-lg mb-4">Chat Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/30 hover:border-emerald-500/30 transition-all cursor-pointer">
                  <span className="text-slate-300 text-sm font-medium">Show typing indicators</span>
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500/20" defaultChecked />
                </label>
                <label className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/30 hover:border-emerald-500/30 transition-all cursor-pointer">
                  <span className="text-slate-300 text-sm font-medium">Sound notifications</span>
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500/20" />
                </label>
                <label className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/30 hover:border-emerald-500/30 transition-all cursor-pointer">
                  <span className="text-slate-300 text-sm font-medium">Auto-save conversations</span>
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500/20" defaultChecked />
                </label>
              </div>
            </div>
          )}
        </>
      )}

      {tabMode === 'tasks' && user?.id && (
        <EngramTaskManager engrams={archetypalAIs} userId={user.id} />
      )}
    </div>
  );
}
