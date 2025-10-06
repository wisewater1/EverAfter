import React, { useState } from 'react';
import { Shield, Users, Settings, Download, Trash2, Eye, Lock, Clock, CheckCircle, Monitor, MapPin, Zap, Volume2, Palette, Globe, Map, Wifi, Smartphone, Radio, UserCheck, Power, Crown, Star, Heart, Sparkles } from 'lucide-react';

// Saints AI Engram System
interface Saint {
  id: string;
  name: string;
  title: string;
  description: string;
  responsibilities: string[];
  tier: 'classic' | 'premium';
  price?: number;
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
    description: 'Autonomous AI focused on emotional healing, comfort, and spiritual guidance during grief.',
    responsibilities: ['Grief counseling', 'Emotional support', 'Healing rituals', 'Comfort messages'],
    tier: 'classic',
    active: true,
    icon: Heart,
    todayActivities: 7,
    weeklyActivities: 23,
    lastActive: '12 minutes ago'
  },
  {
    id: 'michael',
    name: 'St. Michael',
    title: 'The Protector',
    description: 'Guardian AI that manages security, privacy protection, and digital legacy preservation.',
    responsibilities: ['Security monitoring', 'Privacy protection', 'Data integrity', 'Access control'],
    tier: 'classic',
    active: true,
    icon: Shield,
    todayActivities: 12,
    weeklyActivities: 45,
    lastActive: '3 minutes ago'
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
    action: 'Comfort Message Sent',
    description: 'Sent personalized comfort message to Emma during difficult moment',
    timestamp: '2024-01-20T13:45:00Z',
    status: 'completed',
    impact: 'high',
    category: 'support',
    details: 'Detected emotional distress through voice analysis, provided gentle guidance'
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
    action: 'Memory Preservation',
    description: 'Automatically backed up and encrypted today\'s memory responses',
    timestamp: '2024-01-20T11:30:00Z',
    status: 'completed',
    impact: 'medium',
    category: 'memory',
    details: 'Processed 2 new memories, applied emotional context analysis'
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
    action: 'Family Check-in',
    description: 'Sent gentle wellness check to Michael Johnson after missed daily question',
    timestamp: '2024-01-20T09:20:00Z',
    status: 'completed',
    impact: 'low',
    category: 'family',
    details: 'Noticed 2-day absence, sent caring reminder without pressure'
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

export default function FamilyDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSaint, setSelectedSaint] = useState<string | null>(null);
  const [showActivityDetails, setShowActivityDetails] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const familyMembers = [
    { name: 'Sarah Johnson', role: 'Primary', status: 'Active', lastActive: '2 hours ago' },
    { name: 'Michael Johnson', role: 'Family', status: 'Active', lastActive: '1 day ago' },
    { name: 'Emma Johnson', role: 'Family', status: 'Pending', lastActive: 'Never' },
  ];

  const recentActivities = [
    { action: 'Memory recorded', user: 'Sarah', time: '2 hours ago', type: 'story' },
    { action: 'Privacy settings updated', user: 'Michael', time: '1 day ago', type: 'settings' },
    { action: 'Family member invited', user: 'Sarah', time: '3 days ago', type: 'invite' },
  ];

  const handleInvite = () => {
    if (inviteEmail) {
      // Simulate sending invite
      console.log('Inviting:', inviteEmail);
      setInviteEmail('');
      setShowInviteModal(false);
      // Show success message
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleSettingsToggle = () => {
    setShowSettings(!showSettings);
  };

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
              <button className="mt-6 w-full border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 hover:bg-gray-700/30 transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-gray-500/25">
                <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-300">Invite Family Member</span>
              </button>
            </div>
          </div>
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
                    saint.active 
                      ? 'border-blue-600 bg-blue-900/20 shadow-blue-500/25' 
                      : saint.tier === 'premium' 
                        ? 'border-amber-600 bg-amber-900/20 shadow-amber-500/25' 
                        : 'border-gray-600 bg-gray-700/30 shadow-gray-900/20'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                          saint.active 
                            ? 'bg-blue-900/50 shadow-blue-500/25' 
                            : saint.tier === 'premium' 
                              ? 'bg-amber-900/50 shadow-amber-500/25' 
                              : 'bg-gray-700 shadow-gray-500/25'
                        }`}>
                          <saint.icon className={`w-5 h-5 ${
                            saint.active 
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
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full shadow-sm">
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
                      {saint.price && (
                        <span className="text-lg font-semibold text-white">${saint.price}/month</span>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {saint.active && (
                          <button
                            onClick={() => setSelectedSaint(selectedSaint === saint.id ? null : saint.id)}
                            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-all duration-200"
                          >
                            View Activity
                          </button>
                        )}
                        <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
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
      </div>
    </div>
  );
}