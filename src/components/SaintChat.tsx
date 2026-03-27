import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Book, Brain, X, Sparkles } from 'lucide-react';
import { apiClient, type SaintBootstrapResult, type SaintChatResult } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

interface SaintChatProps {
    saintId: string;
    saintName: string;
    saintTitle: string;
    saintIcon: React.ElementType;
    primaryColor?: string;
    initialMessage?: string;
    userContext?: string;
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

interface SaintAvailabilityState {
    mode: 'full' | 'degraded';
    persistenceAvailable: boolean;
    historyAvailable: boolean;
    knowledgeAvailable: boolean;
}

type SaintStep = 'bootstrap' | 'history' | 'knowledge' | 'chat';

const DEFAULT_SAINT_AVAILABILITY: SaintAvailabilityState = {
    mode: 'full',
    persistenceAvailable: true,
    historyAvailable: true,
    knowledgeAvailable: true,
};

function formatSaintError(step: SaintStep, error: unknown): string {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('401') || message.includes('403') || message.includes('unauthorized') || message.includes('forbidden')) {
        return 'Your Saint session is not authorized. Please sign in again.';
    }

    if (message.includes('not found') || message.includes('404')) {
        return step === 'bootstrap'
            ? 'This Saint is not available yet.'
            : 'Saint data could not be found right now.';
    }

    if (message.includes('persistent saint storage is unavailable')) {
        return 'This Saint depends on backend storage, and storage is temporarily unavailable.';
    }

    if (message.includes('500') || message.includes('temporarily unavailable')) {
        return step === 'chat'
            ? 'Saint AI is temporarily unavailable. Please try again.'
            : 'Saint services are temporarily unavailable. Please try again.';
    }

    if (step === 'knowledge') {
        return 'Knowledge could not be loaded. Chat is still available.';
    }

    if (step === 'history') {
        return 'History could not be loaded. You can still start a new conversation.';
    }

    if (step === 'chat') {
        return 'Failed to send message. Please try again.';
    }

    return 'Failed to initialize Saint AI. Please try again.';
}

function shouldSuppressInitError(errorMessage: string): boolean {
    const normalized = errorMessage.toLowerCase();
    return (
        normalized.includes('failed to initialize saint ai') ||
        normalized.includes('saint services are temporarily unavailable') ||
        normalized.includes('network is unreachable') ||
        normalized.includes('unable to bootstrap saint') ||
        normalized.includes('failed to bootstrap saint')
    );
}

function deriveAvailabilityFromBootstrap(result?: SaintBootstrapResult | null): SaintAvailabilityState {
    const degraded = Boolean(result?.degraded || result?.mode === 'degraded');
    const persistenceAvailable = result?.persistence_available ?? !degraded;
    return {
        mode: degraded ? 'degraded' : 'full',
        persistenceAvailable,
        historyAvailable: persistenceAvailable,
        knowledgeAvailable: persistenceAvailable,
    };
}

function deriveAvailabilityFromChat(result?: SaintChatResult | null): SaintAvailabilityState {
    const degraded = Boolean(result?.degraded || result?.mode === 'degraded');
    const persistenceAvailable = result?.persistence_available ?? !degraded;
    return {
        mode: degraded ? 'degraded' : 'full',
        persistenceAvailable,
        historyAvailable: result?.history_available ?? persistenceAvailable,
        knowledgeAvailable: result?.knowledge_available ?? persistenceAvailable,
    };
}

function buildDegradedNote(availability: SaintAvailabilityState): string {
    const limits: string[] = [];
    if (!availability.persistenceAvailable) limits.push('new memories are not being saved');
    if (!availability.historyAvailable) limits.push('chat history is unavailable');
    if (!availability.knowledgeAvailable) limits.push('stored knowledge is unavailable');
    limits.push('live domain context may be limited');

    return `Running in degraded mode. ${limits.join(', ')} until backend storage recovers.`;
}

function buildLocalDegradedReply(saintName: string, saintTitle: string, message: string): string {
    const trimmed = message.trim();
    if (!trimmed) {
        return `${saintName} is available in local degraded mode, but live backend context is unavailable right now.`;
    }

    return `${saintName}, ${saintTitle}, is responding in local degraded mode. I can acknowledge your request, but live backend context, saved memory, and domain-specific records are unavailable right now. Your message was: "${trimmed.slice(0, 180)}"`;
}

export default function SaintChat({
    saintId,
    saintName,
    saintTitle,
    saintIcon: Icon,
    primaryColor = 'blue',
    initialMessage,
    userContext,
    onClose
}: SaintChatProps) {
    const { loading: authLoading, session, isDemoMode } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [bootstrapping, setBootstrapping] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [degradedMode, setDegradedMode] = useState(false);
    const [availability, setAvailability] = useState<SaintAvailabilityState>(DEFAULT_SAINT_AVAILABILITY);
    const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
    const [showKnowledge, setShowKnowledge] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const buildInitialAssistantMessage = (degraded: boolean): Message => ({
        id: degraded ? 'init-degraded' : 'init',
        role: 'assistant',
        content: degraded
            ? `${initialMessage || `Greetings. I am ${saintName}, ${saintTitle}.`} Live backend context is temporarily unavailable, so I am running in degraded mode. I will stay visible instead of failing closed, but live knowledge, history, and response quality may be limited until the backend recovers.`
            : initialMessage || `Greetings. I am ${saintName}, ${saintTitle}. How may I assist you today?`,
        timestamp: new Date().toISOString()
    });

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!availability.knowledgeAvailable && knowledge.length === 0) {
            setShowKnowledge(false);
        }
    }, [availability.knowledgeAvailable, knowledge.length]);

    useEffect(() => {
        const init = async () => {
            let fallbackTimer: number | null = null;
            try {
                if (authLoading) {
                    return;
                }

                setBootstrapping(true);
                setError(null);
                setDegradedMode(false);
                setAvailability(DEFAULT_SAINT_AVAILABILITY);
                setMessages([buildInitialAssistantMessage(false)]);

                if (isDemoMode || !session?.access_token) {
                    setDegradedMode(true);
                    setAvailability({
                        mode: 'degraded',
                        persistenceAvailable: false,
                        historyAvailable: false,
                        knowledgeAvailable: false,
                    });
                    setKnowledge([]);
                    setMessages([buildInitialAssistantMessage(true)]);
                    setBootstrapping(false);
                    return;
                }

                fallbackTimer = window.setTimeout(() => {
                    setDegradedMode(true);
                    setAvailability({
                        mode: 'degraded',
                        persistenceAvailable: false,
                        historyAvailable: false,
                        knowledgeAvailable: false,
                    });
                    setError((prev) => prev || `Live Saint services are taking longer than expected. ${saintName} is staying visible in degraded mode until the backend reconnects.`);
                    setMessages((prev) => (prev.length > 0 ? prev : [buildInitialAssistantMessage(true)]));
                    setBootstrapping(false);
                }, 2500);

                const bootstrapResult = await apiClient.bootstrapSaint(saintId);
                const bootstrapAvailability = deriveAvailabilityFromBootstrap(bootstrapResult);
                setAvailability(bootstrapAvailability);
                setDegradedMode(bootstrapAvailability.mode === 'degraded');
                setMessages([buildInitialAssistantMessage(bootstrapAvailability.mode === 'degraded')]);

                const [knowledgeResult, historyResult] = await Promise.allSettled([
                    apiClient.getSaintKnowledge(saintId),
                    apiClient.getChatHistory(saintId)
                ]);

                if (knowledgeResult.status === 'fulfilled') {
                    setKnowledge(knowledgeResult.value);
                } else {
                    console.error('Failed to load saint knowledge:', knowledgeResult.reason);
                    setKnowledge([]);
                    setAvailability((prev) => ({ ...prev, knowledgeAvailable: false, mode: 'degraded' }));
                    setDegradedMode(true);
                    setError((prev) => prev || formatSaintError('knowledge', knowledgeResult.reason));
                }

                if (historyResult.status === 'fulfilled' && historyResult.value.length > 0) {
                    const historyMessages: Message[] = historyResult.value.map((msg: any) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp || new Date().toISOString()
                    }));
                    setMessages(historyMessages);
                } else {
                    if (historyResult.status === 'rejected') {
                        console.error('Failed to load saint history:', historyResult.reason);
                        setAvailability((prev) => ({ ...prev, historyAvailable: false, mode: 'degraded' }));
                        setDegradedMode(true);
                        setError(prev => prev || formatSaintError('history', historyResult.reason));
                    }
                }
            } catch (err) {
                console.error('Failed to initialize saint:', err);
                setDegradedMode(true);
                setAvailability({
                    mode: 'degraded',
                    persistenceAvailable: false,
                    historyAvailable: false,
                    knowledgeAvailable: false,
                });
                const nextError = formatSaintError('bootstrap', err);
                setError(shouldSuppressInitError(nextError) ? null : nextError);
                setKnowledge([]);
                setMessages([buildInitialAssistantMessage(true)]);
            } finally {
                if (fallbackTimer) {
                    window.clearTimeout(fallbackTimer);
                }
                setBootstrapping(false);
            }
        };

        init();
    }, [authLoading, initialMessage, isDemoMode, saintId, saintName, saintTitle, session?.access_token]);

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
            if (isDemoMode || !session?.access_token) {
                const nextAvailability = {
                    mode: 'degraded' as const,
                    persistenceAvailable: false,
                    historyAvailable: false,
                    knowledgeAvailable: false,
                };
                setAvailability(nextAvailability);
                setDegradedMode(true);
                setKnowledge([]);
                const aiMsg: Message = {
                    id: `${Date.now()}-local`,
                    role: 'assistant',
                    content: buildLocalDegradedReply(saintName, saintTitle, userMsg.content),
                    timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, aiMsg]);
                return;
            }

            const response = await apiClient.chatWithSaint(saintId, userMsg.content, false, userContext);
            const nextAvailability = deriveAvailabilityFromChat(response);
            setAvailability(nextAvailability);
            setDegradedMode(nextAvailability.mode === 'degraded');
            // specific cast to handle extra properties
            const responseData = response as any;

            const aiMsg: Message = {
                id: responseData.id || Date.now().toString(),
                role: 'assistant',
                content: responseData.message || responseData.content,
                timestamp: responseData.timestamp || new Date().toISOString()
            };

            setMessages(prev => [...prev, aiMsg]);

            try {
                if (nextAvailability.knowledgeAvailable) {
                    const freshKnowledge = await apiClient.getSaintKnowledge(saintId);
                    setKnowledge(freshKnowledge);
                } else {
                    setKnowledge([]);
                }
            } catch (knowledgeError) {
                console.error('Failed to refresh saint knowledge:', knowledgeError);
                setAvailability((prev) => ({ ...prev, knowledgeAvailable: false, mode: 'degraded' }));
                setDegradedMode(true);
                setError(prev => prev || formatSaintError('knowledge', knowledgeError));
            }

        } catch (err) {
            console.error('Chat error:', err);
            setError(formatSaintError('chat', err));
        } finally {
            setLoading(false);
        }
    };

    const knowledgeDisabled = !availability.knowledgeAvailable && knowledge.length === 0;
    const degradedNote = degradedMode ? buildDegradedNote(availability) : null;

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
                            type="button"
                            onClick={() => setShowKnowledge(!showKnowledge)}
                            className={`p-2 rounded-lg transition-colors relative ${knowledgeDisabled ? 'cursor-not-allowed text-slate-300' : showKnowledge ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-600 hover:bg-slate-100'}`}
                            title={knowledgeDisabled ? 'Stored knowledge is unavailable while backend storage is degraded.' : "View Saint's Knowledge"}
                            disabled={knowledgeDisabled}
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
                    <>
                        {bootstrapping && (
                            <div className="mx-4 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                                <div className={`animate-spin rounded-full h-4 w-4 border-b-2 border-${primaryColor}-500`}></div>
                                <span>Establishing spiritual connection...</span>
                            </div>
                        )}

                        {degradedNote && (
                            <div className="mx-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                <Sparkles className="h-4 w-4 shrink-0" />
                                <span>{degradedNote}</span>
                            </div>
                        )}

                        {error && (
                            <div className={`mx-4 flex items-center gap-2 rounded-lg border p-4 text-sm ${degradedMode ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-100 bg-red-50 text-red-600'}`}>
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
                            aria-disabled={loading || bootstrapping}
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
