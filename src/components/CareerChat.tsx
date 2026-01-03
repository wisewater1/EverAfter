import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EdgeFunctionException } from '../lib/edge-functions';
import {
  Send,
  Bot,
  User,
  Briefcase,
  Target,
  Users,
  Mail,
  Sparkles,
  Share2,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: boolean;
  toolExecutionLog?: Array<{
    tool: string;
    args: any;
    result: any;
  }>;
}

interface CareerContext {
  activeGoals: number;
  newLeads: number;
  pendingQuestions: number;
  hasProfile: boolean;
}

interface CareerProfile {
  linkedin_summary?: string;
  current_role?: string;
  industry?: string;
  years_experience?: number;
  skills?: string[];
  public_chat_enabled?: boolean;
  public_chat_token?: string;
}

interface CareerChatProps {
  publicToken?: string; // For public/anonymous access
}

export default function CareerChat({ publicToken }: CareerChatProps) {
  const { user } = useAuth();
  const isPublicMode = !!publicToken;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [careerContext, setCareerContext] = useState<CareerContext>({
    activeGoals: 0,
    newLeads: 0,
    pendingQuestions: 0,
    hasProfile: false
  });
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [copied, setCopied] = useState(false);
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && !isPublicMode) {
      fetchCareerContext();
      fetchCareerProfile();
    }
    initializeGreeting();
  }, [user, isPublicMode]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeGreeting = () => {
    const greeting: Message = {
      id: '1',
      role: 'assistant',
      content: isPublicMode
        ? "Hello! I'm an AI assistant that can answer questions about this professional's background, skills, and experience. How can I help you today?"
        : "Hello! I'm your Career Agent, here to help you manage your professional development. I can help you track career goals, answer questions about your background, and capture leads from interested parties. How can I assist you today?",
      timestamp: new Date()
    };
    setMessages([greeting]);
  };

  const fetchCareerContext = async () => {
    try {
      const [goalsRes, leadsRes, questionsRes] = await Promise.all([
        supabase
          .from('career_goals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('career_leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new'),
        supabase
          .from('career_unknown_questions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      ]);

      setCareerContext({
        activeGoals: goalsRes.count || 0,
        newLeads: leadsRes.count || 0,
        pendingQuestions: questionsRes.count || 0,
        hasProfile: !!profile
      });
    } catch (error) {
      console.error('Error fetching career context:', error);
    }
  };

  const fetchCareerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('career_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (!error && data) {
        setProfile(data);
        setCareerContext(prev => ({ ...prev, hasProfile: true }));
      }
    } catch (error) {
      console.error('Error fetching career profile:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const chatWithCareerAgent = async (request: {
    input: string;
    conversation_history: Array<{ role: string; content: string }>;
  }) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isPublicMode && publicToken) {
      headers['X-Public-Token'] = publicToken;
    } else {
      const session = await supabase.auth.getSession();
      if (session.data.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
      }
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/career-chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new EdgeFunctionException(
        errorData.code || 'UNKNOWN_ERROR',
        errorData.message || 'Failed to get response',
        errorData.hint
      );
    }

    const data = await response.json();

    // Store visitor token for subsequent requests
    if (data.visitor_token && !visitorToken) {
      setVisitorToken(data.visitor_token);
    }

    return data;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await chatWithCareerAgent({
        input: userInput,
        conversation_history: conversationHistory
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
        toolsUsed: response.tools_used,
        toolExecutionLog: response.tool_execution_log
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Refresh context after tool execution
      if (response.tools_used && !isPublicMode) {
        fetchCareerContext();
      }
    } catch (error) {
      console.error('Chat error:', error);

      let errorMessage = 'I apologize, but I encountered an error. Please try again.';

      if (error instanceof EdgeFunctionException) {
        if (error.code === 'AUTH_MISSING' || error.code === 'AUTH_FAILED') {
          errorMessage = isPublicMode
            ? 'This career chat is not available. The link may have expired.'
            : 'Your session has expired. Please refresh the page and log in again.';
        } else if (error.code === 'INVALID_TOKEN') {
          errorMessage = 'This career chat link is no longer valid.';
        } else if (error.code === 'CONFIG_MISSING') {
          errorMessage = 'The AI service is not configured. Please contact support.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyShareLink = async () => {
    if (profile?.public_chat_token) {
      const shareUrl = `${window.location.origin}/career/public/${profile.public_chat_token}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl sm:rounded-2xl border border-gray-700/50 flex flex-col h-[500px] sm:h-[600px]">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex-shrink-0">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-white truncate">
                {isPublicMode ? 'Career Chat' : 'Career Agent'}
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm">
                {isPublicMode ? 'Ask about professional background' : 'Your personal career assistant'}
              </p>
            </div>
          </div>

          {/* Share button for authenticated users */}
          {!isPublicMode && profile?.public_chat_enabled && profile?.public_chat_token && (
            <button
              onClick={copyShareLink}
              className="flex-shrink-0 px-3 py-2 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 text-indigo-400 transition-all duration-300 flex items-center gap-2 border border-indigo-500/20 backdrop-blur-xl group"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-sm font-medium">Share</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Context Cards - Only for authenticated users */}
        {!isPublicMode && (
          <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-white/5 rounded-lg">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400 mb-1" />
              <p className="text-white text-xs sm:text-sm font-medium">{careerContext.activeGoals}</p>
              <p className="text-gray-400 text-[10px] sm:text-xs">Goals</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/5 rounded-lg">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mb-1" />
              <p className="text-white text-xs sm:text-sm font-medium">{careerContext.newLeads}</p>
              <p className="text-gray-400 text-[10px] sm:text-xs">New Leads</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/5 rounded-lg">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 mb-1" />
              <p className="text-white text-xs sm:text-sm font-medium">{careerContext.pendingQuestions}</p>
              <p className="text-gray-400 text-[10px] sm:text-xs">Questions</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex space-x-3 max-w-[85%] sm:max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-500/20' : 'bg-indigo-500/20'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-blue-300" />
                ) : (
                  <Bot className="w-4 h-4 text-indigo-300" />
                )}
              </div>
              <div className={`rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500/20 border border-blue-500/30'
                  : 'bg-indigo-500/20 border border-indigo-500/30'
              }`}>
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                {message.toolsUsed && message.toolExecutionLog && (
                  <div className="mt-2 pt-2 border-t border-indigo-500/20">
                    <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                      <Sparkles className="w-3 h-3" />
                      <span>Used {message.toolExecutionLog.length} tool{message.toolExecutionLog.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {message.toolExecutionLog.map((log, idx) => (
                        <div key={idx} className="text-xs text-gray-400">
                          {log.tool.replace(/_/g, ' ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-gray-400 text-xs mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-500/20">
                <Bot className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="rounded-2xl p-4 bg-indigo-500/20 border border-indigo-500/30">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-gray-700/50">
        <div className="flex items-end space-x-2 sm:space-x-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isPublicMode ? "Ask a question..." : "Type your message..."}
            className="flex-1 bg-gray-700/50 text-white rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-gray-400 min-h-[44px] max-h-32"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2.5 sm:p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
