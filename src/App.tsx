import React, { useState, useEffect } from 'react';
import { Shield, Users, Settings, Download, Trash2, Eye, Lock, Clock, CheckCircle, Monitor, MapPin, Zap, Volume2, Palette, Globe, Map, Wifi, Smartphone, Radio, UserCheck, Power, Crown, Star, Heart, Sparkles, MessageCircle, X, Send, Plus, Brain } from 'lucide-react';
import DailyQuestionCard from './components/DailyQuestionCard';
import CustomEngramsDashboard from './components/CustomEngramsDashboard';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';

// Saints AI Engram System
interface Saint {
  id: string;
  name: string;
  title: string;
  description: string;
  responsibilities: string[];
  tier: 'classic' | 'premium';
  price?: number;
  stripeProductId?: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  todayActivities: number;
  weeklyActivities: number;
  lastActive: string;
}

interface SaintActivity {
  id: string;
  saintId: string;
  action: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'in_progress' | 'scheduled';
  impact: 'high' | 'medium' | 'low';
  category: 'communication' | 'support' | 'protection' | 'memory' | 'family' | 'charity';
  details?: string;
}

const saints: Saint[] = [
  {
    id: 'raphael',
    name: 'St. Raphael',
    title: 'The Healer',
    description: 'Free autonomous AI agent for health management. Schedules appointments, manages prescriptions, tracks wellness, and handles all health-related tasks in the background.',
    responsibilities: ['Doctor appointments', 'Prescription management', 'Health tracking', 'Wellness coordination'],
    tier: 'classic',
    active: true,
    icon: Heart,
    todayActivities: 12,
    weeklyActivities: 47,
    lastActive: 'Active now'
  },
  {
    id: 'michael',
    name: 'St. Michael',
    title: 'The Protector',
    description: 'Guardian AI that manages security, privacy protection, and digital legacy preservation.',
    responsibilities: ['Security monitoring', 'Privacy protection', 'Data integrity', 'Access control'],
    tier: 'premium',
    price: 24.99,
    stripeProductId: 'prod_TGgf0y2frZTlxo',
    active: false,
    icon: Shield,
    todayActivities: 0,
    weeklyActivities: 0,
    lastActive: 'Never'
  },
  {
    id: 'martin',
    name: 'St. Martin of Tours',
    title: 'The Compassionate',
    description: 'Premium AI specializing in charitable acts, community building, and legacy philanthropy.',
    responsibilities: ['Charitable giving', 'Community outreach', 'Legacy donations', 'Compassionate acts'],
    tier: 'premium',
    price: 29.99,
    active: false,
    icon: Crown,
    todayActivities: 0,
    weeklyActivities: 0,
    lastActive: 'Never'
  },
  {
    id: 'agatha',
    name: 'St. Agatha of Sicily',
    title: 'The Resilient',
    description: 'Premium AI focused on strength, perseverance, and helping families overcome challenges.',
    responsibilities: ['Crisis support', 'Resilience building', 'Family strength', 'Overcoming adversity'],
    tier: 'premium',
    price: 34.99,
    active: false,
    icon: Star,
    todayActivities: 0,
    weeklyActivities: 0,
    lastActive: 'Never'
  }
];

// Today's Saint Activities
const todayActivities: SaintActivity[] = [
  {
    id: '1',
    saintId: 'michael',
    action: 'Security Scan Completed',
    description: 'Performed comprehensive security audit of all family member accounts',
    timestamp: '2024-01-20T14:30:00Z',
    status: 'completed',
    impact: 'high',
    category: 'protection',
    details: 'Scanned 3 family accounts, updated 2 weak passwords, enabled 2FA on 1 account'
  },
  {
    id: '2',
    saintId: 'raphael',
    action: 'Doctor Appointment Scheduled',
    description: 'Scheduled annual checkup with Dr. Sarah Chen for next Tuesday at 2:00 PM',
    timestamp: '2024-01-20T13:45:00Z',
    status: 'completed',
    impact: 'high',
    category: 'support',
    details: 'Found available slot that matches user preferences, sent calendar invite and confirmation'
  },
  {
    id: '3',
    saintId: 'michael',
    action: 'Privacy Settings Updated',
    description: 'Automatically adjusted privacy settings based on new family member invitation',
    timestamp: '2024-01-20T12:15:00Z',
    status: 'completed',
    impact: 'medium',
    category: 'protection',
    details: 'Updated access permissions for Emma Johnson, maintained security protocols'
  },
  {
    id: '4',
    saintId: 'raphael',
    action: 'Prescription Refill Ordered',
    description: 'Automatically ordered refill for blood pressure medication at CVS Pharmacy',
    timestamp: '2024-01-20T11:30:00Z',
    status: 'completed',
    impact: 'medium',
    category: 'memory',
    details: 'Detected low supply (3 days remaining), ordered 90-day refill, ready for pickup tomorrow'
  },
  {
    id: '5',
    saintId: 'michael',
    action: 'Threat Detection',
    description: 'Blocked 3 suspicious login attempts from unknown locations',
    timestamp: '2024-01-20T10:45:00Z',
    status: 'completed',
    impact: 'high',
    category: 'protection',
    details: 'Detected attempts from Russia, China, and Nigeria. All blocked successfully.'
  },
  {
    id: '6',
    saintId: 'raphael',
    action: 'Lab Results Retrieved',
    description: 'Retrieved and organized recent blood work results from patient portal',
    timestamp: '2024-01-20T09:20:00Z',
    status: 'completed',
    impact: 'low',
    category: 'family',
    details: 'All values within normal range, flagged vitamin D level for discussion with doctor'
  },
  {
    id: '7',
    saintId: 'michael',
    action: 'Data Integrity Check',
    description: 'Verified integrity of all stored memories and family data',
    timestamp: '2024-01-20T08:00:00Z',
    status: 'completed',
    impact: 'medium',
    category: 'protection',
    details: 'Checked 247 memories, all checksums verified, no corruption detected'
  },
  {
    id: '8',
    saintId: 'raphael',
    action: 'Emotional Analysis',
    description: 'Analyzed recent responses for emotional patterns and well-being indicators',
    timestamp: '2024-01-20T07:30:00Z',
    status: 'completed',
    impact: 'medium',
    category: 'support',
    details: 'Detected positive emotional trend, noted increased storytelling frequency'
  }
];

interface ArchetypalAI {
  id: string;
  name: string;
  description: string;
  personality_traits: any;
  total_memories: number;
  training_status: 'untrained' | 'training' | 'ready';
  avatar_url?: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface FamilyMember {
  id?: string;
  name: string;
  email: string;
  relationship: string;
  role?: string;
  status: string;
  lastActive?: string;
  access_level?: string;
}

interface AgentTask {
  id: string;
  user_id: string;
  saint_id: string;
  task_type: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'scheduled';
  priority: 'low' | 'medium' | 'high';
  details: any;
  result: any;
  scheduled_for?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export default function FamilyDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSaint, setSelectedSaint] = useState<string | null>(null);
  const [showActivityDetails, setShowActivityDetails] = useState<string | null>(null);
  const [showRaphaelAgentMode, setShowRaphaelAgentMode] = useState(false);

  // Agent Task State
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    task_type: 'appointment',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // AI State
  const [archetypalAI, setArchetypalAI] = useState<ArchetypalAI | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showCreateAI, setShowCreateAI] = useState(false);
  const [aiMessages, setAIMessages] = useState<AIMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [aiName, setAiName] = useState('');

  // Family State
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    relationship: ''
  });

  // Load user's Archetypal AI and agent tasks
  useEffect(() => {
    if (user) {
      loadArchetypalAI();
      loadFamilyMembers();
      loadAgentTasks();
    }
  }, [user]);

  // Reload agent tasks when modal opens
  useEffect(() => {
    if (showRaphaelAgentMode && user) {
      loadAgentTasks();
      const interval = setInterval(loadAgentTasks, 5000);
      return () => clearInterval(interval);
    }
  }, [showRaphaelAgentMode, user]);

  const loadArchetypalAI = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('archetypal_ais')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setArchetypalAI(data);
    }
  };

  const loadFamilyMembers = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id);

    if (data) {
      setFamilyMembers(data.map(member => ({
        id: member.id,
        name: member.name,
        email: member.email,
        relationship: member.relationship,
        role: 'Family',
        status: member.status,
        lastActive: member.accepted_at ? 'Recently' : 'Never',
        access_level: member.access_level
      })));
    }
  };

  const loadAgentTasks = async () => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-agent-tasks?saint_id=raphael`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAgentTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error loading agent tasks:', error);
    }
  };

  const createAgentTask = async () => {
    if (!user || !newTask.title) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-agent-tasks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...newTask,
            saint_id: 'raphael',
          }),
        }
      );

      if (response.ok) {
        setNewTask({
          task_type: 'appointment',
          title: '',
          description: '',
          priority: 'medium',
        });
        setShowCreateTask(false);
        await loadAgentTasks();
      }
    } catch (error) {
      console.error('Error creating agent task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-agent-tasks`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task_id: taskId,
            status,
          }),
        }
      );

      if (response.ok) {
        await loadAgentTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const createArchetypalAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !aiName) return;

    const { data } = await supabase
      .from('archetypal_ais')
      .insert({
        user_id: user.id,
        name: aiName,
        training_status: 'training'
      })
      .select()
      .single();

    if (data) {
      setArchetypalAI(data);
      setShowCreateAI(false);
      setAiName('');
    }
  };

  const startConversation = async () => {
    if (!user || !archetypalAI) return;

    const { data } = await supabase
      .from('ai_conversations')
      .insert({
        ai_id: archetypalAI.id,
        user_id: user.id,
        title: 'New Conversation'
      })
      .select()
      .single();

    if (data) {
      setConversationId(data.id);
      setShowAIChat(true);
      setAIMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !conversationId) return;

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: currentMessage,
      created_at: new Date().toISOString()
    };

    setAIMessages(prev => [...prev, userMessage]);
    const messageContent = currentMessage;
    setCurrentMessage('');

    await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: messageContent
    });

    setTimeout(async () => {
      const aiResponse: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `As ${archetypalAI?.name}, I understand you're saying: "${messageContent}". Based on your memories and personality traits I've learned from your daily responses, I can share my perspective on this...`,
        created_at: new Date().toISOString()
      };

      setAIMessages(prev => [...prev, aiResponse]);

      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse.content
      });
    }, 1000);
  };

  const handleSaintActivation = async (saint: Saint) => {
    if (!user) return;

    if (saint.tier === 'premium' && !saint.active && saint.stripeProductId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          alert('Please sign in to subscribe to premium Saints');
          return;
        }

        const checkoutResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              price_id: saint.stripeProductId,
              success_url: `${window.location.origin}?saint_activated=${saint.id}`,
              cancel_url: `${window.location.origin}?tab=saints`,
              mode: 'subscription',
            }),
          }
        );

        if (checkoutResponse.ok) {
          const { url } = await checkoutResponse.json();
          if (url) {
            window.location.href = url;
          }
        } else {
          const errorData = await checkoutResponse.json();
          alert(`Failed to start checkout: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error activating saint:', error);
        alert('Failed to activate Saint. Please try again.');
      }
    } else if (saint.tier === 'classic') {
      alert('Classic Saints activation coming soon!');
    }
  };

  const inviteFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { data } = await supabase
      .from('family_members')
      .insert({
        user_id: user.id,
        name: inviteForm.name,
        email: inviteForm.email,
        relationship: inviteForm.relationship,
        status: 'Pending',
        access_level: 'View'
      })
      .select()
      .single();

    if (data) {
      await loadFamilyMembers();
      setShowInviteModal(false);
      setInviteForm({ name: '', email: '', relationship: '' });
    }
  };

  const recentActivities = [
    { action: 'Memory recorded', user: 'Sarah', time: '2 hours ago', type: 'story' },
    { action: 'Privacy settings updated', user: 'Michael', time: '1 day ago', type: 'settings' },
    { action: 'Family member invited', user: 'Sarah', time: '3 days ago', type: 'invite' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-light text-gray-900 mb-1">Family Dashboard</h1>
          <p className="text-sm text-gray-600">Manage your digital legacy with privacy and control</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-800 rounded-lg shadow-sm mb-6 border border-gray-700/50">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-6 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'members', label: 'Family Members', icon: Users },
                { id: 'custom-engrams', label: 'Custom Engrams', icon: Brain },
                { id: 'saints', label: 'Saints AI', icon: Sparkles },
                { id: 'projection', label: 'Projection', icon: Monitor },
                { id: 'privacy', label: 'Privacy & Security', icon: Shield },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center space-x-2 py-3 px-1 border-b-2 text-sm transition-colors relative ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 bg-blue-900/20'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                  {activeTab === id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-teal-600/10 rounded-t-lg"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Daily Question Card */}
            {user && <DailyQuestionCard userId={user.id} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 p-5 border border-gray-700/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Memories</p>
                    <p className="text-2xl font-light text-white mt-1">247</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">+12 this week</p>
              </div>

              <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 p-5 border border-gray-700/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Family</p>
                    <p className="text-2xl font-light text-white mt-1">2</p>
                  </div>
                  <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/25">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">1 pending invitation</p>
              </div>

              <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 p-5 border border-gray-700/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Privacy</p>
                    <p className="text-2xl font-light text-white mt-1">100%</p>
                  </div>
                  <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/25">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">All measures active</p>
              </div>

              <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 p-5 border border-gray-700/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Days</p>
                    <p className="text-2xl font-light text-white mt-1">89</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">276 remaining</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 p-5 border border-gray-700/50 backdrop-blur-sm">
              <h3 className="text-base font-medium text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'story' ? 'bg-blue-500' :
                      activity.type === 'settings' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200">{activity.action}</p>
                      <p className="text-xs text-gray-400">by {activity.user} • {activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Family Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 backdrop-blur-sm">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Family Members</h3>
              <p className="text-sm text-gray-300">Manage who has access to memories and their permissions</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {familyMembers.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg shadow-sm hover:shadow-md hover:shadow-gray-500/25 transition-all duration-200 backdrop-blur-sm">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center shadow-lg shadow-gray-500/25">
                        <span className="text-sm font-medium text-gray-200">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{member.name}</p>
                        <p className="text-sm text-gray-400">{member.role} • Last active {member.lastActive}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        member.status === 'Active' 
                          ? 'bg-green-100 text-green-800 shadow-sm' 
                          : 'bg-yellow-100 text-yellow-800 shadow-sm'
                      }`}>
                        {member.status}
                      </span>
                      <button className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700/50 transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="mt-6 w-full border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 hover:bg-gray-700/30 transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-gray-500/25"
              >
                <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-300">Invite Family Member</span>
              </button>
            </div>
          </div>
        )}

        {/* Custom Engrams Tab */}
        {activeTab === 'custom-engrams' && user && (
          <CustomEngramsDashboard userId={user.id} />
        )}

        {/* Saints AI Tab */}
        {activeTab === 'saints' && (
          <div className="space-y-6">
            {/* Saints AI Overview */}
            <div className="bg-gray-800 rounded-xl shadow-lg shadow-gray-900/20 border border-gray-700/50 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Saints AI Engrams</h3>
                  <p className="text-sm text-gray-400">Autonomous AI profiles that handle responsibilities based on your wishes</p>
                </div>
              </div>
              {/* Today's Activity Summary */}
              <div className="mb-8 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-700/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base font-medium text-white">Today's Activities</h4>
                      <p className="text-sm text-gray-400">Your Saints completed {todayActivities.length} tasks today</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-light text-white">{todayActivities.length}</div>
                    <div className="text-xs text-gray-400">Completed</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">Protection</span>
                    </div>
                    <div className="text-lg font-semibold text-blue-400">
                      {todayActivities.filter(a => a.category === 'protection').length}
                    </div>
                    <div className="text-xs text-gray-400">Security actions</div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="w-4 h-4 text-pink-400" />
                      <span className="text-sm font-medium text-white">Support</span>
                    </div>
                    <div className="text-lg font-semibold text-pink-400">
                      {todayActivities.filter(a => a.category === 'support').length}
                    </div>
                    <div className="text-xs text-gray-400">Comfort actions</div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-white">Memory</span>
                    </div>
                    <div className="text-lg font-semibold text-green-400">
                      {todayActivities.filter(a => a.category === 'memory').length}
                    </div>
                    <div className="text-xs text-gray-400">Memory actions</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {saints.map((saint) => (
                  <div key={saint.id} className={`border-2 rounded-xl p-6 transition-all duration-200 shadow-lg backdrop-blur-sm ${
                    saint.active && saint.id === 'raphael'
                      ? 'border-green-600 bg-green-900/20 shadow-green-500/25'
                      : saint.active
                        ? 'border-blue-600 bg-blue-900/20 shadow-blue-500/25'
                        : saint.tier === 'premium'
                          ? 'border-amber-600 bg-amber-900/20 shadow-amber-500/25'
                          : 'border-gray-600 bg-gray-700/30 shadow-gray-900/20'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                          saint.active && saint.id === 'raphael'
                            ? 'bg-green-900/50 shadow-green-500/25'
                            : saint.active
                              ? 'bg-blue-900/50 shadow-blue-500/25'
                              : saint.tier === 'premium'
                                ? 'bg-amber-900/50 shadow-amber-500/25'
                                : 'bg-gray-700 shadow-gray-500/25'
                        }`}>
                          <saint.icon className={`w-5 h-5 ${
                            saint.active && saint.id === 'raphael'
                              ? 'text-green-400'
                              : saint.active
                                ? 'text-blue-600'
                                : saint.tier === 'premium'
                                  ? 'text-amber-600'
                                  : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="text-base font-medium text-white">{saint.name}</h4>
                          <p className="text-sm text-gray-400">{saint.title}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {saint.tier === 'premium' && (
                          <span className="px-2 py-1 bg-amber-900/30 text-amber-400 text-xs font-medium rounded-full border border-amber-700/30 shadow-sm">
                            Premium
                          </span>
                        )}
                        {saint.active && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 mb-4 leading-relaxed">{saint.description}</p>

                    {/* Today's Activity Stats */}
                    {saint.active && (
                      <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">Today's Activity</span>
                          <span className="text-xs text-gray-400">{saint.lastActive}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-white">{saint.todayActivities}</span>
                            <span className="text-xs text-gray-400">today</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-white">{saint.weeklyActivities}</span>
                            <span className="text-xs text-gray-400">this week</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-300 mb-2 uppercase tracking-wide">Responsibilities</h5>
                      <div className="flex flex-wrap gap-1">
                        {saint.responsibilities.map((responsibility, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full shadow-sm">
                            {responsibility}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        {saint.price ? (
                          <span className="text-lg font-semibold text-white">${saint.price}/month</span>
                        ) : saint.tier === 'classic' && saint.active ? (
                          <span className="px-3 py-1 bg-green-900/30 text-green-400 text-sm font-medium rounded-full border border-green-700/30">
                            FREE
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {saint.active && (
                          <button
                            onClick={() => {
                              if (saint.id === 'raphael') {
                                setShowRaphaelAgentMode(true);
                              } else {
                                setSelectedSaint(selectedSaint === saint.id ? null : saint.id);
                              }
                            }}
                            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-all duration-200"
                          >
                            {saint.id === 'raphael' ? 'View Agent Mode' : 'View Activity'}
                          </button>
                        )}
                        <button
                          onClick={() => handleSaintActivation(saint)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          saint.active
                            ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 shadow-sm hover:shadow-red-500/25'
                            : saint.tier === 'premium'
                              ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-500/25'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25'
                        }`}>
                          {saint.active ? 'Deactivate' : saint.tier === 'premium' ? 'Subscribe' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Activity Feed */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Today's Activity Feed</h3>
                    <p className="text-sm text-gray-400">Real-time actions performed by your Saints</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">Live</span>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {todayActivities
                  .filter(activity => selectedSaint ? activity.saintId === selectedSaint : true)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((activity) => {
                    const saint = saints.find(s => s.id === activity.saintId);
                    const timeAgo = new Date(Date.now() - new Date(activity.timestamp).getTime()).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });
                    
                    return (
                      <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            saint?.active ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            {saint && <saint.icon className={`w-5 h-5 ${saint.active ? 'text-blue-600' : 'text-gray-600'}`} />}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <h4 className="text-sm font-medium text-white">{activity.action}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                activity.impact === 'high' ? 'bg-red-100 text-red-800' :
                                activity.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {activity.impact} impact
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {timeAgo}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-300 mb-2">{activity.description}</p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">by {saint?.name}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                activity.category === 'protection' ? 'bg-blue-100 text-blue-800' :
                                activity.category === 'support' ? 'bg-pink-100 text-pink-800' :
                                activity.category === 'memory' ? 'bg-green-100 text-green-800' :
                                activity.category === 'family' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {activity.category}
                              </span>
                            </div>
                            
                            {activity.details && (
                              <button
                                onClick={() => setShowActivityDetails(showActivityDetails === activity.id ? null : activity.id)}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                {showActivityDetails === activity.id ? 'Hide Details' : 'View Details'}
                              </button>
                            )}
                          </div>
                          
                          {showActivityDetails === activity.id && activity.details && (
                            <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-600/50">
                              <p className="text-xs text-gray-300 leading-relaxed">{activity.details}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {selectedSaint && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => setSelectedSaint(null)}
                    className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    ← Show all Saints activity
                  </button>
                </div>
              )}
            </div>
            {/* Performance Analytics */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700/50 p-6">
              <h3 className="text-lg font-medium text-white mb-6">Saints Performance Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-base font-medium text-white mb-4">Activity Categories</h4>
                  <div className="space-y-3">
                    {[
                      { category: 'protection', label: 'Security & Protection', count: todayActivities.filter(a => a.category === 'protection').length, color: 'blue' },
                      { category: 'support', label: 'Emotional Support', count: todayActivities.filter(a => a.category === 'support').length, color: 'pink' },
                      { category: 'memory', label: 'Memory Preservation', count: todayActivities.filter(a => a.category === 'memory').length, color: 'green' },
                      { category: 'family', label: 'Family Care', count: todayActivities.filter(a => a.category === 'family').length, color: 'purple' }
                    ].map((item) => (
                      <div key={item.category} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                        <span className="text-sm text-gray-300">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            item.color === 'blue' ? 'bg-blue-500' :
                            item.color === 'pink' ? 'bg-pink-500' :
                            item.color === 'green' ? 'bg-green-500' :
                            'bg-purple-500'
                          }`}></div>
                          <span className="text-sm font-semibold text-white">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-base font-medium text-white mb-4">Impact Levels</h4>
                  <div className="space-y-3">
                    {[
                      { impact: 'high', label: 'High Impact Actions', count: todayActivities.filter(a => a.impact === 'high').length, color: 'red' },
                      { impact: 'medium', label: 'Medium Impact Actions', count: todayActivities.filter(a => a.impact === 'medium').length, color: 'yellow' },
                      { impact: 'low', label: 'Low Impact Actions', count: todayActivities.filter(a => a.impact === 'low').length, color: 'green' }
                    ].map((item) => (
                      <div key={item.impact} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                        <span className="text-sm text-gray-300">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            item.color === 'red' ? 'bg-red-500' :
                            item.color === 'yellow' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></div>
                          <span className="text-sm font-semibold text-white">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projection Tab */}
        {activeTab === 'projection' && (
          <div className="space-y-6">
            {/* Projection Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Memorial Projection</h3>
                    <p className="text-sm text-gray-500">3D holographic presence system</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Active</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Location</span>
                  </div>
                  <p className="text-xs text-gray-600">Memorial Garden, Section A</p>
                  <p className="text-xs text-gray-500 mt-1">Geofenced • 50ft radius</p>
                </div>
                
                <div className="bg-gray-50/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">Power</span>
                  </div>
                  <p className="text-xs text-gray-600">Solar + Battery</p>
                  <p className="text-xs text-gray-500 mt-1">87% charged</p>
                </div>
                
                <div className="bg-gray-50/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">Security</span>
                  </div>
                  <p className="text-xs text-gray-600">Encrypted</p>
                  <p className="text-xs text-gray-500 mt-1">Family access only</p>
                </div>
              </div>
            </div>

            {/* Virtual Environment */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100/50 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Virtual Environment</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Environment Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Garden', active: true, color: 'green' },
                      { name: 'Library', active: false, color: 'blue' },
                      { name: 'Beach', active: false, color: 'cyan' },
                      { name: 'Home', active: false, color: 'orange' }
                    ].map((theme) => (
                      <button
                        key={theme.name}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          theme.active
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Ambient Settings</label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Background Audio</span>
                      </div>
                      <select className="text-xs border border-gray-200 rounded px-2 py-1">
                        <option>Gentle Nature</option>
                        <option>Soft Piano</option>
                        <option>Ocean Waves</option>
                        <option>Silent</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Lighting</span>
                      </div>
                      <select className="text-xs border border-gray-200 rounded px-2 py-1">
                        <option>Warm Sunset</option>
                        <option>Soft Daylight</option>
                        <option>Golden Hour</option>
                        <option>Moonlight</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Weather Effects</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Geofencing Map */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-green-100 rounded-xl flex items-center justify-center">
                    <Map className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Ancestral Projection Map</h3>
                    <p className="text-sm text-gray-500">Geofenced activation zones and family tracking</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">3 Active Zones</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Connected</span>
                  </div>
                </div>
              </div>

              {/* Map Container */}
              <div className="relative bg-gradient-to-br from-green-50 to-blue-50 rounded-xl h-80 mb-6 overflow-hidden border border-gray-200/50">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 opacity-20">
                  <div className="w-full h-full bg-gradient-to-br from-green-200 via-blue-200 to-purple-200"></div>
                </div>
                
                {/* Memorial Garden Zone */}
                <div className="absolute top-16 left-20 w-32 h-24 border-2 border-purple-400 border-dashed rounded-lg bg-purple-100/30 flex items-center justify-center">
                  <div className="text-center">
                    <Monitor className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                    <span className="text-xs font-medium text-purple-700">Memorial Garden</span>
                    <div className="text-xs text-purple-600 mt-1">50ft radius</div>
                  </div>
                </div>
                
                {/* Home Zone */}
                <div className="absolute top-32 right-24 w-28 h-20 border-2 border-blue-400 border-dashed rounded-lg bg-blue-100/30 flex items-center justify-center">
                  <div className="text-center">
                    <Monitor className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <span className="text-xs font-medium text-blue-700">Family Home</span>
                    <div className="text-xs text-blue-600 mt-1">25ft radius</div>
                  </div>
                </div>
                
                {/* Sacred Space Zone */}
                <div className="absolute bottom-20 left-32 w-24 h-24 border-2 border-green-400 border-dashed rounded-lg bg-green-100/30 flex items-center justify-center">
                  <div className="text-center">
                    <Monitor className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <span className="text-xs font-medium text-green-700">Sacred Space</span>
                    <div className="text-xs text-green-600 mt-1">30ft radius</div>
                  </div>
                </div>
                
                {/* Family Member Indicators */}
                <div className="absolute top-20 left-28 w-3 h-3 bg-purple-600 rounded-full animate-pulse shadow-lg">
                  <div className="absolute -top-6 -left-4 text-xs font-medium text-purple-700 whitespace-nowrap">Sarah</div>
                </div>
                
                <div className="absolute bottom-32 right-16 w-3 h-3 bg-blue-600 rounded-full animate-pulse shadow-lg">
                  <div className="absolute -top-6 -left-6 text-xs font-medium text-blue-700 whitespace-nowrap">Michael</div>
                </div>
                
                {/* Legend */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                  <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 border border-purple-400 border-dashed bg-purple-100/50 rounded-sm"></div>
                      <span className="text-xs text-gray-600">Active Zone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <span className="text-xs text-gray-600">Family Member</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Methods */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-4">Verification Methods</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Radio className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">RFID Tracking</span>
                          <p className="text-xs text-gray-500">Wearable family tokens</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Active</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-green-600" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">Mobile App</span>
                          <p className="text-xs text-gray-500">EverAfter companion app</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Connected</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-4 h-4 text-purple-600" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">Biometric Scan</span>
                          <p className="text-xs text-gray-500">Fingerprint + facial recognition</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Enabled</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Power className="w-4 h-4 text-orange-600" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">Physical Apparatus</span>
                          <p className="text-xs text-gray-500">Memorial activation button</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Installed</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-4">Activation Settings</h4>
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-900">Auto-Activation</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">Projection activates when family enters geofenced area</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-900">Manual Override</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">Allow family to manually activate via app or physical button</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Activation Delay</span>
                        <span className="text-xs text-gray-600">3 seconds</span>
                      </div>
                      <input type="range" min="0" max="10" defaultValue="3" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      <p className="text-xs text-gray-500 mt-1">Delay before projection appears after verification</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Session Duration</span>
                        <span className="text-xs text-gray-600">15 minutes</span>
                      </div>
                      <select className="w-full text-sm border border-gray-200 rounded px-3 py-2">
                        <option>5 minutes</option>
                        <option>10 minutes</option>
                        <option selected>15 minutes</option>
                        <option>30 minutes</option>
                        <option>Until family leaves</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">How long projection remains active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100/50 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Geofenced Access Control</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Authorized Family Members</label>
                  <div className="space-y-2">
                    {familyMembers.filter(member => member.status === 'Active').map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900">{member.name}</span>
                        </div>
                        <button className="text-xs text-red-600 hover:text-red-800">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Access Permissions</label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">View Projection</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Interact with Projection</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Modify Settings</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy & Security Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            {/* St. Michael - Security Guardian */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl shadow-lg p-8 border border-blue-700/50">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-700/50 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-8 h-8 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-1">St. Michael</h3>
                    <p className="text-blue-200">The Protector</p>
                    <p className="text-sm text-blue-300 mt-2">Guardian AI that manages security, privacy protection, and digital legacy preservation.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-200">Active</span>
                </div>
              </div>

              <div className="mb-6 p-4 bg-blue-800/30 rounded-lg border border-blue-600/30">
                <div className="text-sm font-medium text-blue-200 uppercase tracking-wide mb-3">Today's Activity</div>
                <div className="flex items-center gap-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-2xl font-semibold text-white">12</span>
                    </div>
                    <span className="text-sm text-blue-300">today</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-2xl font-semibold text-white">45</span>
                    </div>
                    <span className="text-sm text-blue-300">this week</span>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-sm text-blue-300">Last Active</div>
                    <div className="text-base font-medium text-white">3 minutes ago</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-800/30 rounded-lg p-4 border border-blue-600/30">
                  <div className="text-sm text-blue-300 mb-1">Security monitoring</div>
                  <div className="text-xs text-blue-200">Real-time protection</div>
                </div>
                <div className="bg-blue-800/30 rounded-lg p-4 border border-blue-600/30">
                  <div className="text-sm text-blue-300 mb-1">Privacy protection</div>
                  <div className="text-xs text-blue-200">Data encryption</div>
                </div>
                <div className="bg-blue-800/30 rounded-lg p-4 border border-blue-600/30">
                  <div className="text-sm text-blue-300 mb-1">Data integrity</div>
                  <div className="text-xs text-blue-200">Checksums verified</div>
                </div>
                <div className="bg-blue-800/30 rounded-lg p-4 border border-blue-600/30">
                  <div className="text-sm text-blue-300 mb-1">Access control</div>
                  <div className="text-xs text-blue-200">Permissions managed</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-6 py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-medium transition-all">
                  View Activity
                </button>
                <button className="px-6 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-lg font-medium transition-all">
                  Deactivate
                </button>
              </div>
            </div>

            {/* Security Overview */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-6">Security Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-300">Two-Factor Auth</span>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-xs text-gray-400">Enabled on all accounts</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-300">Data Encryption</span>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-xs text-gray-400">AES-256 encryption active</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-300">Backup Status</span>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-xs text-gray-400">Last backup: 2 hours ago</p>
                </div>
              </div>
            </div>

            {/* Privacy Controls */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-6">Privacy Controls</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">Profile Visibility</div>
                    <p className="text-xs text-gray-400">Control who can see your profile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">Memory Sharing</div>
                    <p className="text-xs text-gray-400">Allow family access to memories</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">Activity Tracking</div>
                    <p className="text-xs text-gray-400">Track usage and engagement</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-6">Data Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="flex items-center gap-3 p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-all text-left">
                  <Download className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Export Data</div>
                    <p className="text-xs text-gray-400">Download all your data</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-all text-left">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Delete Account</div>
                    <p className="text-xs text-gray-400">Permanently remove data</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Profile Settings */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-6">Profile Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input type="text" defaultValue="Sarah Johnson" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input type="email" defaultValue="sarah@example.com" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                  <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                    <option>America/New_York (EST)</option>
                    <option>America/Chicago (CST)</option>
                    <option>America/Denver (MST)</option>
                    <option>America/Los_Angeles (PST)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                  <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
              </div>
              <button className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all">
                Save Changes
              </button>
            </div>

            {/* Notification Preferences */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">Email Notifications</div>
                    <p className="text-xs text-gray-400">Receive updates via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">Push Notifications</div>
                    <p className="text-xs text-gray-400">Browser notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">Daily Digest</div>
                    <p className="text-xs text-gray-400">Summary of daily activities</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Question Settings */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-6">Daily Question Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Question Frequency</label>
                  <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                    <option>Once per day</option>
                    <option>Twice per day</option>
                    <option>Three times per day</option>
                    <option>Four times per day</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Time</label>
                  <input type="time" defaultValue="19:00" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* Account Security */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-6">Account Security</h3>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-all text-left">
                  <div>
                    <div className="text-sm font-medium text-white">Change Password</div>
                    <p className="text-xs text-gray-400">Update your account password</p>
                  </div>
                  <Lock className="w-5 h-5 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-all text-left">
                  <div>
                    <div className="text-sm font-medium text-white">Two-Factor Authentication</div>
                    <p className="text-xs text-gray-400">Enabled on all accounts</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-all text-left">
                  <div>
                    <div className="text-sm font-medium text-white">Active Sessions</div>
                    <p className="text-xs text-gray-400">Manage logged in devices</p>
                  </div>
                  <Monitor className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating AI Chat Button */}
        {archetypalAI && (
          <button
            onClick={startConversation}
            className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
          >
            <MessageCircle className="w-7 h-7 text-white" />
            <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Chat with {archetypalAI.name}
            </span>
          </button>
        )}

        {/* Create AI Button if no AI exists */}
        {!archetypalAI && user && (
          <button
            onClick={() => setShowCreateAI(true)}
            className="fixed bottom-8 right-8 bg-gradient-to-br from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your AI
          </button>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Invite Family Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={inviteFamilyMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Relationship</label>
                <select
                  value={inviteForm.relationship}
                  onChange={(e) => setInviteForm({ ...inviteForm, relationship: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create AI Modal */}
      {showCreateAI && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Create Your Archetypal AI</h3>
              <button
                onClick={() => setShowCreateAI(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-300 text-sm mb-6">
              Your AI will learn from your daily question responses to create a digital representation
              of your personality, wisdom, and experiences. Give it a name!
            </p>

            <form onSubmit={createArchetypalAI} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">AI Name</label>
                <input
                  type="text"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="e.g., My Digital Twin, GrandmaBot, Future Me"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateAI(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Create AI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {showAIChat && archetypalAI && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full h-[600px] flex flex-col border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{archetypalAI.name}</h3>
                  <p className="text-xs text-gray-400">
                    {archetypalAI.training_status === 'ready' ? 'Ready to chat' : 'Learning from your memories...'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAIChat(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.length === 0 && (
                <div className="text-center text-gray-400 mt-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Start a conversation with {archetypalAI.name}</p>
                  <p className="text-sm mt-2">Your AI has learned from {archetypalAI.total_memories} memories</p>
                </div>
              )}

              {aiMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* St. Raphael Agent Mode Modal */}
      {showRaphaelAgentMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-green-900/20 rounded-2xl shadow-2xl border border-gray-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl blur-lg opacity-50 animate-pulse"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white flex items-center gap-2">
                    St. Raphael Agent Mode
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                      ACTIVE
                    </span>
                  </h2>
                  <p className="text-sm text-gray-400">Real-time health management in progress</p>
                </div>
              </div>
              <button
                onClick={() => setShowRaphaelAgentMode(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Create Task Button */}
              <div className="mb-6">
                <button
                  onClick={() => setShowCreateTask(!showCreateTask)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/25"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Health Task</span>
                </button>
              </div>

              {/* Create Task Form */}
              {showCreateTask && (
                <div className="mb-6 p-4 bg-gray-700/30 border border-gray-600 rounded-lg space-y-4">
                  <h3 className="text-lg font-medium text-white">New Health Task</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Task Type</label>
                    <select
                      value={newTask.task_type}
                      onChange={(e) => setNewTask({...newTask, task_type: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="appointment">Doctor Appointment</option>
                      <option value="prescription">Prescription Refill</option>
                      <option value="lab_results">Lab Results</option>
                      <option value="insurance">Insurance Verification</option>
                      <option value="wellness">Wellness Check</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      placeholder="e.g., Schedule annual checkup"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      placeholder="Additional details..."
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value as 'low' | 'medium' | 'high'})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={createAgentTask}
                      disabled={!newTask.title}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Task
                    </button>
                    <button
                      onClick={() => setShowCreateTask(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Current Tasks Banner */}
              {agentTasks.filter(t => t.status === 'in_progress').map(task => (
                <div key={task.id} className="mb-6 p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-400 uppercase tracking-wide">Currently Processing</span>
                  </div>
                  <p className="text-white font-medium">{task.title}</p>
                  {task.description && <p className="text-sm text-gray-400 mt-1">{task.description}</p>}
                </div>
              ))}

              {/* Activity Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Health Tasks</h3>
                  <span className="text-sm text-gray-400">{agentTasks.length} total tasks</span>
                </div>

                {/* Task Items */}
                {agentTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No tasks yet. Create your first health task above!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agentTasks.map((task) => {
                      const statusConfig = {
                        completed: { color: 'green', icon: CheckCircle, text: 'Completed' },
                        in_progress: { color: 'blue', icon: Loader, text: 'In Progress' },
                        pending: { color: 'yellow', icon: Clock, text: 'Pending' },
                        scheduled: { color: 'gray', icon: Clock, text: 'Scheduled' },
                        failed: { color: 'red', icon: X, text: 'Failed' }
                      };
                      const config = statusConfig[task.status];
                      const StatusIcon = config.icon;

                      return (
                        <div key={task.id} className={`p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:border-${config.color}-500/30 transition-all`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-8 h-8 bg-${config.color}-900/50 rounded-lg flex items-center justify-center`}>
                                <StatusIcon className={`w-4 h-4 text-${config.color}-400 ${task.status === 'in_progress' ? 'animate-spin' : ''}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium truncate">{task.title}</h4>
                                <p className="text-xs text-gray-400">
                                  {new Date(task.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 bg-${config.color}-900/30 text-${config.color}-400 text-xs rounded-full border border-${config.color}-700/30`}>
                                {config.text}
                              </span>
                              {task.status === 'pending' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-all"
                                >
                                  Start
                                </button>
                              )}
                              {task.status === 'in_progress' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'completed')}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-all"
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-300 mb-2 ml-11">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 ml-11 text-xs text-gray-500">
                            <span className={`px-2 py-1 bg-gray-800 rounded capitalize`}>
                              {task.task_type.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded ${
                              task.priority === 'high' ? 'bg-red-900/30 text-red-400' :
                              task.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {task.priority} priority
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}