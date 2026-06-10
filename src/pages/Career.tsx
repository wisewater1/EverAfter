import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import CareerDashboard from '../components/CareerDashboard';
import CareerChat from '../components/CareerChat';
import { Briefcase, MessageSquare, LayoutDashboard } from 'lucide-react';

type TabType = 'dashboard' | 'chat';

export default function Career() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Career Agent</h1>
          </div>
          <p className="text-gray-400">
            Your AI-powered career assistant for professional development and networking
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-800/50 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {activeTab === 'dashboard' ? (
            <div className="lg:col-span-3">
              <CareerDashboard />
            </div>
          ) : (
            <>
              <div className="lg:col-span-2">
                <CareerChat />
              </div>
              <div className="hidden lg:block">
                <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Tips</h3>
                  <ul className="space-y-3 text-sm text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1"></span>
                      <span>Ask me to help you set career goals and track your progress</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1"></span>
                      <span>I can answer questions about your professional background</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1"></span>
                      <span>Enable public chat to let visitors learn about you</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1"></span>
                      <span>I'll capture leads when visitors want to connect</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
