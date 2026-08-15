import { notify } from '../lib/dialogs';
import { useState, useEffect, Suspense, lazy } from 'react';
import { Users, Plus, Heart, MessageSquare, Sparkles, ChevronRight, X, Brain, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';
import { getFamilyMembers } from '../lib/joseph/genealogy';

// Loaded on demand when the questionnaire modal opens (keeps it out of the main chunk).
const PersonalityQuiz = lazy(() => import('./joseph/PersonalityQuiz'));
import {
  QUIZ_SESSIONS_UPDATED_EVENT,
  buildQuizShareMessage,
  buildQuizProgressSnapshot,
  listStoredQuizSessions,
  markQuizInviteSent,
  type QuizProgressSnapshot,
} from '../lib/joseph/quizSessions';
import { sendPersonalityQuestions } from '../lib/joseph/sendQuestions';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  avatar_url?: string;
  personality_traits: string[];
  created_at: string;
  moments_count: number;
  last_interaction?: string;
  interactions_count?: number;
}

interface Moment {
  id: string;
  title: string;
  description: string;
  moment_type: 'text' | 'image' | 'video';
  media_url?: string;
  created_at: string;
  tags: string[];
}

type ViewMode = 'grid' | 'create' | 'detail' | 'interact';

export default function FamilyEngrams() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [quizActivities, setQuizActivities] = useState<QuizProgressSnapshot[]>([]);
  // memberId whose questionnaire is open in the in-place modal (null = closed)
  const [quizMemberId, setQuizMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadFamilyMembers();
    }
  }, [user?.id]);

  useEffect(() => {
    const loadQuizActivities = () => {
      const memberNameMap = new Map(
        getFamilyMembers().map((member) => [member.id, `${member.firstName} ${member.lastName}`])
      );

      setQuizActivities(
        listStoredQuizSessions()
          .map((session) => {
            const snapshot = buildQuizProgressSnapshot(session);
            return {
              ...snapshot,
              memberName: memberNameMap.get(snapshot.memberId) || snapshot.memberName,
            };
          })
          .filter((snapshot) => !snapshot.isComplete)
      );
    };

    loadQuizActivities();
    window.addEventListener(QUIZ_SESSIONS_UPDATED_EVENT, loadQuizActivities as EventListener);
    window.addEventListener('focus', loadQuizActivities);

    return () => {
      window.removeEventListener(QUIZ_SESSIONS_UPDATED_EVENT, loadQuizActivities as EventListener);
      window.removeEventListener('focus', loadQuizActivities);
    };
  }, []);

  async function shareQuizLink(activity: QuizProgressSnapshot) {
    // Mint a real server invite → a public /quiz/<token> link the family member
    // can answer with NO account, on any device. Fall back to the local link
    // only if the backend invite can't be created (offline/demo).
    const invite = await apiClient.createQuizInvite(activity.memberName, activity.memberId);
    const { subject, body, link } = invite
      ? {
          subject: `EverAfter personality questions for ${activity.memberName}`,
          body: `Please answer a few quick questions about ${activity.memberName} here (no account needed): ${window.location.origin}${invite.share_path}`,
          link: `${window.location.origin}${invite.share_path}`,
        }
      : buildQuizShareMessage(activity.memberName, activity.memberId);
    const shareText = `${subject}\n\n${body}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: subject,
          text: body,
          url: link,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        window.prompt('Copy this quiz link', link);
      }

      markQuizInviteSent(activity.memberId);
      setQuizActivities((current) =>
        current.map((entry) =>
          entry.memberId === activity.memberId
            ? {
                ...entry,
                lastSentAt: new Date().toISOString(),
                sentCount: (entry.sentCount || 0) + 1,
              }
            : entry
        )
      );
    } catch (error) {
      console.error('Failed to share quiz link:', error);
    }
  }

  function openQuizActivity(memberId: string) {
    // Open the questionnaire right here on the engram page instead of bouncing
    // the user over to the St Joseph dashboard.
    setQuizMemberId(memberId);
  }

  async function loadFamilyMembers() {
    setLoading(true);
    try {
      const { data: members } = await supabase
        .from('family_members')
        .select(`
          id,
          name,
          relationship,
          avatar_url,
          created_at
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (Array.isArray(members) && members.length > 0) {
        // Batch instead of N+1: two bulk .in() queries for ALL members'
        // engrams + moment counts, rather than 2 queries per member.
        const ids = members.map((m) => m.id);
        const [engramsRes, momentsRes] = await Promise.all([
          supabase
            .from('engrams')
            .select('family_member_id, personality_traits, user_interactions(created_at)')
            .in('family_member_id', ids),
          supabase
            .from('family_moments')
            .select('family_member_id')
            .in('family_member_id', ids),
        ]);

        const engramByMember = new Map(
          (Array.isArray(engramsRes.data) ? engramsRes.data : []).map((e: any) => [e.family_member_id, e])
        );
        const momentCount = new Map<string, number>();
        (Array.isArray(momentsRes.data) ? momentsRes.data : []).forEach((m: any) => {
          momentCount.set(m.family_member_id, (momentCount.get(m.family_member_id) || 0) + 1);
        });

        setFamilyMembers(members.map((member) => {
          const engram: any = engramByMember.get(member.id);
          return {
            ...member,
            personality_traits: engram?.personality_traits || [],
            moments_count: momentCount.get(member.id) || 0,
            last_interaction: engram?.user_interactions?.[0]?.created_at,
            interactions_count: engram?.user_interactions?.length || 0,
          };
        }));
      } else if (Array.isArray(members)) {
        setFamilyMembers([]);
      }
    } catch (error) {
      console.error('Error loading family members:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ea-panel p-4 sm:p-6" data-variant="teal">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 text-cyan-400" />
              Family Engrams
            </h2>
            <p className="text-slate-400">
              Create living AI companions by capturing personalities, moments, and memories
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="ea-btn flex flex-shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap relative z-10 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 relative z-10" />
            <span className="relative z-10">Create</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="ea-panel p-4 sm:p-5" data-variant="teal">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-slate-400">Family Members</span>
          </div>
          <p className="text-3xl font-bold text-white">{familyMembers.length}</p>
        </div>

        <div className="ea-panel p-4 sm:p-5" data-variant="teal">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-5 h-5 text-pink-400 relative z-10" />
            <span className="text-sm text-slate-400">Total Moments</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {familyMembers.reduce((acc, m) => acc + m.moments_count, 0)}
          </p>
        </div>

        <div className="ea-panel p-4 sm:p-5" data-variant="gold">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 text-amber-400 relative z-10" />
            <span className="text-sm text-slate-400">Active Engrams</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {familyMembers.filter(m => m.last_interaction).length}
          </p>
        </div>

        <div className="ea-panel p-4 sm:p-5" data-variant="teal">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-purple-400 relative z-10" />
            <span className="text-sm text-slate-400">Interactions</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {familyMembers.reduce((acc, m) => acc + (m.interactions_count || 0), 0)}
          </p>
        </div>
      </div>

      {quizActivities.length > 0 && (
        <div className="ea-panel p-4 sm:p-6" data-variant="gold">
          <div className="flex flex-col gap-2 mb-5">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Personality Questionnaire Activity</h3>
                <p className="text-sm text-slate-400">
                  Resume paused questions, answer on behalf of a family member, or send the questionnaire out.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {quizActivities.map((activity) => (
              <div
                key={activity.memberId}
                className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{activity.memberName}</p>
                    <p className="text-xs text-slate-400">
                      {activity.answeredCount}/{activity.totalQuestions} answered
                      {' '}•{' '}
                      question {activity.currentQuestionNumber} next
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                    {activity.progressPercent}% complete
                  </span>
                </div>

                <div className="mb-4">
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                      style={{ width: `${activity.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 mb-4">
                  <span>Started {new Date(activity.startedAt).toLocaleDateString()}</span>
                  <span>Updated {new Date(activity.updatedAt).toLocaleString()}</span>
                  {activity.sentCount > 0 && (
                    <span>
                      Sent {activity.sentCount} {activity.sentCount === 1 ? 'time' : 'times'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openQuizActivity(activity.memberId)}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-amber-400"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Continue Here
                  </button>
                  <button
                    onClick={() => openQuizActivity(activity.memberId)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                  >
                    <Users className="w-4 h-4" />
                    Answer on Their Behalf
                  </button>
                  <button
                    onClick={() => void shareQuizLink(activity)}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20"
                  >
                    <Send className="w-4 h-4" />
                    {activity.lastSentAt ? 'Copy Quiz Link Again' : 'Send Quiz Link'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-place personality questionnaire: Continue Here / Answer on Their Behalf
          open it here rather than navigating away to the St Joseph dashboard. */}
      {quizMemberId && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setQuizMemberId(null)}
        >
          <div className="relative my-6 w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setQuizMemberId(null)}
              aria-label="Close questionnaire"
              className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-slate-800/90 p-2 text-slate-300 shadow-lg transition-colors hover:bg-slate-700 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="rounded-3xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl sm:backdrop-blur-xl sm:p-6">
              <Suspense fallback={<div className="py-16 text-center text-slate-400">Loading questionnaire…</div>}>
                <PersonalityQuiz initialMemberId={quizMemberId} />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Family Members Grid */}
      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading family engrams...</p>
        </div>
      ) : familyMembers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {familyMembers.map((member) => (
            <FamilyMemberCard
              key={member.id}
              member={member}
              onClick={() => {
                setSelectedMember(member);
                setViewMode('detail');
              }}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateEngramModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadFamilyMembers();
          }}
        />
      )}

      {/* Detail View */}
      {viewMode === 'detail' && selectedMember && (
        <EngramDetailView
          member={selectedMember}
          onBack={() => {
            setViewMode('grid');
            setSelectedMember(null);
          }}
          onRefresh={loadFamilyMembers}
        />
      )}
    </div>
  );
}

interface FamilyMemberCardProps {
  member: FamilyMember;
  onClick: () => void;
}

function FamilyMemberCard({ member, onClick }: FamilyMemberCardProps) {
  const timeSinceInteraction = member.last_interaction
    ? Math.floor((Date.now() - new Date(member.last_interaction).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const [sent, setSent] = useState(false);
  const handleSend = async () => {
    const res = await sendPersonalityQuestions(member.name, member.id);
    if (res.ok) { setSent(true); setTimeout(() => setSent(false), 2200); }
  };

  return (
    <div
      onClick={onClick}
      className="glass-card neon-border p-6 cursor-pointer group hover:scale-[1.02] transition-all duration-200"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-2 border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <Users className="w-8 h-8 text-cyan-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{member.name}</h3>
          <p className="text-sm text-slate-400 capitalize">{member.relationship}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
      </div>

      <div className="space-y-2 mb-4">
        {member.personality_traits.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {member.personality_traits.slice(0, 3).map((trait, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs border border-cyan-500/20"
              >
                {trait}
              </span>
            ))}
            {member.personality_traits.length > 3 && (
              <span className="px-2 py-1 rounded-lg bg-white/5 text-slate-400 text-xs">
                +{member.personality_traits.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); void handleSend(); }}
        title="Send the personality questionnaire to this person, no account needed"
        className="mb-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-semibold uppercase tracking-wider transition-all border border-cyan-500/20"
      >
        <Send className="w-3.5 h-3.5" />
        {sent ? 'Sent ✓' : 'Send Questions'}
      </button>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {member.moments_count} moments
          </span>
        </div>
        {timeSinceInteraction !== null && (
          <span className="text-xs text-slate-500">
            {timeSinceInteraction === 0 ? 'Today' : `${timeSinceInteraction}d ago`}
          </span>
        )}
      </div>
    </div>
  );
}

interface CreateEngramModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEngramModal({ onClose, onSuccess }: CreateEngramModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    birthDate: '',
    bio: '',
    personality_traits: [] as string[],
    interests: [] as string[],
    values: [] as string[],
  });
  const [newTrait, setNewTrait] = useState('');
  const [creating, setCreating] = useState(false);

  const relationshipOptions = [
    'Parent', 'Child', 'Sibling', 'Grandparent', 'Grandchild',
    'Spouse', 'Partner', 'Aunt', 'Uncle', 'Cousin', 'Other'
  ];

  const commonTraits = [
    'Kind', 'Funny', 'Wise', 'Caring', 'Creative', 'Energetic',
    'Patient', 'Adventurous', 'Thoughtful', 'Optimistic', 'Resilient'
  ];

  async function handleCreate() {
    if (!user?.id || !formData.name || !formData.relationship) return;

    setCreating(true);
    try {
      const { data: familyMember, error: memberError } = await supabase
        .from('family_members')
        .insert({
          user_id: user.id,
          name: formData.name,
          relationship: formData.relationship,
          birth_date: formData.birthDate || null,
          bio: formData.bio,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      const { error: engramError } = await supabase
        .from('engrams')
        .insert({
          user_id: user.id,
          family_member_id: familyMember.id,
          name: formData.name,
          personality_traits: [
            ...formData.personality_traits,
            ...formData.interests.map(i => `Interested in ${i}`),
            ...formData.values.map(v => `Values ${v}`)
          ],
          background_info: formData.bio,
          interaction_style: 'conversational',
          knowledge_domains: formData.interests,
        });

      if (engramError) throw engramError;

      onSuccess();
    } catch (error) {
      console.error('Error creating family engram:', error);
      notify('Failed to create family engram. Please try again.', 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900/90 sm:backdrop-blur-xl z-10">
          <div>
            <h3 className="text-2xl font-bold text-white">Create Family Engram</h3>
            <p className="text-sm text-slate-400 mt-1">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Basic Information</h4>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  placeholder="Enter family member's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Relationship *
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="">Select relationship</option>
                  {relationshipOptions.map((rel) => (
                    <option key={rel} value={rel.toLowerCase()}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Birth Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bio / Description
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  placeholder="Describe this person, their life, achievements, values..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Personality Traits</h4>
              <p className="text-sm text-slate-400">
                Select or add traits that best describe {formData.name || 'this person'}
              </p>

              <div className="flex flex-wrap gap-2">
                {commonTraits.map((trait) => {
                  const isSelected = formData.personality_traits.includes(trait);
                  return (
                    <button
                      key={trait}
                      onClick={() => {
                        if (isSelected) {
                          setFormData({
                            ...formData,
                            personality_traits: formData.personality_traits.filter((t) => t !== trait),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            personality_traits: [...formData.personality_traits, trait],
                          });
                        }
                      }}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-white border border-cyan-400'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {trait}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/10">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Add Custom Trait
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTrait}
                    onChange={(e) => setNewTrait(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTrait.trim()) {
                        setFormData({
                          ...formData,
                          personality_traits: [...formData.personality_traits, newTrait.trim()],
                        });
                        setNewTrait('');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    placeholder="Type a custom trait and press Enter"
                  />
                  <button
                    onClick={() => {
                      if (newTrait.trim()) {
                        setFormData({
                          ...formData,
                          personality_traits: [...formData.personality_traits, newTrait.trim()],
                        });
                        setNewTrait('');
                      }
                    }}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {formData.personality_traits.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm font-medium text-slate-300 mb-2">Selected Traits:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.personality_traits.map((trait, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm border border-cyan-500/30 flex items-center gap-2"
                      >
                        {trait}
                        <button
                          onClick={() => {
                            setFormData({
                              ...formData,
                              personality_traits: formData.personality_traits.filter((_, i) => i !== idx),
                            });
                          }}
                          className="hover:text-cyan-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Review & Create</h4>
              <p className="text-sm text-slate-400">
                Review the information and create your family engram
              </p>

              <div className="glass-card p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="text-lg font-semibold text-white">{formData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Relationship</p>
                  <p className="text-white capitalize">{formData.relationship}</p>
                </div>
                {formData.bio && (
                  <div>
                    <p className="text-sm text-slate-400">Bio</p>
                    <p className="text-white">{formData.bio}</p>
                  </div>
                )}
                {formData.personality_traits.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Personality Traits</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.personality_traits.map((trait, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm border border-cyan-500/30"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card p-4 bg-cyan-500/10 border-cyan-500/30">
                <p className="text-sm text-cyan-300">
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  After creation, you can add moments, memories, photos, and videos to build a richer personality.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex items-center justify-between sticky bottom-0 bg-slate-900/90 sm:backdrop-blur-xl">
          <button
            onClick={() => {
              if (step === 1) {
                onClose();
              } else {
                setStep(step - 1);
              }
            }}
            className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={() => {
              if (step === 3) {
                handleCreate();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={
              creating ||
              (step === 1 && (!formData.name || !formData.relationship))
            }
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {creating ? 'Creating...' : step === 3 ? 'Create Engram' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EngramDetailViewProps {
  member: FamilyMember;
  onBack: () => void;
  onRefresh: () => void;
}

function EngramDetailView({ member, onBack }: EngramDetailViewProps) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
        >
          ← Back to Family
        </button>

        <div className="glass-card p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">{member.name}</h2>
          <p className="text-slate-400 capitalize mb-6">{member.relationship}</p>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Moments</p>
              <p className="text-2xl font-bold text-white">{member.moments_count ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Interactions</p>
              <p className="text-2xl font-bold text-white">{member.interactions_count ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Status</p>
              <p className="text-2xl font-bold text-emerald-400">{member.last_interaction ? 'Active' : 'Training'}</p>
            </div>
          </div>

          {member.personality_traits && member.personality_traits.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-3">Personality</p>
              <div className="flex flex-wrap gap-2">
                {member.personality_traits.map((trait) => (
                  <span key={trait} className="px-3 py-1 rounded-full text-sm bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">{trait}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
