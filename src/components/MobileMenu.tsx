import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Heart, LogOut, Brain, ChevronRight, Sparkles, Shield, Users, Search, Wallet, Home } from 'lucide-react';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigateToLegacy: () => void;
    onNavigateToTrinity: () => void;
    onSignOut: () => void;
}

export default function MobileMenu({
    isOpen,
    onClose,
    onNavigateToLegacy,
    onNavigateToTrinity,
    onSignOut,
}: MobileMenuProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const navTo = (path: string) => {
        navigate(path);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-menu-backdrop-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-out Panel */}
            <div
                ref={panelRef}
                className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-slate-950 border-r border-slate-800 shadow-2xl flex flex-col animate-menu-slide-in safe-top"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Brain className="w-4.5 h-4.5 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-white tracking-tight">EverAfter</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 stagger-children">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Navigate</p>
                    <MenuItem
                        icon={Home}
                        label="Dashboard"
                        onClick={() => navTo('/dashboard')}
                        color="text-emerald-400"
                        bgColor="bg-emerald-500/10"
                    />
                    <MenuItem
                        icon={Heart}
                        label="St. Raphael Health"
                        onClick={() => navTo('/health-dashboard')}
                        color="text-red-400"
                        bgColor="bg-red-500/10"
                    />
                    <MenuItem
                        icon={Shield}
                        label="St. Michael Security"
                        onClick={() => navTo('/security-dashboard')}
                        color="text-blue-400"
                        bgColor="bg-blue-500/10"
                    />
                    <MenuItem
                        icon={Users}
                        label="St. Joseph Family"
                        onClick={() => navTo('/family-dashboard')}
                        color="text-amber-400"
                        bgColor="bg-amber-500/10"
                    />
                    <MenuItem
                        icon={Wallet}
                        label="St. Gabriel Finance"
                        onClick={() => navTo('/finance-dashboard')}
                        color="text-purple-400"
                        bgColor="bg-purple-500/10"
                    />
                    <MenuItem
                        icon={Search}
                        label="St. Anthony Guidance"
                        onClick={() => navTo('/anthony-dashboard')}
                        color="text-rose-400"
                        bgColor="bg-rose-500/10"
                    />

                    <div className="h-px bg-slate-800/70 my-2" />
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Features</p>

                    <MenuItem
                        icon={Heart}
                        label="Legacy Vault"
                        onClick={() => { onNavigateToLegacy(); onClose(); }}
                        color="text-purple-400"
                        bgColor="bg-purple-500/10"
                    />
                    <MenuItem
                        icon={Sparkles}
                        label="Trinity Dashboard"
                        onClick={() => { onNavigateToTrinity(); onClose(); }}
                        color="text-amber-300"
                        bgColor="bg-amber-500/10"
                    />
                </div>

                {/* Footer */}
                <div className="px-4 py-4 border-t border-slate-800/50 safe-bottom">
                    <button
                        onClick={() => { onSignOut(); onClose(); }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-slate-400 transition-all group"
                    >
                        <div className="flex items-center gap-2.5">
                            <LogOut className="w-4.5 h-4.5" />
                            <span className="text-sm font-medium">Sign Out</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="text-center text-[10px] text-slate-600 mt-4">
                        v1.2.0 &middot; EverAfter AI
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
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-900/80 transition-all group border border-transparent hover:border-slate-800 active:scale-[0.98]"
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <span className="text-sm text-slate-200 font-medium group-hover:text-white transition-colors">{label}</span>
            </div>
            {badge ? (
                <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg shadow-emerald-500/20">
                    {badge}
                </span>
            ) : (
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            )}
        </button>
    );
}
