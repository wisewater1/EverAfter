import { useState } from 'react';
import { X, Plus, User } from 'lucide-react';
import { addFamilyMember, addRelationship, getFamilyMembers, FamilyMember, Gender } from '../../lib/joseph/genealogy';

interface Props {
    onClose: () => void;
    onAdded: (member: FamilyMember) => void;
}

export default function AddFamilyMemberModal({ onClose, onAdded }: Props) {
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        gender: 'male' as Gender,
        birthDate: '',
        deathDate: '',
        birthPlace: '',
        bio: '',
        generation: 0,
    });
    const [spouseOf, setSpouseOf] = useState('');
    const [parentIds, setParentIds] = useState<string[]>([]);
    const existingMembers = getFamilyMembers();

    const set = (field: string, val: string | number) =>
        setForm(p => ({ ...p, [field]: val }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.firstName || !form.lastName) return;

        const member = addFamilyMember(
            { ...form, birthDate: form.birthDate || undefined, deathDate: form.deathDate || undefined, birthPlace: form.birthPlace || undefined, bio: form.bio || undefined },
            parentIds.length > 0 ? parentIds : undefined
        );

        // Add spouse relationship
        if (spouseOf) {
            addRelationship({ fromId: spouseOf, toId: member.id, type: 'spouse' });
        }

        onAdded(member);
        onClose();
    };

    const toggleParent = (id: string) => {
        setParentIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <Plus className="w-5 h-5 text-amber-400" />
                        </div>
                        <h2 className="text-lg font-light text-white">Add Family Member</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Name */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">First Name *</span>
                            <input type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)} required
                                className="mt-1 w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all" />
                        </label>
                        <label className="block">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Last Name *</span>
                            <input type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)} required
                                className="mt-1 w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all" />
                        </label>
                    </div>

                    {/* Gender & Generation */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Gender</span>
                            <select value={form.gender} onChange={e => set('gender', e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all">
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Generation</span>
                            <select value={form.generation} onChange={e => set('generation', Number(e.target.value))}
                                className="mt-1 w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all">
                                <option value={-2}>Grandparent</option>
                                <option value={-1}>Parent</option>
                                <option value={0}>Same Generation</option>
                                <option value={1}>Child</option>
                                <option value={2}>Grandchild</option>
                            </select>
                        </label>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Birth Date</span>
                            <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all" />
                        </label>
                        <label className="block">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Death Date</span>
                            <input type="date" value={form.deathDate} onChange={e => set('deathDate', e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all" />
                        </label>
                    </div>

                    {/* Birth Place */}
                    <label className="block">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Birth Place</span>
                        <input type="text" value={form.birthPlace} onChange={e => set('birthPlace', e.target.value)} placeholder="e.g. Chicago, IL"
                            className="mt-1 w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-all" />
                    </label>

                    {/* Bio */}
                    <label className="block">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Bio / Notes</span>
                        <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} placeholder="Tell us about this person..."
                            className="mt-1 w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none" />
                    </label>

                    {/* Relationships */}
                    <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-2">Spouse Of</span>
                        <select value={spouseOf} onChange={e => setSpouseOf(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all">
                            <option value="">None</option>
                            {existingMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-2">Parents (select up to 2)</span>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                            {existingMembers.filter(m => m.generation < form.generation).map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => toggleParent(m.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${parentIds.includes(m.id)
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <User className="w-3 h-3" />
                                    {m.firstName} {m.lastName}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit */}
                    <button type="submit"
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Member to Family Tree
                    </button>
                </form>
            </div>
        </div>
    );
}
