import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Mail, Trash2, Clock, CheckCircle, X, Send, MessageCircle, Download, Upload, FileText, Database, Package, Calendar, Sparkles, User, Activity, Brain, SkipForward, Heart, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PersonalityProfileViewer from './PersonalityProfileViewer';
import DailyQuestionCard from './DailyQuestionCard';
import StRaphaelHealthHub from './StRaphaelHealthHub';
import PersonalityMediaUploader from './PersonalityMediaUploader';

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

interface QuestionResponse {
  id: string;
  question: string;
  response: string;
  timestamp: string;
  member_name: string;
}

interface UnifiedFamilyInterfaceProps {
  userId: string;
  onNavigateToLegacy: () => void;
  preselectedAIId?: string;
}

export default function UnifiedFamilyInterface({ userId, onNavigateToLegacy, preselectedAIId }: UnifiedFamilyInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'questions' | 'daily-questions' | 'media' | 'export' | 'st-raphael'>(preselectedAIId ? 'daily-questions' : 'members');
  const [raphaelEngramId, setRaphaelEngramId] = useState<string>('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [questionResponses, setQuestionResponses] = useState<QuestionResponse[]>([]);
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
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [selectedExportData, setSelectedExportData] = useState({
    members: true,
    questions: true,
    responses: true,
    profiles: true
  });

  const loadFamilyMembers = useCallback(async () => {
    const { data } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setFamilyMembers(data);
  }, [userId]);

  const loadQuestionResponses = useCallback(async () => {
    const { data } = await supabase
      .from('daily_question_responses')
      .select(`
        id,
        question_text,
        response_text,
        created_at,
        archetypal_ais!inner(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setQuestionResponses(data.map(item => ({
        id: item.id,
        question: item.question_text,
        response: item.response_text,
        timestamp: item.created_at,
        member_name: (item.archetypal_ais as any)?.name || 'Unknown'
      })));
    }
  }, [userId]);

  // Load St. Raphael engram ID
  useEffect(() => {
    async function fetchRaphaelEngram() {
      const { data } = await supabase
        .from('archetypal_ais')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'St. Raphael')
        .limit(1)
        .maybeSingle();

      if (data) {
        setRaphaelEngramId(data.id);
      }
    }
    fetchRaphaelEngram();
  }, [userId]);

  useEffect(() => {
    loadFamilyMembers();
    loadQuestionResponses();
  }, [loadFamilyMembers, loadQuestionResponses]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('family_members')
        .insert([{
          user_id: userId,
          name: inviteForm.name,
          email: inviteForm.email,
          relationship: inviteForm.relationship,
          status: 'pending',
          access_level: 'viewer',
          personality_questions_sent: 0,
          personality_questions_answered: 0
        }]);

      if (error) throw error;

      setShowInviteModal(false);
      setInviteForm({ name: '', email: '', relationship: '' });
      loadFamilyMembers();
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !questionText.trim()) return;

    setLoading(true);
    try {
      await supabase
        .from('family_members')
        .update({
          personality_questions_sent: selectedMember.personality_questions_sent + 1
        })
        .eq('id', selectedMember.id);

      setShowQuestionModal(false);
      setQuestionText('');
      setSelectedMember(null);
      loadFamilyMembers();
    } catch (error) {
      console.error('Error sending question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) return;

    try {
      await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);

      loadFamilyMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const exportData: any = {
        exported_at: new Date().toISOString(),
        user_id: userId
      };

      if (selectedExportData.members) {
        exportData.family_members = familyMembers;
      }

      if (selectedExportData.questions || selectedExportData.responses) {
        exportData.question_responses = questionResponses;
      }

      if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'csv') {
        let csvContent = 'Type,Name,Email,Relationship,Status,Date\n';
        familyMembers.forEach(member => {
          csvContent += `Member,"${member.name}","${member.email}","${member.relationship}","${member.status}","${member.invited_at}"\n`;
        });
        questionResponses.forEach(response => {
          csvContent += `Response,"${response.member_name}","","${response.question}","${response.response}","${response.timestamp}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family-data-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToLegacyVault = async () => {
    if (!confirm('Send selected family data to Legacy Vault? This will preserve it for future generations.')) return;

    setLoading(true);
    try {
      const legacyData = {
        type: 'family_archive',
        created_at: new Date().toISOString(),
        members: selectedExportData.members ? familyMembers : [],
        questions: selectedExportData.questions ? questionResponses : [],
        metadata: {
          export_date: new Date().toISOString(),
          total_members: familyMembers.length,
          total_responses: questionResponses.length
        }
      };

      const { error } = await supabase
        .from('user_files')
        .insert([{
          user_id: userId,
          file_name: `Family Archive - ${new Date().toLocaleDateString()}`,
          file_type: 'application/json',
          file_size: JSON.stringify(legacyData).length,
          storage_path: `legacy/${userId}/family-archive-${Date.now()}.json`,
          metadata: { type: 'family_archive', auto_generated: true }
        }]);

      if (error) throw error;

      alert('Family data successfully sent to Legacy Vault!');
      onNavigateToLegacy();
    } catch (error) {
      console.error('Error sending to Legacy Vault:', error);
      alert('Failed to send data to Legacy Vault. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Family Hub</h2>
              <p className="text-sm text-slate-400">Manage family members, questions, and legacy data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          </div>
        </div>

        {/* Tab Navigation - Mobile Optimized */}
        <div className="flex gap-1 sm:gap-2 border-b border-slate-700/50 overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-all relative touch-manipulation ${
              activeTab === 'members'
                ? 'text-blue-400'
                : 'text-slate-400 hover:text-slate-300 active:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">Members</span>
            </div>
            {activeTab === 'members' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('daily-questions')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-all relative touch-manipulation ${
              activeTab === 'daily-questions'
                ? 'text-blue-400'
                : 'text-slate-400 hover:text-slate-300 active:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">Daily Questions</span>
            </div>
            {activeTab === 'daily-questions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-all relative touch-manipulation ${
              activeTab === 'questions'
                ? 'text-blue-400'
                : 'text-slate-400 hover:text-slate-300 active:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">Responses</span>
            </div>
            {activeTab === 'questions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-all relative touch-manipulation ${
              activeTab === 'media'
                ? 'text-purple-400'
                : 'text-slate-400 hover:text-slate-300 active:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">Media</span>
            </div>
            {activeTab === 'media' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('st-raphael')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-all relative touch-manipulation ${
              activeTab === 'st-raphael'
                ? 'text-teal-400'
                : 'text-slate-400 hover:text-slate-300 active:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">St. Raphael</span>
            </div>
            {activeTab === 'st-raphael' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-all relative touch-manipulation ${
              activeTab === 'export'
                ? 'text-blue-400'
                : 'text-slate-400 hover:text-slate-300 active:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">Export</span>
            </div>
            {activeTab === 'export' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
            )}
          </button>
        </div>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {familyMembers.map((member) => (
            <div
              key={member.id}
              className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6 hover:border-slate-700/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{member.name}</h3>
                    <p className="text-xs text-slate-400">{member.relationship}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {member.status === 'active' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : member.status === 'pending' ? (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <X className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Mail className="w-3 h-3" />
                  {member.email}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Activity className="w-3 h-3" />
                  {member.personality_questions_answered} / {member.personality_questions_sent} questions answered
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedMember(member);
                    setShowQuestionModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white rounded-lg transition-all text-xs font-medium flex items-center justify-center gap-2"
                >
                  <Send className="w-3 h-3" />
                  Send Question
                </button>
                <button
                  onClick={() => {
                    setSelectedMember(member);
                    setShowProfileModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-lg transition-all text-xs font-medium flex items-center justify-center gap-2"
                >
                  <Brain className="w-3 h-3" />
                  Profile
                </button>
                <button
                  onClick={() => handleDeleteMember(member.id)}
                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-all text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {familyMembers.length === 0 && (
            <div className="col-span-full bg-slate-900/30 border border-dashed border-slate-700/50 rounded-xl p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">No Family Members Yet</h3>
              <p className="text-sm text-slate-500 mb-4">Start building your family network by inviting members</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium"
              >
                Invite Your First Member
              </button>
            </div>
          )}
        </div>
      )}

      {/* Daily Questions Tab */}
      {activeTab === 'daily-questions' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-base sm:text-lg font-semibold text-white">Answer Your Daily Questions</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Build your digital legacy by answering meaningful questions about your life, memories, and experiences.
            </p>
          </div>
          <DailyQuestionCard userId={userId} preselectedAIId={preselectedAIId} />
        </div>
      )}

      {/* Questions/Responses Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {questionResponses.map((response) => (
            <div
              key={response.id}
              className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4 sm:p-6 touch-manipulation"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base text-white font-medium truncate">{response.member_name}</h3>
                    <p className="text-xs text-slate-400">
                      {new Date(response.timestamp).toLocaleDateString()} at {new Date(response.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-slate-500 mb-1">Question</p>
                  <p className="text-xs sm:text-sm text-white break-words">{response.question}</p>
                </div>
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-blue-400 mb-1">Response</p>
                  <p className="text-xs sm:text-sm text-slate-300 break-words">{response.response}</p>
                </div>
              </div>
            </div>
          ))}

          {questionResponses.length === 0 && (
            <div className="bg-slate-900/30 border border-dashed border-slate-700/50 rounded-xl p-12 text-center">
              <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">No Question Responses Yet</h3>
              <p className="text-sm text-slate-500">Responses from family members will appear here</p>
            </div>
          )}
        </div>
      )}

      {/* Media Tab */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <Image className="w-6 h-6 text-purple-400" />
              Personality Media Library
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Enhance personality profiles with photos, videos, voice recordings, and documents
            </p>
          </div>
          <PersonalityMediaUploader
            userId={userId}
            onMediaAdded={loadFamilyMembers}
          />
        </div>
      )}

      {/* St. Raphael Health Hub Tab */}
      {activeTab === 'st-raphael' && (
        <StRaphaelHealthHub userId={userId} raphaelEngramId={raphaelEngramId} />
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Export Configuration */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              Select Data to Export
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-all">
                <input
                  type="checkbox"
                  checked={selectedExportData.members}
                  onChange={(e) => setSelectedExportData({ ...selectedExportData, members: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">Family Members ({familyMembers.length})</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-all">
                <input
                  type="checkbox"
                  checked={selectedExportData.questions}
                  onChange={(e) => setSelectedExportData({ ...selectedExportData, questions: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <MessageCircle className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">Questions & Responses ({questionResponses.length})</span>
              </label>
            </div>
          </div>

          {/* Export Format */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Export Format
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setExportFormat('json')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  exportFormat === 'json'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Database className="w-6 h-6 mx-auto mb-2" />
                <p className="text-xs font-medium">JSON</p>
              </button>
              <button
                onClick={() => setExportFormat('csv')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  exportFormat === 'csv'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <FileText className="w-6 h-6 mx-auto mb-2" />
                <p className="text-xs font-medium">CSV</p>
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                disabled
                className="p-4 rounded-lg border-2 bg-slate-800/20 border-slate-700/30 text-slate-600 cursor-not-allowed"
              >
                <FileText className="w-6 h-6 mx-auto mb-2" />
                <p className="text-xs font-medium">PDF (Soon)</p>
              </button>
            </div>
          </div>

          {/* Export Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleExportData}
              disabled={loading}
              className="p-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-8 h-8 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">Download Data</h3>
              <p className="text-xs text-blue-100">Export to your device</p>
            </button>
            <button
              onClick={handleSendToLegacyVault}
              disabled={loading}
              className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-8 h-8 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">Send to Legacy Vault</h3>
              <p className="text-xs text-purple-100">Preserve for future generations</p>
            </button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Invite Family Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Relationship</label>
                <input
                  type="text"
                  value={inviteForm.relationship}
                  onChange={(e) => setInviteForm({ ...inviteForm, relationship: e.target.value })}
                  placeholder="e.g., Parent, Sibling, Child"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all font-medium disabled:opacity-50"
              >
                {loading ? 'Sending Invite...' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Send Question to {selectedMember.name}</h3>
              <button
                onClick={() => {
                  setShowQuestionModal(false);
                  setSelectedMember(null);
                  setQuestionText('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your Question</label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="What would you like to ask?"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 h-32 resize-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send Question'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">{selectedMember.name}'s Profile</h3>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setSelectedMember(null);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <PersonalityProfileViewer userId={userId} targetMemberId={selectedMember.id} />
          </div>
        </div>
      )}
    </div>
  );
}
