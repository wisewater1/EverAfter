import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';


interface SacredState {
    isSanctumActive: boolean;
    atmosphere: 'tranquil' | 'urgent' | 'sacred';
    intensity: number; // 0 to 1
    shroudStyle?: 'gold' | 'void' | 'crimson' | 'none';
}

export default function SacredOverlay() {
    const { user } = useAuth();
    const [state, setState] = useState<SacredState>({
        isSanctumActive: false,
        atmosphere: 'tranquil',
        intensity: 0,
        shroudStyle: 'none'
    });

    useEffect(() => {
        if (!user) return;

        // Fetch active shroud from backend
        const fetchShroud = async () => {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
            const res = await fetch(`${API_BASE_URL}/api/v1/sacred/shroud`, {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.active_shroud && data.active_shroud !== 'none') {
                    setState(prev => ({
                        ...prev,
                        isSanctumActive: true,
                        shroudStyle: data.active_shroud,
                        intensity: 0.3
                    }));
                    applyShroudCSS(data.active_shroud);
                }
            }
        };
        fetchShroud();

        // Subscribe to relevant health/ritual events
        const channel = supabase
            .channel('public:sacred_bridge')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'agent_notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    const n = payload.new;
                    // Detect high-stress health alerts
                    if (n.notification_type === 'health_alert' && n.priority === 'critical') {
                        triggerSanctum('urgent');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const applyShroudCSS = (style: string) => {
        const root = document.documentElement;
        if (style === 'gold') {
            root.style.setProperty('--sacred-glow', 'rgba(217, 119, 6, 0.4)');
            root.style.setProperty('--sacred-pulse-speed', '6s');
        } else if (style === 'void') {
            root.style.setProperty('--sacred-glow', 'rgba(15, 23, 42, 0.8)');
            root.style.setProperty('--sacred-pulse-speed', '8s');
        } else if (style === 'crimson') {
            root.style.setProperty('--sacred-glow', 'rgba(153, 27, 27, 0.5)');
            root.style.setProperty('--sacred-pulse-speed', '3s');
        }
    };

    const triggerSanctum = (type: 'tranquil' | 'urgent' | 'sacred') => {
        setState(prev => ({ ...prev, isSanctumActive: true, atmosphere: type, intensity: 1 }));

        // Dynamic overrides
        const root = document.documentElement;
        if (type === 'urgent') {
            root.style.setProperty('--sacred-glow', 'rgba(185, 28, 28, 0.4)');
            root.style.setProperty('--sacred-pulse-speed', '2s');
        } else if (type === 'sacred' && state.shroudStyle === 'none') {
            root.style.setProperty('--sacred-glow', 'rgba(217, 119, 6, 0.4)');
            root.style.setProperty('--sacred-pulse-speed', '4s');
        }

        // Auto-fade intensity over time if it's an alert
        if (type === 'urgent') {
            setTimeout(() => {
                setState(prev => ({ ...prev, intensity: 0.5 }));
            }, 10000);
        }
    };

    if (!state.isSanctumActive) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {/* Edge Glow Pulse */}
            <div
                className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out`}
                style={{
                    boxShadow: `inset 0 0 150px var(--sacred-glow, rgba(217, 119, 6, 0.2))`,
                    opacity: state.intensity,
                    animation: `sacred-pulse var(--sacred-pulse-speed, 4s) infinite alternate`
                }}
            />

            {/* Ambient Particles / Dust (simplified) */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dust.png')] pointer-events-none" />
            </div>

            <style>{`
                @keyframes sacred-pulse {
                    from { opacity: 0.2; transform: scale(1); }
                    to { opacity: 0.6; transform: scale(1.02); }
                }
                :root {
                    --sacred-glow: rgba(217, 119, 6, 0.4);
                    --sacred-pulse-speed: 4s;
                }
            `}</style>
        </div>
    );
}
