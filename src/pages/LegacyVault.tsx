import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LegacyVaultEnhanced from '../components/LegacyVaultEnhanced';

export default function LegacyVault() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative">
        <button
          onClick={() => navigate('/dashboard')}
          className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <LegacyVaultEnhanced />
      </div>
    </div>
  );
}
