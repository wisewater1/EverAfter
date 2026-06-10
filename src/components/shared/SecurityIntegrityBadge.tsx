import { useState, useEffect } from 'react';
import { Shield, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { subscribeToSaintEvents, getSaintStatuses, SaintEventEnvelope } from '../../lib/saintBridge';

export default function SecurityIntegrityBadge({ className = '' }: { className?: string }) {
    const navigate = useNavigate();
    const [securityLevel, setSecurityLevel] = useState<'green' | 'yellow' | 'red'>('green');
    // Mock integrity score for now, could be real later
    const [integrityScore, setIntegrityScore] = useState(100);
    const [lastAudit, setLastAudit] = useState<string>(new Date().toISOString());

    useEffect(() => {
        // Initial state
        const statuses = getSaintStatuses();
        const michael = statuses.find(s => s.id === 'michael');
        if (michael) setSecurityLevel(michael.securityLevel);

        // Subscribe to updates
        const unsubscribe = subscribeToSaintEvents((event: SaintEventEnvelope) => {
            if (event.source === 'michael' && event.topic === 'security/alert') {
                setSecurityLevel('red');
            }
            if (event.source === 'michael' && event.topic === 'security/scan_complete') {
                // In a real app we'd check the payload result
                if (Math.random() > 0.9) setSecurityLevel('yellow');
                else setSecurityLevel('green');
            }
            if (event.source === 'anthony' && (event.topic === 'audit/flag' || event.topic === 'audit/integrity_check')) {
                setLastAudit(event.timestamp);
                // Simulate score fluctuation
                if (event.topic === 'audit/flag') setIntegrityScore(prev => Math.max(0, prev - 5));
            }
        });

        return unsubscribe;
    }, []);

    const getSecurityColor = () => {
        switch (securityLevel) {
            case 'green': return 'text-emerald-400';
            case 'yellow': return 'text-amber-400';
            case 'red': return 'text-rose-500';
            default: return 'text-slate-400';
        }
    };

    const getSecurityText = () => {
        switch (securityLevel) {
            case 'green': return 'Protected';
            case 'yellow': return 'Warning';
            case 'red': return 'Critical';
            default: return 'Unknown';
        }
    };

    return (
        <div className={`flex items-center gap-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-full px-4 py-1.5 shadow-sm whitespace-nowrap ${className}`}>

            {/* Michael Section */}
            <button
                onClick={() => navigate('/security-dashboard')}
                className="flex items-center gap-2 hover:bg-slate-800/50 rounded-lg px-2 py-0.5 transition-all group"
                title="St. Michael Status: Active Protection"
            >
                <Shield className={`w-3.5 h-3.5 ${getSecurityColor()}`} />
                <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Security</span>
                    <span className={`text-xs font-semibold ${getSecurityColor()}`}>{getSecurityText()}</span>
                </div>
            </button>

            <div className="w-px h-6 bg-slate-700/50"></div>

            {/* Anthony Section */}
            <button
                onClick={() => navigate('/anthony-dashboard')}
                className="flex items-center gap-2 hover:bg-slate-800/50 rounded-lg px-2 py-0.5 transition-all group"
                title={`St. Anthony Audit: Last check ${new Date(lastAudit).toLocaleTimeString()}`}
            >
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Integrity</span>
                    <span className="text-xs font-semibold text-slate-300">{integrityScore}%</span>
                </div>
            </button>
        </div>
    );
}
