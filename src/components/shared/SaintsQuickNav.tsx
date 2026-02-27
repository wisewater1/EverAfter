import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, Shield, Users, BarChart3, Search, Activity } from 'lucide-react';

const SAINTS = [
    { path: '/health-dashboard', label: 'Raphael', sublabel: 'Health', icon: Heart, color: 'teal' },
    { path: '/security-dashboard', label: 'Michael', sublabel: 'Security', icon: Shield, color: 'blue' },
    { path: '/family-dashboard', label: 'Joseph', sublabel: 'Family', icon: Users, color: 'amber' },
    { path: '/finance-dashboard', label: 'Gabriel', sublabel: 'Finance', icon: BarChart3, color: 'emerald' },
    { path: '/anthony-dashboard', label: 'Anthony', sublabel: 'Audit', icon: Search, color: 'violet' },
    { path: '/monitor', label: 'Monitor', sublabel: 'System', icon: Activity, color: 'rose' },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
    teal: { bg: 'bg-teal-500/5', text: 'text-teal-400', border: 'border-teal-500/10', activeBg: 'bg-teal-500/20' },
    blue: { bg: 'bg-blue-500/5', text: 'text-blue-400', border: 'border-blue-500/10', activeBg: 'bg-blue-500/20' },
    amber: { bg: 'bg-amber-500/5', text: 'text-amber-400', border: 'border-amber-500/10', activeBg: 'bg-amber-500/20' },
    emerald: { bg: 'bg-emerald-500/5', text: 'text-emerald-400', border: 'border-emerald-500/10', activeBg: 'bg-emerald-500/20' },
    violet: { bg: 'bg-violet-500/5', text: 'text-violet-400', border: 'border-violet-500/10', activeBg: 'bg-violet-500/20' },
    rose: { bg: 'bg-rose-500/5', text: 'text-rose-400', border: 'border-rose-500/10', activeBg: 'bg-rose-500/20' },
};

export default function SaintsQuickNav() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1 overflow-x-auto w-full max-w-[calc(100vw-2rem)] md:max-w-none custom-scrollbar pb-2">
            {SAINTS.map(s => {
                const Icon = s.icon;
                const colors = COLOR_MAP[s.color] || COLOR_MAP.teal;
                const isActive = location.pathname === s.path;

                return (
                    <button
                        key={s.path}
                        onClick={() => navigate(s.path)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${isActive
                            ? `${colors.activeBg} ${colors.text} border ${colors.border}`
                            : `text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]`
                            }`}
                    >
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        <span className="hidden sm:inline">{s.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
