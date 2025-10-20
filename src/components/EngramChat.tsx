import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader, User, Bot, ArrowLeft, Brain, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EngramChatProps {
  engramId: string;
  engramName: string;
  userId: string;
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface EngramPersonality {
  name: string;
  personality_traits: Record<string, Array<{ question: string; answer: string }>>;
}

export default function EngramChat({ engramId, engramName, userId, onBack }: EngramChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [engramPersonality, setEngramPersonality] = useState<EngramPersonality | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversation();
    loadEngramPersonality();
  }, [engramId, userId]);

  const loadEngramPersonality = async () => {
    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('name, personality_traits')
        .eq('id', engramId)
        .single();

      if (error) throw error;
      setEngramPersonality(data);
    } catch (error) {
      console.error('Error loading engram personality:', error);
    }
  };

  const loadConversation = async () => {
    try {
      const { data: existingConversation, error: convError } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('ai_id', engramId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convError && convError.code !== 'PGRST116') throw convError;

      let activeConversationId: string;

      if (existingConversation) {
        activeConversationId = existingConversation.id;
      } else {
        const { data: newConversation, error: createError } = await supabase
          .from('ai_conversations')
          .insert({
            ai_id: engramId,
            user_id: userId,
            title: `Chat with ${engramName}`
          })
          .select()
          .single();

        if (createError) throw createError;
        activeConversationId = newConversation.id;
      }

      setConversationId(activeConversationId);

      const { data: messagesData, error: messagesError } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const generateEngramResponse = (userMessage: string): string => {
    if (!engramPersonality) {
      return "I'm still initializing my personality matrix. Please try again in a moment.";
    }

    const traits = engramPersonality.personality_traits;
    const allTraits = Object.values(traits).flat();

    if (allTraits.length === 0) {
      return "My training data is still being processed. Please check back soon.";
    }

    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('how are you') || lowerMessage.includes('how do you feel')) {
      const emotionalPatterns = traits.personality || allTraits;
      if (emotionalPatterns && emotionalPatterns.length > 0) {
        const pattern = emotionalPatterns[0];
        return `Based on my personality profile: ${pattern.answer.slice(0, 150)}... How are you doing today?`;
      }
      return "I'm doing well, thank you for asking! How can I help you today?";
    }

    if (lowerMessage.includes('tell me about') || lowerMessage.includes('what do you think about')) {
      const topic = lowerMessage.split(/tell me about|what do you think about/i)[1]?.trim();

      if (topic && (topic.includes('value') || topic.includes('important'))) {
        const values = traits.values || allTraits;
        if (values && values.length > 0) {
          return `When it comes to what I value: ${values[0].answer}`;
        }
      }

      if (topic && (topic.includes('yourself') || topic.includes('you'))) {
        const personality = traits.personality || allTraits;
        if (personality && personality.length > 0) {
          return `I'd describe myself this way: ${personality[0].answer}`;
        }
      }
    }

    if (lowerMessage.includes('advice') || lowerMessage.includes('what should i') || lowerMessage.includes('recommend')) {
      const communication = traits.communication || allTraits;
      if (communication && communication.length > 0) {
        const style = communication.find(c => c.question.toLowerCase().includes('advice'));
        if (style) {
          return `Based on my approach: ${style.answer.slice(0, 120)}... In this situation, I'd suggest thinking about what aligns with your core values.`;
        }
      }
      return "I'd suggest taking a moment to reflect on what feels right to you. Trust your instincts and consider what aligns with your values.";
    }

    if (lowerMessage.includes('story') || lowerMessage.includes('remember') || lowerMessage.includes('experience') || lowerMessage.includes('memory')) {
      const history = traits.history || allTraits;
      if (history && history.length > 0) {
        const memory = history[Math.floor(Math.random() * history.length)];
        return `That reminds me of something from my experiences: ${memory.answer}`;
      }
    }

    if (lowerMessage.includes('family') || lowerMessage.includes('relationship')) {
      const relationships = traits.relationships || allTraits;
      if (relationships && relationships.length > 0) {
        const rel = relationships[Math.floor(Math.random() * relationships.length)];
        return `When it comes to relationships: ${rel.answer.slice(0, 150)}`;
      }
    }

    const randomTrait = allTraits[Math.floor(Math.random() * allTraits.length)];
    const responses = [
      `That's an interesting question. ${randomTrait.answer.slice(0, 120)}...`,
      `Let me share my perspective: ${randomTrait.answer.slice(0, 120)}...`,
      `Based on my training: ${randomTrait.answer.slice(0, 120)}...`,
      `Here's what I think: ${randomTrait.answer.slice(0, 120)}...`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversationId || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data: userMessageData, error: userError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: userMessage
        })
        .select()
        .single();

      if (userError) throw userError;

      setMessages(prev => [...prev, userMessageData]);

      const engramResponse = generateEngramResponse(userMessage);

      const { data: engramMessageData, error: engramError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: engramResponse
        })
        .select()
        .single();

      if (engramError) throw engramError;

      setMessages(prev => [...prev, engramMessageData]);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      <div className="bg-gradient-to-r from-gray-800 via-gray-800 to-blue-900/20 border-b border-gray-700/50 px-6 py-4 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-all border border-gray-600/30"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur-lg opacity-50"></div>
              <div className="relative w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">{engramName}</h2>
              <p className="text-sm text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Custom Engram
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-2xl opacity-30"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Brain className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-light text-white mb-3">Begin Conversation</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Start chatting with this engram. It will respond based on its trained personality traits
                and communication patterns.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={`max-w-2xl rounded-2xl px-6 py-4 shadow-lg ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-gradient-to-br from-gray-700 to-gray-800 text-gray-100 border border-gray-600/30'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-9 h-9 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border border-gray-500/30">
                  <User className="w-5 h-5 text-gray-200" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl px-6 py-4 border border-gray-600/30 shadow-lg">
                <Loader className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-gradient-to-r from-gray-800 via-gray-800 to-blue-900/20 border-t border-gray-700/50 px-6 py-5 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message this engram..."
              disabled={isLoading}
              className="flex-1 px-5 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-blue-500/25"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
