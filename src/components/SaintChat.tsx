import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Book, X, Sparkles } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

interface SaintChatProps {
    saintId: string;
    saintName: string;
    saintTitle: string;
    saintIcon: React.ElementType;
    primaryColor?: string;
    onClose?: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface KnowledgeItem {
    id: string;
    key: string;
    value: string;
    category: string;
    confidence: number;
}

export default function SaintChat({
    saintId,
    saintName,
    saintTitle,
    saintIcon: Icon,
    primaryColor = 'blue',
    onClose
}: SaintChatProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [bootstrapping, setBootstrapping] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
    const [showKnowledge, setShowKnowledge] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Bootstrap saint and load initial data
    useEffect(() => {
        const init = async () => {
            if (!user) return;

            try {
                setBootstrapping(true);
                setError(null);
                // 1. Bootstrap (ensure engram exists)
                await apiClient.bootstrapSaint(saintId);

                // 2. Load knowledge
                const knowledgeData = await apiClient.getSaintKnowledge(saintId);
                setKnowledge(knowledgeData);

                // 3. Add initial greeting if empty
                if (messages.length === 0) {
                    setMessages([{
                        id: 'init',
                        role: 'assistant',
                        content: `Greetings. I am ${saintName}, ${saintTitle}. How may I assist you today?`,
                        timestamp: new Date().toISOString()
                    }]);
                }
            } catch (err) {
                console.error('Failed to initialize saint:', err);
                setError('Failed to connect to Saint AI. Please try again.');
            } finally {
                setBootstrapping(false);
            }
        };

        init();
    }, [saintId, user]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.chatWithSaint(saintId, userMsg.content);
            // specific cast to handle extra properties
            const responseData = response as any;

            const aiMsg: Message = {
                id: responseData.id || Date.now().toString(),
                role: 'assistant',
                content: responseData.message || responseData.content,
                timestamp: responseData.timestamp || new Date().toISOString()
            };

            setMessages(prev => [...prev, aiMsg]);

            // Refresh knowledge in background as it might have updated
            const freshKnowledge = await apiClient.getSaintKnowledge(saintId);
            setKnowledge(freshKnowledge);

        } catch (err) {
            console.error('Chat error:', err);
            setError('Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Header */}
                <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white shadow-sm ring-1 ring-slate-200 text-${primaryColor}-600`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">{saintName}</h3>
                            <p className="text-xs text-slate-500">{saintTitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowKnowledge(!showKnowledge)}
                            className={`p-2 hover:bg-slate-100 rounded-lg transition-colors relative ${showKnowledge ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                            title="View Saint's Knowledge"
                        >
                            <Book className="w-5 h-5" />
                            {knowledge.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white" />
                            )}
                        </button>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Chat Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                    {bootstrapping ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${primaryColor}-500`}></div>
                            <p className="text-sm font-medium animate-pulse">Establishing spiritual connection...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 mx-4 border border-red-100">
                                    {/* AlertCircle was unused so removed, just use text for now or re-add if needed */}
                                    <span>{error}</span>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                                                ? `bg-${primaryColor}-600 text-white`
                                                : 'bg-white border border-slate-100 text-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5 opacity-80 border-b border-white/10 pb-1">
                                            {msg.role === 'user' ? (
                                                <User className="w-3 h-3" />
                                            ) : (
                                                <Icon className="w-3 h-3" />
                                            )}
                                            <span className="text-xs font-semibold uppercase tracking-wider">
                                                {msg.role === 'user' ? 'You' : saintName}
                                            </span>
                                        </div>
                                        <div className="whitespace-pre-wrap leading-relaxed text-sm">
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                                        <Icon className={`w-4 h-4 text-${primaryColor}-500 animate-bounce`} />
                                        <span className="text-sm text-slate-500">Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all shadow-sm">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={`Ask ${saintName} for guidance...`}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400 text-sm"
                            disabled={loading || bootstrapping}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading || bootstrapping}
                            className={`p-2 rounded-lg bg-${primaryColor}-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-${primaryColor}-700 transition-colors shadow-sm`}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Knowledge Side Panel */}
            {showKnowledge && (
                <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full shadow-xl z-10 transition-all duration-300 transform">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div className="flex items-center gap-2 text-slate-700">
                            <Brain className={`w-4 h-4 text-${primaryColor}-600`} />
                            <h4 className="font-semibold text-sm">Knowledge Base</h4>
                        </div>
                        <button
                            onClick={() => setShowKnowledge(false)}
                            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        <div className={`p-3 rounded-lg border border-${primaryColor}-100 bg-${primaryColor}-50/50 text-xs text-${primaryColor}-700`}>
                            <p className="flex items-start gap-2">
                                <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>I learn and remember important details from our conversations to serve you better.</span>
                            </p>
                        </div>

                        {knowledge.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 italic text-sm">
                                <Book className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                No knowledge stored yet. <br />Chat with me to help me learn!
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {['family', 'security', 'health', 'charity', 'resilience', 'general'].map(category => {
                                    const items = knowledge.filter(k => k.category === category);
                                    if (items.length === 0) return null;

                                    return (
                                        <div key={category}>
                                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                                {category}
                                            </h5>
                                            <div className="space-y-2">
                                                {items.map(item => (
                                                    <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm hover:shadow-md transition-shadow">
                                                        <span className="block font-medium text-slate-700 mb-1 text-xs">{item.key}</span>
                                                        <span className="block text-slate-600 leading-snug">{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper icon component since Brain was missing from imports in main body
function Brain({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
        </svg>
    );
}
