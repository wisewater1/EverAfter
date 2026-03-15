import { useState } from 'react';
import { X, Calendar, User, Image as ImageIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { EventType, FamilyMember } from '../../lib/joseph/genealogy';
import { API_BASE_URL as CENTRAL_API_BASE } from '../../lib/env';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (eventData: any) => void;
    members: FamilyMember[];
}

export default function AddEventModal({ isOpen, onClose, onSuccess, members }: AddEventModalProps) {
    const [title, setTitle] = useState('');
    const [memberId, setMemberId] = useState(members[0]?.id || '');
    const [type, setType] = useState<EventType>('milestone');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const tokenStr = localStorage.getItem('supabase.auth.token');
            let token = '';
            try {
                const session = tokenStr ? JSON.parse(tokenStr) : null;
                token = session?.currentSession?.access_token || '';
            } catch (e) { }

            const API_BASE = CENTRAL_API_BASE;

            const selectedMember = members.find(m => m.id === memberId);
            const memberName = selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : 'Unknown';

            // Attempt to submit to backend API
            const reqUrl = `${API_BASE}/api/v1/genealogy/events`;
            let returnedEvent = null;

            try {
                const res = await fetch(reqUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title, type, date, description, memberId, memberName, mediaUrl
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    returnedEvent = data.event;
                }
            } catch (e) {
                // Ignore API failures for MVP (local state handles it)
                console.error("Backend event save failed:", e);
            }

            // Fallback object structure if backend fails or doesn't exist yet
            const fallbackObj = {
                id: returnedEvent?.id || `evt_${Date.now()}`,
                title, type, date, description, memberId, memberName, mediaUrl
            };

            onSuccess(returnedEvent || fallbackObj);

            // Reset
            setTitle('');
            setDescription('');
            setMediaUrl('');
            onClose();

        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                    Record Family Event
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Event Title</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="E.g., Graduation, Bought a House..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Family Member</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    required
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                    value={memberId}
                                    onChange={(e) => setMemberId(e.target.value)}
                                >
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Event Type</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                value={type}
                                onChange={(e) => setType(e.target.value as EventType)}
                            >
                                <option value="birth">Birth</option>
                                <option value="marriage">Marriage</option>
                                <option value="adoption">Adoption</option>
                                <option value="milestone">Milestone</option>
                                <option value="death">Death</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Date</label>
                        <input
                            type="date"
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Details (Optional)</label>
                        <textarea
                            className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="Add more context about what happened..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Cover Image URL (Optional)</label>
                        <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="url"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="https://..."
                                value={mediaUrl}
                                onChange={(e) => setMediaUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all ${isSubmitting
                                    ? 'bg-indigo-500/50 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                                }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving Record...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Save to Timeline
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
