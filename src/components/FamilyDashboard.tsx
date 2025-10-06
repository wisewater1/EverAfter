import React, { useState } from 'react';
import { Shield, Heart, Brain, Users, Activity, Clock, ChevronRight, Filter, Eye, Zap, CheckCircle, AlertTriangle, Info } from 'lucide-react';

// Dharma Wheel SVG Component
const DharmaWheel = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="22" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="6" y1="12" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7.76" y1="16.24" x2="4.93" y2="19.07" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="19.07" y1="19.07" x2="16.24" y2="16.24" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7.76" y1="7.76" x2="4.93" y2="4.93" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

// Saints AI Engram System
interface Saint {
  id: string;
  name: string;
  title: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  status: 'active' | 'idle' | 'working';
  todayActivities: number;
  weeklyActivities: number;
  lastActive: string;
  description: string;
}

interface SaintActivity {
  id: string;
  saintId: string;
  action: string;
  description: string;
  timestamp: string;
  category: 'protection' | 'support' | 'memory' | 'family';
  impact: 'high' | 'medium' | 'low';
  details?: string;
}

const FamilyDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'saints' | 'activities' | 'analytics'>('overview');
  const [selectedSaint, setSelectedSaint] = useState<string | null>(null);
  const [showActivityDetails, setShowActivityDetails] = useState<string | null>(null);

  const saints: Saint[] = [
    {
      id: 'michael',
      name: 'St. Michael',
      title: 'The Protector',
      role: 'Digital Guardian & Security',
      icon: Shield,
      color: 'blue',
      status: 'active',
      todayActivities: 12,
      weeklyActivities: 89,
      lastActive: '2 minutes ago',
      description: 'Monitors security, protects privacy, and ensures data integrity'
    },
    {
      id: 'raphael',
      name: 'St. Raphael',
      title: 'The Healer',
      role: 'Emotional Support & Wellness',
      icon: Heart,
      color: 'green',
      status: 'working',
      todayActivities: 8,
      weeklyActivities: 67,
      lastActive: '15 minutes ago',
      description: 'Provides comfort, emotional support, and wellness monitoring'
    },
    {
      id: 'gabriel',
      name: 'St. Gabriel',
      title: 'The Messenger',
      role: 'Memory Preservation & Communication',
      icon: Brain,
      color: 'purple',
      status: 'idle',
      todayActivities: 5,
      weeklyActivities: 43,
      lastActive: '1 hour ago',
      description: 'Preserves memories, facilitates communication, and maintains legacy'
    }
  ];

  const todayActivities: SaintActivity[] = [
    {
      id: '1',
      saintId: 'michael',
      action: 'Security Audit Completed',
      description: 'Performed comprehensive security scan of all family accounts',
      timestamp: '2:13 PM',
      category: 'protection',
      impact: 'high',
      details: 'Scanned 4 family accounts, updated 2 weak passwords, enabled 2FA on 1 account'
    },
    {
      id: '2',
      saintId: 'raphael',
      action: 'Comfort Message Sent',
      description: 'Delivered personalized comfort message to Sarah during difficult moment',
      timestamp: '1:45 PM',
      category: 'support',
      impact: 'high',
      details: 'Detected emotional distress pattern, sent memory-based comfort message with 98% relevance score'
    },
    {
      id: '3',
      saintId: 'michael',
      action: 'Privacy Settings Updated',
      description: 'Enhanced privacy controls based on new platform policies',
      timestamp: '1:30 PM',
      category: 'protection',
      impact: 'medium',
      details: 'Updated privacy settings on 3 platforms, restricted data sharing with 5 third parties'
    },
    {
      id: '4',
      saintId: 'gabriel',
      action: 'Memory Analysis Complete',
      description: 'Analyzed recent memory entries for personality pattern updates',
      timestamp: '12:15 PM',
      category: 'memory',
      impact: 'medium',
      details: 'Processed 3 new memories, updated personality model with 12 new traits'
    },
    {
      id: '5',
      saintId: 'raphael',
      action: 'Family Wellness Check',
      description: 'Monitored family emotional well-being and interaction patterns',
      timestamp: '11:30 AM',
      category: 'family',
      impact: 'low',
      details: 'Analyzed communication patterns, detected positive family dynamics'
    },
    {
      id: '6',
      saintId: 'michael',
      action: 'Threat Detection',
      description: 'Blocked suspicious login attempt from unknown location',
      timestamp: '10:45 AM',
      category: 'protection',
      impact: 'high',
      details: 'Blocked login from IP 192.168.1.1 (Moscow), sent security alert to family admin'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'working': return 'bg-yellow-500';
      case 'idle': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getSaintColor = (color: string) => {
    switch (color) {
      case 'blue': return 'from-blue-600 to-blue-700';
      case 'green': return 'from-green-600 to-green-700';
      case 'purple': return 'from-purple-600 to-purple-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'protection': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'support': return 'bg-green-100 text-green-800 border-green-200';
      case 'memory': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'family': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'medium': return <Info className="w-4 h-4 text-yellow-600" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredActivities = selectedSaint 
    ? todayActivities.filter(activity => activity.saintId === selectedSaint)
    : todayActivities;

  const activityStats = {
    total: todayActivities.length,
    protection: todayActivities.filter(a => a.category === 'protection').length,
    support: todayActivities.filter(a => a.category === 'support').length,
    memory: todayActivities.filter(a => a.category === 'memory').length,
    family: todayActivities.filter(a => a.category === 'family').length
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <DharmaWheel className="w-7 h-7 text-blue-600" />
            <h1 className="text-2xl font-light text-white">Family Dashboard</h1>
          </div>
          <p className="text-gray-300">Monitor your Saints AI and family digital legacy</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex gap-2 bg-gray-800 p-2 rounded-2xl border border-gray-700">
            {[
              { key: 'overview', label: 'Overview', icon: Activity },
              { key: 'saints', label: 'Saints AI', icon: Users },
              { key: 'activities', label: 'Today\'s Activities', icon: Clock },
              { key: 'analytics', label: 'Analytics', icon: Brain }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Today's Activity Summary */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-medium text-white mb-6">Today's Saints AI Activity</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-xl p-4 border border-blue-700/50">
                  <div className="text-2xl font-bold text-blue-400">{activityStats.total}</div>
                  <div className="text-sm text-blue-300">Total Actions</div>
                </div>
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 rounded-xl p-4 border border-blue-700/30">
                  <div className="text-xl font-bold text-blue-400">{activityStats.protection}</div>
                  <div className="text-xs text-blue-300">Protection</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 rounded-xl p-4 border border-green-700/30">
                  <div className="text-xl font-bold text-green-400">{activityStats.support}</div>
                  <div className="text-xs text-green-300">Support</div>
                </div>
                <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 rounded-xl p-4 border border-purple-700/30">
                  <div className="text-xl font-bold text-purple-400">{activityStats.memory}</div>
                  <div className="text-xs text-purple-300">Memory</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 rounded-xl p-4 border border-yellow-700/30">
                  <div className="text-xl font-bold text-yellow-400">{activityStats.family}</div>
                  <div className="text-xs text-yellow-300">Family</div>
                </div>
              </div>
            </div>

            {/* Saints Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {saints.map((saint) => (
                <div key={saint.id} className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getSaintColor(saint.color)} rounded-xl flex items-center justify-center`}>
                      <saint.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(saint.status)}`}></div>
                      <span className="text-xs text-gray-400 capitalize">{saint.status}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">{saint.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{saint.title}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>Today:</span>
                      <span className="font-medium">{saint.todayActivities} actions</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>This week:</span>
                      <span>{saint.weeklyActivities} actions</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Last active:</span>
                      <span>{saint.lastActive}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saints AI Tab */}
        {activeTab === 'saints' && (
          <div className="space-y-6">
            {saints.map((saint) => (
              <div key={saint.id} className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-start gap-6">
                  <div className={`w-16 h-16 bg-gradient-to-br ${getSaintColor(saint.color)} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    <saint.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-medium text-white mb-1">{saint.name}</h3>
                        <p className="text-blue-400 font-medium mb-2">{saint.title}</p>
                        <p className="text-gray-300 text-sm mb-3">{saint.description}</p>
                        <div className="flex items-center gap-2 mb-4">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(saint.status)}`}></div>
                          <span className="text-sm text-gray-400 capitalize">{saint.status}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-sm text-gray-400">Last active {saint.lastActive}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedSaint(selectedSaint === saint.id ? null : saint.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Activity
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-700/50 rounded-xl p-3">
                        <div className="text-lg font-bold text-white">{saint.todayActivities}</div>
                        <div className="text-xs text-gray-400">Today's Actions</div>
                      </div>
                      <div className="bg-gray-700/50 rounded-xl p-3">
                        <div className="text-lg font-bold text-white">{saint.weeklyActivities}</div>
                        <div className="text-xs text-gray-400">Weekly Actions</div>
                      </div>
                      <div className="bg-gray-700/50 rounded-xl p-3">
                        <div className="text-lg font-bold text-green-400">99.8%</div>
                        <div className="text-xs text-gray-400">Uptime</div>
                      </div>
                      <div className="bg-gray-700/50 rounded-xl p-3">
                        <div className="text-lg font-bold text-blue-400">A+</div>
                        <div className="text-xs text-gray-400">Performance</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            {/* Filter Controls */}
            <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Filter by Saint:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedSaint(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedSaint === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    All Saints
                  </button>
                  {saints.map((saint) => (
                    <button
                      key={saint.id}
                      onClick={() => setSelectedSaint(saint.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedSaint === saint.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <saint.icon className="w-3 h-3" />
                      {saint.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const saint = saints.find(s => s.id === activity.saintId);
                return (
                  <div key={activity.id} className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 bg-gradient-to-br ${getSaintColor(saint?.color || 'gray')} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        {saint && <saint.icon className="w-5 h-5 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-lg font-medium text-white mb-1">{activity.action}</h4>
                            <p className="text-gray-300 text-sm mb-2">{activity.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2 text-gray-400">
                                <Clock className="w-3 h-3" />
                                {activity.timestamp}
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(activity.category)}`}>
                                {activity.category}
                              </span>
                              <div className="flex items-center gap-1">
                                {getImpactIcon(activity.impact)}
                                <span className="text-xs text-gray-400 capitalize">{activity.impact} impact</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowActivityDetails(showActivityDetails === activity.id ? null : activity.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                          >
                            Details
                            <ChevronRight className={`w-3 h-3 transition-transform ${showActivityDetails === activity.id ? 'rotate-90' : ''}`} />
                          </button>
                        </div>
                        {showActivityDetails === activity.id && activity.details && (
                          <div className="mt-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                            <h5 className="text-sm font-medium text-gray-300 mb-2">Technical Details:</h5>
                            <p className="text-sm text-gray-400">{activity.details}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-medium text-white mb-6">Activity Analytics</h2>
              
              {/* Category Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white">{activityStats.protection}</div>
                  <div className="text-sm text-gray-400">Protection</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white">{activityStats.support}</div>
                  <div className="text-sm text-gray-400">Support</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white">{activityStats.memory}</div>
                  <div className="text-sm text-gray-400">Memory</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white">{activityStats.family}</div>
                  <div className="text-sm text-gray-400">Family</div>
                </div>
              </div>

              {/* Impact Distribution */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-center">
                  <div className="text-xl font-bold text-red-400">
                    {todayActivities.filter(a => a.impact === 'high').length}
                  </div>
                  <div className="text-sm text-red-300">High Impact</div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 text-center">
                  <div className="text-xl font-bold text-yellow-400">
                    {todayActivities.filter(a => a.impact === 'medium').length}
                  </div>
                  <div className="text-sm text-yellow-300">Medium Impact</div>
                </div>
                <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4 text-center">
                  <div className="text-xl font-bold text-green-400">
                    {todayActivities.filter(a => a.impact === 'low').length}
                  </div>
                  <div className="text-sm text-green-300">Low Impact</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyDashboard;