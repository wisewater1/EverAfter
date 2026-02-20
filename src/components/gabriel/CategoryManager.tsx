import { useState, useEffect } from 'react';
import { X, Plus, Eye, EyeOff, Save, FolderPlus, Loader2 } from 'lucide-react';
import { financeApi } from '../../lib/gabriel/finance';

interface CategoryManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function CategoryManager({ isOpen, onClose, onUpdate }: CategoryManagerProps) {
    const [categories, setCategories] = useState<{ id: string, name: string, group: string }[]>([]); // Simplified type
    const [loading, setLoading] = useState(true);

    // New Category State
    const [newCatName, setNewCatName] = useState('');
    const [newCatGroup, setNewCatGroup] = useState('Lifestyle');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);

    async function loadCategories() {
        try {
            setLoading(true);
            // We need a way to get *all* categories including hidden ones if we want to unhide them
            // But for now, let's just use what we have available. 
            // Ideally backend should provide a comprehensive list endpoint.
            // Using getCategories (which uses getBudget) only shows active ones.
            // Let's assume for this version we only add/hide visible ones or assume 
            // we'll see duplicates if we add same name.
            const cats = await financeApi.getCategories();
            // Since getCategories returns simple list, we'll use that.
            // Note: getCategories implementation in finance.ts currently extracts from budget.
            // This means we won't see hidden categories to unhide them.
            // Improvement: Add a proper getAllCategories endpoint later.
            setCategories(cats as any);
        } catch (error) {
            console.error('Failed to load categories', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!newCatName || !newCatGroup) return;

        try {
            setIsCreating(true);
            await financeApi.createCategory(newCatName, newCatGroup);
            setNewCatName('');
            await loadCategories(); // Reload list
            onUpdate(); // Trigger parent refresh
        } catch (error) {
            console.error('Failed to create category', error);
        } finally {
            setIsCreating(false);
        }
    }

    async function handleHide(id: string) {
        try {
            if (confirm('Are you sure you want to hide this category? It will be removed from your budget view.')) {
                await financeApi.updateCategory(id, { is_hidden: true });
                await loadCategories();
                onUpdate();
            }
        } catch (error) {
            console.error('Failed to hide category', error);
        }
    }

    if (!isOpen) return null;

    // Group for display
    const grouped = categories.reduce((acc, cat) => {
        if (!acc[cat.group]) acc[cat.group] = [];
        acc[cat.group].push(cat);
        return acc;
    }, {} as Record<string, typeof categories>);

    const existingGroups = Object.keys(grouped).sort();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <FolderPlus className="w-5 h-5 text-emerald-500" />
                        Manage Categories
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Add New */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Add New Category</h3>
                        <form onSubmit={handleCreate} className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-500 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    placeholder="e.g., Gym Membership"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="w-1/3">
                                <label className="block text-xs text-slate-500 mb-1">Group</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        list="groups"
                                        value={newCatGroup}
                                        onChange={e => setNewCatGroup(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                    <datalist id="groups">
                                        {existingGroups.map(g => <option key={g} value={g} />)}
                                    </datalist>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isCreating || !newCatName}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add
                            </button>
                        </form>
                    </div>

                    {/* List Existing */}
                    <div className="space-y-6">
                        {existingGroups.map(group => (
                            <div key={group}>
                                <h3 className="text-sm font-semibold text-slate-300 mb-3 pl-2 border-l-2 border-emerald-500/50">{group}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {grouped[group].map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors group">
                                            <span className="text-slate-300 text-sm">{cat.name}</span>
                                            <button
                                                onClick={() => handleHide(cat.id)}
                                                className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Hide Category"
                                            >
                                                <EyeOff className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
