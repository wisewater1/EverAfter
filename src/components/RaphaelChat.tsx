import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Bot, User, Heart, Activity, Moon, Pill } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    healthData?: boolean;
    suggestions?: string[];
  };
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
      content: 'Hello! I\'m Raphael, your health companion. I can help you manage appointments, track medications, understand your health data, and provide wellness guidance. How can I assist you today?',
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
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateRaphaelResponse(input.trim()),
        timestamp: new Date(),
        context: {
          healthData: true,
          suggestions: ['View health dashboard', 'Schedule appointment', 'Track medication']
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      setLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 flex flex-col h-[600px]">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Raphael Health Assistant</h2>
            <p className="text-purple-300 text-sm">Your personal health companion</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="p-3 bg-white/5 rounded-lg">
            <Activity className="w-4 h-4 text-green-400 mb-1" />
            <p className="text-white text-sm font-medium">{healthContext.recentMetrics}</p>
            <p className="text-purple-300 text-xs">Metrics</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <Moon className="w-4 h-4 text-blue-400 mb-1" />
            <p className="text-white text-sm font-medium">{healthContext.upcomingAppointments}</p>
            <p className="text-purple-300 text-xs">Appointments</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <Pill className="w-4 h-4 text-pink-400 mb-1" />
            <p className="text-white text-sm font-medium">{healthContext.activePrescriptions}</p>
            <p className="text-purple-300 text-xs">Prescriptions</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex space-x-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-500/20' : 'bg-purple-500/20'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-blue-300" />
                ) : (
                  <Bot className="w-4 h-4 text-purple-300" />
                )}
              </div>
              <div className={`rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500/20 border border-blue-500/30'
                  : 'bg-purple-500/20 border border-purple-500/30'
              }`}>
                <p className="text-white text-sm leading-relaxed">{message.content}</p>
                <p className="text-purple-300 text-xs mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/20">
                <Bot className="w-4 h-4 text-purple-300" />
              </div>
              <div className="rounded-2xl p-4 bg-purple-500/20 border border-purple-500/30">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-white/10">
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Raphael about your health..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-500/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
