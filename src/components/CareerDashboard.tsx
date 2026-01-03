import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Briefcase,
  Target,
  Users,
  Mail,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  ExternalLink,
  Copy,
  Share2,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Settings
} from 'lucide-react';

interface CareerProfile {
  id: string;
  linkedin_summary?: string;
  current_role?: string;
  industry?: string;
  years_experience?: number;
  skills: string[];
  career_interests: string[];
  public_chat_enabled: boolean;
  public_chat_token?: string;
  public_chat_greeting?: string;
}

interface CareerGoal {
  id: string;
  goal_title: string;
  goal_description?: string;
  goal_category: string;
  status: string;
  priority: string;
  target_date?: string;
  progress_percentage: number;
  created_at: string;
}

interface CareerLead {
  id: string;
  visitor_email: string;
  visitor_name?: string;
  visitor_company?: string;
  opportunity_interest?: string;
  status: string;
  created_at: string;
}

interface UnknownQuestion {
  id: string;
  question_text: string;
  status: string;
  created_at: string;
}

export default function CareerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [goals, setGoals] = useState<CareerGoal[]>([]);
  const [leads, setLeads] = useState<CareerLead[]>([]);
  const [questions, setQuestions] = useState<UnknownQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  // Profile form state
  const [formData, setFormData] = useState({
    linkedin_summary: '',
    current_role: '',
    industry: '',
    years_experience: 0,
    skills: [] as string[],
    public_chat_enabled: false,
    public_chat_greeting: ''
  });
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchGoals(),
        fetchLeads(),
        fetchQuestions()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('career_profiles')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setProfile(data);
      setFormData({
        linkedin_summary: data.linkedin_summary || '',
        current_role: data.current_role || '',
        industry: data.industry || '',
        years_experience: data.years_experience || 0,
        skills: data.skills || [],
        public_chat_enabled: data.public_chat_enabled || false,
        public_chat_greeting: data.public_chat_greeting || ''
      });
    }
  };

  const fetchGoals = async () => {
    const { data } = await supabase
      .from('career_goals')
      .select('*')
      .eq('user_id', user?.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    setGoals(data || []);
  };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('career_leads')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setLeads(data || []);
  };

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('career_unknown_questions')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    setQuestions(data || []);
  };

  const saveProfile = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = await supabase.auth.getSession();

      const response = await fetch(`${supabaseUrl}/functions/v1/career-profile-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          generate_new_token: formData.public_chat_enabled && !profile?.public_chat_token
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setEditingProfile(false);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    await supabase
      .from('career_leads')
      .update({ status })
      .eq('id', leadId);
    fetchLeads();
  };

  const resolveQuestion = async (questionId: string) => {
    await supabase
      .from('career_unknown_questions')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', questionId);
    fetchQuestions();
  };

  const copyShareLink = async () => {
    if (profile?.public_chat_token) {
      const shareUrl = `${window.location.origin}/career/public/${profile.public_chat_token}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-green-400 bg-green-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-blue-400 bg-blue-500/20';
      case 'contacted': return 'text-yellow-400 bg-yellow-500/20';
      case 'qualified': return 'text-green-400 bg-green-500/20';
      case 'converted': return 'text-emerald-400 bg-emerald-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Career Profile</h2>
          </div>
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            {editingProfile ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
          </button>
        </div>

        {editingProfile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Role</label>
              <input
                type="text"
                value={formData.current_role}
                onChange={(e) => setFormData(prev => ({ ...prev, current_role: e.target.value }))}
                className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="e.g., Senior Software Engineer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="e.g., Technology"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Years of Experience</label>
                <input
                  type="number"
                  value={formData.years_experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Professional Summary</label>
              <textarea
                value={formData.linkedin_summary}
                onChange={(e) => setFormData(prev => ({ ...prev, linkedin_summary: e.target.value }))}
                className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px]"
                placeholder="Paste your LinkedIn summary or write a brief professional overview..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Skills</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm flex items-center gap-1"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 bg-gray-700/50 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Add a skill..."
                />
                <button
                  onClick={addSkill}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white font-medium">Public Chat</h3>
                  <p className="text-sm text-gray-400">Allow visitors to chat with your AI assistant</p>
                </div>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, public_chat_enabled: !prev.public_chat_enabled }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    formData.public_chat_enabled ? 'bg-indigo-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    formData.public_chat_enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {formData.public_chat_enabled && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Welcome Message</label>
                  <textarea
                    value={formData.public_chat_greeting}
                    onChange={(e) => setFormData(prev => ({ ...prev, public_chat_greeting: e.target.value }))}
                    className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[60px]"
                    placeholder="Custom greeting for visitors..."
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingProfile(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
              >
                Save Profile
              </button>
            </div>
          </div>
        ) : (
          <div>
            {profile ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{profile.current_role || 'No role set'}</h3>
                    <p className="text-gray-400">{profile.industry} {profile.years_experience ? `${profile.years_experience} years` : ''}</p>
                  </div>
                  {profile.public_chat_enabled && profile.public_chat_token && (
                    <button
                      onClick={copyShareLink}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500/30 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      <span className="text-sm">{copied ? 'Copied!' : 'Share Link'}</span>
                    </button>
                  )}
                </div>

                {profile.linkedin_summary && (
                  <p className="text-gray-300 text-sm">{profile.linkedin_summary}</p>
                )}

                {profile.skills && profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.slice(0, 8).map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                    {profile.skills.length > 8 && (
                      <span className="px-3 py-1 bg-gray-700/50 text-gray-400 rounded-full text-sm">
                        +{profile.skills.length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">No career profile set up yet</p>
                <button
                  onClick={() => setEditingProfile(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                >
                  Create Profile
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Target className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{goals.length}</p>
              <p className="text-sm text-gray-400">Active Goals</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{leads.filter(l => l.status === 'new').length}</p>
              <p className="text-sm text-gray-400">New Leads</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{questions.length}</p>
              <p className="text-sm text-gray-400">Pending Questions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Target className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Career Goals</h2>
          </div>
          <button className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {goals.length > 0 ? (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="p-4 bg-gray-700/30 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white font-medium">{goal.goal_title}</h3>
                    <p className="text-sm text-gray-400">{goal.goal_category}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(goal.priority)}`}>
                    {goal.priority}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${goal.progress_percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{goal.progress_percentage}% complete</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No career goals yet. Chat with your Career Agent to create some!</p>
        )}
      </div>

      {/* Leads Section */}
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Recent Leads</h2>
          </div>
        </div>

        {leads.length > 0 ? (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="p-4 bg-gray-700/30 rounded-lg flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium">{lead.visitor_name || lead.visitor_email}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                  {lead.visitor_company && (
                    <p className="text-sm text-gray-400">{lead.visitor_company}</p>
                  )}
                  {lead.opportunity_interest && (
                    <p className="text-sm text-gray-400 mt-1">{lead.opportunity_interest}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateLeadStatus(lead.id, 'contacted')}
                    className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                    title="Mark as contacted"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <a
                    href={`mailto:${lead.visitor_email}`}
                    className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                    title="Send email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No leads yet. Share your public chat link to start capturing leads!</p>
        )}
      </div>

      {/* Unknown Questions Section */}
      {questions.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Unanswered Questions</h2>
            </div>
          </div>

          <div className="space-y-3">
            {questions.map((question) => (
              <div key={question.id} className="p-4 bg-gray-700/30 rounded-lg flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white">{question.question_text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(question.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => resolveQuestion(question.id)}
                  className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                  title="Mark as resolved"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
