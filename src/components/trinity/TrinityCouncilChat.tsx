/**
 * TrinityCouncilChat — Option 1
 * All 3 Saints respond to a single user message.
 */
import { useState, useRef, useEffect } from 'react';
import { Send, GitBranch, Heart, Wallet, Loader2, Sparkles } from 'lucide-react';
import { trinitySynapse } from './trinityApi';

interface CouncilResponse {
    saint: string;
    icon: string;
    color: string;
    response: string;
}

interface Message {
    id: string;
    role: 'user' | 'council';
    text?: string;
    responses?: CouncilResponse[];
    timestamp: Date;
}

const SAINT_ICONS: Record<string, any> = { joseph: GitBranch, raphael: Heart, gabriel: Wallet };
const SAINT_LABELS: Record<string, string> = { joseph: 'St. Joseph', raphael: 'St. Raphael', gabriel: 'St. Gabriel' };

export default function TrinityCouncilChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    async function sendMessage() {
        if (!input.trim() || loading) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const data = await trinitySynapse<{ responses: CouncilResponse[] }>('trinity_council', { user_message: input });
        const councilMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'council',
            responses: data?.responses || [],
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, councilMsg]);
        setLoading(false);
    }

    return (
        <div className="flex flex-col h-[600px] rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">Trinity Council</span>
                <span className="text-[10px] text-slate-500">Joseph · Raphael · Gabriel respond together</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <Sparkles className="w-8 h-8 text-amber-400/30 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Ask a question — all three Saints will respond with their domain expertise.</p>
                        <p className="text-xs text-slate-600 mt-1">Try: "Should I start a running routine?" or "How can I reduce my family's health risk?"</p>
                    </div>
                )}
                {messages.map(msg => (
                    <div key={msg.id}>
                        {msg.role === 'user' && (
                            <div className="flex justify-end">
                                <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-teal-500/20 text-white text-sm border border-teal-500/20">
                                    {msg.text}
                                </div>
                            </div>
                        )}
                        {msg.role === 'council' && msg.responses && (
                            <div className="space-y-2">
                                {msg.responses.map((r, i) => {
                                    const Icon = SAINT_ICONS[r.saint] || Heart;
                                    return (
                                        <div key={i} className="flex gap-3 items-start">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: r.color + '15', border: `1px solid ${r.color}30` }}>
                                                <Icon className="w-3.5 h-3.5" style={{ color: r.color }} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: r.color }}>{SAINT_LABELS[r.saint]}</p>
                                                <p className="text-sm text-slate-300">{r.response}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Council is deliberating…
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/5">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask the Trinity Council…"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/30"
                    />
                    <button onClick={sendMessage} disabled={loading} className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
