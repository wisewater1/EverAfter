import { useNavigate } from 'react-router-dom';
import {
  Heart, Shield, Users, FileText, CheckCircle2, ArrowRight,
  Lock, ArrowLeft, Info
} from 'lucide-react';

// This screen introduces the insurance record area. EverAfter does not sell,
// broker, or underwrite insurance, and nothing here quotes or binds a policy,
// so the copy describes only what the app actually does: hold a record of the
// cover a person already has, so their family can find it later.
export default function InsuranceConnection() {
  const navigate = useNavigate();

  const capabilities = [
    {
      id: 'policies',
      name: 'Your policies',
      description: 'Record the life, term, whole, and universal policies you already hold.',
      icon: FileText,
      color: 'from-rose-500/20 to-pink-500/20',
      borderColor: 'border-rose-500/30',
      iconColor: 'text-rose-400',
      details: [
        'Insurer, policy number, and coverage amount',
        'Premium amount and how often it is due',
        'Policy status, from active through lapsed',
        'A running total of the cover you have recorded'
      ]
    },
    {
      id: 'beneficiaries',
      name: 'Beneficiaries',
      description: 'Keep track of who each policy is meant to reach, and in what share.',
      icon: Users,
      color: 'from-emerald-500/20 to-teal-500/20',
      borderColor: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      details: [
        'Named beneficiaries held against each policy',
        'Percentage allocation across several people',
        'Relationship and contact details',
        'Updates whenever your circumstances change'
      ]
    },
    {
      id: 'claims',
      name: 'Claims',
      description: 'Keep a record of any claim your family has filed and where it stands.',
      icon: Shield,
      color: 'from-sky-500/20 to-blue-500/20',
      borderColor: 'border-sky-500/30',
      iconColor: 'text-sky-400',
      details: [
        'Claim amount and the date it was filed',
        'Status, from pending through approved, denied, or paid',
        'Notes kept alongside the policy they belong to',
        'A history your family can follow later'
      ]
    },
    {
      id: 'payments',
      name: 'Premium payments',
      description: 'Log the premiums you have paid so the payment history stays in one place.',
      icon: CheckCircle2,
      color: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/30',
      iconColor: 'text-amber-400',
      details: [
        'Payment date, amount, and method',
        'History ordered most recent first',
        'Held against the policy it belongs to',
        'Visible to you and to anyone you have authorized'
      ]
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/legacy-vault')}
          className="mb-6 min-h-11 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Legacy Vault
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30 mb-6">
            <Heart className="w-10 h-10 text-rose-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Insurance records
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            A place to keep the details of the cover you already hold, so the people
            you leave behind are not searching for it when it matters most.
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-12 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">What this is, and what it is not</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                EverAfter does not sell, broker, or underwrite insurance, and nothing
                here quotes a premium or binds a policy. This area is record keeping.
                You enter the policies you have already taken out with your own
                insurer, and EverAfter keeps that record safe and shareable with the
                family members you choose. To change or buy cover, you deal with your
                insurer directly, exactly as you do now.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">What you can keep here</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <div
                  key={capability.id}
                  className={`p-6 rounded-2xl bg-gradient-to-br ${capability.color} border ${capability.borderColor}`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-900/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-6 h-6 ${capability.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-1">{capability.name}</h3>
                      <p className="text-sm text-slate-300">{capability.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {capability.details.map((detail) => (
                      <div key={detail} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Who can see it</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your insurance records are yours. They are stored against your account
                and are visible to you, and to the family members you have authorized
                through the family tree. Anyone with access appears on your watcher
                list, and you can withdraw that access at any time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/legacy-vault')}
            className="w-full sm:w-auto min-h-11 px-6 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white transition-all font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
          >
            Not now
          </button>
          <button
            onClick={() => navigate('/insurance')}
            className="w-full sm:w-auto min-h-11 px-8 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
          >
            Open insurance records
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
