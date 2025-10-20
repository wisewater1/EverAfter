import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Trash2, Clock, CheckCircle, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  relationship: string;
  status: 'active' | 'pending' | 'inactive';
  access_level: string;
  invited_at: string;
  accepted_at?: string;
  personality_questions_sent: number;
  personality_questions_answered: number;
}

interface FamilyMembersProps {
  userId: string;
}

export default function FamilyMembers({ userId }: FamilyMembersProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    relationship: ''
  });
  const [questionText, setQuestionText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFamilyMembers();
  }, [userId]);

  const loadFamilyMembers = async () => {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setFamilyMembers(data.map(member => ({
        id: member.id,
        name: member.name,
        email: member.email,
        relationship: member.relationship,
        status: member.status,
        access_level: member.access_level || 'view',
        invited_at: member.invited_at,
        accepted_at: member.accepted_at,
        personality_questions_sent: 0,
        personality_questions_answered: 0
      })));
    }
  };

  const inviteFamilyMember = async () => {
    if (!inviteForm.name || !inviteForm.email || !inviteForm.relationship) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('family_members')
      .insert({
        user_id: userId,
        name: inviteForm.name,
        email: inviteForm.email,
        relationship: inviteForm.relationship,
        status: 'pending',
        access_level: 'view',
        invited_at: new Date().toISOString()
      });

    if (!error) {
      setInviteForm({ name: '', email: '', relationship: '' });
      setShowInviteModal(false);
      await loadFamilyMembers();
    } else {
      alert('Error inviting family member: ' + error.message);
    }
    setLoading(false);
  };

  const sendPersonalityQuestion = async () => {
    if (!questionText.trim() || !selectedMember) {
      alert('Please enter a question');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('family_personality_questions')
      .insert({
        user_id: userId,
        family_member_id: selectedMember.id,
        question_text: questionText,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (!error) {
      alert(`Question sent to ${selectedMember.name}! They'll receive it via email.`);
      setQuestionText('');
      setShowQuestionModal(false);
      setSelectedMember(null);
    } else {
      alert('Error sending question: ' + error.message);
    }
    setLoading(false);
  };

  const deleteFamilyMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) return;

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId);

    if (!error) {
      await loadFamilyMembers();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-900/30 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30';
      case 'inactive': return 'bg-gray-900/30 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-900/30 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-purple-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-light text-white mb-2">Family Members</h2>
              <p className="text-gray-400 leading-relaxed max-w-2xl">
                Invite family members and send them questions to build their personality profiles
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg font-medium flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Invite Family Member
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Members</p>
                <p className="text-2xl font-light text-white mt-1">{familyMembers.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Active</p>
                <p className="text-2xl font-light text-white mt-1">
                  {familyMembers.filter(m => m.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-light text-white mt-1">
                  {familyMembers.filter(m => m.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Family Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {familyMembers.map((member) => (
          <div
            key={member.id}
            className="bg-gray-800 rounded-xl shadow-lg border border-gray-700/50 p-6 hover:border-gray-600/50 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-lg">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{member.name}</h3>
                  <p className="text-sm text-gray-400">{member.relationship}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(member.status)}`}>
                {member.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Mail className="w-4 h-4 text-gray-400" />
                {member.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Clock className="w-4 h-4 text-gray-400" />
                Invited {new Date(member.invited_at).toLocaleDateString()}
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Questions sent</span>
                <span className="text-white font-medium">{member.personality_questions_sent}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-400">Questions answered</span>
                <span className="text-white font-medium">{member.personality_questions_answered}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedMember(member);
                  setShowQuestionModal(true);
                }}
                className="flex-1 px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Question
              </button>
              <button
                onClick={() => deleteFamilyMember(member.id)}
                className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {familyMembers.length === 0 && (
          <div className="col-span-2 bg-gray-800 rounded-xl border border-gray-700/50 p-12 text-center">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No family members yet</h3>
            <p className="text-gray-400 mb-6">Invite your family to start building their personality profiles</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg font-medium inline-flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Invite Your First Family Member
            </button>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-white">Invite Family Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Relationship</label>
                <input
                  type="text"
                  value={inviteForm.relationship}
                  onChange={(e) => setInviteForm({ ...inviteForm, relationship: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g., Mother, Father, Sibling, Child"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={inviteFamilyMember}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-white">Send Question to {selectedMember.name}</h3>
              <button
                onClick={() => {
                  setShowQuestionModal(false);
                  setSelectedMember(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Question</label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="What question would you like to ask?"
                />
              </div>
              <p className="text-sm text-gray-400">
                This question will be sent to {selectedMember.email} to help build their personality profile.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowQuestionModal(false);
                  setSelectedMember(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={sendPersonalityQuestion}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Sending...' : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Question
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
