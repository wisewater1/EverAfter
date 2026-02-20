import React from 'react';
import { X, Heart, Link2, ShoppingCart, LogOut, Brain, ChevronRight, Briefcase } from 'lucide-react';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigateToLegacy: () => void;
    onOpenConnections: () => void;
    onNavigateToMarketplace: () => void;
    onNavigateToCareer: () => void;
    onSignOut: () => void;
    activeConnectionsCount: number;
}

export default function MobileMenu({
    isOpen,
    onClose,
    onNavigateToLegacy,
    onOpenConnections,
    onNavigateToMarketplace,
    onNavigateToCareer,
    onSignOut,
    activeConnectionsCount
}: MobileMenuProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Slide-out Panel */}
            <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-slate-950 border-r border-slate-800 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight">EverAfter</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    <MenuItem
                        icon={Link2}
                        label="Connections"
                        onClick={() => { onOpenConnections(); onClose(); }}
                        badge={activeConnectionsCount > 0 ? activeConnectionsCount : undefined}
                        color="text-cyan-400"
                        bgColor="bg-cyan-500/10"
                    />
                    <MenuItem
                        icon={Heart}
                        label="Legacy Vault"
                        onClick={() => { onNavigateToLegacy(); onClose(); }}
                        color="text-purple-400"
                        bgColor="bg-purple-500/10"
                    />
                    <MenuItem
                        icon={Briefcase}
                        label="Career Agent"
                        onClick={() => { onNavigateToCareer(); onClose(); }}
                        color="text-indigo-400"
                        bgColor="bg-indigo-500/10"
                    />
                    <MenuItem
                        icon={ShoppingCart}
                        label="Marketplace"
                        onClick={() => { onNavigateToMarketplace(); onClose(); }}
                        color="text-amber-400"
                        bgColor="bg-amber-500/10"
                    />
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800/50">
                    <button
                        onClick={() => { onSignOut(); onClose(); }}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-slate-400 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Sign Out</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="text-center text-xs text-slate-600 mt-6">
                        v1.2.0 • EverAfter AI
                    </p>
                </div>
            </div>
        </div>
    );
}

interface MenuItemProps {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    badge?: number;
    color: string;
    bgColor: string;
}

function MenuItem({ icon: Icon, label, onClick, badge, color, bgColor }: MenuItemProps) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-900/80 transition-all group border border-transparent hover:border-slate-800"
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className="text-slate-200 font-medium group-hover:text-white transition-colors">{label}</span>
            </div>
            {badge ? (
                <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg shadow-emerald-500/20">
                    {badge}
                </span>
            ) : (
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
            )}
        </button>
    );
}
