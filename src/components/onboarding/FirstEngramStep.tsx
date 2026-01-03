import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  Heart,
  BookOpen,
  Compass,
  Sun,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react';

interface FirstEngramStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  saving: boolean;
}

interface Archetype {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  traits: string[];
  color: string;
  bgColor: string;
  gradient: string;
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'sage',
    name: 'The Sage',
    description: 'Wise, thoughtful, and knowledge-seeking',
    icon: BookOpen,
    traits: ['Wisdom', 'Reflection', 'Guidance'],
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    gradient: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'caregiver',
    name: 'The Caregiver',
    description: 'Nurturing, compassionate, and supportive',
    icon: Heart,
    traits: ['Empathy', 'Support', 'Warmth'],
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    gradient: 'from-pink-600 to-rose-600',
  },
  {
    id: 'explorer',
    name: 'The Explorer',
    description: 'Curious, adventurous, and open-minded',
    icon: Compass,
    traits: ['Curiosity', 'Adventure', 'Freedom'],
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
    gradient: 'from-teal-600 to-cyan-600',
  },
  {
    id: 'creator',
    name: 'The Creator',
    description: 'Innovative, expressive, and imaginative',
    icon: Sparkles,
    traits: ['Creativity', 'Vision', 'Expression'],
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    gradient: 'from-amber-600 to-orange-600',
  },
  {
    id: 'optimist',
    name: 'The Optimist',
    description: 'Joyful, encouraging, and hopeful',
    icon: Sun,
    traits: ['Positivity', 'Hope', 'Encouragement'],
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    gradient: 'from-yellow-500 to-amber-500',
  },
];

export default function FirstEngramStep({
  onNext,
  onBack,
  onSkip,
  saving,
}: FirstEngramStepProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [engramName, setEngramName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedArchetype || !engramName.trim()) return;

    setCreating(true);
    // Simulate creation - in production this would call an Edge Function
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setCreating(false);
    onNext();
  };

  const selectedArchetypeData = ARCHETYPES.find((a) => a.id === selectedArchetype);

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Create Your First Engram</h2>
        <p className="text-gray-400 text-sm">
          An Engram is a custom AI personality that learns from you over time. Start with a base
          archetype and make it uniquely yours.
        </p>
      </div>

      {/* Engram Name */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Give your Engram a name</label>
        <input
          type="text"
          value={engramName}
          onChange={(e) => setEngramName(e.target.value)}
          placeholder="e.g., My Digital Self, Future Me..."
          className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          maxLength={50}
        />
      </div>

      {/* Archetype Selection */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-3">Choose a base personality</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ARCHETYPES.map((archetype) => {
            const isSelected = selectedArchetype === archetype.id;
            const Icon = archetype.icon;

            return (
              <button
                key={archetype.id}
                onClick={() => setSelectedArchetype(archetype.id)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? `bg-gradient-to-br ${archetype.gradient} border-transparent ring-2 ring-white/20`
                    : 'bg-gray-700/30 border-gray-600/50 hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : archetype.bgColor}`}>
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : archetype.color}`} />
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-white" />}
                </div>
                <h4 className={`font-medium mt-3 ${isSelected ? 'text-white' : 'text-white'}`}>
                  {archetype.name}
                </h4>
                <p className={`text-sm mt-1 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                  {archetype.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {archetype.traits.map((trait) => (
                    <span
                      key={trait}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-600/50 text-gray-300'
                      }`}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      {selectedArchetypeData && engramName && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedArchetypeData.gradient} flex items-center justify-center`}
            >
              <selectedArchetypeData.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-medium text-white">{engramName}</h4>
              <p className="text-sm text-indigo-300">{selectedArchetypeData.name}</p>
            </div>
          </div>
          <p className="text-sm text-indigo-200/70 mt-3">
            Your Engram will learn from your daily responses and become more personalized over time.
            After 365 days of training, it will truly capture your essence.
          </p>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-700/30 rounded-xl p-4 mb-8">
        <p className="text-gray-400 text-sm">
          <strong className="text-white">What happens next?</strong> Each day, you'll answer a
          question that helps train your Engram. Over time, it learns your values, humor, wisdom,
          and unique perspective.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={saving || creating}
          className="px-6 py-3 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            disabled={saving || creating}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || creating || !selectedArchetype || !engramName.trim()}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Engram
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
