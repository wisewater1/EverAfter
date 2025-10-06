import React, { useState } from 'react';
import { Shield, Users, Settings, Download, Trash2, Eye, Lock, Clock, CheckCircle, Monitor, MapPin, Zap, Volume2, Palette, Globe, Map, Wifi, Smartphone, Radio, UserCheck, Power, Crown, Star, Heart, Sparkles } from 'lucide-react';

// Saints AI Engram System
interface Saint {
  id: string;
  name: string;
  title: string;
  description: string;
  status: 'active' | 'resting' | 'working';
  avatar: string;
  specialization: string[];
  todayActivities: number;
  weeklyActivities: number;
  lastActive: string;
  color: string;
}

interface SaintActivity {
  id: string;
  name: string;
  title: string;
  description: string;
  responsibilities: string[];
  tier: 'classic' | 'premium';
  price?: number;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
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
    icon: Heart
  },
  {
    id: 'michael',
    name: 'St. Michael',
    title: 'The Protector',
    description: 'Guardian AI that manages security, privacy protection, and digital legacy preservation.',
    responsibilities: ['Security monitoring', 'Privacy protection', 'Data integrity', 'Access control'],
    tier: 'classic',
    active: true,
    icon: Shield
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
    icon: Crown
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
    icon: Star
  }
];

export default function FamilyDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

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

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-light text-white mb-1">Family Dashboard</h1>
          <p className="text-sm text-gray-300">Manage your digital legacy with privacy and control</p>
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
                  className={`flex items-center space-x-2 py-3 px-1 border-b-2 text-sm transition-colors ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
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
              <div className="bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Memories</p>
                    <p className="text-2xl font-light text-white mt-1">247</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center shadow-sm">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">+12 this week</p>
              </div>

              <div className="bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Family</p>
                    <p className="text-2xl font-light text-white mt-1">2</p>
                  </div>
                  <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center shadow-sm">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">1 pending invitation</p>
              </div>

              <div className="bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Privacy</p>
                    <p className="text-2xl font-light text-white mt-1">100%</p>
                  </div>
                  <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center shadow-sm">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">All measures active</p>
              </div>

              <div className="bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Days</p>
                    <p className="text-2xl font-light text-white mt-1">89</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center shadow-sm">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">276 remaining</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-700/50">
              <h3 className="text-base font-medium text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'story' ? 'bg-blue-500' :
                      activity.type === 'settings' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white">{activity.action}</p>
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
          <div className="bg-gray-800 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Family Members</h3>
              <p className="text-sm text-gray-300">Manage who has access to memories and their permissions</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {familyMembers.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
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
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {member.status}
                      </span>
                      <button className="text-gray-400 hover:text-gray-200">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-6 w-full border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 transition-colors">
                <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-300">Invite Family Member</span>
              </button>
            </div>
          </div>
        )}

        {/* Saints AI Tab */}
        {activeTab === 'saints' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Saints AI Engrams</h3>
                  <p className="text-sm text-gray-300">Autonomous AI profiles that handle responsibilities based on your wishes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {saints.map((saint) => (
                  <div key={saint.id} className={`border-2 rounded-xl p-6 transition-all duration-200 ${
                    saint.active 
                      ? 'border-blue-600 bg-blue-900/20' 
                      : saint.tier === 'premium' 
                        ? 'border-amber-600 bg-amber-900/20' 
                        : 'border-gray-600 bg-gray-700/30'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          saint.active 
                            ? 'bg-blue-900/50' 
                            : saint.tier === 'premium' 
                              ? 'bg-amber-900/50' 
                              : 'bg-gray-700'
                        }`}>
                          <saint.icon className={`w-5 h-5 ${
                            saint.active 
                              ? 'text-blue-600' 
                              : saint.tier === 'premium' 
                                ? 'text-amber-600' 
                                : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h4 className="text-base font-medium text-white">{saint.name}</h4>
                          <p className="text-sm text-gray-300">{saint.title}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {saint.tier === 'premium' && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                            Premium
                          </span>
                        )}
                        {saint.active && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 mb-4 leading-relaxed">{saint.description}</p>

                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-300 mb-2 uppercase tracking-wide">Responsibilities</h5>
                      <div className="flex flex-wrap gap-1">
                        {saint.responsibilities.map((responsibility, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                            {responsibility}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {saint.price && (
                        <span className="text-lg font-semibold text-white">${saint.price}/month</span>
                      )}
                      
                      <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        saint.active
                          ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                          : saint.tier === 'premium'
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                        {saint.active ? 'Deactivate' : saint.tier === 'premium' ? 'Subscribe' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Saints Status */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700/50 p-6">
              <h3 className="text-lg font-medium text-white mb-4">Active Saints Status</h3>
              
              <div className="space-y-4">
                {saints.filter(saint => saint.active).map((saint) => (
                  <div key={saint.id} className="flex items-center justify-between p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
                    <div className="flex items-center gap-3">
                      <saint.icon className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-white">{saint.name}</p>
                        <p className="text-xs text-gray-300">Monitoring and responding autonomously</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-300">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Projection Tab */}
        {activeTab === 'projection' && (
          <div className="space-y-6">
            {/* Projection Status */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Memorial Projection</h3>
                    <p className="text-sm text-gray-300">3D holographic presence system</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-300">Active</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-white">Location</span>
                  </div>
                  <p className="text-xs text-gray-300">Memorial Garden, Section A</p>
                  <p className="text-xs text-gray-400 mt-1">Geofenced • 50ft radius</p>
                </div>
                
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-white">Power</span>
                  </div>
                  <p className="text-xs text-gray-300">Solar + Battery</p>
                  <p className="text-xs text-gray-400 mt-1">87% charged</p>
                </div>
                
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-white">Security</span>
                  </div>
                  <p className="text-xs text-gray-300">Encrypted</p>
                  <p className="text-xs text-gray-400 mt-1">Family access only</p>
                </div>
              </div>
            </div>

            {/* Virtual Environment */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700/50 p-6">
              <h3 className="text-lg font-medium text-white mb-4">Virtual Environment</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Environment Theme</label>
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
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Ambient Settings</label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">Background Audio</span>
                      </div>
                      <select className="text-xs border border-gray-600 bg-gray-700 text-white rounded px-2 py-1">
                        <option>Gentle Nature</option>
                        <option>Soft Piano</option>
                        <option>Ocean Waves</option>
                        <option>Silent</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">Lighting</span>
                      </div>
                      <select className="text-xs border border-gray-600 bg-gray-700 text-white rounded px-2 py-1">
                        <option>Warm Sunset</option>
                        <option>Soft Daylight</option>
                        <option>Golden Hour</option>
                        <option>Moonlight</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">Weather Effects</span>
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
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-900/50 to-green-900/50 rounded-xl flex items-center justify-center">
                    <Map className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Ancestral Projection Map</h3>
                    <p className="text-sm text-gray-300">Geofenced activation zones and family tracking</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-300">3 Active Zones</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-300">Connected</span>
                  </div>
                </div>
              </div>

              {/* Map Container */}
              <div className="relative bg-gradient-to-br from-green-900/20 to-blue-900/20 rounded-xl h-80 mb-6 overflow-hidden border border-gray-600/50">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 opacity-20">
                  <div className="w-full h-full bg-gradient-to-br from-green-800 via-blue-800 to-purple-800"></div>
                </div>
                
                {/* Memorial Garden Zone */}
                <div className="absolute top-16 left-20 w-32 h-24 border-2 border-purple-400 border-dashed rounded-lg bg-purple-900/30 flex items-center justify-center">
                  <div className="text-center">
                    <Monitor className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                    <span className="text-xs font-medium text-purple-400">Memorial Garden</span>
                    <div className="text-xs text-purple-500 mt-1">50ft radius</div>
                  </div>
                </div>
                
                {/* Home Zone */}
                <div className="absolute top-32 right-24 w-28 h-20 border-2 border-blue-400 border-dashed rounded-lg bg-blue-900/30 flex items-center justify-center">
                  <div className="text-center">
                    <Monitor className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <span className="text-xs font-medium text-blue-400">Family Home</span>
                    <div className="text-xs text-blue-500 mt-1">25ft radius</div>
                  </div>
                </div>
                
                {/* Sacred Space Zone */}
                <div className="absolute bottom-20 left-32 w-24 h-24 border-2 border-green-400 border-dashed rounded-lg bg-green-900/30 flex items-center justify-center">
                  <div className="text-center">
                    <Monitor className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <span className="text-xs font-medium text-green-400">Sacred Space</span>
                    <div className="text-xs text-green-500 mt-1">30ft radius</div>
                  </div>
                </div>
                
                {/* Family Member Indicators */}
                <div className="absolute top-20 left-28 w-3 h-3 bg-purple-600 rounded-full animate-pulse shadow-lg">
                  <div className="absolute -top-6 -left-4 text-xs font-medium text-purple-400 whitespace-nowrap">Sarah</div>
                </div>
                
                <div className="absolute bottom-32 right-16 w-3 h-3 bg-blue-600 rounded-full animate-pulse shadow-lg">
                  <div className="absolute -top-6 -left-6 text-xs font-medium text-blue-400 whitespace-nowrap">Michael</div>
                </div>
                
                {/* Legend */}
                <div className="absolute bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-600">
                  <div className="text-xs font-medium text-gray-300 mb-2">Legend</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 border border-purple-400 border-dashed bg-purple-900/50 rounded-sm"></div>
                      <span className="text-xs text-gray-300">Active Zone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <span className="text-xs text-gray-300">Family Member</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Methods */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-base font-medium text-white mb-4">Verification Methods</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Radio className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="text-sm font-medium text-white">RFID Tracking</span>
                          <p className="text-xs text-gray-300">Wearable family tokens</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">Active</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-green-600" />
                        <div>
                          <span className="text-sm font-medium text-white">Mobile App</span>
                          <p className="text-xs text-gray-300">EverAfter companion app</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">Connected</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-4 h-4 text-purple-600" />
                        <div>
                          <span className="text-sm font-medium text-white">Biometric Scan</span>
                          <p className="text-xs text-gray-300">Fingerprint + facial recognition</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">Enabled</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Power className="w-4 h-4 text-orange-600" />
                        <div>
                          <span className="text-sm font-medium text-white">Physical Apparatus</span>
                          <p className="text-xs text-gray-300">Memorial activation button</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">Installed</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-base font-medium text-white mb-4">Activation Settings</h4>
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-white">Auto-Activation</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-400">Projection activates when family enters geofenced area</p>
                    </div>
                    
                    <div className="p-4 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-white">Manual Override</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-400">Allow family to manually activate via app or physical button</p>
                    </div>
                    
                    <div className="p-4 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">Activation Delay</span>
                        <span className="text-xs text-gray-300">3 seconds</span>
                      </div>
                      <input type="range" min="0" max="10" defaultValue="3" className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                      <p className="text-xs text-gray-400 mt-1">Delay before projection appears after verification</p>
                    </div>
                    
                    <div className="p-4 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">Session Duration</span>
                        <span className="text-xs text-gray-300">15 minutes</span>
                      </div>
                      <select className="w-full text-sm border border-gray-600 bg-gray-700 text-white rounded px-3 py-2">
                        <option>5 minutes</option>
                        <option>10 minutes</option>
                        <option selected>15 minutes</option>
                        <option>30 minutes</option>
                        <option>Until family leaves</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">How long projection remains active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700/50 p-6">
              <h3 className="text-lg font-medium text-white mb-4">Geofenced Access Control</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Authorized Family Members</label>
                  <div className="space-y-2">
                    {familyMembers.filter(member => member.status === 'Active').map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-purple-900/50 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-purple-400">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-sm text-white">{member.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-300">Authorized</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Security Settings</label>
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">Biometric Lock</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <p className="text-xs text-gray-400">Fingerprint + facial recognition required</p>
                    </div>
                    
                    <div className="p-4 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">Geofence Radius</span>
                        <span className="text-xs text-gray-300">50 feet</span>
                      </div>
                      <input type="range" min="25" max="100" defaultValue="50" className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    
                    <div className="p-4 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">Auto-Sleep Timer</span>
                        <span className="text-xs text-gray-300">30 min</span>
                      </div>
                      <p className="text-xs text-gray-400">Projection deactivates when no family present</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Installation Status */}
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-6 border border-purple-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Installation Details</h3>
                  <p className="text-sm text-gray-300">Secure memorial projection system</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-300 mb-1"><strong>Installation Type:</strong> Integrated Memorial</p>
                  <p className="text-gray-300 mb-1"><strong>Projection Quality:</strong> 4K Holographic</p>
                  <p className="text-gray-300"><strong>Audio System:</strong> Directional Speakers</p>
                </div>
                <div>
                  <p className="text-gray-300 mb-1"><strong>Encryption:</strong> AES-256 + Geofencing</p>
                  <p className="text-gray-300 mb-1"><strong>Power Source:</strong> Solar + 72hr Battery</p>
                  <p className="text-gray-300"><strong>Weather Rating:</strong> IP67 Waterproof</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy & Security Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-white">Privacy & Security</h3>
              