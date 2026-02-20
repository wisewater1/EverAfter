import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { financeApi } from '../../lib/gabriel/finance';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransactionAdded: () => void;
}

export default function AddTransactionModal({ isOpen, onClose, onTransactionAdded }: AddTransactionModalProps) {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [payee, setPayee] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);

    async function loadCategories() {
        try {
            const cats = await financeApi.getCategories();
            setCategories(cats);
            if (cats.length > 0 && !categoryId) {
                setCategoryId(cats[0].id);
            }
        } catch (error) {
            console.error('Failed to load categories', error);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            await financeApi.createTransaction({
                date,
                payee,
                amount: parseFloat(amount),
                category_id: categoryId,
                description,
                is_cleared: false
            });
            onTransactionAdded();
            onClose();
            // Reset form
            setPayee('');
            setAmount('');
            setDescription('');
        } catch (error) {
            console.error('Failed to create transaction', error);
            alert('Failed to save transaction');
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Add Transaction</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    {/* Payee */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Payee</label>
                        <input
                            type="text"
                            required
                            placeholder="Store or Person"
                            value={payee}
                            onChange={e => setPayee(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                        <select
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Negative for outflow, positive for inflow.</p>
                    </div>

                    {/* Memo */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Memo (Optional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Transaction
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
