import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Mail, Trash2, Clock, CheckCircle, X, Send, MessageCircle, Sparkles, User, Activity, Brain } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PersonalityProfileViewer from './PersonalityProfileViewer';

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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FamilyMembersProps {
  userId: string;
}

export default function FamilyMembers({ userId }: FamilyMembersProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    relationship: ''
  });
  const [questionText, setQuestionText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);

  const loadFamilyMembers = useCallback(async () => {
    const { data } = await supabase
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
  }, [userId]);

  useEffect(() => {
    loadFamilyMembers();
  }, [loadFamilyMembers]);

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

  const openChat = (member: FamilyMember) => {
    setSelectedMember(member);
    setChatMessages([
      {
        id: '1',
        role: 'assistant',
        content: `Hello! I'm the AI assistant helping manage ${member.name}'s profile. I can help you understand their personality, draft questions to send them, or provide insights based on their responses. How can I assist you today?`,
        timestamp: new Date()
      }
    ]);
    setShowChatModal(true);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedMember) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setAiTyping(true);

    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(chatInput, selectedMember),
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
      setAiTyping(false);
    }, 1500);
  };

  const generateAIResponse = (input: string, member: FamilyMember): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('question') || lowerInput.includes('ask')) {
      return `Great idea! Here are some meaningful questions you could ask ${member.name}:\n\n1. "What is your earliest childhood memory that still brings you joy?"\n2. "What values do you hope to pass on to future generations?"\n3. "Can you share a story about a time when you overcame a significant challenge?"\n\nWould you like me to help you craft a personalized question based on their ${member.relationship} relationship?`;
    }

    if (lowerInput.includes('personality') || lowerInput.includes('profile')) {
      return `${member.name}'s personality profile is currently being built. They have answered ${member.personality_questions_answered} out of ${member.personality_questions_sent} questions sent.\n\nTo get deeper insights, I recommend asking questions about:\n• Their core values and beliefs\n• Meaningful life experiences\n• Family traditions and memories\n• Future hopes and dreams\n\nWould you like me to suggest specific questions?`;
    }

    if (lowerInput.includes('status') || lowerInput.includes('active')) {
      return `${member.name} is currently ${member.status}. They were invited on ${new Date(member.invited_at).toLocaleDateString()}. ${member.status === 'active' ? 'They have been actively engaged with the platform!' : 'Consider sending them a reminder or reaching out directly to encourage participation.'}`;
    }

    if (lowerInput.includes('help') || lowerInput.includes('what can you')) {
      return `I can help you with:\n\n📝 Drafting personalized questions for ${member.name}\n🎯 Understanding their personality profile progress\n💡 Suggesting conversation topics\n📊 Tracking their engagement\n✉️ Crafting reminder messages\n\nJust ask me anything about ${member.name} or how to engage with them better!`;
    }

    return `I understand you're asking about ${member.name}. As their ${member.relationship}, you have a unique perspective on their life story. I can help you:\n\n• Create meaningful questions that capture their essence\n• Track their responses and build their personality profile\n• Suggest ways to deepen your understanding of them\n\nWhat specific aspect would you like to explore?`;
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
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
                  {familyMembers.filter(m => m.status?.toLowerCase() === 'active').length}
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
                  {familyMembers.filter(m => m.status?.toLowerCase() === 'pending').length}
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
            className="group relative bg-gradient-to-br from-slate-800/80 via-slate-800/50 to-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 overflow-hidden"
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-teal-500/0 to-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-slate-700/50 group-hover:ring-slate-600/50 transition-all">
                      <span className="text-white font-semibold text-xl">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {member.status?.toLowerCase() === 'active' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-0.5">{member.name}</h3>
                    <p className="text-sm text-slate-400 font-medium">{member.relationship}</p>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border backdrop-blur-sm ${getStatusColor(member.status)} capitalize`}>
                  {member.status}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-2.5 mb-5">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <span>Invited {new Date(member.invited_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-slate-900/70 backdrop-blur-sm rounded-xl p-4 mb-5 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Engagement</span>
                  </div>
                  <div className="px-2 py-0.5 bg-emerald-500/10 rounded-full">
                    <span className="text-xs font-bold text-emerald-400">
                      {member.personality_questions_sent > 0
                        ? Math.round((member.personality_questions_answered / member.personality_questions_sent) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1 font-medium">Sent</div>
                    <div className="text-xl font-light text-white tabular-nums">{member.personality_questions_sent}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1 font-medium">Answered</div>
                    <div className="text-xl font-light text-white tabular-nums">{member.personality_questions_answered}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setSelectedMember(member);
                    setShowProfileModal(true);
                  }}
                  className="col-span-2 px-4 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400 border border-purple-500/30 hover:border-purple-500/50 rounded-xl hover:from-purple-600/30 hover:to-pink-600/30 transition-all text-sm font-semibold flex items-center justify-center gap-2 group/btn"
                >
                  <Brain className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                  View Personality Profile
                </button>
                <button
                  onClick={() => openChat(member)}
                  className="px-4 py-3 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl hover:from-emerald-600/30 hover:to-teal-600/30 transition-all text-sm font-semibold flex items-center justify-center gap-2 group/btn"
                >
                  <MessageCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                  AI Chat
                </button>
                <button
                  onClick={() => {
                    setSelectedMember(member);
                    setShowQuestionModal(true);
                  }}
                  className="px-4 py-3 bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:border-sky-500/50 rounded-xl hover:bg-sky-600/30 transition-all text-sm font-semibold flex items-center justify-center gap-2 group/btn"
                >
                  <Send className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                  Question
                </button>
                <button
                  onClick={() => deleteFamilyMember(member.id)}
                  className="col-span-2 px-4 py-3 bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 rounded-xl hover:bg-rose-600/30 transition-all text-sm font-semibold flex items-center justify-center gap-2 group/btn"
                  title="Remove member"
                >
                  <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                  Remove Member
                </button>
              </div>
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

      {/* AI Chat Modal */}
      {showChatModal && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 max-w-2xl w-full h-[600px] flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="relative bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-sky-600/20 backdrop-blur-xl border-b border-slate-700/50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
                    <p className="text-sm text-slate-400">Helping with {selectedMember.name}'s profile</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowChatModal(false);
                    setSelectedMember(null);
                    setChatMessages([]);
                  }}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-sky-600/20 ring-2 ring-sky-500/30'
                        : 'bg-emerald-600/20 ring-2 ring-emerald-500/30'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-sky-600/30 to-sky-600/20 border border-sky-500/30 text-white'
                          : 'bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-slate-200'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs text-slate-500 mt-2 block">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {aiTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600/20 ring-2 ring-emerald-500/30">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t border-slate-700/50 p-4 bg-slate-900/50 backdrop-blur-xl">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder={`Ask about ${selectedMember.name}...`}
                  className="flex-1 px-4 py-3 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  disabled={aiTyping}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || aiTyping}
                  className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                AI can help draft questions, understand progress, and provide insights
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personality Profile Modal */}
      {showProfileModal && selectedMember && (
        <PersonalityProfileViewer
          familyMemberId={selectedMember.id}
          familyMemberName={selectedMember.name}
          familyMemberRelationship={selectedMember.relationship}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
}
