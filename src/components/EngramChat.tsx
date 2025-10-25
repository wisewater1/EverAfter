import React, { useState, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader, Sparkles } from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Engram {
  id: string;
  name: string;
  is_ai_active: boolean;
}

interface EngramChatProps {
  engrams: Engram[];
  userId: string;
}

export default function EngramChat({ engrams }: EngramChatProps) {
  const [selectedEngram, setSelectedEngram] = useState<Engram | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const activeEngrams = engrams.filter(e => e.is_ai_active);

  useEffect(() => {
    if (activeEngrams.length > 0 && !selectedEngram) {
      setSelectedEngram(activeEngrams[0]);
    }
  }, [activeEngrams, selectedEngram]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedEngram || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }]);

    try {
      const response = await apiClient.sendChatMessage(selectedEngram.id, userMessage);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (activeEngrams.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-12 backdrop-blur-sm text-center">
        <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-2xl font-light text-white mb-3">No Active AI Engrams</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          To chat with an engram AI, first build their personality and activate the AI when readiness reaches 80%.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50 bg-gray-900/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-white">Chat with AI</h3>
            <p className="text-sm text-gray-400">Conversing with {selectedEngram?.name || 'AI'}</p>
          </div>
        </div>

        {/* Engram Selector */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {activeEngrams.map((engram) => (
            <button
              key={engram.id}
              onClick={() => setSelectedEngram(engram)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg border-2 transition-all ${
                selectedEngram?.id === engram.id
                  ? 'bg-green-600/20 border-green-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {engram.name}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-12 h-12 text-green-400 mb-3" />
            <p className="text-gray-400">Start a conversation with {selectedEngram?.name}</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-blue-600' : 'bg-green-600'
                }`}>
                  {message.role === 'user' ? <UserIcon className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>
                <div className={`flex-1 max-w-[70%] ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block px-4 py-3 rounded-2xl ${
                    message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100 border border-gray-700'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-600">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl">
                  <Loader className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-700/50 bg-gray-900/50">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={`Ask ${selectedEngram?.name} something...`}
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || loading}
            className="px-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
