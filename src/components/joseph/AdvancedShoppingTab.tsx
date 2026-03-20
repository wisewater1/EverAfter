import React, { useState } from 'react';
import { ShoppingCart, ShieldCheck, Activity, Brain, Box, CheckCircle2, Lock, Gem, ExternalLink, Bot, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export type ShoppingItemType = 'standard' | 'iot_trigger' | 'legacy_asset';

export interface AdvancedShoppingItem {
    id: string;
    name: string;
    quantity: string;
    priceEst: number;
    type: ShoppingItemType;
    status: 'needed' | 'negotiating' | 'bought' | 'vaulted';
    triggerSource?: 'Raphael' | 'Gabriel' | 'Causal Twin'; // For IoT items
    legacyBeneficiary?: string; // For Legacy items
    unlockYear?: number; // For Legacy items
}

const INITIAL_SHOPPING: AdvancedShoppingItem[] = [
    {
        id: 's1',
        name: 'Whole Food Vitamin D3 + K2',
        quantity: '2 Bottles',
        priceEst: 45,
        type: 'iot_trigger',
        status: 'needed',
        triggerSource: 'Raphael'
    },
    {
        id: 's2',
        name: 'Perimeter Window Sensors',
        quantity: '4 Pack',
        priceEst: 120,
        type: 'iot_trigger',
        status: 'needed',
        triggerSource: 'Gabriel'
    },
    {
        id: 's3',
        name: 'Whole-Home Emergency Solar Generator',
        quantity: '1 Unit',
        priceEst: 1800,
        type: 'standard',
        status: 'needed'
    },
    {
        id: 's4',
        name: 'Vintage 1960s Omega Seamaster',
        quantity: '1 Item',
        priceEst: 2500,
        type: 'legacy_asset',
        status: 'needed',
        legacyBeneficiary: 'Leo',
        unlockYear: 2040
    }
];

export function AdvancedShoppingTab() {
    const [items, setItems] = useState<AdvancedShoppingItem[]>(INITIAL_SHOPPING);
    const [activeTab, setActiveTab] = useState<'logistics' | 'vault'>('logistics');

    const handleBuy = (id: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, status: item.type === 'legacy_asset' ? 'vaulted' : 'bought' };
            }
            return item;
        }));
    };

    const handleNegotiate = (id: string) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'negotiating' } : i));
        
        // Simulate St. Joseph negotiating the price down
        setTimeout(() => {
            setItems(prev => prev.map(i => i.id === id ? { 
                ...i, 
                status: 'needed',
                priceEst: Math.round(i.priceEst * 0.85), // 15% discount achieved
                name: `${i.name} (Negotiated Discount)`
            } : i));
        }, 4000);
    };

    const logisticsItems = items.filter(i => i.type !== 'legacy_asset');
    const legacyItems = items.filter(i => i.type === 'legacy_asset');

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
            
            {/* Header & View Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-light text-white flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-amber-400" />
                        Procurement & Vault
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">Manage daily logistics and acquire long-term generational assets.</p>
                </div>
                
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

            {/* Logistics View */}
            {activeTab === 'logistics' && (
                <div className="space-y-4">
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
                                            onClick={() => handleNegotiate(item.id)}
                                            className="px-3 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 transition-all rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg group"
                                        >
                                            <Bot className="w-4 h-4 group-hover:animate-bounce" /> Negotiator
                                        </button>
                                    )}
                                    
                                    {item.status === 'needed' && (
                                        <button 
                                            onClick={() => handleBuy(item.id)}
                                            className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg"
                                        >
                                            Buy <ExternalLink className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {logisticsItems.every(i => i.status === 'bought') && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border border-white/5 border-dashed rounded-2xl bg-white/5">
                            <Box className="w-8 h-8 opacity-50" />
                            <p className="text-sm font-medium">Household provisions fully stocked.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Legacy Vault View */}
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
                                        onClick={() => handleBuy(item.id)}
                                        className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white transition-all rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-500/20 shrink-0 group"
                                    >
                                        Acquire Asset <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
