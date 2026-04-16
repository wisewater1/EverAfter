import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Book, Brain, X, Sparkles } from 'lucide-react';
import { apiClient, type SaintBootstrapResult, type SaintChatResult } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';
import { getCapability, getRuntimeReadiness } from '../lib/runtime-readiness';
import FeatureBlockedState from './FeatureBlockedState';

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
    persistenceAvailable: boolean;
    historyAvailable: boolean;
    knowledgeAvailable: boolean;
}

type SaintStep = 'bootstrap' | 'history' | 'knowledge' | 'chat';

const DEFAULT_SAINT_AVAILABILITY: SaintAvailabilityState = {
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
        return 'Knowledge could not be loaded, so this Saint stays unavailable until storage recovers.';
    }

    if (step === 'history') {
        return 'History could not be loaded, so this Saint stays unavailable until storage recovers.';
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
    const persistenceAvailable = result?.persistence_available ?? true;
    return {
        persistenceAvailable,
        historyAvailable: persistenceAvailable,
        knowledgeAvailable: persistenceAvailable,
    };
}

function deriveAvailabilityFromChat(result?: SaintChatResult | null): SaintAvailabilityState {
    const persistenceAvailable = result?.persistence_available ?? true;
    return {
        persistenceAvailable,
        historyAvailable: result?.history_available ?? persistenceAvailable,
        knowledgeAvailable: result?.knowledge_available ?? persistenceAvailable,
    };
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
    const [blockedReason, setBlockedReason] = useState<string | null>(null);
    const [availability, setAvailability] = useState<SaintAvailabilityState>(DEFAULT_SAINT_AVAILABILITY);
    const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
    const [showKnowledge, setShowKnowledge] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const buildInitialAssistantMessage = (): Message => ({
        id: 'init',
        role: 'assistant',
        content: initialMessage || `Greetings. I am ${saintName}, ${saintTitle}. How may I assist you today?`,
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
            try {
                if (authLoading) {
                    return;
                }

                setBootstrapping(true);
                setError(null);
                setBlockedReason(null);
                setAvailability(DEFAULT_SAINT_AVAILABILITY);
                setMessages([buildInitialAssistantMessage()]);

                if (isDemoMode || !session?.access_token) {
                    setKnowledge([]);
                    setBlockedReason('Your Saint session is not authorized. Please sign in again.');
                    setBootstrapping(false);
                    return;
                }

                try {
                    const readiness = await getRuntimeReadiness();
                    const storageCapability = getCapability(readiness, 'saint.storage');
                    if (storageCapability?.blocking) {
                        setKnowledge([]);
                        setBlockedReason(storageCapability.reason || `Persistent saint storage is unavailable for ${saintName}.`);
                        setBootstrapping(false);
                        return;
                    }
                } catch (readinessError) {
                    console.warn('Failed to load saint storage readiness:', readinessError);
                }

                const bootstrapResult = await apiClient.bootstrapSaint(saintId);
                const bootstrapAvailability = deriveAvailabilityFromBootstrap(bootstrapResult);
                setAvailability(bootstrapAvailability);
                if (!bootstrapAvailability.persistenceAvailable) {
                    setKnowledge([]);
                    setBlockedReason(`Persistent saint storage is unavailable for ${saintName}.`);
                    return;
                }

                setMessages([buildInitialAssistantMessage()]);

                const [knowledgeResult, historyResult] = await Promise.allSettled([
                    apiClient.getSaintKnowledge(saintId),
                    apiClient.getChatHistory(saintId)
                ]);

                if (knowledgeResult.status === 'fulfilled') {
                    setKnowledge(knowledgeResult.value);
                } else {
                    console.error('Failed to load saint knowledge:', knowledgeResult.reason);
                    setKnowledge([]);
                    setBlockedReason(formatSaintError('knowledge', knowledgeResult.reason));
                    return;
                }

                if (historyResult.status === 'fulfilled' && historyResult.value.length > 0) {
                    const historyMessages: Message[] = historyResult.value.map((msg: unknown) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp || new Date().toISOString()
                    }));
                    setMessages(historyMessages);
                } else {
                    if (historyResult.status === 'rejected') {
                        console.error('Failed to load saint history:', historyResult.reason);
                        setBlockedReason(formatSaintError('history', historyResult.reason));
                    }
                }
            } catch (err) {
                console.error('Failed to initialize saint:', err);
                const nextError = formatSaintError('bootstrap', err);
                setBlockedReason(nextError);
                setError(shouldSuppressInitError(nextError) ? null : nextError);
                setKnowledge([]);
            } finally {
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
            if (isDemoMode || !session?.access_token || blockedReason) {
                setError(blockedReason || 'Your Saint session is not authorized. Please sign in again.');
                return;
            }

            const response = await apiClient.chatWithSaint(saintId, userMsg.content, false, userContext);
            const nextAvailability = deriveAvailabilityFromChat(response);
            setAvailability(nextAvailability);
            if (!nextAvailability.persistenceAvailable || !nextAvailability.historyAvailable || !nextAvailability.knowledgeAvailable) {
                const unavailableReason = 'This Saint became unavailable because backend storage or history is no longer healthy.';
                setKnowledge([]);
                setBlockedReason(unavailableReason);
                setError(unavailableReason);
                return;
            }
            // specific cast to handle extra properties
            const responseData = response as unknown;

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
                const unavailableReason = formatSaintError('knowledge', knowledgeError);
                setKnowledge([]);
                setBlockedReason(unavailableReason);
                setError(prev => prev || unavailableReason);
            }

        } catch (err) {
            console.error('Chat error:', err);
            setError(formatSaintError('chat', err));
        } finally {
            setLoading(false);
        }
    };

    const knowledgeDisabled = Boolean(blockedReason) || !availability.knowledgeAvailable && knowledge.length === 0;

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
                            title={knowledgeDisabled ? (blockedReason || 'Stored knowledge is unavailable while backend storage is unavailable.') : "View Saint's Knowledge"}
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

                        {error && (
                            <div className="mx-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                                <span>{error}</span>
                            </div>
                        )}

                        {blockedReason && !bootstrapping ? (
                            <div className="mx-4">
                                <FeatureBlockedState
                                    title={`${saintName} Is Unavailable`}
                                    reason={blockedReason}
                                    detail="This chat stays blocked until the required runtime storage and history dependencies recover."
                                />
                            </div>
                        ) : (
                            <>
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
                            placeholder={blockedReason ? `${saintName} is unavailable until runtime dependencies recover.` : `Ask ${saintName} for guidance...`}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400 text-sm"
                            disabled={loading || bootstrapping || Boolean(blockedReason)}
                            aria-disabled={loading || bootstrapping || Boolean(blockedReason)}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading || bootstrapping || Boolean(blockedReason)}
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
