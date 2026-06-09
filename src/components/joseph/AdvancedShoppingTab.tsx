import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, Bot, Box, Brain, CheckCircle2, ExternalLink, Gem, Loader2, Lock, Plus, ShieldCheck, ShoppingCart, Sparkles } from 'lucide-react';

import { apiClient } from '../../lib/api-client';
import type { ShoppingItem } from '../../types/database.types';

export type ShoppingItemType = 'standard' | 'iot_trigger' | 'legacy_asset';

export interface AdvancedShoppingItem {
    id: string;
    name: string;
    quantity: string;
    priceEst: number;
    type: ShoppingItemType;
    status: 'needed' | 'negotiating' | 'bought' | 'vaulted';
    triggerSource?: 'Raphael' | 'Gabriel' | 'Causal Twin';
    legacyBeneficiary?: string;
    unlockYear?: number;
}

const DEFAULT_NEW_ITEM = {
    name: '',
    quantity: '1',
    priceEst: '',
    type: 'standard' as ShoppingItemType,
    triggerSource: '' as '' | 'Raphael' | 'Gabriel' | 'Causal Twin',
    legacyBeneficiary: '',
    unlockYear: '',
};

function mapItem(item: ShoppingItem): AdvancedShoppingItem {
    return {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        priceEst: item.priceEst || 0,
        type: (item.type || 'standard') as ShoppingItemType,
        status: item.status,
        triggerSource: item.triggerSource,
        legacyBeneficiary: item.legacyBeneficiary,
        unlockYear: item.unlockYear,
    };
}

export function AdvancedShoppingTab() {
    const [items, setItems] = useState<AdvancedShoppingItem[]>([]);
    const [activeTab, setActiveTab] = useState<'logistics' | 'vault'>('logistics');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeItemId, setActiveItemId] = useState<string | null>(null);
    const [showComposer, setShowComposer] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newItem, setNewItem] = useState(DEFAULT_NEW_ITEM);

    const loadItems = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.getShoppingList('');
            setItems(data.map(mapItem));
        } catch (loadError) {
            console.error('Failed to load shopping items', loadError);
            setError(loadError instanceof Error ? loadError.message : 'Failed to load shopping items.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadItems();
    }, []);

    const patchItem = (item: AdvancedShoppingItem) => {
        setItems((prev) => prev.map((entry) => (entry.id === item.id ? item : entry)));
    };

    const handleCreateItem = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newItem.name.trim()) {
            setError('Item name is required.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const created = await apiClient.createShoppingItem({
                name: newItem.name.trim(),
                quantity: newItem.quantity.trim() || '1',
                priceEst: newItem.priceEst ? Number(newItem.priceEst) : undefined,
                type: newItem.type,
                triggerSource: newItem.type === 'iot_trigger' ? newItem.triggerSource || undefined : undefined,
                legacyBeneficiary: newItem.type === 'legacy_asset' ? newItem.legacyBeneficiary.trim() || undefined : undefined,
                unlockYear: newItem.type === 'legacy_asset' && newItem.unlockYear ? Number(newItem.unlockYear) : undefined,
            });
            setItems((prev) => [mapItem(created), ...prev]);
            setNewItem(DEFAULT_NEW_ITEM);
            setShowComposer(false);
        } catch (saveError) {
            console.error('Failed to create shopping item', saveError);
            setError(saveError instanceof Error ? saveError.message : 'Failed to create shopping item.');
        } finally {
            setSaving(false);
        }
    };

    const handleBuy = async (item: AdvancedShoppingItem) => {
        setActiveItemId(item.id);
        setError(null);
        try {
            if (item.type === 'legacy_asset') {
                const updated = await apiClient.acquireShoppingItem(item.id);
                patchItem(mapItem(updated));
                return;
            }

            await apiClient.markItemBought(item.id);
            patchItem({ ...item, status: 'bought' });
        } catch (buyError) {
            console.error('Failed to acquire shopping item', buyError);
            setError(buyError instanceof Error ? buyError.message : 'Failed to update shopping item.');
        } finally {
            setActiveItemId(null);
        }
    };

    const handleNegotiate = async (item: AdvancedShoppingItem) => {
        setActiveItemId(item.id);
        setError(null);
        patchItem({ ...item, status: 'negotiating' });
        try {
            const updated = await apiClient.negotiateShoppingItem(item.id);
            patchItem(mapItem(updated));
        } catch (negotiateError) {
            console.error('Failed to negotiate shopping item', negotiateError);
            setError(negotiateError instanceof Error ? negotiateError.message : 'Failed to negotiate item.');
            patchItem(item);
        } finally {
            setActiveItemId(null);
        }
    };

    const logisticsItems = items.filter(item => item.type !== 'legacy_asset');
    const legacyItems = items.filter(item => item.type === 'legacy_asset');

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-light text-white flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-amber-400" />
                        Procurement & Vault
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">Manage daily logistics and acquire long-term generational assets.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowComposer((prev) => !prev)}
                        className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 transition-colors hover:bg-amber-400"
                    >
                        <Plus className="w-4 h-4" />
                        Add Item
                    </button>

                    <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 shadow-inner">
                        <button
                            onClick={() => setActiveTab('logistics')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'logistics' ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'text-slate-500 hover:text-white'}`}
                        >
                            <Box className="w-4 h-4" /> Logistics
                        </button>
                        <button
                            onClick={() => setActiveTab('vault')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'vault' ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'text-slate-500 hover:text-white'}`}
                        >
                            <Gem className="w-4 h-4" /> Legacy Vault
                        </button>
                    </div>
                </div>
            </div>

            {showComposer && (
                <form onSubmit={handleCreateItem} className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-white/5 bg-black/20 p-4">
                    <input
                        value={newItem.name}
                        onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Item name"
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                    />
                    <select
                        value={newItem.type}
                        onChange={(event) => setNewItem((prev) => ({ ...prev, type: event.target.value as ShoppingItemType }))}
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                    >
                        <option value="standard">Standard</option>
                        <option value="iot_trigger">IoT Trigger</option>
                        <option value="legacy_asset">Legacy Asset</option>
                    </select>
                    <input
                        value={newItem.quantity}
                        onChange={(event) => setNewItem((prev) => ({ ...prev, quantity: event.target.value }))}
                        placeholder="Quantity"
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                    />
                    <input
                        value={newItem.priceEst}
                        onChange={(event) => setNewItem((prev) => ({ ...prev, priceEst: event.target.value }))}
                        placeholder="Estimated price"
                        type="number"
                        min="0"
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                    />
                    {newItem.type === 'iot_trigger' && (
                        <select
                            value={newItem.triggerSource}
                            onChange={(event) => setNewItem((prev) => ({ ...prev, triggerSource: event.target.value as '' | 'Raphael' | 'Gabriel' | 'Causal Twin' }))}
                            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        >
                            <option value="">Trigger source</option>
                            <option value="Raphael">Raphael</option>
                            <option value="Gabriel">Gabriel</option>
                            <option value="Causal Twin">Causal Twin</option>
                        </select>
                    )}
                    {newItem.type === 'legacy_asset' && (
                        <>
                            <input
                                value={newItem.legacyBeneficiary}
                                onChange={(event) => setNewItem((prev) => ({ ...prev, legacyBeneficiary: event.target.value }))}
                                placeholder="Legacy beneficiary"
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                            />
                            <input
                                value={newItem.unlockYear}
                                onChange={(event) => setNewItem((prev) => ({ ...prev, unlockYear: event.target.value }))}
                                placeholder="Unlock year"
                                type="number"
                                min="2025"
                                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                            />
                        </>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Save Item
                    </button>
                </form>
            )}

            {error && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                </div>
            )}

            {activeTab === 'logistics' && (
                <div className="space-y-4">
                    {loading && (
                        <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-6 py-8 text-sm text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading shopping items from the backend...
                        </div>
                    )}

                    {logisticsItems.map(item => (
                        <div key={item.id} className={`p-4 rounded-2xl border transition-all ${item.status === 'bought' ? 'bg-emerald-500/5 border-emerald-500/10' : item.type === 'iot_trigger' ? 'bg-sky-500/5 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.05)]' : 'bg-white/5 border-white/5'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {item.status === 'bought' && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md"><CheckCircle2 className="w-3 h-3" /> Procured</span>}
                                        {item.status === 'negotiating' && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> St. Joseph Negotiating</span>}

                                        {item.type === 'iot_trigger' && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-500/30">
                                                {item.triggerSource === 'Raphael' ? <Activity className="w-3 h-3" /> : item.triggerSource === 'Gabriel' ? <ShieldCheck className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                                                IoT Trigger: {item.triggerSource}
                                            </span>
                                        )}
                                    </div>

                                    <h4 className={`text-base font-medium ${item.status === 'bought' ? 'text-slate-500 line-through' : 'text-white'}`}>{item.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1">{item.quantity} · Est: ${item.priceEst}</p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {item.status === 'needed' && item.priceEst > 500 && (
                                        <button
                                            onClick={() => void handleNegotiate(item)}
                                            disabled={activeItemId === item.id}
                                            className="px-3 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 transition-all rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg group"
                                        >
                                            {activeItemId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4 group-hover:animate-bounce" />} Negotiator
                                        </button>
                                    )}

                                    {item.status === 'needed' && (
                                        <button
                                            onClick={() => void handleBuy(item)}
                                            disabled={activeItemId === item.id}
                                            className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg"
                                        >
                                            {activeItemId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Buy <ExternalLink className="w-3 h-3" /></>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {!loading && logisticsItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border border-white/5 border-dashed rounded-2xl bg-white/5">
                            <Box className="w-8 h-8 opacity-50" />
                            <p className="text-sm font-medium">No backend logistics items yet.</p>
                        </div>
                    )}

                    {!loading && logisticsItems.length > 0 && logisticsItems.every(item => item.status === 'bought') && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border border-white/5 border-dashed rounded-2xl bg-white/5">
                            <Box className="w-8 h-8 opacity-50" />
                            <p className="text-sm font-medium">Household provisions fully stocked.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'vault' && (
                <div className="space-y-4">
                    <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5 mb-6 text-center space-y-2">
                        <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
                        <h4 className="text-indigo-300 font-bold tracking-wider uppercase text-xs">The Generational Vault</h4>
                        <p className="text-sm text-indigo-200/70 max-w-xl mx-auto">Assets procured here are not for immediate consumption. They are locked via smart contracts and securely vaulted for descendents.</p>
                    </div>

                    {legacyItems.map(item => (
                        <div key={item.id} className={`p-5 rounded-2xl border transition-all ${item.status === 'vaulted' ? 'bg-indigo-950/50 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'bg-slate-800/50 border-white/10'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex flex-col items-center justify-center bg-indigo-950/80 border border-indigo-500/30 rounded-xl w-24 h-24 shrink-0 shadow-inner">
                                    <Lock className={`w-8 h-8 ${item.status === 'vaulted' ? 'text-indigo-400' : 'text-slate-500'}`} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mt-2">Unlocks</span>
                                    <span className="text-sm font-black text-white">{item.unlockYear}</span>
                                </div>

                                <div className="flex-1">
                                    <h4 className="text-lg font-medium text-white">{item.name}</h4>
                                    <p className="text-sm text-slate-400 mt-1">Beneficiary: <span className="font-medium text-amber-400">{item.legacyBeneficiary}</span></p>
                                    <p className="text-xs text-slate-500 mt-1">Est. Acquisition: ${item.priceEst}</p>

                                    {item.status === 'vaulted' && (
                                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                            <CheckCircle2 className="w-3 h-3" /> Securely Vaulted
                                        </div>
                                    )}
                                </div>

                                {item.status === 'needed' && (
                                    <button
                                        onClick={() => void handleBuy(item)}
                                        disabled={activeItemId === item.id}
                                        className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white transition-all rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-500/20 shrink-0 group"
                                    >
                                        {activeItemId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Acquire Asset <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {!loading && legacyItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border border-white/5 border-dashed rounded-2xl bg-white/5">
                            <Gem className="w-8 h-8 opacity-50" />
                            <p className="text-sm font-medium">No legacy vault acquisitions yet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
