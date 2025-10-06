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
    category: 'support'
  }
];

import { Heart, Calendar, Users, Home, Clock, Sparkles } from 'lucide-react';
import LandingPage from './components/LandingPage';
import DailyQuestion from './components/DailyQuestion';
import MemoryTimeline from './components/MemoryTimeline';
import FamilyDashboard from './components/FamilyDashboard';
import MemorialEnvironment from './components/MemorialEnvironment';

const familyMembers = [
  { name: 'Emma Johnson', status: 'Active' },
  { name: 'Michael Johnson', status: 'Active' },
  { name: 'Sarah Johnson', status: 'Active' }
];

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [currentDay, setCurrentDay] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Main Content */}
      <div className="pb-20">
        {currentView === 'landing' && <LandingPage />}
        {currentView === 'question' && (
          <DailyQuestion 
            currentDay={currentDay} 
            onComplete={() => setCurrentView('timeline')}
          />
        )}
        {currentView === 'timeline' && <MemoryTimeline />}
        {currentView === 'dashboard' && <FamilyDashboard />}
        {currentView === 'memorial' && <MemorialEnvironment />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-700/50 shadow-2xl">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setCurrentView('question')}
              className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all duration-300 ${
                currentView === 'question'
                  ? 'bg-gradient-to-br from-purple-600/30 to-blue-600/30 text-purple-400 shadow-lg shadow-purple-500/25'
                  : 'text-gray-400 hover:text-purple-400 hover:bg-gray-800/50'
              }`}
            >
              <div className="relative">
                <Heart className="w-6 h-6" />
                {currentView === 'question' && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <span className="text-xs font-medium">Today</span>
            </button>

            <button
              onClick={() => setCurrentView('timeline')}
              className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all duration-300 ${
                currentView === 'timeline'
                  ? 'bg-gradient-to-br from-blue-600/30 to-cyan-600/30 text-blue-400 shadow-lg shadow-blue-500/25'
                  : 'text-gray-400 hover:text-blue-400 hover:bg-gray-800/50'
              }`}
            >
              <div className="relative">
                <Clock className="w-6 h-6" />
                {currentView === 'timeline' && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <span className="text-xs font-medium">Timeline</span>
            </button>

            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all duration-300 ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-br from-green-600/30 to-emerald-600/30 text-green-400 shadow-lg shadow-green-500/25'
                  : 'text-gray-400 hover:text-green-400 hover:bg-gray-800/50'
              }`}
            >
              <div className="relative">
                <Users className="w-6 h-6" />
                {currentView === 'dashboard' && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <span className="text-xs font-medium">Family</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Family Verification */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100/50 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Family Verification Status</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {familyMembers.map((member, index) => (
                  <div key={index} className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{member.name}</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <span className="text-xs text-gray-600">Family Member</span>
                    </div>
                  </div>
                ))}
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
                          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-purple-700">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900">{member.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-500">Authorized</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Security Settings</label>
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Biometric Lock</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <p className="text-xs text-gray-500">Fingerprint + facial recognition required</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Geofence Radius</span>
                        <span className="text-xs text-gray-600">50 feet</span>
                      </div>
                      <input type="range" min="25" max="100" defaultValue="50" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Auto-Sleep Timer</span>
                        <span className="text-xs text-gray-600">30 min</span>
                      </div>
                      <p className="text-xs text-gray-500">Projection deactivates when no family present</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Installation Status */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">Installation Details</h3>
                  <p className="text-sm text-gray-600">Secure memorial projection system</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-700 mb-1"><strong>Installation Type:</strong> Integrated Memorial</p>
                  <p className="text-gray-700 mb-1"><strong>Projection Quality:</strong> 4K Holographic</p>
                  <p className="text-gray-700"><strong>Audio System:</strong> Directional Speakers</p>
                </div>
                <div>
                  <p className="text-gray-700 mb-1"><strong>Encryption:</strong> AES-256 + Geofencing</p>
                  <p className="text-gray-700 mb-1"><strong>Power Source:</strong> Solar + 72hr Battery</p>
                  <p className="text-gray-700"><strong>Weather Rating:</strong> IP67 Waterproof</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy & Security Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Privacy & Security</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">End-to-End Encryption</p>
                      <p className="text-sm text-gray-500">All memories are encrypted</p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Access Logging</p>
                      <p className="text-sm text-gray-500">All access is logged and auditable</p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Family-Only Access</p>
                      <p className="text-sm text-gray-500">Only invited family can access</p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Export All Data</span>
                  </button>
                  <button className="w-full flex items-center justify-center space-x-2 p-4 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All Data</span>
                  </button>
                  <button className="w-full flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Lock className="w-4 h-4" />
                    <span>View Audit Log</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Settings</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Question Frequency
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Once per day</option>
                  <option>Every other day</option>
                  <option>Twice per week</option>
                  <option>Once per week</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Question Time
                </label>
                <input 
                  type="time" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue="19:00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Memory Categories
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['Stories', 'Values', 'Humor', 'Daily Life', 'Wisdom', 'Family History'].map((category) => (
                    <label key={category} className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}