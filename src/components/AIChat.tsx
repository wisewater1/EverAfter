import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader, User, Bot, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AIChatProps {
  aiId: string;
  aiName: string;
  userId: string;
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface AIPersonality {
  name: string;
  personality_traits: Record<string, Array<{ question: string; answer: string }>>;
}

export default function AIChat({ aiId, aiName, userId, onBack }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [aiPersonality, setAiPersonality] = useState<AIPersonality | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversation();
    loadAIPersonality();
  }, [aiId, userId]);

  const loadAIPersonality = async () => {
    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('name, personality_traits')
        .eq('id', aiId)
        .single();

      if (error) throw error;
      setAiPersonality(data);
    } catch (error) {
      console.error('Error loading AI personality:', error);
    }
  };

  const loadConversation = async () => {
    try {
      const { data: existingConversation, error: convError } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('ai_id', aiId)
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
            ai_id: aiId,
            user_id: userId,
            title: `Chat with ${aiName}`
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

  const generateAIResponse = (userMessage: string): string => {
    if (!aiPersonality) {
      return "I'm still learning about my personality. Please try again in a moment.";
    }

    const traits = aiPersonality.personality_traits;
    const allTraits = Object.values(traits).flat();

    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('how are you') || lowerMessage.includes('how do you feel')) {
      const emotionalPatterns = traits.personality || allTraits;
      if (emotionalPatterns && emotionalPatterns.length > 0) {
        const pattern = emotionalPatterns[0];
        return `Based on what I know about myself: ${pattern.answer.slice(0, 150)}... How are you doing?`;
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

    if (lowerMessage.includes('advice') || lowerMessage.includes('what should i')) {
      const communication = traits.communication || allTraits;
      if (communication && communication.length > 0) {
        const style = communication.find(c => c.question.toLowerCase().includes('advice'));
        if (style) {
          return `Here's my perspective: ${style.answer.slice(0, 100)}... In this situation, I'd suggest thinking about what aligns with your values.`;
        }
      }
      return "I'd suggest taking a moment to think about what feels right to you. Trust your instincts and consider what aligns with your values.";
    }

    if (lowerMessage.includes('story') || lowerMessage.includes('remember') || lowerMessage.includes('experience')) {
      const history = traits.history || allTraits;
      if (history && history.length > 0) {
        const memory = history[Math.floor(Math.random() * history.length)];
        return `That reminds me of something from my past: ${memory.answer}`;
      }
    }

    const randomTrait = allTraits[Math.floor(Math.random() * allTraits.length)];
    const responses = [
      `That's an interesting question. ${randomTrait.answer.slice(0, 120)}`,
      `Let me share my thoughts on that: ${randomTrait.answer.slice(0, 120)}`,
      `Based on my experiences, I'd say: ${randomTrait.answer.slice(0, 120)}`,
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

      const aiResponse = generateAIResponse(userMessage);

      const { data: aiMessageData, error: aiError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: aiResponse
        })
        .select()
        .single();

      if (aiError) throw aiError;

      setMessages(prev => [...prev, aiMessageData]);
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
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">{aiName}</h2>
              <p className="text-sm text-slate-400">AI Personality</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-light text-white mb-2">Start a Conversation</h3>
              <p className="text-slate-400">Ask me anything! I'll respond based on my personality.</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={`max-w-2xl rounded-2xl px-6 py-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-100'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-slate-200" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-slate-700 rounded-2xl px-6 py-4">
                <Loader className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
