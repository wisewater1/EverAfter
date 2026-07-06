import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Book, Brain, X, Sparkles } from 'lucide-react';
import { apiClient, type SaintBootstrapResult, type SaintChatResult } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';
import { getCapability, getRuntimeReadiness } from '../lib/runtime-readiness';
import { getDemoChatResponse } from '../lib/demo/demo-data-provider';
import {
    isWebGPUAvailable,
    ensureEngine,
    generateOnDevice,
    ON_DEVICE_MODEL_LABEL,
    ON_DEVICE_DOWNLOAD_NOTE,
} from '../lib/llm/onDeviceLLM';
import FeatureBlockedState from './FeatureBlockedState';

interface SaintChatProps {
    saintId: string;
    saintName: string;
    saintTitle: string;
    saintIcon: React.ElementType;
    primaryColor?: string;
    initialMessage?: string;
    userContext?: string;
    /** Persona system prompt (e.g. a family member's analyzed personality): conditions server + on-device replies. */
    systemPrompt?: string;
    /** Keyless persona-flavoured demo reply generator (used in demo mode instead of the generic canned line). */
    demoReply?: (userInput: string) => string;
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

interface SaintColorClasses {
    /** Header and knowledge panel icon tint (text-X-600). */
    icon: string;
    /** Thinking indicator icon tint (text-X-500). */
    iconSoft: string;
    /** Bootstrap spinner border tint (border-X-500). */
    spinner: string;
    /** User message bubble background (bg-X-600). */
    userBubble: string;
    /** Send button background plus hover state. */
    sendButton: string;
    /** Knowledge panel intro card border, background, and text. */
    knowledgePanel: string;
}

// Tailwind JIT only compiles class names that appear as complete literals in
// the source, so interpolated names like `bg-${color}-600` never generate CSS
// and render unstyled. Every class string below must stay a full literal.
const SAINT_COLOR_CLASSES: Record<string, SaintColorClasses> = {
    blue: {
        icon: 'text-blue-600',
        iconSoft: 'text-blue-500',
        spinner: 'border-blue-500',
        userBubble: 'bg-blue-600',
        sendButton: 'bg-blue-600 hover:bg-blue-700',
        knowledgePanel: 'border-blue-100 bg-blue-50/50 text-blue-700',
    },
    sky: {
        icon: 'text-sky-600',
        iconSoft: 'text-sky-500',
        spinner: 'border-sky-500',
        userBubble: 'bg-sky-600',
        sendButton: 'bg-sky-600 hover:bg-sky-700',
        knowledgePanel: 'border-sky-100 bg-sky-50/50 text-sky-700',
    },
    amber: {
        icon: 'text-amber-600',
        iconSoft: 'text-amber-500',
        spinner: 'border-amber-500',
        userBubble: 'bg-amber-600',
        sendButton: 'bg-amber-600 hover:bg-amber-700',
        knowledgePanel: 'border-amber-100 bg-amber-50/50 text-amber-700',
    },
    emerald: {
        icon: 'text-emerald-600',
        iconSoft: 'text-emerald-500',
        spinner: 'border-emerald-500',
        userBubble: 'bg-emerald-600',
        sendButton: 'bg-emerald-600 hover:bg-emerald-700',
        knowledgePanel: 'border-emerald-100 bg-emerald-50/50 text-emerald-700',
    },
    teal: {
        icon: 'text-teal-600',
        iconSoft: 'text-teal-500',
        spinner: 'border-teal-500',
        userBubble: 'bg-teal-600',
        sendButton: 'bg-teal-600 hover:bg-teal-700',
        knowledgePanel: 'border-teal-100 bg-teal-50/50 text-teal-700',
    },
    cyan: {
        icon: 'text-cyan-600',
        iconSoft: 'text-cyan-500',
        spinner: 'border-cyan-500',
        userBubble: 'bg-cyan-600',
        sendButton: 'bg-cyan-600 hover:bg-cyan-700',
        knowledgePanel: 'border-cyan-100 bg-cyan-50/50 text-cyan-700',
    },
    purple: {
        icon: 'text-purple-600',
        iconSoft: 'text-purple-500',
        spinner: 'border-purple-500',
        userBubble: 'bg-purple-600',
        sendButton: 'bg-purple-600 hover:bg-purple-700',
        knowledgePanel: 'border-purple-100 bg-purple-50/50 text-purple-700',
    },
    violet: {
        icon: 'text-violet-600',
        iconSoft: 'text-violet-500',
        spinner: 'border-violet-500',
        userBubble: 'bg-violet-600',
        sendButton: 'bg-violet-600 hover:bg-violet-700',
        knowledgePanel: 'border-violet-100 bg-violet-50/50 text-violet-700',
    },
    rose: {
        icon: 'text-rose-600',
        iconSoft: 'text-rose-500',
        spinner: 'border-rose-500',
        userBubble: 'bg-rose-600',
        sendButton: 'bg-rose-600 hover:bg-rose-700',
        knowledgePanel: 'border-rose-100 bg-rose-50/50 text-rose-700',
    },
    red: {
        icon: 'text-red-600',
        iconSoft: 'text-red-500',
        spinner: 'border-red-500',
        userBubble: 'bg-red-600',
        sendButton: 'bg-red-600 hover:bg-red-700',
        knowledgePanel: 'border-red-100 bg-red-50/50 text-red-700',
    },
};

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
    systemPrompt,
    demoReply,
    onClose
}: SaintChatProps) {
    const { loading: authLoading, session, isDemoMode } = useAuth();
    const colors = SAINT_COLOR_CLASSES[primaryColor] ?? SAINT_COLOR_CLASSES.blue;
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [bootstrapping, setBootstrapping] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [blockedReason, setBlockedReason] = useState<string | null>(null);
    const [availability, setAvailability] = useState<SaintAvailabilityState>(DEFAULT_SAINT_AVAILABILITY);
    const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
    const [showKnowledge, setShowKnowledge] = useState(false);
    // On-device AI (runs the model in the user's browser via WebGPU).
    const [onDeviceMode, setOnDeviceMode] = useState(false);
    const [onDeviceStatus, setOnDeviceStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [onDeviceProgress, setOnDeviceProgress] = useState(0);
    const [onDeviceError, setOnDeviceError] = useState<string | null>(null);
    const webgpuAvailable = isWebGPUAvailable();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const enableOnDevice = async () => {
        setOnDeviceStatus('loading');
        setOnDeviceError(null);
        setOnDeviceProgress(0);
        try {
            await ensureEngine((p) => setOnDeviceProgress(p.progress));
            setOnDeviceMode(true);
            setOnDeviceStatus('ready');
            setBlockedReason(null);
            setError(null);
        } catch (e) {
            setOnDeviceStatus('error');
            setOnDeviceError(e instanceof Error ? e.message : 'Could not start on-device AI.');
        }
    };

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

                if (isDemoMode) {
                    // Demo mode: self-contained canned conversation, no backend
                    // or session required: leave the chat usable (no blocker).
                    setKnowledge([]);
                    setBootstrapping(false);
                    return;
                }
                if (!session?.access_token) {
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

        // Fail-safe: when the server AI is unavailable / blocked / errors, generate
        // the reply ON-DEVICE (keyless, in the browser). Returns true if it did.
        // Once it succeeds we stay in on-device mode for the rest of the session.
        const tryOnDeviceFallback = async (): Promise<boolean> => {
            if (!isWebGPUAvailable()) return false;
            try {
                setOnDeviceStatus('loading');
                const history = [...messages, userMsg]
                    .filter((m) => m.id !== 'init' && (m.role === 'user' || m.role === 'assistant'))
                    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
                const reply = await generateOnDevice(saintId, history, (p) => setOnDeviceProgress(p.progress), systemPrompt);
                if (!reply || !reply.trim()) { setOnDeviceStatus('error'); return false; }
                setOnDeviceMode(true);
                setOnDeviceStatus('ready');
                setBlockedReason(null);
                setError(null);
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: reply,
                    timestamp: new Date().toISOString(),
                }]);
                return true;
            } catch (e) {
                console.warn('On-device AI fallback failed:', e);
                setOnDeviceStatus('error');
                return false;
            }
        };

        try {
            if (onDeviceMode) {
                // Generate the reply entirely in the user's browser: no server,
                // no key, fully private. Takes precedence over demo/backend.
                const history = [...messages, userMsg]
                    .filter((m) => m.id !== 'init' && (m.role === 'user' || m.role === 'assistant'))
                    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
                const reply = await generateOnDevice(saintId, history, (p) => setOnDeviceProgress(p.progress), systemPrompt);
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: reply || '…',
                    timestamp: new Date().toISOString(),
                }]);
                return;
            }
            if (isDemoMode) {
                // Demo mode: realistic canned reply, no backend call.
                await new Promise(r => setTimeout(r, 500));
                const demoMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: demoReply ? demoReply(userMsg.content) : getDemoChatResponse(saintId, userMsg.content),
                    timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, demoMsg]);
                return;
            }
            if (!session?.access_token || blockedReason) {
                if (await tryOnDeviceFallback()) return;
                setError(blockedReason || 'Your Saint session is not authorized. Please sign in again.');
                return;
            }

            const response = await apiClient.chatWithSaint(saintId, userMsg.content, false, userContext);
            const nextAvailability = deriveAvailabilityFromChat(response);
            setAvailability(nextAvailability);
            if (!nextAvailability.persistenceAvailable || !nextAvailability.historyAvailable || !nextAvailability.knowledgeAvailable) {
                setKnowledge([]);
                if (await tryOnDeviceFallback()) return;
                const unavailableReason = 'This Saint became unavailable because backend storage or history is no longer healthy.';
                setBlockedReason(unavailableReason);
                setError(unavailableReason);
                return;
            }
            // specific cast to handle extra properties
            const responseData = response as any;
            const serverContent = responseData.message || responseData.content;
            // Server replied but with no usable AI content (e.g. no LLM key) → fail over.
            if (!serverContent || !String(serverContent).trim()) {
                if (await tryOnDeviceFallback()) return;
            }

            const aiMsg: Message = {
                id: responseData.id || Date.now().toString(),
                role: 'assistant',
                content: serverContent || '…',
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
            if (await tryOnDeviceFallback()) return;
            setError(formatSaintError('chat', err));
        } finally {
            setLoading(false);
        }
    };

    const knowledgeDisabled = Boolean(blockedReason) || !availability.knowledgeAvailable && knowledge.length === 0;
    // On-device mode keeps the chat usable even if the backend is unavailable, 
    // it runs entirely in the browser, so a blocked backend shouldn't lock input.
    // Don't hard-block the chat when the backend is degraded if we can still
    // answer on-device: let the input through so the fail-safe can kick in.
    const chatBlocked = Boolean(blockedReason) && !onDeviceMode && !webgpuAvailable;

    return (
        <div className="flex h-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Header */}
                <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white shadow-sm ring-1 ring-slate-200 ${colors.icon}`}>
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
                                <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${colors.spinner}`}></div>
                                <span>Establishing spiritual connection...</span>
                            </div>
                        )}

                        {error && (
                            <div className="mx-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                                <span>{error}</span>
                            </div>
                        )}

                        {chatBlocked && !bootstrapping ? (
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
                                                ? `${colors.userBubble} text-white`
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
                                            <Icon className={`w-4 h-4 ${colors.iconSoft} motion-safe:animate-bounce`} />
                                            <span className="text-sm text-slate-500">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </>
                </div>

                {/* On-device AI: private, in-browser model. Opt-in, runs on the user's
                    own hardware, with a clear heads-up about what that means. */}
                {onDeviceMode ? (
                    <div className="px-4 pt-3">
                        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                            <span aria-hidden className="mt-0.5">⚡</span>
                            <span>
                                <strong>On-device AI active.</strong> {saintName} is running privately in your browser
                                ({ON_DEVICE_MODEL_LABEL}) using this device's own compute, your conversation never leaves this device.
                            </span>
                        </div>
                    </div>
                ) : webgpuAvailable ? (
                    <div className="px-4 pt-3">
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs text-indigo-900">
                            <div className="flex items-start gap-2">
                                <span aria-hidden className="mt-0.5">🔒</span>
                                <div className="flex-1">
                                    <p className="font-semibold">Run {saintName} privately on your device</p>
                                    <p className="mt-0.5 leading-relaxed text-indigo-800/90">
                                        No account, no server, the AI ({ON_DEVICE_MODEL_LABEL}) runs entirely in your
                                        browser and nothing you type leaves your device. Heads-up: it runs on your own
                                        device's compute and needs {ON_DEVICE_DOWNLOAD_NOTE} the first time, on a modern computer.
                                    </p>
                                    {onDeviceStatus === 'loading' ? (
                                        <div className="mt-2">
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
                                                <div
                                                    className="h-full rounded-full bg-indigo-500 transition-all"
                                                    style={{ width: `${Math.max(3, Math.round(onDeviceProgress * 100))}%` }}
                                                />
                                            </div>
                                            <p className="mt-1 text-[11px] text-indigo-600">
                                                Loading model… {Math.round(onDeviceProgress * 100)}% (one-time download, then cached)
                                            </p>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={enableOnDevice}
                                            className="mt-2 rounded-md bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-700 transition-colors"
                                        >
                                            Enable on-device AI
                                        </button>
                                    )}
                                    {onDeviceStatus === 'error' && onDeviceError && (
                                        <p className="mt-1.5 text-[11px] text-red-600">{onDeviceError}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all shadow-sm">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={chatBlocked ? `${saintName} is unavailable until runtime dependencies recover.` : `Ask ${saintName} for guidance...`}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400 text-sm"
                            disabled={loading || bootstrapping || chatBlocked}
                            aria-disabled={loading || bootstrapping || chatBlocked}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading || bootstrapping || chatBlocked}
                            className={`p-2 rounded-lg ${colors.sendButton} text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm`}
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
                            <Brain className={`w-4 h-4 ${colors.icon}`} />
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
                        <div className={`p-3 rounded-lg border text-xs ${colors.knowledgePanel}`}>
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
