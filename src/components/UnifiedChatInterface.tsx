import React, { useState, useEffect } from 'react';
import { MessageCircle, Bot, Heart, Activity, Clock, Star, Search, Plus, Settings, X, CheckSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ArchetypalAIChat from './ArchetypalAIChat';
import EngramChat from './EngramChat';
import RaphaelChat from './RaphaelChat';
import EngramTaskManager from './EngramTaskManager';

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
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg transition-all text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Back to Chats
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${getSessionColor(selectedSession.type)} rounded-lg flex items-center justify-center`}>
              {getSessionIcon(selectedSession.type)}
            </div>
            <div>
              <h3 className="text-white font-medium">{selectedSession.name}</h3>
              <p className="text-xs text-slate-400">{selectedSession.archetype}</p>
            </div>
          </div>
          <button
            onClick={() => toggleFavorite(selectedSession.id)}
            className="p-2 hover:bg-slate-800/50 rounded-lg transition-all"
          >
            <Star
              className={`w-5 h-5 ${
                favorites.has(selectedSession.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
              }`}
            />
          </button>
        </div>

        <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden">
          {renderChatComponent()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          className="p-2 hover:bg-slate-800/50 rounded-lg transition-all"
        >
          <Settings className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="flex items-center gap-2 bg-slate-800/30 p-1 rounded-lg border border-slate-700/30">
        <button
          onClick={() => {
            setTabMode('conversations');
            setViewMode('list');
            setSelectedSession(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-all font-medium ${
            tabMode === 'conversations'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Conversations
        </button>
        <button
          onClick={() => setTabMode('tasks')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-all font-medium ${
            tabMode === 'tasks'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Tasks
        </button>
      </div>

      {tabMode === 'conversations' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800/30 text-slate-400 hover:text-slate-300 border border-slate-700/30 hover:border-slate-600/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSessions.map((session) => (
          <button
            key={session.id}
            onClick={() => handleSelectSession(session)}
            className="relative group bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 rounded-xl p-4 transition-all text-left"
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(session.id);
                }}
                className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-all"
              >
                <Star
                  className={`w-4 h-4 ${
                    favorites.has(session.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-start gap-3 mb-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${getSessionColor(session.type)} rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg`}>
                {getSessionIcon(session.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-medium truncate">{session.name}</h3>
                  {session.isActive && (
                    <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">{session.archetype}</p>
              </div>
            </div>

            {session.lastMessage && (
              <div className="space-y-1">
                <p className="text-sm text-slate-400 line-clamp-2">{session.lastMessage}</p>
                {session.lastMessageTime && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(session.lastMessageTime).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {session.unreadCount && session.unreadCount > 0 && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {session.unreadCount}
              </div>
            )}
          </button>
        ))}

        {filteredSessions.length === 0 && (
          <div className="col-span-full text-center py-12">
            <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No conversations found</p>
            <p className="text-sm text-slate-600 mt-1">
              {searchQuery ? 'Try a different search' : 'Create an AI assistant to get started'}
            </p>
          </div>
        )}
      </div>

          {showSettings && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
              <h3 className="text-white font-medium mb-4">Chat Settings</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Show typing indicators</span>
                  <input type="checkbox" className="rounded" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Sound notifications</span>
                  <input type="checkbox" className="rounded" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Auto-save conversations</span>
                  <input type="checkbox" className="rounded" defaultChecked />
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
