import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { chatWithAgent, EdgeFunctionException } from '../lib/edge-functions';
import { Send, Bot, User, Heart, Activity, Moon, Pill, AlertCircle, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    healthData?: boolean;
    suggestions?: string[];
  };
  toolsUsed?: boolean;
  toolExecutionLog?: Array<{
    tool: string;
    args: any;
    result: any;
  }>;
}

interface HealthContext {
  recentMetrics: number;
  upcomingAppointments: number;
  activePrescriptions: number;
}

export default function RaphaelChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m St. Raphael, your AI health companion with memory and autonomous capabilities. I can remember our conversations, create health tasks in the background, and provide personalized assistance. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [healthContext, setHealthContext] = useState<HealthContext>({ recentMetrics: 0, upcomingAppointments: 0, activePrescriptions: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchHealthContext();
    }
    scrollToBottom();
  }, [user, messages]);

  const fetchHealthContext = async () => {
    try {
      const [metricsRes, appointmentsRes, prescriptionsRes] = await Promise.all([
        supabase.from('health_metrics').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('scheduled_at', new Date().toISOString()),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('is_active', true)
      ]);

      setHealthContext({
        recentMetrics: metricsRes.count || 0,
        upcomingAppointments: appointmentsRes.count || 0,
        activePrescriptions: prescriptionsRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching health context:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateRaphaelResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
      return `I can help you manage your appointments. You currently have ${healthContext.upcomingAppointments} upcoming appointment${healthContext.upcomingAppointments !== 1 ? 's' : ''}. Would you like to schedule a new appointment or view your existing ones?`;
    }

    if (lowerMessage.includes('medication') || lowerMessage.includes('prescription') || lowerMessage.includes('pill')) {
      return `You have ${healthContext.activePrescriptions} active prescription${healthContext.activePrescriptions !== 1 ? 's' : ''}. I can help you track your medications, set reminders, or check refill status. What would you like to know?`;
    }

    if (lowerMessage.includes('health data') || lowerMessage.includes('metrics') || lowerMessage.includes('stats')) {
      return `I've tracked ${healthContext.recentMetrics} health metric${healthContext.recentMetrics !== 1 ? 's' : ''} for you. Would you like me to analyze your recent activity, sleep patterns, or heart rate data?`;
    }

    if (lowerMessage.includes('sleep')) {
      return 'Good sleep is crucial for your health. Based on your data, I recommend maintaining a consistent sleep schedule. Would you like tips for better sleep quality?';
    }

    if (lowerMessage.includes('exercise') || lowerMessage.includes('activity') || lowerMessage.includes('workout')) {
      return 'Regular physical activity is essential for maintaining good health. I can help you track your activity levels and suggest appropriate exercise routines based on your goals and current fitness level.';
    }

    if (lowerMessage.includes('stress') || lowerMessage.includes('anxiety') || lowerMessage.includes('mental')) {
      return 'Mental health is just as important as physical health. I can suggest relaxation techniques, mindfulness exercises, or breathing practices. Would you like to try a guided breathing exercise?';
    }

    return 'I\'m here to help with your health and wellness journey. You can ask me about appointments, medications, health metrics, exercise, sleep, or general wellness advice. What would you like to explore?';
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
      // Build conversation history from recent messages (last 5 exchanges)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Call the new AI agent with memory and tool calling
      const response = await chatWithAgent({
        input: userInput,
        conversation_history: conversationHistory
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
        toolsUsed: response.tools_used,
        toolExecutionLog: response.tool_execution_log,
        context: {
          healthData: true,
          suggestions: ['View health dashboard', 'Schedule appointment', 'Track medication']
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);

      let errorMessage = 'I apologize, but I encountered an error. Please try again.';

      if (error instanceof EdgeFunctionException) {
        if (error.code === 'AUTH_MISSING' || error.code === 'AUTH_FAILED') {
          errorMessage = 'Your session has expired. Please refresh the page and log in again.';
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

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl sm:rounded-2xl border border-gray-700/50 flex flex-col h-[500px] sm:h-[600px]">
      <div className="p-4 sm:p-6 border-b border-gray-700/50">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex-shrink-0">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-bold text-white truncate">Raphael Health Assistant</h2>
            <p className="text-gray-400 text-xs sm:text-sm">Your personal health companion</p>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 bg-white/5 rounded-lg">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mb-1" />
            <p className="text-white text-xs sm:text-sm font-medium">{healthContext.recentMetrics}</p>
            <p className="text-gray-400 text-[10px] sm:text-xs">Metrics</p>
          </div>
          <div className="p-2 sm:p-3 bg-white/5 rounded-lg">
            <Moon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 mb-1" />
            <p className="text-white text-xs sm:text-sm font-medium">{healthContext.upcomingAppointments}</p>
            <p className="text-gray-400 text-[10px] sm:text-xs">Appointments</p>
          </div>
          <div className="p-2 sm:p-3 bg-white/5 rounded-lg">
            <Pill className="w-3 h-3 sm:w-4 sm:h-4 text-pink-400 mb-1" />
            <p className="text-white text-xs sm:text-sm font-medium">{healthContext.activePrescriptions}</p>
            <p className="text-gray-400 text-[10px] sm:text-xs">Prescriptions</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex space-x-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-500/20' : 'bg-emerald-500/20'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-blue-300" />
                ) : (
                  <Bot className="w-4 h-4 text-emerald-300" />
                )}
              </div>
              <div className={`rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500/20 border border-blue-500/30'
                  : 'bg-emerald-500/20 border border-emerald-500/30'
              }`}>
                <p className="text-white text-sm leading-relaxed">{message.content}</p>
                {message.toolsUsed && message.toolExecutionLog && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <Sparkles className="w-3 h-3" />
                      <span>Used {message.toolExecutionLog.length} tool{message.toolExecutionLog.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {message.toolExecutionLog.map((log, idx) => (
                        <div key={idx} className="text-xs text-gray-400">
                          • {log.tool.replace(/_/g, ' ')}
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
        {loading && (
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20">
                <Bot className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="rounded-2xl p-4 bg-emerald-500/20 border border-emerald-500/30">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 sm:p-6 border-t border-gray-700/50">
        <div className="flex space-x-2 sm:space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Raphael..."
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
