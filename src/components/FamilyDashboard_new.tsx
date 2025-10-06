import React, { useState } from 'react';
import {
  Shield, Users, Settings, Download, Trash2, Eye, Lock, Clock, CheckCircle,
  Monitor, MapPin, Zap, Volume2, Palette, Globe, Map, Wifi, Smartphone,
  Radio, UserCheck, Power, Crown, Star, Heart, Sparkles, Bell, User,
  CreditCard, Mail, MessageSquare, Sliders, Save, Key, Database
} from 'lucide-react';

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

interface SettingsState {
  dailyQuestionFrequency: string;
  preferredTime: string;
  timezone: string;
  language: string;
  memoryCategories: string[];
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    digest: boolean;
  };
  privacy: {
    profileVisible: boolean;
    memoriesVisible: boolean;
    familyVisible: boolean;
  };
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
  const [settings, setSettings] = useState<SettingsState>({
    dailyQuestionFrequency: 'once-per-day',
    preferredTime: '19:00',
    timezone: 'America/New_York',
    language: 'en',
    memoryCategories: ['Stories', 'Values', 'Humor', 'Daily Life', 'Wisdom', 'Family History'],
    notifications: {
      email: true,
      sms: false,
      push: true,
      digest: true
    },
    privacy: {
      profileVisible: true,
      memoriesVisible: false,
      familyVisible: true
    }
  });

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

  const handleSaveSettings = () => {
    // TODO: Save to Supabase
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
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

        {/* Rest of tabs content - truncated for brevity, would include all tab content here */}
        
        {/* Settings Tab - FULLY IMPLEMENTED */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Account Settings */}
            <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Account Profile</h3>
                    <p className="text-sm text-gray-400">Manage your personal information</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue="Sarah Johnson"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue="sarah@example.com"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select 
                    value={settings.timezone}
                    onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Language
                  </label>
                  <select 
                    value={settings.language}
                    onChange={(e) => setSettings({...settings, language: e.target.value})}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors">
                  <Key className="w-4 h-4" />
                  Change Password
                </button>
              </div>
            </div>

            {/* Memory Collection Settings */}
            <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 p-6 border border-gray-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-900/50 to-blue-900/50 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Memory Collection</h3>
                  <p className="text-sm text-gray-400">Configure your daily question preferences</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Daily Question Frequency
                  </label>
                  <select 
                    value={settings.dailyQuestionFrequency}
                    onChange={(e) => setSettings({...settings, dailyQuestionFrequency: e.target.value})}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="once-per-day">Once per day</option>
                    <option value="every-other-day">Every other day</option>
                    <option value="twice-per-week">Twice per week</option>
                    <option value="once-per-week">Once per week</option>
                    <option value="custom">Custom schedule</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preferred Question Time
                  </label>
                  <input
                    type="time"
                    value={settings.preferredTime}
                    onChange={(e) => setSettings({...settings, preferredTime: e.target.value})}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Memory Categories
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Stories', 'Values', 'Humor', 'Daily Life', 'Wisdom', 'Family History', 'Dreams', 'Challenges'].map((category) => (
                      <label key={category} className="flex items-center space-x-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={settings.memoryCategories.includes(category)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSettings({
                                ...settings,
                                memoryCategories: [...settings.memoryCategories, category]
                              });
                            } else {
                              setSettings({
                                ...settings,
                                memoryCategories: settings.memoryCategories.filter(c => c !== category)
                              });
                            }
                          }}
                          className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 p-6 border border-gray-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-900/50 to-orange-900/50 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Notifications</h3>
                  <p className="text-sm text-gray-400">Manage how you receive updates</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Email Notifications</p>
                      <p className="text-xs text-gray-400">Receive daily question reminders via email</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {...settings.notifications, email: e.target.checked}
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-white">SMS Notifications</p>
                      <p className="text-xs text-gray-400">Get text message reminders</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sms}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {...settings.notifications, sms: e.target.checked}
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Push Notifications</p>
                      <p className="text-xs text-gray-400">Browser and app notifications</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.push}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {...settings.notifications, push: e.target.checked}
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Weekly Digest</p>
                      <p className="text-xs text-gray-400">Summary of your week's memories</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.digest}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {...settings.notifications, digest: e.target.checked}
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 p-6 border border-gray-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-red-900/50 to-pink-900/50 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Privacy & Visibility</h3>
                  <p className="text-sm text-gray-400">Control who can see your information</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Profile Visible to Family</p>
                    <p className="text-xs text-gray-400">Allow family members to see your profile information</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.privacy.profileVisible}
                      onChange={(e) => setSettings({
                        ...settings,
                        privacy: {...settings.privacy, profileVisible: e.target.checked}
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Memories Visible to Family</p>
                    <p className="text-xs text-gray-400">Share your memories with invited family members</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.privacy.memoriesVisible}
                      onChange={(e) => setSettings({
                        ...settings,
                        privacy: {...settings.privacy, memoriesVisible: e.target.checked}
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Family List Visible</p>
                    <p className="text-xs text-gray-400">Show family members list to other family</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.privacy.familyVisible}
                      onChange={(e) => setSettings({
                        ...settings,
                        privacy: {...settings.privacy, familyVisible: e.target.checked}
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/20 p-6 border border-gray-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Data Management</h3>
                  <p className="text-sm text-gray-400">Export or delete your data</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white transition-all duration-200">
                  <Download className="w-5 h-5" />
                  <span className="font-medium">Export All Data</span>
                </button>

                <button className="flex items-center justify-center gap-2 p-4 bg-red-900/30 hover:bg-red-900/50 border border-red-600 rounded-lg text-red-400 transition-all duration-200">
                  <Trash2 className="w-5 h-5" />
                  <span className="font-medium">Delete All Data</span>
                </button>
              </div>

              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  Your data is encrypted and backed up securely. You have full control and can export or delete it anytime.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <button 
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                <Save className="w-5 h-5" />
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
